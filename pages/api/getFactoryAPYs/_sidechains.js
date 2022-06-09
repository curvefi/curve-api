import { BASE_API_DOMAIN } from "constants/AppConstants";
import configs from "constants/configs";
import { sum } from "utils/Array";

export default async ({ blockchainId }) => {
  const version = "stable"; // Helper variable for when sidechains have crypto factories
  const {
    data: { poolData },
  } = await (
    await fetch(`https://api.curve.fi/api/getFactoryV2Pools/${blockchainId}`)
  ).json();

  const poolDetails = [];

  const {
    data: { poolList: poolsStats },
  } = await (
    await fetch(`https://api.curve.fi/api/getSubgraphData/${blockchainId}`)
  ).json();
  poolData.forEach((pool, index) => {
    const lcSwapAddress = pool.address.toLowerCase();
    const poolStats = poolsStats.find(
      ({ address }) => address.toLowerCase() === lcSwapAddress
    );

    if (!poolStats) {
      const errorMessage = `Couldn't find pool address ${pool.address} in subgraph stats data`;

      return;
    }

    poolDetails.push({
      index,
      poolAddress: pool.address,
      poolSymbol: pool.symbol,
      apyFormatted: `${poolStats.latestDailyApy.toFixed(2)}%`,
      apy: poolStats.latestDailyApy,
      apyWeekly: poolStats.latestWeeklyApy,
      virtualPrice: poolStats.virtualPrice,
      volume: version === "stable" ? poolStats.rawVolume : poolStats.volumeUSD, // Crypto pools historically have usd volume there, keeping this inconsistency to avoid breakage
    });
  });

  const totalVolume = sum(poolDetails.map(({ volume }) => volume));

  poolDetails.sort((a, b) =>
    a.index > b.index ? 1 : b.index > a.index ? -1 : 0
  );

  return { poolDetails, totalVolume };
};
