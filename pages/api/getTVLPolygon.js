import axios from 'axios';
import Web3 from 'web3';
import BigNumber from 'big-number';
import { BASE_API_DOMAIN } from 'constants/AppConstants';
import { fn } from 'utils/api';
import { getFactoryRegistry, getMultiCall } from 'utils/getters';
import registryAbi from 'constants/abis/factory_registry.json';
import multicallAbi from 'constants/abis/multicall.json';
import erc20Abi from 'constants/abis/erc20.json';
import aavePool from 'constants/abis/pools/aave.json';

const web3 = new Web3(`https://polygon-rpc.com/`);


export default fn(async () => {


    let price_feed = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,tether-eurt,ethereum,bitcoin&vs_currencies=usd')).json()

    let pools = {
      'aave': {
        'address': '0x445FE580eF8d70FF569aB36e80c647af338db351',
        'decimals': [18,6,6],
        'tvl': 0,
        'type': 'stable'
      },
      'ren': {
        'address': '0xC2d95EEF97Ec6C17551d45e77B590dc1F9117C67',
        'decimals': [8,8],
        'tvl': 0,
        'type': 'bitcoin'
      },
      'atricrypto': {
        'address': '0x751B1e21756bDbc307CBcC5085c042a0e9AaEf36',
        'tvl': 0,
        'coins': 3,
        'keys': ['tether', 'bitcoin', 'ethereum'],
        'decimals': [18, 8, 18],
        'tvl': 0,
        'lpPrice': 0,
        'type': 'crypto',
        'token': '0x8096ac61db23291252574D49f036f0f9ed8ab390'
      },
      'atricrypto3': {
        'address': '0x92215849c439E1f8612b6646060B4E3E5ef822cC',
        'tvl': 0,
        'coins': 3,
        'keys': ['tether', 'bitcoin', 'ethereum'],
        'decimals': [18, 8, 18],
        'tvl': 0,
        'lpPrice': 0,
        'type': 'crypto',
        'token': '0xdAD97F7713Ae9437fa9249920eC8507e5FbB23d3'
      },
      'eurtusd': {
        'address': '0xB446BF7b8D6D4276d0c75eC0e3ee8dD7Fe15783A',
        'tvl': 0,
        'coins': 2,
        'keys': ['tether-eurt', 'tether'],
        'decimals': [6, 18],
        'tvl': 0,
        'lpPrice': 0,
        'type': 'crypto',
        'token': '0x600743B1d8A96438bD46836fD34977a00293f6Aa'
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

    let res = await (await fetch(`${BASE_API_DOMAIN}/api/getFactoryV2Pools/polygon`)).json()
    tvl += res.data.tvlAll
    const factory = {
      'tvl': res.data.tvlAll
    }
    return { tvl, pools, factory };


}, {
  maxAge: 15 * 60, // 15 min
});
