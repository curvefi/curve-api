import { flattenArray, arrayToHashmap } from '#root/utils/Array.js';
import { IGNORED_TOKEN_ADDRESSES, IGNORED_POOL_ADDRESSES } from '#root/utils/data/curve-prices.js';
import { lc } from '#root/utils/String.js';

const LOG_DEBUG = false;

const getImplementation = ({
  registryId,
  config,
  poolInfo,
  implementationAddressMap,
}) => (
  (registryId === 'factory-crypto') ? (
    // Meta crypto facto pools do not work with a special implementation:
    // rather, they simply use the meta pool's lp token as one of their tokens, and expose a
    // zap to ease interactions with underlyings.
    config.factoryCryptoMetaBasePoolLpTokenAddressMap?.get(poolInfo.coinsAddresses.find((address) => config.factoryCryptoMetaBasePoolLpTokenAddressMap?.has(address.toLowerCase()))?.toLowerCase()) || ''
  ) : (registryId === 'factory' || registryId === 'factory-tricrypto' || registryId === 'factory-twocrypto' || registryId === 'factory-stable-ng') ? (
    (implementationAddressMap.get(poolInfo.implementationAddress?.toLowerCase()) || '')
  ) : ''
);

// Can be increased if needed, "3" is currently the max we've needed based on situations
// where coins were missing prices that we've encountered so far.
const MAX_PASSES = 4;

/**
 * Tries to derive missing coin prices from other available data using different methods.
 */
const deriveMissingCoinPricesSinglePass = async ({
  blockchainId,
  registryId,
  coins,
  poolInfo,
  otherPools,
  internalPoolPrices,
  mainRegistryLpTokensPricesMap,
  otherRegistryTokensPricesMap,
}) => {
  // Skip over ignored pools
  if ((IGNORED_POOL_ADDRESSES[blockchainId] || []).includes(lc(poolInfo.address))) {
    return coins;
  }

  // Skip over pools with ignored tokens
  if (coins.some(({ address }) => (IGNORED_TOKEN_ADDRESSES[blockchainId] || []).includes(lc(address)))) {
    return coins;
  }

  /**
   * Method 1.a: A coin's price is unknown, another one is known. Use the known price,
   * alongside the price oracle, to derive the other coin's price. This method requires
   * the pool to have a price oracle, and only allows filling in the blanks when
   * a pool is missing a single coin's price at index 0 or 1. Methods 1.x below cover more.
   */
  const canUsePriceOracle = (
    coins.filter(({ usdPrice }) => usdPrice === null).length === 1 &&
    (coins.length === 2 || coins.findIndex(({ usdPrice }) => usdPrice === null) < 2) &&
    (!!poolInfo.priceOracle) &&
    poolInfo.totalSupply > 0 // Don't operate on empty pools because their rates will be unrepresentative
  );

  if (canUsePriceOracle) {
    if (LOG_DEBUG) console.log('Missing coin price: using method 1.a to derive price', poolInfo.id);

    return (
      coins.map((coin, i) => (
        coin.usdPrice === null ? {
          ...coin,
          usdPrice: (
            i === 0 ?
              (coins[1].usdPrice / poolInfo.priceOracle) :
              (coins[0].usdPrice * poolInfo.priceOracle)
          ),
        } : coin
      ))
    );
  }

  /**
   * Method 1.b: The pool has price oracles, and any coin at index > 0 has an unknown price.
   * Use the known price at index 0 to derive the missing coin prices.
   *
   * Note: The current logic only works from index 0 to other indexes. If necessary, improve
   * it later to cover even more cases. But generally, in crypto pools, the first coin will
   * be the least exotic, hence has the least chances of having an unknown price.
   */
  const canUsePriceOracles = (
    coins[0].usdPrice !== null &&
    coins.filter(({ usdPrice }) => usdPrice === null).length > 0 &&
    (!!poolInfo.priceOracles) &&
    poolInfo.totalSupply > 0 // Don't operate on empty pools because their rates will be unrepresentative
  );

  if (canUsePriceOracles) {
    if (LOG_DEBUG) console.log('Missing coin price: using method 1.b to derive price', poolInfo.id);

    return (
      coins.map((coin, i) => (
        coin.usdPrice === null ? {
          ...coin,
          usdPrice: (coins[0].usdPrice * poolInfo.priceOracles[i - 1]),
        } : coin
      ))
    );
  }

  /**
   * Method 2: A coin's price is unknown in the pool being iterated on, and the same
   * coin's price is known in a pool that has already been iterated on (likely because
   * this coin's price has been derived from other data during a previous pass on that
   * other pool). Simply retrieve that same coin's price from the other pool, and use
   * it in this pool.
   *
   * (e.g. a previously iterated-on pool contains coins[obscureUsd, usdt], and both
   * coins have a non-null usdPrice value; if the currently interated-on pool contains
   * coins[obscureUsd, usdc] and obscureUsd's usdPrice is null, use the other instance
   * of obscureUsd to fill in its usdPrice in the currently iterated-on pool)
   */
  const otherPoolsCoinsAddressesAndPricesMap = arrayToHashmap(flattenArray(otherPools.map((pool) => (
    (pool.coins && pool.usdTotal > 5000) ?
      pool.coins.filter(({ usdPrice }) => usdPrice !== null) :
      [] // Pools at higher indices do not have a coins prop yet
  ).map(({ address, usdPrice }) => [address, usdPrice]))));

  const canUseSameCoinPriceInOtherPool = coins.some(({ address, usdPrice }) => (
    usdPrice === null &&
    otherPoolsCoinsAddressesAndPricesMap[address]
  ));

  if (canUseSameCoinPriceInOtherPool) {
    if (LOG_DEBUG) console.log('Missing coin price: using method 2 to derive price', poolInfo.id);

    return (
      coins.map((coin) => (
        coin.usdPrice === null ? {
          ...coin,
          usdPrice: (otherPoolsCoinsAddressesAndPricesMap[coin.address] || null),
        } : coin
      ))
    );
  }

  /**
   * Method 3: At least one coin price is known, and the rates between all coins in
   * the pool are known, allowing us to derive all other coins prices.
   */
  const canUseInternalPriceOracle = (
    internalPoolPrices.length > 0 &&
    coins.filter(({ usdPrice }) => usdPrice !== null).length >= 1 &&
    poolInfo.totalSupply > 0 // Don't operate on empty pools because their rates will be unrepresentative
  );

  if (canUseInternalPriceOracle) {
    if (LOG_DEBUG) console.log('Missing coin price: using method 3 to derive price', poolInfo.id);
    const coinWithKnownPrice = coins.find(({ usdPrice }) => usdPrice !== null);
    const coinWithKnownPriceIndex = coins.indexOf(coinWithKnownPrice);

    return (
      coins.map((coin, coinIndex) => {
        if (coin.usdPrice !== null) return coin;

        const internalPoolPriceData = internalPoolPrices.find(({ i, j }) => (
          i === coinIndex && j === coinWithKnownPriceIndex
        ));
        if (!internalPoolPriceData) { // Should never happen
          throw new Error(`internalPoolPriceData not found for indices (${coinWithKnownPriceIndex}, ${coinIndex}) in pool ${poolInfo.id}`);
        }

        const usdPrice = (
          internalPoolPriceData.i === coinWithKnownPriceIndex ?
            (coinWithKnownPrice.usdPrice / internalPoolPriceData.rate) :
            (coinWithKnownPrice.usdPrice * internalPoolPriceData.rate)
        );

        return {
          ...coin,
          usdPrice,
        };
      })
    );
  }

  /**
   * Method 4: Same as method 2, with values from other registries' pools instead of
   * values from other pools in the same registry.
   */
  const canUseOtherPoolBaseLpTokenPrice = coins.some(({ address, usdPrice }) => (
    usdPrice === null &&
    otherRegistryTokensPricesMap[address.toLowerCase()]
  ));

  if (canUseOtherPoolBaseLpTokenPrice) {
    if (LOG_DEBUG) console.log('Missing coin price: using method 4 to derive price', poolInfo.id);

    return (
      coins.map((coin) => (
        coin.usdPrice === null ? {
          ...coin,
          usdPrice: (otherRegistryTokensPricesMap[coin.address.toLowerCase()] || null),
        } : coin
      ))
    );
  }

  /**
   * Method 5: Same as method 4, with base pools lp token prices instead coins prices.
   */
  const canUseMainPoolBaseLpTokenPrice = coins.some(({ address, usdPrice }) => (
    usdPrice === null &&
    mainRegistryLpTokensPricesMap[address.toLowerCase()]
  ));

  if (canUseMainPoolBaseLpTokenPrice) {
    if (LOG_DEBUG) console.log('Missing coin price: using method 5 to derive price', poolInfo.id);

    return (
      coins.map((coin) => (
        coin.usdPrice === null ? {
          ...coin,
          usdPrice: (mainRegistryLpTokensPricesMap[coin.address.toLowerCase()] || null),
        } : coin
      ))
    );
  }

  return coins;
};

const deriveMissingCoinPrices = async ({
  blockchainId,
  registryId,
  coins,
  poolInfo,
  otherPools,
  internalPoolPrices,
  mainRegistryLpTokensPricesMap,
  otherRegistryTokensPricesMap,
}) => {
  let iteration = 0;
  let augmentedCoins = coins;

  while (
    augmentedCoins.some(({ usdPrice }) => usdPrice === null) &&
    iteration + 1 < MAX_PASSES
  ) {
    iteration += 1;

    // eslint-disable-next-line no-await-in-loop
    augmentedCoins = await deriveMissingCoinPricesSinglePass({
      blockchainId,
      registryId,
      coins: augmentedCoins,
      poolInfo,
      otherPools,
      internalPoolPrices,
      mainRegistryLpTokensPricesMap,
      otherRegistryTokensPricesMap,
    });
  }

  return augmentedCoins;
};

export {
  getImplementation,
  deriveMissingCoinPrices,
};
