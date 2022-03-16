import { fn } from 'utils/api';
import getPoolsFn from 'pages/api/getPools';

export default fn(async ({ blockchainId }) => (
  getPoolsFn.straightCall({ blockchainId, registryId: 'factory' })
), {
  maxAge: 60,
});
