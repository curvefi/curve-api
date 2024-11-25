import memoize from 'memoizee';
import { arrayToHashmap } from '#root/utils/Array.js';
import groupBy from 'lodash.groupby';
import Request from '#root/utils/Request.js';
import { FACTO_STABLE_NG_EYWA_POOL_IDS } from '#root/constants/PoolMetadata.js';

const REWARD_TOKEN_ADDRESSES = [
  '0x8D9241935453120825C4a95446e351FbC338527D',
];

// Eywa API isn’t reliable, this keeps a copy last prices for when live prices aren’t available
const LAST_PRICES_CACHE = new Map();

const getEywaTokenPrice = memoize((address) => (
  Request.get(`https://pusher.eywa.fi/prices/${address}`)
    .then((res) => res.json())
    .then((str) => Number(str))
    .catch(() => (
      // Fallback to curve-prices when eywa api is down
      Request.get(`https://prices.curve.fi/v1/usd_price/fantom/${address}`)
        .then((res) => res.json())
        .then(({ data: { usd_price } }) => usd_price)
    ))
    .then((usdPrice) => {
      LAST_PRICES_CACHE.set(address, usdPrice);
      return usdPrice;
    })
    .catch(() => LAST_PRICES_CACHE.get(address)) // Fallback to last known value
), {
  promise: true,
  maxAge: 60 * 1000,
});

const getEywaTokenPrices = memoize(async (
  allCoinAddresses,
  registryId
) => {
  const filteredCoinAddresses = allCoinAddresses.filter(({ poolId }) => (
    registryId === 'factory-eywa' ? true :
      FACTO_STABLE_NG_EYWA_POOL_IDS.includes(poolId)
  ));
  const firstTokenOfEachEywaPool = Array.from(Object.values(groupBy(filteredCoinAddresses, 'poolId'))).map(([{ address }]) => address);
  const allTokenAddresses = [
    ...firstTokenOfEachEywaPool,
    ...REWARD_TOKEN_ADDRESSES,
  ];
  const prices = await Promise.all(allTokenAddresses.map(getEywaTokenPrice))

  const EywaTokensPrices = arrayToHashmap(allTokenAddresses.map((address, i) => [address.toLowerCase(), prices[i]]));

  return EywaTokensPrices;
}, {
  promise: true,
  maxAge: 15 * 60 * 1000,
  preFetch: true,
});

export default getEywaTokenPrices;
