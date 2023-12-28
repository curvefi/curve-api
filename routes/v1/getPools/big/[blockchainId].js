/**
 * @openapi
 * /getPools/big/{blockchainId}:
 *   get:
 *     tags:
 *       - Pools
 *     description: |
 *       Returns all pools whose TVL is ≥$10k, in all registries, on a specific chain.
 *     parameters:
 *       - $ref: '#/components/parameters/blockchainId'
 *     responses:
 *       200:
 *         description:
 * /getPools/big:
 *   get:
 *     tags:
 *       - Pools
 *     description: |
 *       Returns all pools whose TVL is ≥$10k, in all registries, on all chains.
 *     responses:
 *       200:
 *         description:
 */

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
import { SMALL_POOLS_USDTOTAL_THRESHOLD } from '#root/constants/AppConstants.js';
import { sum } from '#root/utils/Array.js';

const allBlockchainIds = Array.from(Object.keys(configs));

export default fn(async ({ blockchainId }) => {
  const blockchainIds = (
    blockchainId === 'all' ?
      allBlockchainIds :
      [blockchainId]
  );

  const poolData = (
    (await getAllCurvePoolsData(blockchainIds, false))
      .filter(({ usdTotal }) => usdTotal >= SMALL_POOLS_USDTOTAL_THRESHOLD)
  );

  return {
    poolData,
    tvl: sum(poolData.map(({ usdTotalExcludingBasePool }) => usdTotalExcludingBasePool)),
  };
}, {
  maxAgeCDN: 5 * 60,
  cacheKeyCDN: ({ blockchainId }) => `getAllBigPools-${blockchainId}`,
  paramSanitizers: {
    // Override default blockchainId sanitizer for this endpoint
    blockchainId: ({ blockchainId }) => ({
      isValid: allBlockchainIds.includes(blockchainId),
      defaultValue: 'all',
    }),
  },
});
