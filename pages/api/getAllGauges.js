// Step 2 is great, jus tneed working supply now and uncommenting the other pieces of data


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
import { ZERO_ADDRESS } from 'utils/Web3';
import GAUGE_CONTROLLER_ABI from '../../constants/abis/gauge_controller.json';
import GAUGE_ABI from '../../constants/abis/example_gauge_2.json';
import META_REGISTRY_ABI from '../../constants/abis/meta-registry.json';

/* eslint-disable object-curly-spacing, object-curly-newline, quote-props, quotes, key-spacing, comma-spacing */
const GAUGE_IS_ROOT_GAUGE_ABI = [{ "stateMutability": "view", "type": "function", "name": "bridger", "inputs": [], "outputs": [{ "name": "", "type": "address" }] }];
const GAUGE_IS_ROOT_GAUGE_2_ABI = [{ "stateMutability": "view", "type": "function", "name": "emissions", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "gas": 2778 }];
/* eslint-enable object-curly-spacing, object-curly-newline, quote-props, quotes, key-spacing, comma-spacing */

const SIDECHAINS_WITH_FACTORY_GAUGES = [
  'fantom',
  'polygon',
  'arbitrum',
  'avalanche',
  'optimism',
  'xdai',
  'moonbeam',
  'kava',
  'celo',
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

const CRVUSD_POOLS_GAUGES = [
  '0x95f00391cb5eebcd190eb58728b4ce23dbfa6ac1',
  '0x4e6bb6b7447b7b2aa268c16ab87f4bb48bf57939',
  '0xfcAf4EC80a94a5409141Af16a1DcA950a6973a39',
  '0x5c07440a172805d566Faf7eBAf16EF068aC05f43',
].map(lc);

const LEGACY_ETHEREUM_MAIN_GAUGES_OUTSIDE_OF_REGISTRY = [
  '0x82d0aDea8C4CF2fc84A499b568F4C1194d63113d',
  '0x25530f3c929d3f4137a766de3d37700d2fc00ff8',
  ...CRVUSD_POOLS_GAUGES,
].map(lc);

const NON_STANDARD_OUTDATED_GAUGES = [
  'celo-0x4969e38b8d37fc42a1897295Ea6d7D0b55944497',
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

export default fn(async ({ blockchainId } = {}) => {
  const chainsToQuery = SIDECHAINS_WITH_FACTORY_GAUGES;
  const blockchainIds = [
    'ethereum',
    ...chainsToQuery,
  ].filter((id) => (
    typeof blockchainId === 'undefined' ||
    id === blockchainId ||
    id === 'ethereum' // Always include ethereum
  ));

  const allPools = await getAllCurvePoolsData(blockchainIds);

  const getPoolByLpTokenAddress = (lpTokenAddress, blockchainId) => (
    allPools.find((pool) => (
      pool.blockchainId === blockchainId &&
      lc(pool.lpTokenAddress || pool.address) === lc(lpTokenAddress)
    ))
  );

  const getPoolByAddress = (address, blockchainId) => (
    allPools.find((pool) => (
      pool.blockchainId === blockchainId &&
      lc(pool.address) === lc(address)
    ))
  );

  const { rpcUrl, backuprpcUrl, chainId } = configs.ethereum;
  const web3 = new Web3(rpcUrl);
  const web3Data = { account: '', library: web3, chainId };

  /**
   * Step 1: Retrieve mainnet gauges that are in the gauge registry (dao vote has passed)
   */
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
      lpTokenPrice: (pool.usdTotal / (pool.totalSupply / 1e18)),
    };
  });

  const mainGaugesEthereum = arrayToHashmap(gaugesData.map(({
    address,
    lpTokenAddress,
    name,
    shortName,
    workingSupply,
    inflationRate,
    gaugeRelativeWeight,
    getGaugeWeight,
    virtualPrice,
    poolAddress,
    isKilled,
    factory,
    type,
    lpTokenPrice,
  }) => [name, {
    poolUrls: getPoolByLpTokenAddress(lpTokenAddress, 'ethereum').poolUrls,
    swap: lc(poolAddress),
    swap_token: lc(lpTokenAddress),
    name,
    shortName,
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
    hasNoCrv: (LEGACY_ETHEREUM_MAIN_GAUGES_OUTSIDE_OF_REGISTRY.includes(lc(address)) && !CRVUSD_POOLS_GAUGES.includes(lc(address))),
    type,
    lpTokenPrice,
  }]));

  /**
   * Step 2: Retrieve mainnet gauges that aren't in the gauge registry (no dao vote yet),
   * but have been deployed (they're in the metaregistry).
   */
  const META_REGISTRY_ADDRESS = '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC';
  const allGaugesEthereum = await multiCall(allPools.map(({ address }) => ({
    address: META_REGISTRY_ADDRESS,
    abi: META_REGISTRY_ABI,
    methodName: 'get_gauge',
    params: [address],
    metaData: { poolAddress: address },
    web3Data,
  })));

  const nonVotedGaugesEthereum = allGaugesEthereum.filter(({ data }) => (
    data !== ZERO_ADDRESS &&
    !gaugesData.some(({ address }) => lc(address) === lc(data))
  ));

  const nonVotedGaugesEthereumDataRaw = await multiCall(flattenArray(nonVotedGaugesEthereum.map(({
    data: gaugeAddress,
  }) => {
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
      ...baseConfigData,
      methodName: 'is_killed',
      metaData: { gaugeAddress, type: 'isKilled' },
    }];
  })));

  const nonVotedGaugesEthereumData = arrayToHashmap(nonVotedGaugesEthereum.map(({
    data: address,
    metaData: { poolAddress },
  }) => {
    const pool = getPoolByAddress(poolAddress, 'ethereum');
    const name = getPoolName(pool);
    const shortName = getPoolShortName(pool);
    const rawData = arrayToHashmap(nonVotedGaugesEthereumDataRaw.filter(({ metaData }) => lc(metaData.gaugeAddress) === lc(address)).map(({ data, metaData: { type } }) => [
      type,
      data,
    ]));

    return [name, {
      poolUrls: getPoolByLpTokenAddress((pool.lpTokenAddress || pool.address), 'ethereum').poolUrls,
      swap: lc(poolAddress),
      swap_token: lc(pool.lpTokenAddress || pool.address),
      name,
      shortName,
      gauge: lc(address),
      gauge_data: {
        inflation_rate: rawData.inflationRate,
        working_supply: rawData.workingSupply,
      },
      gauge_controller: {
        gauge_relative_weight: '0',
        get_gauge_weight: '0',
        inflation_rate: rawData.inflationRate,
      },
      factory: true,
      side_chain: false,
      is_killed: rawData.isKilled,
      hasNoCrv: true,
      type: ((pool.registryId === 'crypto' || pool.registryId === 'factory-crypto') ? 'crypto' : 'stable'),
      lpTokenPrice: (pool.usdTotal / (pool.totalSupply / 1e18)),
    }];
  }));

  /**
   * Step 3: Retrieve sidechain factory gauges
   */
  const factoGauges = await sequentialPromiseMap(blockchainIds, (blockchainIdsChunk) => (
    Promise.all(blockchainIdsChunk.map((blockchainId) => (
      getFactoGauges.straightCall({ blockchainId }).then(({ gauges }) => (
        gauges.map((gaugeData) => ({
          ...gaugeData,
          blockchainId,
        }))
      ))
    )))
  ), 8);

  const gauges = {
    ...nonVotedGaugesEthereumData,
    ...mainGaugesEthereum,
    ...arrayToHashmap(flattenArray(factoGauges.map((blockchainFactoGauges) => (
      blockchainFactoGauges
        .filter(({ gauge, blockchainId }) => (
          !NON_STANDARD_OUTDATED_GAUGES.includes(`${blockchainId}-${lc(gauge)}`)
        ))
        .map(({
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
          lpTokenPrice,
          hasCrv,
          areCrvRewardsStuckInBridge,
          rewardsNeedNudging,
          isKilled,
        }) => {
          const pool = getPoolByLpTokenAddress(swap_token, blockchainId);
          const name = getPoolName(pool);
          const shortName = getPoolShortName(pool);

          return [
            name, {
              poolUrls: pool.poolUrls,
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
              isKilled,
              lpTokenPrice,
              ...(blockchainId !== 'ethereum' ? {
                gaugeStatus: {
                  areCrvRewardsStuckInBridge,
                  rewardsNeedNudging,
                },
              } : {}),
            },
          ];
        })
    )))),
  };

  return gauges;
}, {
  maxAge: 5 * 60,
  name: 'getAllGauges',
});
