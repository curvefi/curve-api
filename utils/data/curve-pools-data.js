import memoize from 'memoizee';
import { flattenArray } from 'utils/Array';
import { sequentialPromiseFlatMap } from 'utils/Async';
import { API } from 'utils/Request';

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
    Promise.all([
      API.get(`getPools/${blockchainId}/main/true`)
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId('main', poolData))),
      API.get(`getPools/${blockchainId}/crypto/true`)
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId('crypto', poolData))),
      API.get(`getPools/${blockchainId}/factory/true`)
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId('factory', poolData)).map(attachFactoryTag)),
      API.get(`getPools/${blockchainId}/factory-crypto/true`)
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId('factory-crypto', poolData)).map(attachFactoryTag)),
    ])
  )))
), {
  promise: true,
  maxAge: 60 * 1000, // 60s
});

export default getAllCurvePoolsData;
