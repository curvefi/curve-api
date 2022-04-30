import { fn } from 'utils/api';

export default fn(async ({ blockchainId }) => {

  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum'; // Default value
  const { data: { totalVolume, cryptoShare } } = await (await fetch(`https://api.curve.fi/api/getSubgraphData/${blockchainId}`)).json();

  return {
    totalVolume,
    cryptoShare
  };
}, {
  maxAge: 10 * 60, // 10m
});
