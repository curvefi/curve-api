import Web3 from 'web3';
import configs from 'constants/configs';
import getMainRegistryPoolsFn from 'pages/api/getMainRegistryPools';
import { multiCall } from 'utils/Calls';
import { fn } from 'utils/api';
import { ZERO_ADDRESS } from 'utils/Web3';
import POOL_SWAP_ABI from 'utils/data/abis/json/aave/swap.json';

export default fn(async ({ blockchainId } = {}) => {
  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum';

  const { poolList: mainRegistryPools } = await getMainRegistryPoolsFn.straightCall({ blockchainId });

  const config = configs[blockchainId];
  const web3Side = new Web3(config.rpcUrl);
  const lpTokenAddresses = await multiCall(mainRegistryPools.map((address) => ({
    address,
    abi: POOL_SWAP_ABI,
    methodName: 'lp_token',
    networkSettings: { web3: web3Side, multicall2Address: config.multicall2Address },
  })));

  return ({
    poolsAndLpTokens: mainRegistryPools.map((address, i) => ({
      address,
      lpTokenAddress: (
        lpTokenAddresses[i] === ZERO_ADDRESS ?
          address :
          lpTokenAddresses[i]
      ),
    })),
  });
}, {
  maxAge: 3600, // 1 hour
  normalizer: ([{ blockchainId } = {}]) => blockchainId,
});
