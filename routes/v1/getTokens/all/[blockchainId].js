/**
 * @openapi
 * /getTokens/all/{blockchainId}:
 *   get:
 *     tags:
 *       - Tokens
 *     description: |
 *       Returns all tokens that can be found in Curve pools, on a specific chain.
 *       Pools need at least $10k TVL for tokens to make this list.
 *
 *       Note that tokens’ `usdPrice` is very simply the usd price of that token reported
 *       by the largest Curve pool on that chain, at that one point in time. There is no effort
 *       made to average or smooth out those prices, they should be used for presentation purposes only.
 *     parameters:
 *       - $ref: '#/components/parameters/blockchainId'
 *     responses:
 *       200:
 *         description: |
 *
 */

/**
 * This endpoint, along with all bulk getPools endpoints, is only cached at the CDN level:
 * it uses the `maxAgeCDN` prop only.
 *
 * This approach allows to take advantage of:
 * 1. Redis caching of all combinations pools(blockchainId, registryId): these are already
 *    cached and available, so this is very fast, the server only assembles them
 * 2. CDN caching: Cloudfront makes this assembled, large amount of data, available
 *    close to all API consumers
 *
 * This has two advantages:
 * 1. Redis isn't bloated with large amounts of data that are already stored in it
 *    in their unassembled form
 * 2. The server doesn't need to do that assembling too often, CDN caching makes sure of that
 */

import getAllCurvePoolsData from '#root/utils/data/curve-pools-data.js';
import { fn } from '#root/utils/api.js';
import { flattenArray, uniqBy } from '#root/utils/Array.js';
import { lc } from '#root/utils/String.js';

export default fn(async ({ blockchainId }) => {
  const poolData = await getAllCurvePoolsData([blockchainId], false);
  const coins = (
    uniqBy(flattenArray(
      poolData.filter(({ usdTotal }) => usdTotal > 10000)
        .sort(({ usdTotal: usdTotalA }, { usdTotal: usdTotalB }) => (
          usdTotalA > usdTotalB ? -1 :
            usdTotalA < usdTotalB ? 1 : 0
        ))
        .map(({ coins }) => coins)
    ), ({ address, blockchainId }) => `${lc(address)}-${blockchainId}`)
      .map(({
        address,
        decimals,
        symbol,
        name,
        usdPrice,
      }) => ({
        address,
        decimals: Number(decimals),
        symbol,
        name,
        usdPrice,
      }))
  );

  return {
    tokens: coins,
  };
}, {
  maxAgeCDN: 5 * 60,
  cacheKeyCDN: ({ blockchainId }) => `getAllTokens-${blockchainId}`,
});
