const { flattenArray } = require('../../utils/Array');
const { IS_DEV } = require('../AppConstants');

const checks = [{
  description: '`decimals` must indicate the number of decimals of a coin (e.g. 18 not 1e18)',
  failsIfFn: (coin) => (coin?.decimals > 30),
}];

const validatePoolConfigs = (coins) => {
  if (!IS_DEV) return;

  const errors = flattenArray(Array.from(Object.values(coins)).map((coin) => (
    checks
      .filter(({ failsIfFn }) => failsIfFn(coin))
      .map(({ description }) => `${description} [coin: ${coin.id}]`)
  )));

  if (errors.length > 0) {
    throw new Error(`Error${errors.length > 1 ? 's' : ''} found in coins config:\n\n${errors.join('\n')}\n`);
  }
};

module.exports = validatePoolConfigs;
