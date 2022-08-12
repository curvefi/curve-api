import memoize from 'memoizee';
import { flattenArray, arrayToHashmap } from 'utils/Array';
import Request from 'utils/Request';
import { IS_DEV, BASE_API_DOMAIN } from 'constants/AppConstants';

// Can be increased if needed, "3" is currently the max we've needed based on situations
// where coins were missing prices that we've encountered so far.
const MAX_PASSES = 4;

const getMainRegistryPools = memoize(async (blockchainId) => (
  (await (await Request.get(`${BASE_API_DOMAIN}/api/getPools/${blockchainId}/main`)).json()).data.poolData
), {
  promise: true,
  maxAge: 60 * 60 * 1000, // 1h
  length: 1,
});

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
  /**
   * Method 1: A coin's price is unknown, another one is known. Use the known price,
   * alongside the price oracle, to derive the other coin's price. Alternatively, use
   * 1 as the price oracle value in the case of stable pools in the main registry.
   *
   * Note: The current logic is simplistic, and only allows filling in the blanks when
   * a pool is missing a single coin's price at index 0 or 1. Let's improve it later
   * if more is necessary.
   */
  const canUsePriceOracle = (
    coins.filter(({ usdPrice }) => usdPrice === null).length === 1 &&
    (coins.length === 2 || coins.findIndex(({ usdPrice }) => usdPrice === null) < 2) &&
    (!!poolInfo.priceOracle) &&
    poolInfo.totalSupply > 0 // Don't operate on empty pools because their rates will be unrepresentative
  );

  if (canUsePriceOracle) {
    if (IS_DEV) console.log('Missing coin price: using method 1 to derive price', poolInfo.id);

    /**
     * Main pools are stable and without too-risky coins, so we can approximate 1:1;
     * a better alternative would be to use get_dy(0, 1, small_unit) but it's prone to
     * reverts in extreme but not so rare occasions, so the little added precision
     * doesn't seem worth the brittleness.
     */
    const priceOracle = registryId === 'main' ? 1 : poolInfo.priceOracle;

    return (
      coins.map((coin, i) => (
        coin.usdPrice === null ? {
          ...coin,
          usdPrice: (
            i === 0 ?
              (coins[1].usdPrice / priceOracle) :
              (coins[0].usdPrice * priceOracle)
          ),
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
    pool.coins ?
      pool.coins.filter(({ usdPrice }) => usdPrice !== null) :
      [] // Pools at higher indices do not have a coins prop yet
  ).map(({ address, usdPrice }) => [address, usdPrice]))));

  const canUseSameCoinPriceInOtherPool = coins.some(({ address, usdPrice }) => (
    usdPrice === null &&
    otherPoolsCoinsAddressesAndPricesMap[address]
  ));

  if (canUseSameCoinPriceInOtherPool) {
    if (IS_DEV) console.log('Missing coin price: using method 2 to derive price', poolInfo.id);

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
    if (IS_DEV) console.log('Missing coin price: using method 3 to derive price', poolInfo.id);
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
    if (IS_DEV) console.log('Missing coin price: using method 4 to derive price', poolInfo.id);

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
   * *This method probably never kicks in anymore because superseded by the above,
   * leaving it here just in case for now*
   * Method 4.old: Same as method 2, with values from main registry pools instead of
   * values from other pools in the same registry.
   */
  const canFetchMoreDataFromMainRegistry = registryId !== 'main';
  if (canFetchMoreDataFromMainRegistry) {
    const mainRegistryPools = await getMainRegistryPools(blockchainId);

    const mainPoolsCoinsAddressesAndPricesMap = arrayToHashmap(flattenArray(mainRegistryPools.map((pool) => (
      pool.coins.filter(({ usdPrice }) => usdPrice !== null)
    ).map(({ address, usdPrice }) => [address.toLowerCase(), usdPrice]))));

    const canUseSameCoinPriceInMainPool = coins.some(({ address, usdPrice }) => (
      usdPrice === null &&
      mainPoolsCoinsAddressesAndPricesMap[address]
    ));

    if (canUseSameCoinPriceInMainPool) {
      if (IS_DEV) console.log('Missing coin price: using method 4.b to derive price', poolInfo.id);

      return (
        coins.map((coin) => (
          coin.usdPrice === null ? {
            ...coin,
            usdPrice: (mainPoolsCoinsAddressesAndPricesMap[coin.address.toLowerCase()] || null),
          } : coin
        ))
      );
    }
  }

  /**
   * Method 5: Same as method 4, with base pools lp token prices instead coins prices.
   */
  const canUseMainPoolBaseLpTokenPrice = coins.some(({ address, usdPrice }) => (
    usdPrice === null &&
    mainRegistryLpTokensPricesMap[address.toLowerCase()]
  ));

  if (canUseMainPoolBaseLpTokenPrice) {
    if (IS_DEV) console.log('Missing coin price: using method 5 to derive price', poolInfo.id);

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
  deriveMissingCoinPrices,
};
