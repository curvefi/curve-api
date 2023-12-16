/**
 * @openapi
 * /getCrvCircSupply:
 *   get:
 *     tags:
 *       - crvUSD
 *     description: Returns the circulating supply of crvUSD
 *     responses:
 *       200:
 *         description:
 */

import { fn } from '#root/utils/api.js';
import { multiCall } from '#root/utils/Calls.js';
import { trunc } from '#root/utils/Number.js';
import CRV_CIRCSUPPLY_UTIL_ABI from '#root/constants/abis/crv-circsupply-util.json' assert { type: 'json' };

const CRV_CIRCSUPPLY_UTIL_CONTRACT_ADDRESS = '0x14139EB676342b6bC8E41E0d419969f23A49881e';

export default fn(async () => {
  const [circSupply] = await multiCall([{
    address: CRV_CIRCSUPPLY_UTIL_CONTRACT_ADDRESS,
    abi: CRV_CIRCSUPPLY_UTIL_ABI,
    methodName: 'circulating_supply',
  }]);

  return {
    crvCirculatingSupply: trunc(circSupply / 1e18),
  };
}, {
  maxAge: 60 * 60, // 1h
  cacheKey: 'getCrvCircSupply',
});
