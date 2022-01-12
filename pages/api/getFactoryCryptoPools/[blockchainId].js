import { fn } from 'utils/api';
import getFactoryCryptoPoolsApiFn from './index';

export default fn(async ({ blockchainId }) => (
  getFactoryCryptoPoolsApiFn.straightCall({ blockchainId })
), {
  maxAge: 60,
});
