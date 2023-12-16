/**
 * @openapi
 * /getPoolList/{blockchainId}:
 *   get:
 *     tags:
 *       - Pools
 *     description: |
 *       Returns addresses of all pools, in all registries, on a specific chain.
 *
 *       Note: For backward compatibility, in this endpoint the "factory" registry is renamed to "stable-factory"
 *     parameters:
 *       - $ref: '#/components/parameters/blockchainId'
 *     responses:
 *       200:
 *         description:
 */

// Note: this endpoint's code is old, it works but can be made cleaner using `multiCall` from `utils/Calls.js`

import Web3 from 'web3';
import { NotFoundError, fn } from '#root/utils/api.js';
import REGISTRY_ABI from '#root/constants/abis/registry.json' assert { type: 'json' };
import multicallAbi from '#root/constants/abis/multicall.json' assert { type: 'json' };
import configs from '#root/constants/configs/index.js'
import getPlatformRegistries from '#root/utils/data/curve-platform-registries.js';

const getPoolList = fn(async ({ blockchainId }) => {
  const config = configs[blockchainId];
  const web3 = new Web3(config.rpcUrl);

  if (typeof config === 'undefined') {
    throw new NotFoundError(`No factory data for blockchainId "${blockchainId}"`);
  }

  const multicallAddress = config.multicallAddress
  const multicall_contract = new web3.eth.Contract(multicallAbi, multicallAddress)

  let poolList = []
  let {
    registryIds: registries_name,
    registryAddresses: registries,
  } = await getPlatformRegistries(blockchainId);

  registries_name = registries_name.map((registryId) => (registryId === 'factory' ? 'stable-factory' : registryId));

  for (var i = 0; i < registries.length; i++) {
    let registry = new web3.eth.Contract(REGISTRY_ABI, registries[i])
    let pool_count = await registry.methods.pool_count().call()

    let calls = []
    for (var o = 0; o < pool_count; o++) {

      calls.push([registries[i], registry.methods.pool_list(o).encodeABI()])

    }

    let aggcalls = await multicall_contract.methods.aggregate(calls).call();
    aggcalls[1].map((hex) => { poolList.push({ 'type': registries_name[i], 'address': web3.eth.abi.decodeParameter('address', hex) }) })

  }
  //filters duplicates
  poolList = [...poolList.reduce((map, obj) => map.set(obj.address, obj), new Map()).values()];
  return { poolList };
}, {
  maxAge: 60,
  cacheKey: ({ blockchainId }) => `getPoolList-${blockchainId}`,
});

export default getPoolList;
