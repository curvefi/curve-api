import memoize from 'memoizee';
import { uniq } from 'utils/Array';
import getAssetsPrices from 'utils/data/assets-prices';
import pools from 'constants/pools';

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
