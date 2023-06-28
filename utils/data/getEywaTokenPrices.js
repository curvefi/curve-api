import memoize from 'memoizee';
import { arrayToHashmap, flattenArray } from 'utils/Array';
import { multiCall } from 'utils/Calls';
import TEMPLE_LP_TOKEN_ABI from 'constants/abis/temple-lp-token.json';
import getTokensPrices from 'utils/data/tokens-prices';
import groupBy from 'lodash.groupby';
import Request from 'utils/Request';

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
  console.log('firstTokenOfEachEywaPool', firstTokenOfEachEywaPool)
  
  const prices = await Promise.all(firstTokenOfEachEywaPool.map(getEywaTokenPrice))
  console.log('prices', prices)

  const EywaTokensPrices = arrayToHashmap(firstTokenOfEachEywaPool.map((address, i) => [address.toLowerCase(), prices[i]]));

  return EywaTokensPrices;
}, {
  promise: true,
  maxAge: 10 * 60 * 1000, // 10 min
});

export default getEywaTokenPrices;
