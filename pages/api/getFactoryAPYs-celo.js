/**
 * Custom implementation because reliance on `getFactoryAPYs/_sidechains` implies
 * two requirements: (1) need for thegraph to support the chain, and (2) need for
 * a uniswap fork to be running on that chain for the subgraph to use as an
 * external oracle where needed.
 * Moonbeam satisfies (1) but not (2), so it uses a suboptimal custom setup for now.
 */

import Web3 from 'web3';
import BigNumber from 'big-number';
import { BASE_API_DOMAIN } from 'constants/AppConstants';

import getPoolsFn from 'pages/api/getPools';
import configs from 'constants/configs';
import { fn } from 'utils/api';
import registryAbi from 'constants/abis/factory_registry.json';
import multicallAbi from 'constants/abis/multicall.json';
import factorypool3Abi from 'constants/abis/factory_swap.json';

const web3 = new Web3(configs.celo.rpcUrl);

export default fn(async (query) => {
  const config = configs.celo;
  const version = 2

  let registryAddress = await config.getFactoryRegistryAddress();
  let multicallAddress = config.multicallAddress;
	let registry = new web3.eth.Contract(registryAbi, registryAddress);
	let multicall = new web3.eth.Contract(multicallAbi, multicallAddress)
  let res = await getPoolsFn.straightCall({ blockchainId: 'celo', registryId: 'factory' })
  let poolDetails = [];
  let totalVolume = 0

  const latest = await web3.eth.getBlockNumber()
  const DAY_BLOCKS_24H = config.approxBlocksPerDay;
  let DAY_BLOCKS = 9000

  await Promise.all(
    res.poolData.map(async (pool, index) => {

      let poolContract = new web3.eth.Contract(factorypool3Abi, pool.address)

      let vPriceOldFetch;
      try {
      vPriceOldFetch = await poolContract.methods.get_virtual_price().call('', latest - DAY_BLOCKS)
      } catch (e) {
        console.error(`Couldn't fetch get_virtual_price for block ${latest - DAY_BLOCKS}: ${e.toString()}`);
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
      let apy = (vPriceNew - vPrice) / vPrice * 100 * 365
      let apyFormatted = `${apy.toFixed(2)}%`
      totalVolume += correctedVolume

      if (index === 1) console.log({
        vPrice,
        vPriceNew,
        apy,
      })

      let p = {
      index,
      'poolAddress' : pool.address,
      'poolSymbol' : version === 1 ? pool.token.symbol : pool.symbol,
      apyFormatted,
      apy,
      'virtualPrice':vPriceFetch,
      volume: correctedVolume,
      }
      poolDetails.push(p)
    })
  )

  poolDetails.sort((a,b) => (a.index > b.index) ? 1 : ((b.index > a.index) ? -1 : 0))

  return { poolDetails, totalVolume, latest };

}, {
  maxAge: 30, // 30s
});
