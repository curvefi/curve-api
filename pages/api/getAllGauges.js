/* eslint-disable camelcase */

/**
 * This endpoint returns *all* Curve gauges.
 *
 * The only exception are sidechain non-facto gauges, which aren’t indexed by any registry,
 * and have been discontinued for a long time now. On sidechains, only facto gauges
 * exist; on Ethereum, both "main" (non-facto) and facto gauges exist.
 */

import Web3 from 'web3';
import partition from 'lodash.partition';
import configs from 'constants/configs';
import getFactoGauges from 'pages/api/getFactoGauges';
import { fn } from 'utils/api';
import { multiCall } from 'utils/Calls';
import getAllCurvePoolsData from 'utils/data/curve-pools-data';
import { arrayOfIncrements, flattenArray, arrayToHashmap } from 'utils/Array';
import { sequentialPromiseMap } from 'utils/Async';
import GAUGE_CONTROLLER_ABI from '../../constants/abis/gauge_controller.json';
import GAUGE_ABI from '../../constants/abis/example_gauge_2.json';

/* eslint-disable object-curly-spacing, object-curly-newline, quote-props, quotes, key-spacing, comma-spacing */
const GAUGE_IS_ROOT_GAUGE_ABI = [{"stateMutability":"view","type":"function","name":"bridger","inputs":[],"outputs":[{"name":"","type":"address"}]}];
const GAUGE_IS_ROOT_GAUGE_2_ABI = [{"stateMutability":"view","type":"function","name":"emissions","inputs":[],"outputs":[{"name":"","type":"uint256"}],"gas":2778}];
/* eslint-enable object-curly-spacing, object-curly-newline, quote-props, quotes, key-spacing, comma-spacing */

const SIDECHAINS_WITH_FACTORY_GAUGES = [
  'fantom',
  'polygon',
  'arbitrum',
  'avalanche',
  'optimism',
  'xdai',
];

const lc = (str) => str.toLowerCase();
const GAUGES_ADDRESSES_TO_IGNORE = [
  '0xbAF05d7aa4129CA14eC45cC9d4103a9aB9A9fF60', // vefunder
  '0x34eD182D0812D119c92907852D2B429f095A9b07', // Not a gauge
  '0x18478F737d40ed7DEFe5a9d6F1560d84E283B74e', // Already absent from legacy endpoint data
  '0xd69ac8d9D25e99446171B5D0B3E4234dAd294890', // Already absent from legacy endpoint data
  '0x8101E6760130be2C8Ace79643AB73500571b7162', // Already absent from legacy endpoint data
  '0xC85b385C8587219b1085A264f0235225644a5dD9', // Already absent from legacy endpoint data
  '0x174baa6b56ffe479b604CC20f22D09AD74F1Ca49', // Already absent from legacy endpoint data
].map(lc);

const LEGACY_ETHEREUM_MAIN_GAUGES_OUTSIDE_OF_REGISTRY = [
  '0x82d0aDea8C4CF2fc84A499b568F4C1194d63113d',
  '0xf668e6d326945d499e5b35e7cd2e82acfbcfe6f0',
  '0x25530f3c929d3f4137a766de3d37700d2fc00ff8',
].map(lc);

const GAUGE_CONTROLLER_ADDRESS = '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB';

const getPoolName = (pool) => {
  const prefix = pool.blockchainId === 'ethereum' ? '' : `${pool.blockchainId}-`;
  return `${prefix}${pool.coins.map((coin) => coin.symbol).join('+')} (${pool.address.slice(0, 6)}…${pool.address.slice(-4)})`;
};

const getPoolShortName = (pool) => {
  const prefix = pool.blockchainId === 'ethereum' ? '' : `${configs[pool.blockchainId].shortId}-`;
  return `${prefix}${pool.coins.map((coin) => coin.symbol).join('+')} (${pool.address.slice(0, 6)}…)`;
};

export default fn(async () => {
  const chainsToQuery = SIDECHAINS_WITH_FACTORY_GAUGES;
  const blockchainIds = [
    'ethereum',
    ...chainsToQuery,
  ];

  const allPools = await getAllCurvePoolsData(blockchainIds);

  const getPoolByLpTokenAddress = (lpTokenAddress, blockchainId) => (
    allPools.find((pool) => (
      pool.blockchainId === blockchainId &&
      lc(pool.lpTokenAddress || pool.address) === lc(lpTokenAddress)
    ))
  );

  const { rpcUrl, chainId } = configs.ethereum;
  const web3 = new Web3(rpcUrl);
  const web3Data = { account: '', library: web3, chainId };

  const [mainGaugesCount] = await multiCall([{
    address: GAUGE_CONTROLLER_ADDRESS,
    abi: GAUGE_CONTROLLER_ABI,
    methodName: 'n_gauges',
    web3Data,
  }]);

  const unfilteredMainGaugesList = (await multiCall(arrayOfIncrements(mainGaugesCount).map((id) => ({
    address: GAUGE_CONTROLLER_ADDRESS,
    abi: GAUGE_CONTROLLER_ABI,
    methodName: 'gauges',
    params: [id],
    web3Data,
  })))).concat(LEGACY_ETHEREUM_MAIN_GAUGES_OUTSIDE_OF_REGISTRY);

  const [gaugesKilledInfo, unflattenedGaugesIsRootGaugeInfo] = partition(await multiCall(flattenArray(unfilteredMainGaugesList.map((gaugeAddress) => [{
    address: gaugeAddress,
    abi: GAUGE_ABI,
    methodName: 'is_killed',
    metaData: { gaugeAddress, type: 'isKilled' },
    web3Data,
  }, {
    address: gaugeAddress,
    abi: GAUGE_IS_ROOT_GAUGE_ABI,
    methodName: 'bridger',
    metaData: { gaugeAddress, type: 'isRootLiquidityGauge' },
    superSettings: { returnSuccessState: true }, // isRootLiquidityGauge is true if a `bridger` prop is found
    web3Data,
  }, {
    address: gaugeAddress,
    abi: GAUGE_IS_ROOT_GAUGE_2_ABI,
    methodName: 'emissions',
    metaData: { gaugeAddress, type: 'isRootLiquidityGauge2' },
    superSettings: { returnSuccessState: true }, // isRootLiquidityGauge is true if an `emissions` prop is found
    web3Data,
  }]))), ({ metaData: { type } }) => type === 'isKilled');

  const gaugesIsRootGaugeInfo = flattenArray(unflattenedGaugesIsRootGaugeInfo);
  const gaugeList = unfilteredMainGaugesList.filter((address) => {
    const isRootLiquidityGauge = gaugesIsRootGaugeInfo.some(({ data, metaData: { gaugeAddress } }) => (
      lc(gaugeAddress) === lc(address) &&
      data === true
    ));
    const isIgnoredGauge = GAUGES_ADDRESSES_TO_IGNORE.includes(lc(address));

    return !isRootLiquidityGauge && !isIgnoredGauge;
  });

  const gaugesDataRaw = await multiCall(flattenArray(gaugeList.map((gaugeAddress) => {
    const baseConfigData = {
      address: gaugeAddress,
      abi: GAUGE_ABI,
      web3Data,
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
      metaData: { gaugeAddress, type: 'inflationRate' },
    }, {
      address: GAUGE_CONTROLLER_ADDRESS,
      abi: GAUGE_CONTROLLER_ABI,
      web3Data,
      methodName: 'gauge_relative_weight',
      params: [gaugeAddress],
      metaData: { gaugeAddress, type: 'gaugeRelativeWeight' },
    }, {
      address: GAUGE_CONTROLLER_ADDRESS,
      abi: GAUGE_CONTROLLER_ABI,
      web3Data,
      methodName: 'get_gauge_weight',
      params: [gaugeAddress],
      metaData: { gaugeAddress, type: 'getGaugeWeight' },
    }];
  })));

  const gaugesData = gaugeList.map((gaugeAddress) => ({
    address: gaugeAddress,
    isKilled: (
      gaugesKilledInfo.find(({ metaData }) => lc(metaData.gaugeAddress) === lc(gaugeAddress)).data
    ),
    ...arrayToHashmap(gaugesDataRaw.filter(({ metaData }) => lc(metaData.gaugeAddress) === lc(gaugeAddress)).map(({ data, metaData: { type } }) => [
      type,
      data,
    ])),
  })).map((gaugeData) => {
    const pool = getPoolByLpTokenAddress(gaugeData.lpTokenAddress, 'ethereum');

    return {
      ...gaugeData,
      poolAddress: pool.address,
      name: getPoolName(pool),
      shortName: getPoolShortName(pool),
      virtualPrice: pool.virtualPrice,
      factory: pool.factory || false,
      type: ((pool.registryId === 'crypto' || pool.registryId === 'factory-crypto') ? 'crypto' : 'stable'),
    };
  });

  const mainGaugesEthereum = arrayToHashmap(gaugesData.map(({
    address,
    lpTokenAddress,
    name,
    workingSupply,
    inflationRate,
    gaugeRelativeWeight,
    getGaugeWeight,
    virtualPrice,
    poolAddress,
    isKilled,
    factory,
    type,
  }) => [name, {
    swap: lc(poolAddress),
    swap_token: lc(lpTokenAddress),
    name,
    gauge: lc(address),
    swap_data: {
      virtual_price: virtualPrice,
    },
    gauge_data: {
      inflation_rate: inflationRate,
      working_supply: workingSupply,
    },
    gauge_controller: {
      gauge_relative_weight: gaugeRelativeWeight,
      get_gauge_weight: getGaugeWeight,
      inflation_rate: inflationRate,
    },
    factory,
    side_chain: false,
    is_killed: isKilled,
    hasNoCrv: LEGACY_ETHEREUM_MAIN_GAUGES_OUTSIDE_OF_REGISTRY.includes(lc(address)),
    type,
  }]));

  const factoGauges = await sequentialPromiseMap(blockchainIds, (blockchainIdsChunk) => (
    Promise.all(blockchainIdsChunk.map((blockchainId) => (
      getFactoGauges.straightCall({ blockchainId }).then(({ gauges }) => (
        gauges.map((gaugeData) => ({
          ...gaugeData,
          blockchainId,
        }))
      ))
    )))
  ), 4);

  const gauges = {
    ...mainGaugesEthereum,
    ...arrayToHashmap(flattenArray(factoGauges.map((blockchainFactoGauges) => (
      blockchainFactoGauges.map(({
        blockchainId,
        gauge,
        gauge_data: {
          gauge_relative_weight,
          get_gauge_weight,
          inflation_rate,
          working_supply,
        },
        swap,
        swap_token,
        type,
        hasCrv,
      }) => {
        const pool = getPoolByLpTokenAddress(swap_token, blockchainId);
        const name = getPoolName(pool);
        const shortName = getPoolShortName(pool);

        return [
          name, {
            swap: lc(swap),
            swap_token: lc(swap_token),
            name,
            shortName,
            gauge: lc(gauge),
            type,
            side_chain: true,
            factory: true,
            gauge_data: {
              inflation_rate,
              working_supply,
            },
            gauge_controller: {
              gauge_relative_weight,
              get_gauge_weight,
              inflation_rate,
            },
            hasNoCrv: !hasCrv,
          },
        ];
      })
    )))),
  };

  return gauges;
}, {
  maxAge: 5 * 60,
});
