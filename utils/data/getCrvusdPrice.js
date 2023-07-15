import memoize from 'memoizee';
import { multiCall } from 'utils/Calls';
import AGGREGATOR_STABLE_PRICE_ABI from 'constants/abis/AggregatorStablePrice.json';

const CRVUSD_ADDRESS = '0xf939e0a03fb07f59a73314e73794be0e57ac1b4e';
const AGGREGATOR_STABLE_PRICE_ADDRESS = '0x18672b1b0c623a30089A280Ed9256379fb0E4E62';

const getCrvusdPrice = memoize(async (
  networkSettingsParam,
) => {
  const [crvusdPrice] = await multiCall([{
    address: AGGREGATOR_STABLE_PRICE_ADDRESS,
    abi: AGGREGATOR_STABLE_PRICE_ABI,
    methodName: 'price',
    ...networkSettingsParam,
  }]);

  return {
    [CRVUSD_ADDRESS.toLowerCase()]: (crvusdPrice / 1e18),
  };
}, {
  promise: true,
  maxAge: 1 * 60 * 1000, // 1 min
});

export default getCrvusdPrice;
