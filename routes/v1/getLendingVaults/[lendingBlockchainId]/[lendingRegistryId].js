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
import swr from '#root/utils/swr.js';
import { multiCall } from '#root/utils/Calls.js';
import onewayVaultAbi from '#root/constants/abis/lending/oneway/vault.json' assert { type: 'json' };
import vaultControllerAbi from '#root/constants/abis/lending/controller.json' assert { type: 'json' };
import vaultAmmAbi from '#root/constants/abis/lending/amm.json' assert { type: 'json' };
import onewayRegistryAbi from '#root/constants/abis/lending/oneway/registry.json' assert { type: 'json' };
import ERC20_ABI from '#root/constants/abis/erc20.json' assert { type: 'json' };
import { flattenArray, sum, uniq } from '#root/utils/Array.js';
import getTokensData from '#root/utils/data/tokens-data.js';
import { lc } from '#root/utils/String.js';
import getTokensPrices from '#root/utils/data/tokens-prices.js';
import { IS_DEV } from '#root/constants/AppConstants.js';
import { sequentialPromiseMap } from '#root/utils/Async.js';
import getAllGaugesFn, { SIDECHAINS_WITH_FACTORY_GAUGES } from '#root/routes/v1/getAllGauges.js';
import { trunc } from '#root/utils/Number.js';

const MAX_AGE = 5 * 60;

// Chains for which curve-prices is used as only data source for coins usd prices
const CURVE_PRICES_AVAILABLE_CHAIN_IDS = [
  // 'ethereum',
];

const EMPTY_RESULT = { lendingVaultData: [], tvlAll: 0 };

const getEthereumOnlyData = async ({ preventQueryingFactoData, blockchainId }) => {
  let gaugesData = {};
  let gaugeRewards = {};

  if (!preventQueryingFactoData) {
    const getFactoryV2GaugeRewards = (
      blockchainId === 'ethereum' ?
        (await import('#root/utils/data/getFactoryV2GaugeRewards.js')).default :
        (await import('#root/utils/data/getFactoryV2SidechainGaugeRewards.js')).default
    );

    gaugesData = (
      (blockchainId === 'ethereum' || SIDECHAINS_WITH_FACTORY_GAUGES.includes(blockchainId)) ?
        await getAllGaugesFn.straightCall({ blockchainId }) :
        {}
    );

    if (blockchainId === 'ethereum') {
      const factoryGauges = Array.from(Object.values(gaugesData)).filter(({ side_chain }) => !side_chain);
      const factoryGaugesAddresses = factoryGauges.map(({ gauge }) => gauge).filter((s) => s); // eslint-disable-line no-param-reassign

      gaugeRewards = await getFactoryV2GaugeRewards({ blockchainId, factoryGaugesAddresses });
    } else {
      const factoryGauges = Array.from(Object.values(gaugesData)).filter(({ side_chain }) => side_chain);

      gaugeRewards = await getFactoryV2GaugeRewards({ blockchainId, gauges: factoryGauges });
    }
  }

  const gaugesDataArray = Array.from(Object.values(gaugesData));

  return {
    gaugesDataArray,
    gaugeRewards,
  };
};

const getEthereumOnlyDataSwr = async ({ preventQueryingFactoData, blockchainId }) => (
  (await swr(
    `getEthereumOnlyDataLendingVaults-${blockchainId}-${preventQueryingFactoData}`,
    () => getEthereumOnlyData({ preventQueryingFactoData, blockchainId }),
    { minTimeToStale: MAX_AGE * 1000 } // See CacheSettings.js
  )).value
);

const getLendingVaults = async ({ lendingBlockchainId, lendingRegistryId, preventQueryingFactoData }) => {
  const config = configs[lendingBlockchainId];
  if (typeof config === 'undefined') {
    throw new ParamError(`No config data for lendingBlockchainId "${lendingBlockchainId}"`);
  }

  const USE_CURVE_PRICES_DATA = CURVE_PRICES_AVAILABLE_CHAIN_IDS.includes(lendingBlockchainId);

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
  }, {
    address,
    abi: VAULT_ABI,
    methodName: 'amm',
    metaData: { vaultId, vaultAddress: address, type: 'ammAddress' },
    ...networkSettingsParam,
  }, {
    address,
    abi: VAULT_ABI,
    methodName: 'controller',
    metaData: { vaultId, vaultAddress: address, type: 'controllerAddress' },
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
  }, marketIds.map((id) => ({ id: getIdForVault(id) })));

  const controllerAddresses = vaultsData.filter(({ metaData }) => metaData.type === 'controllerAddress');
  const ammAddresses = vaultsData.filter(({ metaData }) => metaData.type === 'ammAddress');
  const otherData = await multiCall(flattenArray([
    ...controllerAddresses.map(({ data: controllerAddress, metaData: { vaultId, vaultAddress } }) => {
      const index = mergedVaultData.findIndex(({ id }) => id === getIdForVault(vaultId));
      const vaultInfo = mergedVaultData[index];
      const { assetAddress } = vaultInfo;

      return [{
        address: controllerAddress,
        abi: vaultControllerAbi,
        methodName: 'total_debt',
        metaData: { vaultId, vaultAddress, type: 'borrowed' },
        ...networkSettingsParam,
      }, {
        address: controllerAddress,
        abi: vaultControllerAbi,
        methodName: 'monetary_policy',
        metaData: { vaultId, vaultAddress, type: 'monetaryPolicyAddress' },
        ...networkSettingsParam,
      }, {
        address: assetAddress,
        abi: ERC20_ABI,
        methodName: 'balanceOf',
        params: [controllerAddress],
        metaData: { vaultId, vaultAddress, type: 'availableToBorrow' },
        ...networkSettingsParam,
      }];
    }),
    ...ammAddresses.map(({ data: ammAddress, metaData: { vaultId, vaultAddress } }) => {
      const index = mergedVaultData.findIndex(({ id }) => id === getIdForVault(vaultId));
      const vaultInfo = mergedVaultData[index];
      const { assetAddress, collateralAssetAddress } = vaultInfo;

      return [{
        address: assetAddress,
        abi: ERC20_ABI,
        methodName: 'balanceOf',
        params: [ammAddress],
        metaData: { vaultId, vaultAddress, type: 'ammBalanceBorrowed' },
        ...networkSettingsParam,
      }, {
        address: collateralAssetAddress,
        abi: ERC20_ABI,
        methodName: 'balanceOf',
        params: [ammAddress],
        metaData: { vaultId, vaultAddress, type: 'ammBalanceCollateral' },
        ...networkSettingsParam,
      }, {
        address: ammAddress,
        abi: vaultAmmAbi,
        methodName: 'admin_fees_x',
        metaData: { vaultId, vaultAddress, type: 'ammFeesBorrowed' },
        ...networkSettingsParam,
      }, {
        address: ammAddress,
        abi: vaultAmmAbi,
        methodName: 'admin_fees_y',
        metaData: { vaultId, vaultAddress, type: 'ammFeesCollateral' },
        ...networkSettingsParam,
      }];
    }),
  ]));

  const mergedOtherData = otherData.reduce((accu, { data, metaData: { vaultId, vaultAddress, type } }) => {
    const index = accu.findIndex(({ id }) => id === getIdForVault(vaultId));
    const vaultInfo = mergedVaultData[index];
    const otherInfo = accu[index];

    const {
      assetAddress,
      collateralAssetAddress,
    } = vaultInfo;

    const borrowedTokenData = allTokenData[lc(assetAddress)];
    const collateralTokenData = allTokenData[lc(collateralAssetAddress)];

    accu[index] = {
      ...otherInfo,
      address: vaultAddress,
      vaultId,
      [type]: (
        (
          type === 'borrowed' ||
          type === 'availableToBorrow' ||
          type === 'ammBalanceBorrowed' ||
          type === 'ammFeesBorrowed'
        ) ? (data / (10 ** borrowedTokenData.decimals)) :
          (
            type === 'ammBalanceCollateral' ||
            type === 'ammFeesCollateral'
          ) ? (data / (10 ** collateralTokenData.decimals)) :
            data
      ),
    };

    return accu;
  }, marketIds.map((id) => ({ id: getIdForVault(id) })));

  const augmentedVaultData = await sequentialPromiseMap(mergedVaultData, async ({
    address,
    controllerAddress,
    ammAddress,
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
    const collateralTokenPrice = allTokenPrices[lc(collateralAssetAddress)];

    const borrowedTokenData = allTokenData[lc(assetAddress)];
    const collateralTokenData = allTokenData[lc(collateralAssetAddress)];
    const name = `Borrow ${borrowedTokenData.symbol} (${collateralTokenData.symbol} collateral)`;

    const lendingVaultUrls = {
      deposit: `${config.lendingVaultsBaseUrl}${config.lendingVaultRegistriesUrlFragments[lendingRegistryId]}-${vaultId}/vault/deposit`,
      withdraw: `${config.lendingVaultsBaseUrl}${config.lendingVaultRegistriesUrlFragments[lendingRegistryId]}-${vaultId}/vault/withdraw`,
      borrow: `${config.lendingVaultsBaseUrl}${config.lendingVaultRegistriesUrlFragments[lendingRegistryId]}-${vaultId}/create`,
    };

    const totalSuppliedUsd = pricePerShare * totalShares * assetTokenPrice;

    const ethereumOnlyData = await getEthereumOnlyDataSwr({ preventQueryingFactoData, blockchainId: lendingBlockchainId });
    const gaugeData = (
      typeof ethereumOnlyData !== 'undefined' ? (
        ethereumOnlyData.gaugesDataArray.find(({ lendingVaultAddress, blockchainId: gaugeDataBlockchainId }) => (
          lendingBlockchainId === gaugeDataBlockchainId &&
          lc(lendingVaultAddress) === lc(address)
        ))
      ) : undefined
    );
    const gaugeAddress = typeof gaugeData !== 'undefined' ? gaugeData.gauge?.toLowerCase() : undefined;
    const gaugeRewardsInfo = gaugeAddress ? ethereumOnlyData.gaugeRewards[gaugeAddress] : undefined;

    const gaugeRewards = (
      typeof gaugeRewardsInfo === 'undefined' ?
        undefined :
        await sequentialPromiseMap(gaugeRewardsInfo, async ({
          tokenAddress,
          apyData,
          ...rewardInfo
        }) => {
          const gaugeTotalSupply = apyData.totalSupply;
          const gaugeUsdTotal = gaugeTotalSupply / totalShares * totalSuppliedUsd;
          const tokenCoingeckoPrice = apyData.tokenPrice;

          let tokenPrice;
          if (!USE_CURVE_PRICES_DATA) {
            // Note: we're not using deriveMissingCoinPrices() here but we could if needed later on
            tokenPrice = tokenCoingeckoPrice;
          } else {
            // Here need CURVE_PRICES_DATA
            tokenPrice = curvePrices[lc(tokenAddress)] || tokenCoingeckoPrice || null;
          }

          return {
            ...rewardInfo,
            tokenAddress,
            tokenPrice,
            apy: (
              apyData.isRewardStillActive ?
                apyData.rate * 86400 * 365 * tokenPrice / gaugeUsdTotal * 100 :
                0
            ),
          };
        })
    );

    const {
      borrowed,
      availableToBorrow,
      ammBalanceBorrowed,
      ammBalanceCollateral,
      ammFeesBorrowed,
      ammFeesCollateral,
      monetaryPolicyAddress,
    } = mergedOtherData.find((data) => data.id === id);

    const borrowedUsd = borrowed * assetTokenPrice;
    const availableToBorrowUsd = availableToBorrow * assetTokenPrice;

    const ammBalanceBorrowedNet = ammBalanceBorrowed - ammFeesBorrowed;
    const ammBalanceBorrowedNetUsd = ammBalanceBorrowedNet * assetTokenPrice;
    const ammBalanceCollateralNet = ammBalanceCollateral - ammFeesCollateral;
    const ammBalanceCollateralNetUsd = ammBalanceCollateralNet * collateralTokenPrice;

    return {
      id,
      name,
      address,
      controllerAddress,
      ammAddress,
      monetaryPolicyAddress,
      rates: {
        borrowApr: Number(trunc(borrowApr, 4)),
        borrowApy: Number(trunc(borrowApy, 4)),
        borrowApyPcent: Number(trunc(borrowApy * 100, 4)),
        lendApr: Number(trunc(lendApr, 4)),
        lendApy: Number(trunc(lendApy, 4)),
        lendApyPcent: Number(trunc(lendApy * 100, 4)),
      },
      gaugeAddress,
      gaugeRewards: (
        (gaugeAddress && !gaugeData.is_killed) ?
          (gaugeRewards || []) :
          undefined
      ),
      assets: {
        borrowed: {
          ...borrowedTokenData,
          usdPrice: Number(trunc(assetTokenPrice, 2)),
        },
        collateral: {
          ...collateralTokenData,
          usdPrice: Number(trunc(collateralTokenPrice, 2)),
        },
      },
      vaultShares: {
        pricePerShare,
        totalShares: Number(trunc(totalShares, 2)),
      },
      totalSupplied: {
        total: Number(trunc(pricePerShare * totalShares, 2)),
        usdTotal: Number(trunc(totalSuppliedUsd, 2)),
      },
      borrowed: {
        total: Number(trunc(borrowed, 2)),
        usdTotal: Number(trunc(borrowedUsd, 2)),
      },
      availableToBorrow: {
        total: Number(trunc(availableToBorrow, 2)),
        usdTotal: Number(trunc(availableToBorrowUsd, 2)),
      },
      lendingVaultUrls,
      usdTotal: Number(trunc(totalSuppliedUsd, 2)), // This is missing the total collateral value supplied
      ammBalances: {
        ammBalanceBorrowed: Number(trunc(ammBalanceBorrowedNet, 2)),
        ammBalanceBorrowedUsd: Number(trunc(ammBalanceBorrowedNetUsd, 2)),
        ammBalanceCollateral: Number(trunc(ammBalanceCollateralNet, 2)),
        ammBalanceCollateralUsd: Number(trunc(ammBalanceCollateralNetUsd, 2)),
      },
    };
  });

  return {
    lendingVaultData: augmentedVaultData,
    tvl: sum(augmentedVaultData.map(({ usdTotal }) => usdTotal)),
  };
};

const getLendingVaultsFn = fn(getLendingVaults, {
  maxAge: MAX_AGE,
  cacheKey: ({ lendingBlockchainId, lendingRegistryId, preventQueryingFactoData }) => `getLendingVaults-${lendingBlockchainId}-${lendingRegistryId}-${preventQueryingFactoData}`,
  paramSanitizers: {
    /**
     * Set to true to prevent circular dependencies when calling getLendingVaults() in an area of the code that getLendingVaults()
     * itself calls, e.g. getFactoGauges sets this setting to true because it's interested in the pool list, and
     * the pool list only.
     */
    preventQueryingFactoData: ({ preventQueryingFactoData }) => ({
      isValid: (typeof preventQueryingFactoData === 'boolean'),
      defaultValue: false,
    }),
  }
});

export default getLendingVaultsFn;
