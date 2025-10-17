/**
 * @openapi
 * /getCrvusdTotalSupply:
 *   get:
 *     tags:
 *       - crvUSD
 *     description: Returns the total supply of crvUSD
 *     responses:
 *       200:
 *         description:
 */

import { fn } from '#root/utils/api.js';
import getCrvusdTotalSupplyNumber from '#root/routes/v1/getCrvusdTotalSupplyNumber.js'

export default fn(async () => {
  const crvusdTotalSupply = await getCrvusdTotalSupplyNumber.straightCall();

  return { crvusdTotalSupply };
}, {
  maxAge: 1 * 60,
  cacheKey: 'getCrvusdTotalSupply',
});
