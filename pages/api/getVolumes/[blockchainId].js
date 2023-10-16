/**
 * This endpoint returns all volume and base apy data for curve pools on each chain.
 * It relies on the [Curve Prices API](https://prices.curve.fi/feeds-docs), and is meant
 * as a more reliable replacement to the `getSubgraphData/[blockchainId]` endpoints
 * which rely on subgraphs.
 *
 * Note: currently, only Ethereum is available.
 */

import { fn } from 'utils/api';
import BN from 'bignumber.js';
import configs from 'constants/configs';
import { BASE_API_DOMAIN } from 'constants/AppConstants';
import getBaseApys from 'pages/api/getBaseApys/[blockchainId]';
import { lc } from 'utils/String';
import { sumBN } from 'utils/Array';

const AVAILABLE_CHAIN_IDS = [
  'ethereum',
];

const DEFAULT_VOLUME_DATA = {
  trading_volume_24h: 0,
  liquidity_volume_24h: 0,
  virtual_price: null, // The fact that this pool isn't indexed by curve-prices doesn't imply its vprice is 1e18, so there's no accurate fallback data available
};

export default fn(async ({ blockchainId }) => {
  const config = configs[blockchainId];

  if (typeof config === 'undefined' || !AVAILABLE_CHAIN_IDS.includes(blockchainId)) {
    throw new Error(`Endpoint "getVolumes" not available for "${blockchainId}"`);
  }

  const [
    { data: { poolList: poolAddressesAndTypes } },
    { data: poolData },
    { baseApys },
  ] = await Promise.all([
    (await fetch(`${BASE_API_DOMAIN}/api/getPoolList/${blockchainId}`)).json(),
    (await fetch(`https://prices.curve.fi/v1/chains/${blockchainId}`)).json(),
    getBaseApys.straightCall({ blockchainId }),
  ]);

  const pools = poolAddressesAndTypes.map(({ address, type }) => {
    const lcAddress = lc(address)
    const volumeData = poolData.find((data) => lc(data.address) === lcAddress);

    const {
      trading_volume_24h: tradingVolume,
      // liquidity_volume_24h: liquidityVolume, // Unused atm
      virtual_price: virtualPrice,
    } = (volumeData || DEFAULT_VOLUME_DATA);

    // Some pools aren't indexed by curve-prices, simply because they haven’t registered any trades recently.
    // However this doesn't mean that their APR is null, as e.g. their deposits can be in deposit pools for
    // lending pools. This falls back to freshly-fetched APYs for these pools.
    const poolBaseApys = baseApys.find((pool) => lc(address) === lc(pool.address));
    const latestDailyApy = BN(poolBaseApys.latestDailyApyPcent).div(100);
    const latestWeeklyApy = BN(poolBaseApys.latestWeeklyApyPcent).div(100);

    return {
      address,
      type,
      volumeUSD: BN(tradingVolume).dp(2).toNumber(), // Excluding liquidityVolume for consistency for now, may add it later
      latestDailyApyPcent: BN(latestDailyApy).times(100).dp(2).toNumber(),
      latestWeeklyApyPcent: BN(latestWeeklyApy).times(100).dp(2).toNumber(),
      virtualPrice,
    }
  }).filter((o) => o !== null);

  const totalStableVolume = sumBN(pools.filter(({ type }) => !type.includes('crypto')).map(({ volumeUSD }) => volumeUSD));
  const totalCryptoVolume = sumBN(pools.filter(({ type }) => type.includes('crypto')).map(({ volumeUSD }) => volumeUSD));
  const totalVolume = totalStableVolume.plus(totalCryptoVolume);
  const cryptoVolumeSharePcent = totalCryptoVolume.div(totalVolume).times(100);

  return {
    pools,
    totalVolumes: {
      totalStableVolume: totalStableVolume.dp(2).toNumber(),
      totalCryptoVolume: totalCryptoVolume.dp(2).toNumber(),
      totalVolume: totalVolume.dp(2).toNumber(),
      cryptoVolumeSharePcent: cryptoVolumeSharePcent.dp(2).toNumber(),
    },
  };
}, {
  maxAge: 60,
});

export { AVAILABLE_CHAIN_IDS }; // Temporary export while this function is used internally in other places
