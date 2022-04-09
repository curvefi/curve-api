import axios from 'axios';
import Web3 from 'web3';
import BigNumber from 'big-number';
import WEB3_CONSTANTS from 'constants/Web3';
import { fn } from 'utils/api';
import { getFeeDistributor } from 'utils/getters';
import { getThursdayUTCTimestamp } from 'utils/helpers';
import distributorAbi from 'constants/abis/distributor.json';
import tripoolSwapAbi from 'constants/abis/tripool_swap.json';
import configs from 'constants/configs';
import { BASE_API_DOMAIN } from 'constants/AppConstants';




export default fn(async ( {blockchainId} ) => {

  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum'; // Default value

  const config = configs[blockchainId];
  const web3 = new Web3(config.rpcUrl);

  if (typeof config === 'undefined') {
    throw new Error(`No factory data for blockchainId "${blockchainId}"`);
  }



  const GRAPH_ENDPOINT = config.graphEndpoint
  const CURRENT_TIMESTAMP = Math.round(new Date().getTime() / 1000);
  const TIMESTAMP_24H_AGO = CURRENT_TIMESTAMP - (25 * 3600);
  const poolListData = await (await fetch(`${BASE_API_DOMAIN}/api/getPoolList/${blockchainId}`)).json()
  let poolList = poolListData.data.poolList
  let totalVolume = 0

  for (var i = 0; i < poolList.length; i++) {


      let POOL_QUERY = `
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
      `
      const res = await fetch(GRAPH_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: POOL_QUERY })
      })

      const data = await res.json()
      let rollingDaySummedVolume = 0
      let rollingRawVolume = 0
      for (let i = 0; i < data.data.hourlySwapVolumeSnapshots.length; i ++) {
          const hourlyVolUSD = parseFloat(data.data.hourlySwapVolumeSnapshots[i].volumeUSD)
          rollingDaySummedVolume =  rollingDaySummedVolume + hourlyVolUSD

          const hourlyVol = parseFloat(data.data.hourlySwapVolumeSnapshots[i].volume)
          rollingRawVolume =  rollingRawVolume + hourlyVol
      }

      poolList[i].volumeUSD = rollingDaySummedVolume
      poolList[i].rawVolume = rollingRawVolume

      totalVolume += parseFloat(rollingDaySummedVolume)



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

       const resAPY = await fetch(GRAPH_ENDPOINT, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ query: APY_QUERY }),
       });

       let dataAPY = await resAPY.json();
       dataAPY = dataAPY.data;
       const snapshots = dataAPY.dailyPoolSnapshots.map((a) => ({
         baseApr: +a.baseApr,
         virtualPrice: +a.virtualPrice,
         xcpProfit: +a.xcpProfit,
         xcpProfitA: +a.xcpProfitA,
         timestamp: a.timestamp,
       }));

       let latestDailyApy = 0
       let latestWeeklyApy = 0
       if (snapshots.length >= 2) {
         const isCryptoPool = snapshots[0].xcpProfit > 0;

         if (isCryptoPool) {
           const currentProfit = ((snapshots[0].xcpProfit / 2) + (snapshots[0].xcpProfitA / 2) + 1e18) / 2;
           const dayOldProfit = ((snapshots[1].xcpProfit / 2) + (snapshots[1].xcpProfitA / 2) + 1e18) / 2;
           const rateDaily = (currentProfit - dayOldProfit) / dayOldProfit;
           latestDailyApy = ((rateDaily + 1) ** 365 - 1) * 100;
         } else {
           latestDailyApy = ((snapshots[0].baseApr + 1) ** 365 - 1) * 100;
         }
       }
       if (snapshots.length > 6) {
         const isCryptoPool = snapshots[0].xcpProfit > 0;

         if (isCryptoPool) {
            const currentProfit = ((snapshots[0].xcpProfit / 2) + (snapshots[0].xcpProfitA / 2) + 1e18) / 2;
            const weekOldProfit = ((snapshots[6].xcpProfit / 2) + (snapshots[6].xcpProfitA / 2) + 1e18) / 2;
            const rateWeekly = (currentProfit - weekOldProfit) / weekOldProfit;
            latestWeeklyApy = ((rateWeekly + 1) ** 52 - 1) * 100;
          } else {
            const latestWeeklyRate =
            (snapshots[0].virtualPrice - snapshots[6].virtualPrice) /
            snapshots[0].virtualPrice;
            latestWeeklyApy = ((latestWeeklyRate + 1) ** 52 - 1) * 100;
          }
        }
       poolList[i].latestDailyApy = latestDailyApy;
       poolList[i].latestWeeklyApy = latestWeeklyApy;
       poolList[i].virtualPrice = snapshots[0] ? snapshots[0].virtualPrice : undefined;

  }

  return { poolList, totalVolume }
}, {
  maxAge: 5 * 60, // 15 min
});
