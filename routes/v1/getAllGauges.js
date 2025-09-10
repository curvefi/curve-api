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
import configs from '#root/constants/configs/index.js';
import getFactoGaugesFn from '#root/routes/v1/getFactoGauges/[blockchainId].js';
import { fn } from '#root/utils/api.js';
import { multiCall } from '#root/utils/Calls.js';
import getAllCurvePoolsData from '#root/utils/data/curve-pools-data.js';
import getAllCurveLendingVaultsData from '#root/utils/data/curve-lending-vaults-data.js';
import { arrayOfIncrements, flattenArray, arrayToHashmap } from '#root/utils/Array.js';
import { sequentialPromiseFlatMap, sequentialPromiseMap } from '#root/utils/Async.js';
import { ZERO_ADDRESS } from '#root/utils/Web3/index.js';
import GAUGE_CONTROLLER_ABI from '#root/constants/abis/gauge_controller.json' assert { type: 'json' };
import GAUGE_ABI from '#root/constants/abis/example_gauge_2.json' assert { type: 'json' };
import META_REGISTRY_ABI from '#root/constants/abis/meta-registry.json' assert { type: 'json' };
import { getNowTimestamp } from '#root/utils/Date.js';
import allCoins from '#root/constants/coins/index.js';
import getAssetsPrices from '#root/utils/data/assets-prices.js';
import { maxChars } from '#root/utils/String.js';
import { EYWA_POOLS_METADATA, FANTOM_FACTO_STABLE_NG_EYWA_POOL_IDS, SONIC_FACTO_STABLE_NG_EYWA_POOL_IDS } from '#root/constants/PoolMetadata.js';
import getExternalGaugeListAddresses from '#root/utils/data/prices.curve.fi/gauges.js';
import Request, { httpsAgentWithoutStrictSsl } from '#root/utils/Request.js';

/* eslint-disable object-curly-spacing, object-curly-newline, quote-props, quotes, key-spacing, comma-spacing */
const GAUGE_IS_ROOT_GAUGE_ABI = [{ "stateMutability": "view", "type": "function", "name": "bridger", "inputs": [], "outputs": [{ "name": "", "type": "address" }] }];
const GAUGE_IS_ROOT_GAUGE_2_ABI = [{ "stateMutability": "view", "type": "function", "name": "emissions", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "gas": 2778 }];
const LENDING_VAULT_FACTORY_GAUGE_FOR_VAULT_ABI = [{ "stateMutability": "view", "type": "function", "name": "gauge_for_vault", "inputs": [{ "name": "_vault", "type": "address" }], "outputs": [{ "name": "", "type": "address" }] }];
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
  'sonic',
  'hyperliquid',
];

// Curve lite deployments are normally not included in this endpoint because they
// historically do not receive CRV emissions. Exceptions exists, and we retrieve
// them from curve-api-core (since curve-api focuses on full deployments only).
const LITE_SIDECHAINS_WITH_CRV_EMISSIONS = [
  'taiko',
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
  '0x1cEBdB0856dd985fAe9b8fEa2262469360B8a3a6', // Gauge for broken pool, already absent

  // The below have never been retrieved by this endpoint, but are picked up by curve-prices and can
  // be safely ignored (dead gauges that were never ever used)
  '0xffbACcE0CC7C19d46132f1258FC16CF6871D153c',
  '0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c',
  '0x3B6B158A76fd8ccc297538F454ce7B4787778c7C',
  '0x40c0e9376468b4f257d15F8c47E5D0C646C28880',
  '0xbF7E49483881C76487b0989CD7d9A8239B20CA41',
  '0x97E2768e8E73511cA874545DC5Ff8067eB19B787',
  '0x37C7ef6B0E23C9bd9B620A6daBbFEC13CE30D824',
  '0x8866414733F22295b7563f9C5299715D2D76CAf4',
  '0xBdFF0C27dd073C119ebcb1299a68A6A92aE607F0',
  '0xd4F94D0aaa640BBb72b5EEc2D85F6D114D81a88E',
  '0x279f11F8E2825dbe0b00F6776376601AC948d868',
  '0x95069889DF0BCdf15bc3182c1A4D6B20631F3B46',
  '0x00702BbDEaD24C40647f235F15971dB0867F6bdB',
  '0x9c735e617050fA6849462299513633d87FbD3f05',
  '0x5A537a46D780B1C70138aB98eDce69e7a53177ba',
  '0x82049b520cAc8b05E703bb35d1691B5005A92848',
  '0x7ce8aF75A9180B602445bE230860DDcb4cAc3E42',
  '0xC91113B4Dd89dd20FDEECDAC82477Bc99A840355',
  '0xD44eB2061362D28f741Bb3547b1a36aB13A8a582',
  '0x5cc0144A511807608eF644c9e99B486124D1cFd6',
  '0x6C09F6727113543Fd061a721da512B7eFCDD0267',
  '0xf2Cde8c47C20aCbffC598217Ad5FE6DB9E00b163',
  '0xd4b19642701964c402DFa668F96F294266bC0a86',
  '0xa05E565cA0a103FcD999c7A7b8de7Bd15D5f6505',
  '0x75D05190f35567e79012c2F0a02330D3Ed8a1F74',
  '0xB504b6EB06760019801a91B451d3f7BD9f027fC9',
  '0x66EFd8E255B8B7Cf32961E90A5820f289402629e',

  // The below have never been retrieved by this endpoint, but are picked up by curve-prices and can
  // be safely ignored (new gauges from lite deployment that will get support once made into a full deployment)
  '0xF347e58166521A6DdCFa4A2Ccbae1f1E93fAe7De',
  '0x9bd94Af225D48e8334B5c549f5C90a3C2097E5B0',
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
  const prefix = pool.blockchainId === 'ethereum' ? '' : (configs[pool.blockchainId] !== undefined ? `${configs[pool.blockchainId].shortId}-` : `${pool.blockchainId}-`);

  const isEywaPool = (
    (pool.blockchainId === 'fantom' && pool.registryId === 'factory-stable-ng' && FANTOM_FACTO_STABLE_NG_EYWA_POOL_IDS.includes(Number(pool.id.replace('factory-stable-ng-', '')))) ||
    (pool.blockchainId === 'sonic' && pool.registryId === 'factory-stable-ng' && SONIC_FACTO_STABLE_NG_EYWA_POOL_IDS.includes(Number(pool.id.replace('factory-stable-ng-', ''))))
  );
  const poolStringIdentifier = (
    isEywaPool ?
      EYWA_POOLS_METADATA.find((metadata) => metadata[pool.blockchainId === 'fantom' ? 'fantomFactoryStableNgPoolId' : 'sonicFactoryStableNgPoolId'] === Number(pool.id.replace('factory-stable-ng-', ''))).shortName :
      pool.coins.map((coin) => coin.symbol).join('+')
  );

  return `${maxChars(`${prefix}${poolStringIdentifier}`, 22)} (${pool.address.slice(0, 6)}…)`; // Max 32 chars long
};

const getLendingVaultName = (lendingVault) => {
  const prefix = lendingVault.blockchainId === 'ethereum' ? '' : `[${lendingVault.blockchainId}] `;
  return `${prefix}Lending: ${lendingVault.name} (${lendingVault.address.slice(0, 6)}…${lendingVault.address.slice(-4)})`;
};

const getLendingVaultShortName = (lendingVault) => {
  const prefix = lendingVault.blockchainId === 'ethereum' ? '' : `${configs[lendingVault.blockchainId].shortId}-`;
  return `${maxChars(`${prefix}lend-${lendingVault.assets.borrowed.symbol}(${lendingVault.assets.collateral.symbol})`, 22)} (${lendingVault.address.slice(0, 6)}…)`; // Max 32 chars long
};

const getAllGauges = fn(async () => {
  const chainsToQuery = SIDECHAINS_WITH_FACTORY_GAUGES;
  const blockchainIds = [
    'ethereum',
    ...chainsToQuery,
  ];

  const [
    allPools,
    allLendingVaults,
    externalIncompleteGaugeListAddresses,
  ] = await Promise.all([
    getAllCurvePoolsData(blockchainIds),
    getAllCurveLendingVaultsData(blockchainIds),
    getExternalGaugeListAddresses(),
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
      if (gaugeData.lpTokenAddress !== ZERO_ADDRESS) {
        throw new Error(`Couldn’t match this LP token address with any Curve pool or lending vault address: ${gaugeData.lpTokenAddress} (gauge address: ${gaugeData.address})`)
      } else {
        return null;
      }
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
   * but have been deployed (they're in the metaregistry; well not all of them, hence the
   * other imports).
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
  const allGaugesEthereumStableNgFacto = await multiCall(allPools.filter(({ blockchainId }) => blockchainId === 'ethereum').map(({ address }) => ({
    address: stableNgFactoAddress,
    abi: META_REGISTRY_ABI,
    methodName: 'get_gauge',
    params: [address],
    metaData: { poolAddress: address },
    web3Data,
  })));

  const lendingEthereumFactoAddress = configs.ethereum.lendingVaultRegistries.oneway;
  const allGaugesEthereumLendingFacto = await multiCall(allLendingVaults.filter(({ blockchainId }) => blockchainId === 'ethereum').map(({ address }) => ({
    address: lendingEthereumFactoAddress,
    abi: LENDING_VAULT_FACTORY_GAUGE_FOR_VAULT_ABI,
    methodName: 'gauge_for_vault',
    params: [address],
    metaData: { poolAddress: address },
    web3Data,
  })));

  const nonVotedGaugesEthereum = [
    ...allGaugesEthereumMetaregistry,
    ...allGaugesEthereumStableNgFacto,
    ...allGaugesEthereumLendingFacto,
  ].filter(({ data }) => (
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
    const lendingVault = getLendingVaultByLpTokenAddress(poolAddress, 'ethereum');
    if (!pool && !lendingVault) {
      throw new Error(`MISSING POOL/VAULT: ${poolAddress}`);
    }

    const isPool = !!pool;

    const rawData = arrayToHashmap(nonVotedGaugesEthereumDataRaw.filter(({ metaData }) => lc(metaData.gaugeAddress) === lc(address)).map(({ data, metaData: { type } }) => [
      type,
      data,
    ]));

    const name = (
      isPool ?
        getPoolName(pool) :
        getLendingVaultName(lendingVault)
    );

    const lpTokenPrice = (
      isPool ?
        (pool.usdTotal / (pool.totalSupply / 1e18)) :
        lendingVault.vaultShares.pricePerShare
    );

    return [name, {
      ...(isPool ? {
        // Props shared by pools and lending vaults
        isPool,
        name,
        shortName: getPoolShortName(pool),

        // Props for pools only
        poolUrls: pool.poolUrls,
        poolAddress: pool.address,
        virtualPrice: pool.virtualPrice,
        factory: pool.factory || false,
        type: ((pool.registryId === 'crypto' || pool.registryId === 'factory-crypto') ? 'crypto' : 'stable'),
        swap: lc(poolAddress),
        swap_token: lc(pool.lpTokenAddress || pool.address),

        // Props for lending vaults only
        lendingVaultUrls: undefined,
        lendingVaultAddress: undefined,
      } : {
        // Props shared by pools and lending vaults
        isPool,
        name,
        shortName: getLendingVaultShortName(lendingVault),

        // Props for pools only
        poolUrls: undefined,
        poolAddress: undefined,
        virtualPrice: undefined,
        factory: undefined,
        type: undefined,
        swap: undefined,
        swap_token: undefined,

        // Props for lending vaults only
        lendingVaultUrls: lendingVault.lendingVaultUrls,
        lendingVaultAddress: lendingVault.address,
      }),
      lpTokenPrice,
      blockchainId: 'ethereum',
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

  /**
   * Step 4: Retrieve gauges from lite deployments that have CRV emissions
   */
  const liteDeploymentsGauges = await sequentialPromiseFlatMap(LITE_SIDECHAINS_WITH_CRV_EMISSIONS, async (chainId) => {
    const chainGauges = await Request.get(`https://api-core.curve.finance/v1/getPools/all/${chainId}`, undefined, {
      dispatcher: httpsAgentWithoutStrictSsl,
    })
      .then((response) => response.json())
      .then(({ data: { poolData } }) => (
        poolData.filter(({ gaugeAddress }) => !!gaugeAddress).map((pool) => {
          const name = getPoolName(pool);
          const shortName = getPoolShortName(pool);

          return {
            isPool: true,
            name,
            shortName,
            gauge: lc(pool.gaugeAddress),
            rootGauge: lc(pool.rootGaugeAddress),
            side_chain: true,
            gauge_data: {
              inflation_rate: pool.gaugeData.inflationRate,
              working_supply: pool.gaugeData.workingSupply,
            },
            gauge_controller: {
              gauge_relative_weight: pool.gaugeData.gaugeRelativeWeight,
              gauge_future_relative_weight: pool.gaugeData.gaugeFutureRelativeWeight,
              get_gauge_weight: pool.gaugeData.getGaugeWeight,
              inflation_rate: pool.gaugeData.inflationRate,
            },
            hasNoCrv: !pool.gaugeHasCrv,
            is_killed: pool.gaugeIsKilled,
            lpTokenPrice: pool.lpTokenPrice,
            gaugeCrvApy: pool.gaugeCrvApy,
            gaugeStatus: {
              areCrvRewardsStuckInBridge: false, // Hardcoded to false for lite deployments
              rewardsNeedNudging: false, // Hardcoded to false for lite deployments
            },
            blockchainId: pool.blockchainId,
            poolUrls: pool.poolUrls,
            swap: lc(pool.address),
            swap_token: lc(pool.lpTokenAddress),
            type: ((pool.registryId === 'crypto' || pool.registryId === 'factory-crypto') ? 'crypto' : 'stable'),
            factory: true,

            // Props for lending vaults only
            lendingVaultAddress: undefined,
            lendingVaultUrls: undefined,
          };
        })
      ))
      .catch((err) => {
        console.log('Error:')
        console.log(err)

        return [];
      });

    return chainGauges;
  }, 1);

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
          rootGauge,
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
            if (swap_token !== ZERO_ADDRESS) {
              throw new Error(`Couldn’t match this LP token address with any Curve pool or lending vault address: ${swap_token}`);
            }
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
              rootGauge: lc(rootGauge),
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
    ...arrayToHashmap(liteDeploymentsGauges.map((gauge) => [gauge.name, gauge])),
  };

  /**
  * Check if the list of gauges returned by this endpoint contains all gauges retrieved from curve-prices:
  * curve-prices doesn't return as many gauges as the present endpoint does, but making sure the present
  * endpoint returns *at least* all gauges from curve-prices is a good sanity check in case, for an unknown
  * reason, anything was to miss.
  */
  const allGaugesLcAddresses = Object.values(gauges).map(({ gauge }) => lc(gauge));
  const externalGaugesAddressesMinusIgnoredOnes = externalIncompleteGaugeListAddresses.filter((gaugeAddress) => !GAUGES_ADDRESSES_TO_IGNORE.some((gaugeAddress2) => lc(gaugeAddress2) === lc(gaugeAddress)));
  const passesSanityCheck = (
    externalGaugesAddressesMinusIgnoredOnes.every((gaugeAddress) => allGaugesLcAddresses.includes(lc(gaugeAddress)))
  );
  if (!passesSanityCheck) {
    console.log('Gauges are missing from the tentatively returned value from getAllGauges: throwing instead to serve old accurate data');
    console.log('Missing gauges addresses ↓');
    console.log(externalGaugesAddressesMinusIgnoredOnes.filter((gaugeAddress) => !allGaugesLcAddresses.includes(lc(gaugeAddress))));
    throw new Error('Gauges sanity check 1 error');
  }

  const passesSanityCheck2 = (
    allGaugesLcAddresses.length >= 1704 // Ugly hard limit to try to tame down that issue for good for now
  );
  if (!passesSanityCheck2) {
    console.log('Gauges are too few to be complete from the tentatively returned value from getAllGauges: throwing instead to serve old accurate data')
    console.log('Number of gauges ↓');
    console.log(allGaugesLcAddresses.length);
    throw new Error('Gauges sanity check 2 error');
  }

  return gauges;
}, {
  maxAge: 5 * 60,
  cacheKey: 'getAllGauges',
});

export default getAllGauges;
export {
  SIDECHAINS_WITH_FACTORY_GAUGES,
};
