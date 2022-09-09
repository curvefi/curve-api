import { fn } from 'utils/api';
import { API } from 'utils/Request';

export default fn(async ({ blockchainId }) => (
  API.get(`getPools/${blockchainId}/factory`)
), {
  maxAge: 60,
});
