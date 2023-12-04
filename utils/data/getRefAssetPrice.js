import memoize from 'memoizee';
import { uniq } from '#root/utils/Array.js';
import getAssetsPrices from '#root/utils/data/assets-prices.js';
import pools from '#root/constants/pools/index.js';

const poolsReferenceAssetsCoingeckoIds = uniq(pools.map(({ coingeckoInfo: { referenceAssetId } }) => referenceAssetId));

const getRefAssetPrice = memoize(async (refAsset) => {
  const prices = await getAssetsPrices(poolsReferenceAssetsCoingeckoIds);
  const referenceAssetCoingeckoId = pools.find((pool) => pool.referenceAsset === refAsset).coingeckoInfo.referenceAssetId;
  return prices[referenceAssetCoingeckoId];
}, {
  promise: true,
  maxAge: 10 * 1000, // 10s
});

export default getRefAssetPrice;
