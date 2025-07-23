import { httpsAgentWithoutStrictSsl } from '#root/utils/Request.js';
import memoize from 'memoizee';

const getExternalGaugeListAddresses = memoize(async () => {
  const { gauges } = await (await fetch('https://prices.curve.finance/v1/dao/gauges/overview', {
    agent: httpsAgentWithoutStrictSsl,
  })).json();
  return gauges.map(({ address, effective_address }) => effective_address ?? address);
}, {
  promise: true,
  maxAge: 30 * 60 * 1000, // That endpoint is cached 30 minutes, no point in querying it more often given its current use-case
});

export default getExternalGaugeListAddresses;
