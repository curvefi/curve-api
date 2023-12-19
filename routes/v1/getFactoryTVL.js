/**
 * @openapi
 * /getFactoryTVL:
 *   get:
 *     deprecated: true
 *     tags:
 *       - Deprecated
 *     description: |
 *       <i>Deprecated: please use `getPools/ethereum/factory` instead</i>
 *     responses:
 *       200:
 *         description:
 */

import getPoolsFn from '#root/routes/v1/getPools/[blockchainId]/[registryId].js';
import { fn } from '#root/utils/api.js';

export default fn(async () => {
  let res = await getPoolsFn.straightCall({ blockchainId: 'ethereum', registryId: 'factory' })
  const factoryBalances = res.tvl
  return { factoryBalances };
}, {
  maxAgeCDN: 5 * 60, // Don't cache in redis since it's just a pass-through endpoint
  cacheKeyCDN: 'getFactoryTVL',
});
