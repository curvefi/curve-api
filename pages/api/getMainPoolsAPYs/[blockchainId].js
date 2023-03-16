import { fn } from 'utils/api';
import configs from 'constants/configs';
import getFactoGaugesCrvRewardsApiFn from './index';

export default fn(({ blockchainId }) => {
  throw new Error(`This chain has a getSubgraphData endpoint available, please use "/api/getSubgraphData/${blockchainId}"`);
}, {
  maxAge: 60,
});
