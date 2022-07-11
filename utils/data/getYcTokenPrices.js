import memoize from 'memoizee';
import { arrayToHashmap, flattenArray } from 'utils/Array';
import { multiCall } from 'utils/Calls';
import ERC20ABI from 'constants/abis/erc20.json';
import YC_TOKEN_ABI from 'constants/abis/yc-token.json';
import getTokensPrices from 'utils/data/tokens-prices';

// Add more if we're missing prices from more
const YC_TOKENS = {
  ethereum: [
    '0x8e595470ed749b85c6f7669de83eae304c2ec68f', // cyDAI
    '0x76eb2fe28b36b3ee97f3adae0c69606eedb2a37c', // cyUSDC
    '0x48759f220ed983db51fa7a8c0d2aab8f3ce4166a', // cyUSDT
  ],
  fantom: [
    '0x04c762a5df2fa02fe868f25359e0c259fb811cfe', // iDAI
    '0x328a7b4d538a2b3942653a9983fda3c12c571141', // iUSDC
    '0x70fac71debfd67394d1278d98a29dea79dc6e57a', // iUSDT
  ],
};

const getYcTokenPrices = memoize(async (
  networkSettingsParam,
  blockchainId,
  coinAddressesAndPricesMapFallback,
) => {
  const ycTokensDataPart1 = await multiCall(flattenArray(YC_TOKENS[blockchainId].map((address) => [{
    address,
    abi: YC_TOKEN_ABI,
    methodName: 'totalSupply',
    metaData: { type: 'totalSupply', address },
    ...networkSettingsParam,
  }, {
    address,
    abi: YC_TOKEN_ABI,
    methodName: 'getCash',
    metaData: { type: 'underlyingBalance', address },
    ...networkSettingsParam,
  }, {
    address,
    abi: YC_TOKEN_ABI,
    methodName: 'underlying',
    metaData: { type: 'underlyingAddress', address },
    ...networkSettingsParam,
  }, {
    address,
    abi: YC_TOKEN_ABI,
    methodName: 'decimals',
    metaData: { type: 'decimals', address },
    ...networkSettingsParam,
  }])));

  const underlyingAddressesAndMetadata = ycTokensDataPart1.filter(({ metaData: { type } }) => type === 'underlyingAddress');
  const underlyingPrices = await getTokensPrices(underlyingAddressesAndMetadata.map(({ data }) => data.toLowerCase()));

  const ycTokensDataPart2 = await multiCall(underlyingAddressesAndMetadata.map(({
    data: underlyingAddress,
    metaData: { address },
  }) => ({
    address: underlyingAddress,
    abi: ERC20ABI,
    methodName: 'decimals',
    metaData: { type: 'underlyingDecimals', address },
    ...networkSettingsParam,
  })));

  const ycTokensData = [
    ...ycTokensDataPart1,
    ...ycTokensDataPart2,
  ];

  const groupedData = ycTokensData.reduce((accu, { data, metaData: { type, address } }) => {
    const lcAddress = address.toLowerCase();

    return {
      ...accu,
      [lcAddress]: {
        ...(accu[lcAddress] || {}),
        [type]: data,
      },
    };
  }, {});

  const ycTokensPrices = arrayToHashmap(Array.from(Object.entries(groupedData)).map(([
    address,
    data,
  ]) => {
    const underlyingBalance = data.underlyingBalance / (10 ** data.underlyingDecimals);
    const underlyingPrice = (
      underlyingPrices[data.underlyingAddress.toLowerCase()] ||
      coinAddressesAndPricesMapFallback[data.underlyingAddress.toLowerCase()]
    );
    const totalSupply = data.totalSupply / (10 ** data.decimals);
    const price = underlyingBalance * underlyingPrice / totalSupply;

    return [address, price];
  }));

  return ycTokensPrices;
}, {
  promise: true,
  maxAge: 10 * 60 * 1000, // 10 min
});

export default getYcTokenPrices;
