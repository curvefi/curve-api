import Web3 from 'web3';
import BigNumber from 'big-number';
import WEB3_CONSTANTS from 'constants/Web3';
import { IS_DEV } from 'constants/AppConstants';

import { fn } from '../../utils/api';
import { getFactoryRegistry, getMultiCall } from '../../utils/getters';
import registryAbi from '../../constants/abis/factory_registry.json';
import multicallAbi from '../../constants/abis/multicall.json';
import erc20Abi from '../../constants/abis/erc20.json';
import factorypool3Abi from '../../constants/abis/factory_swap.json';

const web3 = new Web3(WEB3_CONSTANTS.RPC_URL);
const BASE_API_DOMAIN = IS_DEV ? 'http://localhost:3000' : 'https://api.curve.fi';

export default fn(async (query) => {
    const version = (
      query.version === 'crypto' ? 'crypto' :
      Number(query.version) === 2 ? 2 :
      1
    );

    let registryAddress = await getFactoryRegistry()
    let multicallAddress = await getMultiCall()
  	let registry = new web3.eth.Contract(registryAbi, registryAddress);
  	let multicall = new web3.eth.Contract(multicallAbi, multicallAddress)

    const factoryPoolsApiEndpoint = (
      version === 1 ? 'getFactoryPools' :
      version === 2 ? 'getFactoryV2Pools' :
      version === 'crypto' ? 'getFactoryCryptoPools/ethereum' :
      undefined
    );
    let res = await (await fetch(`${BASE_API_DOMAIN}/api/${factoryPoolsApiEndpoint}`)).json()

    let poolDetails = [];
    let totalVolume = 0

    await Promise.all(
      res.data.poolData.map(async (pool, index) => {

          let poolContract = new web3.eth.Contract(factorypool3Abi, pool.address)
          let DAY_BLOCKS = 6550
          let latest = await web3.eth.getBlockNumber()

          let vPriceDayOldFetch;
          let vPriceWeekOldFetch;
          try {
            vPriceDayOldFetch = await poolContract.methods.get_virtual_price().call('', latest - DAY_BLOCKS)
          } catch (e) {
            vPriceDayOldFetch = 1 * (10 ** 18)
            DAY_BLOCKS = 1;
          }
          try {
            vPriceWeekOldFetch = await poolContract.methods.get_virtual_price().call('', latest - (DAY_BLOCKS * 7))
          } catch (e) {
            vPriceWeekOldFetch = vPriceDayOldFetch
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

            if (pool.address.toLowerCase() === '0x8461a004b50d321cb22b7d034969ce6803911899') {
              volume  = 0
            }
            if (pool.address.toLowerCase() === '0x8818a9bb44Fbf33502bE7c15c500d0C783B73067') {
              volume  = 0
            }
          }

          // Crypto facto pools don't seem to emit named events, so instead we're
          // fetching all events and filtering by topic, and decoding data manually
          if (version === 'crypto') {
            let events3 = await poolContract.getPastEvents('allEvents', {
                filter: {},
                topics: ['0xb2e76ae99761dc136e598d4a629bb347eccb9532a5f8bbd72e18467c3c34cc98'],
                fromBlock: latest - DAY_BLOCKS,
                toBlock: 'latest'
            })
            events3.map(async (trade) => {
              const {
                bought_id: boughtId,
                tokens_bought: tokensBought,
              } = web3.eth.abi.decodeLog(
                [{"name":"sold_id","type":"uint256","indexed":false},{"name":"tokens_sold","type":"uint256","indexed":false},{"name":"bought_id","type":"uint256","indexed":false},{"name":"tokens_bought","type":"uint256","indexed":false}],
                trade.raw.data,
                ['0xb2e76ae99761dc136e598d4a629bb347eccb9532a5f8bbd72e18467c3c34cc98']
              );

              const coinBought = pool.coins[boughtId];
              const amountBought = tokensBought / (10 ** coinBought.decimals);
              const tradeUsdValue = amountBought * coinBought.usdPrice;
              volume += tradeUsdValue;
            })

            if (pool.address.toLowerCase() === '0x8461a004b50d321cb22b7d034969ce6803911899') {
              volume  = 0
            }
            if (pool.address.toLowerCase() === '0x8818a9bb44Fbf33502bE7c15c500d0C783B73067') {
              volume  = 0
            }
          }



          let vPriceFetch
          try {
            vPriceFetch = await poolContract.methods.get_virtual_price().call()
          } catch (e) {
            vPriceFetch = 1 * (10 ** 18)
          }

          const rateDaily = (vPriceFetch - vPriceDayOldFetch) / vPriceDayOldFetch;
          const apy = (((1 + rateDaily) ** 365) - 1) * 100;
          const rateWeekly = (vPriceFetch - vPriceWeekOldFetch) / vPriceWeekOldFetch;
          const apyWeekly = (((1 + rateWeekly) ** (365 / 7)) - 1) * 100;
          let apyFormatted = `${apy.toFixed(2)}%`
          totalVolume += volume
          let p = {
            index,
            'poolAddress' : pool.address,
            'poolSymbol' : version === 1 ? pool.token.symbol : pool.symbol,
            apyFormatted,
            apy,
            apyWeekly,
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
