import { fn } from 'utils/api';
import getMainRegistryPoolsAndLpTokensFn from './index';

export default fn(async ({ blockchainId }) => (
  getMainRegistryPoolsAndLpTokensFn.straightCall({ blockchainId })
), {
  maxAge: 60,
});
