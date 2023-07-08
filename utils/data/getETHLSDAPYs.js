import memoize from 'memoizee';
import { arrayToHashmap } from 'utils/Array';
import { lc } from 'utils/String';
import Request from 'utils/Request';

const FALLBACK_RETURN_VALUE = {};

const MIRROR_REPRESENTATIONS = [
  [lc('0xae7ab96520de3a18e5e111b5eaab095312d7fe84'), lc('0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0')], // stETH <> wstETH
];

// Returns a map of ETH LSD address <> staking apy
const getETHLSDAPYs = memoize(async () => {
  try {
    const { success, data } = await (await Request.get('https://api.cryptostats.community/api/v1/eth-staking-pools/apy?metadata=true')).json();
    if (!success) return FALLBACK_RETURN_VALUE;

    const map = arrayToHashmap(data.map(({ metadata: { tokenAddress }, results: { apy } }) => [
      lc(tokenAddress),
      apy,
    ]));

    return {
      ...map,
      ...arrayToHashmap(MIRROR_REPRESENTATIONS.map(([a, b]) => [
        b,
        map[a],
      ])),
    };
  } catch (err) {
    return FALLBACK_RETURN_VALUE;
  }
}, {
  promise: true,
  maxAge: 30 * 60 * 1000, // 30 min
});

export default getETHLSDAPYs;
