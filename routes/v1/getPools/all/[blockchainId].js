/**
 * This endpoint, along with all bulk getPools endpoints, is only cached at the CDN level:
 * it uses the `maxAgeCDN` prop only.
 *
 * This approach allows to take advantage of:
 * 1. Redis caching of all combinations pools(blockchainId, registryId): these are already
 *    cached and available, so this is very fast, the server only assembles them
 * 2. CDN caching: Cloudfront makes this assembled, large amount of data, available
 *    close to all API consumers
 *
 * This has two advantages:
 * 1. Redis isn't bloated with large amounts of data that are already stored in it
 *    in their unassembled form
 * 2. The server doesn't need to do that assembling too often, CDN caching makes sure of that
 */

import configs from '#root/constants/configs/index.js';
import getAllCurvePoolsData from '#root/utils/data/curve-pools-data.js';
import { fn } from '#root/utils/api.js';
import { sum } from '#root/utils/Array.js';

export default fn(async ({ blockchainId }) => {
  if (typeof blockchainId === 'undefined') {
    const allBlockchainIds = Array.from(Object.keys(configs));

    // Unfortunately the endpoint `getPools/all` is stuck with object keys as
    // return data for historical reasons, it's the only one of the getPools family
    return getAllCurvePoolsData(allBlockchainIds);
  } else {
    const poolData = await getAllCurvePoolsData([blockchainId]);

    return {
      poolData,
      tvl: sum(poolData.map(({ usdTotalExcludingBasePool }) => usdTotalExcludingBasePool)),
    };
  }
}, {
  maxAgeCDN: 5 * 60,
  cacheKey: ({ blockchainId }) => `getAllPools-${blockchainId}`,
});
