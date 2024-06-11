/**
 * @openapi
 * /getFactoGauges/{blockchainId}:
 *   get:
 *     deprecated: true
 *     tags:
 *       - Deprecated
 *     description: |
 *       <i>Deprecated: please use `getAllGauges` instead</i>
 *     parameters:
 *       - $ref: '#/components/parameters/blockchainId'
 *     responses:
 *       200:
 *         description:
 */

/**
 * Note: this method is exposed as an API endpoint, but is mostly meant as an internal utility.
 */

import Web3 from 'web3';
import uniq from 'lodash.uniq';
import { differenceInWeeks, fromUnixTime } from 'date-fns';
import { NotFoundError, fn } from '#root/utils/api.js';
import GAUGE_REGISTRY_ABI from '#root/constants/abis/gauge-registry.json' assert { type: 'json' };
import GAUGE_REGISTRY_SIDECHAIN_ABI from '#root/constants/abis/gauge-registry-sidechain.json' assert { type: 'json' };
import GAUGE_FACTORY_ABI from '#root/constants/abis/gauge-factory-sidechain.json' assert { type: 'json' };
import sideChainGauge from '#root/constants/abis/sidechain-gauge.json' assert { type: 'json' };
import sideChainRootGauge from '#root/constants/abis/sidechain-root-gauge.json' assert { type: 'json' };
import gaugeControllerAbi from '#root/constants/abis/gauge_controller.json' assert { type: 'json' };
import factorypool3Abi from '#root/constants/abis/factory_swap.json' assert { type: 'json' };
import { multiCall } from '#root/utils/Calls.js';
import { lc } from '#root/utils/String.js';
import { arrayToHashmap, arrayOfIncrements, flattenArray } from '#root/utils/Array.js';
import getAllCurvePoolsData from '#root/utils/data/curve-pools-data.js';
import getAllCurveLendingVaultsData from '#root/utils/data/curve-lending-vaults-data.js';
import configs from '#root/constants/configs/index.js';
import { getNowTimestamp } from '#root/utils/Date.js';
import getFactoryV2SidechainGaugeRewards from '#root/utils/data/getFactoryV2SidechainGaugeRewards.js';

export default fn(async ({ blockchainId }) => {
  if (blockchainId === 'ethereum') {
    return {
      gauges: [],
    };
  }

  const config = configs[blockchainId];
  const configEth = configs.ethereum;

  if (typeof config === 'undefined') {
    throw new NotFoundError(`No factory data for blockchainId "${blockchainId}"`);
  }
  if (!config.chainId) {
    throw new NotFoundError(`Missing chain id in config for "${blockchainId}"`);
  }

  const web3 = new Web3(configEth.rpcUrl);
  const web3Side = new Web3(config.rpcUrl);

  // 0xabc is the generic gauge registry address for all sidechains, the config prop allows exceptions
  const gaugeRegistryAddress = config.gaugeRegistryAddress ?? '0xabc000d88f23bb45525e447528dbf656a9d55bf5';

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

  const gaugeList = unfilteredGaugeList;

  const weekSeconds = 86400 * 7;
  const nowTs = +Date.now() / 1000;
  const startOfWeekTs = Math.trunc(nowTs / weekSeconds);
  const currentWeekNumber = differenceInWeeks(fromUnixTime(nowTs), fromUnixTime(0));
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
      methodName: 'gauge_relative_weight',
      params: [gaugeAddress, getNowTimestamp() + (7 * 86400)],
      metaData: { gaugeAddress, type: 'gaugeFutureRelativeWeight' },
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

  const [allPools, allLendingVaults] = await Promise.all([
    getAllCurvePoolsData([blockchainId]),
    getAllCurveLendingVaultsData([blockchainId]),
  ]);

  const gaugesDataWithPoolAddressAndType = gaugesData.map((gaugeData) => {
    const poolOrLendingVault = allPools.find(({ lpTokenAddress, address }) => (
      lc(lpTokenAddress) === lc(gaugeData.lpTokenAddress) ||
      lc(address) === lc(gaugeData.lpTokenAddress)
    )) ?? allLendingVaults.find(({ address }) => (
      lc(address) === lc(gaugeData.lpTokenAddress)
    ));
    if (typeof poolOrLendingVault === 'undefined') return null;

    const isPool = typeof poolOrLendingVault.vaultShares === 'undefined';

    return {
      ...gaugeData,
      isPool,
      poolAddress: poolOrLendingVault.address,
      lpTokenPrice: (
        isPool ? (
          poolOrLendingVault.usdTotal /
          (poolOrLendingVault.totalSupply / 1e18)
        ) : (poolOrLendingVault.vaultShares.pricePerShare)
      ),
      type: (
        isPool ?
          ((poolOrLendingVault.registryId === 'main' || poolOrLendingVault.registryId === 'factory') ? 'stable' : 'crypto') :
          undefined
      ),
      registryId: poolOrLendingVault.registryId,
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
    gaugeFutureRelativeWeight,
    getGaugeWeight,
    poolAddress,
    type,
    lpTokenPrice,
    poolVirtualPrice,
    isMirrored,
    lastRequest,
  }) => {
    const effectiveInflationRate = Number(inflationRate) || (getGaugeWeight > 0 ? pendingEmissions[address] : 0);
    const rewardsNeedNudging = (
      hasCrv &&
      effectiveInflationRate > 0 &&
      isMirrored &&
      (differenceInWeeks(fromUnixTime(lastRequest), fromUnixTime(0)) !== currentWeekNumber)
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
        gauge_future_relative_weight: gaugeFutureRelativeWeight,
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
      isKilled: gaugesKilledInfo[unfilteredGaugeList.findIndex((gaugeAddress) => lc(gaugeAddress) === lc(address))],
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
  maxAge: 3 * 60,
  cacheKey: ({ blockchainId }) => `getFactoGauges-${blockchainId}`,
});
