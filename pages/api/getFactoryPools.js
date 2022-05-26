import Web3 from 'web3';
import WEB3_CONSTANTS from 'constants/Web3';
import configs from 'constants/configs';

import { fn } from '../../utils/api';
import { getMultiCall, getFactoryRegistry } from '../../utils/getters';
import registryAbi from '../../constants/abis/factory_registry.json';
import multicallAbi from '../../constants/abis/multicall.json';
import erc20Abi from '../../constants/abis/erc20.json';

const web3 = new Web3(WEB3_CONSTANTS.RPC_URL);

export default fn(async () => {
  const lpTokenUSD = '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490';
  const lpTokenbBTC = '0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3';
  const LP_TOKEN_DECIMALS = 18;

  const registryAddress = await getFactoryRegistry();
  const multicallAddress = await getMultiCall();
  const registry = new web3.eth.Contract(registryAbi, registryAddress);
  const poolCount = await registry.methods.pool_count().call();
  const multicall = new web3.eth.Contract(multicallAbi, multicallAddress);

  // get pool addresses
  let calls = [];
  for (let i = 0; i < poolCount; i += 1) {
    calls.push([registryAddress, registry.methods.pool_list(i).encodeABI()]);
  }
  let aggcalls = await multicall.methods.aggregate(calls).call();
  const poolList = aggcalls[1].map((hex) => web3.eth.abi.decodeParameter('address', hex));

  // get coin 0
  calls = [];
  poolList.map(async (poolAddress) => {
    calls.push([poolAddress, '0xc66106570000000000000000000000000000000000000000000000000000000000000000']); // coins(0) to get pool type
    calls.push([poolAddress, '0xc66106570000000000000000000000000000000000000000000000000000000000000001']); // coins(1) to get pool type
  });

  aggcalls = await multicall.methods.aggregate(calls).call();

  const coinList = [];
  const lpCoinList = [];

  const poolTypes = [];
  const data = aggcalls[1];
  for (let i = 0; i < aggcalls[1].length; i += 1) {
    const coinAddress = web3.eth.abi.decodeParameter('address', data[i]);
    coinList.push(coinAddress);
    i += 1;

    const lpToken = web3.eth.abi.decodeParameter('address', data[i]);
    let poolType = 'USD';
    if (lpToken === lpTokenbBTC) {
      poolType = 'BTC';
    }
    lpCoinList.push(lpToken);
    poolTypes.push(poolType);
  }

  // get decimals and balance
  calls = [];
  coinList.map(async (coinAddress, index) => {
    const erc20Contract = new web3.eth.Contract(erc20Abi, coinAddress);

    calls.push([coinAddress, '0x313ce567']); // decimals
    calls.push([coinAddress, '0x95d89b41']); // symbol
    calls.push([coinAddress, erc20Contract.methods.balanceOf(poolList[index]).encodeABI()]); // balance of pool
    calls.push([lpCoinList[index], erc20Contract.methods.balanceOf(poolList[index]).encodeABI()]); // balance of pool
  });

  const poolData = [];
  let factoryTotal0 = 0;
  let factoryTotal1 = 0;

  const { 1: balanceData } = await multicall.methods.aggregate(calls).call();
  let poolIndex = 0;
  for (let i = 0; i < coinList.length * 4; i += 1) {
    const decimals = web3.eth.abi.decodeParameter('uint8', balanceData[i]);
    i += 1;
    const symbol = web3.eth.abi.decodeParameter('string', balanceData[i]);
    i += 1;
    const balance = web3.eth.abi.decodeParameter('uint256', balanceData[i]);
    const balanceFormatted = balance / (10 ** decimals);
    i += 1;
    const lpBalance = web3.eth.abi.decodeParameter('uint256', balanceData[i]);
    const lpBalanceFormatted = lpBalance / (10 ** LP_TOKEN_DECIMALS);

    factoryTotal0 += balanceFormatted;
    factoryTotal1 += lpBalanceFormatted;

    const poolBalanceTotal = lpBalanceFormatted + balanceFormatted;

    const poolInfo = {
      address: poolList[poolIndex],
      type: poolTypes[poolIndex],
      balance: poolBalanceTotal.toFixed(2),
      token: {
        address: coinList[poolIndex],
        symbol,
        decimals: parseInt(decimals, 10),
        rawBalance: balance,
        balance: balanceFormatted.toFixed(2),
      },
      lpToken: {
        address: poolTypes[poolIndex] === 'BTC' ? lpTokenbBTC : lpTokenUSD,
        symbol: poolTypes[poolIndex] === 'BTC' ? 'sbtcCrv' : '3Crv',
        decimals: LP_TOKEN_DECIMALS,
        rawBalance: lpBalance,
        balance: lpBalanceFormatted.toFixed(2),
      },
    };

    poolIndex += 1;
    poolData.push(poolInfo);
  }

  const totals = {
    tokenBalances: factoryTotal0.toFixed(2),
    lpTokenBalances: factoryTotal1.toFixed(2),
    totalIncludingLP: parseFloat(factoryTotal1 + factoryTotal0).toFixed(2),
  };

  return { poolData, totals };
}, {
  maxAge: 30, // 30s
});
