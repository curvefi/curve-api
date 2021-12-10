/* eslint-disable no-restricted-syntax */

import memoize from 'memoizee';
import getPoolUsdFigure from 'utils/data/getPoolUsdFigure';
import pools, { poolIds } from 'constants/pools';
import { arrayToHashmap } from 'utils/Array';
import Web3 from 'web3';

const web3 = new Web3(`https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY_ETHEREUM}`);

const initialVolumesValues = arrayToHashmap(pools.map(({ id }) => [id, [-1, -1]]));

const toStatsKeyResolver = (normalizedKey) => {
  const statsKey = (
    normalizedKey === 'ren' ? 'ren2' :
    normalizedKey === 'sbtc' ? 'rens' :
    normalizedKey === 'iearn' ? 'y' :
    normalizedKey === 'susdv2' ? 'susd' :
    normalizedKey
  );

  return statsKey;
};

const getAPY = memoize(async () => {
  const [stablePoolStats, cryptoPoolStats] = await Promise.all([
    (await fetch('https://stats.curve.fi/raw-stats/apys.json')).json(),
    (await fetch('https://stats.curve.fi/raw-stats-crypto/apys.json')).json(),
  ]);
  const volumes = initialVolumesValues;

  for (const [key] of Object.entries(volumes)) {
    if (volumes[key] && volumes[key][0] === -1) {
      // Note: this doesn't work for crypto pools, needs some minor adaptation to look
      // in the right stats object
      const volume = stablePoolStats.volume[toStatsKeyResolver(key)];

      const pool = pools.find(({ id }) => id === key);

      // eslint-disable-next-line no-await-in-loop
      volumes[key][0] = await getPoolUsdFigure(volume, pool, web3) || 0;
      volumes[key][1] = volume || 0;
    }
  }

  const dailyApy = [];
  const weeklyApy = [];
  const monthlyApy = [];
  const apy = [];

  poolIds.forEach((poolId) => {
    const pool = pools.getById(poolId);
    const statsKey = toStatsKeyResolver(poolId);
    const stats = pool.cryptoPool ? cryptoPoolStats : stablePoolStats;

    dailyApy.push((((stats.apy.day[statsKey] > 0) ? stats.apy.day[statsKey] : 0) * 100).toFixed(2));
    weeklyApy.push((stats.apy.week[statsKey] * 100).toFixed(2));
    monthlyApy.push((stats.apy.month[statsKey] * 100).toFixed(2));
    apy.push((stats.apy.total[statsKey] * 100).toFixed(2));
  });

  return {
    volumes,
    dailyApy,
    weeklyApy,
    monthlyApy,
    apy,
  };
}, {
  promise: true,
  maxAge: 10 * 60 * 1000, // 10m
});

export default getAPY;
