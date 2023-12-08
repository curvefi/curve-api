import memoize from 'memoizee';
import Request from '#root/utils/Request.js';
import { arrayToHashmap } from '#root/utils/Array.js';
import { lc } from '#root/utils/String.js';
import { getNowTimestamp } from '#root/utils/Date.js';

const IGNORED_TOKEN_ADDRESSES = {
  ethereum: [
    '0x691c25C461DaFC47792b6E4d674FBB637bca1C6F', // Spam
    '0x3D5a15A9d8EA1D76A32cD70eea882968992d8D95', // Spam
    '0xe80c0cd204d654cebe8dd64a4857cab6be8345a3', // JPEG usd calculation is being fixed in curve-js, to remove soon
    '0x73a052500105205d34Daf004eAb301916DA8190f', // This usd calculation is wrong in curve-js due to broken pool
  ].map(lc),
};

// Coins in these pools won't have their usd price calculated using internal prices
const IGNORED_POOL_ADDRESSES = {
  ethereum: [
    '0x808dB6E464279C6A77a1164E0b34d64Bd6fB526E', // Broken pool
    '0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51', // Broken pool
  ].map(lc),
};

const getCurvePrices = memoize(async (blockchainId) => {
  if (typeof blockchainId === 'undefined') throw new Error('Missing blockchainId param');
  const { data } = await (await Request.get(`https://prices.curve.fi/v1/usd_price/${blockchainId}`)).json();

  return arrayToHashmap(
    data
      // Only use fresh prices (last updated in the past 7d, i.e. had a trade in the past 7d)
      .filter(({ last_updated }) => (
        // Append 'Z' because this is a UTC datetime string
        (Date.parse(`${last_updated}Z`) / 1000) > (getNowTimestamp() - (7 * 86400))
      ))
      .map(({
        address,
        usd_price,
      }) => [
          lc(address),
          usd_price,
        ])
      .filter(([lcAddress]) => !(IGNORED_TOKEN_ADDRESSES[blockchainId] || []).includes(lcAddress))
  );
}, {
  promise: true,
  maxAge: 5 * 60 * 1000, // 5 min
  primitive: true,
  // The preFetch option makes this in-memory cache behave kind of like a stale-while-revalidate strategy,
  // except it refreshes the value *ahead of its expiration time*, not *once it's stale*. Iow it keeps the
  // value fresh and minimizes the chances of having to wait for a fresh value.
  preFetch: true,
});

export default getCurvePrices;
export {
  IGNORED_TOKEN_ADDRESSES,
  IGNORED_POOL_ADDRESSES,
};
