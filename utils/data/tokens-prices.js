import memoize from 'memoizee';
import { backOff } from 'exponential-backoff';
import Request from '#root/utils/Request.js';
import { arrayToHashmap } from '#root/utils/Array.js';
import { sequentialPromiseMap } from '#root/utils/Async.js';
import getAssetsPrices from '#root/utils/data/assets-prices.js';
import getCrvusdPriceForBlockchainId from '#root/utils/data/getCrvusdPrice.js';

const MAX_ADDRESSES_PER_COINGECKO_REQUEST = 30;
const NATIVE_ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const KP3R_ADDRESS_ON_ETHEREUM = '0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44';
const RKP3R_ADDRESS_ON_ETHEREUM = '0xedb67ee1b171c4ec66e6c10ec43edbba20fae8e9';

const getTokensPrices = memoize(async (addresses, platform = 'ethereum') => {
  const attachRkp3rPrice = platform === 'ethereum';

  // eslint-disable-next-line no-param-reassign
  if (attachRkp3rPrice) addresses = addresses.concat(KP3R_ADDRESS_ON_ETHEREUM);

  // https://defillama.com/docs/api
  const pricesChunks = await sequentialPromiseMap(addresses, (addressesChunk) => (
    backOff(() => Request.get(`https://coins.llama.fi/prices/current/${addressesChunk.map((a) => `${platform}:${a}`).join(',')}`), {
      retry: (e, attemptNumber) => {
        console.log(`defillama retrying!`, { attemptNumber, addressesChunk });
        return true;
      },
    })
      .then((response) => response.json())
      .then(({ coins: prices }) => arrayToHashmap(Array.from(Object.entries(prices)).map(([platformAndAddress, { price: usdPrice }]) => [
        platformAndAddress.split(':')[1].toLowerCase(),
        usdPrice,
      ])))
  ), MAX_ADDRESSES_PER_COINGECKO_REQUEST);

  const crvUsdPrice = await getCrvusdPriceForBlockchainId(platform);
  const mergedPrices = Object.assign({}, ...pricesChunks, crvUsdPrice);

  const attachNativeEthPrice = addresses.some((address) => address.toLowerCase() === NATIVE_ETH_ADDRESS);
  if (attachNativeEthPrice) {
    const coingeckoId = platform;
    mergedPrices[NATIVE_ETH_ADDRESS] = (await getAssetsPrices([coingeckoId]))[coingeckoId];
  }

  if (attachRkp3rPrice) {
    // Estimation: rkp3r is a kp3r option redeemable for 50% asset price
    mergedPrices[RKP3R_ADDRESS_ON_ETHEREUM] = mergedPrices[KP3R_ADDRESS_ON_ETHEREUM] * 0.1;
  }

  return mergedPrices;
}, {
  promise: true,
  maxAge: 2 * 60 * 1000, // 2 min
  primitive: true,
});

export default getTokensPrices;
