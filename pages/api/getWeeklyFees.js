import axios from 'axios';
import Web3 from 'web3';
import BigNumber from 'big-number';
import { fn } from '../../utils/api';
import { getFeeDistributor } from '../../utils/getters';
import { getThursdayUTCTimestamp } from '../../utils/helpers';
import distributorAbi from '../../constants/abis/distributor.json';
import tripoolSwapAbi from '../../constants/abis/tripool_swap.json';

const web3 = new Web3(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);


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

		let weeklyFeesTable = []
		for (var i = 0; i < 100; i++) {
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
});
