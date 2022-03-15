import memoize from 'memoizee';
import { flattenArray, arrayToHashmap } from 'utils/Array';
import Request from 'utils/Request';
import { IS_DEV, BASE_API_DOMAIN } from 'constants/AppConstants';

// Can be increased if needed, "3" is currently the max we've needed based on situations
// where coins were missing prices that we've encountered so far.
const MAX_PASSES = 3;

const getMainRegistryPools = memoize(async (blockchainId) => (
  (await (await Request.get(`${BASE_API_DOMAIN}/api/getPools/${blockchainId}/main`)).json()).data.poolData
), {
  promise: true,
  maxAge: 60 * 60 * 1000, // 1h
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
}) => {
  /**
   * Method 1: A coin's price is unknown, another one is known. Use the known price,
   * alongside the price oracle, to derive the other coin's price.
   *
   * Note: The current logic is simplistic, and only allows filling in the blanks when
   * a pool is missing a single coin's price at index 0 or 1. Let's improve it later
   * if more is necessary.
   */
  const canUsePriceOracle = (
    coins.filter(({ usdPrice }) => usdPrice === null).length === 1 &&
    (coins.length === 2 || coins.findIndex(({ usdPrice }) => usdPrice === null) < 2) &&
    (!!poolInfo.priceOracle || registryId === 'main')
  );

  if (canUsePriceOracle) {
    if (IS_DEV) console.log('Missing coin price: using method 1 to derive price');

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
    if (IS_DEV) console.log('Missing coin price: using method 2 to derive price');

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
   * Method 3: Same as method 2, with values from main registry pools instead of
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
      if (IS_DEV) console.log('Missing coin price: using method 3 to derive price');

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

  return coins;
};

const deriveMissingCoinPrices = async ({
  blockchainId,
  registryId,
  coins,
  poolInfo,
  otherPools,
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
    });
  }

  return augmentedCoins;
};

export {
  deriveMissingCoinPrices,
};
