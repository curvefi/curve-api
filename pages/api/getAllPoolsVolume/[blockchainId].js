import { fn } from 'utils/api';
import getFactoGaugesApiFn from './index';

export default fn(async ({ blockchainId }) => (
  getFactoGaugesApiFn.straightCall({ blockchainId })
), {
  maxAge: 60,
});
