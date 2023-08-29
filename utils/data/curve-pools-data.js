import memoize from 'memoizee';
import { flattenArray } from 'utils/Array';
import { sequentialPromiseFlatMap } from 'utils/Async';
import getPools from 'pages/api/getPools';
import { BASE_API_DOMAIN } from 'constants/AppConstants';
import getPlatformRegistries from './curve-platform-registries';
import Request from 'utils/Request';

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
    Promise.all(getPlatformRegistries(blockchainId).map((registryId) => (
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
    Promise.all(getPlatformRegistries(blockchainId).map(async (registryId) => (
      Promise.resolve((await (await Request.get(`${BASE_API_DOMAIN}/api/getPools/${blockchainId}/${registryId}`)).json()).data)
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId('main', poolData)).map((poolData) => (
          registryId.startsWith('factory') ?
            attachFactoryTag(poolData) :
            poolData
        )))
    )))
  )))
);

export default getAllCurvePoolsData;
export { fetchAllCurvePoolsDataEndpoints };
