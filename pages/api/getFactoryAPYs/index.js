import { fn } from 'utils/api';
import getEthereumFactoryAPYs from 'pages/api/getFactoryAPYs/ethereum';

export default fn(async ({ version } = {}) => getEthereumFactoryAPYs.straightCall({ version }), {
  maxAge: 30, // 30s
});
