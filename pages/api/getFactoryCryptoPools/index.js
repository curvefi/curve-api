import Web3 from 'web3';
import { fn } from 'utils/api';
import factoryCryptoRegistryAbi from 'constants/abis/factory-crypto-registry.json';
import factoryPoolAbi from 'constants/abis/factory-crypto/factory-crypto-pool-2.json';
import erc20Abi from 'constants/abis/erc20.json';
import erc20AbiMKR from 'constants/abis/erc20_mkr.json';

import { multiCall } from 'utils/Calls';
import { flattenArray, sum, arrayToHashmap } from 'utils/Array';
import getTokensPrices from 'utils/data/tokens-prices';
import getAssetsPrices from 'utils/data/assets-prices';
import getFactoryV2GaugeRewards from 'utils/data/getFactoryV2GaugeRewards';
import getMainRegistryPools from 'pages/api/getMainRegistryPools';
import getGauges from 'pages/api/getGauges';
import { IS_DEV } from 'constants/AppConstants';
import configs from 'constants/configs';
import allCoins from 'constants/coins';

const POOL_BALANCE_ABI = [{ "gas": 1823, "inputs": [ { "name": "arg0", "type": "uint256" } ], "name": "balances", "outputs": [ { "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }];

const getEthereumOnlyData = async () => {
  const [
    { poolList: mainRegistryPoolList },
    { gauges: gaugesData },
    gaugeRewards,
  ] = await Promise.all([
    getMainRegistryPools.straightCall(),
    getGauges.straightCall(),
    getFactoryV2GaugeRewards(),
  ]);

  const gaugesDataArray = Array.from(Object.values(gaugesData));

  return {
    mainRegistryPoolList: mainRegistryPoolList.map((address) => address.toLowerCase()),
    gaugesDataArray,
    gaugeRewards,
  };
}

export default fn(async ({ blockchainId }) => {
  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum'; // Default value

  const config = configs[blockchainId];
  if (typeof config === 'undefined') {
    throw new Error(`No factory data for blockchainId "${blockchainId}"`);
  }

  const {
    nativeCurrencySymbol,
    nativeCurrencyCoingeckoId,
    nativeAssetErc20WrapperId,
    platformCoingeckoId,
    rpcUrl,
    factoryImplementationAddressMap: implementationAddressMap,
    getFactoryCryptoRegistryAddress,
    multicallAddress,
  } = config;

  if (typeof getFactoryCryptoRegistryAddress === 'undefined') {
    throw new Error(`No crypto factory data for blockchainId "${blockchainId}"`);
  }

  const registryAddress = await getFactoryCryptoRegistryAddress();
  const web3 = new Web3(rpcUrl);
  const registry = new web3.eth.Contract(factoryCryptoRegistryAbi, registryAddress);

  const networkSettingsParam = (
    typeof multicallAddress !== 'undefined' ?
      { networkSettings: { web3, multicallAddress } } :
      {}
  );

  const poolCount = Number(await registry.methods.pool_count().call());
  if (poolCount === 0) return { poolData: [], tvlAll: 0, tvl: 0 };

  const poolIds = Array(poolCount).fill(0).map((_, i) => i);

  let poolAddresses = await multiCall(poolIds.map((id) => ({
    contract: registry,
    methodName: 'pool_list',
    params: [id],
    ...networkSettingsParam,
  })));

  const ethereumOnlyData = blockchainId === 'ethereum' ?
    await getEthereumOnlyData() :
    undefined;

  const poolData = await multiCall(flattenArray(poolAddresses.map((address, id) => {
    const poolContract = new web3.eth.Contract(factoryPoolAbi, address);

    return [{
      contract: registry,
      methodName: 'get_coins', // address[4]
      params: [address],
      metaData: { poolId: id, type: 'coinsAddresses' },
      ...networkSettingsParam,
    }, {
      contract: registry,
      methodName: 'get_decimals', // address[4]
      params: [address],
      metaData: { poolId: id, type: 'decimals' },
      ...networkSettingsParam,
    }, {
      contract: registry,
      methodName: 'pool_implementation', // address
      metaData: { poolId: id, type: 'implementationAddress' },
      ...networkSettingsParam,
    }, {
      contract: registry,
      methodName: 'get_token', // address
      params: [address],
      metaData: { poolId: id, type: 'lpTokenAddress' },
      ...networkSettingsParam,
    }, {
      contract: poolContract,
      methodName: 'price_oracle', // uint256
      metaData: { poolId: id, type: 'priceOracle' },
      ...networkSettingsParam,
    }];
  })));

  const lpTokensWithMetadata = poolData.filter(({ metaData }) => metaData.type === 'lpTokenAddress');
  const lpTokenData = await multiCall(flattenArray(lpTokensWithMetadata.map(({
    data: address,
    metaData,
  }, id) => {
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
  })));

  const augmentedPoolData = [
    ...poolData,
    ...lpTokenData,
  ];

  const allCoinAddresses = augmentedPoolData.reduce((accu, { data, metaData: { poolId, type } }) => {
    if (type === 'coinsAddresses') {
      const poolCoins = data.filter((address) => address !== '0x0000000000000000000000000000000000000000');
      return accu.concat(poolCoins.map((address) => ({ poolId, address })));
    }

    return accu;
  }, []);

  const coinAddressesAndPricesMap =
    await getTokensPrices(allCoinAddresses.map(({ address }) => address), platformCoingeckoId);

  let coinData = await multiCall(flattenArray(allCoinAddresses.map(({ poolId, address }) => {
    // In crypto facto pools, native eth is represented as weth
    const isNativeEth = address.toLowerCase() === allCoins[config.nativeAssetErc20WrapperId].address.toLowerCase();
    const coinContract = isNativeEth ? undefined :
    address.toLowerCase() === '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2' ? new web3.eth.Contract(erc20AbiMKR, address) :
    new web3.eth.Contract(erc20Abi, address);

    const poolAddress = poolAddresses[poolId];
    const poolContract = new web3.eth.Contract(POOL_BALANCE_ABI, poolAddress);
    const coinIndex = augmentedPoolData.find(({ metaData }) => (
      metaData.type === 'coinsAddresses' &&
      metaData.poolId === poolId
    )).data.indexOf(address);

    return [...(isNativeEth ? [{
      contract: poolContract,
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
      contract: coinContract,
      methodName: 'balanceOf',
      params: [poolAddress],
      metaData: { poolId, poolAddress, coinAddress: address, isNativeEth, type: 'poolBalance' },
      ...networkSettingsParam,
    }])];
  })));

  const mergedCoinData = coinData.reduce((accu, { data, metaData: { poolId, poolAddress, coinAddress, type, isNativeEth } }) => {
    const key = `factory-crypto-${poolId}-${coinAddress}`;
    const coinInfo = accu[key];
    const coinPrice = (
      coinAddressesAndPricesMap[coinAddress.toLowerCase()] ||
      0
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
      ...(type === 'poolStakedBalance' ?
        { poolBalance: Number(coinInfo.poolBalance) + Number(data) } :
        { [type]: data }
      ),
      ...(isNativeEth ? hardcodedInfoForNativeEth : {}),
    };

    return accu;
  }, {});

  const emptyData = poolIds.map((id) => ({ id: `factory-crypto-${id}` }));
  const mergedPoolData = augmentedPoolData.reduce((accu, { data, metaData: { poolId, type } }) => {
    const poolInfo = accu[poolId];

    // eslint-disable-next-line no-param-reassign
    accu[poolId] = {
      ...poolInfo,
      address: poolAddresses[poolId],
      [type]: (
        type === 'priceOracle' ?
          (data / 1e18) :
          data
      ),
    };

    return accu;
  }, emptyData);

  const augmentedData = mergedPoolData.map((poolInfo) => {
    const coins = poolInfo.coinsAddresses
      .filter((address) => address !== '0x0000000000000000000000000000000000000000')
      .map((coinAddress) => {
        const key = `${poolInfo.id}-${coinAddress}`;

        return {
          ...mergedCoinData[key],
          usdPrice: mergedCoinData[key]?.usdPrice || null,
        };
      });

    // The current logic is simple, and only allows filling in the blanks when
    // a pool with 2 coins is missing a single's coin price. Let's improve it later
    // if other situations where more is necessary arise.
    const canFixCoinPricesThatNeedIt = coins.length === 2 && coins.filter(({ usdPrice }) => usdPrice === null);
    const augmentedCoins = (
      canFixCoinPricesThatNeedIt ? (
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
      ) : coins
    );

    const usdTotal = sum(augmentedCoins.map(({ usdPrice, poolBalance, decimals }) => (
      poolBalance / (10 ** decimals) * usdPrice
    )));

    const gaugeAddress = typeof ethereumOnlyData !== 'undefined' ?
      ethereumOnlyData.gaugesDataArray.find(({ swap }) => swap.toLowerCase() === poolInfo.address.toLowerCase())?.gauge?.toLowerCase() :
      undefined;
    const gaugeRewardsInfo = gaugeAddress ? ethereumOnlyData.gaugeRewards[gaugeAddress] : undefined;

    return {
      ...poolInfo,
      coins: augmentedCoins,
      usdTotal,
      gaugeAddress,
      gaugeRewards: gaugeRewardsInfo,
    };
  });

  return {
    poolData: augmentedData,
    tvlAll: sum(augmentedData.map(({ usdTotal }) => usdTotal)),
    ...(typeof ethereumOnlyData !== 'undefined' ? {
      tvl: sum(
        augmentedData
          .filter(({ address }) => !ethereumOnlyData.mainRegistryPoolList.includes(address.toLowerCase()))
          .map(({ usdTotal }) => usdTotal)
      ),
    } : {}),
  };
}, {
  maxAge: 60,
});
