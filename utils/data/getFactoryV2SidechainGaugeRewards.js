import Web3 from 'web3';
import partition from 'lodash.partition';
import groupBy from 'lodash.groupby';
import memoize from 'memoizee';
import { multiCall } from '#root/utils/Calls.js';
import { flattenArray, uniq, arrayToHashmap } from '#root/utils/Array.js';
import { getNowTimestamp } from '#root/utils/Date.js';
import getTokensPrices from '#root/utils/data/tokens-prices.js';
import getAssetsPrices from '#root/utils/data/assets-prices.js';
import configs from '#root/constants/configs/index.js'
import ERC20_ABI from '#root/constants/abis/erc20.json' assert { type: 'json' };
import SIDECHAIN_FACTO_GAUGE_ABI from '#root/constants/abis/sidechain-gauge.json' assert { type: 'json' };
import COIN_ADDRESS_COINGECKO_ID_MAP from '#root/constants/CoinAddressCoingeckoIdMap.js';
import COIN_ADDRESS_REPLACEMENT_MAP from '#root/constants/CoinAddressReplacementMap.js';

export default memoize(async ({ blockchainId, gauges }) => {
  const config = configs[blockchainId];
  if (typeof config === 'undefined') {
    throw new Error(`No factory data for blockchainId "${blockchainId}"`);
  }

  const multicallNetworkSettings = {
    web3: new Web3(config.rpcUrl),
    multicall2Address: config.multicall2Address,
  };

  let sidechainOnlyFactoryGauges = gauges;

  if (typeof sidechainOnlyFactoryGauges === 'undefined') {
    throw new Error('sidechainOnlyFactoryGauges is undefined in getFactoryV2SidechainGaugeRewards()');
  }

  const gaugesData = await multiCall(flattenArray(sidechainOnlyFactoryGauges.map(({
    name,
    gauge,
    lpTokenPrice,
  }) => [{
    address: gauge,
    abi: SIDECHAIN_FACTO_GAUGE_ABI,
    methodName: 'reward_count',
    metaData: { name, gauge, lpTokenPrice, type: 'rewardCount' },
    networkSettings: multicallNetworkSettings,
  }, {
    address: gauge,
    abi: ERC20_ABI,
    methodName: 'totalSupply',
    metaData: { name, gauge, lpTokenPrice, type: 'totalSupply' },
    networkSettings: multicallNetworkSettings,
  }])));

  const [gaugesRewardCount, gaugesTotalSupply] =
    partition(gaugesData, ({ metaData: { type } }) => type === 'rewardCount');

  const rewardTokens = await multiCall(flattenArray(gaugesRewardCount.map(({
    data: rewardCount,
    metaData: { name, gauge, lpTokenPrice },
  }) => (
    [...Array(Number(rewardCount)).keys()].map((rewardIndex) => ({
      address: gauge,
      abi: SIDECHAIN_FACTO_GAUGE_ABI,
      methodName: 'reward_tokens',
      params: [rewardIndex],
      metaData: { name, gauge, lpTokenPrice },
      networkSettings: multicallNetworkSettings,
    }))
  ))));

  const rewardTokenAddresses = rewardTokens.map(({ data: rewardTokenAddress }) => (
    rewardTokenAddress
  ));

  const coinAddressesAndPricesMap = await getTokensPrices(uniq(rewardTokenAddresses), blockchainId);

  const coinsFallbackPrices = (
    COIN_ADDRESS_COINGECKO_ID_MAP[blockchainId] ?
      await getAssetsPrices(Array.from(Object.values(COIN_ADDRESS_COINGECKO_ID_MAP[blockchainId]))) :
      {}
  );
  const coinAddressesAndPricesMapFallback = (
    COIN_ADDRESS_COINGECKO_ID_MAP[blockchainId] ?
      arrayToHashmap(
        Array.from(Object.entries(COIN_ADDRESS_COINGECKO_ID_MAP[blockchainId]))
          .map(([address, coingeckoId]) => [
            address.toLowerCase(),
            coinsFallbackPrices[coingeckoId],
          ])
      ) :
      {}
  );

  const rewardAndTokenData = await multiCall(flattenArray(rewardTokens.map(({
    data: rewardTokenAddress,
    metaData: { name, gauge, lpTokenPrice },
  }) => [{
    address: gauge,
    abi: SIDECHAIN_FACTO_GAUGE_ABI,
    methodName: 'reward_data',
    params: [rewardTokenAddress],
    metaData: { name, gauge, lpTokenPrice, rewardTokenAddress, type: 'rewardData' },
    networkSettings: multicallNetworkSettings,
  }, {
    address: rewardTokenAddress,
    abi: ERC20_ABI,
    methodName: 'name',
    metaData: { name, gauge, lpTokenPrice, rewardTokenAddress, type: 'name' },
    networkSettings: multicallNetworkSettings,
  }, {
    address: rewardTokenAddress,
    abi: ERC20_ABI,
    methodName: 'symbol',
    metaData: { name, gauge, lpTokenPrice, rewardTokenAddress, type: 'symbol' },
    networkSettings: multicallNetworkSettings,
  }, {
    address: rewardTokenAddress,
    abi: ERC20_ABI,
    methodName: 'decimals',
    metaData: { name, gauge, lpTokenPrice, rewardTokenAddress, type: 'decimals' },
    networkSettings: multicallNetworkSettings,
  }])));

  const [rewardData, tokenData] =
    partition(rewardAndTokenData, ({ metaData: { type } }) => type === 'rewardData');

  const nowTimestamp = getNowTimestamp();
  const rewardsInfo = rewardData.map(({
    data: {
      period_finish: periodFinish,
      1: periodFinishFallback,
      rate,
      2: rateFallback,
    },
    metaData: { name, gauge, lpTokenPrice, rewardTokenAddress },
  }) => {
    const effectiveRate = typeof rate !== 'undefined' ? rate : rateFallback;
    const effectivePeriodFinish = Number(typeof periodFinish !== 'undefined' ? periodFinish : periodFinishFallback);
    const isRewardStillActive = effectivePeriodFinish > nowTimestamp;
    const totalSupply = gaugesTotalSupply.find(({ metaData }) => metaData.gauge === gauge).data / 1e18;
    const tokenName = tokenData.find(({ metaData }) => metaData.rewardTokenAddress === rewardTokenAddress && metaData.name === name && metaData.type === 'name').data;
    const tokenSymbol = tokenData.find(({ metaData }) => metaData.rewardTokenAddress === rewardTokenAddress && metaData.name === name && metaData.type === 'symbol').data;
    const tokenDecimals = tokenData.find(({ metaData }) => metaData.rewardTokenAddress === rewardTokenAddress && metaData.name === name && metaData.type === 'decimals').data;

    const effectiveTokenRewardAddressForPrice = (
      COIN_ADDRESS_REPLACEMENT_MAP[blockchainId]?.[rewardTokenAddress.toLowerCase()] ||
      rewardTokenAddress.toLowerCase()
    );

    const tokenPrice = (
      coinAddressesAndPricesMap[effectiveTokenRewardAddressForPrice] ||
      coinAddressesAndPricesMapFallback[effectiveTokenRewardAddressForPrice] ||
      null
    );

    return {
      gaugeAddress: gauge.toLowerCase(),
      tokenAddress: rewardTokenAddress,
      tokenPrice,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
      apyData: {
        isRewardStillActive,
        tokenPrice,
        rate: effectiveRate / (10 ** tokenDecimals),
        totalSupply,
      },
      apy: (
        isRewardStillActive ?
          (effectiveRate) / (10 ** tokenDecimals) * 86400 * 365 * tokenPrice / totalSupply / lpTokenPrice * 100 :
          0
      ),
      metaData: {
        rate: effectiveRate,
        periodFinish: effectivePeriodFinish,
      },
    };
  });

  return groupBy(rewardsInfo, 'gaugeAddress');
}, {
  promise: true,
  maxAge: 2 * 60 * 1000, // 2 min
  normalizer: ([{ blockchainId, gauges }]) => `${blockchainId}-${gauges?.length}`,
});
