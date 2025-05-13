/**
 * @openapi
 * /getMainPoolsAPYs/{blockchainId}:
 *   get:
 *     deprecated: true
 *     tags:
 *       - Deprecated
 *     description: |
 *       Returns *inaccurate* volume and base APY data for `main` registry pools on chains that aren’t indexed by either the [Curve Prices API](https://prices.curve.finance/feeds-docs) or the [Curve subgraphs](https://github.com/curvefi/volume-subgraphs).
 *       Data returned by this endpoint is necessarily inaccurate due to the manual chain-walking involved, coupled with the limitations of RPC endpoints available for this subset of chains. Using this endpoint should be considered an imperfect last resort.
 *       If the chain for which you want to retrieve volume and base APY data is available through either [`/getVolumes/{blockchainId}`](#/default/get_getVolumes__blockchainId_) or [`getSubgraphData/[blockchainId]`](#/default/get_getSubgraphData__blockchainId_), please use these.
 *
 *       Note: At the moment, all chains with a `main` registry have support in one of the endpoints mentioned above. This endpoint will not return data for any chain anymore.
 *     parameters:
 *       - in: path
 *         name: blockchainId
 *         required: true
 *         schema:
 *           type: string
 *           enum: []
 *     responses:
 *       200:
 *         description:
 */

import { NotFoundError, fn } from '#root/utils/api.js';

// Note: keep the openapi parameter definition up to date with this array
const SIDECHAINS_WITH_CUSTOM_SUPPORT = [
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
