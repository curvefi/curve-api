import Web3 from 'web3';
import * as WEB3_CONSTANTS from '#root/constants/Web3.js';
import { IS_DEV } from '#root/constants/AppConstants.js';
import { getMultiCall, getFactoryRegistry } from '#root/utils/getters.js';
import registryAbi from '#root/constants/abis/factory_registry.json' with { type: 'json' };
import multicallAbi from '#root/constants/abis/multicall.json' with { type: 'json' };
import factorypool3Abi from '#root/constants/abis/factory_swap.json' with { type: 'json' };
import { sum } from '#root/utils/Array.js';
import getPoolsFn from '#root/routes/v1/getPools/[blockchainId]/[registryId].js';
import getFactoryPoolsFn from '#root/routes/v1/getFactoryPools.js';
import getSubgraphDataFn from '#root/routes/v1/getSubgraphData/[blockchainId].js';

const web3 = new Web3(WEB3_CONSTANTS.RPC_URL);

export default async ({ version }) => {
  version = (
    version === 'crypto' ? 'crypto' :
      Number(version) === 2 ? 2 :
        1
  );

  let registryAddress = await getFactoryRegistry();
  let multicallAddress = await getMultiCall()
  let registry = new web3.eth.Contract(registryAbi, registryAddress);
  let multicall = new web3.eth.Contract(multicallAbi, multicallAddress)

  const { poolData } = (
    version === 1 ? await getFactoryPoolsFn.straightCall() : // Old factory
      version === 2 ? await getPoolsFn.straightCall({ blockchainId: 'ethereum', registryId: 'factory' }) :
        version === 'crypto' ? await getPoolsFn.straightCall({ blockchainId: 'ethereum', registryId: 'factory-crypto' }) :
          {}
  );

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
          'poolAddress': pool.address,
          'poolSymbol': version === 1 ? pool.token.symbol : pool.symbol,
          apyFormatted,
          apy,
          apyWeekly,
          'virtualPrice': vPriceFetch,
          volume,
        }
        poolDetails.push(p)
      })
    )
  } else {
    const { poolList: poolsStats } = await getSubgraphDataFn.straightCall({ blockchainId: 'ethereum' });
    poolData.forEach((pool, index) => {
      const lcSwapAddress = pool.address.toLowerCase();
      const poolStats = poolsStats.find(({ address }) => address.toLowerCase() === lcSwapAddress);

      if (!poolStats) {
        const errorMessage = `Couldn't find pool address ${pool.address} in subgraph stats data`;

        if (IS_DEV) throw new Error(errorMessage);
        else console.error(errorMessage);
      }

      poolDetails.push({
        index,
        poolAddress: pool.address,
        poolSymbol: pool.symbol,
        apyFormatted: `${(poolStats.latestDailyApy ?? 0).toFixed(2)}%`,
        apy: poolStats.latestDailyApy,
        apyWeekly: poolStats.latestWeeklyApy,
        virtualPrice: poolStats.virtualPrice,
        volume: version === 2 ? poolStats.rawVolume : poolStats.volumeUSD, // Facto pools historically have usd volume there, keeping this inconsistency to avoid breakage
        ...(version === 2 ? { usdVolume: poolStats.volumeUSD } : {}), // Attach usd volume for facto pools
      });
    });

    totalVolume = sum(poolDetails.map(({ volume }) => volume));
  }


  poolDetails.sort((a, b) => (a.index > b.index) ? 1 : ((b.index > a.index) ? -1 : 0))

  return { poolDetails, totalVolume };

};
