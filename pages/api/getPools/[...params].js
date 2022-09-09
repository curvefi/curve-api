import { fn } from 'utils/api';
import getPoolsApiFn from './index';

export default fn(async ({ params: [blockchainId, registryId, preventQueryingFactoData] }) => (
  getPoolsApiFn.straightCall({ blockchainId, registryId, preventQueryingFactoData })
), {
  maxAge: 60,
});
