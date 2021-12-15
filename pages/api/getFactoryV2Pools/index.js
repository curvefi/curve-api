import Web3 from 'web3';
import { fn } from 'utils/api';
import factoryV2RegistryAbi from 'constants/abis/factory-v2-registry.json';
import factoryPoolAbi from 'constants/abis/factory-v2/Plain2Balances.json';
import erc20Abi from 'constants/abis/erc20.json';
import { multiCall } from 'utils/Calls';
import { flattenArray, sum, arrayToHashmap } from 'utils/Array';
import getTokensPrices from 'utils/data/tokens-prices';
import getAssetsPrices from 'utils/data/assets-prices';
import getFactoryV2GaugeRewards from 'utils/data/getFactoryV2GaugeRewards';
import getMainRegistryPools from 'pages/api/getMainRegistryPools';
import getGauges from 'pages/api/getGauges';
import { IS_DEV } from 'constants/AppConstants';
import configs from 'constants/configs';

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
  const factoryGaugesPoolAddressesAndCoingeckoIdMap = arrayToHashmap(
    gaugesDataArray
      .filter(({ factory }) => factory === true)
      .map(({ swap, type: coingeckoId }) => [swap, coingeckoId])
    );

  const gaugesAssetPrices = await getAssetsPrices(Array.from(Object.values(factoryGaugesPoolAddressesAndCoingeckoIdMap)));
  const factoryGaugesPoolAddressesAndAssetPricesMap = arrayToHashmap(
    Array.from(Object.entries(factoryGaugesPoolAddressesAndCoingeckoIdMap))
      .map(([address, coingeckoId], i) => [
        address.toLowerCase(),
        gaugesAssetPrices[coingeckoId]
      ])
  );

  return {
    mainRegistryPoolList: mainRegistryPoolList.map((address) => address.toLowerCase()),
    gaugesDataArray,
    gaugeRewards,
    factoryGaugesPoolAddressesAndAssetPricesMap,
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
    platformCoingeckoId,
    rpcUrl,
    factoryImplementationAddressMap: implementationAddressMap,
    getFactoryRegistryAddress,
    multicallAddress,
    BASE_POOL_LP_TO_GAUGE_LP_MAP,
  } = config;

  const assetTypeMap = new Map([
    ['0', 'usd'],
    ['1', nativeCurrencySymbol.toLowerCase()],
    ['2', 'btc'],
    ['3', 'other'],
  ]);

  const assetTypesCoingeckoIds = [
    'dollar',
    nativeCurrencyCoingeckoId,
    'bitcoin',
    'other',
  ];

  const registryAddress = await getFactoryRegistryAddress();
  const web3 = new Web3(rpcUrl);
  const registry = new web3.eth.Contract(factoryV2RegistryAbi, registryAddress);

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

  const assetTypePricesMapPromise = new Promise(async (resolve) => {
    const coingeckoIdsToFetch = assetTypesCoingeckoIds.filter((id) => id !== 'dollar' && id !== 'other');
    const prices = await getAssetsPrices(coingeckoIdsToFetch);

    resolve([
      1,
      ...coingeckoIdsToFetch.map((id) => prices[id]),
      0,
    ]);
  });

  const poolData = await multiCall(flattenArray(poolAddresses.map((address, id) => {
    const poolContract = new web3.eth.Contract(factoryPoolAbi, address);

    // Note: reverting for at least some pools, prob non-meta ones: get_underlying_coins, get_underlying_decimals
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
      methodName: 'get_underlying_decimals', // address[8]
      params: [address],
      metaData: { poolId: id, type: 'underlyingDecimals' },
      ...networkSettingsParam,
    }, {
      contract: registry,
      methodName: 'get_implementation_address', // address
      params: [address],
      metaData: { poolId: id, type: 'implementationAddress' },
      ...networkSettingsParam,
    }, {
      contract: registry,
      methodName: 'get_pool_asset_type', // uint256
      params: [address],
      metaData: { poolId: id, type: 'assetType' },
      ...networkSettingsParam,
    }, {
      contract: poolContract,
      methodName: 'name',
      metaData: { poolId: id, type: 'name' },
      ...networkSettingsParam,
    }, {
      contract: poolContract,
      methodName: 'symbol',
      metaData: { poolId: id, type: 'symbol' },
      ...networkSettingsParam,
    }, {
      contract: poolContract,
      methodName: 'totalSupply',
      metaData: { poolId: id, type: 'totalSupply' },
      ...networkSettingsParam,
    }];
  })));

  const tweakedPoolData = (
    typeof BASE_POOL_LP_TO_GAUGE_LP_MAP !== 'undefined' ?
      // Fix coinsAddresses that's missing the lp token on factory registry
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

  const allCoinAddresses = tweakedPoolData.reduce((accu, { data, metaData: { poolId, type } }) => {
    if (type === 'coinsAddresses') {
      const poolCoins = data.filter((address) => address !== '0x0000000000000000000000000000000000000000');
      return accu.concat(poolCoins.map((address) => ({ poolId, address })));
    }

    return accu;
  }, []);

  const coinAddressesAndPricesMap =
    await getTokensPrices(allCoinAddresses.map(({ address }) => address), platformCoingeckoId);

  let coinData = await multiCall(flattenArray(allCoinAddresses.map(({ poolId, address }) => {
    const isNativeEth = address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const coinContract = isNativeEth ? undefined : new web3.eth.Contract(erc20Abi, address);

    const poolAddress = poolAddresses[poolId];
    const poolContract = new web3.eth.Contract(POOL_BALANCE_ABI, poolAddress);
    const coinIndex = poolData.find(({ metaData }) => (
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
    }]), ...(
      (typeof BASE_POOL_LP_TO_GAUGE_LP_MAP !== 'undefined' && BASE_POOL_LP_TO_GAUGE_LP_MAP.has(address)) ?
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

  if (blockchainId === 'fantom' || blockchainId === 'avalanche') {
    (coinData.find(x => x.data === 'USDL Stablecoin')) ? coinData.find(x => x.data === 'USDL Stablecoin').data = 'USDL' : ''
    (coinData.find(x => x.data === 'Fantom-L')) ? coinData.find(x => x.data === 'Fantom-L').data = 'FTM-L' : ''
  }


  const mergedCoinData = coinData.reduce((accu, { data, metaData: { poolId, poolAddress, coinAddress, type, isNativeEth } }) => {
    const key = `factory-v2-${poolId}-${coinAddress}`;
    const coinInfo = accu[key];
    const coinPrice = (
      coinAddressesAndPricesMap[coinAddress.toLowerCase()] ||
      ethereumOnlyData?.factoryGaugesPoolAddressesAndAssetPricesMap?.[poolAddress.toLowerCase()] ||
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

  const emptyData = poolIds.map((id) => ({ id: `factory-v2-${id}` }));
  const mergedPoolData = tweakedPoolData.reduce((accu, { data, metaData: { poolId, type } }) => {
    const poolInfo = accu[poolId];

    // eslint-disable-next-line no-param-reassign
    accu[poolId] = {
      ...poolInfo,
      address: poolAddresses[poolId],
      [type]: data,
    };

    return accu;
  }, emptyData);

  const assetTypePricesMap = await assetTypePricesMapPromise;
  const augmentedData = mergedPoolData.map((poolInfo) => {
    const implementation = implementationAddressMap.get(poolInfo.implementationAddress.toLowerCase());

    const isUsdMetaPool = implementation.startsWith('metausd') || implementation.startsWith('v1metausd');
    const isBtcMetaPool = implementation.startsWith('metabtc') || implementation.startsWith('v1metabtc');

    // We derive asset type (i.e. used as the reference asset on the FE) from pool implementation if possible,
    // and fall back to the assetType prop.
    const assetTypeName = (
      (implementation === 'plain2eth' || implementation === 'plain3eth' || implementation === 'plain4eth') ? nativeCurrencySymbol.toLowerCase() :
      isBtcMetaPool ? 'btc' :
      isUsdMetaPool ? 'usd' :
      assetTypeMap.get(poolInfo.assetType)
    );

    const assetTypeIndex = Array.from(assetTypeMap.values()).indexOf(assetTypeName);
    const assetTypePrice = assetTypePricesMap[assetTypeIndex];

    const coins = poolInfo.coinsAddresses
      .filter((address) => address !== '0x0000000000000000000000000000000000000000')
      .map((coinAddress) => {
        const key = `${poolInfo.id}-${coinAddress}`;

        return {
          ...mergedCoinData[key],
          usdPrice: mergedCoinData[key]?.usdPrice || assetTypePrice || 0,
        };
      });

    const usdTotal = sum(coins.map(({ usdPrice, poolBalance, decimals }) => (
      poolBalance / (10 ** decimals) * usdPrice
    )));

    const gaugeAddress = typeof ethereumOnlyData !== 'undefined' ?
      ethereumOnlyData.gaugesDataArray.find(({ swap }) => swap.toLowerCase() === poolInfo.address.toLowerCase())?.gauge?.toLowerCase() :
      undefined;
    const gaugeRewardsInfo = gaugeAddress ? ethereumOnlyData.gaugeRewards[gaugeAddress] : undefined;

    return {
      ...poolInfo,
      implementation,
      assetTypeName,
      coins,
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
