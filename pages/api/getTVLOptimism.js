import axios from 'axios';
import Web3 from 'web3';
import BigNumber from 'big-number';

import { fn } from '../../utils/api';
import { getFactoryRegistry, getMultiCall } from '../../utils/getters';
import registryAbi from '../../constants/abis/factory_registry.json';
import multicallAbi from '../../constants/abis/multicall.json';
import erc20Abi from '../../constants/abis/erc20.json';
import aavePool from '../../constants/abis/pools/aave.json';

const web3 = new Web3(`https://mainnet.optimism.io`);


export default fn(async () => {


    let price_feed = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,ethereum,bitcoin&vs_currencies=usd')).json()

    let pools = {
      '3pool': {
        'address': '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
        'decimals': [18,6,6],
        'tvl': 0,
        'type': 'stable'
      }

    }
    let tvl = 0
      for (const [key, pool] of Object.entries(pools)) {

        let poolC = new web3.eth.Contract(aavePool, pool.address);

        let multiplier = (pool.type == 'stable' || pool.type == 'crypto')?1:price_feed[pool.type].usd

        await Promise.all(
          pool.decimals.map(async (decimal, index) => {
            let balance = await poolC.methods.balances(index).call()
            balance = balance / (10 ** decimal)

            if (pool.type == 'crypto') {
              multiplier = price_feed[pool.keys[index]].usd
            }

            pools[key].tvl += (balance * multiplier)
            tvl += (parseFloat(balance) * multiplier)

          })
        )

        if (pool.type == 'crypto') {
          let tokenContract = new web3.eth.Contract(erc20Abi, pool.token);
          let supply = await tokenContract.methods.totalSupply().call();
          pools[key].lpPrice = pools[key].tvl / (supply / 10 ** 18)
        }
      }

      let res = await (await fetch(`https://api.curve.fi/api/getFactoryV2Pools/optimism`)).json()
      tvl += res.data.tvlAll
      const factory = {
        'tvl': res.data.tvlAll
      }

      return { tvl, pools, factory };


}, {
  maxAge: 15 * 60, // 15 min
});
