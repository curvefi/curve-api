const { flatMap } = require('../../utils/Array');
const pools = require('./pools.js');
const REFERENCE_ASSETS = require('../reference-assets.json');
const validatePoolConfigs = require('./init-validation');

const defaultPoolTemplate = {
  dataIndex: undefined,
  id: undefined,
  idAlias: undefined, // e.g. how 'y' and 'iearn' are sometimes interchangeable
  name: undefined,
  lpTokenInfo: {
    name: undefined,
    symbol: undefined,
  },
  coingeckoInfo: {
    id: undefined, // Must be defined
    symbol: undefined, // Must be defined
    referenceAssetId: 'dollar',
  },
  assets: undefined,
  coins: undefined,
  underlyingCoins: undefined, // Must be set when isLendingPool=true
  metaCoins: undefined, // Must be set when isMetaPool=true
  referenceAsset: REFERENCE_ASSETS.USD, // Pool type, from the enum REFERENCE_ASSETS
  isLendingPool: false, // True when underlying assets are lent on Compound/Aave/else
  isModernLendingPool: false, // aave, saave, ib, and future lending pools
  isMetaPool: false,
  isRiskier: false, // True for pools labeled as "innovation zone"
  hasNoGauge: false,
  gaugeVersion: null,
  isPendingGaugeVoteToStartCrvRewards: false,
  expectedCrvRewardsStart: null,
  addresses: {
    swap: null,
    lpToken: null,
    gauge: null,
    deposit: null,
    stakingRewards: null,
    adapter: null,
  },
  hasAMultiplier: true,
  isOldPool: false,
};

const poolContractNameResolver = (name) => (
  name === 'ypool' ? 'iearn' :
  name === 'susd' ? 'susdv2' :
  name === 'ironbank' ? 'ib' :
  name
);

const augmentedPools = pools
  .filter(({ hasNoGauge }) => hasNoGauge !== true) // Convex only deals w/ pools that have gauges
  .map((pool) => ({
    ...defaultPoolTemplate,
    ...pool,
    // Default to 1 for pools with gauges
    gaugeVersion: (pool.gaugeVersion !== null || pool.hasNoGauge) ? pool.gaugeVersion : 1,
    coingeckoInfo: { // Deep merge
      ...defaultPoolTemplate.coingeckoInfo,
      ...pool.coingeckoInfo,
    },
    addresses: { // Deep merge
      ...defaultPoolTemplate.addresses,
      ...pool.addresses,
    },
    lpTokenInfo: { // Extend
      ...pool.lpTokenInfo,
      wrappedSymbol: pool.coingeckoInfo ? pool.coingeckoInfo.symbol : pool.id,
      wrapperSymbol: 'CRV',
    },
    poolUrl: `https://curve.fi/${pool.id}/deposit`,
    get containsSynthCoin() {
      return (
        pool.coins.some(({ isSynth }) => isSynth)
        // Mapping for metapools not available yet in synth swaps, uncomment below + delete last line when it is
        // || !!pool.underlyingCoins?.some(({ isSynth }) => isSynth)
        // || !!pool.metaCoins?.some(({ isSynth }) => isSynth)
        && !pool.isMetaPool
      );
    },
    get containsAaveCoin() {
      return (
        pool.coins.some(({ wrappedCoinType }) => wrappedCoinType === 'aave')
      );
    },
    get containsCompoundCoin() {
      return (
        pool.coins.some(({ wrappedCoinType }) => wrappedCoinType === 'compound')
      );
    },
    get containsYearnBasedCoin() {
      return (
        pool.coins.some(({ wrappedCoinType }) => wrappedCoinType && wrappedCoinType.startsWith('iearn'))
      );
    },
    get lpTokenContractKey() {
      return `${pool.id}LpToken`;
    },
    get rewardContractKey() {
      return `${pool.id}Reward`;
    },
    get curveSwapContractKey() {
      return `${pool.id}CurveSwap`;
    },
  })).sort((a, b) => (
    a.dataIndex < b.dataIndex ? -1 :
    a.dataIndex > b.dataIndex ? 1 : 0
  ));

validatePoolConfigs(augmentedPools);

const poolIds = augmentedPools.map(({ id }) => id);
const poolIdsWithAliases = flatMap(augmentedPools, ({ id, idAlias }) => [id, idAlias]).filter((o) => !!o);
const poolGauges = augmentedPools.map(({ addresses: { gauge } }) => gauge).filter((gauge) => !!gauge);

const exp = augmentedPools;
exp.poolIds = poolIds;
exp.poolIdsWithAliases = poolIdsWithAliases;
exp.poolGauges = poolGauges;

exp.getById = (id) => (
  augmentedPools.find((pool) => id === pool.id) ||
  augmentedPools.find((pool) => id === pool.idAlias) // Check for id aliases if no match for any pool id
);

exp.findPoolForCoinsIds = (coinIdA, coinIdB) => augmentedPools.find(({ coins, underlyingCoins }) => (
  (coins.some(({ id }) => id === coinIdA) || (underlyingCoins && underlyingCoins.some(({ id }) => id === coinIdA))) &&
  (coins.some(({ id }) => id === coinIdB) || (underlyingCoins && underlyingCoins.some(({ id }) => id === coinIdB)))
));

exp.findSynthPoolWithCoinId = (coinId) => augmentedPools.find((pool) => ((
  pool.coins.some(({ id }) => id === coinId) ||
  (pool.underlyingCoins && pool.underlyingCoins.some(({ id }) => id === coinId))
) && pool.containsSynthCoin));

exp.findPoolForSwapAddress = (swapAddress) => {
  const lcSwapAddress = swapAddress.toLowerCase();
  return augmentedPools.find(({ addresses }) => addresses.swap.toLowerCase() === lcSwapAddress);
};

module.exports = exp;
