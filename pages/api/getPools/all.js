import configs from 'constants/configs';
import { fetchAllCurvePoolsDataEndpoints } from 'utils/data/curve-pools-data';
import { fn } from 'utils/api';

const allBlockchainIds = Array.from(Object.keys(configs));

export default fn(async () => (
  fetchAllCurvePoolsDataEndpoints(allBlockchainIds)
), {
  maxAge: 5 * 60,
  name: 'getAllPools',
});
