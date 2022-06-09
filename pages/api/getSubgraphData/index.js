import axios from "axios";
import Web3 from "web3";
import BN from "bignumber.js";
import WEB3_CONSTANTS from "constants/Web3";
import { fn } from "utils/api";
import { getFeeDistributor } from "utils/getters";
import { getThursdayUTCTimestamp } from "utils/helpers";
import distributorAbi from "constants/abis/distributor.json";
import tripoolSwapAbi from "constants/abis/tripool_swap.json";
import configs from "constants/configs";
import { BASE_API_DOMAIN } from "constants/AppConstants";
import { runConcurrentlyAtMost } from "utils/Async";

export default fn(
  async ({ blockchainId }) => {
    if (typeof blockchainId === "undefined") blockchainId = "ethereum"; // Default value

    const config = configs[blockchainId];
    const web3 = new Web3(config.rpcUrl);

    if (typeof config === "undefined") {
      throw new Error(`No factory data for blockchainId "${blockchainId}"`);
    }

    const GRAPH_ENDPOINT = config.graphEndpoint;
    const GRAPH_ENDPOINT_FALLBACK = config.fallbackGraphEndpoint;
    const CURRENT_TIMESTAMP = Math.round(new Date().getTime() / 1000);
    const TIMESTAMP_24H_AGO = CURRENT_TIMESTAMP - 25 * 3600;
    const poolListData = await (
      await fetch(`${BASE_API_DOMAIN}/api/getPoolList/${blockchainId}`)
    ).json();
    let poolList = poolListData.data.poolList;
    let totalVolume = 0;
    let cryptoVolume = 0;

    await runConcurrentlyAtMost(
      poolList.map((_, i) => async () => {
        const POOL_QUERY = `
      {
        hourlySwapVolumeSnapshots(
          first: 1000,
          orderBy: timestamp,
          orderDirection: desc,
          where: {
            pool: "${poolList[i].address.toLowerCase()}"
            timestamp_gt: ${TIMESTAMP_24H_AGO}
          }
        )
        {
          volume
          volumeUSD
          timestamp
          count
        }
      }
      `;
        const res = await fetch(GRAPH_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: POOL_QUERY }),
        });

        let data = await res.json();
        let rollingDaySummedVolume = 0;
        let rollingRawVolume = 0;

        if (
          GRAPH_ENDPOINT_FALLBACK &&
          data.data.hourlySwapVolumeSnapshots.length === 0
        ) {
          const res = await fetch(GRAPH_ENDPOINT_FALLBACK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: POOL_QUERY }),
          });
          data = await res.json();
        }

        for (let i = 0; i < data.data.hourlySwapVolumeSnapshots.length; i++) {
          const hourlyVolUSD = parseFloat(
            data.data.hourlySwapVolumeSnapshots[i].volumeUSD
          );
          rollingDaySummedVolume = rollingDaySummedVolume + hourlyVolUSD;

          const hourlyVol = parseFloat(
            data.data.hourlySwapVolumeSnapshots[i].volume
          );
          rollingRawVolume = rollingRawVolume + hourlyVol;
        }

        poolList[i].volumeUSD = rollingDaySummedVolume;
        poolList[i].rawVolume = rollingRawVolume;

        totalVolume += parseFloat(rollingDaySummedVolume);
        cryptoVolume += poolList[i].type.includes("crypto")
          ? parseFloat(rollingDaySummedVolume)
          : 0;

        const APY_QUERY = `
     {
       dailyPoolSnapshots(first: 7,
                        orderBy: timestamp,
                        orderDirection: desc,
                        where:
                        {pool: "${poolList[i].address.toLowerCase()}"})
       {
         baseApr
         xcpProfit
         xcpProfitA
         virtualPrice
         timestamp
       }
     }
     `;

        // Without xcp fields
        const APY_QUERY_OLD = `
     {
       dailyPoolSnapshots(first: 7,
                        orderBy: timestamp,
                        orderDirection: desc,
                        where:
                        {pool: "${poolList[i].address.toLowerCase()}"})
       {
         baseApr
         virtualPrice
         timestamp
       }
     }
     `;

        const resAPY = await fetch(GRAPH_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: APY_QUERY }),
        });

        let dataAPY = await resAPY.json();
        dataAPY = dataAPY.data;

        if (
          GRAPH_ENDPOINT_FALLBACK &&
          dataAPY.dailyPoolSnapshots.length === 0
        ) {
          const resAPY = await fetch(GRAPH_ENDPOINT_FALLBACK, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: APY_QUERY_OLD }),
          });

          dataAPY = await resAPY.json();
          dataAPY = dataAPY.data;
        }

        const snapshots = dataAPY.dailyPoolSnapshots.map((a) => ({
          baseApr: +a.baseApr,
          virtualPrice: +a.virtualPrice,
          xcpProfit: a.xcpProfit ? +a.xcpProfit : undefined,
          xcpProfitA: a.xcpProfitA ? +a.xcpProfitA : undefined,
          timestamp: a.timestamp,
        }));

        let latestDailyApy = 0;
        let latestWeeklyApy = 0;
        if (snapshots.length >= 2) {
          const isCryptoPool = snapshots[0].xcpProfit > 0;

          if (
            isCryptoPool &&
            typeof snapshots[0].xcpProfit !== "undefined" &&
            snapshots[1].xcpProfit !== 0
          ) {
            const currentProfit =
              (snapshots[0].xcpProfit / 2 +
                snapshots[0].xcpProfitA / 2 +
                1e18) /
              2;
            const dayOldProfit =
              (snapshots[1].xcpProfit / 2 +
                snapshots[1].xcpProfitA / 2 +
                1e18) /
              2;
            const rateDaily = (currentProfit - dayOldProfit) / dayOldProfit;
            latestDailyApy = ((rateDaily + 1) ** 365 - 1) * 100;
          } else if (snapshots[1].virtualPrice !== 0) {
            latestDailyApy = ((snapshots[0].baseApr + 1) ** 365 - 1) * 100;
          }
        }
        if (snapshots.length > 6) {
          const isCryptoPool = snapshots[0].xcpProfit > 0;

          if (
            isCryptoPool &&
            typeof snapshots[0].xcpProfit !== "undefined" &&
            snapshots[6].xcpProfit !== 0
          ) {
            const currentProfit =
              (snapshots[0].xcpProfit / 2 +
                snapshots[0].xcpProfitA / 2 +
                1e18) /
              2;
            const weekOldProfit =
              (snapshots[6].xcpProfit / 2 +
                snapshots[6].xcpProfitA / 2 +
                1e18) /
              2;
            const rateWeekly = (currentProfit - weekOldProfit) / weekOldProfit;
            latestWeeklyApy = ((rateWeekly + 1) ** 52 - 1) * 100;
          } else if (snapshots[6].virtualPrice !== 0) {
            const latestWeeklyRate =
              (snapshots[0].virtualPrice - snapshots[6].virtualPrice) /
              snapshots[0].virtualPrice;
            latestWeeklyApy = ((latestWeeklyRate + 1) ** 52 - 1) * 100;
          }
        }
        poolList[i].latestDailyApy = Math.min(latestDailyApy, 1e6);
        poolList[i].latestWeeklyApy = Math.min(latestWeeklyApy, 1e6);
        poolList[i].virtualPrice = snapshots[0]
          ? snapshots[0].virtualPrice
          : undefined;
      }),
      2
    );

    // When a crypto pool uses a base pool lp as one of its underlying assets, apy calculations
    // using xcp_profit need to add up 1/3rd of the underlying pool's base volume
    if (config.CRYPTO_POOLS_WITH_BASE_POOLS) {
      poolList = poolList.map((pool) => {
        if (config.CRYPTO_POOLS_WITH_BASE_POOLS.has(pool.address)) {
          const { latestDailyApy, latestWeeklyApy } = pool;
          const underlyingPoolAddress = config.CRYPTO_POOLS_WITH_BASE_POOLS.get(
            pool.address
          );
          const underlyingPool = poolList.find(
            ({ address }) =>
              address.toLowerCase() === underlyingPoolAddress.toLowerCase()
          );
          if (!underlyingPool) {
            return pool;
          }

          return {
            ...pool,
            latestDailyApy: BN(latestDailyApy)
              .plus(BN(underlyingPool.latestDailyApy).div(3))
              .toFixed(),
            latestWeeklyApy: BN(latestWeeklyApy)
              .plus(BN(underlyingPool.latestWeeklyApy).div(3))
              .toFixed(),
          };
        }

        return pool;
      });
    }

    const cryptoShare = (cryptoVolume / totalVolume) * 100;

    return { poolList, totalVolume, cryptoVolume, cryptoShare };
  },
  {
    maxAge: 5 * 60, // 15 min
  }
);
