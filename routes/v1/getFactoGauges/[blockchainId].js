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
 * Note2: it’s also used to retrieve child gauges that do not have a root gauge deployed yet (these do not appear in `getAllGauges`).
 */

import Web3 from 'web3';
import uniq from 'lodash.uniq';
import { differenceInWeeks, fromUnixTime } from 'date-fns';
import { NotFoundError, fn } from '#root/utils/api.js';
import GAUGE_REGISTRY_ABI from '#root/constants/abis/gauge-registry.json' with { type: 'json' };
import GAUGE_REGISTRY_SIDECHAIN_ABI from '#root/constants/abis/gauge-registry-sidechain.json' with { type: 'json' };
import GAUGE_SIDECHAIN_V2_ABI from '#root/constants/abis/gauge-sidechain-v2.json' with { type: 'json' };
import GAUGE_FACTORY_ABI from '#root/constants/abis/gauge-factory-sidechain.json' with { type: 'json' };
import sideChainGauge from '#root/constants/abis/sidechain-gauge.json' with { type: 'json' };
import sideChainRootGauge from '#root/constants/abis/sidechain-root-gauge.json' with { type: 'json' };
import gaugeControllerAbi from '#root/constants/abis/gauge_controller.json' with { type: 'json' };
import factorypool3Abi from '#root/constants/abis/factory_swap.json' with { type: 'json' };
import { multiCall } from '#root/utils/Calls.js';
import { lc } from '#root/utils/String.js';
import { arrayToHashmap, arrayOfIncrements, flattenArray, removeNulls } from '#root/utils/Array.js';
import getAllCurvePoolsData from '#root/utils/data/curve-pools-data.js';
import getAllCurveLendingVaultsData from '#root/utils/data/curve-lending-vaults-data.js';
import configs from '#root/constants/configs/index.js';
import { getNowTimestamp } from '#root/utils/Date.js';
import getFactoryV2SidechainGaugeRewards from '#root/utils/data/getFactoryV2SidechainGaugeRewards.js';
import { sequentialPromiseFlatMap } from '#root/utils/Async.js';

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
  const gaugeRegistryAddress = config.gaugeRegistryAddress !== undefined ? config.gaugeRegistryAddress : '0xabc000d88f23bb45525e447528dbf656a9d55bf5';
  const gaugeRegistryAddress2 = config.gaugeRegistryAddress2 ?? null;
  const gaugeRootRegistry2 = config.gaugeRootRegistry2 ?? null;

  const gaugeRegistryAddresses = removeNulls([
    gaugeRegistryAddress,
    gaugeRegistryAddress2,
  ]);

  const gauges = await sequentialPromiseFlatMap(gaugeRegistryAddresses, async (registryAddress) => {
    // Newest gauge registries have the same root registry (`gaugeRootRegistry2` except gnosis), and separate child registries (`gaugeRegistryAddress2`)
    const isSecondGaugeRegistry = registryAddress === gaugeRegistryAddress2;
    const rootRegistryAddress = isSecondGaugeRegistry ? gaugeRootRegistry2 : registryAddress;

    const gaugeRegistry = new web3.eth.Contract(GAUGE_REGISTRY_ABI, rootRegistryAddress);
    const gaugeRegistrySidechain = new web3Side.eth.Contract(GAUGE_REGISTRY_SIDECHAIN_ABI, registryAddress);

    const [mirroredGaugeCount, unmirroredGaugeCount] = await Promise.all([
      gaugeRegistry.methods.get_gauge_count(config.chainId).call(),
      gaugeRegistrySidechain.methods.get_gauge_count().call(),
    ]);

    if (Number(mirroredGaugeCount) === 0 && Number(unmirroredGaugeCount) === 0) {
      return [];
    }

    let unfilteredRootGaugeList;
    let unfilteredChildGaugeList;

    if (isSecondGaugeRegistry) {
      unfilteredChildGaugeList = await multiCall(arrayOfIncrements(unmirroredGaugeCount).map((gaugeIndex) => ({
        address: registryAddress,
        abi: GAUGE_REGISTRY_SIDECHAIN_ABI,
        methodName: 'get_gauge',
        params: [gaugeIndex],
        networkSettings: { web3: web3Side, multicall2Address: config.multicall2Address },
      })));
    } else {
      unfilteredRootGaugeList = await multiCall(arrayOfIncrements(mirroredGaugeCount).map((gaugeIndex) => ({
        address: rootRegistryAddress,
        abi: GAUGE_REGISTRY_ABI,
        methodName: 'get_gauge',
        params: [config.chainId, gaugeIndex],
      })));
    }

    const unfilteredUnmirroredGaugeList = (
      isSecondGaugeRegistry ? (
        // Root+child registries aren’t necessarily in sync, so querying child gauges
        // for their root counterpart is the only reliable way to retrieve them all
        await multiCall(unfilteredChildGaugeList.map((childGaugeAddress) => ({
          address: childGaugeAddress,
          abi: GAUGE_SIDECHAIN_V2_ABI,
          methodName: 'root_gauge',
          networkSettings: { web3: web3Side, multicall2Address: config.multicall2Address },
        })))
      ) : (
        await multiCall(arrayOfIncrements(unmirroredGaugeCount).map((gaugeIndex) => ({
          address: registryAddress,
          abi: GAUGE_REGISTRY_SIDECHAIN_ABI,
          methodName: 'get_gauge',
          params: [gaugeIndex],
          networkSettings: { web3: web3Side, multicall2Address: config.multicall2Address },
        })))
      )
    );

    /**
    * The first version of sidechain gauges always had the same root & child addresses.
    * The second version of sidechain gauges have different root & child addresses.
    */
    const unfilteredGaugeList = (
      isSecondGaugeRegistry ? (
        unfilteredChildGaugeList.map((childGaugeAddress, i) => ({
          rootGaugeAddress: unfilteredUnmirroredGaugeList[i],
          childGaugeAddress,
        }))
      ) : (
        uniq([
          ...unfilteredRootGaugeList,
          ...unfilteredUnmirroredGaugeList,
        ]).map((gaugeAddress) => ({
          rootGaugeAddress: gaugeAddress,
          childGaugeAddress: gaugeAddress,
        }))
      )
    );

    const gaugesKilledInfo = await multiCall(unfilteredGaugeList.map(({ rootGaugeAddress }) => ({
      address: rootGaugeAddress,
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
    // const pendingEmissionsRaw = await multiCall(gaugeList.map(({ rootGaugeAddress }) => ({
    //   address: rootGaugeAddress,
    //   abi: sideChainRootGauge,
    //   methodName: 'total_emissions',
    //   metaData: { rootGaugeAddress },
    //   networkSettings: { web3, multicall2Address: configs.ethereum.multicall2Address },
    // })));
    // Temporarily disable this feature which yielded incorrect apys
    const pendingEmissionsRaw = gaugeList.map(({ rootGaugeAddress }) => ({
      data: 0,
      metaData: { rootGaugeAddress },
    }));
    const pendingEmissions = arrayToHashmap(pendingEmissionsRaw.map(({ data, metaData }) => {
      const inflationRate = data / (endOfWeekTs - nowTs);

      return [
        metaData.rootGaugeAddress,
        inflationRate,
      ];
    }));

    const gaugesDataFromSidechain = await multiCall(flattenArray(gaugeList.map(({ childGaugeAddress }) => {
      const baseConfigData = {
        address: childGaugeAddress,
        abi: sideChainGauge,
        networkSettings: { web3: web3Side, multicall2Address: config.multicall2Address },
      };

      return [{
        ...baseConfigData,
        methodName: 'lp_token',
        metaData: { childGaugeAddress, type: 'lpTokenAddress' },
      }, {
        ...baseConfigData,
        methodName: 'name',
        metaData: { childGaugeAddress, type: 'name' },
      }, {
        ...baseConfigData,
        methodName: 'symbol',
        metaData: { childGaugeAddress, type: 'symbol' },
      }, {
        ...baseConfigData,
        methodName: 'working_supply',
        metaData: { childGaugeAddress, type: 'workingSupply' },
      }, {
        ...baseConfigData,
        methodName: 'totalSupply',
        metaData: { childGaugeAddress, type: 'totalSupply' },
      }, {
        ...baseConfigData,
        methodName: 'inflation_rate',
        params: [startOfWeekTs],
        metaData: { childGaugeAddress, type: 'inflationRate' },
      }, {
        address: registryAddress,
        abi: GAUGE_FACTORY_ABI,
        methodName: 'is_mirrored',
        params: [childGaugeAddress],
        metaData: { childGaugeAddress, type: 'isMirrored' },
      }, {
        address: registryAddress,
        abi: GAUGE_FACTORY_ABI,
        methodName: 'last_request',
        params: [childGaugeAddress],
        metaData: { childGaugeAddress, type: 'lastRequest' },
      }];
    })));

    const gaugeControllerAddress = '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB';
    const gaugesDataFromMainnet = await multiCall(flattenArray(gaugeList.map(({ rootGaugeAddress }) => {
      const baseConfigData = {
        address: gaugeControllerAddress,
        abi: gaugeControllerAbi,
      };

      return [{
        ...baseConfigData,
        methodName: 'gauge_types',
        params: [rootGaugeAddress],
        metaData: { rootGaugeAddress, type: 'hasCrv' },
        superSettings: { returnSuccessState: true },
      }, {
        ...baseConfigData,
        methodName: 'gauge_relative_weight',
        params: [rootGaugeAddress],
        metaData: { rootGaugeAddress, type: 'gaugeRelativeWeight' },
      }, {
        ...baseConfigData,
        methodName: 'gauge_relative_weight',
        params: [rootGaugeAddress, getNowTimestamp() + (7 * 86400)],
        metaData: { rootGaugeAddress, type: 'gaugeFutureRelativeWeight' },
      }, {
        ...baseConfigData,
        methodName: 'get_gauge_weight',
        params: [rootGaugeAddress],
        metaData: { rootGaugeAddress, type: 'getGaugeWeight' },
      }];
    })));

    const gaugesData = gaugeList.map(({ rootGaugeAddress, childGaugeAddress }) => {
      const gaugeDataFromSidechain = gaugesDataFromSidechain.filter(({ metaData }) => metaData.childGaugeAddress === childGaugeAddress);
      const gaugeDataFromMainnet = gaugesDataFromMainnet.filter(({ metaData }) => metaData.rootGaugeAddress === rootGaugeAddress);

      return {
        address: childGaugeAddress,
        rootAddress: rootGaugeAddress,
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
      rootAddress,
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
      const effectiveInflationRate = Number(inflationRate) || (getGaugeWeight > 0 ? pendingEmissions[rootAddress] : 0);
      const rewardsNeedNudging = (
        hasCrv &&
        effectiveInflationRate > 0 &&
        isMirrored &&
        (differenceInWeeks(fromUnixTime(lastRequest), fromUnixTime(0)) !== currentWeekNumber)
      );

      return {
        swap_token: lpTokenAddress,
        gauge: address,
        rootGauge: rootAddress,
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
        isKilled: gaugesKilledInfo[unfilteredGaugeList.findIndex(({ rootGaugeAddress }) => lc(rootGaugeAddress) === lc(rootAddress))],
      };
    });

    const sideGaugesRewards = await getFactoryV2SidechainGaugeRewards({ blockchainId, gauges: formattedGaugesData });

    return formattedGaugesData.map(({ gauge, ...rest }) => ({
      gauge,
      ...rest,
      extraRewards: (sideGaugesRewards[gauge.toLowerCase()] || []),
    }));
  });

  return {
    gauges,
  };
}, {
  maxAge: 5 * 60,
  cacheKey: ({ blockchainId }) => `getFactoGauges-${blockchainId}`,
});
