import { fn } from 'utils/api';
import  getSubgraphDataApiFn from './index';

export default fn(async ({ blockchainId }) => (
  getSubgraphDataApiFn.straightCall({ blockchainId })
), {
  maxAge: 60,
});
