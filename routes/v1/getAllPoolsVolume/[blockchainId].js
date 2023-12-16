/**
 * @openapi
 * /getAllPoolsVolume/{blockchainId}:
 *   get:
 *     tags:
 *       - Volumes and APYs
 *     description: Returns total 24h volume for a chain.
 *     parameters:
 *       - $ref: '#/components/parameters/blockchainId'
 *     responses:
 *       200:
 *         description:
 */

import { NotFoundError, fn } from '#root/utils/api.js';
import getSubgraphDataFn from '#root/routes/v1/getSubgraphData/[blockchainId].js';
import getFactoryAPYsFn from '#root/routes/v1/getFactoryAPYs/[blockchainId]/[version].js';

export default fn(async ({ blockchainId }) => {
  try {
    const { totalVolume, cryptoShare } = await getSubgraphDataFn.straightCall({ blockchainId });
    return {
      totalVolume,
      cryptoShare
    };
  } catch (err) {
    // Fallback for chains without subgraph available; inaccurate because misses facto-crypto
    // this won't be necessary anymore once we've moved to curve-prices for all chains
    if (err instanceof NotFoundError) {
      const dataStable = await getFactoryAPYsFn.straightCall({ blockchainId, version: 'stable' });
      const dataCrypto = await getFactoryAPYsFn.straightCall({ blockchainId, version: 'crypto' });
      const totalVolume = dataStable.totalVolume + dataCrypto.totalVolume;

      return {
        totalVolume,
        cryptoShare: dataCrypto.totalVolume / totalVolume * 100,
      };
    }

    throw err;
  }
}, {
  maxAge: 10 * 60, // 10m
  cacheKey: ({ blockchainId }) => `getAllPoolsVolume-${blockchainId}`,
});
