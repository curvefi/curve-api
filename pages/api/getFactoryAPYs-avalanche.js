import { fn } from 'utils/api';
import getSidechainFactoryAPYs from 'pages/api/getFactoryAPYs/_sidechains';

export default fn(async ({ version }) => getSidechainFactoryAPYs({ blockchainId: 'avalanche', version }), {
  maxAge: 30, // 30s
});
