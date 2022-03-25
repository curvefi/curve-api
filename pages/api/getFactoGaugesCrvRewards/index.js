/**
 * Returns unboosted CRV APRs for sidechain facto gauges.
 */

import { fn } from 'utils/api';
import getAssetsPrices from 'utils/data/assets-prices';

import getFactoGauges from 'pages/api/getFactoGauges';
import getPools from 'pages/api/getPools';
import configs from 'constants/configs';

export default fn(async ({ blockchainId }) => {
  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum'; // Default value

  const config = configs[blockchainId];

  const { gauges } = await getFactoGauges.straightCall({ blockchainId });
  const { poolData: mainPoolData } = await getPools.straightCall({ blockchainId, registryId: 'main' });
  const { poolData: cryptoPoolData } = await getPools.straightCall({ blockchainId, registryId: 'crypto' });
  const { poolData: factoStablePoolData } = await getPools.straightCall({ blockchainId, registryId: 'factory' });
  const { poolData: factoCryptoPoolData } = (
    config.getFactoryCryptoRegistryAddress ?
      await getPools.straightCall({ blockchainId, registryId: 'factory-crypto' }) :
      { poolData: [] }
  );
  const poolData = [...mainPoolData, ...cryptoPoolData, ...factoStablePoolData, ...factoCryptoPoolData];

  const sideChainGauges = gauges.filter(({
    side_chain: isSideChain,
    name,
    is_killed: isKilled,
  }) => (
    isSideChain &&
    // name.startsWith(`${blockchainId}-`) &&
    !isKilled
  ));

  if (sideChainGauges.length === 0) {
    throw new Error(`No side gauges data for blockchainId "${blockchainId}"`);
  }

  const { 'curve-dao-token': crvPrice } = await getAssetsPrices(['curve-dao-token']);

  const sideChainGaugesApys = sideChainGauges.map(({
    swap_token: swapToken,
    name,
    gauge_data: {
      inflation_rate: rate, // This already takes gauge_relative_weight into account in side facto gauges
      totalSupply,
    },
  }) => {
    const lcAddress = swapToken.toLowerCase();
    // Not all pools have an lpTokenAddress
    const pool = poolData.find(({ address, lpTokenAddress }) => (
      (lpTokenAddress || address).toLowerCase() === lcAddress
    ));
    if (!pool) throw new Error(`Can't find pool data for swap address "${lcAddress}"`);

    const lpTokenUsdValue = pool.usdTotal / (pool.totalSupply / 1e18);
    const gaugeUsdValue = totalSupply / 1e18 * lpTokenUsdValue;

    const apy = (rate / 1e18) * (86400 * 365) / gaugeUsdValue * 0.4 * crvPrice * 100;

    return {
      address: lcAddress,
      name,
      apy,
    };
  });

  return { sideChainGaugesApys };
}, {
  maxAge: 60,
});
