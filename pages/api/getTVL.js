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
    let btcTVL = {
      'native': 0,
      'usd': 0,
      'asset': 'bitcoin'
    }
    let ethTVL = {
      'native': 0,
      'usd': 0,
      'asset': 'ethereum'
    }
    let eurTVL = {
      'native': 0,
      'usd': 0,
      'asset': 'euro'
    }
    let otherTVL = {
      'usd': 0
    }
    let usdTVL = 0;

    let baseTokens = ['0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3', '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490']


    //this should be retrieved from the registry when possible
    let otherassets = {
      '0x93054188d876f558f4a66b2ef1d97d16edf0895b': 'bitcoin', //ren
      '0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714': 'bitcoin', //sbtc
      '0x4ca9b3063ec5866a4b82e437059d2c43d1be596f': 'bitcoin', //hbtc
      '0xc25099792e9349c7dd09759744ea681c7de2cb66': 'bitcoin', //tbtc
      '0x7f55dde206dbad629c080068923b36fe9d6bdbef': 'bitcoin', //pbtc
      '0x071c661b4deefb59e2a3ddb20db036821eee8f4b': 'bitcoin', //bbtc
      '0xd81da8d904b52208541bade1bd6595d8a251f8dd': 'bitcoin', //obtc
      '0x0ce6a5ff5217e38315f87032cf90686c96627caa': 'stasis-eurs', //eurs
      '0xc5424b857f758e906013f3555dad202e4bdb4567': 'ethereum', //seth
      '0xdc24316b9ae028f1497c275eb9192a3ea0f67022': 'ethereum', //steth
      '0xa96a65c051bf88b4095ee1f2451c2a9d43f53ae2': 'ethereum', //ankreth
      '0xf178c0b5bb7e7abf4e12a4838c7b7c5ba2c623c0': 'chainlink', //chainlink
    };

    let price_feed = await (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=stasis-eurs,ethereum,bitcoin,curve-dao-token,chainlink&vs_currencies=usd')).json()

    let registryAddress = await getRegistry()
    let multicallAddress = await getMultiCall()
  	let registry = new web3.eth.Contract(registryAbi, registryAddress);
  	let poolCount = await registry.methods.pool_count().call();
  	let multicall = new web3.eth.Contract(multicallAbi, multicallAddress)

  	//get pool addresses
  	let calls = []
  	for (var i = 0; i < poolCount; i++) {
  		calls.push([registryAddress, registry.methods.pool_list(i).encodeABI()])
  	}
  	let aggcalls = await multicall.methods.aggregate(calls).call()
  	let poolList = aggcalls[1].map(hex => web3.eth.abi.decodeParameter('address', hex))

    //those pool exist in main and factory registry so we ignore them from the main TVL to avoid double counting
    const excludeLists = [
      '0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA',
      '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B',
      '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
      '0x5a6A4D54456819380173272A5E8E9B9904BdF41B',
      '0xFD5dB7463a3aB53fD211b4af195c5BCCC1A03890'
    ]

    poolList = poolList.filter(item => !excludeLists.includes(item));


    calls = []
    poolList.map(async(pool_address) => {
      calls.push([registryAddress, registry.methods.get_balances(pool_address).encodeABI()])
      calls.push([registryAddress, registry.methods.get_coins(pool_address).encodeABI()])
      calls.push([registryAddress, registry.methods.get_lp_token(pool_address).encodeABI()])
    })

    aggcalls = await multicall.methods.aggregate(calls).call()
    aggcalls = aggcalls[1]


    //we count metapools separately using their coin 0
    // we count other pools using totalSupply of coin
    let metaPools = []
    let otherPools = []
    let poolIndex = 0;
    for (var i = 0; i < aggcalls.length; i++) {
      let balances = web3.eth.abi.decodeParameter('uint256[8]', aggcalls[i])
      i += 1
      let coins = web3.eth.abi.decodeParameter('address[8]', aggcalls[i])
      i += 1
      let lptoken = web3.eth.abi.decodeParameter('address', aggcalls[i])
      if (baseTokens.includes(coins[1])) {

        let pool = {
          'balance': balances[0],
          'coin': coins[0],
          'pool_address': poolList[poolIndex].toLowerCase()
        }
        metaPools.push(pool)

      } else {
        let pool = {
          'lptoken': lptoken,
          'pool_address': poolList[poolIndex].toLowerCase()
        }

        otherPools.push(pool)
      }
      poolIndex += 1
    }

    calls = []
    metaPools.map(async(pool) => {
      let erc20Contract = new web3.eth.Contract(erc20Abi, pool.coin)
      calls.push([pool.coin, '0x313ce567']) //decimals
    })

    aggcalls = await multicall.methods.aggregate(calls).call()
    aggcalls = aggcalls[1]

    //we count tvl for metapools
    metaPools.map(async(pool, index) => {
      let decimals = web3.eth.abi.decodeParameter('uint8', aggcalls[index])
      metaPools[index].decimals = web3.eth.abi.decodeParameter('uint8', aggcalls[index])
      metaPools[index].balance = metaPools[index].balance / (10 ** metaPools[index].decimals)
    })

    calls = []
    otherPools.map(async(pool) => {
      calls.push([pool.pool_address, '0xbb7b8b80']) ///supply
      calls.push([pool.lptoken, '0x18160ddd']) //get virtual price
    })

    aggcalls = await multicall.methods.aggregate(calls).call()
    aggcalls = aggcalls[1]

    poolIndex = 0;
    for (var i = 0; i < aggcalls.length; i++) {
      let supply = web3.eth.abi.decodeParameter('uint256', aggcalls[i])
      supply = supply / (10 ** 18)
      i += 1
      let vPrice = web3.eth.abi.decodeParameter('uint256', aggcalls[i])
      vPrice = vPrice / (10 ** 18)
      otherPools[poolIndex].balance = supply * vPrice
      poolIndex += 1
    }

    let allPools = otherPools.concat(metaPools)




    allPools.map(async(pool) => {

      let assetPrice = 1
      if (otherassets[pool.pool_address]) {
        if (otherassets[pool.pool_address] == 'ethereum') {
          ethTVL.native += pool.balance
          ethTVL.usd += pool.balance * price_feed.ethereum.usd
          assetPrice = price_feed.ethereum.usd
        }
        if (otherassets[pool.pool_address] == 'bitcoin') {
          btcTVL.native += pool.balance
          btcTVL.usd += pool.balance * price_feed.bitcoin.usd
          assetPrice = price_feed.bitcoin.usd
        }
        if (otherassets[pool.pool_address] == 'stasis-eurs') {
          eurTVL.native += pool.balance
          eurTVL.usd += pool.balance * price_feed['stasis-eurs'].usd
          assetPrice = price_feed['stasis-eurs'].usd
        }
        if (otherassets[pool.pool_address] == 'chainlink') {
          otherTVL.usd += pool.balance * price_feed['chainlink'].usd
          assetPrice = price_feed['chainlink'].usd
        }

      } else {
        usdTVL += pool.balance
      }

      pool.asset_price = assetPrice
      pool.asset_type = otherassets[pool.pool_address]

      tvl += pool.balance * assetPrice

    })



    let sideTVLs = []
    let endPoints = [
      'getTVLPolygon',
      'getTVLFantom',
      'getTVLxDai',
      'getTVLAvalanche',
      'getTVLHarmony',
      'getTVLArbitrum'
    ]
    let sideChainTVL = 0
    await Promise.all(
      endPoints.map(async (endPoint) => {
        let res = await (await fetch(`https://api.curve.fi/api/${endPoint}`)).json()
        let sideChain  = {
          'chain': endPoint.replace('getTVL', ''),
          'tvl': parseFloat(res.data.tvl)
        }
        sideChainTVL += sideChain.tvl
        sideTVLs.push(sideChain)
      })
    )



    return { tvl, usdTVL, ethTVL, btcTVL, eurTVL, otherTVL, allPools, sideTVLs, sideChainTVL };

}, {
  maxAge: 15 * 60, // 15 min
});
