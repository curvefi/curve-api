import Web3 from 'web3';
import { fn } from 'utils/api';
import gaugeRegistry from 'constants/abis/gauge-registry.json';
import sideChainGauge from 'constants/abis/sidechain-gauge.json';

import multicallAbi from 'constants/abis/multicall.json';
import gaugeControllerAbi from 'constants/abis/gauge_controller.json';
import factorypool3Abi from 'constants/abis/factory_swap.json';

import erc20Abi from 'constants/abis/erc20.json';
import { multiCall } from 'utils/Calls';
import { flattenArray, sum, arrayToHashmap } from 'utils/Array';
import getTokensPrices from 'utils/data/tokens-prices';
import getAssetsPrices from 'utils/data/assets-prices';
import getFactoryV2GaugeRewards from 'utils/data/getFactoryV2GaugeRewards';
import { getMultiCall } from 'utils/getters';

import getMainRegistryPools from 'pages/api/getMainRegistryPools';
import getGauges from 'pages/api/getGauges';
import { IS_DEV } from 'constants/AppConstants';
import configs from 'constants/configs';
import allCoins from 'constants/coins';


export default fn(async ({ blockchainId }) => {
  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum'; // Default value

  const config = configs[blockchainId];
  const configEth = configs['ethereum'];

  if (typeof config === 'undefined') {
    throw new Error(`No factory data for blockchainId "${blockchainId}"`);
  }
  if (!config.chainId) {
    throw new Error(`Missing chain id in config for "${blockchainId}"`);
  }


  const {
    nativeCurrencySymbol,
    nativeCurrencyCoingeckoId,
    nativeAssetErc20WrapperId,
    platformCoingeckoId,
    rpcUrl,
    factoryImplementationAddressMap: implementationAddressMap,
    getFactoryCryptoRegistryAddress,
    multicallAddress,
  } = config;

  const multicallAddressEth = await getMultiCall()

  const web3 = new Web3(configEth.rpcUrl);
  const web3Side = new Web3(config.rpcUrl);

  const gaugeRegistryAddress = '0xabc000d88f23bb45525e447528dbf656a9d55bf5'
  const gaugeRegContract =  new web3.eth.Contract(gaugeRegistry, gaugeRegistryAddress);

  const gauge_count = await gaugeRegContract.methods.get_gauge_count(config.chainId).call()

  const multicallEthereum = new web3.eth.Contract(multicallAbi, multicallAddressEth)
  const multicall = new web3Side.eth.Contract(multicallAbi, multicallAddress)

  const gauge_count_address = await gaugeRegContract.methods.get_gauge(config.chainId, 3).call()

  const filterList = [
    '0xE36A20444df2758f7ccD8d5a27f05c60E9996E34',
    '0xE9a93FFB52Dd1D68Ded7CAf5A2c777db5e689B7B'
  ]

  let calls = []
  for (var i = 0; i < gauge_count; i++) {
    calls.push([gaugeRegistryAddress, gaugeRegContract.methods.get_gauge(config.chainId, i).encodeABI()])
  }
  let aggGaugecalls = await multicallEthereum.methods.aggregate(calls).call();
  aggGaugecalls = aggGaugecalls[1]

  let gaugeList = []
  for (var i = 0; i < aggGaugecalls.length; i++) {
    let gauge = await web3.eth.abi.decodeParameter('address', aggGaugecalls[i])
    if (!filterList.includes(gauge)) {
      gaugeList.push(gauge)
    }
  }

    calls = []
    const gaugeContract =  new web3Side.eth.Contract(sideChainGauge, gaugeList[0]);

    const gaugeControllerAddress = '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB'
    const gaugeController = new web3.eth.Contract(gaugeControllerAbi, gaugeControllerAddress);

    for (var i = 0; i < gaugeList.length; i++) {
      calls.push([gaugeList[i], gaugeContract.methods.lp_token().encodeABI()])
      calls.push([gaugeList[i], gaugeContract.methods.name().encodeABI()])
      calls.push([gaugeList[i], gaugeContract.methods.symbol().encodeABI()])
      calls.push([gaugeList[i], gaugeContract.methods.working_supply().encodeABI()])
    }
    aggGaugecalls = await multicall.methods.aggregate(calls).call();
    aggGaugecalls = aggGaugecalls[1]

    let gauges = []
    let gaugeN = 0
    for (var i = 0; i < aggGaugecalls.length; i++) {
      let lp_token = await web3.eth.abi.decodeParameter('address', aggGaugecalls[i])
      i += 1
      let name = await web3.eth.abi.decodeParameter('string', aggGaugecalls[i])
      i += 1
      let symbol = await web3.eth.abi.decodeParameter('string', aggGaugecalls[i])
      i += 1
      let working_supply = await web3.eth.abi.decodeParameter('uint256', aggGaugecalls[i])

      let hasCrv = false
      try {
        await gaugeController.methods.gauge_types(gaugeList[gaugeN]).call()
        hasCrv = true
      } catch (e) {

      }

      let poolContract = new web3Side.eth.Contract(factorypool3Abi, lp_token)
      let virtual_price = await poolContract.methods.get_virtual_price().call()

      let gaugeData = {
        'swap': lp_token,
        'swap_token': lp_token, //might not be okay to assume swap === lp token
        'gauge': gaugeList[gaugeN],
        name,
        symbol,
        hasCrv,
        side_chain: true,
        type: 'stable', //we will have a problem detecting this which is used by cur.vote or the voting app to calculate the $ value in the gauge
        gauge_data: {
          working_supply,
          inflation_rate: 0
        },
        swap_data: {
          virtual_price
        }
      }
      gauges.push(gaugeData)
      gaugeN++
    }


  return {
    gauges
  };
}, {
  maxAge: 60,
});
