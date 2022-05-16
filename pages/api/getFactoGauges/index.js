import Web3 from 'web3';
import { ZERO_ADDRESS } from 'utils/Web3/web3';
import { fn } from 'utils/api';
import gaugeRegistry from 'constants/abis/gauge-registry.json';
import sideChainGauge from 'constants/abis/sidechain-gauge.json';
import sideChainRootGauge from 'constants/abis/sidechain-root-gauge.json';
import multicallAbi from 'constants/abis/multicall.json';
import gaugeControllerAbi from 'constants/abis/gauge_controller.json';
import factorypool3Abi from 'constants/abis/factory_swap.json';
import GaugeAbi from 'utils/data/abis/json/liquiditygauge_v2.json';
import { multiCall } from 'utils/Calls';
import { arrayToHashmap, arrayOfIncrements } from 'utils/Array';

import configs from 'constants/configs';

export default fn(async ({ blockchainId }) => {
  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum'; // Default value

  const config = configs[blockchainId];
  const configEth = configs.ethereum;

  if (typeof config === 'undefined') {
    throw new Error(`No factory data for blockchainId "${blockchainId}"`);
  }
  if (!config.chainId) {
    throw new Error(`Missing chain id in config for "${blockchainId}"`);
  }

  const {
    multicallAddress,
  } = config;

  const web3 = new Web3(configEth.rpcUrl);
  const web3Side = new Web3(config.rpcUrl);

  const gaugeRegistryAddress = '0xabc000d88f23bb45525e447528dbf656a9d55bf5';
  const gaugeRegContract = new web3.eth.Contract(gaugeRegistry, gaugeRegistryAddress);
  const gaugeCount = await gaugeRegContract.methods.get_gauge_count(config.chainId).call();
  const multicall = new web3Side.eth.Contract(multicallAbi, multicallAddress);

  // Killed gauges
  const filterList = [
    '0xE36A20444df2758f7ccD8d5a27f05c60E9996E34',
    '0xE9a93FFB52Dd1D68Ded7CAf5A2c777db5e689B7B',
    '0x82049b520cAc8b05E703bb35d1691B5005A92848', // Ignore misconfigured 3crv xdai gauge
  ];

  const unfilteredGaugeList = await multiCall(arrayOfIncrements(gaugeCount).map((gaugeIndex) => ({
    address: gaugeRegistryAddress,
    abi: gaugeRegistry,
    methodName: 'get_gauge',
    params: [config.chainId, gaugeIndex],
  })));

  const gaugeList = unfilteredGaugeList.filter((address) => !filterList.includes(address));

  const weekSeconds = 86400 * 7;
  const nowTs = +Date.now() / 1000;
  const startOfWeekTs = Math.trunc(nowTs / weekSeconds);
  const endOfWeekTs = (startOfWeekTs + 1) * weekSeconds;

  /**
   * Root gauges with emissions meant for their side gauge, but not passed on to it yet
   * (will be passed to side gauge as soon as someone interacts with it). We thus
   * use those pending emissions as the basis to calculate apys for this side gauge.
   */
  const pendingEmissionsRaw = await multiCall(gaugeList.map((gaugeAddress) => ({
    address: gaugeAddress,
    abi: sideChainRootGauge,
    methodName: 'total_emissions',
    metaData: { gaugeAddress },
    networkSettings: { web3, multicall2Address: configs.ethereum.multicall2Address },
  })));
  const pendingEmissions = arrayToHashmap(pendingEmissionsRaw.map(({ data, metaData }) => {
    const inflationRate = data / (endOfWeekTs - nowTs);

    return [
      metaData.gaugeAddress,
      inflationRate,
    ];
  }));

    const calls = []

    const gaugeControllerAddress = '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB'
    const gaugeController = new web3.eth.Contract(gaugeControllerAbi, gaugeControllerAddress);

    for (var i = 0; i < gaugeList.length; i++) {
      const gaugeContract = new web3Side.eth.Contract(sideChainGauge, gaugeList[i]);
      calls.push([gaugeList[i], gaugeContract.methods.lp_token().encodeABI()])
      calls.push([gaugeList[i], gaugeContract.methods.name().encodeABI()])
      calls.push([gaugeList[i], gaugeContract.methods.symbol().encodeABI()])
      calls.push([gaugeList[i], gaugeContract.methods.working_supply().encodeABI()])
      calls.push([gaugeList[i], gaugeContract.methods.totalSupply().encodeABI()])
      calls.push([gaugeList[i], gaugeContract.methods.inflation_rate(startOfWeekTs).encodeABI()])
    }
    let aggGaugecalls = await multicall.methods.aggregate(calls).call();
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
      i += 1
      let totalSupply = await web3.eth.abi.decodeParameter('uint256', aggGaugecalls[i])
      i += 1
      let inflation_rate = await web3.eth.abi.decodeParameter('uint256', aggGaugecalls[i])

      let hasCrv = false
      let gauge_relative_weight;
      let get_gauge_weight;
      try {
        await gaugeController.methods.gauge_types(gaugeList[gaugeN]).call()
        gauge_relative_weight = await gaugeController.methods.gauge_relative_weight(gaugeList[gaugeN]).call()
        get_gauge_weight = await gaugeController.methods.get_gauge_weight(gaugeList[gaugeN]).call()
        hasCrv = true
      } catch (e) { }

      let poolContract = new web3Side.eth.Contract(factorypool3Abi, lp_token)
      let virtual_price;
      try {
        virtual_price = await poolContract.methods.get_virtual_price().call();
      } catch (err) {
        virtual_price = 0; // get_virtual_price reverts if pool is empty
      }

      let gaugeData = {
        'swap_token': lp_token,
        'gauge': gaugeList[gaugeN],
        name,
        symbol,
        hasCrv,
        side_chain: true,
        type: 'stable', //we will have a problem detecting this which is used by cur.vote or the voting app to calculate the $ value in the gauge
        gauge_data: {
          working_supply,
          totalSupply,
          gauge_relative_weight,
          get_gauge_weight,
          inflation_rate: Number(inflation_rate) || (get_gauge_weight > 0 ? pendingEmissions[gaugeList[gaugeN]] : 0),
        },
        swap_data: {
          virtual_price
        }
      }
      gauges.push(gaugeData)
      gaugeN++
    }

  // swap field
  const lpMinterAddresses = await multiCall(gauges.map(({ swap_token }) => ({
    address: swap_token,
    abi: GaugeAbi,
    methodName: 'minter',
    networkSettings: {
      web3: web3Side,
      multicall2Address: config.multicall2Address,
    }
  })));

  const gaugesWithSwapAddresses = gauges.map((gauge, gaugeIndex) => {
    // Some pools have a separate lp token, some have the swap and token contracts merged
    const lpMinterAddress = lpMinterAddresses[gaugeIndex];
    const swapAddress = lpMinterAddress !== ZERO_ADDRESS ? lpMinterAddress : gauge.swap_token;

    return {
      ...gauge,
      swap: swapAddress,
    };
  });


  return {
    gauges: gaugesWithSwapAddresses,
  };
}, {
  maxAge: 60,
});
