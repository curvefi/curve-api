import memoize from 'memoizee';
import { arrayToHashmap, flattenArray } from 'utils/Array';
import { multiCall } from 'utils/Web3';
import ERC20ABI from 'constants/abis/erc20.json';
import MULTICALL_ABI from 'constants/abis/multicall.json';
import getRefAssetPrice from 'utils/data/getRefAssetPrice';
import pools from 'constants/pools';
import configs from 'constants/configs';

const getCryptoPoolTokenPrices = memoize(async (account, library, chainId) => {
  const config = Array.from(Object.values(configs)).find(({ networkId }) => networkId === chainId);

  const cryptoPools = pools.filter(({ cryptoPool }) => cryptoPool);
  const callsConfig = flattenArray(cryptoPools.map(({
    id,
    addresses: { swap, lpToken },
    coins,
    coinsInPlaceReplacements,
  }) => [
    {
      address: lpToken,
      abi: ERC20ABI,
      methodName: 'totalSupply',
      metaData: { type: 'totalSupply', poolId: id },
      web3Data: { account, library, chainId },
    },
    ...coins.map((coin, i) => {
      const actualCoin = coinsInPlaceReplacements[i] || coin;
      const { symbol, address, type, decimals } = actualCoin;

      if (symbol.toUpperCase() === config.nativeCurrencySymbol.toUpperCase()) {
        return {
          address: config.multicallAddress,
          abi: MULTICALL_ABI,
          methodName: 'getEthBalance', // Multicall helper method, must use compatible multicall impl
          params: [swap],
          metaData: { type: 'balance', referenceAsset: coin.type, poolId: id, decimals },
          web3Data: { account, library, chainId },
        };
      }

      return {
        address,
        abi: ERC20ABI,
        methodName: 'balanceOf',
        params: [swap],
        metaData: { type: 'balance', referenceAsset: type, poolId: id, decimals },
        web3Data: { account, library, chainId },
      };
    }),
  ]));

  const cryptoPoolsData = await multiCall(callsConfig);

  const referenceAssetPrices = arrayToHashmap(await Promise.all(
    cryptoPoolsData
      .filter(({ metaData: { referenceAsset } }) => !!referenceAsset)
      .map(({ metaData: { referenceAsset } }) => new Promise(async (res) => {
        const price = await getRefAssetPrice(referenceAsset);
        res([referenceAsset, price]);
      }))
  ));

  const groupedData = cryptoPoolsData.reduce((accu, { data, metaData: { poolId, type, referenceAsset, decimals } }) => {
    const { totalSupply, totalBalancesUsdValue } = accu[poolId] || { totalSupply: 0, totalBalancesUsdValue: 0 };

    return {
      ...accu,
      [poolId]: {
        totalSupply: (
          type === 'totalSupply' ?
            (data / 1e18) :
            totalSupply
        ),
        totalBalancesUsdValue: (
          type === 'balance' ?
            totalBalancesUsdValue + (data / (10 ** decimals) * referenceAssetPrices[referenceAsset]) :
            totalBalancesUsdValue
        ),
      },
    };
  }, {});

  const lpTokenPrices = Array.from(Object.entries(groupedData)).reduce((accu, [poolId, { totalSupply, totalBalancesUsdValue }]) => ({
    ...accu,
    [poolId]: (totalBalancesUsdValue / totalSupply),
  }), {});

  return lpTokenPrices;
}, {
  promise: true,
  maxAge: 10 * 60 * 1000, // 10 min
});

export default getCryptoPoolTokenPrices;
