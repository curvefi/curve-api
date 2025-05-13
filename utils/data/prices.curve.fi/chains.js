import memoize from 'memoizee';

// Note: keep the openapi description of `routes/v1/getVolumes/[blockchainId].js` up to date when editing this array
const PRICES_CURVE_FI_AVAILABLE_CHAIN_IDS = [
  'ethereum',
  'polygon',
  'arbitrum',
  'base',
  'optimism',
  'fantom',
  'xdai',
  'fraxtal',
  'sonic',
];

const getPricesCurveFiChainsBlockchainId = memoize(async (blockchainId) => {
  if (!PRICES_CURVE_FI_AVAILABLE_CHAIN_IDS.includes(blockchainId)) {
    return [];
  }

  const { data } = await (await fetch(`https://prices.curve.finance/v1/chains/${blockchainId}`)).json();
  return data;
}, {
  promise: true,
  maxAge: 5 * 60 * 1000, // That endpoint is cached 5 minutes, no point in querying it more often
});

export default getPricesCurveFiChainsBlockchainId;
export { PRICES_CURVE_FI_AVAILABLE_CHAIN_IDS };
