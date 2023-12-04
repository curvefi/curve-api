import memoize from 'memoizee';
import { arrayToHashmap, flattenArray } from '#root/utils/Array.js';
import { multiCall } from '#root/utils/Web3/index.js';
import ERC20ABI from '#root/constants/abis/erc20.json' assert { type: 'json' };
import getRefAssetPrice from '#root/utils/data/getRefAssetPrice.js';
import pools from '#root/constants/pools.js';

const getCryptoPoolTokenPrices = memoize(async (account, library, chainId) => {
  const cryptoPools = pools.filter(({ cryptoPool }) => cryptoPool);
  const callsConfig = flattenArray(cryptoPools.map(({ id, addresses: { swap, lpToken }, coins }) => [
    {
      address: lpToken,
      abi: ERC20ABI,
      methodName: 'totalSupply',
      metaData: { type: 'totalSupply', poolId: id },
      web3Data: { account, library, chainId },
    },
    ...coins.map(({ address, type, decimals }) => ({
      address,
      abi: ERC20ABI,
      methodName: 'balanceOf',
      params: [swap],
      metaData: { type: 'balance', referenceAsset: type, poolId: id, decimals },
      web3Data: { account, library, chainId },
    })),
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
