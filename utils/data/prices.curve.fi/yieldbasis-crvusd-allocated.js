import { httpsAgentWithoutStrictSsl } from '#root/utils/Request.js';
import memoize from 'memoizee';

const getCrvusdAllocatedToYieldbasis = memoize(async () => {
  const { data } = await (await fetch('https://prices.curve.finance/v1/crvusd/yield_basis/ethereum/supply', {
    dispatcher: httpsAgentWithoutStrictSsl,
  })).json();
  return data.total_allocated;
}, {
  promise: true,
  maxAge: 30 * 60 * 1000, // That endpoint is cached 30 minutes, no point in querying it more often given its current use-case
});

export default getCrvusdAllocatedToYieldbasis;
