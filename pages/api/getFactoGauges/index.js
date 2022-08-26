import Web3 from 'web3';
import uniq from 'lodash.uniq';
import { fn } from 'utils/api';
import GAUGE_REGISTRY_ABI from 'constants/abis/gauge-registry.json';
import GAUGE_REGISTRY_SIDECHAIN_ABI from 'constants/abis/gauge-registry-sidechain.json';
import GAUGE_FACTORY_ABI from 'constants/abis/gauge-factory-sidechain.json';
import sideChainGauge from 'constants/abis/sidechain-gauge.json';
import sideChainRootGauge from 'constants/abis/sidechain-root-gauge.json';
import gaugeControllerAbi from 'constants/abis/gauge_controller.json';
import factorypool3Abi from 'constants/abis/factory_swap.json';
import { multiCall } from 'utils/Calls';
import { arrayToHashmap, arrayOfIncrements, flattenArray } from 'utils/Array';
import getPools from 'pages/api/getPools';
import configs from 'constants/configs';
import getFactoryV2SidechainGaugeRewards from 'utils/data/getFactoryV2SidechainGaugeRewards';

export default fn(async ({ blockchainId }) => {
  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum'; // Default value

  if (blockchainId === 'ethereum') {
    return {
      gauges: [],
    };
  }

  const config = configs[blockchainId];
  const configEth = configs.ethereum;

  if (typeof config === 'undefined') {
    throw new Error(`No factory data for blockchainId "${blockchainId}"`);
  }
  if (!config.chainId) {
    throw new Error(`Missing chain id in config for "${blockchainId}"`);
  }

  const web3 = new Web3(configEth.rpcUrl);
  const web3Side = new Web3(config.rpcUrl);

  const gaugeRegistryAddress = '0xabc000d88f23bb45525e447528dbf656a9d55bf5';
  const gaugeRegistry = new web3.eth.Contract(GAUGE_REGISTRY_ABI, gaugeRegistryAddress);
  const gaugeRegistrySidechain = new web3Side.eth.Contract(GAUGE_REGISTRY_SIDECHAIN_ABI, gaugeRegistryAddress);

  const [mirroredGaugeCount, unmirroredGaugeCount] = await Promise.all([
    gaugeRegistry.methods.get_gauge_count(config.chainId).call(),
    gaugeRegistrySidechain.methods.get_gauge_count().call(),
  ]);
  if (Number(mirroredGaugeCount) === 0 && Number(unmirroredGaugeCount) === 0) {
    return {
      gauges: [],
    };
  }

  const unfilteredMirroredGaugeList = await multiCall(arrayOfIncrements(mirroredGaugeCount).map((gaugeIndex) => ({
    address: gaugeRegistryAddress,
    abi: GAUGE_REGISTRY_ABI,
    methodName: 'get_gauge',
    params: [config.chainId, gaugeIndex],
  })));

  const unfilteredUnmirroredGaugeList = await multiCall(arrayOfIncrements(unmirroredGaugeCount).map((gaugeIndex) => ({
    address: gaugeRegistryAddress,
    abi: GAUGE_REGISTRY_SIDECHAIN_ABI,
    methodName: 'get_gauge',
    params: [gaugeIndex],
    networkSettings: { web3: web3Side, multicall2Address: config.multicall2Address },
  })));

  const unfilteredGaugeList = uniq([
    ...unfilteredMirroredGaugeList,
    ...unfilteredUnmirroredGaugeList,
  ]);

  const gaugesKilledInfo = await multiCall(unfilteredGaugeList.map((gaugeAddress) => ({
    address: gaugeAddress,
    abi: sideChainRootGauge,
    methodName: 'is_killed',
  })));

  const gaugeList = unfilteredGaugeList.filter((address, index) => {
    const isKilled = gaugesKilledInfo[index];
    return !isKilled;
  });

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

  const gaugesDataFromSidechain = await multiCall(flattenArray(gaugeList.map((gaugeAddress) => {
    const baseConfigData = {
      address: gaugeAddress,
      abi: sideChainGauge,
      networkSettings: { web3: web3Side, multicall2Address: config.multicall2Address },
    };

    return [{
      ...baseConfigData,
      methodName: 'lp_token',
      metaData: { gaugeAddress, type: 'lpTokenAddress' },
    }, {
      ...baseConfigData,
      methodName: 'name',
      metaData: { gaugeAddress, type: 'name' },
    }, {
      ...baseConfigData,
      methodName: 'symbol',
      metaData: { gaugeAddress, type: 'symbol' },
    }, {
      ...baseConfigData,
      methodName: 'working_supply',
      metaData: { gaugeAddress, type: 'workingSupply' },
    }, {
      ...baseConfigData,
      methodName: 'totalSupply',
      metaData: { gaugeAddress, type: 'totalSupply' },
    }, {
      ...baseConfigData,
      methodName: 'inflation_rate',
      params: [startOfWeekTs],
      metaData: { gaugeAddress, type: 'inflationRate' },
    }, {
      address: gaugeRegistryAddress,
      abi: GAUGE_FACTORY_ABI,
      methodName: 'is_mirrored',
      params: [gaugeAddress],
      metaData: { gaugeAddress, type: 'isMirrored' },
    }, {
      address: gaugeRegistryAddress,
      abi: GAUGE_FACTORY_ABI,
      methodName: 'last_request',
      params: [gaugeAddress],
      metaData: { gaugeAddress, type: 'lastRequest' },
    }];
  })));

  const gaugeControllerAddress = '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB';
  const gaugesDataFromMainnet = await multiCall(flattenArray(gaugeList.map((gaugeAddress) => {
    const baseConfigData = {
      address: gaugeControllerAddress,
      abi: gaugeControllerAbi,
    };

    return [{
      ...baseConfigData,
      methodName: 'gauge_types',
      params: [gaugeAddress],
      metaData: { gaugeAddress, type: 'hasCrv' },
      superSettings: { returnSuccessState: true },
    }, {
      ...baseConfigData,
      methodName: 'gauge_relative_weight',
      params: [gaugeAddress],
      metaData: { gaugeAddress, type: 'gaugeRelativeWeight' },
    }, {
      ...baseConfigData,
      methodName: 'get_gauge_weight',
      params: [gaugeAddress],
      metaData: { gaugeAddress, type: 'getGaugeWeight' },
    }];
  })));

  const gaugesData = gaugeList.map((gaugeAddress) => {
    const gaugeDataFromSidechain = gaugesDataFromSidechain.filter(({ metaData }) => metaData.gaugeAddress === gaugeAddress);
    const gaugeDataFromMainnet = gaugesDataFromMainnet.filter(({ metaData }) => metaData.gaugeAddress === gaugeAddress);

    return {
      address: gaugeAddress,
      ...arrayToHashmap(gaugeDataFromSidechain.map(({ data, metaData: { type } }) => [
        type,
        data,
      ])),
      ...arrayToHashmap(gaugeDataFromMainnet.map(({ data, metaData: { type } }) => [
        type,
        data,
      ])),
    };
  });

  const hasCryptoPools = !!config.getCryptoRegistryAddress;
  const hasFactoPools = !!config.getFactoryRegistryAddress;
  const hasFactoCryptoPools = !!config.getFactoryCryptoRegistryAddress;
  const [
    stablePools,
    cryptoPools,
    factoPools,
    factoCryptoPools,
  ] = await Promise.all([(
    (await getPools.straightCall({ blockchainId, registryId: 'main', preventQueryingFactoData: true })).poolData
  ), (
    hasCryptoPools ?
      (await getPools.straightCall({ blockchainId, registryId: 'crypto', preventQueryingFactoData: true })).poolData :
      []
  ), (
    hasFactoPools ?
      (await getPools.straightCall({ blockchainId, registryId: 'factory', preventQueryingFactoData: true })).poolData :
      []
  ), (
    hasFactoCryptoPools ?
      (await getPools.straightCall({ blockchainId, registryId: 'factory-crypto', preventQueryingFactoData: true })).poolData :
      []
  )]);

  const gaugesDataWithPoolAddressAndType = gaugesData.map((gaugeData) => {
    const poolInMainRegistry = stablePools.find(({ lpTokenAddress, address }) => (
      lpTokenAddress === gaugeData.lpTokenAddress ||
      address === gaugeData.lpTokenAddress
    ));
    const poolInCryptoRegistry = cryptoPools.find(({ lpTokenAddress, address }) => (
      lpTokenAddress === gaugeData.lpTokenAddress ||
      address === gaugeData.lpTokenAddress
    ));
    const poolInCryptoFactoRegistry = factoCryptoPools.find(({ lpTokenAddress, address }) => (
      lpTokenAddress === gaugeData.lpTokenAddress ||
      address === gaugeData.lpTokenAddress
    ));
    const poolInStableFactoRegistry = factoPools.find(({ lpTokenAddress, address }) => (
      lpTokenAddress === gaugeData.lpTokenAddress ||
      address === gaugeData.lpTokenAddress
    ));

    if (
      typeof poolInMainRegistry === 'undefined' &&
      typeof poolInCryptoRegistry === 'undefined' &&
      typeof poolInCryptoFactoRegistry === 'undefined' &&
      typeof poolInStableFactoRegistry === 'undefined'
    ) {
      return null;
    }

    return {
      ...gaugeData,
      poolAddress: (poolInMainRegistry || poolInCryptoRegistry || poolInCryptoFactoRegistry || poolInStableFactoRegistry).address,
      lpTokenPrice: (
        (poolInMainRegistry || poolInCryptoRegistry || poolInCryptoFactoRegistry || poolInStableFactoRegistry).usdTotal /
        ((poolInMainRegistry || poolInCryptoRegistry || poolInCryptoFactoRegistry || poolInStableFactoRegistry).totalSupply / 1e18)
      ),
      type: ((poolInCryptoFactoRegistry || poolInCryptoRegistry) ? 'crypto' : 'stable'),
    };
  }).filter((o) => o !== null);

  const poolsVirtualPrices = await multiCall(gaugesDataWithPoolAddressAndType.map(({ poolAddress }) => ({
    address: poolAddress,
    abi: factorypool3Abi,
    methodName: 'get_virtual_price',
    networkSettings: { web3: web3Side, multicall2Address: config.multicall2Address },
  })));

  const gaugesDataWithPoolVprice = gaugesDataWithPoolAddressAndType.map((gaugeData, index) => ({
    ...gaugeData,
    poolVirtualPrice: poolsVirtualPrices[index],
  }));

  // Map to the historical data structure for compatibility purposes
  const formattedGaugesData = gaugesDataWithPoolVprice.map(({
    address,
    lpTokenAddress,
    name,
    symbol,
    workingSupply,
    totalSupply,
    inflationRate,
    hasCrv,
    gaugeRelativeWeight,
    getGaugeWeight,
    poolAddress,
    type,
    poolVirtualPrice,
    isMirrored,
    lastRequest,
    lpTokenPrice,
  }) => {
    const effectiveInflationRate = Number(inflationRate) || (getGaugeWeight > 0 ? pendingEmissions[address] : 0);
    const rewardsNeedNudging = (
      hasCrv &&
      effectiveInflationRate > 0 &&
      isMirrored &&
      Math.trunc(lastRequest / weekSeconds) !== startOfWeekTs
    );

    return {
      swap_token: lpTokenAddress,
      gauge: address,
      name,
      symbol,
      hasCrv,
      side_chain: true,
      type,
      gauge_data: {
        working_supply: workingSupply,
        totalSupply,
        gauge_relative_weight: gaugeRelativeWeight,
        get_gauge_weight: getGaugeWeight,
        inflation_rate: effectiveInflationRate,
      },
      swap_data: {
        virtual_price: poolVirtualPrice,
      },
      lpTokenPrice,
      swap: poolAddress,
      rewardsNeedNudging,
      areCrvRewardsStuckInBridge: (
        effectiveInflationRate > 0 &&
        Number(inflationRate) === 0 &&
        !rewardsNeedNudging
      ),
    };
  });

  const sideGaugesRewards = await getFactoryV2SidechainGaugeRewards({ blockchainId, gauges: formattedGaugesData });

  return {
    gauges: formattedGaugesData.map(({ gauge, ...rest }) => ({
      gauge,
      ...rest,
      extraRewards: (sideGaugesRewards[gauge.toLowerCase()] || []),
    })),
  };
}, {
  maxAge: 60,
});
