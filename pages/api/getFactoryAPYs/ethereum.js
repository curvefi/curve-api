import Web3 from 'web3';
import BigNumber from 'big-number';
import WEB3_CONSTANTS from 'constants/Web3';
import configs from 'constants/configs';
import { BASE_API_DOMAIN, IS_DEV } from 'constants/AppConstants';
import FACTORY_CRYPTO_POOL_ABI from 'constants/abis/factory-crypto-swap.json';

import { fn } from 'utils/api';
import { getMultiCall, getFactoryRegistry } from 'utils/getters';
import registryAbi from 'constants/abis/factory_registry.json';
import multicallAbi from 'constants/abis/multicall.json';
import erc20Abi from 'constants/abis/erc20.json';
import factorypool3Abi from 'constants/abis/factory_swap.json';
import getSubgraphData from 'pages/api/getSubgraphData';
import { sum } from 'utils/Array';

const web3 = new Web3(WEB3_CONSTANTS.RPC_URL);

export default fn(async ({ version }) => {
    version = (
      version === 'crypto' ? 'crypto' :
      Number(version) === 2 ? 2 :
      1
    );

    let registryAddress = await getFactoryRegistry();
    let multicallAddress = await getMultiCall()
  	let registry = new web3.eth.Contract(registryAbi, registryAddress);
  	let multicall = new web3.eth.Contract(multicallAbi, multicallAddress)

    const factoryPoolsApiEndpoint = (
      version === 1 ? 'getFactoryPools' :
      version === 2 ? 'getFactoryV2Pools' :
      version === 'crypto' ? 'getPools/ethereum/factory-crypto' :
      undefined
    );
    const { data: { poolData } } = await (await fetch(`https://api.curve.fi/api/${factoryPoolsApiEndpoint}`)).json()

    let poolDetails = [];
    let totalVolume = 0

    if (version === 1) {
      const latest = await web3.eth.getBlockNumber();
      await Promise.all(
        poolData.map(async (pool, index) => {

            let poolContract = new web3.eth.Contract(factorypool3Abi, pool.address)
            let DAY_BLOCKS = 6550

            const testPool = pool.address
            const eventName = 'TokenExchangeUnderlying';
            const eventName2 = 'TokenExchange';

            const isMetaPool = (
              pool.implementation?.startsWith('v1metausd') ||
              pool.implementation?.startsWith('metausd') ||
              pool.implementation?.startsWith('v1metabtc') ||
              pool.implementation?.startsWith('metabtc')
            );

            let decimals = [pool.token.decimals, 18, 18, 18];
            let volume = 0;

            let vPriceFetch = 1 * (10 ** 18)
            try {
              vPriceFetch = await poolContract.methods.get_virtual_price().call()
            } catch (e) {
              vPriceFetch = 1 * (10 ** 18)
            }

            let rateDaily;
            let rateWeekly;

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

            rateDaily = (vPriceFetch - vPriceDayOldFetch) / vPriceDayOldFetch;
            rateWeekly = (vPriceFetch - vPriceWeekOldFetch) / vPriceWeekOldFetch;

            const apy = (((1 + rateDaily) ** 365) - 1) * 100;
            const apyWeekly = (((1 + rateWeekly) ** (365 / 7)) - 1) * 100;

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

            const apyFormatted = `${apy.toFixed(2)}%`
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
    } else {
      const { data: { poolList: poolsStats } } = await (await fetch('https://api.curve.fi/api/getSubgraphData/ethereum')).json();
      poolData.forEach((pool, index) => {
        const lcSwapAddress = pool.address.toLowerCase();
        const poolStats = poolsStats.find(({ address }) => address.toLowerCase() === lcSwapAddress);

        if (!poolStats) {
            const errorMessage = `Couldn't find pool address ${pool.address} in subgraph stats data`;

            if (IS_DEV) throw new Error(errorMessage);
            else {}
        }

        poolDetails.push({
          index,
          poolAddress: pool.address,
          poolSymbol: pool.symbol,
          apyFormatted: `${poolStats.latestDailyApy.toFixed(2)}%`,
          apy: poolStats.latestDailyApy,
          apyWeekly: poolStats.latestWeeklyApy,
          virtualPrice: poolStats.virtualPrice,
          volume: version === 2 ? poolStats.rawVolume : poolStats.volumeUSD, // Facto pools historically have usd volume there, keeping this inconsistency to avoid breakage
          ...(version === 2 ? { usdVolume: poolStats.volumeUSD } : {}), // Attach usd volume for facto pools
        });
      });

      totalVolume = sum(poolDetails.map(({ volume }) => volume));
    }


    poolDetails.sort((a,b) => (a.index > b.index) ? 1 : ((b.index > a.index) ? -1 : 0))

    return { poolDetails, totalVolume };

}, {
  maxAge: 30, // 30s
});
