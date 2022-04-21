import getFactoryAPYs from 'pages/api/getFactoryAPYs';
import { arrayToHashmap, sum } from 'utils/Array';
import Request from 'utils/Request';
import getPoolUsdFigure from 'utils/data/getPoolUsdFigure';
import pools from 'constants/pools';
import { fn } from 'utils/api';
import { sequentialPromiseMap } from 'utils/Async';

const normalizeMainPoolId = (poolId) => (
  poolId === 'y' ? 'iearn' :
  poolId === 'susd' ? 'susdv2' :
  poolId === 'ren2' ? 'ren' :
  poolId === 'rens' ? 'sbtc' : poolId
);

const getMainPoolFromId = (poolId) => {
  const pool = pools.getById(normalizeMainPoolId(poolId));
  if (!pool) throw new Error(`Pool id "${poolId}" not found, it needs to be added to the config`);
  return pool;
};

export default fn(async () => {
  const [
    mainPoolsStats,
    mainCryptoPoolsStats,
    factoryV2Apys,
  ] = await Promise.all([
    (await Request.get('https://stats.curve.fi/raw-stats/apys.json')).json(),
    (await Request.get('https://stats.curve.fi/raw-stats-crypto/apys.json')).json(),
    getFactoryAPYs.straightCall({ version: 2 }),
  ]);

  const mainPoolsIds = [
    ...Array.from(Object.keys(mainPoolsStats.volume)),
    ...Array.from(Object.keys(mainCryptoPoolsStats.volume)),
  ];
  const mainPoolsAddresses = mainPoolsIds.map((poolId) => getMainPoolFromId(poolId)?.addresses?.swap?.toLowerCase());

  // Some facto pools have been added to the main registry; make sure they're not double-counted
  const dedupedFactoV2PoolData = factoryV2Apys.poolDetails.filter(({ poolAddress }) => !mainPoolsAddresses.includes(poolAddress.toLowerCase()));

  const poolsVolume = {
    ...arrayToHashmap(await sequentialPromiseMap(Array.from(Object.entries(mainPoolsStats.volume)), async ([poolId, nativeAssetVolume]) => [
      poolId,
      await getPoolUsdFigure(nativeAssetVolume, getMainPoolFromId(poolId)),
    ])),
    ...mainCryptoPoolsStats.volume,
    ...arrayToHashmap(dedupedFactoV2PoolData.map(({ poolSymbol, poolAddress, volume, usdVolume }) => [
      `${poolSymbol}-${poolAddress}`,
      (usdVolume || volume),
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
