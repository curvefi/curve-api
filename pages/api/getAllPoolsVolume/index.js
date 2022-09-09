import { fn } from 'utils/api';
import { BASE_API_DOMAIN } from 'constants/AppConstants';

export default fn(async ({ blockchainId }) => {

  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum'; // Default value
  const { data: { totalVolume, cryptoShare } } = await (await fetch(`${BASE_API_DOMAIN}/api/getSubgraphData/${blockchainId}`)).json();

  return {
    totalVolume,
    cryptoShare
  };
}, {
  maxAge: 10 * 60, // 10m
});
