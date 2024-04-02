/**
 * @openapi
 * /getLendingVaults/{lendingBlockchainId}/{lendingRegistryId}:
 *   get:
 *     tags:
 *       - Lending
 *     description: |
 *       Returns information on all lending vaults, in a specific registry, on a specific chain.
 *     parameters:
 *       - $ref: '#/components/parameters/lendingBlockchainId'
 *       - $ref: '#/components/parameters/lendingRegistryId'
 *     responses:
 *       200:
 *         description:
 */

import Web3 from 'web3';
import configs from '#root/constants/configs/index.js'
import { fn, ParamError } from '#root/utils/api.js';
import { multiCall } from '#root/utils/Calls.js';
import onewayVaultAbi from '#root/constants/abis/lending/oneway/vault.json' assert { type: 'json' };
import onewayRegistryAbi from '#root/constants/abis/lending/oneway/registry.json' assert { type: 'json' };
import { flattenArray, sum, uniq } from '#root/utils/Array.js';
import getTokensData from '#root/utils/data/tokens-data.js';
import { lc } from '#root/utils/String.js';
import getTokensPrices from '#root/utils/data/tokens-prices.js';
import { IS_DEV } from '#root/constants/AppConstants.js';

const EMPTY_RESULT = { lendingVaultData: [], tvlAll: 0 };

const getLendingVaults = async ({ lendingBlockchainId, lendingRegistryId }) => {
  const config = configs[lendingBlockchainId];
  if (typeof config === 'undefined') {
    throw new ParamError(`No config data for lendingBlockchainId "${lendingBlockchainId}"`);
  }

  const {
    rpcUrl,
    lendingVaultRegistries,
    multicall2Address,
  } = config;

  const platformRegistries = Object.keys(lendingVaultRegistries ?? []);

  if (!platformRegistries.includes(lendingRegistryId)) {
    if (IS_DEV) console.error(`No registry "${lendingRegistryId}" found for lendingBlockchainId "${lendingBlockchainId}"`);
    return EMPTY_RESULT;
  }

  const registryAddress = lendingVaultRegistries[lendingRegistryId];

  const getIdForVault = (id) => `${lendingRegistryId}-${id}`;

  const VAULT_ABI = (
    lendingRegistryId === 'twoway' ? undefined :
      onewayVaultAbi
  );

  const REGISTRY_ABI = (
    lendingRegistryId === 'twoway' ? undefined :
      onewayRegistryAbi
  );

  const web3 = new Web3(rpcUrl);
  const networkSettingsParam = (
    typeof multicall2Address !== 'undefined' ?
      { networkSettings: { web3, multicall2Address } } :
      undefined
  );

  const [marketCount] = await multiCall([{
    address: registryAddress,
    abi: REGISTRY_ABI,
    methodName: 'market_count',
    ...networkSettingsParam,
  }]);

  if (marketCount === 0) return EMPTY_RESULT;

  const marketIds = Array(Number(marketCount)).fill(0).map((_, i) => i);

  const vaultAddresses = await multiCall(marketIds.map((id) => ({
    address: registryAddress,
    abi: REGISTRY_ABI,
    methodName: 'vaults',
    params: [id],
    metaData: { vaultId: id },
    ...networkSettingsParam,
  })));

  const vaultsData = await multiCall(flattenArray(vaultAddresses.map(({ data: address, metaData: { vaultId } }) => [{
    address,
    abi: VAULT_ABI,
    methodName: 'borrow_apr',
    metaData: { vaultId, vaultAddress: address, type: 'borrowApr' },
    ...networkSettingsParam,
  }, {
    address,
    abi: VAULT_ABI,
    methodName: 'lend_apr',
    metaData: { vaultId, vaultAddress: address, type: 'lendApr' },
    ...networkSettingsParam,
  }, {
    address,
    abi: VAULT_ABI,
    methodName: 'asset', // Identical to borrowed_token
    metaData: { vaultId, vaultAddress: address, type: 'assetAddress' },
    ...networkSettingsParam,
  }, {
    address,
    abi: VAULT_ABI,
    methodName: 'totalAssets', // totalAssets === pricePerShare * totalShares
    metaData: { vaultId, vaultAddress: address, type: 'totalAssets' },
    ...networkSettingsParam,
  }, {
    address,
    abi: VAULT_ABI,
    methodName: 'collateral_token',
    metaData: { vaultId, vaultAddress: address, type: 'collateralAssetAddress' },
    ...networkSettingsParam,
  }, {
    address,
    abi: VAULT_ABI,
    methodName: 'pricePerShare',
    metaData: { vaultId, vaultAddress: address, type: 'pricePerShare' },
    ...networkSettingsParam,
  }, {
    address,
    abi: VAULT_ABI,
    methodName: 'totalSupply',
    metaData: { vaultId, vaultAddress: address, type: 'totalShares' },
    ...networkSettingsParam,
  }])));

  const allTokenAddresses = uniq(vaultsData.filter(({ metaData }) => (
    metaData.type === 'assetAddress' ||
    metaData.type === 'collateralAssetAddress'
  )).map(({ data }) => data));
  const [allTokenData, allTokenPrices] = await Promise.all([
    getTokensData(allTokenAddresses, lendingBlockchainId),
    getTokensPrices(allTokenAddresses, lendingBlockchainId),
  ]);

  const emptyData = marketIds.map((id) => ({ id: getIdForVault(id) }));
  const mergedVaultData = vaultsData.reduce((accu, { data, metaData: { vaultId, vaultAddress, type } }) => {
    const index = accu.findIndex(({ id }) => id === getIdForVault(vaultId));
    const vaultInfo = accu[index];

    /**
     * Retrieving assetAddress from the accu works only because the place that needs it (processing of totalAssets)
     * is executed in sequence, once the accu already contains assetAddress.
     */
    const assetTokenData = (
      typeof vaultInfo.assetAddress !== 'undefined' ?
        allTokenData[lc(vaultInfo.assetAddress)] :
        undefined
    );

    accu[index] = {
      ...vaultInfo,
      address: vaultAddress,
      vaultId,
      [type]: (
        (type === 'totalShares' || type === 'pricePerShare' || type === 'borrowApr' || type === 'lendApr') ? (data / 1e18) :
          (type === 'totalAssets') ? (data / (10 ** assetTokenData.decimals)) :
            (type === 'sharesDecimals') ? Number(data) :
              data
      ),
    };

    return accu;
  }, emptyData);

  const augmentedVaultData = mergedVaultData.map(({
    address,
    assetAddress,
    borrowApr,
    collateralAssetAddress,
    id,
    vaultId,
    lendApr,
    pricePerShare,
    totalShares,
  }) => {
    const borrowApy = (1 + borrowApr / 365) ** 365 - 1;
    const lendApy = (1 + lendApr / 365) ** 365 - 1;

    const assetTokenPrice = allTokenPrices[lc(assetAddress)];

    const borrowedTokenData = allTokenData[lc(assetAddress)];
    const collateralTokenData = allTokenData[lc(collateralAssetAddress)];
    const name = `Borrow ${borrowedTokenData.symbol} (${collateralTokenData.symbol} collateral)`;

    const lendingVaultUrls = {
      deposit: `${config.lendingVaultsBaseUrl}${config.lendingVaultRegistriesUrlFragments[lendingRegistryId]}-${vaultId}/vault/deposit`,
      withdraw: `${config.lendingVaultsBaseUrl}${config.lendingVaultRegistriesUrlFragments[lendingRegistryId]}-${vaultId}/vault/withdraw`,
    };

    const totalSuppliedUsd = pricePerShare * totalShares * assetTokenPrice;

    return {
      id,
      name,
      address,
      rates: {
        borrowApr,
        borrowApy,
        borrowApyPcent: borrowApy * 100,
        lendApr,
        lendApy,
        lendApyPcent: lendApy * 100,
      },
      assets: {
        borrowed: borrowedTokenData,
        collateral: collateralTokenData,
      },
      vaultShares: {
        pricePerShare,
        totalShares,
      },
      totalSupplied: {
        total: pricePerShare * totalShares,
        usdTotal: totalSuppliedUsd,
      },
      lendingVaultUrls,
      usdTotal: totalSuppliedUsd, // This is missing the total collateral value supplied
    };
  });

  return {
    lendingVaultData: augmentedVaultData,
    tvl: sum(augmentedVaultData.map(({ usdTotal }) => usdTotal)),
  };
};

const getLendingVaultsFn = fn(getLendingVaults, {
  maxAge: 5 * 60,
  cacheKey: ({ lendingBlockchainId, lendingRegistryId }) => `getLendingVaults-${lendingBlockchainId}-${lendingRegistryId}`,
});

export default getLendingVaultsFn;
