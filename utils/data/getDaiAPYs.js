import memoize from 'memoizee';
import Web3 from 'web3';
import configs from '#root/constants/configs/index.js';
import { multiCall } from '../Calls.js';
import { uintToBN } from '../Web3/index.js';
import { lc } from '../String.js';

const MAKER_POT_ADDRESS = '0x197e90f9fad81970ba7976f33cbd77088e5d7cf7';
const MAKER_POT_ABI_SUBSET = [{ "constant": true, "inputs": [], "name": "dsr", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "payable": false, "stateMutability": "view", "type": "function" }];

const { rpcUrl, multicall2Address } = configs.ethereum;
const web3 = new Web3(rpcUrl);

const getDaiAPYs = memoize(async () => {
  const dsr = await multiCall([{
    address: MAKER_POT_ADDRESS,
    abi: MAKER_POT_ABI_SUBSET,
    methodName: 'dsr',
    networkSettings: { web3, multicall2Address },
  }]);

  const rateDaily = uintToBN(dsr, 27).minus(1).times(86400);
  const apy = rateDaily.plus(1).pow(365 / 1).minus(1);
  return [{
    address: lc('0x83f20f44975d03b1b09e64809b757c47f942beea'),
    apy: apy.dp(4).toNumber(),
  }];
}, {
  promise: true,
  maxAge: 60 * 60 * 1000, // 60 min
  preFetch: true,
});

export default getDaiAPYs;
