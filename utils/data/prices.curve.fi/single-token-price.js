import { httpsAgentWithoutStrictSsl } from '#root/utils/Request.js';
import memoize from 'memoizee';
import { PRICES_CURVE_FI_AVAILABLE_CHAIN_IDS } from './chains.js';

const getPricesCurveTokenPrice = memoize(async (blockchainId, tokenAddress) => {
  if (!PRICES_CURVE_FI_AVAILABLE_CHAIN_IDS.includes(blockchainId)) {
    return undefined;
  }

  const { data } = await (await fetch(`https://prices.curve.finance/v1/usd_price/${blockchainId}/${tokenAddress}`, {
    dispatcher: httpsAgentWithoutStrictSsl,
  })).json();

  return data?.usd_price; // Will be undefined or a Number
}, {
  promise: true,
  maxAge: 3 * 60 * 1000,
});

export default getPricesCurveTokenPrice;
