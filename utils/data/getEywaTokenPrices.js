import memoize from 'memoizee';
import { arrayToHashmap } from '#root/utils/Array.js';
import groupBy from 'lodash.groupby';
import Request from '#root/utils/Request.js';

// Id of eywa pools in factory-stable-ng registry
// Used to only query their api for relevant assets
const FACTO_STABLE_NG_EYWA_POOL_IDS = [0, 1, 2, 3, 4];

const getEywaTokenPrice = memoize((address) => (
  Request.get(`https://pusher.eywa.fi/prices/${address}`)
    .then((res) => res.json())
    .catch(() => 1) // Fallback if the eywa api doesn't know about this token yet, should happen rarely if at all
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
  const prices = await Promise.all(firstTokenOfEachEywaPool.map(getEywaTokenPrice))

  const EywaTokensPrices = arrayToHashmap(firstTokenOfEachEywaPool.map((address, i) => [address.toLowerCase(), prices[i]]));

  return EywaTokensPrices;
}, {
  promise: true,
  maxAge: 15 * 60 * 1000,
  preFetch: true,
});

export default getEywaTokenPrices;
