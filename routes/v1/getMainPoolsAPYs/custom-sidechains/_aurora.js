/**
 * Copy/pasted from old getFactoryAPYs code (most of those being replaced with subgraph data now)
 */

import Web3 from 'web3';
import configs from '#root/constants/configs/index.js';
import getPoolsFn from '#root/routes/v1/getPools/[blockchainId]/[registryId].js';
import factorypool3Abi from '#root/constants/abis/factory_swap.json' assert { type: 'json' };
import { getHardcodedPoolId } from '#root/constants/PoolAddressInternalIdMap.js';
import { arrayToHashmap } from '#root/utils/Array.js';

const web3 = new Web3(configs.aurora.rpcUrl);

export default async () => {
  const config = configs.aurora;
  const version = 2

  let res = await getPoolsFn.straightCall({ blockchainId: 'aurora', registryId: 'main' })
  let poolDetails = [];
  let totalVolume = 0

  const latest = await web3.eth.getBlockNumber()
  const DAY_BLOCKS_24H = config.approxBlocksPerDay;
  let DAY_BLOCKS = DAY_BLOCKS_24H

  await Promise.all(
    res.poolData.map(async (pool, index) => {

      let poolContract = new web3.eth.Contract(factorypool3Abi, pool.address)

      let vPriceOldFetch;
      try {
        vPriceOldFetch = await poolContract.methods.get_virtual_price().call('', latest - DAY_BLOCKS)
      } catch (e) {
        vPriceOldFetch = 1 * (10 ** 18)
      }
      const testPool = pool.address
      const eventName = 'TokenExchangeUnderlying';
      const eventName2 = 'TokenExchange';


      console.log(latest - DAY_BLOCKS, latest, 'blocks')
      const isMetaPool = (
        pool.implementation?.startsWith('v1metausd') ||
        pool.implementation?.startsWith('metausd') ||
        pool.implementation?.startsWith('v1metabtc') ||
        pool.implementation?.startsWith('metabtc')
      );

      let decimals = (
        version === 1 ? [pool.token.decimals, 18, 18, 18] :
          (version === 2 && isMetaPool) ? pool.underlyingDecimals :
            pool.decimals
      );
      let volume = 0;

      let events = await poolContract.getPastEvents(eventName, {
        filter: {}, // Using an array means OR: e.g. 20 or 23
        fromBlock: latest - DAY_BLOCKS,
        toBlock: 'latest'
      })

      events.map((trade) => {

        let t = trade.returnValues['tokens_bought'] / 10 ** decimals[trade.returnValues['bought_id']]
        volume += t

      })


      if (version == '2') {
        let events2 = await poolContract.getPastEvents(eventName2, {
          filter: {}, // Using an array means OR: e.g. 20 or 23
          fromBlock: latest - DAY_BLOCKS,
          toBlock: 'latest'
        })

        events2.map((trade) => {
          let t = trade.returnValues[2] / 10 ** decimals[trade.returnValues[1]]
          volume += t
        })


      }

      // Since we don't fetch blocks for the entirety of the past 24 hours,
      // we multiply the split volume accordingly
      const correctedVolume = volume * (DAY_BLOCKS_24H / DAY_BLOCKS);

      let vPriceFetch
      try {
        vPriceFetch = await poolContract.methods.get_virtual_price().call()
      } catch (e) {
        vPriceFetch = 1 * (10 ** 18)
      }

      let vPrice = vPriceOldFetch
      let vPriceNew = vPriceFetch
      let apy = (vPriceNew - vPrice) / vPrice * 365
      let apyFormatted = `${apy.toFixed(2)}%`
      totalVolume += correctedVolume
      let p = {
        index,
        'poolAddress': pool.address,
        'poolSymbol': version === 1 ? pool.token.symbol : pool.symbol,
        apyFormatted,
        apy,
        'virtualPrice': vPriceFetch,
        volume: correctedVolume,
      }
      poolDetails.push(p)
    })
  )

  poolDetails.sort((a, b) => (a.index > b.index) ? 1 : ((b.index > a.index) ? -1 : 0))

  const formattedToMatchRawStats = {
    apy: {
      day: arrayToHashmap(poolDetails.map(({ poolAddress, apy }) => [
        getHardcodedPoolId('aurora', poolAddress),
        apy,
      ])),
      week: arrayToHashmap(poolDetails.map(({ poolAddress, apy }) => [
        getHardcodedPoolId('aurora', poolAddress),
        apy * 7,
      ])),
      month: arrayToHashmap(poolDetails.map(({ poolAddress, apy }) => [
        getHardcodedPoolId('aurora', poolAddress),
        apy * 30,
      ])),
    },
    volume: arrayToHashmap(poolDetails.map(({ poolAddress, volume }) => [
      getHardcodedPoolId('aurora', poolAddress),
      volume,
    ])),
  };

  return formattedToMatchRawStats;
};
