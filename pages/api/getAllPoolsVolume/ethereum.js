import getFactoryAPYs from 'pages/api/getFactoryAPYs';
import { arrayToHashmap, sum } from 'utils/Array';
import Request from 'utils/Request';
import { fn } from 'utils/api';

export default fn(async () => {
  const [
    mainPoolsStats,
    mainCryptoPoolsStats,
    factoryV1Apys,
    factoryV2Apys,
  ] = await Promise.all([
    (await Request.get('https://stats.curve.fi/raw-stats/apys.json')).json(),
    (await Request.get('https://stats.curve.fi/raw-stats-crypto/apys.json')).json(),
    getFactoryAPYs.straightCall({ version: 1 }),
    getFactoryAPYs.straightCall({ version: 2 }),
  ]);

  const poolsVolume = {
    ...mainPoolsStats.volume,
    ...mainCryptoPoolsStats.volume,
    ...arrayToHashmap(factoryV1Apys.poolDetails.map(({ poolSymbol, poolAddress, volume }) => [
      `${poolSymbol}-${poolAddress}`,
      volume,
    ])),
    ...arrayToHashmap(factoryV2Apys.poolDetails.map(({ poolSymbol, poolAddress, volume }) => [
      `${poolSymbol}-${poolAddress}`,
      volume,
    ])),
  };

  const totalVolume = sum(Array.from(Object.values(poolsVolume)));

  return {
    poolsVolume,
    totalVolume,
  };
}, {
  maxAge: 10 * 60, // 10m
});
