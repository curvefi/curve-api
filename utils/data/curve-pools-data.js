import memoize from 'memoizee';
import { flattenArray } from 'utils/Array';
import { sequentialPromiseFlatMap } from 'utils/Async';
import getPools from 'pages/api/getPools';
import getPlatformRegistries from './curve-platform-registries';

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
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId('main', poolData)))
    )))
  )))
), {
  promise: true,
  maxAge: 60 * 1000, // 60s
});

export default getAllCurvePoolsData;
