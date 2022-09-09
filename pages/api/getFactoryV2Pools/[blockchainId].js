import { fn } from 'utils/api';
import getFactoryV2PoolsApiFn from './index';

export default fn(async ({ blockchainId = 'ethereum' }) => (
  getFactoryV2PoolsApiFn.straightCall({ blockchainId })
), {
  maxAge: 60,
});
