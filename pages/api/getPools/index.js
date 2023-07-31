/* eslint-disable object-curly-newline, camelcase */

/**
 * Fetches all sorts of pool information. Works for all pools, in all registries, on all chains.
 *
 * Note:
 * - Doesn't work for Harmony: its 3pool isn't in the main registry, and Harmony is lacking a
 *   crypto registry
 * - Doesn't work for Moonbeam: it's lacking a main registry
 */

import Web3 from 'web3';
import BN from 'bignumber.js';
import groupBy from 'lodash.groupby';
import { fn } from 'utils/api';
import factoryV2RegistryAbi from 'constants/abis/factory-v2-registry.json';
import factoryPoolAbi from 'constants/abis/factory-v2/Plain2Balances.json';
import factoryCryptoRegistryAbi from 'constants/abis/factory-crypto-registry.json';
import factoryCrvusdRegistryAbi from 'constants/abis/factory-crvusd/registry.json';
import factoryTricryptoRegistryAbi from 'constants/abis/factory-tricrypto/registry.json';
import factoryEywaRegistryAbi from 'constants/abis/fantom/factory-eywa/registry.json';
import cryptoRegistryAbi from 'constants/abis/crypto-registry.json';
import factoryCryptoPoolAbi from 'constants/abis/factory-crypto/factory-crypto-pool-2.json';
import factoryTricryptoPoolAbi from 'constants/abis/factory-crypto/factory-crypto-pool-2.json';
import factoryCrvusdPoolAbi from 'constants/abis/factory-crvusd/pool.json';
import factoryEywaPoolAbi from 'constants/abis/fantom/factory-eywa/pool.json';
import erc20Abi from 'constants/abis/erc20.json';
import erc20AbiMKR from 'constants/abis/erc20_mkr.json';
import { multiCall } from 'utils/Calls';
import { ZERO_ADDRESS } from 'utils/Web3';
import { flattenArray, sum, arrayToHashmap } from 'utils/Array';
import { sequentialPromiseReduce, sequentialPromiseFlatMap, sequentialPromiseMap } from 'utils/Async';
import { getRegistry } from 'utils/getters';
import getAssetsPrices from 'utils/data/assets-prices';
import getTokensPrices from 'utils/data/tokens-prices';
import getYcTokenPrices from 'utils/data/getYcTokenPrices';
import getCrvusdPrice from 'utils/data/getCrvusdPrice';
import getETHLSDAPYs from 'utils/data/getETHLSDAPYs';
import getTempleTokenPrices from 'utils/data/getTempleTokenPrices';
import getEywaTokenPrices from 'utils/data/getEywaTokenPrices';
import getMainRegistryPools from 'pages/api/getMainRegistryPools';
import getMainRegistryPoolsAndLpTokensFn from 'pages/api/getMainRegistryPoolsAndLpTokens';
import getMainPoolsGaugeRewards from 'pages/api/getMainPoolsGaugeRewards';
import configs from 'constants/configs';
import allCoins from 'constants/coins';
import POOLS_ZAPS from 'constants/pools-zaps';
import COIN_ADDRESS_COINGECKO_ID_MAP from 'constants/CoinAddressCoingeckoIdMap';
import { getHardcodedPoolId } from 'constants/PoolAddressInternalIdMap';
import { deriveMissingCoinPrices, getImplementation } from 'pages/api/getPools/_utils';
import { lc } from 'utils/String';

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
const ORACLIZED_POOL_DETECTION_ABI = [{ "stateMutability": "view", "type": "function", "name": "oracle_method", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }] }];
/* eslint-enable */
/* eslint-disable object-curly-newline, camelcase */

const IGNORED_COINS = {
  polygon: [
    '0x8dacf090f8803f53ee3c44f0d7a07b9d70453c42', // spam
  ].map(lc),
};

// Tokens for which to use Defillama as external price oracle
const EXTERNAL_ORACLE_COINS_ADDRESSES = {
  ethereum: [
    '0x95dfdc8161832e4ff7816ac4b6367ce201538253', // ibKRW (no curve crypto pool to act as oracle)
    '0x5555f75e3d5278082200fb451d1b6ba946d8e13b', // ibJPY (no curve crypto pool to act as oracle)
    '0xF48e200EAF9906362BB1442fca31e0835773b8B4', // sAUD (no curve crypto pool to act as oracle)
    '0x97fe22E7341a0Cd8Db6F6C021A24Dc8f4DAD855F', // sGBP (no curve crypto pool to act as oracle)
    '0x0f83287ff768d1c1e17a42f44d644d7f22e8ee1d', // sCHF (no curve crypto pool to act as oracle)
    '0xc2544a32872a91f4a553b404c6950e89de901fdb', // FPIS (no liquid curve crypto pool to act as oracle)
    '0xa0d69e286b938e21cbf7e51d71f6a4c8918f482f', // eUSD (no curve crypto pool to act as oracle)
  ].map(lc),
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
  let gaugesData = {};
  let gaugeRewards = {};

  if (!preventQueryingFactoData) {
    const getFactoryV2GaugeRewards = (
      blockchainId === 'ethereum' ?
        (await import('utils/data/getFactoryV2GaugeRewards')).default :
        (await import('utils/data/getFactoryV2SidechainGaugeRewards')).default
    );
    const getGauges = (await import('pages/api/getAllGauges')).default;
    gaugesData = await getGauges.straightCall({ blockchainId });

    if (blockchainId === 'ethereum') {
      const factoryGauges = Array.from(Object.values(gaugesData)).filter(({ side_chain }) => !side_chain);
      const factoryGaugesAddresses = factoryGauges.map(({ gauge }) => gauge).filter((s) => s); // eslint-disable-line no-param-reassign

      gaugeRewards = await getFactoryV2GaugeRewards({ blockchainId, factoryGaugesAddresses });
    } else {
      const factoryGauges = Array.from(Object.values(gaugesData)).filter(({ side_chain }) => side_chain);

      gaugeRewards = await getFactoryV2GaugeRewards({ blockchainId, gauges: factoryGauges });
    }
  }

  const { poolList: mainRegistryPoolList } = await getMainRegistryPools.straightCall();
  const mainRegistryPoolGaugesRewards = (
    blockchainId === 'ethereum' ?
      (await getMainPoolsGaugeRewards.straightCall(gaugesData)).mainPoolsGaugeRewards :
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

  const gaugesAssetPrices = await getAssetsPrices(Array.from(Object.values(factoryGaugesPoolAddressesAndCoingeckoIdMap)));
  const factoryGaugesPoolAddressesAndAssetPricesMap = arrayToHashmap(
    Array.from(Object.entries(factoryGaugesPoolAddressesAndCoingeckoIdMap))
      .map(([address, coingeckoId]) => [
        address.toLowerCase(),
        gaugesAssetPrices[coingeckoId],
      ])
  );

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

const isDefinedCoin = (address) => address !== '0x0000000000000000000000000000000000000000';

/**
 * Params:
 * - blockchainId: 'ethereum' (default) | any side chain
 * - registryId: 'factory' | 'main' | 'crypto' | 'factory-crypto' | 'factory-crvusd' | 'factory-tricrypto' | 'factory-eywa'
 *
 * 'factory-crvusd', 'factory-tricrypto' and 'factory-eywa' are custom factories that aren't meant to be found on all chains
 */
const getPools = async ({ blockchainId, registryId, preventQueryingFactoData }) => {
  /* eslint-disable no-param-reassign */
  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum'; // Default value
  if (typeof registryId === 'undefined') registryId = 'main'; // Default value
  /**
   * Set to true to prevent circular dependencies when calling getPools() in an area of the code that getPools()
   * itself calls, e.g. getFactoGauges sets this setting to true because it's interested in the pool list, and
   * the pool list only.
   */
  if (typeof preventQueryingFactoData === 'undefined') preventQueryingFactoData = false; // Default value
  /* eslint-enable no-param-reassign */

  const config = configs[blockchainId];
  if (typeof config === 'undefined') {
    throw new Error(`No config data for blockchainId "${blockchainId}"`);
  }

  if (config.hasNoMainRegistry && registryId === 'main') {
    return {
      poolData: [],
      tvlAll: 0,
      tvl: 0,
    };
  }

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
    getFactoryTricryptoRegistryAddress,
    getFactoryEywaRegistryAddress,
    multicall2Address,
    BASE_POOL_LP_TO_GAUGE_LP_MAP,
    DISABLED_POOLS_ADDRESSES,
    BROKEN_POOLS_ADDRESSES,
  } = config;

  if (registryId !== 'factory' && registryId !== 'main' && registryId !== 'crypto' && registryId !== 'factory-crypto' && registryId !== 'factory-crvusd' && registryId !== 'factory-tricrypto' && registryId !== 'factory-eywa') {
    throw new Error('registryId must be \'factory\'|\'main\'|\'crypto\'|\'factory-crypto\'|\'factory-crvusd\'|\'factory-tricrypto\'|\'factory-eywa\'');
  }

  if (registryId === 'factory' && typeof getFactoryRegistryAddress !== 'function') {
    console.error(`No getFactoryRegistryAddress() config method found for blockchainId "${blockchainId}"`);
    return { poolData: [] };
  }

  if (registryId === 'crypto' && typeof getCryptoRegistryAddress !== 'function') {
    console.error(`No getCryptoRegistryAddress() config method found for blockchainId "${blockchainId}"`);
    return { poolData: [] };
  }

  if (registryId === 'factory-crypto' && typeof getFactoryCryptoRegistryAddress !== 'function') {
    console.error(`No getFactoryCryptoRegistryAddress() config method found for blockchainId "${blockchainId}"`);
    return { poolData: [] };
  }

  if (registryId === 'factory-crvusd' && typeof getFactoryCrvusdRegistryAddress !== 'function') {
    console.error(`No getFactoryCrvusdRegistryAddress() config method found for blockchainId "${blockchainId}"`);
    return { poolData: [] };
  }

  if (registryId === 'factory-tricrypto' && typeof getFactoryTricryptoRegistryAddress !== 'function') {
    console.error(`No getFactoryTricryptoRegistryAddress() config method found for blockchainId "${blockchainId}"`);
    return { poolData: [] };
  }

  if (registryId === 'factory-eywa' && typeof getFactoryEywaRegistryAddress !== 'function') {
    console.error(`No getFactoryEywaRegistryAddress() config method found for blockchainId "${blockchainId}"`);
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
              registryId === 'factory-tricrypto' ? await getFactoryTricryptoRegistryAddress() :
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
              registryId === 'factory-tricrypto' ? `factory-tricrypto-${id}` :
                registryId === 'factory-eywa' ? `factory-eywa-${id}` :
                  undefined
  );

  const POOL_ABI = (
    registryId === 'factory-crypto' ? factoryCryptoPoolAbi :
      registryId === 'factory-crvusd' ? factoryCrvusdPoolAbi :
        registryId === 'factory-tricrypto' ? factoryTricryptoPoolAbi :
          registryId === 'factory-eywa' ? factoryEywaPoolAbi :
            factoryPoolAbi
  );

  const REGISTRY_ABI = (
    registryId === 'factory-crypto' ? factoryCryptoRegistryAbi :
      registryId === 'factory-crvusd' ? factoryCrvusdRegistryAbi :
        registryId === 'factory-tricrypto' ? [
          ...factoryTricryptoRegistryAbi,
          ...REGISTRY_GET_IMPLEMENTATION_ADDRESS_ABI, // Hack, see get_implementation_address call for factory-tricrypto for context
        ] :
          registryId === 'factory-eywa' ? factoryEywaRegistryAbi :
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

  const {
    [allCoins.crv.coingeckoId]: crvPrice,
  } = await getAssetsPrices([allCoins.crv.coingeckoId]);

  const poolCount = Number(await registry.methods.pool_count().call());
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

  const ethereumOnlyData = await getEthereumOnlyData({ preventQueryingFactoData, blockchainId });

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
  };
  const { poolsAndLpTokens: mainRegistryPoolsAndLpTokens } = await getMainRegistryPoolsAndLpTokensFn.straightCall({ blockchainId });
  const otherRegistryPoolsData = await sequentialPromiseFlatMap(REGISTRIES_DEPENDENCIES[registryId], async (id) => (
    // eslint-disable-next-line no-use-before-define
    (await getPoolsFn.straightCall({ blockchainId, registryId: id, preventQueryingFactoData: true })).poolData.map((poolData) => ({
      ...poolData,
      registryId: id,
    }))
  ));
  const mainRegistryLpTokensPricesMap = arrayToHashmap(otherRegistryPoolsData.map((pool) => {
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
          null
    );

    if (!matchingPool) return null;

    return [
      matchingPool.lpTokenAddress.toLowerCase(),
      (usdTotal / (totalSupply / 1e18)),
    ];
  }).filter((o) => o !== null));
  const otherRegistryTokensPricesMap = arrayToHashmap(Array.from(otherRegistryPoolsData.reduce((accu, {
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
      metaData: { poolId, type: 'coinsAddresses' },
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
    // 'main' and 'factory' registries have these pieces of info, others do not
    ...(
      (registryId === 'main' || registryId === 'factory' || registryId === 'factory-crvusd' || registryId === 'factory-eywa') ? [{
        contract: registry,
        methodName: 'get_underlying_decimals', // address[8]
        params: [address],
        metaData: { poolId, type: 'underlyingDecimals' },
        ...networkSettingsParam,
      }, {
        contract: registry,
        methodName: 'get_pool_asset_type', // uint256
        params: [address],
        metaData: { poolId, type: 'assetType' },
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
      (registryId === 'factory' || registryId === 'factory-crvusd' || registryId === 'factory-eywa') ? [{
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

  const poolData = poolDataWithTries.map(({ data, metaData }) => {
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
            implementation === 'metabtcbalances'
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
        const poolCoinsCount = tweakedPoolData.find(({ metaData: { type, poolId } }) => (
          type === 'coinsAddresses' &&
          poolId === metaData.poolId
        )).data.filter((coinAddress) => coinAddress !== '0x0000000000000000000000000000000000000000').length;
        const poolHasMultipleOracles = poolCoinsCount > 2;
        const poolAddress = poolAddresses[poolIds.indexOf(metaData.poolId)];
        const poolContractForPriceOracleCall = new web3.eth.Contract(poolHasMultipleOracles ? POOL_PRICE_ORACLE_WITH_ARGS_ABI : POOL_PRICE_ORACLE_NO_ARGS_ABI, poolAddress);

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
        }, {
          contract: poolContractForPriceOracleCall,
          methodName: 'price_oracle', // uint256
          params: poolHasMultipleOracles ? [0] : [], // Price oracle for first asset, there are N-1 oracles so we can fetch more if needed
          metaData: { poolId: metaData.poolId, type: 'priceOracle' },
          ...networkSettingsParam,
        }];
      })))
  );

  const augmentedPoolData = [
    ...tweakedPoolData,
    ...lpTokenData,
  ];

  const allCoinAddresses = augmentedPoolData.reduce((accu, { data, metaData: { poolId, type } }) => {
    if (type === 'coinsAddresses') {
      const poolCoins = data.filter(isDefinedCoin);
      return accu.concat(poolCoins.map((address) => ({ poolId, address })));
    }

    return accu;
  }, []);

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
      await getTokensPrices(EXTERNAL_ORACLE_COINS_ADDRESSES[blockchainId]) :
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

  const coinAddressesAndPricesMapFallback = {
    ...coinAddressesAndPricesMapFallbackFromCgId,
    ...coinAddressesAndPricesMapFallbackFromAddress,
  };

  const crvusdTokenAddresseAndPriceMapFallback = (
    blockchainId === 'ethereum' ?
      await getCrvusdPrice(networkSettingsParam) :
      {}
  );

  const ycTokensAddressesAndPricesMapFallback = (
    (blockchainId === 'ethereum' || blockchainId === 'fantom') ?
      await getYcTokenPrices(networkSettingsParam, blockchainId, coinAddressesAndPricesMapFallback) :
      {}
  );

  const templeTokensAddressesAndPricesMapFallback = (
    (blockchainId === 'ethereum' && registryId === 'factory') ?
      await getTempleTokenPrices(networkSettingsParam, blockchainId, coinAddressesAndPricesMapFallback) :
      {}
  );

  const eywaTokensAddressesAndPricesMapFallback = (
    (blockchainId === 'fantom' && registryId === 'factory-eywa') ?
      await getEywaTokenPrices(networkSettingsParam, blockchainId, coinAddressesAndPricesMapFallback, allCoinAddresses) :
      {}
  );

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
      (IGNORED_COINS[blockchainId] || []).includes(coinAddress.toLowerCase()) ?
        0 :
        (
          crvusdTokenAddresseAndPriceMapFallback[coinAddress.toLowerCase()] ||
          otherRegistryTokensPricesMap[coinAddress.toLowerCase()] ||
          mainRegistryLpTokensPricesMap[coinAddress.toLowerCase()] ||
          coinAddressesAndPricesMapFallback[coinAddress.toLowerCase()] ||
          ycTokensAddressesAndPricesMapFallback[coinAddress.toLowerCase()] ||
          templeTokensAddressesAndPricesMapFallback[coinAddress.toLowerCase()] ||
          eywaTokensAddressesAndPricesMapFallback[coinAddress.toLowerCase()] ||
          (registryId === 'factory' && ethereumOnlyData?.factoryGaugesPoolAddressesAndAssetPricesMap?.[poolAddress.toLowerCase()]) ||
          null
        )
    );

    const hardcodedInfoForNativeEth = {
      decimals: 18,
      symbol: nativeCurrencySymbol,
    };

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
      isBasePoolLpToken: mainRegistryPoolsAndLpTokens.some(({ lpTokenAddress }) => (
        lpTokenAddress.toLowerCase() === coinAddress.toLowerCase()
      )),
    };

    return accu;
  }, {});

  const emptyData = poolIds.map((id) => ({ id: getIdForPool(id) }));
  const mergedPoolData = augmentedPoolData.reduce((accu, { data, metaData: { poolId, type } }) => {
    const index = accu.findIndex(({ id }) => id === getIdForPool(poolId));
    const poolInfo = accu[index];

    // eslint-disable-next-line no-param-reassign
    accu[index] = {
      ...poolInfo,
      address: poolAddresses[index],
      [type]: (
        type === 'priceOracle' ?
          (data / 1e18) :
          data
      ),
    };

    return accu;
  }, emptyData);

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

  const augmentedData = await sequentialPromiseReduce(mergedPoolData, async (poolInfo, i, wipMergedPoolData) => {
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

    const coins = poolInfo.coinsAddresses
      .filter(isDefinedCoin)
      .map((coinAddress) => {
        const key = `${poolInfo.id}-${coinAddress}`;

        return {
          ...mergedCoinData[key],
          usdPrice: (
            mergedCoinData[key]?.usdPrice === 0 ? 0 :
              (blockchainId === 'ethereum' && lc(coinAddress) === lc(allCoins.crv.address)) ? crvPrice : // Temp: use external crv price oracle
                (mergedCoinData[key]?.usdPrice || null)
          ),
        };
      });

    const augmentedCoins = await deriveMissingCoinPrices({
      blockchainId,
      registryId,
      coins,
      poolInfo,
      otherPools: wipMergedPoolData,
      internalPoolPrices: internalPoolsPrices[poolInfo.id] || [],
      mainRegistryLpTokensPricesMap,
      otherRegistryTokensPricesMap,
    });

    const usdTotal = sum(augmentedCoins.map(({ usdPrice, poolBalance, decimals }) => (
      poolBalance / (10 ** decimals) * usdPrice
    )));

    const usdTotalExcludingBasePool = sum(augmentedCoins.filter(({ isBasePoolLpToken }) => !isBasePoolLpToken).map(({ usdPrice, poolBalance, decimals }) => (
      poolBalance / (10 ** decimals) * usdPrice
    )));

    const gaugeData = typeof ethereumOnlyData !== 'undefined' ?
      ethereumOnlyData.gaugesDataArray.find(({ swap }) => (
        swap?.toLowerCase() === poolInfo.address.toLowerCase()
      )) :
      undefined;
    const gaugeAddress = typeof gaugeData !== 'undefined' ? gaugeData.gauge?.toLowerCase() : undefined;
    const gaugeRewardsInfo = gaugeAddress ? ethereumOnlyData.gaugeRewards[gaugeAddress] : undefined;

    const totalSupply = poolInfo.totalSupply / 1e18;
    const lpTokenPrice = totalSupply > 0 ? (usdTotal / totalSupply) : undefined;

    const relativeWeightRate = (
      blockchainId === 'ethereum' ?
        (gaugeData?.gauge_controller?.gauge_relative_weight / 1e18) :
        1
    );

    const gaugeCrvBaseApy = (
      (gaugeData && typeof lpTokenPrice !== 'undefined') ? (
        (gaugeData.gauge_controller.inflation_rate / 1e18) * relativeWeightRate * 31536000 / (gaugeData.gauge_data.working_supply / 1e18) * 0.4 * crvPrice / lpTokenPrice * 100
      ) : undefined
    );

    const metaPoolBasePoolLpToken = augmentedCoins.find(({ isBasePoolLpToken }) => isBasePoolLpToken);
    const isMetaPool = typeof metaPoolBasePoolLpToken !== 'undefined';

    const underlyingPool = (
      isMetaPool ? (
        [...wipMergedPoolData, ...otherRegistryPoolsData].find(({ lpTokenAddress, address }) => (
          (lpTokenAddress || address).toLowerCase() === metaPoolBasePoolLpToken.address.toLowerCase()
        ))
      ) : undefined
    );

    // How much does that pool owns, in its balances, of the underlying pool
    const underlyingPoolLpOwnershipRate = (
      isMetaPool ? (
        (metaPoolBasePoolLpToken.poolBalance / 1e18) / (underlyingPool.totalSupply / 1e18)
      ) : undefined
    );

    const underlyingPoolCoins = (
      isMetaPool ? (
        underlyingPool.coins.map((coin) => ({
          ...coin,
          poolBalance: BN(coin.poolBalance).times(underlyingPoolLpOwnershipRate).toFixed(0),
        }))
      ) : undefined
    );

    const underlyingCoins = (
      isMetaPool ? (
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

          const [augmentedCoin] = await deriveMissingCoinPrices({
            blockchainId,
            registryId,
            coins: [{ address: tokenAddress, usdPrice: null }],
            poolInfo: { id: poolInfo.id }, // Passing a subset of poolInfo to avoid hitting other derivation methods for this very specific use-case
            otherPools: (
              wipMergedPoolData
                .concat({ coins: augmentedCoins }) // Attach this pool's own augmented coins
            ),
            internalPoolPrices: internalPoolsPrices[poolInfo.id] || [],
            mainRegistryLpTokensPricesMap,
            otherRegistryTokensPricesMap,
          });
          const tokenPrice = augmentedCoin.usdPrice || tokenCoingeckoPrice;

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
    const ethereumLSDAPYs = (blockchainId === 'ethereum') ? (await getETHLSDAPYs()) : {};

    const augmentedPool = {
      ...poolInfo,
      poolUrls: detailedPoolUrls,
      implementation,
      zapAddress: (
        POOLS_ZAPS?.[blockchainId]?.pools?.[lc(poolInfo.addresss)] ||
        POOLS_ZAPS?.[blockchainId]?.implementations?.[implementation] ||
        undefined
      ),
      lpTokenAddress: (poolInfo.lpTokenAddress || poolInfo.address),
      assetTypeName,
      coins: augmentedCoins.map((coin) => ({
        ...overrideSymbol(coin, blockchainId),
        ...(typeof ethereumLSDAPYs[lc(coin.address)] !== 'undefined' ? {
          ethLsdApy: ethereumLSDAPYs[lc(coin.address)],
        } : {}),
      })),
      usdTotal,
      isMetaPool,
      underlyingDecimals: (isMetaPool ? poolInfo.underlyingDecimals : undefined),
      underlyingCoins,
      usdTotalExcludingBasePool,
      gaugeAddress,
      gaugeRewards: (
        gaugeAddress ?
          (gaugeRewards || []) :
          undefined
      ),
      gaugeCrvApy: (
        gaugeAddress ?
          [gaugeCrvBaseApy, (gaugeCrvBaseApy * 2.5)] :
          undefined
      ),
      oracleMethod: undefined, // Don't return this value, unneeded for api consumers
      usesRateOracle,
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
      mainRegistryLpTokensPricesMap[lpTokenAddress] = (usdTotal / (totalSupply / 1e18));
    }

    return augmentedPool;
  });

  // The distinction between tvlAll and tvl is useful when facto pools are added to the main
  // registry, in order to avoid double-counting tvl.
  return {
    poolData: augmentedData,
    tvlAll: sum(augmentedData.map(({ usdTotalExcludingBasePool }) => usdTotalExcludingBasePool)),
    ...(typeof ethereumOnlyData !== 'undefined' ? {
      tvl: sum(
        registryId === 'factory' ? (
          augmentedData
            .filter(({ address }) => !ethereumOnlyData.mainRegistryPoolList.includes(address.toLowerCase()))
            .map(({ usdTotalExcludingBasePool }) => usdTotalExcludingBasePool)
        ) : (
          augmentedData.map(({ usdTotalExcludingBasePool }) => usdTotalExcludingBasePool)
        )
      ),
    } : {}),
  };
};

const getPoolsFn = fn(getPools, {
  maxAge: 5 * 60,
  name: 'getPools',
});

export default getPoolsFn;
