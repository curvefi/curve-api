import { fn } from 'utils/api';
import getMainRegistryPoolsFn from './index';

export default fn(async ({ blockchainId = 'ethereum' }) => (
  getMainRegistryPoolsFn.straightCall({ blockchainId })
), {
  maxAge: 60,
});
