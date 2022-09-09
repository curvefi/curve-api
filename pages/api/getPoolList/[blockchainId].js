import { fn } from 'utils/api';
import getPoolListApiFn from './index';

export default fn(async ({ blockchainId = 'ethereum' }) => (
  getPoolListApiFn.straightCall({ blockchainId })
), {
  maxAge: 60,
});
