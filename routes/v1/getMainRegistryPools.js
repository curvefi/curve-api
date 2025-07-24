/**
 * @openapi
 * /getMainRegistryPools:
 *   get:
 *     deprecated: true
 *     tags:
 *       - Deprecated
 *     description: |
 *       Returns Ethereum main registry pools addresses as an array
 *       <i>Deprecated: please use `getPools/ethereum/main` instead</i>
 *     responses:
 *       200:
 *         description:
 */

/**
 * Note: this method is exposed as an API endpoint, but is mostly meant as an internal utility
 * that can retrieve data for all chains, not just Ethereum.
 */

import Web3 from 'web3';
import configs from '#root/constants/configs/index.js'
import { ZERO_ADDRESS } from '#root/utils/Web3/index.js';
import { fn } from '#root/utils/api.js';
import { getRegistry } from '#root/utils/getters.js';
import registryAbi from '#root/constants/abis/factory_registry.json' with { type: 'json' };
import multicallAbi from '#root/constants/abis/multicall.json' with { type: 'json' };

export default fn(async ({ blockchainId }) => {
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
  cacheKey: ({ blockchainId }) => `getMainRegistryPools-${blockchainId}`,
});
