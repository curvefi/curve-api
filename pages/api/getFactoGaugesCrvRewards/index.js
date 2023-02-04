/**
 * Returns unboosted CRV APRs for sidechain facto gauges.
 */

import { fn } from 'utils/api';
import getAssetsPrices from 'utils/data/assets-prices';

import getFactoGauges from 'pages/api/getFactoGauges';
import getPools from 'pages/api/getPools';
import configs from 'constants/configs';
import { lc } from 'utils/String';

const NON_STANDARD_OUTDATED_GAUGES = [
  'celo-0x4969e38b8d37fc42a1897295Ea6d7D0b55944497',
].map(lc);

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
    gauge,
  }) => (
    isSideChain &&
    // name.startsWith(`${blockchainId}-`) &&
    !isKilled &&
    !NON_STANDARD_OUTDATED_GAUGES.includes(`${blockchainId}-${lc(gauge)}`)
  ));

  if (sideChainGauges.length === 0) {
    return { sideChainGaugesApys: [] };
  }

  const { 'curve-dao-token': crvPrice } = await getAssetsPrices(['curve-dao-token']);
  const sideChainGaugesApys = sideChainGauges.map(({
    swap,
    name,
    gauge_data: {
      inflation_rate: rate, // This already takes gauge_relative_weight into account in side facto gauges
      totalSupply,
    },
    areCrvRewardsStuckInBridge,
  }) => {
    const lcAddress = swap.toLowerCase();
    // Not all pools have an lpTokenAddress
    const pool = poolData.find(({ address }) => (
      address.toLowerCase() === lcAddress
    ));
    if (!pool) throw new Error(`Can't find pool data for swap address "${lcAddress}"`);

    const lpTokenUsdValue = pool.usdTotal / (pool.totalSupply / 1e18);
    const gaugeUsdValue = totalSupply / 1e18 * lpTokenUsdValue;

    const apy = (
      areCrvRewardsStuckInBridge ? 0 :
      ((rate / 1e18) * (86400 * 365) / gaugeUsdValue * 0.4 * crvPrice * 100)
    );

    return {
      address: lcAddress,
      name,
      apy,
      areCrvRewardsStuckInBridge,
    };
  });

  return { sideChainGaugesApys };
}, {
  maxAge: 5 * 60,
});
