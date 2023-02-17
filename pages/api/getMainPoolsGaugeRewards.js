/* eslint-disable camelcase, object-curly-newline */

import partition from 'lodash.partition';
import groupBy from 'lodash.groupby';
import { fn } from 'utils/api';
import { getNowTimestamp } from 'utils/Date';
import { REWARD_TOKENS_REPLACE_MAP } from 'constants/AppConstants';
import { multiCall } from 'utils/Calls';
import { flattenArray, uniq } from 'utils/Array';
import { ZERO_ADDRESS } from 'utils/Web3/web3';
import getTokensPrices from 'utils/data/tokens-prices';
import Request from 'utils/Request';
import getFactoryV2GaugeRewards from 'utils/data/getFactoryV2GaugeRewards';
import ERC20_ABI from 'constants/abis/erc20.json';
import getAavePoolRewardsInfo from 'utils/data/getAavePoolRewardsInfo';
import RewardContractV1ABI from 'utils/data/abis/json/reward-contracts/v1.json';
import RewardContractV4ABI from 'utils/data/abis/json/reward-contracts/v4.json';
import RewardContractVrewarddataABI from 'utils/data/abis/json/reward-contracts/vrewarddata.json';

const REWARDS_CONFIG = {
  v1: {
    maxRewardCount: 1,
    rewardContractAbi: RewardContractV1ABI,
  },
  v2: {
    maxRewardCount: 8,
    rewardContractAbi: RewardContractV4ABI, // Using v4 abi purpose
  },
  v4: {
    maxRewardCount: 8,
    rewardContractAbi: RewardContractV4ABI,
  },
  'v-rewarddata': {
    maxRewardCount: 8,
    rewardContractAbi: RewardContractVrewarddataABI,
  },
};

const V0_GAUGES_ADDRESSES = [
  '0x7ca5b0a2910B33e9759DC7dDB0413949071D7575',
  '0xBC89cd85491d81C6AD2954E6d0362Ee29fCa8F53',
  '0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1',
  '0x69Fb7c45726cfE2baDeE8317005d3F94bE838840',
  '0x64E3C23bfc40722d3B649844055F1D51c1ac041d',
  '0xB1F2cdeC61db658F091671F5f199635aEF202CAC',
  '0x4c18E409Dc8619bFb6a1cB56D114C3f592E0aE79',
  '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A',
  '0xC5cfaDA84E902aD92DD40194f0883ad49639b023',
  '0x2db0E83599a91b508Ac268a6197b8B14F5e72840',
  '0xC2b1DF84112619D190193E48148000e3990Bf627',
  '0xF98450B5602fa59CC66e1379DFfB6FDDc724CfC4',
];

const FACTORY_GAUGES_ADDED_TO_MAIN_LIST_ADDRESSES = [
  '0xd8b712d29381748db89c36bca0138d7c75866ddf', // mim
];

const FACTORY_GAUGES_ADDED_TO_MAIN_LIST_ADDRESSES_REF_ASSET_PRICE = {
  '0xd8b712d29381748db89c36bca0138d7c75866ddf': 1,
};

// eslint-disable-next-line
const GAUGES_PARTIAL_ABI = [{"name":"reward_contract","outputs":[{"type":"address","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2051},{"name":"totalSupply","outputs":[{"type":"uint256","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":1691},{"stateMutability":"view","type":"function","name":"reward_tokens","inputs":[{"name":"arg0","type":"uint256"}],"outputs":[{"name":"","type":"address"}],"gas":3787},{"name":"rewarded_token","outputs":[{"type":"address","name":""}],"inputs":[],"stateMutability":"view","type":"function","gas":2201}];

export default fn(async (gauges) => {
  if (typeof gauges === 'undefined') {
    throw new Error('gauges is undefined in getMainPoolsGaugeRewards()');
  }
  // const gauges = (await (await Request.get('https://api.curve.fi/api/getAllGauges')).json()).data;

  //empty gauges cause reverts
  const remove = [
     'eurtusd', // Todo adapt script to this new type of gauges
    'eursusd', // Todo adapt script to this new type of gauges
    'crveth', // Todo adapt script to this new type of gauges
    'cvxeth', // Todo adapt script to this new type of gauges
    'rai',
    'xautusd',
    'spelleth',
    'teth',
  ]
  remove.map(async (p) => {
    delete gauges[p]
  })

  const mainPoolsGauges = Array.from(Object.values(gauges)).filter(({ gauge, side_chain, factory }) => (!side_chain && !factory && gauge));

  const mainPoolsGaugesAddressesAndVersion = mainPoolsGauges.map(({ gauge, name }, i) => ({
    address: gauge,
    version: (
      V0_GAUGES_ADDRESSES.includes(gauge) ? null :
      FACTORY_GAUGES_ADDED_TO_MAIN_LIST_ADDRESSES.includes(gauge.toLowerCase()) ? 'factory' :
      name === 'ankreth' ? 'v-rewarddata' : // Uses the rewardData implementation
      i < 18 ? 'v1' :
      'v2'
    ),
  }));

  const gaugesData = await multiCall(flattenArray(
    mainPoolsGaugesAddressesAndVersion
      .filter(({ version }) => (
        version !== null && // No reward contract for those gauges
        version !== 'factory' // Handled separately with getFactoryV2GaugeRewards() and appended to the result list
      ))
      .map(({ version, address }) => [{
        address,
        abi: GAUGES_PARTIAL_ABI,
        methodName: 'reward_contract',
        metaData: { address, type: 'rewardContract' },
      }, {
        address,
        abi: GAUGES_PARTIAL_ABI,
        methodName: 'totalSupply',
        metaData: { address, type: 'totalSupply' },
      }, ...(
        version === 'v1' ? [{
          address,
          abi: GAUGES_PARTIAL_ABI,
          methodName: 'rewarded_token',
          metaData: { address, type: 'rewardToken' },
        }] :
        [...Array(Number(REWARDS_CONFIG[version].maxRewardCount)).keys()].map((rewardIndex) => ({
          address,
          abi: GAUGES_PARTIAL_ABI,
          methodName: 'reward_tokens',
          params: [rewardIndex],
          metaData: { address, type: 'rewardToken' },
        }))
      )])
  ));

  const gaugesRewardData = mainPoolsGaugesAddressesAndVersion.map(({ address, version }) => {
    if (
      version === null || // No reward contract for those gauges
      version === 'factory' // Handled separately with getFactoryV2GaugeRewards() and appended to the result list
    ) {
      return {
        address,
        version,
        rewardContract: null,
        totalSupply: undefined,
        rewardTokens: null,
      };
    }

    const rewardContract = gaugesData.find(({ metaData }) => metaData.address === address && metaData.type === 'rewardContract').data;

    const rewardTokens = gaugesData.filter(({ metaData }) => metaData.address === address && metaData.type === 'rewardToken').map(({ data }) => data).filter((tokenAddress) => tokenAddress !== ZERO_ADDRESS);

    return {
      address,
      version,
      rewardContract: rewardContract === ZERO_ADDRESS ? null : rewardContract,
      totalSupply: gaugesData.find(({ metaData }) => metaData.address === address && metaData.type === 'totalSupply').data / 1e18,
      rewardTokens: (
        version !== 'v-rewarddata' ?
          // Onward staking for non-factory gauges means there's only ever one active reward token at a time
          rewardTokens.length === 0 ? null : rewardTokens.slice(-1) :
          rewardTokens
      ),
    };
  });

  const uniqueRewardTokenAddresses = flattenArray(
    uniq(gaugesRewardData.map(({ rewardTokens }) => rewardTokens).filter((rewardTokens) => rewardTokens !== null))
      .map((tokenAddress) => (
        REWARD_TOKENS_REPLACE_MAP[tokenAddress] ||
        tokenAddress
      ))
  );
  const tokenPricesPromise = getTokensPrices(uniqueRewardTokenAddresses);

  const filteredGaugeRewardData = gaugesRewardData.filter(({ version, rewardContract }) => (
    version !== null && // No reward contract for those gauges
    version !== 'factory' && // Handled separately with getFactoryV2GaugeRewards() and appended to the result list
    rewardContract !== null
  ));

  const V2_GAUGES_USING_V1_REWARD_CONTRACT = [
    '0xd7d147c6Bb90A718c3De8C0568F9B560C79fa416',
  ];

  // Reward contracts ignored by the generic flow, custom logic implemented instead for those
  const CUSTOM_LOGIC_REWARD_CONTRACTS = [
    '0x96D7BC17912e4F320c4894194564CF8425cfe8d9', // stkAAVE reward rate is found on underlying aTokens
    '0xe5f41aCAd47849C6eb28b93913ca81893fB5a2A6', // stkAAVE reward rate is found on underlying aTokens
  ];

  const rewardAndTokenData = await multiCall(flattenArray(
    filteredGaugeRewardData
      .filter(({ rewardContract }) => !CUSTOM_LOGIC_REWARD_CONTRACTS.includes(rewardContract))
      .map(({
        address,
        version,
        rewardContract,
        rewardTokens,
      }) => {
        const rewardContractVersion = V2_GAUGES_USING_V1_REWARD_CONTRACT.includes(address) ? 'v1' : version;

        return (
          rewardContractVersion === 'v-rewarddata' ?
            flattenArray(rewardTokens.map((rewardToken) => [{
              address: rewardContract,
              abi: REWARDS_CONFIG[rewardContractVersion].rewardContractAbi,
              methodName: 'rewardData',
              params: [rewardToken],
              metaData: { address, rewardContract, rewardToken, type: 'rewardData', metaType: 'reward' },
            }, {
              address: rewardToken,
              abi: ERC20_ABI,
              methodName: 'name',
              metaData: { address, rewardContract, rewardToken, type: 'name', metaType: 'token' },
            }, {
              address: rewardToken,
              abi: ERC20_ABI,
              methodName: 'symbol',
              metaData: { address, rewardContract, rewardToken, type: 'symbol', metaType: 'token' },
            }, {
              address: rewardToken,
              abi: ERC20_ABI,
              methodName: 'decimals',
              metaData: { address, rewardContract, rewardToken, type: 'decimals', metaType: 'token' },
            }])) :
            [{
              address: rewardContract,
              abi: REWARDS_CONFIG[rewardContractVersion].rewardContractAbi,
              methodName: rewardContractVersion !== 'v1' ? 'rewardsDuration' : 'DURATION',
              metaData: { address, rewardContract, rewardToken: rewardTokens[0], type: 'duration', metaType: 'reward' },
            }, {
              address: rewardContract,
              abi: REWARDS_CONFIG[rewardContractVersion].rewardContractAbi,
              methodName: 'rewardRate',
              metaData: { address, rewardContract, rewardToken: rewardTokens[0], type: 'rewardRate', metaType: 'reward' },
            }, {
              address: rewardContract,
              abi: REWARDS_CONFIG[rewardContractVersion].rewardContractAbi,
              methodName: 'periodFinish',
              metaData: { address, rewardContract, rewardToken: rewardTokens[0], type: 'periodFinish', metaType: 'reward' },
            }, {
              address: rewardTokens[0],
              abi: ERC20_ABI,
              methodName: 'name',
              metaData: { address, rewardContract, rewardToken: rewardTokens[0], type: 'name', metaType: 'token' },
            }, {
              address: rewardTokens[0],
              abi: ERC20_ABI,
              methodName: 'symbol',
              metaData: { address, rewardContract, rewardToken: rewardTokens[0], type: 'symbol', metaType: 'token' },
            }, {
              address: rewardTokens[0],
              abi: ERC20_ABI,
              methodName: 'decimals',
              metaData: { address, rewardContract, rewardToken: rewardTokens[0], type: 'decimals', metaType: 'token' },
            }]
        );
      })
  ));

  const [rewardData, tokenData] =
    partition(rewardAndTokenData, ({ metaData: { metaType } }) => metaType === 'reward');
  const rewardDataPerRewardContractAndToken = groupBy(rewardData, ({ metaData: { rewardContract, rewardToken } }) => `${rewardContract}-${rewardToken}`);

  // Awaiting only here so there's as much work done in parallel as possible
  const [tokenPrices] = await Promise.all([tokenPricesPromise]);

  const nowTimestamp = getNowTimestamp();
  const rewardsInfo = Array.from(Object.values(rewardDataPerRewardContractAndToken)).map((rewardDataForContractToken) => {
    const { metaData: { address, rewardToken } } = rewardDataForContractToken[0];
    const usesRewardData = rewardDataForContractToken.length === 1;

    let rate;
    let rewardPeriodFinish;
    if (usesRewardData) {
      const { data: {
        periodFinish,
        rewardRate,
      } } = rewardDataForContractToken[0];

      rate = rewardRate / 1e18;
      rewardPeriodFinish = periodFinish;
    } else {
      const [
        rewardRate,
        periodFinish,
      ] = [
        rewardDataForContractToken.find(({ metaData: { type } }) => type === 'rewardRate').data,
        rewardDataForContractToken.find(({ metaData: { type } }) => type === 'periodFinish').data,
      ];

      rate = rewardRate / 1e18;
      rewardPeriodFinish = periodFinish;
    }

    const { totalSupply } = gaugesRewardData.find((gaugeRewardData) => gaugeRewardData.address === address);
    const tokenName = tokenData.find(({ metaData }) => metaData.rewardToken === rewardToken && metaData.type === 'name').data;
    const tokenSymbol = tokenData.find(({ metaData }) => metaData.rewardToken === rewardToken && metaData.type === 'symbol').data;
    const tokenDecimals = tokenData.find(({ metaData }) => metaData.rewardToken === rewardToken && metaData.type === 'decimals').data;
    const lcTokenPriceIndex = (REWARD_TOKENS_REPLACE_MAP[rewardToken] || rewardToken).toLowerCase();
    const tokenPrice = tokenPrices[lcTokenPriceIndex];

    const gaugeData = mainPoolsGauges.find(({ gauge }) => gauge === address);
    const referenceAssetPrice = gaugeData.lpTokenPrice;

    const isRewardStillActive = rewardPeriodFinish > nowTimestamp;

    return {
      gaugeAddress: address.toLowerCase(),
      tokenAddress: rewardToken,
      tokenPrice,
      name: tokenName,
      symbol: tokenSymbol,
      decimals: tokenDecimals,
      apy: (
        isRewardStillActive ?
          (rate * 86400 * 365 * tokenPrice / (totalSupply * referenceAssetPrice) * 100) :
          0
      ),
      apyData: {
        isRewardStillActive,
        tokenPrice,
        rate,
        totalSupply,
      },
    };
  });

  const [customLogicRewardsInfo, mainPoolsFactoryPoolsRewardsInfo] = await Promise.all([
    getAavePoolRewardsInfo(gaugesRewardData, CUSTOM_LOGIC_REWARD_CONTRACTS),
    getFactoryV2GaugeRewards({ factoryGaugesAddresses: FACTORY_GAUGES_ADDED_TO_MAIN_LIST_ADDRESSES }).then((gaugesRewards) => Array.from(Object.values(gaugesRewards)).map((gaugeRewards) => gaugeRewards.map(({
      apyData,
      ...rewardInfo
    }) => ({
      ...rewardInfo,
      apyData,
      apy: (
        apyData.isRewardStillActive ?
          apyData.rate * 86400 * 365 * apyData.tokenPrice / (apyData.totalSupply * FACTORY_GAUGES_ADDED_TO_MAIN_LIST_ADDRESSES_REF_ASSET_PRICE[rewardInfo.gaugeAddress]) * 100 :
          0
      ),
    })))),
  ]);

  const mergedRewardsInfo = [
    ...rewardsInfo,
    ...customLogicRewardsInfo,
    ...flattenArray(Array.from(Object.values(mainPoolsFactoryPoolsRewardsInfo))),
  ];

  return { mainPoolsGaugeRewards: groupBy(mergedRewardsInfo, 'gaugeAddress') };
}, {
  maxAge: 5 * 60, // 5 min
});
