import { fn } from 'utils/api';
import { API } from 'utils/Request';

export default fn(async ({ blockchainId = 'ethereum' }) => (
  API.get(`getPools/${blockchainId}/factory-crypto`)
), {
  maxAge: 60,
});
