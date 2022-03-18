import { fn } from 'utils/api';
import getFactoGaugesCrvRewardsApiFn from './index';

export default fn(async ({ blockchainId }) => (
  getFactoGaugesCrvRewardsApiFn.straightCall({ blockchainId })
), {
  maxAge: 60,
});
