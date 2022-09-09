import { fn } from 'utils/api';
import  getSubgraphDataApiFn from './index';

export default fn(async ({ blockchainId = 'ethereum' }) => (
  getSubgraphDataApiFn.straightCall({ blockchainId })
), {
  maxAge: 60,
});
