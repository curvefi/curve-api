import axios from 'axios';
import Web3 from 'web3';
import BigNumber from 'big-number';

import { fn } from '../../utils/api';
import { getFactoryRegistry, getMultiCall } from '../../utils/getters';
import registryAbi from '../../constants/abis/factory_registry.json';
import multicallAbi from '../../constants/abis/multicall.json';
import erc20Abi from '../../constants/abis/erc20.json';
import aavePool from '../../constants/abis/pools/aave.json';

const web3 = new Web3(`https://moonbeam.api.onfinality.io/public`);


export default fn(async () => {


    let price_feed = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,ethereum,bitcoin&vs_currencies=usd')).json()

    let pools = {
      '3pool': {
        'address': '0xace58a26b8db90498ef0330fdc9c2655db0c45e2',
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

    return { tvl, pools };


}, {
  maxAge: 15 * 60, // 15 min
});
