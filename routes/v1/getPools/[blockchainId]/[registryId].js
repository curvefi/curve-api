/**
 * @openapi
 * /getPools/{blockchainId}/{registryId}:
 *   get:
 *     tags:
 *       - Pools
 *     description: |
 *       Returns information on all pools, in a specific registry, on a specific chain.
 *
 *       Note:
 *       - Doesn't work for Harmony: its 3pool isn't in the main registry, and Harmony is lacking a crypto registry
 *       - Doesn't work for Moonbeam: it's lacking a main registry
 *     parameters:
 *       - $ref: '#/components/parameters/blockchainId'
 *       - $ref: '#/components/parameters/registryId'
 *     responses:
 *       200:
 *         description:
 */

import Web3 from 'web3';
import BN from 'bignumber.js';
import swr from '#root/utils/swr.js';
import groupBy from 'lodash.groupby';
import { fn, ParamError } from '#root/utils/api.js';
import factoryV2RegistryAbi from '#root/constants/abis/factory-v2-registry.json' assert { type: 'json' };
import factoryPoolAbi from '#root/constants/abis/factory-v2/Plain2Balances.json' assert { type: 'json' };
import factoryCryptoRegistryAbi from '#root/constants/abis/factory-crypto-registry.json' assert { type: 'json' };
import factoryCrvusdRegistryAbi from '#root/constants/abis/factory-crvusd/registry.json' assert { type: 'json' };
import factoryTwocryptoRegistryAbi from '#root/constants/abis/factory-twocrypto/registry.json' assert { type: 'json' };
import factoryTricryptoRegistryAbi from '#root/constants/abis/factory-tricrypto/registry.json' assert { type: 'json' };
import factoryStableswapNgRegistryAbi from '#root/constants/abis/factory-stableswap-ng/registry.json' assert { type: 'json' };
import factoryEywaRegistryAbi from '#root/constants/abis/fantom/factory-eywa/registry.json' assert { type: 'json' };
import cryptoRegistryAbi from '#root/constants/abis/crypto-registry.json' assert { type: 'json' };
import factoryCryptoPoolAbi from '#root/constants/abis/factory-crypto/factory-crypto-pool-2.json' assert { type: 'json' };
import factoryTwocryptoPoolAbi from '#root/constants/abis/factory-twocrypto/pool.json' assert { type: 'json' };
import factoryTricryptoPoolAbi from '#root/constants/abis/factory-crypto/factory-crypto-pool-2.json' assert { type: 'json' };
import factoryStableNgPoolAbi from '#root/constants/abis/factory-stableswap-ng/pool.json' assert { type: 'json' };
import factoryCrvusdPoolAbi from '#root/constants/abis/factory-crvusd/pool.json' assert { type: 'json' };
import factoryEywaPoolAbi from '#root/constants/abis/fantom/factory-eywa/pool.json' assert { type: 'json' };
import erc20Abi from '#root/constants/abis/erc20.json' assert { type: 'json' };
import erc20AbiMKR from '#root/constants/abis/erc20_mkr.json' assert { type: 'json' };
import { multiCall } from '#root/utils/Calls.js';
import getPlatformRegistries from '#root/utils/data/curve-platform-registries.js';
import { ZERO_ADDRESS } from '#root/utils/Web3/index.js';
import { flattenArray, sum, arrayToHashmap, uniq, arrayOfIncrements } from '#root/utils/Array.js';
import { sequentialPromiseReduce, sequentialPromiseFlatMap, sequentialPromiseMap } from '#root/utils/Async.js';
import { getRegistry } from '#root/utils/getters.js';
import getAssetsPrices from '#root/utils/data/assets-prices.js';
import getTokensPrices from '#root/utils/data/tokens-prices.js';
import getYcTokenPrices from '#root/utils/data/getYcTokenPrices.js';
import getNapierTokenPrices from '#root/utils/data/getNapierTokenPrices.js';
import getCrvusdPrice from '#root/utils/data/getCrvusdPrice.js';
import getETHLSTAPYs from '#root/utils/data/getETHLSTAPYs.js';
import getDaiAPYs from '#root/utils/data/getDaiAPYs.js';
import getTempleTokenPrices from '#root/utils/data/getTempleTokenPrices.js';
import getSynthetixTokenPrices from '#root/utils/data/getSynthetixTokenPrices.js';
import getEywaTokenPrices from '#root/utils/data/getEywaTokenPrices.js';
import getMainRegistryPoolsFn from '#root/routes/v1/getMainRegistryPools.js';
import getMainRegistryPoolsAndLpTokensFn from '#root/routes/v1/getMainRegistryPoolsAndLpTokens.js';
import getMainPoolsGaugeRewardsFn from '#root/routes/v1/getMainPoolsGaugeRewards.js';
import getAllGaugesFn, { SIDECHAINS_WITH_FACTORY_GAUGES } from '#root/routes/v1/getAllGauges.js';
import configs from '#root/constants/configs/index.js'
import allCoins from '#root/constants/coins/index.js'
import POOLS_ZAPS from '#root/constants/pools-zaps/index.js';
import COIN_ADDRESS_COINGECKO_ID_MAP from '#root/constants/CoinAddressCoingeckoIdMap.js';
import { getHardcodedPoolId } from '#root/constants/PoolAddressInternalIdMap.js';
import { deriveMissingCoinPrices, getImplementation } from '#root/routes/v1/getPools/_utils.js';
import { lc } from '#root/utils/String.js';
import getCurvePrices from '#root/utils/data/curve-prices.js';
import { IS_DEV } from '#root/constants/AppConstants.js';
import { getAugmentedCoinsFirstPass, getAugmentedCoinsSecondPass } from '../_augmentedCoinsUtils.js';
import toSpliced from 'core-js-pure/actual/array/to-spliced.js'; // For compat w/ Node 18
import getPricesCurveFiChainsBlockchainId from '#root/utils/data/prices.curve.fi/chains.js';
import {
  getPoolAssetTypesFromExternalStore,
  getPoolCreationTsAndBlockFromExternalStore,
} from '#root/utils/data/prices.curve.fi/pools-metadata.js';

/* eslint-disable */
const POOL_BALANCE_ABI_UINT256 = [{ "gas": 1823, "inputs": [{ "name": "arg0", "type": "uint256" }], "name": "balances", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }];
const POOL_BALANCE_ABI_INT128 = [{ "gas": 1823, "inputs": [{ "name": "arg0", "type": "int128" }], "name": "balances", "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }];
const POOL_PRICE_ORACLE_NO_ARGS_ABI = [{ "stateMutability": "view", "type": "function", "name": "price_oracle", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] }];
const POOL_PRICE_ORACLE_WITH_ARGS_ABI = [{ "stateMutability": "view", "type": "function", "name": "price_oracle", "inputs": [{ "name": "k", "type": "uint256" }], "outputs": [{ "name": "", "type": "uint256" }] }];
const POOL_TOKEN_METHOD_ABI = [{ "stateMutability": "view", "type": "function", "name": "token", "inputs": [], "outputs": [{ "name": "", "type": "address" }], "gas": 468 }, { "stateMutability": "view", "type": "function", "name": "lp_token", "inputs": [], "outputs": [{ "name": "", "type": "address" }], "gas": 468 }];
const POOL_NAME_METHOD_ABI = [{ "stateMutability": "view", "type": "function", "name": "name", "inputs": [], "outputs": [{ "name": "", "type": "string" }] }];
const POOL_SYMBOL_METHOD_ABI = [{ "stateMutability": "view", "type": "function", "name": "symbol", "inputs": [], "outputs": [{ "name": "", "type": "string" }] }];
const POOL_TOTALSUPPLY_METHOD_ABI = [{ "name": "totalSupply", "outputs": [{ "type": "uint256", "name": "" }], "inputs": [], "stateMutability": "view", "type": "function" }];
const REGISTRY_GET_IMPLEMENTATION_ADDRESS_ABI = [factoryV2RegistryAbi.find(({ name }) => name === 'get_implementation_address')]
const REGISTRY_GET_TOKEN_METHOD_ABI = [factoryCryptoRegistryAbi.find(({ name }) => name === 'get_token')]
const REGISTRY_GET_LP_TOKEN_METHOD_ABI = [cryptoRegistryAbi.find(({ name }) => name === 'get_lp_token')]
const ORACLIZED_POOL_DETECTION_ABI = [{ "stateMutability": "view", "type": "function", "name": "oracle_method", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] }];
/* eslint-enable */
/* eslint-disable object-curly-newline, camelcase */

const MAX_AGE = 5 * 60;

// Chains for which curve-prices is used as only data source for coins usd prices
const CURVE_PRICES_AVAILABLE_CHAIN_IDS = [
  // 'ethereum',
];

const IGNORED_COINS = {
  polygon: [
    '0x8dacf090f8803f53ee3c44f0d7a07b9d70453c42', // spam
  ].map(lc),
  ethereum: [
    '0xc7D9c108D4E1dD1484D3e2568d7f74bfD763d356', // depegged stable, incorrect price on defillama
  ].map(lc),
};

// Tokens for which to use Defillama as external price oracle
const EXTERNAL_ORACLE_COINS_ADDRESSES = {
  ethereum: [
    '0xc2544a32872a91f4a553b404c6950e89de901fdb', // FPIS (no liquid curve crypto pool to act as oracle)
    '0xa0d69e286b938e21cbf7e51d71f6a4c8918f482f', // eUSD (no curve crypto pool to act as oracle)
    '0x530824da86689c9c17cdc2871ff29b058345b44a', // sTBT (curve crypto pool that has precedence has low liq)
    '0xa35b1b31ce002fbf2058d22f30f95d405200a15b', // ETHx (curve crypto pool that has precedence has low liq)
    '0xE80C0cd204D654CEbe8dd64A4857cAb6Be8345a3', // JPEG
    '0x821A278dFff762c76410264303F25bF42e195C0C', // pETH
    '0x6c3ea9036406852006290770bedfcaba0e23a0e8', // pyUSD
  ].map(lc),
  base: [
    '0xcfa3ef56d303ae4faaba0592388f19d7c3399fb4',
  ].map(lc),
  fraxtal: [].map(lc),
};

// Lowercase token address <> symbol to use
const CURVE_POOL_LP_SYMBOLS_OVERRIDES = new Map([
  ['0x3175df0976dfa876431c2e9ee6bc45b65d3473cc', 'FRAXBP'],
  ['0x075b1bb99792c9e1041ba13afef80c91a1e70fb3', 'sbtcCrv'],
  ['0x051d7e5609917bd9b73f04bac0ded8dd46a74301', 'sbtc2Crv'],
]);

// Lowercase token address <> symbol to use
const CURVE_POOL_SYMBOLS_OVERRIDES = new Map([
  ['kava-0xfa9343c3897324496a05fc75abed6bac29f8a40f', 'multiUSDC'],
  ['kava-0x765277eebeca2e31912c9946eae1021199b39c61', 'multiDAI'],
  ['kava-0xb44a9b6905af7c801311e8f4e76932ee959c663c', 'multiUSDT'],
  ['arbitrum-0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', 'USDC.e'],
  ['polygon-0x2791bca1f2de4661ed88a30c99a7a9449aa84174', 'USDC.e'],
  ['optimism-0x7f5c764cbc14f9669b88837ca1490cca17c31607', 'USDC.e'],
]);

const overrideSymbol = (coin, blockchainId) => ({
  ...coin,
  symbol: (
    CURVE_POOL_LP_SYMBOLS_OVERRIDES.get(lc(coin.address)) ||
    CURVE_POOL_SYMBOLS_OVERRIDES.get(`${blockchainId}-${lc(coin.address)}`) ||
    coin.symbol
  ),
});

const getEthereumOnlyData = async ({ preventQueryingFactoData, blockchainId }) => {
  const USE_CURVE_PRICES_DATA = CURVE_PRICES_AVAILABLE_CHAIN_IDS.includes(blockchainId);

  let gaugesData = {};
  let gaugeRewards = {};

  if (!preventQueryingFactoData) {
    const getFactoryV2GaugeRewards = (
      blockchainId === 'ethereum' ?
        (await import('#root/utils/data/getFactoryV2GaugeRewards.js')).default :
        (await import('#root/utils/data/getFactoryV2SidechainGaugeRewards.js')).default
    );

    gaugesData = (
      (blockchainId === 'ethereum' || SIDECHAINS_WITH_FACTORY_GAUGES.includes(blockchainId)) ?
        await getAllGaugesFn.straightCall({ blockchainId }) :
        {}
    );

    if (blockchainId === 'ethereum') {
      const factoryGauges = Array.from(Object.values(gaugesData)).filter(({ side_chain }) => !side_chain);
      const factoryGaugesAddresses = factoryGauges.map(({ gauge }) => gauge).filter((s) => s); // eslint-disable-line no-param-reassign

      gaugeRewards = await getFactoryV2GaugeRewards({ blockchainId, factoryGaugesAddresses });
    } else {
      const factoryGauges = Array.from(Object.values(gaugesData)).filter(({ side_chain }) => side_chain);

      gaugeRewards = await getFactoryV2GaugeRewards({ blockchainId, gauges: factoryGauges });
    }
  }

  const { poolList: mainRegistryPoolList } = await getMainRegistryPoolsFn.straightCall({ blockchainId });
  const mainRegistryPoolGaugesRewards = (
    blockchainId === 'ethereum' ?
      (await getMainPoolsGaugeRewardsFn.straightCall({ gauges: gaugesData })).mainPoolsGaugeRewards :
      {}
  );

  const gaugesDataArray = Array.from(Object.values(gaugesData));
  const factoryGaugesPoolAddressesAndCoingeckoIdMap = arrayToHashmap(
    gaugesDataArray
      .filter(({ factory, type }) => (
        factory === true &&
        type !== 'stable' && // Harcoded type in the gauge endpoint that is *not* a coingecko id
        type !== 'crypto' // Harcoded type in the gauge endpoint that is *not* a coingecko id
      ))
      .map(({ swap, type: coingeckoId }) => [swap, coingeckoId])
  );

  let factoryGaugesPoolAddressesAndAssetPricesMap;
  if (!USE_CURVE_PRICES_DATA) {
    const gaugesAssetPrices = await getAssetsPrices(Array.from(Object.values(factoryGaugesPoolAddressesAndCoingeckoIdMap)));
    factoryGaugesPoolAddressesAndAssetPricesMap = arrayToHashmap(
      Array.from(Object.entries(factoryGaugesPoolAddressesAndCoingeckoIdMap))
        .map(([address, coingeckoId]) => [
          address.toLowerCase(),
          gaugesAssetPrices[coingeckoId],
        ])
    );
  }

  return {
    mainRegistryPoolList: mainRegistryPoolList.map((address) => address.toLowerCase()),
    gaugesDataArray,
    gaugeRewards: {
      ...gaugeRewards,
      ...mainRegistryPoolGaugesRewards,
    },
    factoryGaugesPoolAddressesAndAssetPricesMap,
  };
};

const getEthereumOnlyDataSwr = async ({ preventQueryingFactoData, blockchainId }) => (
  (await swr(
    `getEthereumOnlyData-${blockchainId}-${preventQueryingFactoData}`,
    () => getEthereumOnlyData({ preventQueryingFactoData, blockchainId }),
    { minTimeToStale: MAX_AGE * 1000 } // See CacheSettings.js
  )).value
);

const isDefinedCoin = (address) => address !== '0x0000000000000000000000000000000000000000';

/**
 * Params:
 * - blockchainId: 'ethereum' (default) | any side chain
 * - registryId: 'factory' | 'main' | 'crypto' | 'factory-crypto' | 'factory-crvusd' | 'factory-twocrypto' | 'factory-tricrypto' | 'factory-eywa' | 'factory-stable-ng
 *
 * 'factory-crvusd', 'factory-twocrypto', 'factory-tricrypto' and 'factory-eywa' are custom factories that aren't meant to be found on all chains
 */
const getPools = async ({ blockchainId, registryId, preventQueryingFactoData }) => {
  const config = configs[blockchainId];
  if (typeof config === 'undefined') {
    throw new ParamError(`No config data for blockchainId "${blockchainId}"`);
  }

  if (config.hasNoMainRegistry && registryId === 'main') {
    return {
      poolData: [],
      tvlAll: 0,
      tvl: 0,
    };
  }

  const USE_CURVE_PRICES_DATA = CURVE_PRICES_AVAILABLE_CHAIN_IDS.includes(blockchainId);

  const {
    nativeCurrencySymbol,
    platformCoingeckoId,
    rpcUrl,
    backuprpcUrl,
    factoryImplementationAddressMap: implementationAddressMap,
    getFactoryRegistryAddress,
    getCryptoRegistryAddress,
    getFactoryCryptoRegistryAddress,
    getFactoryCrvusdRegistryAddress,
    getFactoryTwocryptoRegistryAddress,
    getFactoryTricryptoRegistryAddress,
    getFactoryStableswapNgRegistryAddress,
    getFactoryEywaRegistryAddress,
    multicall2Address,
    BASE_POOL_LP_TO_GAUGE_LP_MAP,
    DISABLED_POOLS_ADDRESSES,
    BROKEN_POOLS_ADDRESSES,
  } = config;

  const platformRegistries = (await getPlatformRegistries(blockchainId)).registryIds;

  if (!platformRegistries.includes(registryId)) {
    if (IS_DEV) console.error(`No registry "${registryId}" found for blockchainId "${blockchainId}"`);
    return { poolData: [] };
  }

  const assetTypeMap = new Map([
    ['0', 'usd'],
    ['1', nativeCurrencySymbol.toLowerCase()],
    ['2', 'btc'],
    ['3', 'other'],
  ]);

  const registryAddress = (
    registryId === 'factory' ? await getFactoryRegistryAddress() :
      registryId === 'main' ? await getRegistry({ blockchainId }) :
        registryId === 'crypto' ? await getCryptoRegistryAddress() :
          registryId === 'factory-crypto' ? await getFactoryCryptoRegistryAddress() :
            registryId === 'factory-crvusd' ? await getFactoryCrvusdRegistryAddress() :
              registryId === 'factory-twocrypto' ? await getFactoryTwocryptoRegistryAddress() :
                registryId === 'factory-tricrypto' ? await getFactoryTricryptoRegistryAddress() :
                  registryId === 'factory-stable-ng' ? await getFactoryStableswapNgRegistryAddress() :
                    registryId === 'factory-eywa' ? await getFactoryEywaRegistryAddress() :
                      undefined
  );
  if (registryAddress === ZERO_ADDRESS || !registryAddress) return { poolData: [], tvlAll: 0 };

  const getIdForPool = (id) => (
    registryId === 'factory' ? `factory-v2-${id}` :
      registryId === 'main' ? `${id}` :
        registryId === 'crypto' ? `crypto-${id}` :
          registryId === 'factory-crypto' ? `factory-crypto-${id}` :
            registryId === 'factory-crvusd' ? `factory-crvusd-${id}` :
              registryId === 'factory-twocrypto' ? `factory-twocrypto-${id}` :
                registryId === 'factory-tricrypto' ? `factory-tricrypto-${id}` :
                  registryId === 'factory-stable-ng' ? `factory-stable-ng-${id}` :
                    registryId === 'factory-eywa' ? `factory-eywa-${id}` :
                      undefined
  );

  const POOL_ABI = (
    registryId === 'factory-crypto' ? factoryCryptoPoolAbi :
      registryId === 'factory-crvusd' ? factoryCrvusdPoolAbi :
        registryId === 'factory-twocrypto' ? factoryTwocryptoPoolAbi :
          registryId === 'factory-tricrypto' ? factoryTricryptoPoolAbi :
            registryId === 'getFactoryStableswapNgRegistryAddress' ? factoryStableNgPoolAbi :
              registryId === 'factory-eywa' ? factoryEywaPoolAbi :
                factoryPoolAbi
  );

  const REGISTRY_ABI = (
    registryId === 'factory-crypto' ? factoryCryptoRegistryAbi :
      registryId === 'factory-crvusd' ? factoryCrvusdRegistryAbi :
        registryId === 'factory-twocrypto' ? factoryTwocryptoRegistryAbi :
          registryId === 'factory-tricrypto' ? [
            ...factoryTricryptoRegistryAbi,
            ...REGISTRY_GET_IMPLEMENTATION_ADDRESS_ABI, // Hack, see get_implementation_address call for factory-tricrypto for context
          ] :
            registryId === 'factory-eywa' ? factoryEywaRegistryAbi :
              registryId === 'factory-stable-ng' ? factoryStableswapNgRegistryAbi :
                registryId === 'crypto' ? cryptoRegistryAbi :
                  factoryV2RegistryAbi
  );


  const web3 = new Web3(rpcUrl);
  const registry = new web3.eth.Contract(REGISTRY_ABI, registryAddress);

  const networkSettingsParam = (
    typeof multicall2Address !== 'undefined' ?
      { networkSettings: { web3, multicall2Address } } :
      undefined
  );

  const { poolsAndLpTokens: mainRegistryPoolsAndLpTokens } = await getMainRegistryPoolsAndLpTokensFn.straightCall({ blockchainId });

  // Retrieve base pools if any
  let basePoolAddresses = [];
  let finalBasePoolLpAddresses = [];
  const registrySupportsBasePools = REGISTRY_ABI.some(({ name }) => name === 'base_pool_count');

  if (registrySupportsBasePools) {
    const [basePoolCount] = await multiCall([{
      contract: registry,
      methodName: 'base_pool_count',
      ...networkSettingsParam,
    }]);

    if (basePoolCount > 0) {
      const basePoolIds = arrayOfIncrements(basePoolCount);
      basePoolAddresses = (await multiCall(basePoolIds.map((id) => ({
        contract: registry,
        methodName: 'base_pool_list',
        params: [id],
        ...networkSettingsParam,
      })))).map(lc);

      // This array contains all different lp token retrieval methods as used for individual
      // pools further down this script.
      const basePoolLpAddressesRaw = await multiCall(flattenArray(basePoolAddresses.map((address) => [{
        address,
        abi: POOL_TOKEN_METHOD_ABI,
        methodName: 'token', // address
        metaData: { address, type: 'lpTokenAddress_try_1' }, // For main registry #1
        ...networkSettingsParam,
      }, {
        address,
        abi: POOL_TOKEN_METHOD_ABI,
        methodName: 'lp_token', // address
        metaData: { address, type: 'lpTokenAddress_try_2' }, // For main registry #1
        superSettings: {
          fallbackValue: (
            mainRegistryPoolsAndLpTokens.some(({ address: mainRegAddress, lpTokenAddress }) => (mainRegAddress.toLowerCase() === address.toLowerCase() && lpTokenAddress.toLowerCase() !== mainRegAddress.toLowerCase())) ? mainRegistryPoolsAndLpTokens.find(({ address: mainRegAddress }) => mainRegAddress.toLowerCase() === address.toLowerCase()).lpTokenAddress : undefined),
        },
        ...networkSettingsParam,
      }, {
        address: registryAddress,
        abi: REGISTRY_GET_TOKEN_METHOD_ABI,
        methodName: 'get_token', // address
        params: [address],
        metaData: { address, type: 'lpTokenAddress_try_3' }, // For factory-crypto registry
        ...networkSettingsParam,
      }, {
        address: registryAddress,
        abi: REGISTRY_GET_LP_TOKEN_METHOD_ABI,
        methodName: 'get_lp_token', // address
        params: [address],
        metaData: { address, type: 'lpTokenAddress_try_4' }, // For crypto registry
        ...networkSettingsParam,
      }])));

      // Make some small changes to received data
      const basePoolLpAddresses = basePoolLpAddressesRaw.map(({ data, metaData }) => {
        // If address isn't null, use this as the definitive lpTokenAddress value
        if (data !== ZERO_ADDRESS) {
          return { data, metaData };
        }

        // If address is null, drop it
        return null;
      }).filter((o) => o !== null);

      finalBasePoolLpAddresses = [
        ...basePoolAddresses.filter((address) => !basePoolLpAddresses.some(({ metaData }) => lc(metaData.address) === lc(address))),
        ...basePoolLpAddresses.map(({ data }) => data),
      ].map(lc);
    }
  }

  const {
    [allCoins.crv.coingeckoId]: crvPrice,
  } = await getAssetsPrices([allCoins.crv.coingeckoId]);

  const poolCount = Number((await multiCall([{
    contract: registry,
    methodName: 'pool_count',
    ...networkSettingsParam,
  }]))[0]);
  if (poolCount === 0) return { poolData: [], tvlAll: 0, tvl: 0 };

  const unfilteredPoolIds = Array(poolCount).fill(0).map((_, i) => i);

  const unfilteredPoolAddresses = await multiCall(unfilteredPoolIds.map((id) => ({
    contract: registry,
    methodName: 'pool_list',
    params: [id],
    ...networkSettingsParam,
  })));

  // Filter out broken pools, see reason for each in DISABLED_POOLS_ADDRESSES definition
  const poolAddresses = unfilteredPoolAddresses.filter((address) => (
    !DISABLED_POOLS_ADDRESSES.includes(address.toLowerCase())
  ));
  const poolIds = unfilteredPoolIds.filter((id) => (
    !DISABLED_POOLS_ADDRESSES.includes(unfilteredPoolAddresses[id]?.toLowerCase())
  ));

  const [
    ethereumOnlyData,
    pricesCurveFiPoolData,
  ] = await Promise.all([
    getEthereumOnlyDataSwr({ preventQueryingFactoData, blockchainId }),
    getPricesCurveFiChainsBlockchainId(blockchainId),
  ]);

  let mainRegistryLpTokensPricesMap;
  let otherRegistryTokensPricesMap;
  let otherRegistryPoolsData;
  if (!USE_CURVE_PRICES_DATA) {
    /**
    * We use pools from other registries as a fallback data source for the current registry.
    * Registries depend on each other in the following one-way fashion to prevent circular dependencies:
    * main <- crypto <- factory-crypto <- factory
    * So main does not depend on other registries, crypto only depends on main, factory-crypto
    * depends on the two previous, and factory on all three others.
    * With this order of precedence, any asset can be priced automatically by simply having
    * a crypto factory pool against any popular asset (like eth/usdc/etc) which makes sense in most
    * cases anyway. E.g. cvxCRV is automatically priced because there's a CRV/ETH pool to price CRV
    * against ETH, and a CRV/cvxCRV pool to price cvxCRV against CRV.
    */
    const REGISTRIES_DEPENDENCIES = {
      main: [],
      crypto: ['main'],
      'factory-crvusd': ['main'], // This factory will have limited pools, for which main registry holds enough coin pricings
      'factory-eywa': ['main'], // This factory will have limited pools, for which main registry holds enough coin pricings
      'factory-crypto': ['main', 'crypto', 'factory-crvusd'],
      factory: ['main', 'crypto', 'factory-crypto', 'factory-crvusd'],
      'factory-tricrypto': ['main', 'factory-crvusd', 'factory'],
      'factory-stable-ng': ['main', 'factory-crvusd', 'factory', 'factory-crypto'],
      'factory-twocrypto': ['main', 'factory-crvusd', 'factory', 'factory-stable-ng'],
    };
    otherRegistryPoolsData = await sequentialPromiseFlatMap(REGISTRIES_DEPENDENCIES[registryId], async (id) => (
      // eslint-disable-next-line no-use-before-define
      (await getPoolsFn.straightCall({ blockchainId, registryId: id, preventQueryingFactoData: true })).poolData.map((poolData) => ({
        ...poolData,
        registryId: id,
      }))
    ));

    mainRegistryLpTokensPricesMap = arrayToHashmap(otherRegistryPoolsData.map((pool) => {
      const {
        address,
        totalSupply,
        usdTotal,
        registryId: poolRegistryId,
      } = pool;

      const matchingPool = (
        poolRegistryId === 'main' ? mainRegistryPoolsAndLpTokens.find(({ address: addressB }) => (
          addressB.toLowerCase() === address.toLowerCase()
        )) :
          poolRegistryId === 'crypto' ? pool :
            poolRegistryId === 'factory-stable-ng' ? pool :
              null
      );

      if (!matchingPool) return null;

      return [
        matchingPool.lpTokenAddress.toLowerCase(),
        (usdTotal / (totalSupply / 1e18)),
      ];
    }).filter((o) => o !== null));

    otherRegistryTokensPricesMap = arrayToHashmap(Array.from(otherRegistryPoolsData.reduce((accu, {
      coins,
      usdTotal,
    }) => {
      coins.forEach(({ address, usdPrice }) => {
        if (usdPrice !== null && !Number.isNaN(usdPrice) && usdTotal > 5000) {
          const lcAddress = address.toLowerCase();
          const tokenUsdPrices = accu.get(lcAddress) || [];

          accu.set(lcAddress, [
            ...tokenUsdPrices,
            { usdPrice, poolUsdTotal: usdTotal },
          ]);
        }
      });

      return accu;
    }, new Map()).entries()).map(([lcAddress, tokenUsdPrices]) => [
      lcAddress,
      tokenUsdPrices.sort(({ poolUsdTotal: poolUsdTotalA }, { poolUsdTotal: poolUsdTotalB }) => (
        poolUsdTotalA > poolUsdTotalB ? -1 :
          poolUsdTotalB > poolUsdTotalA ? 1 : 0
      ))[0].usdPrice,
    ]));
  } else {
    const METAPOOL_REGISTRIES_DEPENDENCIES = {
      main: [],
      default: ['main'],
    };

    const metapoolRegistryDependencies = (
      METAPOOL_REGISTRIES_DEPENDENCIES[registryId] ||
      METAPOOL_REGISTRIES_DEPENDENCIES.default
    );

    otherRegistryPoolsData = await sequentialPromiseFlatMap(metapoolRegistryDependencies, async (id) => (
      // eslint-disable-next-line no-use-before-define
      (await getPoolsFn.straightCall({ blockchainId, registryId: id, preventQueryingFactoData: true })).poolData.map((poolData) => ({
        ...poolData,
        registryId: id,
      }))
    ));
  }

  const poolDataWithTries = await multiCall(flattenArray(poolAddresses.map((address, i) => {
    const poolId = poolIds[i];
    const poolContract = new web3.eth.Contract([
      ...POOL_ABI,
      ...POOL_TOKEN_METHOD_ABI,
      ...POOL_NAME_METHOD_ABI,
      ...POOL_SYMBOL_METHOD_ABI,
      ...POOL_TOTALSUPPLY_METHOD_ABI,
      ...ORACLIZED_POOL_DETECTION_ABI,
    ], address);

    // Note: reverting for at least some pools, prob non-meta ones: get_underlying_coins, get_underlying_decimals
    return [{
      contract: registry,
      methodName: 'get_coins', // address[4]
      params: [address],
      metaData: { poolId, type: 'coinsAddresses', address },
      ...networkSettingsParam,
    }, {
      contract: registry,
      methodName: 'get_decimals', // address[4]
      params: [address],
      metaData: { poolId, type: 'decimals' },
      ...networkSettingsParam,
    }, {
      contract: poolContract,
      methodName: 'get_virtual_price',
      metaData: { poolId, type: 'virtualPrice' },
      ...networkSettingsParam,
    }, {
      contract: poolContract,
      methodName: 'A',
      metaData: { poolId, type: 'amplificationCoefficient' },
      ...networkSettingsParam,
    }, {
      contract: poolContract,
      methodName: 'oracle_method',
      metaData: { poolId, type: 'oracleMethod' },
      ...networkSettingsParam,
    },
    ...(
      (registryId === 'main' || registryId === 'factory' || registryId === 'factory-crvusd' || registryId === 'factory-eywa' || registryId === 'factory-stable-ng') ? [{
        contract: registry,
        methodName: 'get_underlying_decimals', // address[8]
        params: [address],
        metaData: { poolId, type: 'underlyingDecimals' },
        ...networkSettingsParam,
      }, {
        contract: poolContract,
        methodName: 'totalSupply',
        metaData: { poolId, type: 'totalSupply' },
        ...networkSettingsParam,
      }, {
        contract: poolContract,
        methodName: 'name',
        metaData: { poolId, type: 'name' },
        ...networkSettingsParam,
      }] : []
    ),
    ...(
      (registryId === 'main' || registryId === 'factory' || registryId === 'factory-crvusd' || registryId === 'factory-eywa') ? [{
        contract: registry,
        methodName: 'get_pool_asset_type', // uint256
        params: [address],
        metaData: { poolId, type: 'assetType' },
        ...networkSettingsParam,
      }] : []
    ),
    ...(
      (registryId === 'factory-stable-ng') ? [{
        contract: registry,
        methodName: 'get_pool_asset_types',
        params: [address],
        metaData: { poolId, type: 'assetTypes' },
        ...networkSettingsParam,
      }] : []
    ),
    ...(
      (registryId === 'factory' || registryId === 'factory-crvusd' || registryId === 'factory-eywa' || registryId === 'factory-stable-ng') ? [{
        contract: registry,
        methodName: 'get_implementation_address', // address
        params: [address],
        metaData: { poolId, type: 'implementationAddress' },
        ...networkSettingsParam,
      }, {
        contract: poolContract,
        methodName: 'symbol',
        metaData: { poolId, type: 'symbol' },
        ...networkSettingsParam,
      }] : [] // Not fetching totalSupply for main pools because not all pool implementations have a lp token
    ),
    ...(
      registryId === 'factory-tricrypto' ? [{
        contract: poolContract,
        methodName: 'name',
        metaData: { poolId, type: 'name' },
        ...networkSettingsParam,
      }, {
        contract: poolContract,
        methodName: 'symbol',
        metaData: { poolId, type: 'symbol' },
        ...networkSettingsParam,
      }, {
        contract: poolContract,
        methodName: 'totalSupply',
        metaData: { poolId, type: 'totalSupply' },
        ...networkSettingsParam,
      }, {
        contract: registry,
        methodName: 'get_implementation_address',
        params: [address],
        metaData: { poolId, type: 'implementationAddress' },
        ...networkSettingsParam,
        // factory-tricrypto pools on mainnet do not have any view method to read their implementation; currently
        // there's only one implementation available in this registry, so we hardcode it by querying
        // an unexisting method and falling back to the desired value, but we'll need to find
        // another way when another implementation is added.
        superSettings: {
          fallbackValue: '0x66442B0C5260B92cAa9c234ECf2408CBf6b19a6f',
        },
      }] : []
    ),
    ...(
      registryId === 'factory-twocrypto' ? [{
        contract: poolContract,
        methodName: 'name',
        metaData: { poolId, type: 'name' },
        ...networkSettingsParam,
      }, {
        contract: poolContract,
        methodName: 'symbol',
        metaData: { poolId, type: 'symbol' },
        ...networkSettingsParam,
      }, {
        contract: poolContract,
        methodName: 'totalSupply',
        metaData: { poolId, type: 'totalSupply' },
        ...networkSettingsParam,
      }, {
        contract: registry,
        methodName: 'pool_implementations',
        params: [address],
        metaData: { poolId, type: 'implementationAddress', registryId },
      }] : []
    ),
    ...(
      // Different abis exist for these older pools, try to retrieve lpTokenAddress
      // from different methods
      registryId === 'main' ? [{
        contract: poolContract,
        methodName: 'token', // address
        metaData: { poolId, type: 'lpTokenAddress_try_1' },
        ...networkSettingsParam,
      }, {
        contract: poolContract,
        methodName: 'lp_token', // address
        metaData: { poolId, type: 'lpTokenAddress_try_2' },
        superSettings: {
          fallbackValue: (
            mainRegistryPoolsAndLpTokens.some(({ address: mainRegAddress, lpTokenAddress }) => (mainRegAddress.toLowerCase() === address.toLowerCase() && lpTokenAddress.toLowerCase() !== mainRegAddress.toLowerCase())) ? mainRegistryPoolsAndLpTokens.find(({ address: mainRegAddress }) => mainRegAddress.toLowerCase() === address.toLowerCase()).lpTokenAddress : undefined),
        },
        ...networkSettingsParam,
      }] : []
    ),
    ...(
      registryId === 'factory-crypto' ? [{
        contract: registry,
        methodName: 'get_token', // address
        params: [address],
        metaData: { poolId, type: 'lpTokenAddress' },
        ...networkSettingsParam,
      }, {
        contract: registry,
        methodName: 'pool_implementation', // address
        metaData: { poolId, type: 'implementationAddress' },
        ...networkSettingsParam,
      }] : []
    ),
    ...(
      registryId === 'crypto' ? [{
        contract: registry,
        methodName: 'get_lp_token', // address
        params: [address],
        metaData: { poolId, type: 'lpTokenAddress' },
        ...networkSettingsParam,
      }] : []
    )];
  })));

  const poolDataWithTries2 = registryId === 'factory-stable-ng' ? [] : await multiCall(flattenArray(poolAddresses.map((address) => {
    const poolCoinsAddressesData = poolDataWithTries.find(({ metaData }) => (
      metaData.type === 'coinsAddresses' &&
      address === metaData.address
    ));
    const poolCoinsCount = poolCoinsAddressesData.data.filter((coinAddress) => coinAddress !== '0x0000000000000000000000000000000000000000').length;
    const poolHasMultipleOracles = poolCoinsCount > 2;
    const poolContractForPriceOracleCall = new web3.eth.Contract(poolHasMultipleOracles ? POOL_PRICE_ORACLE_WITH_ARGS_ABI : POOL_PRICE_ORACLE_NO_ARGS_ABI, address);

    // Note: reverting for at least some pools, prob non-meta ones: get_underlying_coins, get_underlying_decimals
    return [
      {
        contract: poolContractForPriceOracleCall,
        methodName: 'price_oracle', // uint256
        params: poolHasMultipleOracles ? [0] : [], // Price oracle for first asset, there are N-1 oracles so we can fetch more if needed
        metaData: { poolId: poolCoinsAddressesData.metaData.poolId, type: 'priceOracle' },
        ...networkSettingsParam,
        superSettings: {
          fallbackValue: null, // Don't default to 0 for pools without price_oracle
        },
      },
      // There are N-1 oracles
      ...(poolHasMultipleOracles ? arrayOfIncrements(poolCoinsCount - 1).map((i) => ({
        contract: poolContractForPriceOracleCall,
        methodName: 'price_oracle', // uint256
        params: [i],
        metaData: { poolId: poolCoinsAddressesData.metaData.poolId, type: 'priceOracles', index: i },
        ...networkSettingsParam,
        superSettings: {
          fallbackValue: null, // Don't default to 0 for pools without price_oracle
        },
      })) : []),
    ];
  })));

  // Make some small changes to received data
  const poolData = [...poolDataWithTries, ...poolDataWithTries2].map(({ data, metaData }) => {
    const isLpTokenAddressTry = metaData.type?.startsWith('lpTokenAddress_try_');
    if (isLpTokenAddressTry) {
      // If address isn't null, use this as the definitive lpTokenAddress value
      if (data !== ZERO_ADDRESS) {
        return {
          data,
          metaData: {
            ...metaData,
            type: 'lpTokenAddress',
          },
        };
      }

      // If address is null, drop it
      return null;
    }

    /**
     * The two-crypto facto has a known issue with pool_implementations()
     * that returns the zero address. This catches this situation and
     * replaces zero address with this factory's first pool implementation.
     */
    const isUnavailableTwoCryptoFactoPoolImplementation = (
      metaData.type === 'implementationAddress' &&
      metaData.registryId === 'factory-twocrypto' &&
      data === ZERO_ADDRESS
    );
    if (isUnavailableTwoCryptoFactoPoolImplementation) {
      return {
        data: '0x04Fd6beC7D45EFA99a27D29FB94b55c56dD07223',
        metaData,
      };
    }

    return { data, metaData };
  }).filter((o) => o !== null);

  const tweakedPoolData = (
    (registryId === 'factory' && typeof BASE_POOL_LP_TO_GAUGE_LP_MAP !== 'undefined') ?
      // coinsAddresses doesn’t contain the lp token on factory registry, add it
      poolData.map(({ data, metaData }) => {
        if (metaData.type === 'coinsAddresses') {
          const { data: poolImplementationAddress } = poolData.find((d) => (
            d.metaData.poolId === metaData.poolId &&
            d.metaData.type === 'implementationAddress'
          ));

          const implementation = implementationAddressMap.get(poolImplementationAddress.toLowerCase());

          const isMetaPool = (
            implementation === 'metausd' ||
            implementation === 'metausdbalances' ||
            implementation === 'metabtc' ||
            implementation === 'metabtcbalances' ||
            implementation.startsWith('metausdstableng')
          );

          const isUsdMetaPool = isMetaPool && implementation.startsWith('metausd');
          const isBtcMetaPool = isMetaPool && implementation.startsWith('metabtc');

          const coinsAddresses = [...data];

          const [
            metaUsdLpTokenAddress,
            metaBtcLpTokenAddress,
          ] = Array.from(BASE_POOL_LP_TO_GAUGE_LP_MAP.keys());
          if (isUsdMetaPool) coinsAddresses[1] = metaUsdLpTokenAddress;
          if (isBtcMetaPool) coinsAddresses[1] = metaBtcLpTokenAddress;

          return {
            data: coinsAddresses,
            metaData,
          };
        }

        return { data, metaData };
      }) :
      poolData
  );

  const lpTokensWithMetadata = tweakedPoolData.filter(({ data, metaData }) => (
    metaData.type === 'lpTokenAddress' &&
    data !== ZERO_ADDRESS
  ));

  const lpTokenData = (
    lpTokensWithMetadata.length === 0 ? [] :
      await multiCall(flattenArray(lpTokensWithMetadata.map(({
        data: address,
        metaData,
      }) => {
        const lpTokenContract = new web3.eth.Contract(erc20Abi, address);

        return [{
          contract: lpTokenContract,
          methodName: 'name',
          metaData: { poolId: metaData.poolId, type: 'name' },
          ...networkSettingsParam,
        }, {
          contract: lpTokenContract,
          methodName: 'symbol',
          metaData: { poolId: metaData.poolId, type: 'symbol' },
          ...networkSettingsParam,
        }, {
          contract: lpTokenContract,
          methodName: 'totalSupply',
          metaData: { poolId: metaData.poolId, type: 'totalSupply' },
          ...networkSettingsParam,
        }];
      })))
  );

  const augmentedPoolData = [
    ...tweakedPoolData,
    ...lpTokenData,
  ];

  const emptyData = poolIds.map((id) => ({ id: getIdForPool(id) }));
  const mergedPoolData = augmentedPoolData.reduce((accu, { data, metaData: { poolId, type, ...otherMetaData } }) => {
    const index = accu.findIndex(({ id }) => id === getIdForPool(poolId));
    const poolInfo = accu[index];

    // eslint-disable-next-line no-param-reassign
    accu[index] = {
      ...poolInfo,
      address: poolAddresses[index],
      [type]: (
        (type === 'priceOracle' && data !== null) ? (data / 1e18) :
          (type === 'priceOracles' && data !== null) ? toSpliced((poolInfo.priceOracles ?? []), otherMetaData.index, 0, (data / 1e18)) :
            data
      ),
    };

    return accu;
  }, emptyData);

  const allCoinAddresses = augmentedPoolData.reduce((accu, { data, metaData: { poolId, type } }) => {
    if (type === 'coinsAddresses') {
      const poolCoins = data.filter(isDefinedCoin);
      return accu.concat(poolCoins.map((address) => ({ poolId, address })));
    }

    return accu;
  }, []);

  let coinAddressesAndPricesMapFallback;
  let crvusdTokenAddresseAndPriceMapFallback;
  let ycTokensAddressesAndPricesMapFallback;
  let napierTokensAddressesAndPricesMapFallback;
  let templeTokensAddressesAndPricesMapFallback;
  let synthetixTokensAddressesAndPricesMapFallback;
  let eywaTokensAddressesAndPricesMapFallback;
  let curvePrices;
  if (!USE_CURVE_PRICES_DATA) {
    const coinsFallbackPricesFromCgId = (
      COIN_ADDRESS_COINGECKO_ID_MAP[blockchainId] ?
        await getAssetsPrices(Array.from(Object.values(COIN_ADDRESS_COINGECKO_ID_MAP[blockchainId]))) :
        {}
    );

    const coinAddressesAndPricesMapFallbackFromCgId = (
      COIN_ADDRESS_COINGECKO_ID_MAP[blockchainId] ?
        arrayToHashmap(
          Array.from(Object.entries(COIN_ADDRESS_COINGECKO_ID_MAP[blockchainId]))
            .map(([address, coingeckoId]) => [
              address.toLowerCase(),
              coinsFallbackPricesFromCgId[coingeckoId],
            ])
        ) :
        {}
    );

    const coinsFallbackPricesFromAddress = (
      EXTERNAL_ORACLE_COINS_ADDRESSES[blockchainId] ?
        await getTokensPrices(EXTERNAL_ORACLE_COINS_ADDRESSES[blockchainId], blockchainId) :
        {}
    );

    const coinAddressesAndPricesMapFallbackFromAddress = (
      EXTERNAL_ORACLE_COINS_ADDRESSES[blockchainId] ?
        arrayToHashmap(
          EXTERNAL_ORACLE_COINS_ADDRESSES[blockchainId].map((address) => [
            address,
            coinsFallbackPricesFromAddress[address],
          ])
        ) :
        {}
    );

    coinAddressesAndPricesMapFallback = {
      ...coinAddressesAndPricesMapFallbackFromCgId,
      ...coinAddressesAndPricesMapFallbackFromAddress,
    };

    crvusdTokenAddresseAndPriceMapFallback = await getCrvusdPrice(blockchainId);

    ycTokensAddressesAndPricesMapFallback = (
      (blockchainId === 'ethereum' || blockchainId === 'fantom') ?
        await getYcTokenPrices(networkSettingsParam, blockchainId, coinAddressesAndPricesMapFallback) :
        {}
    );

    templeTokensAddressesAndPricesMapFallback = (
      (blockchainId === 'ethereum' && registryId === 'factory') ?
        await getTempleTokenPrices(networkSettingsParam, blockchainId, coinAddressesAndPricesMapFallback) :
        {}
    );

    synthetixTokensAddressesAndPricesMapFallback = (
      (blockchainId === 'ethereum') ?
        await getSynthetixTokenPrices(networkSettingsParam) :
        {}
    );

    napierTokensAddressesAndPricesMapFallback = (
      (blockchainId === 'ethereum') ?
        await getNapierTokenPrices(networkSettingsParam) :
        {}
    );

    eywaTokensAddressesAndPricesMapFallback = (
      (blockchainId === 'fantom' && (registryId === 'factory-eywa' || registryId === 'factory-stable-ng')) ?
        await getEywaTokenPrices(allCoinAddresses, registryId) :
        {}
    );
  } else {
    curvePrices = await getCurvePrices(blockchainId);
  }

  const coinData = await multiCall(flattenArray(allCoinAddresses.map(({ poolId, address }) => {
    // In crypto facto pools, native eth is represented as weth
    const isNativeEth = (
      registryId === 'factory-crypto' ?
        address.toLowerCase() === allCoins[config.nativeAssetErc20WrapperId].address.toLowerCase() :
        address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    );

    const hasByte32Symbol = (
      blockchainId === 'ethereum' &&
      address.toLowerCase() === '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2'
    );
    const coinContract = (
      isNativeEth ? undefined :
        hasByte32Symbol ? new web3.eth.Contract(erc20AbiMKR, address) :
          new web3.eth.Contract(erc20Abi, address)
    );

    const poolAddress = poolAddresses[poolIds.indexOf(poolId)];
    const poolContractUint256 = new web3.eth.Contract(POOL_BALANCE_ABI_UINT256, poolAddress);
    const poolContractInt128 = new web3.eth.Contract(POOL_BALANCE_ABI_INT128, poolAddress);
    const coinIndex = poolData.find(({ metaData }) => (
      metaData.type === 'coinsAddresses' &&
      metaData.poolId === poolId
    )).data.findIndex((coinAddress) => coinAddress.toLowerCase() === address.toLowerCase());

    return [...(isNativeEth ? [{
      contract: poolContractUint256,
      methodName: 'balances',
      params: [coinIndex],
      metaData: { poolId, poolAddress, coinAddress: address, isNativeEth, type: 'poolBalance' },
      ...networkSettingsParam,
    }] : [{
      contract: coinContract,
      methodName: 'decimals',
      metaData: { poolId, poolAddress, coinAddress: address, isNativeEth, type: 'decimals' },
      ...networkSettingsParam,
    }, {
      contract: coinContract,
      methodName: 'symbol',
      metaData: { poolId, poolAddress, coinAddress: address, isNativeEth, type: 'symbol' },
      ...networkSettingsParam,
    }, {
      contract: poolContractUint256,
      methodName: 'balances',
      params: [coinIndex],
      metaData: { poolId, poolAddress, coinAddress: address, isNativeEth, type: 'poolBalanceUint256' },
      ...networkSettingsParam,
    }, {
      contract: poolContractInt128,
      methodName: 'balances',
      params: [coinIndex],
      metaData: { poolId, poolAddress, coinAddress: address, isNativeEth, type: 'poolBalanceInt128' },
      ...networkSettingsParam,
    }]), ...(
      /**
       * On Ethereum factory, meta pools keep the base pool's lp in balance due to gas considerations;
       * we have to take into account any amount staked. On sidechain factories, meta pools have
       * their whole base pool balance as gauge lp, so we don't look at staked amount else it'd lead
       * to double-counting.
       */
      (blockchainId === 'ethereum' && typeof BASE_POOL_LP_TO_GAUGE_LP_MAP !== 'undefined' && BASE_POOL_LP_TO_GAUGE_LP_MAP.has(address)) ?
        [{
          contract: new web3.eth.Contract(erc20Abi, BASE_POOL_LP_TO_GAUGE_LP_MAP.get(address)),
          methodName: 'balanceOf',
          params: [poolAddress],
          metaData: { poolId, poolAddress, coinAddress: address, isNativeEth, type: 'poolStakedBalance' },
          ...networkSettingsParam,
        }] :
        []
    )];
  })));

  const mergedCoinData = coinData.reduce((accu, { data, metaData: { poolId, poolAddress, coinAddress, type, isNativeEth } }) => {
    const key = `${getIdForPool(poolId)}-${coinAddress}`;
    const coinInfo = accu[key];

    const coinPrice = (
      (IGNORED_COINS[blockchainId] || []).includes(coinAddress.toLowerCase()) ? 0 :
        (
          USE_CURVE_PRICES_DATA ? (
            curvePrices[lc(coinAddress)] ||
            null
          ) : (
            crvusdTokenAddresseAndPriceMapFallback[coinAddress.toLowerCase()] || //
            otherRegistryTokensPricesMap[coinAddress.toLowerCase()] || //
            mainRegistryLpTokensPricesMap[coinAddress.toLowerCase()] || //
            coinAddressesAndPricesMapFallback[coinAddress.toLowerCase()] || //
            ycTokensAddressesAndPricesMapFallback[coinAddress.toLowerCase()] || //
            napierTokensAddressesAndPricesMapFallback[`${poolAddress.toLowerCase()}-${coinAddress.toLowerCase()}`] || //
            templeTokensAddressesAndPricesMapFallback[coinAddress.toLowerCase()] || //
            synthetixTokensAddressesAndPricesMapFallback[coinAddress.toLowerCase()] || //
            eywaTokensAddressesAndPricesMapFallback[coinAddress.toLowerCase()] || //
            (registryId === 'factory' && ethereumOnlyData?.factoryGaugesPoolAddressesAndAssetPricesMap?.[poolAddress.toLowerCase()]) || //
            null
          )
        )
    );

    const hardcodedInfoForNativeEth = {
      decimals: 18,
      symbol: nativeCurrencySymbol,
    };

    const poolInfo = mergedPoolData.find(({ id }) => id === getIdForPool(poolId))
    const poolImplementation = getImplementation({
      registryId,
      config,
      poolInfo,
      implementationAddressMap,
    });

    const isPermissionlessRegistry = registryId.startsWith('factory');
    const hasMetaPoolImplementation = poolImplementation.includes('meta');

    // eslint-disable-next-line no-param-reassign
    accu[key] = {
      ...coinInfo,
      address: coinAddress,
      usdPrice: coinPrice,
      ...(
        // Most pool contracts expect a coin index as uint256, which we retrieve in poolBalanceUint256
        type === 'poolBalanceUint256' ? { poolBalance: data } :
          // Some pool contracts expect a coin index as int128, which we retrieve in poolBalanceInt128,
          // and use as fallback value for poolBalance
          type === 'poolBalanceInt128' ? { poolBalance: BN.max(coinInfo.poolBalance, data).toFixed() } :
            type === 'poolStakedBalance' ? { poolBalance: BN(coinInfo.poolBalance).plus(data).toFixed() } :
              // Force 'MKR' as symbol for MKR token on Ethereum, which uses bytes32 and not string
              (type === 'symbol' && blockchainId === 'ethereum' && lc(coinAddress) === '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2') ? { symbol: 'MKR' } :
                { [type]: data }
      ),
      ...(isNativeEth ? hardcodedInfoForNativeEth : {}),
      isBasePoolLpToken: (
        (
          mainRegistryPoolsAndLpTokens.some(({ lpTokenAddress }) => (
            lpTokenAddress.toLowerCase() === coinAddress.toLowerCase()
          )) ||
          finalBasePoolLpAddresses.includes(lc(coinAddress))
        ) &&
        (!isPermissionlessRegistry || hasMetaPoolImplementation)
      ),
    };

    return accu;
  }, {});

  // Fetch get_dy() between all coins in all pools in order to derive prices within a pool where necessary.
  // This is only for "factory" pools; not "main", not "crypto", not "factory-crypto", which all have other
  // methods of deriving internal prices.
  const rawInternalPoolsPrices = (
    await multiCall(flattenArray(mergedPoolData.map((poolInfo) => {
      const {
        id,
        address,
        coinsAddresses: unfilteredCoinsAddresses,
        decimals,
        totalSupply,
      } = poolInfo;

      const implementation = getImplementation({
        registryId,
        config,
        poolInfo,
        implementationAddressMap,
      });
      const isUsdMetaPool = implementation.startsWith('metausd') || implementation.startsWith('v1metausd');

      const SMALL_AMOUNT_UNIT = BN(isUsdMetaPool ? 10000 : 1);
      if (Number(totalSupply) < SMALL_AMOUNT_UNIT.times(1e18)) return []; // Ignore empty pools

      const coinsAddresses = unfilteredCoinsAddresses.filter(isDefinedCoin);
      const poolContract = new web3.eth.Contract(POOL_ABI, address);

      return flattenArray(coinsAddresses.map((_, i) => {
        const iDecimals = Number(decimals[i]);
        const smallAmount = SMALL_AMOUNT_UNIT.times(BN(10).pow(iDecimals)).toFixed();

        return coinsAddresses.map((__, j) => {
          if (j === i) return null;

          return {
            contract: poolContract,
            methodName: 'get_dy',
            params: [i, j, smallAmount],
            metaData: {
              poolId: id,
              i,
              j,
              jDivideBy: SMALL_AMOUNT_UNIT.times(BN(10).pow(Number(decimals[j]))),
            },
            ...networkSettingsParam,
          };
        }).filter((call) => call !== null);
      }));
    })))
  );

  const internalPoolsPrices = groupBy(rawInternalPoolsPrices.map(({
    data,
    metaData: { poolId, i, j, jDivideBy },
  }) => {
    const rate = data / jDivideBy;
    return { rate, poolId, i, j };
  }), 'poolId');

  /**
   * missingCoinPrices plays two different roles:
   * - if USE_CURVE_PRICES_DATA === true: it contains tokens missing from curve-prices, and that'll be passed
   *   to deriveMissingCoinPrices to fill in the blanks
   * - if USE_CURVE_PRICES_DATA === false: deriveMissingCoinPrices will be called first to give priority to
   *   deriving prices using curve pools data; then any token still missing a price will be given a second
   *   chance to have one with missingCoinPrices which will be passed a second time to deriveMissingCoinPrices
   */
  let missingCoinPrices = {};
  if (USE_CURVE_PRICES_DATA) {
    const coinsAddressesWithMissingPrices = uniq(Array.from(Object.values(mergedCoinData)).filter(({
      address,
      usdPrice,
    }) => (
      !(IGNORED_COINS[blockchainId] || []).includes(lc(address)) &&
      usdPrice === null
    )).map(({ address }) => lc(address)));
    missingCoinPrices = await getTokensPrices(coinsAddressesWithMissingPrices, blockchainId);
  }

  const augmentedDataPart1 = await sequentialPromiseReduce(mergedPoolData, async (poolInfo, i, wipMergedPoolData) => {
    const implementation = getImplementation({
      registryId,
      config,
      poolInfo,
      implementationAddressMap,
    });

    const isUsdMetaPool = implementation.startsWith('metausd') || implementation.startsWith('v1metausd');
    const isBtcMetaPool = implementation.startsWith('metabtc') || implementation.startsWith('v1metabtc');
    const isNativeStablePool = (
      (registryId === 'factory' || registryId === 'main') &&
      poolInfo.coinsAddresses.some((address) => lc(address) === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
    );

    // We derive asset type (i.e. used as the reference asset on the FE) from pool implementation if possible,
    // and fall back to the assetType prop.
    const assetTypeName = (
      (implementation === 'plain2eth' || implementation === 'plain2ethema' || implementation === 'plain2ethema2' || implementation === 'plain3eth' || implementation === 'plain4eth') ? nativeCurrencySymbol.toLowerCase() :
        isBtcMetaPool ? 'btc' :
          isUsdMetaPool ? 'usd' :
            isNativeStablePool ? nativeCurrencySymbol.toLowerCase() :
              (assetTypeMap.get(poolInfo.assetType) || 'unknown')
    );

    const augmentedCoins = await getAugmentedCoinsFirstPass({
      USE_CURVE_PRICES_DATA,
      poolInfo,
      mergedCoinData,
      blockchainId,
      registryId,
      wipMergedPoolData,
      internalPoolsPrices,
      mainRegistryLpTokensPricesMap,
      otherRegistryTokensPricesMap,
      missingCoinPrices,
      crvPrice,
    });

    return {
      ...poolInfo,
      implementation,
      zapAddress: (
        POOLS_ZAPS?.[blockchainId]?.pools?.[lc(poolInfo.address)] ||
        POOLS_ZAPS?.[blockchainId]?.implementations?.[implementation] ||
        undefined
      ),
      assetTypeName,
      coins: augmentedCoins,
    };
  });

  if (!USE_CURVE_PRICES_DATA) {
    const coinsAddressesWithMissingPrices = uniq(flattenArray(augmentedDataPart1.map(({ coins }) => coins)).filter(({
      address,
      usdPrice,
    }) => (
      !(IGNORED_COINS[blockchainId] || []).includes(lc(address)) &&
      usdPrice === null
    )).map(({ address }) => lc(address)));
    if (coinsAddressesWithMissingPrices.length > 0) {
      missingCoinPrices = await getTokensPrices(coinsAddressesWithMissingPrices, blockchainId);
    }
  }

  const augmentedDataPart2 = await sequentialPromiseReduce(augmentedDataPart1, async (poolInfo, i, wipMergedPoolData) => {
    const augmentedCoins = (
      Object.values(missingCoinPrices).length > 0 ? (
        await getAugmentedCoinsSecondPass({
          USE_CURVE_PRICES_DATA,
          poolInfo,
          blockchainId,
          registryId,
          wipMergedPoolData,
          internalPoolsPrices,
          mainRegistryLpTokensPricesMap,
          otherRegistryTokensPricesMap,
          missingCoinPrices,
        })
      ) : poolInfo.coins
    );

    const usdTotal = (
      (BROKEN_POOLS_ADDRESSES || []).includes(lc(poolInfo.address)) ? 0 :
        sum(augmentedCoins.map(({ usdPrice, poolBalance, decimals }) => (
          poolBalance / (10 ** decimals) * usdPrice
        )))
    );

    const usdTotalExcludingBasePool = (
      (BROKEN_POOLS_ADDRESSES || []).includes(lc(poolInfo.address)) ? 0 :
        sum(augmentedCoins.filter(({ isBasePoolLpToken }) => !isBasePoolLpToken).map(({ usdPrice, poolBalance, decimals }) => (
          poolBalance / (10 ** decimals) * usdPrice
        )))
    );

    const gaugeData = (
      typeof ethereumOnlyData !== 'undefined' ? (
        ethereumOnlyData.gaugesDataArray.find(({ swap, blockchainId: gaugeDataBlockchainId }) => (
          blockchainId === gaugeDataBlockchainId &&
          lc(swap) === lc(poolInfo.address)
        ))
      ) : undefined
    );
    const gaugeAddress = typeof gaugeData !== 'undefined' ? gaugeData.gauge?.toLowerCase() : undefined;
    const gaugeCrvApy = gaugeData?.gaugeCrvApy;
    const gaugeFutureCrvApy = gaugeData?.gaugeFutureCrvApy;
    const gaugeRewardsInfo = gaugeAddress ? ethereumOnlyData.gaugeRewards[gaugeAddress] : undefined;

    const totalSupply = poolInfo.totalSupply / 1e18;
    const lpTokenPrice = totalSupply > 0 ? (usdTotal / totalSupply) : undefined;

    const metaPoolBasePoolLpToken = augmentedCoins.find(({ isBasePoolLpToken }) => isBasePoolLpToken);
    const isMetaPool = typeof metaPoolBasePoolLpToken !== 'undefined';

    // here need to be able to retrieve from getPools/ethereum/base-pools, a special endpoint that returns only base pools, so it can be a cheap dependency
    const underlyingPool = (
      isMetaPool ? (
        [...wipMergedPoolData, ...otherRegistryPoolsData].find(({ lpTokenAddress, address }) => (
          (lpTokenAddress || address).toLowerCase() === metaPoolBasePoolLpToken.address.toLowerCase()
        ))
      ) : undefined
    );

    // How much does that pool own, in its balances, of the underlying pool
    const underlyingPoolLpOwnershipRate = (
      (isMetaPool && underlyingPool) ? (
        (metaPoolBasePoolLpToken.poolBalance / 1e18) / (underlyingPool.totalSupply / 1e18)
      ) : undefined
    );

    const underlyingPoolCoins = (
      (isMetaPool && underlyingPool) ? (
        underlyingPool.coins.map((coin) => ({
          ...coin,
          poolBalance: BN(coin.poolBalance).times(underlyingPoolLpOwnershipRate).toFixed(0),
        }))
      ) : undefined
    );

    const underlyingCoins = (
      (isMetaPool && underlyingPool) ? (
        flattenArray(augmentedCoins.map((coin) => (
          coin.isBasePoolLpToken ? underlyingPoolCoins : coin
        )))
      ) : undefined
    );

    const poolsUrlsIds = [
      (config.poolsBaseUrl ? (
        (registryId === 'main' || registryId === 'crypto') ?
          (getHardcodedPoolId(blockchainId, poolInfo.address) || null) :
          poolInfo.id
      ) : null),
      (config.poolsBaseUrlOld ? (
        (registryId === 'main' || registryId === 'crypto') ?
          (getHardcodedPoolId(blockchainId, poolInfo.address) || null) :
          poolInfo.id.replace('factory-v2-', 'factory/').replace('factory-crypto-', 'factory-crypto/')
      ) : null),
    ];

    const poolUrls = [
      (poolsUrlsIds[0] !== null ? `${config.poolsBaseUrl}${poolsUrlsIds[0]}` : null),
      (poolsUrlsIds[1] !== null ? `${config.poolsBaseUrlOld}${poolsUrlsIds[1]}` : null),
    ];

    const detailedPoolUrls = {
      swap: [
        (poolUrls[0] !== null ? `${poolUrls[0]}/swap` : null),
        (poolUrls[1] !== null ? `${poolUrls[1]}` : null),
      ].filter((o) => o !== null),
      deposit: [
        (poolUrls[0] !== null ? `${poolUrls[0]}/deposit` : null),
        (poolUrls[1] !== null ? `${poolUrls[1]}/deposit` : null),
      ].filter((o) => o !== null),
      withdraw: [
        (poolUrls[0] !== null ? `${poolUrls[0]}/withdraw` : null),
        (poolUrls[1] !== null ? `${poolUrls[1]}/withdraw` : null),
      ].filter((o) => o !== null),
    };

    const gaugeRewards = (
      typeof gaugeRewardsInfo === 'undefined' ?
        undefined :
        await sequentialPromiseMap(gaugeRewardsInfo, async ({
          tokenAddress,
          apyData,
          ...rewardInfo
        }) => {
          const gaugeTotalSupply = apyData.totalSupply;
          const poolTotalSupply = poolInfo.totalSupply / 1e18;
          const gaugeUsdTotal = gaugeTotalSupply / poolTotalSupply * usdTotal;
          const tokenCoingeckoPrice = apyData.tokenPrice;

          let tokenPrice;
          if (!USE_CURVE_PRICES_DATA) {
            const [augmentedCoin] = await deriveMissingCoinPrices({
              blockchainId,
              registryId,
              coins: [{ address: tokenAddress, usdPrice: null }],
              poolInfo: { id: poolInfo.id }, // Passing a subset of poolInfo to avoid hitting other derivation methods for this very specific use-case
              otherPools: (
                wipMergedPoolData
                  .concat({ coins: augmentedCoins, usdTotal }) // Attach this pool's own augmented coins
              ),
              internalPoolPrices: internalPoolsPrices[poolInfo.id] || [], //
              mainRegistryLpTokensPricesMap, //
              otherRegistryTokensPricesMap, //
            });

            tokenPrice = augmentedCoin.usdPrice || tokenCoingeckoPrice;
          } else {
            // Here need CURVE_PRICES_DATA
            tokenPrice = curvePrices[lc(tokenAddress)] || tokenCoingeckoPrice || null;
          }

          return {
            ...rewardInfo,
            tokenAddress,
            tokenPrice,
            apy: (
              apyData.isRewardStillActive ?
                apyData.rate * 86400 * 365 * tokenPrice / gaugeUsdTotal * 100 :
                0
            ),
          };
        })
    );

    /**
    * Detect pools with oracles: oracle_method must be present (if not present,
    * call returns default value of zero) and non-zero
    */
    const usesRateOracle = Number(poolInfo.oracleMethod) !== 0;
    const [
      ethereumLSTAPYs,
      ethereumDaiAPYs,
    ] = await Promise.all([
      getETHLSTAPYs(),
      getDaiAPYs(),
    ]);

    if (isMetaPool && typeof underlyingPool === 'undefined') {
      throw new Error(`Pool ${poolInfo.address} is a meta pool, yet we couldn’t retrieve its underlying pool. Please check METAPOOL_REGISTRIES_DEPENDENCIES, its base pool’s registry is likely missing.`)
    }

    /**
     * An issue with the factory-stable-ng registry leads to some pools having an empty array returned
     * by `assetTypes()`. We use data returned by prices.curve.fi as a fallback in these situations.
     */
    const poolAssetTypes = (
      typeof poolInfo.assetTypes === 'undefined' ? undefined :
        poolInfo.assetTypes.length > 0 ? poolInfo.assetTypes :
          await getPoolAssetTypesFromExternalStore(poolInfo.address, blockchainId)
    );

    const poolAvailableMethods = pricesCurveFiPoolData.find(({ address }) => lc(address) === lc(poolInfo.address))?.pool_methods ?? [];
    const hasMethods = {
      // Pools with rebasing tokens (asset type 2) disable their use of exchange_received
      exchange_received: poolAvailableMethods.includes('exchange_received') && !(poolAssetTypes ?? []).some((type) => Number(type) === 2),
      exchange_extended: poolAvailableMethods.includes('exchange_extended'),
    };

    const creationMetadata = await getPoolCreationTsAndBlockFromExternalStore(poolInfo.address, blockchainId);
    const creationTs = creationMetadata?.creationTs ?? null;
    const creationBlockNumber = creationMetadata?.creationBlockNumber ?? null;

    const augmentedPool = {
      ...poolInfo,
      poolUrls: detailedPoolUrls,
      lpTokenAddress: (poolInfo.lpTokenAddress || poolInfo.address),
      coins: augmentedCoins.map((coin) => {
        const ethLsdApyData = ethereumLSTAPYs.find(({ lstAddress, blockchainId: lstBlockchainId }) => (
          lstBlockchainId === blockchainId &&
          lstAddress === lc(coin.address)
        ));
        const ethDaiApyData = ethereumDaiAPYs.find(({ address }) => address === lc(coin.address));

        return ({
          ...overrideSymbol(coin, blockchainId),
          ...(typeof ethLsdApyData !== 'undefined' ? { ethLsdApy: ethLsdApyData.stakingApy } : {}),
          ...(typeof ethDaiApyData !== 'undefined' ? { ethLsdApy: ethDaiApyData.apy } : {}), // Stuffed in the same prop as LSTs apys
        });
      }),
      usdTotal,
      isMetaPool,
      basePoolAddress: (isMetaPool ? underlyingPool.address : undefined),
      underlyingDecimals: (isMetaPool ? poolInfo.underlyingDecimals : undefined),
      underlyingCoins,
      usdTotalExcludingBasePool,
      gaugeAddress,
      gaugeRewards: (
        (gaugeAddress && !gaugeData.is_killed) ?
          (gaugeRewards || []) :
          undefined
      ),
      gaugeCrvApy,
      gaugeFutureCrvApy,
      oracleMethod: undefined, // Don't return this value, unneeded for api consumers
      assetTypes: undefined, // Don't return this value, unneeded for api consumers
      usesRateOracle,
      isBroken: (BROKEN_POOLS_ADDRESSES || []).includes(lc(poolInfo.address)),
      hasMethods, // Used to know the presence of some methods not available in all pools
      creationTs,
      creationBlockNumber,
    };

    // When retrieving pool data for a registry that isn't 'main', mainRegistryLpTokensPricesMap
    // is retrieved at the very beginning. However if querying pool data for the
    // main registry, we construct this map as we iterate through pools.
    if (registryId === 'main') {
      const {
        address,
        usdTotal,
        totalSupply,
      } = augmentedPool;
      const lpTokenAddress = mainRegistryPoolsAndLpTokens.find(({ address: addressB }) => addressB.toLowerCase() === address.toLowerCase()).lpTokenAddress.toLowerCase();

      if (!USE_CURVE_PRICES_DATA) {
        mainRegistryLpTokensPricesMap[lpTokenAddress] = (usdTotal / (totalSupply / 1e18));
      }
    }

    return augmentedPool;
  });

  const augmentedData = augmentedDataPart2;

  // The distinction between tvlAll and tvl is useful when facto pools are added to the main
  // registry, in order to avoid double-counting tvl.
  return {
    poolData: augmentedData,
    tvlAll: sum(augmentedData.map(({ usdTotalExcludingBasePool }) => usdTotalExcludingBasePool)),
    ...(typeof ethereumOnlyData !== 'undefined' ? {
      tvl: sum(
        // ethereumOnlyData.mainRegistryPoolList is undefined when preventQueryingFactoData=true,
        // and in this case we don't care about these totals so nbd
        (registryId === 'factory' && typeof ethereumOnlyData.mainRegistryPoolList !== 'undefined') ? (
          augmentedData
            .filter(({ address }) => !ethereumOnlyData.mainRegistryPoolList?.includes(address.toLowerCase()))
            .map(({ usdTotalExcludingBasePool }) => usdTotalExcludingBasePool)
        ) : (
          augmentedData.map(({ usdTotalExcludingBasePool }) => usdTotalExcludingBasePool)
        )
      ),
    } : {}),
  };
};

const getPoolsFn = fn(getPools, {
  maxAge: MAX_AGE,
  cacheKey: ({ blockchainId, registryId, preventQueryingFactoData }) => `getPools-${blockchainId}-${registryId}-${preventQueryingFactoData}`,
  paramSanitizers: {
    /**
     * Set to true to prevent circular dependencies when calling getPools() in an area of the code that getPools()
     * itself calls, e.g. getFactoGauges sets this setting to true because it's interested in the pool list, and
     * the pool list only.
     */
    preventQueryingFactoData: ({ preventQueryingFactoData }) => ({
      isValid: (typeof preventQueryingFactoData === 'boolean'),
      defaultValue: false,
    }),
  }
});

export default getPoolsFn;
