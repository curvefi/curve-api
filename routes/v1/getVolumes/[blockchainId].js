/**
 * @openapi
 * /getVolumes/{blockchainId}:
 *   get:
 *     tags:
 *       - Volumes and APYs
 *     description: |
 *       Returns all 24h volume and base APY data for Curve pools on each chain.
 *       It relies on the [Curve Prices API](https://prices.curve.fi/feeds-docs), and is meant as a more reliable replacement to the [`getSubgraphData/[blockchainId]`](#/default/get_getSubgraphData__blockchainId_) endpoints.
 *
 *       Note: Not all chains are currently available on the Curve Prices API. Currently available chains: `ethereum | polygon | arbitrum | base | optimism | fantom`
 *     parameters:
 *       - $ref: '#/components/parameters/blockchainId'
 *     responses:
 *       200:
 *         description:
 */

import { NotFoundError, fn } from '#root/utils/api.js';
import BN from 'bignumber.js';
import configs from '#root/constants/configs/index.js';
import getPoolListFn from '#root/routes/v1/getPoolList/[blockchainId].js';
import getBaseApysFn from '#root/routes/v1/getBaseApys/[blockchainId].js';
import { lc } from '#root/utils/String.js';
import { sumBN } from '#root/utils/Array.js';

// Note: keep the openapi description up to date when editing this array
const AVAILABLE_CHAIN_IDS = [
  'ethereum',
  'polygon',
  'arbitrum',
  'base',
  'optimism',
  'fantom',
];

const DEFAULT_VOLUME_DATA = {
  trading_volume_24h: 0,
  liquidity_volume_24h: 0,
  virtual_price: null, // The fact that this pool isn't indexed by curve-prices doesn't imply its vprice is 1e18, so there's no accurate fallback data available
};

export default fn(async ({ blockchainId }) => {
  const config = configs[blockchainId];

  if (typeof config === 'undefined' || !AVAILABLE_CHAIN_IDS.includes(blockchainId)) {
    throw new NotFoundError(`Endpoint "getVolumes" not available for "${blockchainId}"`);
  }

  const [
    { poolList: poolAddressesAndTypes },
    { data: poolData },
    { baseApys },
  ] = await Promise.all([
    getPoolListFn.straightCall({ blockchainId }),
    (await fetch(`https://prices.curve.fi/v1/chains/${blockchainId}`)).json(),
    getBaseApysFn.straightCall({ blockchainId }),
  ]);

  // The APYs retrieved from getBaseApysFn already include LST APYs
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
    const latestDailyApy = (
      (typeof poolBaseApys === 'undefined' || poolBaseApys.latestDailyApyPcent === null) ?
        BN(0) :
        BN(poolBaseApys.latestDailyApyPcent).div(100)
    );
    const latestWeeklyApy = (
      (typeof poolBaseApys === 'undefined' || poolBaseApys.latestWeeklyApyPcent === null) ?
        BN(0) :
        BN(poolBaseApys.latestWeeklyApyPcent).div(100)
    );

    return {
      address,
      type,
      volumeUSD: BN(tradingVolume).dp(2).toNumber() ?? 0, // Excluding liquidityVolume for consistency for now, may add it later
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
  cacheKey: ({ blockchainId }) => `getVolumes-${blockchainId}`,
});

export { AVAILABLE_CHAIN_IDS }; // Temporary export while this function is used internally in other places
