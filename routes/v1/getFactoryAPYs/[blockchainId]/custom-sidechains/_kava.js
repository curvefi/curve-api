/**
 * Custom implementation because reliance on `getFactoryAPYs/_sidechains` implies
 * two requirements: (1) need for thegraph to support the chain, and (2) need for
 * a uniswap fork to be running on that chain for the subgraph to use as an
 * external oracle where needed.
 * Moonbeam satisfies (1) but not (2), so it uses a suboptimal custom setup for now.
 */

import Web3 from 'web3';
import configs from '#root/constants/configs/index.js';
import factorypool3Abi from '#root/constants/abis/factory_swap.json' assert { type: 'json' };
import getAllCurvePoolsData from '#root/utils/data/curve-pools-data.js';

/**
 * The official rpc url evm.kava.io has trouble retrieving past pool virtual prices,
 * so we use another rpc for this specific purpose. The official rpc gives access
 * to past logs though, which most other free rpcs do not, so we still use the
 * official rpc for other purposes.
 */
const web3 = new Web3(configs.kava.rpcUrl);
const web3NoArchival = new Web3(configs.kava.noArchivalAlternateRpcUrl);

export default async ({ version }) => {
  const config = configs.kava;

  const poolData = (await getAllCurvePoolsData(['kava'])).filter(({ registryId }) => (
    version === 'crypto' ?
      registryId.endsWith('crypto') :
      !registryId.endsWith('crypto')
  ));
  let poolDetails = [];
  let totalVolume = 0

  const latest = await web3.eth.getBlockNumber()
  const DAY_BLOCKS_24H = config.approxBlocksPerDay;
  let DAY_BLOCKS = 50

  await Promise.all(
    poolData.map(async (pool, index) => {

      const poolContractForVpriceFetching = new web3NoArchival.eth.Contract(factorypool3Abi, pool.address)
      const poolContract = new web3.eth.Contract(factorypool3Abi, pool.address)

      let vPriceOldFetch;
      let vPriceOldFetchFailed = false;
      let vPriceOldFetchFailedBecauseBlockPruned = false;

      try {
        vPriceOldFetch = await poolContractForVpriceFetching.methods.get_virtual_price().call('', latest - DAY_BLOCKS)
      } catch (e) {
        console.log('error', e, e.message)
        vPriceOldFetchFailed = true;
        vPriceOldFetch = 1 * (10 ** 18)

        if (!e.message.includes('execution reverted')) vPriceOldFetchFailedBecauseBlockPruned = true;
      }
      const eventName = 'TokenExchangeUnderlying';
      const eventName2 = 'TokenExchange';


      // console.log(latest - DAY_BLOCKS, latest, 'blocks')
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
        vPriceFetch = await poolContractForVpriceFetching.methods.get_virtual_price().call()
      } catch (e) {
        vPriceFetch = 1 * (10 ** 18)
      }

      let vPrice = vPriceOldFetchFailed ? vPriceFetch : vPriceOldFetch
      let vPriceNew = vPriceFetch
      let apy = (vPriceNew - vPrice) / vPrice * 100 * 365
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
        failedFetching24hOldVprice: vPriceOldFetchFailedBecauseBlockPruned,
      }
      poolDetails.push(p)
    })
  )

  poolDetails.sort((a, b) => (a.index > b.index) ? 1 : ((b.index > a.index) ? -1 : 0))

  return { poolDetails, totalVolume, latest };

};
