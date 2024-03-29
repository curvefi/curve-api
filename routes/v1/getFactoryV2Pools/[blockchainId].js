/**
 * @openapi
 * /getFactoryV2Pools/{blockchainId}:
 *   get:
 *     deprecated: true
 *     tags:
 *       - Deprecated
 *     description: |
 *       <i>Deprecated: please use `getPools/{blockchainId}/factory` instead</i>
 *     parameters:
 *       - $ref: '#/components/parameters/blockchainId'
 *     responses:
 *       200:
 *         description:
 */

import { fn } from '#root/utils/api.js';
import getPoolsFn from '#root/routes/v1/getPools/[blockchainId]/[registryId].js';

export default fn(async ({ blockchainId }) => (
  getPoolsFn.straightCall({ blockchainId, registryId: 'factory' })
), {
  maxAgeCDN: 5 * 60, // Don't cache in redis since it's just a pass-through endpoint
  cacheKeyCDN: ({ blockchainId }) => `getFactoryV2Pools-${blockchainId}`,
});
