import axios from 'axios';
import Web3 from 'web3';
import BN from 'bignumber.js';
import WEB3_CONSTANTS from 'constants/Web3';
import { fn } from 'utils/api';
import { getFeeDistributor } from 'utils/getters';
import { getThursdayUTCTimestamp } from 'utils/helpers';
import distributorAbi from 'constants/abis/distributor.json';
import tripoolSwapAbi from 'constants/abis/tripool_swap.json';
import configs from 'constants/configs';
import { BASE_API_DOMAIN } from 'constants/AppConstants';
import { runConcurrentlyAtMost } from 'utils/Async';
import getAllCurvePoolsData from 'utils/data/curve-pools-data';

const lc = (str) => str.toLowerCase();

// Pools for which volume data on the subgraph is incorrect, and needs
// to be overriden with a manual calculation.
const POOLS_WITH_INCORRECT_SUBGRAPH_USD_VOLUME = {
  ethereum: [
    '0x84997FAFC913f1613F51Bb0E2b5854222900514B',
    '0x2863a328a0b7fc6040f11614fa0728587db8e353',
  ].map(lc),
  polygon: [
    '0x7c1aa4989df27970381196d3ef32a7410e3f2748',
    '0xB05475d2A99ec4f7fa9ff1Ffb0e65894d2A639f3',
    '0x8914B29F7Bea602A183E89D6843EcB251D56D07e',
  ].map(lc),
};

export default fn(async ( {blockchainId} ) => {

  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum'; // Default value

  const config = configs[blockchainId];
  const web3 = new Web3(config.rpcUrl);

  if (typeof config === 'undefined') {
    throw new Error(`No factory data for blockchainId "${blockchainId}"`);
  }



  const GRAPH_ENDPOINT = config.graphEndpoint;
  const GRAPH_ENDPOINT_FALLBACK = config.fallbackGraphEndpoint;
  const CURRENT_TIMESTAMP = Math.round(new Date().getTime() / 1000);
  const TIMESTAMP_24H_AGO = CURRENT_TIMESTAMP - (25 * 3600);

  const allPools = await getAllCurvePoolsData([blockchainId]);
  const getPoolByAddress = (address) => (
    allPools.find((pool) => (lc(pool.address) === lc(address)))
  );

  const poolListData = await (await fetch(`${BASE_API_DOMAIN}/api/getPoolList/${blockchainId}`)).json()
  let poolList = poolListData.data.poolList
  let totalVolume = 0
  let cryptoVolume = 0

  await runConcurrentlyAtMost(poolList.map((_, i) => async () => {
    const poolAddress = lc(poolList[i].address);

      let POOL_QUERY = `
      {
        swapVolumeSnapshots(
          first: 1000,
          orderBy: timestamp,
          orderDirection: desc,
          where: {
            pool: "${poolAddress}"
            timestamp_gt: ${TIMESTAMP_24H_AGO}
            period: 3600
          }
        )
        {
          volume
          volumeUSD
          timestamp
          count
        }
      }
      `
      const res = await fetch(GRAPH_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: POOL_QUERY })
      })

      let data = await res.json()
      let rollingDaySummedVolume = 0
      let rollingRawVolume = 0

      if (GRAPH_ENDPOINT_FALLBACK && data.data.swapVolumeSnapshots.length === 0) {
        const res = await fetch(GRAPH_ENDPOINT_FALLBACK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: POOL_QUERY })
        })
        data = await res.json()
      }

      for (let i = 0; i < data.data.swapVolumeSnapshots.length; i ++) {
          const hourlyVolUSD = parseFloat(data.data.swapVolumeSnapshots[i].volumeUSD)
          rollingDaySummedVolume =  rollingDaySummedVolume + hourlyVolUSD

          const hourlyVol = parseFloat(data.data.swapVolumeSnapshots[i].volume)
          rollingRawVolume =  rollingRawVolume + hourlyVol
      }

      const hasRawVolumeButNoUsdVolume = (rollingDaySummedVolume === 0 && rollingRawVolume > 0);
      const needsFallbackUsdVolume = (
        hasRawVolumeButNoUsdVolume ||
        (POOLS_WITH_INCORRECT_SUBGRAPH_USD_VOLUME[blockchainId] || []).includes(poolAddress)
      );

      if (needsFallbackUsdVolume) {
        const ILLIQUID_THRESHOLD = 100;
        const poolData = getPoolByAddress(poolAddress);
        const poolLpTokenPrice = (
          poolData.usdTotal > ILLIQUID_THRESHOLD ?
            (poolData.usdTotal / (poolData.totalSupply / 1e18)) :
            0
        );
        const usdVolumeRectified = poolLpTokenPrice * rollingRawVolume;

        if (usdVolumeRectified > 0 || poolData.usdTotal <= ILLIQUID_THRESHOLD) {
          rollingDaySummedVolume = usdVolumeRectified;

          console.log(`Missing usd volume from subgraph: derived using lp token price from getPools endpoint for pool ${poolAddress} (derived rolling day usd volume: ${usdVolumeRectified})`);
        }
      }

      if (blockchainId === 'ethereum' && poolAddress === '0x141ace5fd4435fd341e396d579c91df99fed10d4') poolList[i].rawVolume = 0
      else poolList[i].rawVolume = rollingRawVolume

      poolList[i].volumeUSD = rollingDaySummedVolume

      totalVolume += parseFloat(rollingDaySummedVolume)
      cryptoVolume += (poolList[i].type.includes('crypto')) ? parseFloat(rollingDaySummedVolume) : 0


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

       if (GRAPH_ENDPOINT_FALLBACK && dataAPY.dailyPoolSnapshots.length === 0) {
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

       let latestDailyApy = 0
       let latestWeeklyApy = 0
       if (snapshots.length >= 2) {
         const isCryptoPool = snapshots[0].xcpProfit > 0;

         if (isCryptoPool && typeof snapshots[0].xcpProfit !== 'undefined' && snapshots[1].xcpProfit !== 0) {
           const currentProfit = ((snapshots[0].xcpProfit / 2) + (snapshots[0].xcpProfitA / 2) + 1e18) / 2;
           const dayOldProfit = ((snapshots[1].xcpProfit / 2) + (snapshots[1].xcpProfitA / 2) + 1e18) / 2;
           const rateDaily = (currentProfit - dayOldProfit) / dayOldProfit;
           latestDailyApy = ((rateDaily + 1) ** 365 - 1) * 100;
         } else if (snapshots[1].virtualPrice !== 0) {
           latestDailyApy = ((snapshots[0].baseApr + 1) ** 365 - 1) * 100;
         }
       }
       if (snapshots.length > 6) {
         const isCryptoPool = snapshots[0].xcpProfit > 0;

         if (isCryptoPool && typeof snapshots[0].xcpProfit !== 'undefined' && snapshots[6].xcpProfit !== 0) {
            const currentProfit = ((snapshots[0].xcpProfit / 2) + (snapshots[0].xcpProfitA / 2) + 1e18) / 2;
            const weekOldProfit = ((snapshots[6].xcpProfit / 2) + (snapshots[6].xcpProfitA / 2) + 1e18) / 2;
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
       poolList[i].virtualPrice = snapshots[0] ? snapshots[0].virtualPrice : undefined;

  }), 10);

  // When a crypto pool uses a base pool lp as one of its underlying assets, apy calculations
  // using xcp_profit need to add up 1/3rd of the underlying pool's base volume
  if (config.CRYPTO_POOLS_WITH_BASE_POOLS) {
    poolList = poolList.map((pool) => {
      if (config.CRYPTO_POOLS_WITH_BASE_POOLS.has(pool.address)) {
        const { latestDailyApy, latestWeeklyApy } = pool;
        const underlyingPoolAddress = config.CRYPTO_POOLS_WITH_BASE_POOLS.get(pool.address);
        const underlyingPool = poolList.find(({ address }) => address.toLowerCase() === underlyingPoolAddress.toLowerCase());
        if (!underlyingPool) {
          console.error(`Couldn't find underlying pool for crypto pool ${pool.address}, hence couldn't add up its base apy`);
          return pool;
        }

        return {
          ...pool,
          latestDailyApy: BN(latestDailyApy).plus(BN(underlyingPool.latestDailyApy).div(3)).toFixed(),
          latestWeeklyApy: BN(latestWeeklyApy).plus(BN(underlyingPool.latestWeeklyApy).div(3)).toFixed(),
        }
      }

      return pool;
    })
  }


  const cryptoShare = (cryptoVolume / totalVolume) * 100

  return { poolList, totalVolume, cryptoVolume, cryptoShare }
}, {
  maxAge: 5 * 60, // 15 min
});
