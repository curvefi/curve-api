import configs from 'constants/configs';
import getAllCurvePoolsData from 'utils/data/curve-pools-data';
import { fn } from 'utils/api';

const allBlockchainIds = Array.from(Object.keys(configs));
console.log({ allBlockchainIds })

export default fn(async () => (
  getAllCurvePoolsData(allBlockchainIds)
), {
  maxAge: 5 * 60,
  name: 'getAllPools',
});
