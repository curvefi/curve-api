import Web3 from 'web3';
import partition from 'lodash.partition';
import groupBy from 'lodash.groupby';
import memoize from 'memoizee';
import { multiCall } from 'utils/Calls';
import { flattenArray, uniq } from 'utils/Array';
import { getNowTimestamp } from 'utils/Date';
import getTokensPrices from 'utils/data/tokens-prices';
import configs from 'constants/configs';
import getGauges from 'pages/api/getGauges';
import ERC20_ABI from 'constants/abis/erc20.json';

// eslint-disable-next-line
const FACTORY_STREAMER_ABI = [{"stateMutability":"nonpayable","type":"constructor","inputs":[{"name":"_owner","type":"address"},{"name":"_receiver","type":"address"},{"name":"_reward","type":"address"}],"outputs":[]},{"stateMutability":"nonpayable","type":"function","name":"add_reward","inputs":[{"name":"_token","type":"address"},{"name":"_distributor","type":"address"},{"name":"_duration","type":"uint256"}],"outputs":[],"gas":147850},{"stateMutability":"nonpayable","type":"function","name":"remove_reward","inputs":[{"name":"_token","type":"address"}],"outputs":[],"gas":898282},{"stateMutability":"nonpayable","type":"function","name":"set_receiver","inputs":[{"name":"_receiver","type":"address"}],"outputs":[],"gas":37605},{"stateMutability":"nonpayable","type":"function","name":"get_reward","inputs":[],"outputs":[],"gas":496490},{"stateMutability":"nonpayable","type":"function","name":"notify_reward_amount","inputs":[{"name":"_token","type":"address"}],"outputs":[],"gas":1502780},{"stateMutability":"nonpayable","type":"function","name":"set_reward_duration","inputs":[{"name":"_token","type":"address"},{"name":"_duration","type":"uint256"}],"outputs":[],"gas":40303},{"stateMutability":"nonpayable","type":"function","name":"set_reward_distributor","inputs":[{"name":"_token","type":"address"},{"name":"_distributor","type":"address"}],"outputs":[],"gas":38012},{"stateMutability":"nonpayable","type":"function","name":"commit_transfer_ownership","inputs":[{"name":"_owner","type":"address"}],"outputs":[],"gas":37755},{"stateMutability":"nonpayable","type":"function","name":"accept_transfer_ownership","inputs":[],"outputs":[],"gas":37700},{"stateMutability":"view","type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address"}],"gas":2658},{"stateMutability":"view","type":"function","name":"future_owner","inputs":[],"outputs":[{"name":"","type":"address"}],"gas":2688},{"stateMutability":"view","type":"function","name":"reward_receiver","inputs":[],"outputs":[{"name":"","type":"address"}],"gas":2718},{"stateMutability":"view","type":"function","name":"reward_tokens","inputs":[{"name":"arg0","type":"uint256"}],"outputs":[{"name":"","type":"address"}],"gas":2857},{"stateMutability":"view","type":"function","name":"reward_count","inputs":[],"outputs":[{"name":"","type":"uint256"}],"gas":2778},{"stateMutability":"view","type":"function","name":"reward_data","inputs":[{"name":"arg0","type":"address"}],"outputs":[{"name":"distributor","type":"address"},{"name":"period_finish","type":"uint256"},{"name":"rate","type":"uint256"},{"name":"duration","type":"uint256"},{"name":"received","type":"uint256"},{"name":"paid","type":"uint256"}],"gas":14685},{"stateMutability":"view","type":"function","name":"last_update_time","inputs":[],"outputs":[{"name":"","type":"uint256"}],"gas":2838}];

export default memoize(async (blockchainId) => {
  const config = configs[blockchainId];
  if (typeof config === 'undefined') {
    throw new Error(`No factory data for blockchainId "${blockchainId}"`);
  }

  const multicallNetworkSettings = {
    web3: new Web3(config.rpcUrl),
    multicallAddress: config.multicallAddress,
  };

  const { gauges } = await getGauges.straightCall();

  const sidechainOnlyFactoryGauges = Array.from(Object.values(gauges)).filter(({
    name,
    factory,
    side_chain: sidechain,
    sideGauge,
    sideStreamer,
  }) => (
    name.startsWith(`${blockchainId}-`) &&
    factory === true &&
    sidechain === true &&
    typeof sideGauge !== 'undefined' &&
    typeof sideStreamer !== 'undefined'
  ));

  const gaugesData = await multiCall(flattenArray(sidechainOnlyFactoryGauges.map(({
    name,
    sideStreamer,
    sideGauge,
  }) => [{
    address: sideStreamer,
    abi: FACTORY_STREAMER_ABI,
    methodName: 'reward_count',
    metaData: { name, sideStreamer, type: 'rewardCount' },
    networkSettings: multicallNetworkSettings,
  }, {
    address: sideGauge,
    abi: ERC20_ABI,
    methodName: 'totalSupply',
    metaData: { name, sideStreamer, type: 'totalSupply' },
    networkSettings: multicallNetworkSettings,
  }])));

  const [gaugesRewardCount, gaugesTotalSupply] =
    partition(gaugesData, ({ metaData: { type } }) => type === 'rewardCount');

  const rewardTokens = await multiCall(flattenArray(gaugesRewardCount.map(({
    data: rewardCount,
    metaData: { name, sideStreamer },
  }) => (
    [...Array(Number(rewardCount)).keys()].map((rewardIndex) => ({
      address: sideStreamer,
      abi: FACTORY_STREAMER_ABI,
      methodName: 'reward_tokens',
      params: [rewardIndex],
      metaData: { name, sideStreamer },
      networkSettings: multicallNetworkSettings,
    }))
  ))));

  const tokenPricesPromise = getTokensPrices(uniq(rewardTokens.map(({ data: rewardTokenAddress }) => (
    rewardTokenAddress
  ))), config.platformCoingeckoId);

  const rewardAndTokenData = await multiCall(flattenArray(rewardTokens.map(({
    data: rewardTokenAddress,
    metaData: { name, sideStreamer },
  }) => [{
    address: sideStreamer,
    abi: FACTORY_STREAMER_ABI,
    methodName: 'reward_data',
    params: [rewardTokenAddress],
    metaData: { name, sideStreamer, rewardTokenAddress, type: 'rewardData' },
    networkSettings: multicallNetworkSettings,
  }, {
    address: rewardTokenAddress,
    abi: ERC20_ABI,
    methodName: 'name',
    metaData: { name, sideStreamer, rewardTokenAddress, type: 'name' },
    networkSettings: multicallNetworkSettings,
  }, {
    address: rewardTokenAddress,
    abi: ERC20_ABI,
    methodName: 'symbol',
    metaData: { name, sideStreamer, rewardTokenAddress, type: 'symbol' },
    networkSettings: multicallNetworkSettings,
  }, {
    address: rewardTokenAddress,
    abi: ERC20_ABI,
    methodName: 'decimals',
    metaData: { name, sideStreamer, rewardTokenAddress, type: 'decimals' },
    networkSettings: multicallNetworkSettings,
  }])));

  const [rewardData, tokenData] =
    partition(rewardAndTokenData, ({ metaData: { type } }) => type === 'rewardData');

  const tokenPrices = await tokenPricesPromise; // Awaiting only here so there's as much work done in parallel as possible

  const nowTimestamp = getNowTimestamp();
  const rewardsInfo = rewardData.map(({ data, metaData: { name, sideStreamer, rewardTokenAddress } }) => {
    const sidechainOnlyFactoryGauge = sidechainOnlyFactoryGauges.find((gaugeInfo) => gaugeInfo.name === name);

    const periodFinish = Number(data.period_finish);
    const isRewardStillActive = periodFinish > nowTimestamp;
    const rate = data.rate / 1e18;
    const totalSupply = gaugesTotalSupply.find(({ metaData }) => metaData.name === name).data / 1e18;
    const tokenName = tokenData.find(({ metaData }) => metaData.name === name && metaData.type === 'name').data;
    const tokenSymbol = tokenData.find(({ metaData }) => metaData.name === name && metaData.type === 'symbol').data;
    const tokenDecimals = tokenData.find(({ metaData }) => metaData.name === name && metaData.type === 'decimals').data;
    const lcTokenPriceIndex = rewardTokenAddress.toLowerCase();
    const tokenPrice = tokenPrices[lcTokenPriceIndex];

    return {
      gaugeAddress: sidechainOnlyFactoryGauge.sideGauge.toLowerCase(),
      tokenAddress: rewardTokenAddress,
      tokenPrice,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
      apy: (
        isRewardStillActive ?
          rate * 86400 * 365 * tokenPrice / totalSupply * 100 :
          0
      ),
    };
  });

  return groupBy(rewardsInfo, 'gaugeAddress');
}, {
  promise: true,
  maxAge: 2 * 60 * 1000, // 2 min
  primitive: true,
});
