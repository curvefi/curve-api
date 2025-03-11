/**
 * @openapi
 * /getVolumes/ethereum/crvusd-amms:
 *   get:
 *     tags:
 *       - Volumes and APYs
 *       - crvUSD
 *     description: |
 *       Returns last daily volume for each [crvUSD AMM](https://docs.curve.fi/crvUSD/amm/)
 *     responses:
 *       200:
 *         description:
 */

import { fn } from '#root/utils/api.js';
import { sum } from '#root/utils/Array.js';
import { sequentialPromiseMap } from '#root/utils/Async.js';
import { getNowTimestamp } from '#root/utils/Date.js';
import { fetchPages } from '#root/utils/Pagination.js';

export default fn(async () => {
  const crvusdMarkets = await fetchPages('https://prices.curve.fi/v1/crvusd/markets/ethereum', {
    fetch_on_chain: false,
    per_page: 100,
  });

  const amms = crvusdMarkets.map(({ llamma }) => llamma);
  const timestampNow = getNowTimestamp();
  const timestampDayAgo = timestampNow - 86400;

  const volumeData = await sequentialPromiseMap(amms, async (amm) => {
    const { data } = await (await fetch(`https://prices.curve.fi/v1/crvusd/llamma_ohlc/ethereum/${amm}?agg_number=1&agg_units=day&start=${timestampDayAgo}&end=${timestampNow}`)).json();

    return {
      address: amm,
      volumeUSD: data[0]?.volume ?? 0,
    };
  });

  return {
    amms: volumeData,
    totalVolume: sum(volumeData.map(({ volumeUSD }) => volumeUSD)),
  };
}, {
  maxAge: 60 * 60,
  cacheKey: 'getVolumes/ethereum/crvusd-amms',
});
