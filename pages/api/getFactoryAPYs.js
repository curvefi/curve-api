import Web3 from 'web3';
import BigNumber from 'big-number';
import { IS_DEV } from 'constants/AppConstants';

import { fn } from '../../utils/api';
import { getFactoryRegistry, getMultiCall } from '../../utils/getters';
import registryAbi from '../../constants/abis/factory_registry.json';
import multicallAbi from '../../constants/abis/multicall.json';
import erc20Abi from '../../constants/abis/erc20.json';
import factorypool3Abi from '../../constants/abis/factory_swap.json';

const web3 = new Web3(`https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY_ETHEREUM}`);
const BASE_API_DOMAIN = IS_DEV ? 'http://localhost:3000' : 'https://api.curve.fi';

export default fn(async (query) => {
    const version = query.version === '2' ? 2 : 1;

    let registryAddress = await getFactoryRegistry()
    let multicallAddress = await getMultiCall()
  	let registry = new web3.eth.Contract(registryAbi, registryAddress);
  	let multicall = new web3.eth.Contract(multicallAbi, multicallAddress)

    let res = await (await fetch(`${BASE_API_DOMAIN}/api/${version === 1 ? 'getFactoryPools' : 'getFactoryV2Pools'}`)).json()

    let poolDetails = [];
    let totalVolume = 0

    await Promise.all(
      res.data.poolData.map(async (pool, index) => {

          let poolContract = new web3.eth.Contract(factorypool3Abi, pool.address)
          let DAY_BLOCKS = 6550
          let latest = await web3.eth.getBlockNumber()

          let vPriceOldFetch;
          try {
            vPriceOldFetch = await poolContract.methods.get_virtual_price().call('', latest - DAY_BLOCKS)
          } catch (e) {
            vPriceOldFetch = 1 * (10 ** 18)
            DAY_BLOCKS = 1;
          }
          const testPool = pool.address
          const eventName = 'TokenExchangeUnderlying';
          const eventName2 = 'TokenExchange';

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
          events.map(async (trade) => {

                let t = trade.returnValues['tokens_bought'] / 10 ** decimals[trade.returnValues['bought_id']]
                volume += t

            // if (t > 1000000) {
            //   console.log('$',t, trade.transactionHash)
            // }
          })


          if (version == '2') {
            let events2 = await poolContract.getPastEvents(eventName2, {
                filter: {}, // Using an array means OR: e.g. 20 or 23
                fromBlock: latest - DAY_BLOCKS,
                toBlock: 'latest'
            })

            events2.map(async (trade) => {

              let t = trade.returnValues[2] / 10 ** decimals[trade.returnValues[1]]
              volume += t

              // if (t > 1000000) {
              //   console.log('$',t, trade.transactionHash)
              // }
            })
          }



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
          totalVolume += volume
          let p = {
            index,
            'poolAddress' : pool.address,
            'poolSymbol' : version === 1 ? pool.token.symbol : pool.symbol,
            apyFormatted,
            apy,
            'virtualPrice':vPriceFetch,
            volume,
          }
          poolDetails.push(p)
      })
    )
    poolDetails.sort((a,b) => (a.index > b.index) ? 1 : ((b.index > a.index) ? -1 : 0))

    return { poolDetails, totalVolume };

}, {
  maxAge: 30, // 30s
});
