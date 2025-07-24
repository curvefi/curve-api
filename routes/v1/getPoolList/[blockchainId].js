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
import configs from '#root/constants/configs/index.js'
import getPlatformRegistries from '#root/utils/data/curve-platform-registries.js';
import { sequentialPromiseFlatMap } from '#root/utils/Async.js';
import { uniqBy } from '#root/utils/Array.js';
import { multiCall } from '#root/utils/Calls.js';

const getPoolList = fn(async ({ blockchainId }) => {
  const config = configs[blockchainId];

  if (typeof config === 'undefined') {
    throw new NotFoundError(`No factory data for blockchainId "${blockchainId}"`);
  }

  const web3 = new Web3(config.rpcUrl);
  const networkSettingsParam = (
    typeof config.multicall2Address !== 'undefined' ?
      { networkSettings: { web3, multicall2Address: config.multicall2Address } } :
      undefined
  );

  const {
    registryIds,
    registryAddresses,
  } = await getPlatformRegistries(blockchainId);

  const poolList = await sequentialPromiseFlatMap(registryIds, async (registryId, i) => {
    const registryAddress = registryAddresses[i];

    const poolCount = Number((await multiCall([{
      address: registryAddress,
      abi: REGISTRY_ABI,
      methodName: 'pool_count',
      ...networkSettingsParam,
    }]))[0]);
    if (poolCount === 0) return [];

    const unfilteredPoolIds = Array(poolCount).fill(0).map((_, i) => i);

    const unfilteredPoolAddresses = await multiCall(unfilteredPoolIds.map((id) => ({
      address: registryAddress,
      abi: REGISTRY_ABI,
      methodName: 'pool_list',
      params: [id],
      ...networkSettingsParam,
    })));

    return unfilteredPoolAddresses.map((address) => ({
      type: (registryId === 'factory' ? 'stable-factory' : registryId),
      address,
    }));
  });

  return {
    poolList: uniqBy(poolList, 'address'),
  };
}, {
  maxAge: 60,
  cacheKey: ({ blockchainId }) => `getPoolList-${blockchainId}`,
});

export default getPoolList;
