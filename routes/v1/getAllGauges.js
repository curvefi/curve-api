/**
 * @openapi
 * /getAllGauges:
 *   get:
 *     tags:
 *       - Gauges
 *       - Volumes and APYs
 *     description: |
 *       Returns all Curve gauges, on all chains, in all registries. If any Curve pool, anywhere, has a gauge, then it’ll be returned by this endpoint.
 *       The only exception are sidechain non-factory gauges, which aren’t indexed by any registry, and have been discontinued for a long time now. On sidechains, only factory gauges exist; on Ethereum, both "main" (non-factory) and factory gauges exist.
 *     responses:
 *       200:
 *         description:
 */

import Web3 from 'web3';
import partition from 'lodash.partition';
import configs from '#root/constants/configs/index.js'
import getFactoGaugesFn from '#root/routes/v1/getFactoGauges/[blockchainId].js';
import { fn } from '#root/utils/api.js';
import { multiCall } from '#root/utils/Calls.js';
import getAllCurvePoolsData from '#root/utils/data/curve-pools-data.js';
import getAllCurveLendingVaultsData from '#root/utils/data/curve-lending-vaults-data.js';
import { arrayOfIncrements, flattenArray, arrayToHashmap } from '#root/utils/Array.js';
import { sequentialPromiseMap } from '#root/utils/Async.js';
import { ZERO_ADDRESS } from '#root/utils/Web3/index.js';
import GAUGE_CONTROLLER_ABI from '#root/constants/abis/gauge_controller.json' assert { type: 'json' };
import GAUGE_ABI from '#root/constants/abis/example_gauge_2.json' assert { type: 'json' };
import META_REGISTRY_ABI from '#root/constants/abis/meta-registry.json' assert { type: 'json' };
import { IS_DEV } from '#root/constants/AppConstants.js';
import { getNowTimestamp } from '#root/utils/Date.js';
import allCoins from '#root/constants/coins/index.js'
import getAssetsPrices from '#root/utils/data/assets-prices.js';

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
  'base',
  'fraxtal',
  'bsc',
  'x-layer',
  'mantle',
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

const getLendingVaultName = (lendingVault) => {
  const prefix = lendingVault.blockchainId === 'ethereum' ? '' : `[${lendingVault.blockchainId}] `;
  return `${prefix}Lending: ${lendingVault.name} (${lendingVault.address.slice(0, 6)}…${lendingVault.address.slice(-4)})`;
};

const getLendingVaultShortName = (lendingVault) => {
  const prefix = lendingVault.blockchainId === 'ethereum' ? '' : `${configs[lendingVault.blockchainId].shortId}-`;
  return `${prefix}lend-${lendingVault.assets.borrowed.symbol}(${lendingVault.assets.collateral.symbol}) (${lendingVault.address.slice(0, 6)}…)`;
};

const getAllGauges = fn(async ({ blockchainId }) => {
  const chainsToQuery = SIDECHAINS_WITH_FACTORY_GAUGES;
  const blockchainIds = [
    'ethereum',
    ...chainsToQuery,
  ].filter((id) => (
    blockchainId === 'all' ||
    id === blockchainId ||
    id === 'ethereum' // Always include ethereum
  ));

  const [allPools, allLendingVaults] = await Promise.all([
    getAllCurvePoolsData(blockchainIds),
    getAllCurveLendingVaultsData(blockchainIds),
  ]);

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

  const getLendingVaultByLpTokenAddress = (lpTokenAddress, blockchainId) => (
    allLendingVaults.find((lendingVault) => (
      lendingVault.blockchainId === blockchainId &&
      lc(lendingVault.address) === lc(lpTokenAddress)
    ))
  );

  const { rpcUrl, chainId } = configs.ethereum;
  const web3 = new Web3(rpcUrl);
  const web3Data = { account: '', library: web3, chainId };

  const {
    [allCoins.crv.coingeckoId]: crvPrice,
  } = await getAssetsPrices([allCoins.crv.coingeckoId]);

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
      methodName: 'gauge_relative_weight_write',
      params: [gaugeAddress],
      metaData: { gaugeAddress, type: 'gaugeRelativeWeight' },
    }, {
      address: GAUGE_CONTROLLER_ADDRESS,
      abi: GAUGE_CONTROLLER_ABI,
      web3Data,
      methodName: 'gauge_relative_weight_write',
      params: [gaugeAddress, getNowTimestamp() + (7 * 86400)],
      metaData: { gaugeAddress, type: 'gaugeFutureRelativeWeight' },
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
    const lendingVault = getLendingVaultByLpTokenAddress(gaugeData.lpTokenAddress, 'ethereum');
    if (!pool && !lendingVault) {
      if (IS_DEV && gaugeData.lpTokenAddress !== ZERO_ADDRESS) console.log('Couldn’t match this LP token address with any Curve pool or lending vault address:', gaugeData.lpTokenAddress)
      return null;
    }

    const isPool = !!pool;

    const lpTokenPrice = (
      isPool ?
        (pool.usdTotal / (pool.totalSupply / 1e18)) :
        lendingVault.vaultShares.pricePerShare
    );

    const gaugeCrvBaseApy = (
      !gaugeData.isKilled ? (
        (gaugeData.inflationRate / 1e18) * gaugeData.gaugeRelativeWeight / 1e18 * 31536000 / (gaugeData.workingSupply / 1e18) * 0.4 * crvPrice / lpTokenPrice * 100
      ) : undefined
    );

    const gaugeFutureCrvBaseApy = (
      !gaugeData.isKilled ? (
        (gaugeData.inflationRate / 1e18) * gaugeData.gaugeFutureRelativeWeight / 1e18 * 31536000 / (gaugeData.workingSupply / 1e18) * 0.4 * crvPrice / lpTokenPrice * 100
      ) : undefined
    );

    return {
      ...gaugeData,
      ...(isPool ? {
        // Props shared by pools and lending vaults
        isPool,
        name: getPoolName(pool),
        shortName: getPoolShortName(pool),

        // Props for pools only
        poolAddress: pool.address,
        virtualPrice: pool.virtualPrice,
        factory: pool.factory || false,
        type: ((pool.registryId === 'crypto' || pool.registryId === 'factory-crypto') ? 'crypto' : 'stable'),

        // Props for lending vaults only
        lendingVaultAddress: undefined,
      } : {
        // Props shared by pools and lending vaults
        isPool,
        name: getLendingVaultName(lendingVault),
        shortName: getLendingVaultShortName(lendingVault),

        // Props for pools only
        poolAddress: undefined,
        virtualPrice: undefined,
        factory: undefined,
        type: undefined,

        // Props for lending vaults only
        lendingVaultAddress: lendingVault.address,
      }),
      lpTokenPrice,
      gaugeCrvApy: (
        !gaugeData.isKilled ?
          [gaugeCrvBaseApy, (gaugeCrvBaseApy * 2.5)] :
          undefined
      ),
      gaugeFutureCrvApy: (
        !gaugeData.isKilled ?
          [gaugeFutureCrvBaseApy, (gaugeFutureCrvBaseApy * 2.5)] :
          undefined
      ),
    };
  }).filter((o) => o !== null);

  const mainGaugesEthereum = arrayToHashmap(gaugesData.map(({
    isPool,
    address,
    lpTokenAddress,
    name,
    shortName,
    workingSupply,
    inflationRate,
    gaugeRelativeWeight,
    gaugeFutureRelativeWeight,
    getGaugeWeight,
    isKilled,
    lpTokenPrice,
    gaugeCrvApy,
    gaugeFutureCrvApy,

    // Props for pools only
    poolAddress,
    virtualPrice,
    factory,
    type,

    // Props for lending vaults only
    lendingVaultAddress,
  }) => [name, {
    blockchainId: 'ethereum',
    isPool,
    name,
    shortName,
    gauge: lc(address),
    gauge_data: {
      inflation_rate: inflationRate,
      working_supply: workingSupply,
    },
    gauge_controller: {
      gauge_relative_weight: gaugeRelativeWeight,
      gauge_future_relative_weight: gaugeFutureRelativeWeight,
      get_gauge_weight: getGaugeWeight,
      inflation_rate: inflationRate,
    },
    side_chain: false,
    is_killed: isKilled,
    hasNoCrv: (LEGACY_ETHEREUM_MAIN_GAUGES_OUTSIDE_OF_REGISTRY.includes(lc(address)) && !CRVUSD_POOLS_GAUGES.includes(lc(address))),
    lpTokenPrice,
    gaugeCrvApy,
    gaugeFutureCrvApy,

    ...(isPool ? {
      // Props for pools only
      poolUrls: getPoolByLpTokenAddress(lpTokenAddress, 'ethereum').poolUrls,
      swap: lc(poolAddress),
      swap_token: lc(lpTokenAddress),
      swap_data: {
        virtual_price: virtualPrice,
      },
      type,
      factory,

      // Props for lending vaults only
      lendingVaultAddress: undefined,
      lendingVaultUrls: undefined,
    } : {
      // Props for pools only
      poolUrls: undefined,
      swap: undefined,
      swap_token: undefined,
      swap_data: undefined,
      type: undefined,
      factory: undefined,

      // Props for lending vaults only
      lendingVaultAddress,
      lendingVaultUrls: getLendingVaultByLpTokenAddress(lpTokenAddress, 'ethereum').lendingVaultUrls,
    }),
  }]));

  /**
   * Step 2: Retrieve mainnet gauges that aren't in the gauge registry (no dao vote yet),
   * but have been deployed (they're in the metaregistry).
   */
  const META_REGISTRY_ADDRESS = '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC';
  const allGaugesEthereumMetaregistry = await multiCall(allPools.map(({ address }) => ({
    address: META_REGISTRY_ADDRESS,
    abi: META_REGISTRY_ABI,
    methodName: 'get_gauge',
    params: [address],
    metaData: { poolAddress: address },
    web3Data,
  })));

  const stableNgFactoAddress = await configs.ethereum.getFactoryStableswapNgRegistryAddress();
  const allGaugesEthereumStableNgFacto = await multiCall(allPools.map(({ address }) => ({
    address: stableNgFactoAddress,
    abi: META_REGISTRY_ABI,
    methodName: 'get_gauge',
    params: [address],
    metaData: { poolAddress: address },
    web3Data,
  })));

  const nonVotedGaugesEthereum = [...allGaugesEthereumMetaregistry, ...allGaugesEthereumStableNgFacto].filter(({ data }) => (
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

  // Note: I don't expect lending vault gauges to use this flow, so this only looks at pools here,
  // but may need to support lending vault gauges in the future if they use this flow at all.
  const nonVotedGaugesEthereumData = arrayToHashmap(nonVotedGaugesEthereum.map(({
    data: address,
    metaData: { poolAddress },
  }) => {
    const pool = getPoolByAddress(poolAddress, 'ethereum');
    if (!pool) {
      if (IS_DEV) console.log('MISSING POOL:', poolAddress)
      return null;
    }

    const name = getPoolName(pool);
    const shortName = getPoolShortName(pool);
    const rawData = arrayToHashmap(nonVotedGaugesEthereumDataRaw.filter(({ metaData }) => lc(metaData.gaugeAddress) === lc(address)).map(({ data, metaData: { type } }) => [
      type,
      data,
    ]));

    return [name, {
      blockchainId: 'ethereum',
      isPool: true,
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
        gauge_future_relative_weight: '0',
        get_gauge_weight: '0',
        inflation_rate: rawData.inflationRate,
      },
      gaugeCrvApy: [0, 0],
      gaugeFutureCrvApy: [0, 0],
      factory: true,
      side_chain: false,
      is_killed: rawData.isKilled,
      hasNoCrv: true,
      type: ((pool.registryId === 'crypto' || pool.registryId === 'factory-crypto') ? 'crypto' : 'stable'),
      lpTokenPrice: (pool.usdTotal / (pool.totalSupply / 1e18)),
    }];
  }).filter((o) => o !== null));

  /**
   * Step 3: Retrieve sidechain factory gauges
   *
   * NOTE: There are no lending vaults on sidechains yet. Will need to add support
   * for sidechain lending vaults to getFactoGauges when necessary.
   */
  const factoGauges = await sequentialPromiseMap(blockchainIds, (blockchainIdsChunk) => (
    Promise.all(blockchainIdsChunk.map((blockchainId) => (
      getFactoGaugesFn.straightCall({ blockchainId }).then(({ gauges }) => (
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
            gauge_future_relative_weight,
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
          const lendingVault = getLendingVaultByLpTokenAddress(swap_token, blockchainId);
          if (!pool && !lendingVault) {
            if (IS_DEV && swap_token !== ZERO_ADDRESS) console.log('Couldn’t match this LP token address with any Curve pool or lending vault address:', swap_token)
            return null;
          }

          const isPool = !!pool;
          const name = isPool ? getPoolName(pool) : getLendingVaultName(lendingVault);
          const shortName = isPool ? getPoolShortName(pool) : getLendingVaultShortName(lendingVault);

          const isSupersededByOtherGauge = blockchainFactoGauges.some((factoGauge) => (
            factoGauge.gauge !== gauge &&
            factoGauge.blockchainId === blockchainId &&
            factoGauge.swap === swap &&
            !factoGauge.isKilled &&
            factoGauge.hasCrv &&
            (isKilled || !hasCrv)
          ));
          if (isSupersededByOtherGauge) return null; // Ignore this gauge, a prefered one exists

          const gaugeCrvBaseApy = (
            !isKilled ? (
              (inflation_rate / 1e18) * 1 * 31536000 / (working_supply / 1e18) * 0.4 * crvPrice / lpTokenPrice * 100
            ) : undefined
          );

          return [
            name, {
              isPool,
              name,
              shortName,
              gauge: lc(gauge),
              side_chain: true,
              gauge_data: {
                inflation_rate,
                working_supply,
              },
              gauge_controller: {
                gauge_relative_weight,
                gauge_future_relative_weight,
                get_gauge_weight,
                inflation_rate,
              },
              hasNoCrv: !hasCrv,
              is_killed: isKilled,
              lpTokenPrice,
              gaugeCrvApy: (
                !isKilled ?
                  [gaugeCrvBaseApy, (gaugeCrvBaseApy * 2.5)] :
                  undefined
              ),
              ...(blockchainId !== 'ethereum' ? {
                gaugeStatus: {
                  areCrvRewardsStuckInBridge,
                  rewardsNeedNudging,
                },
              } : {}),
              blockchainId,

              ...(isPool ? {
                // Props for pools only
                poolUrls: pool.poolUrls,
                swap: lc(swap),
                swap_token: lc(swap_token),
                type,
                factory: true,

                // Props for lending vaults only
                lendingVaultAddress: undefined,
                lendingVaultUrls: undefined,
              } : {
                // Props for pools only
                poolUrls: undefined,
                swap: undefined,
                swap_token: undefined,
                type: undefined,
                factory: undefined,

                // Props for lending vaults only
                lendingVaultAddress: lendingVault.address,
                lendingVaultUrls: lendingVault.lendingVaultUrls,
              }),
            },
          ];
        }).filter((o) => o !== null)
    )))),
  };

  return gauges;
}, {
  maxAge: 5 * 60,
  cacheKey: ({ blockchainId }) => `getAllGauges-${blockchainId}`,
  paramSanitizers: {
    // Override default blockchainId sanitizer for this endpoint
    blockchainId: ({ blockchainId }) => ({
      isValid: (
        blockchainId === 'ethereum' ||
        SIDECHAINS_WITH_FACTORY_GAUGES.includes(blockchainId)
      ),
      defaultValue: 'all',
    }),
  },
});

export default getAllGauges;
export {
  SIDECHAINS_WITH_FACTORY_GAUGES,
};
