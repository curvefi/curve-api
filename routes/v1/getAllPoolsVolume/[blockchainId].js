import { NotFoundError, fn } from '#root/utils/api.js';
import getSubgraphDataFn from '#root/routes/v1/getSubgraphData/[blockchainId].js';
import getFactoryAPYsFn from '#root/routes/v1/getFactoryAPYs/[blockchainId].js';

export default fn(async ({ blockchainId }) => {
  try {
    const { totalVolume, cryptoShare } = await getSubgraphDataFn.straightCall({ blockchainId });
    return {
      totalVolume,
      cryptoShare
    };
  } catch (err) {
    // Fallback for chains without subgraph available; this won't be necessary anymore once we've moved
    // to curve-prices for all chains
    if (err instanceof NotFoundError) {
      const data = await getFactoryAPYsFn.straightCall({ blockchainId });

      return {
        totalVolume: data.totalVolume,
        cryptoShare: undefined,
      };
    }

    throw err;
  }
}, {
  maxAge: 10 * 60, // 10m
  cacheKey: ({ blockchainId }) => `getAllPoolsVolume-${blockchainId}`,
});
