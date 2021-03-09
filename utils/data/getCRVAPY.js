/* eslint-disable no-restricted-syntax */

import memoize from 'memoizee';
import { GraphQLClient, gql } from 'graphql-request';
import { flattenArray, arrayToHashmap } from 'utils/Array';
import getAssetsPrices from 'utils/data/assets-prices';
import getPoolUsdFigure from 'utils/data/getPoolUsdFigure';
import pools, { poolGauges } from 'constants/pools';
import Web3 from 'web3';
import Multicall from 'constants/abis/multicall.json';

const web3 = new Web3(`https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`);
const MulticallContract = new web3.eth.Contract(Multicall, '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441');

const getCRVAPY = memoize(async (userAddress) => {
  const GAUGE_CONTROLLER_ADDRESS = '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB';
  const GAUGE_RELATIVE_WEIGHT = '0x6207d866000000000000000000000000';
  const { 'curve-dao-token': CRVprice } = await getAssetsPrices(['curve-dao-token']);
  const weightCalls = poolGauges.map((gauge) => [GAUGE_CONTROLLER_ADDRESS, GAUGE_RELATIVE_WEIGHT + gauge.slice(2)]);
  const aggCallsWeights = await MulticallContract.methods.aggregate(weightCalls).call();
  const decodedWeights = aggCallsWeights[1].map((hex, i) => [weightCalls[i][0], web3.eth.abi.decodeParameter('uint256', hex) / 1e18]);
  const ratesCalls = flattenArray(poolGauges.map((gauge) => [
    [gauge, '0x180692d0'],
    [gauge, '0x17e28089'],
    [gauge, '0x18160ddd'],
  ]));
  const aggRates = await MulticallContract.methods.aggregate(ratesCalls).call();
  const decodedRate = aggRates[1].map((hex) => web3.eth.abi.decodeParameter('uint256', hex));
  const gaugeRates = decodedRate.filter((_, i) => i % 3 === 0).map((v) => v / 1e18);
  const workingSupplies = decodedRate.filter((_, i) => i % 3 === 1).map((v) => v / 1e18);
  const virtualPriceCalls = pools.filter(({ addresses: { swap } }) => !!swap).map(({ addresses: { swap } }) => [swap, '0xbb7b8b80']);
  const aggVirtualPrices = await MulticallContract.methods.aggregate(virtualPriceCalls).call();
  const decodedVirtualPrices = aggVirtualPrices[1].map((hex, i) => [virtualPriceCalls[i][0], web3.eth.abi.decodeParameter('uint256', hex) / 1e18]);
  const CRVAPYs = {};

  let i = 0;
  for (const w of decodedWeights) {
    const pool = pools.find(({ addresses: { gauge } }) => gauge && gauge.toLowerCase() === '0x' + weightCalls[i][1].slice(34).toLowerCase());
    const { id: poolId, addresses: { swap: swapAddress } } = pool;

    const virtualPrice = decodedVirtualPrices.find((v) => v[0].toLowerCase() === swapAddress.toLowerCase())[1];
    // eslint-disable-next-line no-await-in-loop
    const workingSupply = await getPoolUsdFigure(workingSupplies[i], pool, web3);

    const rate = (gaugeRates[i] * w[1] * 31536000 / workingSupply * 0.4) / virtualPrice;
    let apy = rate * CRVprice * 100;
    if (isNaN(apy)) apy = 0;

    CRVAPYs[poolId] = apy;

    i += 1;
  }

  const boosts = arrayToHashmap(pools.map(({ id }) => [id, 1]));
  if (userAddress) {
    const wrapper = new GraphQLClient('https://api.thegraph.com/subgraphs/name/sistemico/curve');

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
    results = results.account ? results.account.gauges : [];

    for (const gaugeBoost of results) {
      const pool = pools.find((pool) => pool.addresses.gauge && pool.addresses.gauge.toLowerCase() === gaugeBoost.gauge.id.toLowerCase())
      if (!pool) continue; // If the gauge has been retired

      boosts[pool.id] = gaugeBoost.workingBalance / (0.4 * gaugeBoost.originalBalance);
      CRVAPYs[pool.id] *= boosts[pool.id];
    }
  }

  return {
    CRVprice,
    CRVAPYs,
    boosts,
  };
}, {
  promise: true,
  maxAge: 10 * 60 * 1000, // 10m
});

export default getCRVAPY;
