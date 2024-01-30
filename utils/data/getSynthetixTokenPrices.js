/**
 * This util retrieves synth prices directly from Synthetix's
 * ExchangeRates contract
 */

import memoize from 'memoizee';
import { arrayToHashmap } from '#root/utils/Array.js';
import { multiCall } from '#root/utils/Calls.js';
import { lc } from '#root/utils/String.js';
import SYNTHETIX_TOKEN_ABI from '#root/constants/abis/synthetix-token.json' assert { type: 'json' };
import SYNTHETIX_EXCHANGE_RATES_ABI from '#root/constants/abis/synthetix-exchange-rates.json' assert { type: 'json' };
import { uintToBN } from '../Web3/index.js';

const synths = [
  '0x97fe22e7341a0cd8db6f6c021a24dc8f4dad855f', // sGBP
  '0xd71ecff9342a5ced620049e616c5035f1db98620', // sEUR
  '0x269895a3df4d73b077fc823dd6da1b95f72aaf9b', // sKRW
  '0xf6b1c627e95bfc3c1b4c9b825a032ff0fbf3e07d', // sJPY
  '0xf48e200eaf9906362bb1442fca31e0835773b8b4', // sAUD
  '0x0f83287ff768d1c1e17a42f44d644d7f22e8ee1d', // sCHF
];

const getSynthetixTokenPrices = memoize(async (networkSettingsParam) => {
  const currencyKeys = await multiCall(synths.map((address) => ({
    address,
    abi: SYNTHETIX_TOKEN_ABI,
    methodName: 'currencyKey',
    ...networkSettingsParam,
  })));

  const currencyRates = await multiCall(currencyKeys.map((currencyKey) => ({
    address: '0x648280dD2db772CD018A0CEC72fab5bF8B7683AB',
    abi: SYNTHETIX_EXCHANGE_RATES_ABI,
    methodName: 'rateForCurrency',
    params: [currencyKey],
    ...networkSettingsParam,
  })));

  const ycTokensPrices = arrayToHashmap(currencyRates.map((rawRate, i) => {
    const address = lc(synths[i]);
    const price = uintToBN(rawRate, 18).toNumber(); // This assumes 1 sUSD = $1

    return [address, price];
  }));

  return ycTokensPrices;
}, {
  promise: true,
  maxAge: 3 * 60 * 1000,
  preFetch: true,
});

export default getSynthetixTokenPrices;
