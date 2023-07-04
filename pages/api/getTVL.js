import axios from 'axios';
import Web3 from 'web3';
import BigNumber from 'big-number';
import WEB3_CONSTANTS from 'constants/Web3';

import { fn } from '../../utils/api';
import { getRegistry, getMultiCall } from '../../utils/getters';
import registryAbi from '../../constants/abis/registry.json';
import multicallAbi from '../../constants/abis/multicall.json';
import erc20Abi from '../../constants/abis/erc20.json';

const web3 = new Web3(WEB3_CONSTANTS.RPC_URL);


export default fn(async () => {

  const LP_TOKEN_DECIMALS = 18;

  let tvl = 0;


  let resCrypto = await (await fetch(`https://api.curve.fi/api/getPools/ethereum/crypto`)).json()
  let resMain = await (await fetch(`https://api.curve.fi/api/getPools/ethereum/main`)).json()
  let resFacto = await (await fetch(`https://api.curve.fi/api/getPools/ethereum/factory`)).json()
  let resCryptoFacto = await (await fetch(`https://api.curve.fi/api/getPools/ethereum/factory-crypto`)).json()

  tvl = +resCrypto.data.tvl + +resMain.data.tvl + +resFacto.data.tvl + +resCryptoFacto.data.tvl

  let sideTVLs = []
  let endPoints = [
    'getTVLPolygon',
    'getTVLFantom',
    'getTVLxDai',
    'getTVLAvalanche',
    'getTVLHarmony',
    'getTVLArbitrum',
    'getTVLOptimism',
    'getTVLMoonbeam',
    'getTVLKava',
    'getTVLCelo',
    'getTVLZkevm',
    'getTVLZksync',
  ]

  let sideChainTVL = 0
  await Promise.all(
    endPoints.map(async (endPoint) => {
      let res = await (await fetch(`https://api.curve.fi/api/${endPoint}`)).json()
      let sideChain = {
        'chain': endPoint.replace('getTVL', ''),
        'tvl': parseFloat(res.data.tvl)
      }
      sideChainTVL += sideChain.tvl
      sideTVLs.push(sideChain)
    })
  )



  return { tvl, sideTVLs, sideChainTVL };

}, {
  maxAge: 15 * 60, // 15 min
});
