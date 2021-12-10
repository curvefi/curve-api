/* eslint-disable no-restricted-syntax */

import { fn } from 'utils/api';
import Web3 from 'web3'; // eslint-disable-line import/no-unresolved
import { GraphQLClient, gql } from 'graphql-request';
import getAssetsPrices from 'utils/data/assets-prices';
import getPoolUsdFigure from 'utils/data/getPoolUsdFigure';
import getFactoryV2PoolsApiFn from 'pages/api/getFactoryV2Pools';
import getGaugesApiFn from 'pages/api/getGauges';
import pools, { poolGauges } from 'constants/pools';
import Multicall from 'constants/abis/multicall.json';

const web3 = new Web3(`https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY_ETHEREUM}`);
const MulticallContract = new web3.eth.Contract(Multicall, '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441');

const GAUGE_CONTROLLER_ADDRESS = '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB';
const GAUGE_RELATIVE_WEIGHT = '0x6207d866000000000000000000000000';

const getEthereumFactoryV2Pools = async () => {
  const factoPoolData = (await getFactoryV2PoolsApiFn.straightCall({ blockchainId: 'ethereum' })).poolData;
  const gaugesData = (await getGaugesApiFn.straightCall()).gauges;

  const normalizedPoolData = factoPoolData.map(({
    id,
    address,
    gaugeAddress,
    assetTypeName,
    totalSupply,
    usdTotal,
  }) => {
    const gaugeData = gaugeAddress ?
      Array.from(Object.values(gaugesData)).find(({ gauge }) => gauge.toLowerCase() === gaugeAddress) :
      undefined;

    const normalizedPoolObject = {
      id,
      addresses: {
        swap: address,
        gauge: gaugeAddress,
      },
      cryptoPool: false, // No crypto facto pools yet
      referenceAsset: assetTypeName,
      isGaugeKilled: gaugeData?.is_killed === true,
      totalSupply,
      usdTotal,
    };

    return new Proxy(normalizedPoolObject, {
      get(target, name) {
        if (
          typeof name === 'string' &&
          !(name in target)
        ) {
          throw new Error(`Property "${name}" not found on object "normalizedPoolObject" for "${id}" -> we’re missing a property on the normalized pool objects, it doesn’t match the standard pool object shape.`);
        }

        return target[name];
      },
    })
  });

  return normalizedPoolData;
};

const nonFactoPools = [...pools];
const nonFactoPoolGauges = [...poolGauges];

// NOTE: DEFAULTING TO virtualPrice = 1 FOR FACTORY POOLS FOR NOW, REVERTING OTHERWISE
const getCRVAPY = fn(async ({ userAddress, includeFactoryV2 = 'false' }) => {
  const { 'curve-dao-token': CRVprice } = await getAssetsPrices(['curve-dao-token']);
  const poolsGaugesAddresses = includeFactoryV2 === 'true' ?
    nonFactoPoolGauges.concat((await getEthereumFactoryV2Pools()).map(({ addresses: { gauge } }) => gauge).filter((gauge) => !!gauge)) :
    nonFactoPoolGauges;
  const allPools = includeFactoryV2 === 'true' ? nonFactoPools.concat((await getEthereumFactoryV2Pools())) : nonFactoPools;
  const weightCalls = poolsGaugesAddresses.map((gauge) => [GAUGE_CONTROLLER_ADDRESS, GAUGE_RELATIVE_WEIGHT + gauge.slice(2)]);
  const aggCallsWeights = await MulticallContract.methods.aggregate(weightCalls).call();
  const decodedWeights = aggCallsWeights[1].map((hex, i) => [weightCalls[i][0], web3.eth.abi.decodeParameter('uint256', hex) / 1e18]);

  const ratesCalls = poolsGaugesAddresses.map((gauge) => [
    [gauge, '0x180692d0'],
    [gauge, '0x17e28089'],
    [gauge, '0x18160ddd'],
  ]);

  const aggRates = await MulticallContract.methods.aggregate(ratesCalls.flat()).call();
  const decodedRate = aggRates[1].map((hex) => web3.eth.abi.decodeParameter('uint256', hex));
  const gaugeRates = decodedRate.filter((_, i) => i % 3 === 0).map((v) => v / 1e18);
  const workingSupplies = decodedRate.filter((_, i) => i % 3 === 1).map((v) => v / 1e18);

  // NOTE: DEFAULTING TO virtualPrice = 1 FOR FACTORY POOLS FOR NOW, REVERTING OTHERWISE
  // Change `pools` to `allPools` to try and retrieve virtualPrice for facto v2 pools
  const virtualPriceCalls = nonFactoPools.filter(({ addresses: { swap } }) => !!swap).map(({ addresses: { swap } }) => [swap, '0xbb7b8b80']);
  const aggVirtualPrices = await MulticallContract.methods.aggregate(virtualPriceCalls).call();
  const decodedVirtualPrices = aggVirtualPrices[1].map((hex, i) => [virtualPriceCalls[i][0], web3.eth.abi.decodeParameter('uint256', hex) / 1e18]);

  const CRVAPYs = {};

  let i = 0;
  for (const w of decodedWeights) {
    const pool = allPools.find(({ addresses: { gauge } }) => (gauge && gauge.toLowerCase() === `0x${weightCalls[i][1].slice(34).toLowerCase()}`));
    const { id: poolId, addresses: { swap: swapAddress }, isGaugeKilled } = pool;
    const virtualPrice = decodedVirtualPrices.find((v) => v[0].toLowerCase() === swapAddress.toLowerCase())?.[1] || 1;

    // eslint-disable-next-line no-await-in-loop
    const workingSupply = await getPoolUsdFigure(workingSupplies[i], pool, web3);

    let rate = (gaugeRates[i] * w[1] * 31536000 / workingSupply * 0.4) / virtualPrice;
    if (isGaugeKilled) rate = 0;
    let apy = rate * CRVprice * 100;
    if (Number.isNaN(apy)) apy = 0;

    CRVAPYs[poolId] = apy;

    i += 1;
  }

  const boosts = {};
  if (userAddress) {
    const wrapper = new GraphQLClient('https://api.thegraph.com/subgraphs/name/curvefi/curve');

    const QUERY = gql`
      {
        account(id: "${userAddress.toLowerCase()}") {
          gauges {
            gauge {
              id
            }
            originalBalance
            originalSupply
            workingBalance
            workingSupply
          }
        }
      }
    `;

    let results = await wrapper.request(QUERY, {});
    if (results.account) {
      results = results.account.gauges;

      for (const gaugeBoost of results) {
        const pool = allPools.find((pool) => pool.addresses.gauge && pool.addresses.gauge.toLowerCase() === gaugeBoost.gauge.id.toLowerCase());
        if (!pool) continue; // If the gauge has been retired
        if (gaugeBoost.workingBalance === '0') continue;

        boosts[pool.id] = gaugeBoost.workingBalance / (0.4 * gaugeBoost.originalBalance);
        CRVAPYs[pool.id] *= boosts[pool.id];
      }
    }
  }

  return {
    CRVprice,
    CRVAPYs,
    boosts,
  };
}, {
  maxAge: 10 * 60, // 10m
});

export default getCRVAPY;
