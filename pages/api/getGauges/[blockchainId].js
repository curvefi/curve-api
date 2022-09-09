import { fn } from 'utils/api';
import getGaugesFn from './index';

export default fn(async ({ blockchainId }) => (
  getGaugesFn.straightCall({ blockchainId })
), {
  maxAge: 60,
});
