/**
 * @openapi
 * /getBaseApys/{blockchainId}:
 *   get:
 *     tags:
 *       - Volumes and APYs
 *     description: |
 *       Returns all base APY data for Curve pools on each chain.
 *
 *       Note: [`/getVolumes/{blockchainId}`](#/default/get_getVolumes__blockchainId_) is preferred
 *     parameters:
 *       - $ref: '#/components/parameters/blockchainId'
 *     responses:
 *       200:
 *         description:
 */

import { fn } from '#root/utils/api.js';
import Web3 from 'web3';
import BN from 'bignumber.js';
import groupBy from 'lodash.groupby';
import configs from '#root/constants/configs/index.js';
import { flattenArray, sumBN } from '#root/utils/Array.js';
import { sequentialPromiseMap } from '#root/utils/Async.js';
import { multiCall } from '#root/utils/Calls.js';
import { getNowTimestamp } from '#root/utils/Date.js';
import getAllCurvePoolsData from '#root/utils/data/curve-pools-data.js';
import factorypool3Abi from '#root/constants/abis/factory_swap.json' assert { type: 'json' };
import factorypool3BaseTricryptoAbi from '#root/constants/abis/factory_tricrypto_swap.json' assert { type: 'json' };
import factorypool3BaseTwocryptoAbi from '#root/constants/abis/factory-twocrypto/pool.json' assert { type: 'json' };
import factorypool3BaseCryptoAbi from '#root/constants/abis/factory_crypto_swap.json' assert { type: 'json' };
import { uintToBN } from '#root/utils/Web3/index.js';
import { lc } from '#root/utils/String.js';

const ADMIN_FEE_1_ABI = [{ "name": "admin_fee", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function" }];
const ADMIN_FEE_2_ABI = [{ "stateMutability": "view", "type": "function", "name": "ADMIN_FEE", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] }];

const isCryptoPool = ({ registryId }) => registryId.includes('crypto');

// xcp_profit and xcp_profit_a can return '0' when queried for a crypto pool with no activity, whether
// at an older block or at the latest block: this makes returned data default to the proper initial value.
const safeXcpProfit = (xcpProfit) => Number(xcpProfit) === 0 ? 1e18 : xcpProfit

export default fn(async ({ blockchainId }) => {
  const config = configs[blockchainId];

  const web3 = new Web3(config.rpcUrl);
  const networkSettings = {
    web3,
    multicall2Address: config.multicall2Address,
  };

  const timestampDayOld = getNowTimestamp() - 86400;
  const timestampWeekOld = getNowTimestamp() - (7 * 86400);

  const [
    allPools,
    { height: blockNumberDayOld },
    { height: blockNumberWeekOld },
  ] = await Promise.all([
    getAllCurvePoolsData([blockchainId]),
    fetch(`https://coins.llama.fi/block/${blockchainId}/${timestampDayOld}`).then((res) => {
      if (!res.ok) throw new Error();
      else return res.json();
    }).catch(() => {
      console.log(`Couldn't retrieve block number: HTTP request to https://coins.llama.fi/block/${blockchainId}/${timestampDayOld} failed. Returning empty baseApys for ${blockchainId} as a result.`);
      return { height: undefined };
    }),
    fetch(`https://coins.llama.fi/block/${blockchainId}/${timestampWeekOld}`).then((res) => {
      if (!res.ok) throw new Error();
      else return res.json();
    }).catch(() => {
      console.log(`Couldn't retrieve block number: HTTP request to https://coins.llama.fi/block/${blockchainId}/${timestampWeekOld} failed. Returning empty baseApys for ${blockchainId} as a result.`);
      return { height: undefined };
    }),
  ]);

  if (typeof blockNumberDayOld === 'undefined' || typeof blockNumberWeekOld === 'undefined') {
    return { baseApys: [] };
  }

  const getPoolByAddress = (address) => (
    allPools.find((pool) => (lc(pool.address) === lc(address)))
  );

  const [
    weekOldData,
    dayOldData,
    currentData,
  ] = await sequentialPromiseMap([blockNumberWeekOld, blockNumberDayOld, undefined], async (blockNumber) => (
    groupBy(await multiCall(flattenArray(allPools.map((pool) => {
      const poolAbi = (
        pool.registryId === 'factory-tricrypto' ? factorypool3BaseTricryptoAbi :
          pool.registryId === 'factory-twocrypto' ? factorypool3BaseTwocryptoAbi :
            pool.registryId.includes('crypto') ? factorypool3BaseCryptoAbi :
              factorypool3Abi
      );

      return [
        ...(isCryptoPool(pool) ? [{
          address: pool.address,
          abi: poolAbi,
          methodName: 'xcp_profit',
          metaData: { type: 'xcpProfit', pool },
          networkSettings: {
            ...networkSettings,
            blockNumber,
          },
          superSettings: {
            fallbackValue: 1e18,
          },
        }, {
          address: pool.address,
          abi: poolAbi,
          methodName: 'xcp_profit_a',
          metaData: { type: 'xcpProfitA', pool },
          networkSettings: {
            ...networkSettings,
            blockNumber,
          },
          superSettings: {
            fallbackValue: 1e18,
          },
        }, ...(blockNumber === undefined ? [{
          address: pool.address,
          abi: ADMIN_FEE_1_ABI,
          methodName: 'admin_fee',
          metaData: { type: 'adminFee_try_1', pool },
          networkSettings: {
            ...networkSettings,
            blockNumber,
          },
          superSettings: {
            fallbackValue: null, // Know when this method hits a dead-end instead of defaulting to valid value
          },
        }, {
          address: pool.address,
          abi: ADMIN_FEE_2_ABI,
          methodName: 'ADMIN_FEE',
          metaData: { type: 'adminFee_try_2', pool },
          networkSettings: {
            ...networkSettings,
            blockNumber,
          },
          superSettings: {
            fallbackValue: null, // Know when this method hits a dead-end instead of defaulting to valid value
          },
        }] : [])] : [{
          address: pool.address,
          abi: poolAbi,
          methodName: 'get_virtual_price',
          metaData: { type: 'virtualPrice', pool },
          networkSettings: {
            ...networkSettings,
            blockNumber,
          },
          superSettings: {
            fallbackValue: 1e18,
          },
        }]),
      ];
    }))), 'metaData.pool.address')
  ));

  const baseApys = allPools.map((pool) => {
    const weekOldPoolData = groupBy(weekOldData[pool.address], 'metaData.type');
    const dayOldPoolData = groupBy(dayOldData[pool.address], 'metaData.type');
    const currentPoolData = groupBy(currentData[pool.address], 'metaData.type');

    if (!dayOldPoolData || !currentPoolData) return null;

    let latestDailyApyPcent;
    let latestWeeklyApyPcent;
    let additionalApyPcentFromLsts;

    /**
    * Calculate base daily and weekly apys
    */
    let adminFee;
    if (isCryptoPool(pool)) {
      const { xcpProfit: [{ data: unsafeXcpProfit }], xcpProfitA: [{ data: unsafeXcpProfitA }], adminFee_try_1: [{ data: adminFeeRaw1 }], adminFee_try_2: [{ data: adminFeeRaw2 }] } = currentPoolData;
      const { xcpProfit: [{ data: unsafeXcpProfitDayOld }], xcpProfitA: [{ data: unsafeXcpProfitADayOld }] } = dayOldPoolData;
      const { xcpProfit: [{ data: unsafeXcpProfitWeekOld }], xcpProfitA: [{ data: unsafeXcpProfitAWeekOld }] } = weekOldPoolData;

      const xcpProfit = safeXcpProfit(unsafeXcpProfit);
      const xcpProfitA = safeXcpProfit(unsafeXcpProfitA);
      const xcpProfitDayOld = safeXcpProfit(unsafeXcpProfitDayOld);
      const xcpProfitADayOld = safeXcpProfit(unsafeXcpProfitADayOld);
      const xcpProfitWeekOld = safeXcpProfit(unsafeXcpProfitWeekOld);
      const xcpProfitAWeekOld = safeXcpProfit(unsafeXcpProfitAWeekOld);

      if (adminFeeRaw1 === null && adminFeeRaw2 === null) {
        throw new Error(`adminFee could not be retrieved for pool ${pool} because methods used seem invalid`)
      }
      adminFee = uintToBN(adminFeeRaw1 ?? adminFeeRaw2, 10).toNumber();

      const currentProfit = (xcpProfit * (1 - adminFee) / 1e18 + xcpProfitA * adminFee / 1e18 + 1) / 2; // Better calc taking admin fee into account
      const dayOldProfit = (xcpProfitDayOld * (1 - adminFee) / 1e18 + xcpProfitADayOld * adminFee / 1e18 + 1) / 2; // Better calc taking admin fee into account
      const weekOldProfit = (xcpProfitWeekOld * (1 - adminFee) / 1e18 + xcpProfitAWeekOld * adminFee / 1e18 + 1) / 2; // Better calc taking admin fee into account
      const rateDaily = (currentProfit - dayOldProfit) / dayOldProfit;
      const rateWeekly = (currentProfit - weekOldProfit) / weekOldProfit;

      latestDailyApyPcent = ((rateDaily + 1) ** (365 / 1) - 1) * 100;
      latestWeeklyApyPcent = ((rateWeekly + 1) ** (365 / 7) - 1) * 100;

      /**
       * Note: this doesn't take into account a special case where a crypto pool uses
       * a base pool lp as one of its underlying assets. There's currently only one
       * pool doing this, on Avalanche, and at the time of writing it's not receiving
       * enough volume to warrant additional complexity in this code. For future reference
       * if this becomes needed again, search `CRYPTO_POOLS_WITH_BASE_POOLS` in curve-api.
       */
    } else {
      const { virtualPrice: [{ data: virtualPrice }] } = currentPoolData;
      const { virtualPrice: [{ data: virtualPriceDayOld }] } = dayOldPoolData;
      const { virtualPrice: [{ data: virtualPriceweekOld }] } = weekOldPoolData;

      const rateDaily = (virtualPrice - virtualPriceDayOld) / virtualPriceDayOld;
      const rateWeekly = (virtualPrice - virtualPriceweekOld) / virtualPriceweekOld;

      latestDailyApyPcent = ((rateDaily + 1) ** (365 / 1) - 1) * 100;
      latestWeeklyApyPcent = ((rateWeekly + 1) ** (365 / 7) - 1) * 100;
    }

    /**
    * Add additional ETH staking APY to pools containing ETH LSDs
    */
    const { usesRateOracle, coins, usdTotal } = pool;
    const needsAdditionalLsdAssetApy = (
      !usesRateOracle &&
      coins.some(({ ethLsdApy }) => typeof ethLsdApy !== 'undefined')
    );

    if (needsAdditionalLsdAssetApy && usdTotal > 0) {
      additionalApyPcentFromLsts = sumBN(coins.map(({
        ethLsdApy,
        poolBalance,
        decimals,
        usdPrice,
      }) => {
        if (typeof ethLsdApy === 'undefined' || usdPrice === null || usdPrice === 0) return 0;

        const assetUsdTotal = uintToBN(poolBalance, decimals).times(usdPrice);
        const assetProportionInPool = assetUsdTotal.div(usdTotal);

        return assetProportionInPool.times(ethLsdApy).times(100);
      }));

      latestDailyApyPcent = BN(latestDailyApyPcent).plus(additionalApyPcentFromLsts);
      latestWeeklyApyPcent = BN(latestWeeklyApyPcent).plus(additionalApyPcentFromLsts);
    }

    return {
      address: pool.address,
      latestDailyApyPcent: BN(latestDailyApyPcent).dp(2).toNumber(),
      latestWeeklyApyPcent: BN(latestWeeklyApyPcent).dp(2).toNumber(),
      additionalApyPcentFromLsts: BN(additionalApyPcentFromLsts).dp(2).toNumber(),
    };
  }).filter((o) => o !== null);

  return { baseApys };
}, {
  maxAge: 5 * 60,
  cacheKey: ({ blockchainId }) => `getBaseApys-${blockchainId}`,
});
