// **Important note:** this endpoint is only for chains that do NOT have a subgraph
// (lack of `graphEndpoint` prop in `configs.js`), this endpoint is a legitimate (yet
// non-optimal) way of retrieving apys for their main registry pools

import { NotFoundError, fn } from '#root/utils/api.js';

const SIDECHAINS_WITH_CUSTOM_SUPPORT = [
  'aurora',
  'moonbeam',
];

export default fn(async ({ blockchainId }) => {
  if (SIDECHAINS_WITH_CUSTOM_SUPPORT.includes(blockchainId)) {
    return (await import(`./custom-sidechains/_${blockchainId}.js`)).default();
  } else {
    throw new NotFoundError(`This chain has a getSubgraphData endpoint available, please use "/api/getSubgraphData/${blockchainId}"`);
  }
}, {
  maxAge: 5 * 60,
  cacheKey: ({ blockchainId }) => `getMainPoolsAPYs-${blockchainId}`,
  returnFlatData: true, // In order to match the legacy raw-stats format exactly
});
