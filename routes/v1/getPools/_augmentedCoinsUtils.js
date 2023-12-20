import allCoins from '#root/constants/coins/index.js'
import { deriveMissingCoinPrices } from '#root/routes/v1/getPools/_utils.js';
import { lc } from '#root/utils/String.js';

const isDefinedCoin = (address) => address !== '0x0000000000000000000000000000000000000000';

const getAugmentedCoinsFirstPass = async ({
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
}) => {
  let augmentedCoins;
  if (!USE_CURVE_PRICES_DATA) {
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

    augmentedCoins = await deriveMissingCoinPrices({
      blockchainId,
      registryId,
      coins,
      poolInfo,
      otherPools: wipMergedPoolData,
      internalPoolPrices: internalPoolsPrices[poolInfo.id] || [], //
      mainRegistryLpTokensPricesMap, //
      otherRegistryTokensPricesMap, //
    });
  } else {
    const coins = poolInfo.coinsAddresses
      .filter(isDefinedCoin)
      .map((coinAddress) => {
        const key = `${poolInfo.id}-${coinAddress}`;

        return {
          ...mergedCoinData[key],
          usdPrice: (
            mergedCoinData[key]?.usdPrice !== null ? mergedCoinData[key]?.usdPrice :
              typeof missingCoinPrices[lc(coinAddress)] !== 'undefined' ? missingCoinPrices[lc(coinAddress)] :
                null
          ),
        };
      });

    augmentedCoins = await deriveMissingCoinPrices({
      blockchainId,
      registryId,
      coins,
      poolInfo,
      otherPools: wipMergedPoolData,
      internalPoolPrices: internalPoolsPrices[poolInfo.id] || [],
      mainRegistryLpTokensPricesMap: {}, // Sunset
      otherRegistryTokensPricesMap: {}, // Sunset
    });
  }

  return augmentedCoins;
};

// Only used for USE_CURVE_PRICES_DATA === false
const getAugmentedCoinsSecondPass = async ({
  USE_CURVE_PRICES_DATA,
  poolInfo,
  blockchainId,
  registryId,
  wipMergedPoolData,
  internalPoolsPrices,
  mainRegistryLpTokensPricesMap,
  otherRegistryTokensPricesMap,
  missingCoinPrices,
}) => {
  if (USE_CURVE_PRICES_DATA) return poolInfo.coins;

  const coins = poolInfo.coins.map((coinData) => ({
    ...coinData,
    usdPrice: (
      coinData.usdPrice !== null ? coinData.usdPrice :
        typeof missingCoinPrices[lc(coinData.address)] !== 'undefined' ? missingCoinPrices[lc(coinData.address)] :
          null
    ),
  }));

  const augmentedCoins = await deriveMissingCoinPrices({
    blockchainId,
    registryId,
    coins,
    poolInfo,
    otherPools: wipMergedPoolData,
    internalPoolPrices: internalPoolsPrices[poolInfo.id] || [], //
    mainRegistryLpTokensPricesMap, //
    otherRegistryTokensPricesMap, //
  });

  return augmentedCoins;
};

export {
  getAugmentedCoinsFirstPass,
  getAugmentedCoinsSecondPass,
};
