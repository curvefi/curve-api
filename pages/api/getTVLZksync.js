import Web3 from 'web3';
import configs from 'constants/configs';

import getPoolsFn from 'pages/api/getPools';
import { fn } from 'utils/api';
import erc20Abi from 'constants/abis/erc20.json';
import aavePool from 'constants/abis/pools/aave.json';

const web3 = new Web3(configs.zksync.rpcUrl);


export default fn(async () => {


  let price_feed = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether,ethereum,bitcoin&vs_currencies=usd')).json()

  let pools = {
  }
  let tvl = 0
  for (const [key, pool] of Object.entries(pools)) {

    let poolC = new web3.eth.Contract(aavePool, pool.address);

    let multiplier = (pool.type == 'stable' || pool.type == 'crypto') ? 1 : price_feed[pool.type].usd

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

  const factoDetails = await getPoolsFn.straightCall({ blockchainId: 'zksync', registryId: 'factory' })
  tvl += factoDetails.tvlAll
  const factory = {
    tvl: factoDetails.tvlAll
  };

  return { tvl, pools, factory };


}, {
  maxAge: 15 * 60, // 15 min
});
