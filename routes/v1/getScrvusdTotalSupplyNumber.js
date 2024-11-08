/**
 * @openapi
 * /getScrvusdTotalSupplyNumber:
 *   get:
 *     tags:
 *       - crvUSD
 *     description: Returns the total supply of scrvUSD as a number
 *     responses:
 *       200:
 *         description:
 */

import { fn } from '#root/utils/api.js';
import { multiCall } from '#root/utils/Calls.js';
import erc20Abi from '#root/constants/abis/erc20.json' assert { type: 'json' };
import { uintToBN } from '#root/utils/Web3/parsing.js';

export default fn(async () => {
  const [scrvusdTotalSupplyRaw] = await multiCall([{
    address: '0x0655977FEb2f289A4aB78af67BAB0d17aAb84367',
    abi: erc20Abi,
    methodName: 'totalSupply',
  }]);
  const scrvusdTotalSupply = uintToBN(scrvusdTotalSupplyRaw, 18);

  return scrvusdTotalSupply.toNumber();
}, {
  maxAge: 5 * 60, // 5m
  cacheKey: 'getScrvusdTotalSupplyNumber',
  returnFlatData: true,
  appendGeneratedTime: false,
});
