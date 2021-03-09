/**
 * Note: this endpoint will be removed soon, it's only used while we migrate from
 * `/api/getFactoryV2Pools-ID` to `/api/getFactoryV2Pools/ID` in places where it's consumed
 */

import { fn } from 'utils/api';
import getFactoryV2PoolsApiFn from './getFactoryV2Pools/index';

export default fn(async () => (
  getFactoryV2PoolsApiFn.straightCall({ blockchainId: 'fantom' })
), {
  maxAge: 60,
});
