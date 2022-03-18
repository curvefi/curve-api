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
  const { poolData: mainPoolData } = await getPools.straightCall({ blockchainId, registryId: 'factory' });
  const { poolData: cryptoPoolData } = (
    config.getFactoryCryptoRegistryAddress ?
      await getPools.straightCall({ blockchainId, registryId: 'factory-crypto' }) :
      { poolData: [] }
  );
  const poolData = [...mainPoolData, ...cryptoPoolData];

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
    swap,
    name,
    gauge_data: {
      inflation_rate: rate, // This already takes gauge_relative_weight into account in side facto gauges
      totalSupply,
    },
  }) => {
    const lcAddress = swap.toLowerCase();
    const pool = poolData.find(({ address }) => address.toLowerCase() === lcAddress);
    if (!pool) throw new Error(`Can't find pool data for swap address "${swap}"`);

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
