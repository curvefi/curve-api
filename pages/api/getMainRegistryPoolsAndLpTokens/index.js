import Web3 from 'web3';
import configs from 'constants/configs';
import { API } from 'utils/Request';
import { multiCall } from 'utils/Calls';
import { fn } from 'utils/api';
import { ZERO_ADDRESS } from 'utils/Web3';
import POOL_SWAP_ABI from 'utils/data/abis/json/aave/swap.json';

export default fn(async ({ blockchainId } = {}) => {
  if (typeof blockchainId === 'undefined') blockchainId = 'ethereum';

  const { poolList: mainRegistryPools } = await API.get(`getMainRegistryPools/${blockchainId}`);

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
        /* [start] Hardcode the lp tokens because their pools don't have an lp_token/similar method */
        (blockchainId === 'ethereum' && address.toLowerCase() === '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7') ? '0x6c3f90f043a72fa612cbac8115ee7e52bde6e490' : // ethereum 3crv
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714') ? '0x075b1bb99792c9e1041ba13afef80c91a1e70fb3' : // ethereum renbtc
        (blockchainId === 'ethereum' && address.toLowerCase() === '0xa5407eae9ba41422680e2e00537571bcc53efbfd') ? '0xc25a3a3b969415c80451098fa907ec722572917f' : // ethereum susd
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x79a8c46dea5ada233abaffd40f3a0a2b1e5a4f27') ? '0x3b3ac5386837dc563660fb6a0937dfaa5924333b' : // ethereum busd
        (blockchainId === 'ethereum' && address.toLowerCase() === '0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56') ? '0x845838df265dcd2c412a1dc9e959c7d08537f8a2' : // ethereum compound
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x4ca9b3063ec5866a4b82e437059d2c43d1be596f') ? '0xb19059ebb43466c323583928285a49f558e572fd' : // ethereum hbtc
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x06364f10b501e868329afbc005b3492902d6c763') ? '0xd905e2eaebe188fc92179b6350807d8bd91db0d8' : // ethereum pax
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x93054188d876f558f4a66b2ef1d97d16edf0895b') ? '0x49849c98ae39fff122806c06791fa73784fb3675' : // ethereum ren
        (blockchainId === 'ethereum' && address.toLowerCase() === '0xc5424b857f758e906013f3555dad202e4bdb4567') ? '0xa3d87fffce63b53e0d54faa1cc983b7eb0b74a9c' : // ethereum seth
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x52ea46506b9cc5ef470c5bf89f17dc28bb35d85c') ? '0x9fc689ccada600b6df723d9e47d84d76664a1f23' : // ethereum usdt
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x45f783cce6b7ff23b2ab2d70e416cdb7d6055f51') ? '0xdf5e0e81dff6faf3a7e52ba697820c5e32d806a8' : // ethereum y
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x8038c01a0390a8c547446a0b2c18fc9aefecc10c') ? '0x3a664ab939fd8482048609f652f9a0b0677337b9' : // ethereum dusd
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x4f062658eaaf2c1ccf8c8e36d6824cdf41167956') ? '0xd2967f45c4f384deea880f807be904762a3dea07' : // ethereum gusd
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x3ef6a01a0f81d6046290f3e2a8c5b843e738e604') ? '0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858' : // ethereum husd
        (blockchainId === 'ethereum' && address.toLowerCase() === '0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171') ? '0x6d65b498cb23deaba52db31c93da9bffb340fb8f' : // ethereum linkusd
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x8474ddbe98f5aa3179b3b3f5942d724afcdec9f6') ? '0x1aef73d49dedc4b1778d0706583995958dc862e6' : // ethereum musd
        (blockchainId === 'ethereum' && address.toLowerCase() === '0xc18cc39da8b11da8c3541c598ee022258f9744da') ? '0xc2ee6b0334c261ed60c72f6054450b61b8f18e35' : // ethereum rsv
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x3e01dd8a5e1fb3481f0f589056b428fc308af0fb') ? '0x97e2768e8e73511ca874545dc5ff8067eb19b787' : // ethereum usdk
        (blockchainId === 'ethereum' && address.toLowerCase() === '0x0f9cb53ebe405d49a0bbdbd291a65ff571bc83e1') ? '0x4f3e8f405cf5afc05d68142f3783bdfe13811522' : // ethereum usdn
        /* [end] Hardcode the lp tokens because their pools don't have an lp_token/similar method */
        lpTokenAddresses[i] === ZERO_ADDRESS ? address :
        lpTokenAddresses[i]
      ),
    })),
  });
}, {
  maxAge: 3600, // 1 hour
  normalizer: ([{ blockchainId } = {}]) => blockchainId,
});
