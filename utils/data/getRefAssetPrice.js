import memoize from 'memoizee';
import { uniq } from 'utils/Array';
import getPricesForAssets from 'utils/data/getPricesForAssets';
import pools from 'constants/pools';
import coins from 'constants/coins';

const poolsReferenceAssetsCoingeckoIds = uniq([
  ...pools.map(({ coingeckoInfo: { referenceAssetId } }) => referenceAssetId),
  ...Array.from(Object.values(coins)).map(({ coingeckoId }) => coingeckoId).filter((o) => o),
]);

const getRefAssetPrice = memoize(async (refAsset) => {
  const prices = await getPricesForAssets(poolsReferenceAssetsCoingeckoIds);
  const referenceAssetCoingeckoId = (
    refAsset === 'eth' ? 'ethereum' :
    refAsset === 'btc' ? 'bitcoin' : (
      pools.find((pool) => pool.referenceAsset === refAsset)?.coingeckoInfo?.referenceAssetId ||
      Array.from(Object.values(coins)).find((coin) => coin.type === refAsset)?.coingeckoId
    )
  );

  if (!referenceAssetCoingeckoId) {
    console.error(`NO REFERENCE ASSET ID FOUND FOR REFASSET = "${refAsset}", HENCE USD FIGURES CAN’T BE COMPUTED CORRECTLY`);
  }

  const index = poolsReferenceAssetsCoingeckoIds.indexOf(referenceAssetCoingeckoId);
  return prices[index];
}, {
  promise: true,
  maxAge: 10 * 1000, // 10s
});

export default getRefAssetPrice;
