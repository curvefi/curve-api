import partition from 'lodash.partition';
import groupBy from 'lodash.groupby';
import memoize from 'memoizee';
import { REWARD_TOKENS_REPLACE_MAP } from '#root/constants/AppConstants.js'
import { multiCall } from '#root/utils/Calls.js';
import { flattenArray, uniq } from '#root/utils/Array.js';
import { getNowTimestamp } from '#root/utils/Date.js';
import { decimalsNumber } from '#root/utils/Number.js';
import getTokensPrices from '#root/utils/data/tokens-prices.js';
import ERC20_ABI from '#root/constants/abis/erc20.json' assert { type: 'json' };

// eslint-disable-next-line
const FACTORY_GAUGES_ABI = [{ "stateMutability": "view", "type": "function", "name": "reward_count", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "gas": 3498 }, { "stateMutability": "view", "type": "function", "name": "reward_tokens", "inputs": [{ "name": "arg0", "type": "uint256" }], "outputs": [{ "name": "", "type": "address" }], "gas": 3573 }, { "stateMutability": "view", "type": "function", "name": "reward_data", "inputs": [{ "name": "arg0", "type": "address" }], "outputs": [{ "name": "token", "type": "address" }, { "name": "distributor", "type": "address" }, { "name": "period_finish", "type": "uint256" }, { "name": "rate", "type": "uint256" }, { "name": "last_update", "type": "uint256" }, { "name": "integral", "type": "uint256" }], "gas": 15003 }, { "stateMutability": "view", "type": "function", "name": "totalSupply", "inputs": [], "outputs": [{ "name": "", "type": "uint256" }], "gas": 3108 }];

export default memoize(async ({ factoryGaugesAddresses, blockchainId } = {}) => {
  if (typeof blockchainId === 'undefined') blockchainId = undefined; // Default value
  if (typeof factoryGaugesAddresses === 'undefined') {
    throw new Error('factoryGaugesAddresses is undefined in getFactoryV2GaugeRewards()')
  }

  const gaugesData = await multiCall(flattenArray(factoryGaugesAddresses.map((address) => [{
    address,
    abi: FACTORY_GAUGES_ABI,
    methodName: 'reward_count',
    metaData: { address, type: 'rewardCount' },
  }, {
    address,
    abi: FACTORY_GAUGES_ABI,
    methodName: 'totalSupply',
    metaData: { address, type: 'totalSupply' },
  }])));

  const [gaugesRewardCount, gaugesTotalSupply] =
    partition(gaugesData, ({ metaData: { type } }) => type === 'rewardCount');

  const rewardTokens = await multiCall(flattenArray(gaugesRewardCount.map(({
    data: rewardCount,
    metaData: { address },
  }) => (
    [...Array(Number(rewardCount)).keys()].map((rewardIndex) => ({
      address,
      abi: FACTORY_GAUGES_ABI,
      methodName: 'reward_tokens',
      params: [rewardIndex],
      metaData: { address },
    }))
  ))));

  const tokenPricesPromise = getTokensPrices(uniq(rewardTokens.map(({ data: rewardTokenAddress }) => (
    REWARD_TOKENS_REPLACE_MAP[rewardTokenAddress] ||
    rewardTokenAddress
  ))));

  const rewardAndTokenData = await multiCall(flattenArray(rewardTokens.map(({
    data: rewardTokenAddress,
    metaData: { address: gaugeAddress },
  }) => [{
    address: gaugeAddress,
    abi: FACTORY_GAUGES_ABI,
    methodName: 'reward_data',
    params: [rewardTokenAddress],
    metaData: { gaugeAddress, rewardTokenAddress, type: 'rewardData' },
  }, {
    address: rewardTokenAddress,
    abi: ERC20_ABI,
    methodName: 'name',
    metaData: { gaugeAddress, rewardTokenAddress, type: 'name' },
  }, {
    address: rewardTokenAddress,
    abi: ERC20_ABI,
    methodName: 'symbol',
    metaData: { gaugeAddress, rewardTokenAddress, type: 'symbol' },
  }, {
    address: rewardTokenAddress,
    abi: ERC20_ABI,
    methodName: 'decimals',
    metaData: { gaugeAddress, rewardTokenAddress, type: 'decimals' },
  }])));

  const [rewardData, tokenData] =
    partition(rewardAndTokenData, ({ metaData: { type } }) => type === 'rewardData');

  const tokenPrices = await tokenPricesPromise; // Awaiting only here so there's as much work done in parallel as possible
  const nowTimestamp = getNowTimestamp();
  const rewardsInfo = rewardData.map(({ data, metaData: { gaugeAddress, rewardTokenAddress } }) => {
    const periodFinish = Number(data.period_finish);
    const isRewardStillActive = periodFinish > nowTimestamp;
    const tokenDecimals = tokenData.find(({ metaData }) => metaData.rewardTokenAddress === rewardTokenAddress && metaData.type === 'decimals').data;
    const rate = data.rate / decimalsNumber(tokenDecimals);
    const totalSupply = gaugesTotalSupply.find(({ metaData: { address } }) => address === gaugeAddress).data / 1e18;
    const tokenName = tokenData.find(({ metaData }) => metaData.rewardTokenAddress === rewardTokenAddress && metaData.type === 'name').data;
    const tokenSymbol = tokenData.find(({ metaData }) => metaData.rewardTokenAddress === rewardTokenAddress && metaData.type === 'symbol').data;
    const lcTokenPriceIndex = (REWARD_TOKENS_REPLACE_MAP[rewardTokenAddress] || rewardTokenAddress).toLowerCase();
    const tokenPrice = tokenPrices[lcTokenPriceIndex];

    return {
      gaugeAddress: gaugeAddress.toLowerCase(),
      tokenAddress: rewardTokenAddress,
      tokenPrice,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
      apyData: {
        isRewardStillActive,
        tokenPrice,
        rate,
        totalSupply,
      },
    };
  });

  return groupBy(rewardsInfo, 'gaugeAddress');
}, {
  promise: true,
  maxAge: 2 * 60 * 1000, // 2 min
  primitive: true,
  normalizer: ([query]) => JSON.stringify(query),
});
