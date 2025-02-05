/* eslint-disable no-restricted-syntax */

import Web3 from 'web3';
import memoize from 'memoizee';
import Multicall from '#root/constants/abis/multicall.json' assert { type: 'json' };
import { RPC_URL, RPC_URL_BSC } from '#root/constants/Web3.js';

const web3 = new Web3(Web3?.givenProvider?.networkVersion === '1' ? Web3.givenProvider : RPC_URL);
const MulticallContract = new web3.eth.Contract(Multicall, '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441');

// Contract instances cache store
const getContractInstance = memoize((address, abi, account, library, chainId) => (
  new library.eth.Contract(abi, address)
), {
  maxAge: 60 * 1000,
});

const getEncodedCalls = (callsConfig) => {
  const defaultCallConfig = {
    address: undefined,
    abi: undefined,
    methodName: undefined, // e.g. 'claimable_tokens'
    params: [], // Array of params, if the method takes any
    // Optional; any data to be passed alongside each call's results, for example to act as a marker
    // to easily identify what the call's results reference
    metaData: undefined,
    web3Data: undefined, // { account, library, chainId }
  };

  if (callsConfig.length === 0) return { calls: [], augmentedCallsConfig: [] };

  const augmentedCallsConfig = callsConfig.map((config) => ({
    ...defaultCallConfig,
    ...config,
  }));

  // Validate configs
  for (const config of augmentedCallsConfig) {
    if (typeof config.address !== 'string') {
      throw new Error('multiCall error: config parameter `address` expects a contract address');
    }

    if (!Array.isArray(config.abi)) {
      throw new Error('multiCall error: config parameter `abi` expects an array');
    }

    if (typeof config.methodName !== 'string') {
      throw new Error('multiCall error: config parameter `methodName` expects a contract method name');
    }

    if (typeof config.web3Data === 'undefined') {
      throw new Error('multiCall error: config parameter `web3Data` is required');
    }
  }

  const calls = augmentedCallsConfig.map(({
    address,
    abi,
    methodName,
    params,
    web3Data: { account, library, chainId },
  }) => [
      address,
      getContractInstance(address, abi, account, library, chainId).methods[methodName](...params).encodeABI(),
    ]);

  return { calls, augmentedCallsConfig };
};

const getDecodedData = ({ augmentedCallsConfig, returnData, hasMetaData = false }) => (
  returnData.map((hexData, i) => {
    const { abi, methodName, metaData } = augmentedCallsConfig[i];
    const outputSignature = abi.find(({ name }) => name === methodName).outputs;

    const data = outputSignature.length > 1 ?
      web3.eth.abi.decodeParameters(outputSignature.map(({ type }) => type), hexData) :
      web3.eth.abi.decodeParameter(outputSignature[0].type, hexData);

    if (hasMetaData) return { data, metaData };
    return data;
  })
);

/**
 * @param {Array<{address: String, abi: Array, methodName: String, params: Array}>} callsConfig
 *
 * Returns an array of data.
 * If `metaData` is passed alongside any call, returns an array of objects of shape { data, metaData } instead.
 */
const multiCall = async (callsConfig) => {
  if (callsConfig.length === 0) return [];

  const { calls, augmentedCallsConfig } = getEncodedCalls(callsConfig);
  const hasMetaData = augmentedCallsConfig.some(({ metaData }) => typeof metaData !== 'undefined');

  const { web3Data: { account, library, chainId } } = augmentedCallsConfig[0];
  const multicallContract = getContractInstance('0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441', Multicall, account, library, chainId);
  const { returnData } = await multicallContract.methods.aggregate(calls).call();

  return getDecodedData({ augmentedCallsConfig, returnData, hasMetaData });
};

// Detect if wallet_addEthereumChain method is available on wallet provider
const canAutomaticallyChangeNetwork = async () => {
  const ERROR_CODE_METHOD_DOESNT_EXIST = -32601;

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [],
    });
  } catch (err) {
    if (err.code === ERROR_CODE_METHOD_DOESNT_EXIST) return false;
  }

  return true;
};

const changeNetwork = async (config) => {
  const returnValue = await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: `0x${config.networkId.toString(16)}`,
      chainName: config.name,
      nativeCurrency: {
        name: config.nativeCurrency.symbol,
        symbol: config.nativeCurrency.symbol,
        decimals: config.nativeCurrency.decimals,
      },
      rpcUrls: [config.rpcUrl],
    }],
  });

  const isSuccess = returnValue === null;
  return isSuccess;
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export default web3;
export {
  MulticallContract,
  multiCall,
  getEncodedCalls,
  getDecodedData,
  getContractInstance,
  canAutomaticallyChangeNetwork,
  changeNetwork,
  ZERO_ADDRESS,
};
