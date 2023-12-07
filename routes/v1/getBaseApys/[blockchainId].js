/**
 * This endpoint returns all base apy data for curve pools on each chain.
 */
const lc = (str) => str.toLowerCase();

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
import factorypool3BaseCryptoAbi from '#root/constants/abis/factory_crypto_swap.json' assert { type: 'json' };
import { uintToBN } from '#root/utils/Web3/index.js';

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
    (await fetch(`https://coins.llama.fi/block/${blockchainId}/${timestampDayOld}`)).json(),
    (await fetch(`https://coins.llama.fi/block/${blockchainId}/${timestampWeekOld}`)).json(),
  ]);

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
        }] : [{
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

    /**
    * Calculate base daily and weekly apys
    */
    if (isCryptoPool(pool)) {
      const { xcpProfit: [{ data: unsafeXcpProfit }], xcpProfitA: [{ data: unsafeXcpProfitA }] } = currentPoolData;
      const { xcpProfit: [{ data: unsafeXcpProfitDayOld }], xcpProfitA: [{ data: unsafeXcpProfitADayOld }] } = dayOldPoolData;
      const { xcpProfit: [{ data: unsafeXcpProfitWeekOld }], xcpProfitA: [{ data: unsafeXcpProfitAWeekOld }] } = weekOldPoolData;

      const xcpProfit = safeXcpProfit(unsafeXcpProfit);
      const xcpProfitA = safeXcpProfit(unsafeXcpProfitA);
      const xcpProfitDayOld = safeXcpProfit(unsafeXcpProfitDayOld);
      const xcpProfitADayOld = safeXcpProfit(unsafeXcpProfitADayOld);
      const xcpProfitWeekOld = safeXcpProfit(unsafeXcpProfitWeekOld);
      const xcpProfitAWeekOld = safeXcpProfit(unsafeXcpProfitAWeekOld);

      const currentProfit = ((xcpProfit / 2) + (xcpProfitA / 2) + 1e18) / 2;
      const dayOldProfit = ((xcpProfitDayOld / 2) + (xcpProfitADayOld / 2) + 1e18) / 2;
      const weekOldProfit = ((xcpProfitWeekOld / 2) + (xcpProfitAWeekOld / 2) + 1e18) / 2;
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
      const additionalApysPcentFromLsds = coins.map(({
        ethLsdApy,
        poolBalance,
        decimals,
        usdPrice,
      }) => {
        if (typeof ethLsdApy === 'undefined' || usdPrice === null || usdPrice === 0) return 0;

        const assetUsdTotal = uintToBN(poolBalance, decimals).times(usdPrice);
        const assetProportionInPool = assetUsdTotal.div(usdTotal);

        return assetProportionInPool.times(ethLsdApy).times(100);
      });

      latestDailyApyPcent = BN(latestDailyApyPcent).plus(sumBN(additionalApysPcentFromLsds));
      latestWeeklyApyPcent = BN(latestWeeklyApyPcent).plus(sumBN(additionalApysPcentFromLsds));
    }

    return {
      address: pool.address,
      latestDailyApyPcent: BN(latestDailyApyPcent).dp(2).toNumber(),
      latestWeeklyApyPcent: BN(latestWeeklyApyPcent).dp(2).toNumber(),
    };
  }).filter((o) => o !== null);

  return { baseApys };
}, {
  maxAge: 2 * 60,
  cacheKey: ({ blockchainId }) => `getBaseApys-${blockchainId}`,
});
