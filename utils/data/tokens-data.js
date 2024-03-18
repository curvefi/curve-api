import Web3 from 'web3';
import configs from '#root/constants/configs/index.js'
import { multiCall } from '#root/utils/Calls.js';
import ERC20ABI from '#root/constants/abis/erc20.json' assert { type: 'json' };
import { flattenArray, arrayToHashmap } from '#root/utils/Array.js';
import { lc } from '#root/utils/String.js';

const cache = new Map();

const fetchTokensData = async (tokenAddresses, blockchainId = 'ethereum') => {
  const config = configs[blockchainId];
  const {
    rpcUrl,
    multicall2Address,
  } = config;

  const web3 = new Web3(rpcUrl);
  const networkSettingsParam = (
    typeof multicall2Address !== 'undefined' ?
      { networkSettings: { web3, multicall2Address } } :
      undefined
  );

  const tokenData = await multiCall(flattenArray(tokenAddresses.map((address) => [{
    address,
    abi: ERC20ABI,
    methodName: 'symbol',
    metaData: {
      address,
      type: 'symbol',
    },
    ...networkSettingsParam,
  }, {
    address,
    abi: ERC20ABI,
    methodName: 'decimals',
    metaData: {
      address,
      type: 'decimals',
    },
    ...networkSettingsParam,
  }])));

  const mergedTokenData = tokenData.reduce((accu, {
    data,
    metaData: { type, address },
  }) => {
    const key = address;
    const tokenInfo = accu[key];

    accu[key] = {
      ...tokenInfo,
      [type]: (
        type === 'decimals' ?
          Number(data) :
          data
      ),
    };

    return accu;
  }, {});

  // Save to cache
  Array.from(Object.entries(mergedTokenData)).forEach(([address, data]) => {
    cache.set(`${blockchainId}-${address}`, {
      ...data,
      address, // Attach address to the coin's data
      blockchainId, // Attach blockchainId to the coin's data
    });
  });
};

const getTokensData = async (tokenAddresses, blockchainId = 'ethereum') => {
  if (tokenAddresses.length === 0) return {};

  const lcTokenAddresses = tokenAddresses.map(lc);

  /**
   * This caching strategy will only return cached results if *all* requested addresses
   * are already cached. This is ok because by far the lowest hanging fruit to avoid
   * unecessary onchain requests is to prevent the exact same requests from being run
   * multiple times.
   */
  const areAllTokenDataCached = lcTokenAddresses.every((address) => cache.has(`${blockchainId}-${address}`));
  if (!areAllTokenDataCached) await fetchTokensData(lcTokenAddresses, blockchainId);

  return arrayToHashmap(lcTokenAddresses.map((address) => [
    address,
    cache.get(`${blockchainId}-${address}`),
  ]));
};

export default getTokensData;
