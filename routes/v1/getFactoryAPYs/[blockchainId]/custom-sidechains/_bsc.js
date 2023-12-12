/**
 * Custom implementation because reliance on `getFactoryAPYs/_sidechains` implies
 * two requirements: (1) need for thegraph to support the chain, and (2) need for
 * a uniswap fork to be running on that chain for the subgraph to use as an
 * external oracle where needed.
 * Moonbeam satisfies (1) but not (2), so it uses a suboptimal custom setup for now.
 */

import Web3 from 'web3';
import configs from '#root/constants/configs/index.js';
import getAllCurvePoolsData from '#root/utils/data/curve-pools-data.js';
import factorypool3Abi from '#root/constants/abis/factory_swap.json' assert { type: 'json' };
import factorypool3BaseTricryptoAbi from '#root/constants/abis/factory_tricrypto_swap.json' assert { type: 'json' };
import factorypool3BaseCryptoAbi from '#root/constants/abis/factory_crypto_swap.json' assert { type: 'json' };
import groupBy from 'lodash.groupby';
import { multiCall } from '#root/utils/Calls.js';

const web3 = new Web3(configs.bsc.rpcUrl);
const networkSettings = {
  web3,
  multicall2Address: configs.bsc.multicall2Address,
};

export default async ({ version }) => {
  const config = configs.bsc;
  const version = 2

  const poolData = await getAllCurvePoolsData(['bsc']).filter(({ registryId }) => (
    version === 'crypto' ?
      registryId.endsWith('crypto') :
      !registryId.endsWith('crypto')
  ));
  let poolDetails = [];
  let totalVolume = 0
  let totalVolumeUsd = 0;

  const latest = await web3.eth.getBlockNumber()
  const DAY_BLOCKS_24H = config.approxBlocksPerDay;
  let DAY_BLOCKS = DAY_BLOCKS_24H

  await Promise.all(
    poolData.map(async (pool, index) => {
      const lpTokenUsdPrice = pool.usdTotal / (pool.totalSupply / 1e18);

      const poolAbi = (
        pool.registryId === 'factory-tricrypto' ? factorypool3BaseTricryptoAbi :
          pool.registryId === 'factory-crypto' ? factorypool3BaseCryptoAbi :
            factorypool3Abi
      );
      let poolContract = new web3.eth.Contract(poolAbi, pool.address)



      const isCryptoPool = (
        pool.registryId === 'factory-tricrypto' ||
        pool.registryId === 'factory-crypto'
      );

      let apy;
      let vPriceFetch;

      const oneDayOldBlockNumber = latest - DAY_BLOCKS;
      if (isCryptoPool) {
        const {
          xcpProfit: [{ data: xcpProfitDayOld }],
          xcpProfitA: [{ data: xcpProfitADayOld }],
        } = groupBy(await multiCall([{
          address: pool.address,
          abi: poolAbi,
          methodName: 'xcp_profit',
          metaData: { type: 'xcpProfit' },
          networkSettings: {
            ...networkSettings,
            blockNumber: oneDayOldBlockNumber,
          },
          superSettings: {
            fallbackValue: 1e18,
          },
        }, {
          address: pool.address,
          abi: poolAbi,
          methodName: 'xcp_profit_a',
          metaData: { type: 'xcpProfitA' },
          networkSettings: {
            ...networkSettings,
            blockNumber: oneDayOldBlockNumber,
          },
          superSettings: {
            fallbackValue: 1e18,
          },
        }]), 'metaData.type');

        const {
          xcpProfit: [{ data: xcpProfit }],
          xcpProfitA: [{ data: xcpProfitA }],
          virtualPrice: [{ data: virtualPrice }],
        } = groupBy(await multiCall([{
          address: pool.address,
          abi: poolAbi,
          methodName: 'xcp_profit',
          metaData: { type: 'xcpProfit' },
          networkSettings,
          superSettings: {
            fallbackValue: 1e18,
          },
        }, {
          address: pool.address,
          abi: poolAbi,
          methodName: 'xcp_profit_a',
          metaData: { type: 'xcpProfitA' },
          networkSettings,
          superSettings: {
            fallbackValue: 1e18,
          },
        }, {
          address: pool.address,
          abi: poolAbi,
          methodName: 'get_virtual_price',
          metaData: { type: 'virtualPrice' },
          networkSettings,
          superSettings: {
            fallbackValue: 1e18,
          },
        }]), 'metaData.type');

        const currentProfit = ((xcpProfit / 2) + (xcpProfitA / 2) + 1e18) / 2;
        const dayOldProfit = ((xcpProfitDayOld / 2) + (xcpProfitADayOld / 2) + 1e18) / 2;
        const rateDaily = (currentProfit - dayOldProfit) / dayOldProfit;

        const latestDailyApy = ((rateDaily + 1) ** 365 - 1) * 100;
        apy = latestDailyApy;

        vPriceFetch = virtualPrice;
      } else {
        let vPriceOldFetch;
        let vPriceOldFetchFailed = false;
        try {
          vPriceOldFetch = await poolContract.methods.get_virtual_price().call('', oneDayOldBlockNumber)
        } catch (e) {
          console.error(`Couldn't fetch get_virtual_price for block ${oneDayOldBlockNumber}: ${e.toString()}`);
          vPriceOldFetchFailed = true;
          vPriceOldFetch = 1 * (10 ** 18)
        }

        try {
          vPriceFetch = await poolContract.methods.get_virtual_price().call()
        } catch (e) {
          vPriceFetch = 1 * (10 ** 18)
        }

        let vPrice = vPriceOldFetchFailed ? vPriceFetch : vPriceOldFetch
        let vPriceNew = vPriceFetch

        apy = (vPriceNew - vPrice) / vPrice * 100 * 365
      }


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
      let volumeUsd = 0;

      if (pool.registryId !== 'factory-tricrypto' && pool.registryId !== 'factory-crypto') {
        let events = await poolContract.getPastEvents(eventName, {
          filter: {}, // Using an array means OR: e.g. 20 or 23
          fromBlock: oneDayOldBlockNumber,
          toBlock: 'latest'
        })

        events.map((trade) => {

          let t = trade.returnValues['tokens_bought'] / 10 ** decimals[trade.returnValues['bought_id']]
          volume += t;
          volumeUsd += (t * pool.coins[Number(trade.returnValues['bought_id'])].usdPrice);

        })
      } else {
        let events = await poolContract.getPastEvents(eventName2, {
          filter: {}, // Using an array means OR: e.g. 20 or 23
          fromBlock: oneDayOldBlockNumber,
          toBlock: 'latest'
        })

        events.map((trade) => {

          let t = trade.returnValues['tokens_bought'] / 10 ** decimals[trade.returnValues['bought_id']]
          volume += t;
          volumeUsd += (t * pool.coins[Number(trade.returnValues['bought_id'])].usdPrice);

        })
      }

      if (version == '2' && pool.registryId !== 'factory-tricrypto' && pool.registryId !== 'factory-crypto') {
        let events2 = await poolContract.getPastEvents(eventName2, {
          filter: {}, // Using an array means OR: e.g. 20 or 23
          fromBlock: oneDayOldBlockNumber,
          toBlock: 'latest'
        })

        events2.map((trade) => {
          let t = trade.returnValues[2] / 10 ** decimals[trade.returnValues[1]]
          volume += t;
          volumeUsd += (t * pool.coins[Number(trade.returnValues[1])].usdPrice);
        })
      }

      // Since we don't fetch blocks for the entirety of the past 24 hours,
      // we multiply the split volume accordingly
      const correctedVolume = volume * (DAY_BLOCKS_24H / DAY_BLOCKS);
      const correctedVolumeUsd = volumeUsd * (DAY_BLOCKS_24H / DAY_BLOCKS);

      let apyFormatted = `${apy.toFixed(2)}%`
      totalVolume += correctedVolume
      totalVolumeUsd += correctedVolumeUsd

      let p = {
        index,
        'poolAddress': pool.address,
        'poolSymbol': version === 1 ? pool.token.symbol : pool.symbol,
        apyFormatted,
        apy,
        'virtualPrice': vPriceFetch,
        volume: (correctedVolumeUsd / lpTokenUsdPrice) || 0, // lp volume
        totalVolumeUsd: correctedVolumeUsd,
        'pool.registryId': pool.registryId,
        'pool.id': pool.id,
      }
      poolDetails.push(p)
    })
  )

  poolDetails.sort((a, b) => (a.index > b.index) ? 1 : ((b.index > a.index) ? -1 : 0))

  return { poolDetails, totalVolumeUsd, latest };

};
