import Web3 from 'web3';
import partition from 'lodash.partition';
import groupBy from 'lodash.groupby';
import memoize from 'memoizee';
import { multiCall } from 'utils/Calls';
import { flattenArray, uniq } from 'utils/Array';
import { getNowTimestamp } from 'utils/Date';
import getTokensPrices from 'utils/data/tokens-prices';
import configs from 'constants/configs';
import ERC20_ABI from 'constants/abis/erc20.json';
import SIDECHAIN_FACTO_GAUGE_ABI from 'constants/abis/sidechain-gauge.json';

export default memoize(async ({ blockchainId, gauges }) => {
  const config = configs[blockchainId];
  if (typeof config === 'undefined') {
    throw new Error(`No factory data for blockchainId "${blockchainId}"`);
  }

  const multicallNetworkSettings = {
    web3: new Web3(config.rpcUrl),
    multicall2Address: config.multicall2Address,
  };

  const sidechainOnlyFactoryGauges = gauges;

  if (sidechainOnlyFactoryGauges.length === 0) return {};

  const gaugesData = await multiCall(flattenArray(sidechainOnlyFactoryGauges.map(({
    name,
    gauge,
  }) => [{
    address: gauge,
    abi: SIDECHAIN_FACTO_GAUGE_ABI,
    methodName: 'reward_count',
    metaData: { name, gauge, type: 'rewardCount' },
    networkSettings: multicallNetworkSettings,
  }, {
    address: gauge,
    abi: ERC20_ABI,
    methodName: 'totalSupply',
    metaData: { name, gauge, type: 'totalSupply' },
    networkSettings: multicallNetworkSettings,
  }])));

  const [gaugesRewardCount, gaugesTotalSupply] =
    partition(gaugesData, ({ metaData: { type } }) => type === 'rewardCount');

  const rewardTokens = await multiCall(flattenArray(gaugesRewardCount.map(({
    data: rewardCount,
    metaData: { name, gauge },
  }) => (
    [...Array(Number(rewardCount)).keys()].map((rewardIndex) => ({
      address: gauge,
      abi: SIDECHAIN_FACTO_GAUGE_ABI,
      methodName: 'reward_tokens',
      params: [rewardIndex],
      metaData: { name, gauge },
      networkSettings: multicallNetworkSettings,
    }))
  ))));

  const tokenPricesPromise = getTokensPrices(uniq(rewardTokens.map(({ data: rewardTokenAddress }) => (
    rewardTokenAddress
  ))), config.platformCoingeckoId);

  const rewardAndTokenData = await multiCall(flattenArray(rewardTokens.map(({
    data: rewardTokenAddress,
    metaData: { name, gauge },
  }) => [{
    address: gauge,
    abi: SIDECHAIN_FACTO_GAUGE_ABI,
    methodName: 'reward_data',
    params: [rewardTokenAddress],
    metaData: { name, gauge, rewardTokenAddress, type: 'rewardData' },
    networkSettings: multicallNetworkSettings,
  }, {
    address: rewardTokenAddress,
    abi: ERC20_ABI,
    methodName: 'name',
    metaData: { name, gauge, rewardTokenAddress, type: 'name' },
    networkSettings: multicallNetworkSettings,
  }, {
    address: rewardTokenAddress,
    abi: ERC20_ABI,
    methodName: 'symbol',
    metaData: { name, gauge, rewardTokenAddress, type: 'symbol' },
    networkSettings: multicallNetworkSettings,
  }, {
    address: rewardTokenAddress,
    abi: ERC20_ABI,
    methodName: 'decimals',
    metaData: { name, gauge, rewardTokenAddress, type: 'decimals' },
    networkSettings: multicallNetworkSettings,
  }])));

  const [rewardData, tokenData] =
    partition(rewardAndTokenData, ({ metaData: { type } }) => type === 'rewardData');

  const tokenPrices = await tokenPricesPromise; // Awaiting only here so there's as much work done in parallel as possible

  const nowTimestamp = getNowTimestamp();
  const rewardsInfo = rewardData.map(({
    data: {
      period_finish: periodFinish,
      1: periodFinishFallback,
      rate,
      2: rateFallback,
    },
    metaData: { name, gauge, rewardTokenAddress },
  }) => {
    const effectiveRate = typeof rate !== 'undefined' ? rate : rateFallback;
    const effectivePeriodFinish = Number(typeof periodFinish !== 'undefined' ? periodFinish : periodFinishFallback);
    const isRewardStillActive = effectivePeriodFinish > nowTimestamp;
    const totalSupply = gaugesTotalSupply.find(({ metaData }) => metaData.name === name).data / 1e18;
    const tokenName = tokenData.find(({ metaData }) => metaData.name === name && metaData.type === 'name').data;
    const tokenSymbol = tokenData.find(({ metaData }) => metaData.name === name && metaData.type === 'symbol').data;
    const tokenDecimals = tokenData.find(({ metaData }) => metaData.name === name && metaData.type === 'decimals').data;
    const lcTokenPriceIndex = rewardTokenAddress.toLowerCase();
    const tokenPrice = tokenPrices[lcTokenPriceIndex];

    return {
      gaugeAddress: gauge.toLowerCase(),
      tokenAddress: rewardTokenAddress,
      tokenPrice,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
      apy: (
        isRewardStillActive ?
          (effectiveRate) / 1e18 * 86400 * 365 * tokenPrice / totalSupply * 100 :
          0
      ),
    };
  });

  return groupBy(rewardsInfo, 'gaugeAddress');
}, {
  promise: true,
  maxAge: 2 * 60 * 1000, // 2 min
  normalizer: ([{ blockchainId, gauges }]) => `${blockchainId}-${gauges.length}`,
});
