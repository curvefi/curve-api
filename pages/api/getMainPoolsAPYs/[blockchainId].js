import { fn } from 'utils/api';

export default fn(({ blockchainId }) => {
  throw new Error(`This chain has a getSubgraphData endpoint available, please use "/api/getSubgraphData/${blockchainId}"`);
}, {
  maxAge: 60,
});
