import memoize from 'memoizee';
import { arrayToHashmap } from '#root/utils/Array.js';
import groupBy from 'lodash.groupby';
import Request from '#root/utils/Request.js';

const getEywaTokenPrice = (address) => (
  Request.get(`https://pusher.eywa.fi/prices/${address}`)
    .then((res) => res.json())
    .catch(() => 1) // Fallback if the eywa api doesn't know about this token yet, should happen rarely if at all
);

const getEywaTokenPrices = memoize(async (
  networkSettingsParam,
  blockchainId,
  coinAddressesAndPricesMapFallback,
  allCoinAddresses
) => {
  const firstTokenOfEachEywaPool = Array.from(Object.values(groupBy(allCoinAddresses, 'poolId'))).map(([{ address }]) => address);
  const prices = await Promise.all(firstTokenOfEachEywaPool.map(getEywaTokenPrice))

  const EywaTokensPrices = arrayToHashmap(firstTokenOfEachEywaPool.map((address, i) => [address.toLowerCase(), prices[i]]));

  return EywaTokensPrices;
}, {
  promise: true,
  maxAge: 10 * 60 * 1000, // 10 min
});

export default getEywaTokenPrices;
