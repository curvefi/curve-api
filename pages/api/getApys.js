import getAPY from 'utils/data/getAPY';
import getCRVAPY from 'utils/data/getCRVAPY';
import getMainPoolsGaugeRewards from 'pages/api/getMainPoolsGaugeRewards';
import { arrayToHashmap } from 'utils/Array';
import pools from 'constants/pools';
import { fn } from '../../utils/api';

export default fn(async ({ address }) => {
  const [
    mainPoolsGaugeRewards,
    { weeklyApy: baseApys },
    { CRVAPYs: crvApys, boosts, CRVprice: crvPrice },
  ] = await Promise.all([
    getMainPoolsGaugeRewards.straightCall(),
    getAPY(),
    getCRVAPY(address || '0x0000000000000000000000000000000000000000'),
  ]);

  return arrayToHashmap(pools.map((pool, index) => [pool.id, {
    baseApy: baseApys[index],
    crvApy: crvApys[pool.id],
    crvBoost: boosts[pool.id],
    additionalRewards: (
      pool.addresses.gauge ? (
        mainPoolsGaugeRewards[pool.addresses.gauge.toLowerCase()]?.map(({ symbol, apy }) => ({
          name: symbol,
          apy,
        })) || []
      ) : []
    ),
    crvPrice,
  }]));
}, {
  maxAge: 10 * 60, // 10m
});
