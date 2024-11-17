/**
 * @openapi
 * /getScrvusdTotalSupplyResult:
 *   get:
 *     tags:
 *       - crvUSD
 *     description: Returns the total supply of scrvUSD as a JSON object
 *     responses:
 *       200:
 *         description:
 */

import { fn } from '#root/utils/api.js';
import getScrvusdTotalSupplyNumberFn from '#root/routes/v1/getScrvusdTotalSupplyNumber.js';

export default fn(async () => {
  const scrvusdTotalSupply = await getScrvusdTotalSupplyNumberFn.straightCall();

  return { result: scrvusdTotalSupply };
}, {
  maxAge: 5 * 60, // 5m
  cacheKey: 'getScrvusdTotalSupplyResult',
  returnFlatData: true,
  appendGeneratedTime: false,
});
