import { flattenArray } from '#root/utils/Array.js';
import { IS_DEV } from '#root/constants/AppConstants.js';

const checks = [{
  description: 'Coins which aren’t lp tokens (`isLpToken = false`) must have a `coingeckoId` prop defined',
  failsIfFn: (coin) => (!coin.isLpToken && typeof coin.coingeckoId === 'undefined'),
}, {
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

export default validatePoolConfigs;
