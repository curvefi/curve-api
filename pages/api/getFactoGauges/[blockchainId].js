import { fn } from 'utils/api';
import getFactoGaugesApiFn from './index';

export default fn(async ({ blockchainId = 'ethereum' }) => (
  getFactoGaugesApiFn.straightCall({ blockchainId })
), {
  maxAge: 60,
});
