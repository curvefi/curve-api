import { fn } from 'utils/api';
import getPoolsApiFn from './index';

export default fn(async ({ params: [blockchainId, registryId], ...queryParams }) => (
  getPoolsApiFn.straightCall({ ...queryParams, blockchainId, registryId })
), {
  maxAge: 60,
  name: 'getPools[...params]',
});
