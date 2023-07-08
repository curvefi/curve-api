import memoize from 'memoizee';
import { arrayToHashmap } from 'utils/Array';
import { lc } from 'utils/String';
import Request from 'utils/Request';

const FALLBACK_RETURN_VALUE = {};

// Returns a map of ETH LSD address <> staking apy
const getETHLSDAPYs = memoize(async () => {
  try {
    const { success, data } = await (await Request.get('https://api.cryptostats.community/api/v1/eth-staking-pools/apy?metadata=true')).json();
    if (!success) return FALLBACK_RETURN_VALUE;

    return arrayToHashmap(data.map(({ metadata: { tokenAddress }, results: { apy } }) => [
      lc(tokenAddress),
      apy,
    ]));
  } catch (err) {
    return FALLBACK_RETURN_VALUE;
  }
}, {
  promise: true,
  maxAge: 30 * 60 * 1000, // 30 min
});

export default getETHLSDAPYs;
