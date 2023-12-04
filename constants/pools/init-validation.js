import { flattenArray } from '#root/utils/Array.js';
import { IS_DEV } from '../AppConstants.js';

const checks = [{
  description: 'Meta pools must have a deposit zap',
  failsIfFn: (pool) => (pool.isMetaPool && pool.addresses.deposit === null),
}, {
  description: 'Prop riskLevel must be defined if isRiskier = true',
  failsIfFn: (pool) => (pool.isRiskier && typeof pool.riskLevel === 'undefined'),
}];

const validatePoolConfigs = (pools) => {
  if (!IS_DEV) return;

  const errors = flattenArray(pools.map((pool) => (
    checks
      .filter(({ failsIfFn }) => failsIfFn(pool))
      .map(({ description }) => `${description} [pool: ${pool.id}]`)
  )));

  if (errors.length > 0) {
    throw new Error(`Error${errors.length > 1 ? 's' : ''} found in pools config:\n\n${errors.join('\n')}\n`);
  }
};

export default validatePoolConfigs;
