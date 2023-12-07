import Web3 from 'web3';
import configs from '#root/constants/configs/index.js'
import getMainRegistryPoolsFn from '#root/routes/v1/getMainRegistryPools.js';
import { multiCall } from '#root/utils/Calls.js';
import { fn } from '#root/utils/api.js';
import { ZERO_ADDRESS } from '#root/utils/Web3/index.js';
import POOL_SWAP_ABI from '#root/utils/data/abis/json/aave/swap.json' assert { type: 'json' };

export default fn(async ({ blockchainId }) => {
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
        /* [start] Hardcode the lp tokens because their pools don't have an lp_token/similar method */
        (blockchainId === 'ethereum' && address.toLowerCase() === '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7') ? '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490' : // ethereum 3crv
          (blockchainId === 'ethereum' && address.toLowerCase() === '0x7fc77b5c7614e1533320ea6ddc2eb61fa00a9714') ? '0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3' : // ethereum renbtc
            (blockchainId === 'ethereum' && address.toLowerCase() === '0xa5407eae9ba41422680e2e00537571bcc53efbfd') ? '0xC25a3A3b969415c80451098fa907EC722572917F' : // ethereum susd
              (blockchainId === 'ethereum' && address.toLowerCase() === '0x79a8c46dea5ada233abaffd40f3a0a2b1e5a4f27') ? '0x3B3Ac5386837Dc563660FB6a0937DFAa5924333B' : // ethereum busd
                (blockchainId === 'ethereum' && address.toLowerCase() === '0xa2b47e3d5c44877cca798226b7b8118f9bfb7a56') ? '0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2' : // ethereum compound
                  (blockchainId === 'ethereum' && address.toLowerCase() === '0x4ca9b3063ec5866a4b82e437059d2c43d1be596f') ? '0xb19059ebb43466C323583928285a49f558E572Fd' : // ethereum hbtc
                    (blockchainId === 'ethereum' && address.toLowerCase() === '0x06364f10b501e868329afbc005b3492902d6c763') ? '0xD905e2eaeBe188fc92179b6350807D8bd91Db0D8' : // ethereum pax
                      (blockchainId === 'ethereum' && address.toLowerCase() === '0x93054188d876f558f4a66b2ef1d97d16edf0895b') ? '0x49849C98ae39Fff122806C06791Fa73784FB3675' : // ethereum ren
                        (blockchainId === 'ethereum' && address.toLowerCase() === '0xc5424b857f758e906013f3555dad202e4bdb4567') ? '0xA3D87FffcE63B53E0d54fAa1cc983B7eB0b74A9c' : // ethereum seth
                          (blockchainId === 'ethereum' && address.toLowerCase() === '0x52ea46506b9cc5ef470c5bf89f17dc28bb35d85c') ? '0x9fC689CCaDa600B6DF723D9E47D84d76664a1F23' : // ethereum usdt
                            (blockchainId === 'ethereum' && address.toLowerCase() === '0x45f783cce6b7ff23b2ab2d70e416cdb7d6055f51') ? '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8' : // ethereum y
                              (blockchainId === 'ethereum' && address.toLowerCase() === '0x8038c01a0390a8c547446a0b2c18fc9aefecc10c') ? '0x3a664Ab939FD8482048609f652f9a0B0677337B9' : // ethereum dusd
                                (blockchainId === 'ethereum' && address.toLowerCase() === '0x4f062658eaaf2c1ccf8c8e36d6824cdf41167956') ? '0xD2967f45c4f384DEEa880F807Be904762a3DeA07' : // ethereum gusd
                                  (blockchainId === 'ethereum' && address.toLowerCase() === '0x3ef6a01a0f81d6046290f3e2a8c5b843e738e604') ? '0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858' : // ethereum husd
                                    (blockchainId === 'ethereum' && address.toLowerCase() === '0xe7a24ef0c5e95ffb0f6684b813a78f2a3ad7d171') ? '0x6D65b498cb23deAba52db31c93Da9BFFb340FB8F' : // ethereum linkusd
                                      (blockchainId === 'ethereum' && address.toLowerCase() === '0x8474ddbe98f5aa3179b3b3f5942d724afcdec9f6') ? '0x1AEf73d49Dedc4b1778d0706583995958Dc862e6' : // ethereum musd
                                        (blockchainId === 'ethereum' && address.toLowerCase() === '0xc18cc39da8b11da8c3541c598ee022258f9744da') ? '0xC2Ee6b0334C261ED60C72f6054450b61B8f18E35' : // ethereum rsv
                                          (blockchainId === 'ethereum' && address.toLowerCase() === '0x3e01dd8a5e1fb3481f0f589056b428fc308af0fb') ? '0x97E2768e8E73511cA874545DC5Ff8067eB19B787' : // ethereum usdk
                                            (blockchainId === 'ethereum' && address.toLowerCase() === '0x0f9cb53ebe405d49a0bbdbd291a65ff571bc83e1') ? '0x4f3E8F405CF5aFC05D68142F3783bDfE13811522' : // ethereum usdn
                                              /* [end] Hardcode the lp tokens because their pools don't have an lp_token/similar method */
                                              lpTokenAddresses[i] === ZERO_ADDRESS ? address :
                                                lpTokenAddresses[i]
      ),
    })),
  });
}, {
  maxAge: 3600, // 1 hour
  cacheKey: ({ blockchainId }) => `getMainRegistryPoolsAndLpTokens-${blockchainId}`,
});
