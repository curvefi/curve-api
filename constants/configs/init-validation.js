const { flattenArray } = require('../../utils/Array');
const { IS_DEV } = require('../AppConstants');

const checks = [{
  description: 'Sidechain config must have a `shortId` property',
  failsIfFn: (id, config) => (id !== 'ethereum' && !config.shortId),
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

module.exports = validateConfigs;
