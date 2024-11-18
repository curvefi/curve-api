import { flattenArray } from '#root/utils/Array.js';
import { IS_DEV } from '#root/constants/AppConstants.js';

const checks = [{
  description: 'Sidechain config must have a `shortId` property',
  failsIfFn: (id, config) => (id !== 'ethereum' && !config.shortId),
}, {
  description: '`gaugeRegistryAddress2` and `gaugeRootRegistry2` must be either both defined or undefined: if one exists, the other must too',
  failsIfFn: (id, config) => (typeof config.gaugeRegistryAddress2 !== typeof config.gaugeRootRegistry2),
}];

const validateConfigs = (configs) => {
  if (!IS_DEV) return;

  const errors = flattenArray(Array.from(Object.entries(configs)).map(([id, config]) => (
    checks
      .filter(({ failsIfFn }) => failsIfFn(id, config))
      .map(({ description }) => `${description} [config: ${id}]`)
  )));

  if (errors.length > 0) {
    throw new Error(`Error${errors.length > 1 ? 's' : ''} found in configs config:\n\n${errors.join('\n')}\n`);
  }
};

export default validateConfigs;
