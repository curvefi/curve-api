import axios from 'axios';
import Web3 from 'web3';
import BigNumber from 'big-number';

import { fn } from '../../utils/api';
import { getFactoryRegistry, getMultiCall } from '../../utils/getters';
import registryAbi from '../../constants/abis/factory_registry.json';
import multicallAbi from '../../constants/abis/multicall.json';
import erc20Abi from '../../constants/abis/erc20.json';
import poolTwo from '../../constants/abis/pools/2pool.json';

const web3 = new Web3(`https://rpc.ftm.tools/`);


export default fn(async () => {

    let pools = {
      '2pool': {
        'address': '0x27e611fd27b276acbd5ffd632e5eaebec9761e40',
        'decimals': [18 ,6],
        'tvl': 0,
        'type': 'stable',
        'token': '0x27e611fd27b276acbd5ffd632e5eaebec9761e40'
      },
      'fusdt': {
        'address': '0x92d5ebf3593a92888c25c0abef126583d4b5312e',
        'decimals': [6],
        'tvl': 0,
        'type': 'stable',
        'token': '0x92d5ebf3593a92888c25c0abef126583d4b5312e'
      },
      'ren': {
        'address': '0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604',
        'decimals': [8,8],
        'tvl': 0,
        'type': 'bitcoin',
        'token': '0x5b5cfe992adac0c9d48e05854b2d91c73a003858'
      },
      'tricrypto': {
        'address': '0x3a1659Ddcf2339Be3aeA159cA010979FB49155FF',
        'tvl': 0,
        'coins': 3,
        'keys': ['tether', 'bitcoin', 'ethereum'],
        'decimals': [6, 8, 18],
        'tvl': 0,
        'lpPrice': 0,
        'type': 'crypto',
        'token': '0x58e57cA18B7A47112b877E31929798Cd3D703b0f'
      },
      'geist': {
        'address': '0x0fa949783947Bf6c1b171DB13AEACBB488845B3f',
        'decimals': [18,6,6],
        'tvl': 0,
        'type': 'stable',
        'token': '0xd02a30d33153877bc20e5721ee53dedee0422b2f'
      },
    }

    let price_feed = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,ethereum,bitcoin&vs_currencies=usd')).json()

    let tvl = 0
      for (const [key, pool] of Object.entries(pools)) {

        let poolC = new web3.eth.Contract(poolTwo, pool.address);

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
        let virtual_price = await poolC.methods.get_virtual_price().call();
        pools[key].virtual_price = virtual_price
        
      }

      let res = await (await fetch(`https://api.curve.fi/api/getFactoryV2Pools/fantom`)).json()
      tvl += res.data.tvlAll
      const factory = {
        'tvl': res.data.tvlAll
      }

      return { tvl, pools, factory };


}, {
  maxAge: 15 * 60, // 15 min
});
