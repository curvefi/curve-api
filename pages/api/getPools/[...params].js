import { fn } from 'utils/api';
import getPoolsApiFn from './index';

export default fn(async ({ params: [blockchainId, registryId] }) => (
  getPoolsApiFn.straightCall({ blockchainId, registryId })
), {
  maxAge: 60,
});
