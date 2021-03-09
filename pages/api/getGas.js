import memoize from 'memoizee';
import { fn } from '../../utils/api';

const blocknativeApiFetchOptions = {
  method: 'GET',
  headers: { Authorization: process.env.BLOCKNATIVE_API_KEY },
};

const getBlocknativeData = memoize(async () => {
  const { blockPrices: [{ baseFeePerGas, estimatedPrices }] } = await (await fetch('https://api.blocknative.com/gasprices/blockprices?confidenceLevels=99&confidenceLevels=90&confidenceLevels=80&confidenceLevels=60', blocknativeApiFetchOptions)).json();

  return [
    baseFeePerGas,
    estimatedPrices.find(({ confidence }) => confidence === 99),
    estimatedPrices.find(({ confidence }) => confidence === 90),
    estimatedPrices.find(({ confidence }) => confidence === 80),
    estimatedPrices.find(({ confidence }) => confidence === 60),
  ];
}, {
  promise: true,
  maxAge: 6 * 1000, // Rate limit is 1/5s
});

export default fn(async () => {
  const [
    baseFee,
    fastestGasInfo,
    fastGasInfo,
    standardGasInfo,
    slowGasInfo,
  ] = await getBlocknativeData();

  const eip1559Gas = {
    base: baseFee * 1e9,
    prio: [
      fastestGasInfo,
      fastGasInfo,
      standardGasInfo,
      slowGasInfo,
    ].map(({ maxPriorityFeePerGas }) => maxPriorityFeePerGas * 1e9),
    max: [
      fastestGasInfo,
      fastGasInfo,
      standardGasInfo,
      slowGasInfo,
    ].map(({ maxFeePerGas }) => maxFeePerGas * 1e9),
  };

  return {
    gas: {
      rapid: fastestGasInfo.price * 1e9,
      fast: fastGasInfo.price * 1e9,
      standard: standardGasInfo.price * 1e9,
      slow: slowGasInfo.price * 1e9,
    },
    eip1559Gas,
  };
}, {
  maxAge: 30,
});
