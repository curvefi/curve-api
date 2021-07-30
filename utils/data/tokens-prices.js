import memoize from 'memoizee';
import Request from 'utils/Request';
import { arrayToHashmap } from 'utils/Array';
import { sequentialPromiseFlatMap } from 'utils/Async';

const MAX_ADDRESSES_PER_COINGECKO_REQUEST = 50;

const getTokensPrices = memoize(async (addresses) => (
  sequentialPromiseFlatMap(addresses, (addressesChunk) => (
    Request.get(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${addressesChunk.join(',')}&vs_currencies=usd
  `)
      .then((response) => response.json())
      .then((prices) => arrayToHashmap(Array.from(Object.entries(prices)).map(([address, { usd: usdPrice }]) => [
        address.toLowerCase(),
        usdPrice,
      ])))
  ), MAX_ADDRESSES_PER_COINGECKO_REQUEST)
), {
  promise: true,
  maxAge: 2 * 60 * 1000, // 2 min
  primitive: true,
});

export default getTokensPrices;
