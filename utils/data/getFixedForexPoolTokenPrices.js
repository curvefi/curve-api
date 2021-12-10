import memoize from 'memoizee';
import groupBy from 'lodash.groupby';
import { flattenArray } from 'utils/Array';
import { multiCall } from 'utils/Calls';
import ERC20ABI from 'constants/abis/erc20.json';
import getIbTokensPrices from 'utils/data/ibtokens-prices';
import pools from 'constants/pools';

const getFixedForexPoolTokenPrices = memoize(async (coingeckoPrices, account, library, chainId) => {
  const ffPools = pools.filter(({ coins }) => coins.some(({ isIronbankToken }) => isIronbankToken));

  // Leaving this groupby here for later in case we want to fetch exact prices
  // for synths from synthetix oracle just like we do for fixedforex (fyi otherCoins
  // can't be assumed to only have synths, currently ibtokens are only paired
  // with synths but they could be paired with anything, so we'd have to fetch
  // synth prices *and* still use coingeckoPrices as fallback price source
  const {
    true: ibCoins,
    false: otherCoins,
  } = groupBy(flattenArray(ffPools.map(({ coins }) => coins)), 'isIronbankToken');

  const callsConfig = flattenArray(ffPools.map(({ id, addresses: { swap, lpToken }, coins }) => [
    {
      address: lpToken,
      abi: ERC20ABI,
      methodName: 'totalSupply',
      metaData: { type: 'totalSupply', poolId: id },
    },
    ...coins.map(({ id: coinId, address, coingeckoId, isIronbankToken, decimals }) => ({
      address,
      abi: ERC20ABI,
      methodName: 'balanceOf',
      params: [swap],
      metaData: { type: 'balance', coingeckoId, isIronbankToken, coinId, poolId: id, decimals },
    })),
  ]));

  const [ffPoolsData, ibTokensPrices] = await Promise.all([
    multiCall(callsConfig),
    getIbTokensPrices(ibCoins, account, library, chainId),
  ]);

  const groupedData = ffPoolsData.reduce((accu, { data, metaData: {
    poolId,
    type,
    coinId,
    coingeckoId,
    isIronbankToken,
    decimals,
  } }) => {
    const { totalSupply, totalBalancesUsdValue } = accu[poolId] || { totalSupply: 0, totalBalancesUsdValue: 0 };
    const tokenPrice = isIronbankToken ? ibTokensPrices[coinId] : coingeckoPrices?.[coingeckoId];

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
            totalBalancesUsdValue + (data / (10 ** decimals) * tokenPrice) :
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

export default getFixedForexPoolTokenPrices;
