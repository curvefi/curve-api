import memoize from 'memoizee';
import Request from 'utils/Request';
import { arrayToHashmap } from 'utils/Array';

const getAssetsPrices = memoize((assetCoingeckoIds) => {
  if (assetCoingeckoIds.length === 0) return {};

  // https://defillama.com/docs/api
  return Request.get(`https://coins.llama.fi/prices/current/${assetCoingeckoIds.map((id) => `coingecko:${id}`).join(',')}?aa`)
    .then((response) => response.json())
    .then(({ coins: prices }) => arrayToHashmap(assetCoingeckoIds.map((id) => [
      id,
      id === 'dollar' ? 1 : prices[`coingecko:${id}`]?.price,
    ])));
}, {
  promise: true,
  maxAge: 2 * 60 * 1000, // 2 min
  primitive: true,
});

export default getAssetsPrices;
