/**
 * @openapi
 * /getETHprice:
 *   get:
 *     deprecated: true
 *     tags:
 *       - Deprecated
 *     description: Returns the current Ethereum USD price
 *     responses:
 *       200:
 *         description:
 */

import Web3 from 'web3';
import * as WEB3_CONSTANTS from '#root/constants/Web3.js'
import { fn } from '#root/utils/api.js';
import aggregatorInterfaceABI from '#root/constants/abis/aggregator.json' assert { type: 'json' };

const web3 = new Web3(WEB3_CONSTANTS.RPC_URL);
const chainlinkETHUSDaddress = '0xF79D6aFBb6dA890132F9D7c355e3015f15F3406F';

export default fn(async () => {
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1000, { data: 'chainlink' }));
  const data = await Promise.race([
    (await fetch('https://api.coinpaprika.com/v1/tickers/eth-ethereum')).json(),
    (await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')).json(),
    timeoutPromise,
  ]);

  let price;

  if (data.quotes) {
    price = data.quotes.USD.price;
  } else if (data.ethereum) {
    price = data.ethereum.usd;
  } else {
    const ETHUSDpricefeed = new web3.eth.Contract(aggregatorInterfaceABI, chainlinkETHUSDaddress);
    price = await ETHUSDpricefeed.methods.latestAnswer().call() / 1e8;
  }
  return { price };
}, {
  maxAge: 20,
  cacheKey: 'getETHprice',
});
