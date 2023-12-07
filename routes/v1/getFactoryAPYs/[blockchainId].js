import { fn } from '#root/utils/api.js';
import getEthereumFactoryAPYs from '#root/routes/v1/getFactoryAPYs/_ethereum.js';
import getSidechainFactoryAPYs from '#root/routes/v1/getFactoryAPYs/_sidechains.js';

const paramSanitizers = {
  version: ({ blockchainId, version }) => ({
    isValid: (
      (blockchainId !== 'ethereum') ?
        ['stable', 'crypto'].includes(version) :
        ['crypto', '1', '2', 1, 2].includes(version)
    ),
    defaultValue: (blockchainId !== 'ethereum' ? 'stable' : 1),
  }),
};

const SIDECHAINS_WITH_CUSTOM_SUPPORT = [
  'base',
  'bsc',
  'celo',
  'kava',
  'zkevm',
  'zksync',
];

export default fn(async ({ blockchainId, version }) => {
  if (blockchainId === 'ethereum') {
    return getEthereumFactoryAPYs({ version });
  } else if (SIDECHAINS_WITH_CUSTOM_SUPPORT.includes(blockchainId)) {
    return (await import(`./custom-sidechains/_${blockchainId}.js`)).default();
  } else {
    return getSidechainFactoryAPYs({ blockchainId, version });
  }
}, {
  maxAge: 5 * 60,
  cacheKey: ({ blockchainId, version }) => `getFactoryAPYs-${blockchainId}-${version}`,
  paramSanitizers,
});

export { paramSanitizers };
