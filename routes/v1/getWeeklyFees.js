import Web3 from 'web3';
import * as WEB3_CONSTANTS from '#root/constants/Web3.js';
import { fn } from '#root/utils/api.js';
import { getFeeDistributor } from '#root/utils/getters.js';
import { getThursdayUTCTimestamp } from '#root/utils/helpers.js';
import distributorAbi from '#root/constants/abis/distributor.json' assert { type: 'json' };
import tripoolSwapAbi from '#root/constants/abis/tripool_swap.json' assert { type: 'json' };

const web3 = new Web3(WEB3_CONSTANTS.RPC_URL);

export default fn(async () => {

  let feeDistributorAddress = await getFeeDistributor()
  let triPool = '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7'

  /* weekly fees from contract*/
  let tri_pool = new web3.eth.Contract(tripoolSwapAbi, triPool)
  let distributor = new web3.eth.Contract(distributorAbi, feeDistributorAddress)
  let t = await getThursdayUTCTimestamp();
  let thursday = t;

  let currentTs = new Date().getTime() / 1000 | 0;
  if (currentTs > t) {
    let nextdistroTime = await distributor.methods.last_token_time().call();
    if (thursday > currentTs) {
      nextdistroTime = +nextdistroTime + 86400;
      let d = new Date(nextdistroTime * 1000);
      this.distroTime = d.toUTCString();
    }
  }

  let total = 0;
  let week = 604800;
  let virtual_price = await tri_pool.methods.get_virtual_price().call()
  virtual_price = virtual_price / 1e18

  const startTime = await distributor.methods.start_time().call();
  const weeksElapsed = Math.ceil((currentTs - startTime) / (60 * 60 * 24 * 7));

  let weeklyFeesTable = []
  for (var i = 0; i < weeksElapsed; i++) {
    let thisWeekFees = await distributor.methods.tokens_per_week(t).call();
    //console.log('Checking fees for timestamp', t, thisWeekFees);
    if (thisWeekFees > 0 || i < 10) {
      total += thisWeekFees * virtual_price / 1e18
      let thisWeek = {
        'date': new Date(t * 1000).toDateString(),
        'ts': t * 1000,
        'rawFees': thisWeekFees * virtual_price / 1e18
      }
      weeklyFeesTable.push(thisWeek)
    } else {
      break;
    }
    t = t - week;
  }

  //add total at end of array
  let totalFees = {
    'fees': total
  }

  return { weeklyFeesTable, totalFees };

}, {
  maxAge: 15 * 60, // 15 min
  cacheKey: 'getWeeklyFees',
});
