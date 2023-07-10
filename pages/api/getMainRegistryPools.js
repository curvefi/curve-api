import Web3 from 'web3';
import configs from 'constants/configs';
import { ZERO_ADDRESS } from 'utils/Web3';
import { fn } from '../../utils/api';
import { getRegistry, getMultiCall } from '../../utils/getters';
import registryAbi from '../../constants/abis/factory_registry.json';
import multicallAbi from '../../constants/abis/multicall.json';

export default fn(async ({ blockchainId } = {}) => {
  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum';

  const config = configs[blockchainId];
  if (config.hasNoMainRegistry) return { poolList: [] };

  const { rpcUrl, multicall2Address } = config;
  const web3 = new Web3(rpcUrl);

  const registryAddress = await getRegistry({ blockchainId });
  if (registryAddress === ZERO_ADDRESS) return { poolList: [] };

  const registry = new web3.eth.Contract(registryAbi, registryAddress);
  const poolCount = await registry.methods.pool_count().call();
  const multicall = new web3.eth.Contract(multicallAbi, multicall2Address);

  // get pool addresses
  let calls = [];
  for (let i = 0; i < poolCount; i += 1) {
    calls.push([registryAddress, registry.methods.pool_list(i).encodeABI()]);
  }
  let aggcalls = await multicall.methods.aggregate(calls).call();
  const poolList = aggcalls[1].map((hex) => web3.eth.abi.decodeParameter('address', hex));


  return { poolList };

}, {
  maxAge: 3600, // 1 hour
  name: 'getMainRegistryPools',
  normalizer: ([{ blockchainId } = {}]) => blockchainId,
});
