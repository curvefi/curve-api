import memoize from 'memoizee';
import { flattenArray } from 'utils/Array';
import { sequentialPromiseFlatMap } from 'utils/Async';
import getPools from 'pages/api/getPools';

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
      (getPools.straightCall({ blockchainId, registryId: 'main', preventQueryingFactoData: true }))
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId('main', poolData))),
      (getPools.straightCall({ blockchainId, registryId: 'crypto', preventQueryingFactoData: true }))
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId('crypto', poolData))),
      (getPools.straightCall({ blockchainId, registryId: 'factory', preventQueryingFactoData: true }))
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId('factory', poolData)).map(attachFactoryTag)),
      (getPools.straightCall({ blockchainId, registryId: 'factory-crypto', preventQueryingFactoData: true }))
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId('factory-crypto', poolData)).map(attachFactoryTag)),
      (getPools.straightCall({ blockchainId, registryId: 'factory-crvusd', preventQueryingFactoData: true }))
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId('factory-crvusd', poolData)).map(attachFactoryTag)),
      (getPools.straightCall({ blockchainId, registryId: 'factory-eywa', preventQueryingFactoData: true }))
        .then((res) => res.poolData.map((poolData) => attachBlockchainId(blockchainId, poolData)).map((poolData) => attachRegistryId('factory-eywa', poolData)).map(attachFactoryTag)),
    ])
  )))
), {
  promise: true,
  maxAge: 60 * 1000, // 60s
});

export default getAllCurvePoolsData;
