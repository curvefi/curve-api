import { fn } from 'utils/api';
import getGaugesFn from './index';

export default fn(async ({ blockchainId = 'ethereum' }) => (
  getGaugesFn.straightCall({ blockchainId })
), {
  maxAge: 60,
});
