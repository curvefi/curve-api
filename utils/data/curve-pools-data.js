import memoize from 'memoizee';
import { flattenArray } from '#root/utils/Array.js';
import { sequentialPromiseFlatMap } from '#root/utils/Async.js';
import getPools from '#root/pages/api/getPools/index.js';
import { BASE_API_DOMAIN } from '#root/constants/AppConstants.js';
import getPlatformRegistries from '#root/utils/data/curve-platform-registries.js';
import Request from '#root/utils/Request.js';

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

const getAllCurvePoolsData = memoize(async (blockchainIds) => (
  flattenArray(await sequentialPromiseFlatMap(blockchainIds, async (blockchainId) => (
    Promise.all((await getPlatformRegistries(blockchainId)).registryIds.map((registryId) => (
      (getPools.straightCall({ blockchainId, registryId, preventQueryingFactoData: true }))
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
});

const fetchAllCurvePoolsDataEndpoints = async (blockchainIds) => (
  flattenArray(await sequentialPromiseFlatMap(blockchainIds, async (blockchainId) => (
    Promise.all((await getPlatformRegistries(blockchainId)).registryIds.map(async (registryId) => (
      Promise.resolve((await (await Request.get(`${BASE_API_DOMAIN}/api/getPools/${blockchainId}/${registryId}`)).json()).data)
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId(registryId, poolData)).map((poolData) => (
          registryId.startsWith('factory') ?
            attachFactoryTag(poolData) :
            poolData
        )))
    )))
  )))
);

export default getAllCurvePoolsData;
export { fetchAllCurvePoolsDataEndpoints };
