import memoize from 'memoizee';
import { flattenArray } from '#root/utils/Array.js';
import { sequentialPromiseFlatMap } from '#root/utils/Async.js';
import getPoolsFn from '#root/routes/v1/getPools/[blockchainId]/[registryId].js';
import getPlatformRegistries from '#root/utils/data/curve-platform-registries.js';

const attachBlockchainId = (blockchainId, poolData) => ({
  ...poolData,
  blockchainId,
});

const attachRegistryId = (registryId, poolData) => ({
  ...poolData,
  registryId,
});

const attachFactoryTag = (poolData) => ({
  ...poolData,
  factory: true,
});

const getAllCurvePoolsData = memoize(async (blockchainIds, preventQueryingFactoData = true) => (
  flattenArray(await sequentialPromiseFlatMap(blockchainIds, async (blockchainId) => (
    Promise.all((await getPlatformRegistries(blockchainId)).registryIds.map((registryId) => (
      (getPoolsFn.straightCall({ blockchainId, registryId, preventQueryingFactoData }))
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId(registryId, poolData)).map((poolData) => (
          registryId.startsWith('factory') ?
            attachFactoryTag(poolData) :
            poolData
        )))
    )))
  )))
), {
  promise: true,
  maxAge: 60 * 1000, // 60s
  length: 2,
});

export default getAllCurvePoolsData;
