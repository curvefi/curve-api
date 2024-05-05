/**
 * Retrieves pool data from prices.curve.fi and caches it.
 *
 * This utility uses two layers of caching to reduce load on prices.curve.fi and time spent
 * networking as much as possible:
 * 1. An in-memory cache (using memoizee) for instant storing+retrieving
 * 2. A Redis cache to keep cached entities readily available across restarts/redeployments
 *    of this server
 *
 * This is coupled with a very large MAX_AGE_SEC value, because metadata never really changes.
 */

import memoize from 'memoizee';
import { PRICES_CURVE_FI_AVAILABLE_CHAIN_IDS } from '#root/utils/data/prices.curve.fi/chains.js';
import { lc } from '#root/utils/String.js';
import swr from '#root/utils/swr.js';

const MAX_AGE_SEC = 86400; // 24 hours

const getPricesCurveFiPoolsMetadataBlockchainId = memoize(async (address, blockchainId) => {
  if (!PRICES_CURVE_FI_AVAILABLE_CHAIN_IDS.includes(blockchainId)) {
    return undefined;
  }

  const lcAddress = lc(address);

  const metaData = (await swr(
    `getPricesCurveFiPoolsMetadataBlockchainId-${blockchainId}-${lcAddress}`,
    async () => (await fetch(`https://prices.curve.fi/v1/pools/${blockchainId}/${lcAddress}/metadata`)).json(),
    { minTimeToStale: MAX_AGE_SEC * 1000 } // See CacheSettings.js
  )).value
    ;
  return metaData;
}, {
  promise: true,
  maxAge: MAX_AGE_SEC * 1000,
});

const getPoolAssetTypesFromExternalStore = async (address, blockchainId) => {
  const metaData = await getPricesCurveFiPoolsMetadataBlockchainId(address, blockchainId);
  return metaData?.asset_types;
};

export default getPricesCurveFiPoolsMetadataBlockchainId;
export { getPoolAssetTypesFromExternalStore };
