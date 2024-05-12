/**
 * @openapi
 * /getLendingVaults/all/{blockchainId}:
 *   get:
 *     tags:
 *       - Lending
 *     description: |
 *       Returns all lending vaults, in all registries, on a specific chain.
 *     parameters:
 *       - $ref: '#/components/parameters/lendingBlockchainId'
 *     responses:
 *       200:
 *         description:
 * /getLendingVaults/all:
 *   get:
 *     tags:
 *       - Lending
 *     description: |
 *       Returns all lending vaults, in all registries, on all chains.
 *     responses:
 *       200:
 *         description:
 */

/**
 * This endpoint, along with all bulk getLendingVaults endpoints, is only cached at the CDN level:
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

import getAllCurveLendingVaultsData from '#root/utils/data/curve-lending-vaults-data.js';
import { allLendingBlockchainIds, fn } from '#root/utils/api.js';
import { sum } from '#root/utils/Array.js';

export default fn(async ({ lendingBlockchainId }) => {
  const blockchainIds = (
    lendingBlockchainId === 'all' ?
      allLendingBlockchainIds :
      [lendingBlockchainId]
  );

  const lendingVaultData = await getAllCurveLendingVaultsData(blockchainIds, false);

  return {
    lendingVaultData,
    tvl: sum(lendingVaultData.map(({ usdTotal }) => usdTotal)),
  };
}, {
  maxAgeCDN: 5 * 60,
  cacheKeyCDN: ({ lendingBlockchainId }) => `getAllLendingVaults-${lendingBlockchainId}`,
  paramSanitizers: {
    // Override default lendingBlockchainId sanitizer for this endpoint
    lendingBlockchainId: ({ lendingBlockchainId }) => ({
      isValid: allLendingBlockchainIds.includes(lendingBlockchainId),
      defaultValue: 'all',
    }),
  },
});
