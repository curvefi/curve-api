import { sum } from '#root/utils/Array.js';
import getSubgraphDataFn from '#root/routes/v1/getSubgraphData/[blockchainId].js';
import getPoolsFn from '#root/routes/v1/getPools/[blockchainId]/[registryId].js';

export default async ({ blockchainId, version }) => {
  const { poolData } = (
    version === 'stable' ?
      await getPoolsFn.straightCall({ blockchainId, registryId: 'factory' }) :
      await getPoolsFn.straightCall({ blockchainId, registryId: 'factory-crypto' })
  );

  const poolDetails = [];

  const { poolList: poolsStats } = await getSubgraphDataFn.straightCall({ blockchainId });
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

  poolDetails.sort((a, b) => (a.index > b.index) ? 1 : ((b.index > a.index) ? -1 : 0))

  return { poolDetails, totalVolume };
};
