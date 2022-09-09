import axios from 'axios';
import Web3 from 'web3';
import BigNumber from 'big-number';

import { fn } from 'utils/api';
import { getFactoryRegistry, getMultiCall } from 'utils/getters';
import registryAbi from 'constants/abis/factory_registry.json';
import multicallAbi from 'constants/abis/multicall.json';
import erc20Abi from 'constants/abis/erc20.json';
import aavePool from 'constants/abis/pools/aave.json';

const web3 = new Web3(`https://api.avax.network/ext/bc/C/rpc`);


export default fn(async () => {


    let price_feed = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,ethereum,bitcoin&vs_currencies=usd')).json()

    let pools = {
      'aave': {
        'address': '0x7f90122BF0700F9E7e1F688fe926940E8839F353',
        'decimals': [18,6,6],
        'tvl': 0,
        'type': 'stable'
      },
      'ren': {
        'address': '0x16a7DA911A4DD1d83F3fF066fE28F3C792C50d90',
        'decimals': [8,8],
        'tvl': 0,
        'type': 'bitcoin'
      },
      'atricrypto': {
        'address': '0xB755B949C126C04e0348DD881a5cF55d424742B2',
        'tvl': 0,
        'coins': 3,
        'keys': ['tether', 'bitcoin', 'ethereum'],
        'decimals': [18, 8, 18],
        'tvl': 0,
        'lpPrice': 0,
        'type': 'crypto',
        'token': '0x1daB6560494B04473A0BE3E7D83CF3Fdf3a51828'
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

    let res = await (await fetch(`https://api.curve.fi/api/getFactoryV2Pools/avalanche`)).json()
    tvl += res.data.tvlAll
    const factory = {
      'tvl': res.data.tvlAll
    }

    return { tvl, pools, factory };


}, {
  maxAge: 15 * 60, // 15 min
});
