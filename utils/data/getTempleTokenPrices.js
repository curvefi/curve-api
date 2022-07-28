import memoize from 'memoizee';
import { arrayToHashmap, flattenArray } from 'utils/Array';
import { multiCall } from 'utils/Calls';
import TEMPLE_LP_TOKEN_ABI from 'constants/abis/temple-lp-token.json';
import getTokensPrices from 'utils/data/tokens-prices';

// Add more if we're missing prices from more
const TEMPLE_LP_TOKENS = {
  ethereum: [
    '0x6021444f1706f15465bEe85463BCc7d7cC17Fc03', // FRAX-TEMPLE LP
  ],
};

const getTempleTokenPrices = memoize(async (
  networkSettingsParam,
  blockchainId,
  coinAddressesAndPricesMapFallback
) => {
  const templePoolDatas = await multiCall(flattenArray(TEMPLE_LP_TOKENS[blockchainId].map((address) => [{
    address,
    abi: TEMPLE_LP_TOKEN_ABI,
    methodName: 'totalSupply',
    metaData: { address, type: 'totalSupply' },
    networkSettingsParam,
  }, {
    address,
    abi: TEMPLE_LP_TOKEN_ABI,
    methodName: 'getReserves',
    metaData: { address, type: 'reserves' },
    networkSettingsParam,
  }, {
    address,
    abi: TEMPLE_LP_TOKEN_ABI,
    methodName: 'token0',
    metaData: { address, type: 'token0' },
    networkSettingsParam,
  }, {
    address,
    abi: TEMPLE_LP_TOKEN_ABI,
    methodName: 'token1',
    metaData: { address, type: 'token1' },
    networkSettingsParam,
  }])));

  const underlyingAddressesAndMetadata = templePoolDatas.filter(({ metaData: { type } }) => (
    type === 'token0' ||
    type === 'token1'
  ));
  const underlyingPrices = await getTokensPrices(underlyingAddressesAndMetadata.map(({ data }) => data.toLowerCase()));

  const groupedData = templePoolDatas.reduce((accu, { data, metaData: { type, address } }) => {
    const lcAddress = address.toLowerCase();

    return {
      ...accu,
      [lcAddress]: {
        ...(accu[lcAddress] || {}),
        [type]: data,
      },
    };
  }, {});

  const templeLpTokensPrices = arrayToHashmap(Array.from(Object.entries(groupedData)).map(([
    address,
    data,
  ]) => {
    const token0Balance = data.reserves._reserve0 / 1e18;
    const token1Balance = data.reserves._reserve1 / 1e18;
    const token0Price = (
      underlyingPrices[data.token0.toLowerCase()] ||
      coinAddressesAndPricesMapFallback[data.token0.toLowerCase()]
    );
    const token1Price = (
      underlyingPrices[data.token1.toLowerCase()] ||
      coinAddressesAndPricesMapFallback[data.token1.toLowerCase()]
    );
    const totalSupply = data.totalSupply / 1e18;
    const price = ((token0Balance * token0Price) + (token1Balance * token1Price)) / totalSupply;

    return [address, price];
  }));

  return templeLpTokensPrices;
}, {
  promise: true,
  maxAge: 10 * 60 * 1000, // 10 min
});

export default getTempleTokenPrices;
