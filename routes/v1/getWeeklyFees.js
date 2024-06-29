/**
 * @openapi
 * /getWeeklyFees:
 *   get:
 *     tags:
 *       - Misc
 *     description: Returns weekly fees
 *     responses:
 *       200:
 *         description:
 */

import Web3 from 'web3';
import * as WEB3_CONSTANTS from '#root/constants/Web3.js';
import { fn } from '#root/utils/api.js';
import { get3crvFeeDistributor, getCrvusdFeeDistributor } from '#root/utils/getters.js';
import { getThursdayUTCTimestamp } from '#root/utils/helpers.js';
import { multiCall } from '#root/utils/Calls.js';
import distributorAbi from '#root/constants/abis/distributor.json' assert { type: 'json' };
import tripoolSwapAbi from '#root/constants/abis/tripool_swap.json' assert { type: 'json' };
import { getNowTimestamp } from '#root/utils/Date.js';
import { uintToBN } from '#root/utils/Web3/index.js';
import { arrayOfIncrements, arrayToHashmap, flattenArray, sumBN } from '#root/utils/Array.js';
import groupBy from 'lodash.groupby';

export default fn(async () => {
  const feeDistributors = [{
    address: await get3crvFeeDistributor(),
    feeToken: '3crv',
  }, {
    address: await getCrvusdFeeDistributor(),
    feeToken: 'crvUSD',
  }];

  const distribStartTimes = (await multiCall(feeDistributors.map(({ address }) => ({
    address,
    abi: distributorAbi,
    methodName: 'start_time',
  })))).map((ts) => Number(ts));

  const distribStartTs = Math.min(...distribStartTimes);
  const nowTs = getNowTimestamp();
  const pastThursdayTs = await getThursdayUTCTimestamp();

  const weeksElapsed = Math.ceil((nowTs - distribStartTs) / (60 * 60 * 24 * 7));

  // Note: we use current vprice even for past distributions, not perfectly accurate
  // but less rpc-intensive than querying vprice for all those individual past blocks
  const [tricrvVirtualPriceRaw] = await multiCall([{
    address: '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7',
    abi: tripoolSwapAbi,
    methodName: 'get_virtual_price',
  }]);
  const tricrvVirtualPrice = uintToBN(tricrvVirtualPriceRaw, 18);

  const tokensPerWeekRaw = await multiCall(flattenArray(arrayOfIncrements(weeksElapsed).map((weekId) => {
    const thursdayTs = pastThursdayTs - (weekId * 86400 * 7);

    return feeDistributors.map(({ address, feeToken }) => ({
      address,
      abi: distributorAbi,
      methodName: 'tokens_per_week',
      params: [thursdayTs],
      metaData: { thursdayTs, feeToken },
    }));
  })));

  const tokensPerWeek = arrayToHashmap(Object.entries(groupBy(tokensPerWeekRaw, 'metaData.thursdayTs')).map(([thursdayTs, weekFees]) => {
    const weekTotalFee = sumBN(weekFees.map(({ data, metaData }) => (
      metaData.feeToken === '3crv' ?
        uintToBN(data, 18).times(tricrvVirtualPrice) :
        uintToBN(data, 18)
    )));

    // Uses legacy-compatible object shape (naming isn't ideal)
    return [thursdayTs, {
      date: new Date(thursdayTs * 1000).toDateString(),
      ts: thursdayTs * 1000,
      rawFees: weekTotalFee.dp(2).toNumber(),
    }];
  }));

  return {
    weeklyFeesTable: Object.values(tokensPerWeek).sort(({ ts: tsA }, { ts: tsB }) => (
      tsA > tsB ? -1 :
        tsA < tsB ? 1 : 0
    )),
    totalFees: {
      fees: sumBN(Object.values(tokensPerWeek).map(({ rawFees }) => rawFees)).toNumber(),
    },
  };
}, {
  maxAge: 15 * 60, // 15 min
  cacheKey: 'getWeeklyFees',
});
