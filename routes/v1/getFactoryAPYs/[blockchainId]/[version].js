/**
 * @openapi
 * /getFactoryAPYs/{blockchainId}/{version}:
 *   get:
 *     tags:
 *       - Volumes and APYs
 *     description: |
 *       Returns *inaccurate* volume and base APY data for Curve pools on chains that aren’t indexed by either the [Curve Prices API](https://prices.curve.fi/feeds-docs) or the [Curve subgraphs](https://github.com/curvefi/volume-subgraphs).
 *       Data returned by this endpoint is necessarily inaccurate due to the manual chain-walking involved, coupled with the limitations of RPC endpoints available for this subset of chains. Using this endpoint should be considered an imperfect last resort.
 *       If the chain for which you want to retrieve volume and base APY data is available through either [`/getVolumes/{blockchainId}`](#/default/get_getVolumes__blockchainId_) or [`getSubgraphData/[blockchainId]`](#/default/get_getSubgraphData__blockchainId_), please use these.
 *     parameters:
 *       - in: path
 *         name: blockchainId
 *         required: true
 *         schema:
 *           type: string
 *           enum: [bsc, kava, zkevm, zksync, x-layer, mantle]
 *       - in: path
 *         name: version
 *         required: true
 *         schema:
 *           type: string
 *           enum: [stable, crypto]
 *     responses:
 *       200:
 *         description:
 */

// Note: Ethereum is not documented because this endpoint shouldn’t be used anymore for Ethereum at all

import { fn } from '#root/utils/api.js';
import getEthereumFactoryAPYs from '#root/routes/v1/getFactoryAPYs/_ethereum.js';
import getSidechainFactoryAPYs from '#root/routes/v1/getFactoryAPYs/_sidechains.js';

const paramSanitizers = {
  version: ({ blockchainId, version }) => ({
    isValid: (
      (blockchainId !== 'ethereum') ?
        ['stable', 'crypto'].includes(version) :
        ['crypto', '1', '2'].includes(version)
    ),
  }),
};

// Note: keep the openapi parameter definition up to date with this array
const SIDECHAINS_WITH_CUSTOM_SUPPORT = [
  'bsc',
  'kava',
  'zkevm',
  'zksync',
  'x-layer',
  'mantle',
];

export default fn(async ({ blockchainId, version }) => {
  if (blockchainId === 'ethereum') {
    return getEthereumFactoryAPYs({ version });
  } else if (SIDECHAINS_WITH_CUSTOM_SUPPORT.includes(blockchainId)) {
    return (await import(`./custom-sidechains/_${blockchainId}.js`)).default({ version });
  } else {
    return getSidechainFactoryAPYs({ blockchainId, version });
  }
}, {
  maxAge: 5 * 60,
  cacheKey: ({ blockchainId, version }) => `getFactoryAPYs-${blockchainId}-${version}`,
  paramSanitizers,
});

export { paramSanitizers };
