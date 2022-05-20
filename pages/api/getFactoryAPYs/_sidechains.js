import { BASE_API_DOMAIN, IS_DEV } from 'constants/AppConstants';
import configs from 'constants/configs';
import { sum } from 'utils/Array';

export default async ({ blockchainId, version }) => {
    if (typeof version === 'undefined') version = 'stable'; // Default value

    const { data: { poolData } } = await (await fetch(`${BASE_API_DOMAIN}/api/${version === 'stable' ? 'getFactoryV2Pools' : 'getFactoryCryptoPools'}/${blockchainId}`)).json()

    const poolDetails = [];

    const { data: { poolList: poolsStats } } = await (await fetch(`https://api.curve.fi/api/getSubgraphData/${blockchainId}`)).json();
    poolData.forEach((pool, index) => {
      const lcSwapAddress = pool.address.toLowerCase();
      const poolStats = poolsStats.find(({ address }) => address.toLowerCase() === lcSwapAddress);

      if (!poolStats) {
          const errorMessage = `Couldn't find pool address ${pool.address} in subgraph stats data`;
          console.error(errorMessage)

          poolDetails.push({
            index,
            poolAddress: pool.address,
            poolSymbol: pool.symbol,
            apyFormatted: undefined,
            apy: undefined,
            apyWeekly: undefined,
            virtualPrice: undefined,
            volume: undefined,
          });
      } else {
        poolDetails.push({
          index,
          poolAddress: pool.address,
          poolSymbol: pool.symbol,
          apyFormatted: `${poolStats.latestDailyApy.toFixed(2)}%`,
          apy: poolStats.latestDailyApy,
          apyWeekly: poolStats.latestWeeklyApy,
          virtualPrice: poolStats.virtualPrice,
          volume: version === 'stable' ? poolStats.rawVolume : poolStats.volumeUSD, // Crypto pools historically have usd volume there, keeping this inconsistency to avoid breakage
        });
      }
    });

    const totalVolume = sum(poolDetails.map(({ volume }) => volume));

    poolDetails.sort((a,b) => (a.index > b.index) ? 1 : ((b.index > a.index) ? -1 : 0))

    return { poolDetails, totalVolume };

};
