import { httpsAgentWithoutStrictSsl } from '#root/utils/Request.js';
import memoize from 'memoizee';

const getExternalGaugeList = memoize(async () => {
  const { gauges } = await (await fetch('https://prices.curve.finance/v1/dao/gauges/overview', {
    dispatcher: httpsAgentWithoutStrictSsl,
  })).json();
  return gauges;
}, {
  promise: true,
  maxAge: 30 * 60 * 1000, // That endpoint is cached 30 minutes, no point in querying it more often given its current use-case
});

const getExternalGaugeListAddresses = memoize(async () => {
  const gauges = await getExternalGaugeList();
  return gauges.map(({ address, effective_address }) => effective_address ?? address);
}, {
  promise: true,
  maxAge: 30 * 60 * 1000, // That endpoint is cached 30 minutes, no point in querying it more often given its current use-case
});

export default getExternalGaugeListAddresses;
export {
  getExternalGaugeList,
};
