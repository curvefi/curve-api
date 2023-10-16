import { fn } from 'utils/api';

export default fn(async ({ blockchainId }) => {

  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum'; // Default value
  const { success, data } = await (await fetch(`https://api.curve.fi/api/getSubgraphData/${blockchainId}`)).json();

  if (success) {
    const { totalVolume, cryptoShare } = data;

    return {
      totalVolume,
      cryptoShare
    };
  } else {
    // Fallback for chains without subgraph available; this won't be necessary anymore once we've moved
    // to curve-prices for all chains
    const { data } = await (await fetch(`https://api.curve.fi/api/getFactoryAPYs-${blockchainId}`)).json();

    return {
      totalVolume: data.totalVolume,
      cryptoShare: undefined,
    };
  }
}, {
  maxAge: 10 * 60, // 10m
});
