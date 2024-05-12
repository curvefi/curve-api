import memoize from 'memoizee';
import configs from '#root/constants/configs/index.js'
import { flattenArray } from '#root/utils/Array.js';
import { sequentialPromiseFlatMap } from '#root/utils/Async.js';
import getLendingVaultsFn from '#root/routes/v1/getLendingVaults/[lendingBlockchainId]/[lendingRegistryId].js';

const attachBlockchainId = (blockchainId, vaultData) => ({
  ...vaultData,
  blockchainId,
});

const attachRegistryId = (registryId, vaultData) => ({
  ...vaultData,
  registryId,
});

const getAllCurveLendingVaultsData = memoize(async (blockchainIds, preventQueryingFactoData = true) => (
  flattenArray(await sequentialPromiseFlatMap(blockchainIds, async (lendingBlockchainId) => {
    const config = configs[lendingBlockchainId];
    const platformRegistries = Object.keys(config.lendingVaultRegistries ?? []);

    return Promise.all(platformRegistries.map((lendingRegistryId) => (
      (getLendingVaultsFn.straightCall({ lendingBlockchainId, lendingRegistryId, preventQueryingFactoData }))
        .then((res) => res.lendingVaultData.map((vaultData) => attachBlockchainId(lendingBlockchainId, vaultData)).map((vaultData) => attachRegistryId(lendingRegistryId, vaultData)))
    )))
  }))
), {
  promise: true,
  maxAge: 60 * 1000, // 60s
  length: 2,
});

export default getAllCurveLendingVaultsData;
