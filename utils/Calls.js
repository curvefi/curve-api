/* eslint-disable camelcase, no-lonely-if */

import Web3 from 'web3';
import memoize from 'memoizee';
import configs from 'constants/configs';
import WEB3_CONSTANTS from 'constants/Web3';
import { ZERO_ADDRESS } from 'utils/Web3/web3';
import { IS_DEV } from 'constants/AppConstants';
import { sequentialPromiseMap } from 'utils/Async';
import MULTICALL2_ABI from '../constants/abis/multicall2.json';
import { getArrayChunks, flattenArray } from './Array';

const web3 = new Web3(WEB3_CONSTANTS.RPC_URL);

const FALLBACK_DECODED_PARAMETERS_VALUES = {
  uint256: 0,
  uint8: 0,
  int128: 0,
  address: ZERO_ADDRESS,
  bool: false,
  string: '',
};

// Contract instances cache store
const getContractInstance = memoize((address, abi, library) => (
  new library.eth.Contract(abi, address)
));

/**
 * @param {Array<{contract: Object, methodName: String, params: Array}>} callsConfig
 *
 * Returns an array of data.
 * If `metaData` is passed alongside any call, returns an array of objects of shape { data, metaData } instead.
 */
const multiCall = async (callsConfig, isDebugging = false) => {
  if (callsConfig.length === 0) return [];

  const defaultCallConfig = {
    // Pass either a contract object (if that contract object is already instantiated and it's easier)
    contract: undefined, // e.g. currentContract
    // Or pass both address and abi for the utility to instantiate and cache the contract instance
    address: undefined,
    abi: undefined,
    methodName: undefined, // e.g. 'claimable_tokens'
    params: [], // Array of params, if the method takes any
    // Optional; any data to be passed alongside each call's results, for example to act as a marker
    // to easily identify what the call's results reference
    metaData: undefined,
    networkSettings: {
      web3,
      multicall2Address: configs.ethereum.multicall2Address,
    },
    superSettings: {
      returnSuccessState: false, // If true, will return true if call succeeds, false if it reverts
      fallbackValue: undefined, // Custom fallback value for very specific cases; should rarely be used
    },
  };

  const augmentedCallsConfig = callsConfig.map((config) => ({
    ...defaultCallConfig,
    ...config,
    superSettings: {
      ...defaultCallConfig.superSettings,
      ...config.superSettings,
    },
  }));

  // Validate configs
  // eslint-disable-next-line no-restricted-syntax
  for (const config of augmentedCallsConfig) {
    const usesContractField = typeof config.contract !== 'undefined';

    if (usesContractField && typeof config.contract !== 'object') {
      throw new Error('multiCall error: config parameter `contract` expects a contract object');
    }

    if (!usesContractField && typeof config.address !== 'string') {
      throw new Error('multiCall error: config parameter `address` expects a contract address');
    }

    if (!usesContractField && !Array.isArray(config.abi)) {
      throw new Error('multiCall error: config parameter `abi` expects an array');
    }

    if (typeof config.methodName !== 'string') {
      throw new Error('multiCall error: config parameter `methodName` expects a contract method name');
    }

    if (typeof config.networkSettings.web3 === 'undefined') {
      throw new Error('multiCall error: config parameter `networkSettings.web3` is required');
    }

    if (typeof config.networkSettings.multicall2Address === 'undefined') {
      throw new Error('multiCall error: config parameter `networkSettings.multicall2Address` is required');
    }

    if (usesContractField && !config.contract._address) {
      throw new Error('multiCall error: couldn’t find any `_address` property on config parameter `contract`; either the contract object passed in incorrect, or we need to make multiCall accept an optional address param to pass it manually ourselves when it’s not implicitly set on `contract`');
    }
  }

  const hasMetaData = augmentedCallsConfig.some(({ metaData }) => typeof metaData !== 'undefined');
  const calls = augmentedCallsConfig.map((callConfig) => {
    const {
      contract,
      address,
      abi,
      methodName,
      params,
      networkSettings,
      superSettings,
    } = callConfig;

    const contractInstance = (contract || getContractInstance(address, abi, networkSettings.web3));
    if (!contractInstance.methods[methodName]) {
      console.error('Context for error thrown below (callConfig)', callConfig);
      throw new Error(`multiCall error: method ${methodName} was not found on provided contract`);
    }

    return [
      contract?._address || address,
      contractInstance.methods[methodName](...params).encodeABI(),
    ];
  });

  const { networkSettings } = augmentedCallsConfig[0];

  const multicall = getContractInstance(networkSettings.multicall2Address, MULTICALL2_ABI, networkSettings.web3);
  const chunkedCalls = getArrayChunks(calls, 400); // Keep each multicall size reasonable

  let decodedData;
  try {
    const chunkedReturnData = await sequentialPromiseMap(chunkedCalls, async (callsChunk) => (
      Promise.all(callsChunk.map(async (chunk) => {
        const aggregateReturnData = await multicall.methods.tryAggregate(false, chunk).call();
        const returnData = aggregateReturnData.map(({ success, returnData: hexData }) => ({ success, hexData }));
        return returnData;
      }))
    ), 10);

    const returnData = flattenArray(chunkedReturnData);

    decodedData = returnData.map(({ success, hexData }, i) => {
      const { contract, abi, methodName, metaData, superSettings } = augmentedCallsConfig[i];
      const contractAbi = contract?._jsonInterface || abi;
      const outputSignature = contractAbi.find(({ name }) => name === methodName).outputs;

      let data;
      if (superSettings.returnSuccessState) {
        data = success;
      } else {
        if (outputSignature.length > 1) {
          try {
            data = networkSettings.web3.eth.abi.decodeParameters(outputSignature, hexData);
          } catch (err) {
            console.error(`Failed decodeParameters with outputSignature ${JSON.stringify(outputSignature.map(({ type, name }) => ({ type, name })))}`);

            throw err;
          }
        } else {
          try {
            data = networkSettings.web3.eth.abi.decodeParameter(outputSignature[0], hexData);
          } catch (err) {
            const failedDecodedType = outputSignature[0].type;

            // Allow passing a custom fallback value for very specific cases; should rarely be used
            if (typeof superSettings.fallbackValue !== 'undefined') {
              data = superSettings.fallbackValue;
            // Use fallback value if one exists (ideally we have fallback values for all types,
            // add more when necessary as we encounter other failures)
            } else if (typeof FALLBACK_DECODED_PARAMETERS_VALUES[failedDecodedType] !== 'undefined') {
              data = FALLBACK_DECODED_PARAMETERS_VALUES[failedDecodedType];
            } else {
              console.error(`Failed decodeParameter with outputSignature ${JSON.stringify(failedDecodedType)}`);
              throw err;
            }
          }
        }
      }

      if (hasMetaData) return { data, metaData };
      return data;
    });
  } catch (err) {
    console.error(err)
    if (IS_DEV && !isDebugging) await findThrowingCall(callsConfig);
    else throw err;
  }

  return decodedData;
};

const findThrowingCall = async (callsConfig) => {
  console.warn('multiCall() threw, running debugger...');
  let subset = callsConfig;

  while (subset.length > 1) {
    const midIndex = Math.ceil(subset.length / 2);
    const slices = [subset.slice(0, midIndex), subset.slice(-midIndex)];

    // eslint-disable-next-line no-restricted-syntax
    for (const slice of slices) {
      try {
        await multiCall(slice, true); // eslint-disable-line no-await-in-loop
      } catch (err) {
        subset = slice;
      }
    }
  }

  console.log('Found throwing call:', subset);
};

export {
  multiCall,
};
