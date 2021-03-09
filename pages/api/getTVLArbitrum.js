import axios from 'axios';
import Web3 from 'web3';
import BigNumber from 'big-number';

import { fn } from '../../utils/api';
import { getFactoryRegistry, getMultiCall } from '../../utils/getters';
import registryAbi from '../../constants/abis/factory_registry.json';
import multicallAbi from '../../constants/abis/multicall.json';
import erc20Abi from '../../constants/abis/erc20.json';
import aavePool from '../../constants/abis/pools/aave.json';

const web3 = new Web3(`https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);


export default fn(async () => {


    let price_feed = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,ethereum,bitcoin,tether-eurt&vs_currencies=usd')).json()

    let pools = {
      '2pool': {
        'address': '0x7f90122bf0700f9e7e1f688fe926940e8839f353',
        'decimals': [6,6],
        'tvl': 0,
        'type': 'stable'
      },
      'tricrypto': {
        'address': '0x960ea3e3C7FB317332d990873d354E18d7645590',
        'tvl': 0,
        'coins': 3,
        'keys': ['tether', 'bitcoin', 'ethereum'],
        'decimals': [6, 8, 18],
        'tvl': 0,
        'lpPrice': 0,
        'type': 'crypto',
        'token': '0x8e0B8c8BB9db49a46697F3a5Bb8A308e744821D2'
      },
      'ren': {
        'address': '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
        'decimals': [8,8],
        'tvl': 0,
        'type': 'bitcoin'
      },
      'eursusd': {
        'address': '0xA827a652Ead76c6B0b3D19dba05452E06e25c27e',
        'tvl': 0,
        'coins': 2,
        'keys': ['tether-eurt', 'tether'],
        'decimals': [2, 18],
        'tvl': 0,
        'lpPrice': 0,
        'type': 'crypto',
        'token': '0x3dFe1324A0ee9d86337d06aEB829dEb4528DB9CA'
      },

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


    let res = await (await fetch(`https://api.curve.fi/api/getFactoryV2Pools/arbitrum`)).json()
    tvl += res.data.tvlAll
    const factory = {
      'tvl': res.data.tvlAll
    }
    return { tvl, pools, factory };


}, {
  maxAge: 15 * 60, // 15 min
});
