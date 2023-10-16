import { fn } from 'utils/api';
import { multiCall } from 'utils/Calls';
import { trunc } from 'utils/Number';
import CRV_CIRCSUPPLY_UTIL_ABI from '../../constants/abis/crv-circsupply-util.json';

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
  name: 'getCrvCircSupply',
});
