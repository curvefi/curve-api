import WEB3_CONSTANTS from 'constants/Web3';
import { CaseInsensitiveMap } from 'utils/Array';

const configs = {
  ethereum: {
    nativeCurrencySymbol: 'ETH',
    chainId: 1,
    nativeCurrencyCoingeckoId: 'ethereum',
    platformCoingeckoId: 'ethereum',
    nativeAssetId: 'eth', // Coin id from the blockchain's coins config
    nativeAssetErc20WrapperId: 'weth', // Used by crypto facto, since it handles wrapped native as native
    rpcUrl: WEB3_CONSTANTS.RPC_URL,
    multicallAddress: '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441',
    multicall2Address: '0x5ba1e12693dc8f9c48aad8770482f4739beed696',
    getFactoryRegistryAddress: async () => '0xb9fc157394af804a3578134a6585c0dc9cc990d4',
    getCryptoRegistryAddress: async () => '0x8F942C20D02bEfc377D41445793068908E2250D0',
    factoryImplementationAddressMap: new Map([
      ['0x6523Ac15EC152Cb70a334230F6c5d62C5Bd963f1'.toLowerCase(), 'plain2basic'],
      ['0x24D937143d3F5cF04c72bA112735151A8CAE2262'.toLowerCase(), 'plain2balances'],
      ['0x6326DEbBAa15bCFE603d831e7D75f4fc10d9B43E'.toLowerCase(), 'plain2eth'],
      ['0x4A4d7868390EF5CaC51cDA262888f34bD3025C3F'.toLowerCase(), 'plain2optimized'],
      ['0x9B52F13DF69D79Ec5aAB6D1aCe3157d29B409cC3'.toLowerCase(), 'plain3basic'],
      ['0x50b085f2e5958C4A87baf93A8AB79F6bec068494'.toLowerCase(), 'plain3balances'],
      ['0x8c1aB78601c259E1B43F19816923609dC7d7de9B'.toLowerCase(), 'plain3eth'],
      ['0xE5F4b89E0A16578B3e0e7581327BDb4C712E44De'.toLowerCase(), 'plain3optimized'],
      ['0x5Bd47eA4494e0F8DE6e3Ca10F1c05F55b72466B8'.toLowerCase(), 'plain4basic'],
      ['0xd35B58386705CE75CE6d09842E38E9BE9CDe5bF6'.toLowerCase(), 'plain4balances'],
      ['0x88855cdF2b0A8413D470B86952E726684de915be'.toLowerCase(), 'plain4eth'],
      ['0xaD4753D045D3Aed5C1a6606dFb6a7D7AD67C1Ad7'.toLowerCase(), 'plain4optimized'],
      ['0x213be373FDff327658139C7df330817DAD2d5bBE'.toLowerCase(), 'metausd'],
      ['0x55aa9bf126bcabf0bdc17fa9e39ec9239e1ce7a9'.toLowerCase(), 'metausdbalances'],
      ['0xC6A8466d128Fbfd34AdA64a9FFFce325D57C9a52'.toLowerCase(), 'metabtc'],
      ['0xc4C78b08fA0c3d0a312605634461A88184Ecd630'.toLowerCase(), 'metabtcbalances'],
      ['0xECAaecd9d2193900b424774133B1f51ae0F29d9E'.toLowerCase(), 'metabtc-ren'],
      ['0x40fd58d44cfe63e8517c9bb3ac98676838ea56a8'.toLowerCase(), 'metabtcbalances-ren'],
      ['0x33bB0e62d5e8C688E645Dd46DFb48Cd613250067'.toLowerCase(), 'metausd-fraxusdc'],
      ['0x2EB24483Ef551dA247ab87Cf18e1Cc980073032D'.toLowerCase(), 'metausdbalances-fraxusdc'],
      ['0x5F890841f657d90E081bAbdB532A05996Af79Fe6'.toLowerCase(), 'v1metausd'],
      ['0x2f956eee002b0debd468cf2e0490d1aec65e027f'.toLowerCase(), 'v1metabtc'],
    ]),
    factoryCryptoMetaBasePoolLpTokenAddress: '0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC',
    getFactoryCryptoRegistryAddress: async () => '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99',
    graphEndpoint: 'https://api.thegraph.com/subgraphs/name/convex-community/volume-mainnet-test',
    DISABLED_POOLS_ADDRESSES: [].map((a) => a.toLowerCase()),
  },
  polygon: {
    shortId: 'poly',
    nativeCurrencySymbol: 'MATIC',
    chainId: 137,
    nativeCurrencyCoingeckoId: 'matic-network',
    platformCoingeckoId: 'polygon-pos',
    nativeAssetId: 'MATIC', // Coin id from the blockchain's coins config
    nativeAssetErc20WrapperId: 'wmatic',
    rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_POLYGON}`,
    multicallAddress: '0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604',
    multicall2Address: '0x275617327c958bD06b5D6b871E7f491D76113dd8',
    getFactoryRegistryAddress: async () => '0x722272d36ef0da72ff51c5a65db7b870e2e8d4ee',
    getCryptoRegistryAddress: async () => '0x47bB542B9dE58b970bA50c9dae444DDB4c16751a',
    getFactoryCryptoRegistryAddress: async () => '0xE5De15A9C9bBedb4F5EC13B131E61245f2983A69',
    factoryImplementationAddressMap: new Map([
      ['0x571FF5b7b346F706aa48d696a9a4a288e9Bb4091'.toLowerCase(), 'plain2basic'],
      ['0x8925D9d9B4569D737a48499DeF3f67BaA5a144b9'.toLowerCase(), 'plain2balances'],
      ['0xAe00f57663F4C85FC948B13963cd4627dAF01061'.toLowerCase(), 'plain2eth'],
      ['0x8101e6760130be2c8ace79643ab73500571b7162'.toLowerCase(), 'plain2optimized'],
      ['0x493084ca44c779af27a416ac1f71e3823bf21b53'.toLowerCase(), 'plain3basic'],
      ['0x9b4ed6f8904e976146b3dc0233cd48cf81835240'.toLowerCase(), 'plain3balances'],
      ['0xa9134fae98f92217f457918505375ae91fdc5e3c'.toLowerCase(), 'plain3eth'],
      ['0xcc9fd96c26c450dd4580893aff75efd5cb6c12fc'.toLowerCase(), 'plain3optimized'],
      ['0x991b05d5316fa3a2c053f84658b84987cd5c9970'.toLowerCase(), 'plain4basic'],
      ['0xC7c46488566b9ef9B981b87E328939CaA5ca152f'.toLowerCase(), 'plain4balances'],
      ['0xf31bcdf0b9a5ecd7ab463eb905551fbc32e51856'.toLowerCase(), 'plain4eth'],
      ['0xAc273d5b4FC06625d8b1abA3BE8De15bDFb8E39f'.toLowerCase(), 'plain4optimized'],
      ['0x4fb93D7d320E8A263F22f62C2059dFC2A8bCbC4c'.toLowerCase(), 'metausd'],
      ['0x39fE1824f98CD828050D7c51dA443E84121c7cf1'.toLowerCase(), 'metausdbalances'],
      ['0xC05EB760A135d3D0c839f1141423002681157a17'.toLowerCase(), 'metabtc'],
      ['0xD8336532f6ED7b94282fAF724fe41d6145E07Cfc'.toLowerCase(), 'metabtcbalances'],
      ['0x5bcA7dDF1bcccB2eE8e46c56bfc9d3CDC77262bC'.toLowerCase(), 'crypto'],
    ]),
    factoryCryptoMetaBasePoolLpTokenAddress: '0xdAD97F7713Ae9437fa9249920eC8507e5FbB23d3',
    BASE_POOL_LP_TO_GAUGE_LP_MAP: new Map([
      ['0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171', '0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c'], // meta usd
      ['0xf8a57c1d3b9629b77b6726a042ca48990A84Fb49', '0xffbACcE0CC7C19d46132f1258FC16CF6871D153c'], // meta btc
    ]),
    DISABLED_POOLS_ADDRESSES: [
      '0x666Dc3b4baBfd063FaF965BD020024AF0dC51B64', // Pool coins contracts were self-destructed, calls reverting
      '0x88C4D6534165510b2E2CAF0A130d4F70aA4B6d71', // Pool coins contracts were self-destructed, calls reverting
      '0xE4199bC5C5C1F63dbA47B56B6dB7144C51CF0bF8', // Pool coins contracts were self-destructed, calls reverting
      '0xdaedd59fa2c5c63d46a3bae5ed115247df9eb6ec', // Broken pool with failing get_dy and scammy tokens
      '0x3ce39825ab258693cedb8daf1db441627d011371', // Broken pool
      '0x632F9Be4Bf42e0dBb461CFcC0CF788538a49ED6D', // Broken pool
      '0x1197Ae7F43695Be80127365b494E8BF850f4752A', // Broken pool
      '0x40caB7C05fc1686e198C8d6d6aA4aaCF77BE8590', // Broken pool
      '0x64FFf0e27c223097c824f9d9278eFD5B55c3430e', // Broken pool
    ].map((a) => a.toLowerCase()),
    approxBlocksPerDay: 40000, // https://polygonscan.com/chart/blocks
    graphEndpoint: 'https://api.thegraph.com/subgraphs/name/convex-community/volume-matic-test',
  },
  fantom: {
    shortId: 'ftm',
    nativeCurrencySymbol: 'FTM',
    chainId: 250,
    nativeCurrencyCoingeckoId: 'fantom',
    platformCoingeckoId: 'fantom',
    nativeAssetId: 'ftm', // Coin id from the blockchain's coins config
    nativeAssetErc20WrapperId: 'wftm',
    rpcUrl: 'https://rpc.ftm.tools/',
    multicallAddress: '0xb828c456600857abd4ed6c32facc607bd0464f4f',
    multicall2Address: '0xD98e3dBE5950Ca8Ce5a4b59630a5652110403E5c',
    getFactoryRegistryAddress: async () => '0x686d67265703d1f124c45e33d47d794c566889ba',
    getCryptoRegistryAddress: async () => '0x4fb93D7d320E8A263F22f62C2059dFC2A8bCbC4c',
    getFactoryCryptoRegistryAddress: async () => '0xE5De15A9C9bBedb4F5EC13B131E61245f2983A69',
    factoryImplementationAddressMap: new Map([
      ['0x61E10659fe3aa93d036d099405224E4Ac24996d0'.toLowerCase(), 'plain2basic'],
      ['0xd9Acb0BAeeD77C99305017821167674Cc7e82f7a'.toLowerCase(), 'plain2balances'],
      ['0xE6358f6a45B502477e83CC1CDa759f540E4459ee'.toLowerCase(), 'plain2eth'],
      ['0xAD4768F408dD170e62E074188D81A29AE31B8Fd8'.toLowerCase(), 'plain2optimized'],
      ['0x3cABd83bCa606768939B843f91df8f4963dBC079'.toLowerCase(), 'plain3basic'],
      ['0xD1602F68CC7C4c7B59D686243EA35a9C73B0c6a2'.toLowerCase(), 'plain3balances'],
      ['0x5d58Eb45e97B43e471AF05cD2b11CeB4106E1b1a'.toLowerCase(), 'plain3eth'],
      ['0x7Ee25A34C921E4009B726cC6be0643fd6a39DbfE'.toLowerCase(), 'plain3optimized'],
      ['0xABE216918fFDa43B44e3FC09639Fd82fD3527D89'.toLowerCase(), 'plain4basic'],
      ['0x775A21E0dfE25aF30FF2FCAC37512EbD8fD36471'.toLowerCase(), 'plain4balances'],
      ['0xb11Dc44A9f981fAF1669dca6DD40c3cc2554A2ce'.toLowerCase(), 'plain4eth'],
      ['0x9D7C28226AA7142cBF234ab9aa9C203D095c528B'.toLowerCase(), 'plain4optimized'],
      ['0xfCE359115dFe1533a2458650123F86C454BC0213'.toLowerCase(), 'metausd'],
      ['0x09C62ad0694e3f1ad8cF8876aaBe56138C586f5F'.toLowerCase(), 'metausdbalances'],
      ['0xC9438d8928486bD9621D326002F4672bF684187A'.toLowerCase(), 'metabtc'],
      ['0x2b70A5B878665FfDB4A06Ba40a264d6c70f68F4B'.toLowerCase(), 'metabtcbalances'],
      ['0x210c806f6ae850279f7e298de749ec4b427d00dd'.toLowerCase(), 'metausd-geist'],
      ['0xf82162bb68ad5a168345bb7efb2faa0edcca5177'.toLowerCase(), 'metausdbalances-geist'],

    ]),
    BASE_POOL_LP_TO_GAUGE_LP_MAP: new Map([
      ['0x27e611fd27b276acbd5ffd632e5eaebec9761e40', '0x8866414733F22295b7563f9C5299715D2D76CAf4'], // meta usd
      ['0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858', '0x2db0E83599a91b508Ac268a6197b8B14F5e72840'], // meta btc
      ['0x0fa949783947Bf6c1b171DB13AEACBB488845B3f', '0xD02a30d33153877BC20e5721ee53DeDEE0422B2F'], // meta usd2
    ]),
    DISABLED_POOLS_ADDRESSES: [].map((a) => a.toLowerCase()),
    approxBlocksPerDay: 95000, // https://ftmscan.com/chart/blocks
    graphEndpoint: 'https://api.thegraph.com/subgraphs/name/convex-community/volume-fantom-test'
  },
  arbitrum: {
    shortId: 'arbi',
    nativeCurrencySymbol: 'ETH',
    chainId: 42161,
    nativeCurrencyCoingeckoId: 'ethereum',
    platformCoingeckoId: 'ethereum',
    nativeAssetId: 'eth', // Coin id from the blockchain's coins config
    nativeAssetErc20WrapperId: 'weth',
    rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_ARBITRUM}`,
    multicallAddress: '0x5b5cfe992adac0c9d48e05854b2d91c73a003858',
    multicall2Address: '0x5b5cfe992adac0c9d48e05854b2d91c73a003858',
    getFactoryRegistryAddress: async () => '0xb17b674D9c5CB2e441F8e196a2f048A81355d031',
    getCryptoRegistryAddress: async () => '0x0E9fBb167DF83EdE3240D6a5fa5d40c6C6851e15',
    factoryImplementationAddressMap: new Map([
      ['0x54e8A25d0Ac0E4945b697C80b8372445FEA17A62'.toLowerCase(), 'plain2basic'],
      ['0xD68970e266cE1A015953897C7055a5E0bC657Af8'.toLowerCase(), 'plain2balances'],
      ['0x7DA64233Fefb352f8F501B357c018158ED8aA455'.toLowerCase(), 'plain2eth'],
      ['0x0100fBf414071977B19fC38e6fc7c32FE444F5C9'.toLowerCase(), 'plain2optimized'],
      ['0xe381C25de995d62b453aF8B931aAc84fcCaa7A62'.toLowerCase(), 'plain3basic'],
      ['0xc379bA7b8e1c6C48D64e1cf9dD602C97c9fD0F40'.toLowerCase(), 'plain3balances'],
      ['0xAAe75FAebCae43b9d541Fd875622BE48D9B4f5D0'.toLowerCase(), 'plain3eth'],
      ['0x8866414733F22295b7563f9C5299715D2D76CAf4'.toLowerCase(), 'plain3optimized'],
      ['0x8d53E5De033078367Ad91527c53abfd1Eb6bfa86'.toLowerCase(), 'plain4basic'],
      ['0x2ac56cEBc2D27c9bB51a11773355E44371Eb88D3'.toLowerCase(), 'plain4balances'],
      ['0x89287c32c2CAC1C76227F6d300B2DBbab6b75C08'.toLowerCase(), 'plain4eth'],
      ['0x06e3C4da96fd076b97b7ca3Ae23527314b6140dF'.toLowerCase(), 'plain4optimized'],
      ['0x09672362833d8f703D5395ef3252D4Bfa51c15ca'.toLowerCase(), 'metausd'],
      ['0xBE175115BF33E12348ff77CcfEE4726866A0Fbd5'.toLowerCase(), 'metausdbalances'],
      ['0x8DEb66a4A40E370355bEe35f12E55Fe9c755d686'.toLowerCase(), 'metausd-factory-v2-41'],
      ['0x3edE9b145F82e9e46C03f8A8F67B77aEE847b632'.toLowerCase(), 'metausdbalances-factory-v2-41'],
      ['0x094d12e5b541784701FD8d65F11fc0598FBC6332'.toLowerCase(), 'metabtc'],
      ['0xF1f85a74AD6c64315F85af52d3d46bF715236ADc'.toLowerCase(), 'metabtcbalances'],
    ]),
    BASE_POOL_LP_TO_GAUGE_LP_MAP: new Map([
      ['0x7f90122bf0700f9e7e1f688fe926940e8839f353', '0xbF7E49483881C76487b0989CD7d9A8239B20CA41'], // meta usd
      ['0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb', '0xC2b1DF84112619D190193E48148000e3990Bf627'], // meta btc
    ]),
    DISABLED_POOLS_ADDRESSES: [].map((a) => a.toLowerCase()),
    graphEndpoint: 'https://api.thegraph.com/subgraphs/name/convex-community/volume-arbitrum-test',
  },
  avalanche: {
    shortId: 'ava',
    nativeCurrencySymbol: 'AVAX',
    chainId: 43114,
    nativeCurrencyCoingeckoId: 'avalanche-2',
    platformCoingeckoId: 'avalanche',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    nativeAssetId: 'avax', // Coin id from the blockchain's coins config
    nativeAssetErc20WrapperId: 'wavax',
    multicallAddress: '0xa00FB557AA68d2e98A830642DBbFA534E8512E5f',
    multicall2Address: '0x29b6603D17B9D8f021EcB8845B6FD06E1Adf89DE',
    getFactoryRegistryAddress: async () => '0xb17b674D9c5CB2e441F8e196a2f048A81355d031',
    getCryptoRegistryAddress: async () => '0x90f421832199e93d01b64DaF378b183809EB0988',
    factoryImplementationAddressMap: new Map([
      ['0x697434ca761d4f86b553784b69f4f37f5edf54df'.toLowerCase(), 'plain2basic'],
      ['0xbdff0c27dd073c119ebcb1299a68a6a92ae607f0'.toLowerCase(), 'plain2balances'],
      ['0x64448B78561690B70E17CBE8029a3e5c1bB7136e'.toLowerCase(), 'plain2eth'],
      ['0x09672362833d8f703D5395ef3252D4Bfa51c15ca'.toLowerCase(), 'plain2optimized'],
      ['0x1de7f0866e2c4adAC7b457c58Cc25c8688CDa1f2'.toLowerCase(), 'plain3basic'],
      ['0x094d12e5b541784701FD8d65F11fc0598FBC6332'.toLowerCase(), 'plain3balances'],
      ['0xf1f85a74ad6c64315f85af52d3d46bf715236adc'.toLowerCase(), 'plain3eth'],
      ['0xaa82ca713d94bba7a89ceab55314f9effeddc78c'.toLowerCase(), 'plain3optimized'],
      ['0x7544Fe3d184b6B55D6B36c3FCA1157eE0Ba30287'.toLowerCase(), 'plain4basic'],
      ['0x7d86446ddb609ed0f5f8684acf30380a356b2b4c'.toLowerCase(), 'plain4balances'],
      ['0x0eb0F1FaF5F509Ac53fA224477509EAD167cf410'.toLowerCase(), 'plain4eth'],
      ['0xCE94D3E5b0D80565D7B713A687b39a3Dc81780BA'.toLowerCase(), 'plain4optimized'],
      ['0xa237034249290de2b07988ac64b96f22c0e76fe0'.toLowerCase(), 'metausd'],
      ['0xc50c05ca1f8c2346664bd0d4a1eb6ac1da38414f'.toLowerCase(), 'metausdbalances'],
      ['0xa27f39E9C21b3376F43266E13Ad5A5d6E9BdB320'.toLowerCase(), 'metabtc'],
      ['0x505C34ED8dBE96d2D5C7D83158aA844887770970'.toLowerCase(), 'metabtcbalances'],
    ]),
    BASE_POOL_LP_TO_GAUGE_LP_MAP: new Map([
      ['0x1337BedC9D22ecbe766dF105c9623922A27963EC', '0x5b5cfe992adac0c9d48e05854b2d91c73a003858'], // meta usd
      ['0xC2b1DF84112619D190193E48148000e3990Bf627', '0x0f9cb53ebe405d49a0bbdbd291a65ff571bc83e1'], // meta btc
    ]),
    // When a crypto pool uses a base pool lp as one of its underlying assets, apy calculations
    // using xcp_profit need to add up 1/3rd of the underlying pool's base volume, so this map
    // keeps track of crypto-pool-swap<>underlying-swap
    CRYPTO_POOLS_WITH_BASE_POOLS: new CaseInsensitiveMap([
      ['0xB755B949C126C04e0348DD881a5cF55d424742B2', '0x7f90122BF0700F9E7e1F688fe926940E8839F353'], // atricrypto<>aave
    ]),
    DISABLED_POOLS_ADDRESSES: [].map((a) => a.toLowerCase()),
    graphEndpoint: 'https://api.thegraph.com/subgraphs/name/convex-community/volume-avalanche-test',
    approxBlocksPerDay: 43000,
  },
  optimism: {
    shortId: 'op',
    nativeCurrencySymbol: 'ETH',
    chainId: 10,
    nativeCurrencyCoingeckoId: 'ethereum',
    platformCoingeckoId: 'optimistic-ethereum',
    nativeAssetId: 'eth', // Coin id from the blockchain's coins config
    nativeAssetErc20WrapperId: 'weth', // Used by crypto facto, since it handles wrapped native as native
    rpcUrl: 'https://mainnet.optimism.io',
    multicallAddress: '0x2DC0E2aa608532Da689e89e237dF582B783E552C',
    multicall2Address: '0x2DC0E2aa608532Da689e89e237dF582B783E552C',
    getFactoryRegistryAddress: async () => '0x2db0E83599a91b508Ac268a6197b8B14F5e72840',
    getCryptoRegistryAddress: async () => '0x7DA64233Fefb352f8F501B357c018158ED8aA455',
    factoryImplementationAddressMap: new Map([
      ['0xC2b1DF84112619D190193E48148000e3990Bf627'.toLowerCase(), 'plain2basic'],
      ['0x16a7DA911A4DD1d83F3fF066fE28F3C792C50d90'.toLowerCase(), 'plain2balances'],
      ['0x4f3E8F405CF5aFC05D68142F3783bDfE13811522'.toLowerCase(), 'plain2eth'],
      ['0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1'.toLowerCase(), 'plain2optimized'],
      ['0x78D0fC2B9D5AE65512DB242e424a9c683F18c243'.toLowerCase(), 'plain3basic'],
      ['0x35796DAc54f144DFBAD1441Ec7C32313A7c29F39'.toLowerCase(), 'plain3balances'],
      ['0x6600e98b71dabfD4A8Cac03b302B0189Adb86Afb'.toLowerCase(), 'plain3eth'],
      ['0x6D65b498cb23deAba52db31c93Da9BFFb340FB8F'.toLowerCase(), 'plain3optimized'],
      ['0x445FE580eF8d70FF569aB36e80c647af338db351'.toLowerCase(), 'plain4basic'],
      ['0xF6bDc2619FFDA72c537Cd9605e0A274Dc48cB1C9'.toLowerCase(), 'plain4balances'],
      ['0x1AEf73d49Dedc4b1778d0706583995958Dc862e6'.toLowerCase(), 'plain4eth'],
      ['0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6'.toLowerCase(), 'plain4optimized'],
      ['0x78CF256256C8089d68Cde634Cf7cDEFb39286470'.toLowerCase(), 'metausd'],
      ['0xADf698e4d8Df08b3E2c79682891636eF00F6e205'.toLowerCase(), 'metausdbalances'],
      ['0xe8269B33E47761f552E1a3070119560d5fa8bBD6'.toLowerCase(), 'metausd-factory-v2-16'],
      ['0x114C4042B11a2b16F58Fe1BFe847589a122F678a'.toLowerCase(), 'metausdbalances-factory-v2-16'],
    ]),
    // BASE_POOL_LP_TO_GAUGE_LP_MAP: new Map([
    //   ['0x1337BedC9D22ecbe766dF105c9623922A27963EC', '0x5b5cfe992adac0c9d48e05854b2d91c73a003858'], // no gauge yet but will need to be added
    // ])
    DISABLED_POOLS_ADDRESSES: [].map((a) => a.toLowerCase()),
    approxBlocksPerDay: 43000, // https://optimistic.etherscan.io/chart/blocks
    graphEndpoint: 'https://api.thegraph.com/subgraphs/name/convex-community/volume-optimism-test',
  },
  xdai: {
    shortId: 'xdai',
    nativeCurrencySymbol: 'xDAI',
    chainId: 100,
    nativeCurrencyCoingeckoId: 'xdai',
    platformCoingeckoId: 'xdai',
    nativeAssetId: 'xdai', // Coin id from the blockchain's coins config
    nativeAssetErc20WrapperId: 'wxdai', // Used by crypto facto, since it handles wrapped native as native
    rpcUrl: 'https://rpc.gnosischain.com/curve',
    multicallAddress: '0xb5b692a88bdfc81ca69dcb1d924f59f0413a602a',
    multicall2Address: '0xFAa296891cA6CECAF2D86eF5F7590316d0A17dA0',
    DISABLED_POOLS_ADDRESSES: [].map((a) => a.toLowerCase()),
    approxBlocksPerDay: 16900,
    getFactoryRegistryAddress: async () => '0xD19Baeadc667Cf2015e395f2B08668Ef120f41F5',
    getCryptoRegistryAddress: async () => '0x8A4694401bE8F8FCCbC542a3219aF1591f87CE17',
    factoryImplementationAddressMap: new Map([
      ['0x04e39EF8332e979Cf8e4f8891E64934FF65F231b'.toLowerCase(), 'plain2basic'],
      ['0xC9438d8928486bD9621D326002F4672bF684187A'.toLowerCase(), 'plain2balances'],
      ['0x2b70A5B878665FfDB4A06Ba40a264d6c70f68F4B'.toLowerCase(), 'plain2eth'],
      ['0x2D036f0Ff6F440dB623e0D9D3B5Daa509e5500C3'.toLowerCase(), 'plain2optimized'],
      ['0xec9cEBE650E181079576C1b6d0d2e092B1EdfF13'.toLowerCase(), 'plain3basic'],
      ['0xe8269B33E47761f552E1a3070119560d5fa8bBD6'.toLowerCase(), 'plain3balances'],
      ['0x114C4042B11a2b16F58Fe1BFe847589a122F678a'.toLowerCase(), 'plain3eth'],
      ['0x4244eB811D6e0Ef302326675207A95113dB4E1F8'.toLowerCase(), 'plain3optimized'],
      ['0x66B5792ED50a2a7405Ea75C4B6B1913eF4E46661'.toLowerCase(), 'plain4basic'],
      ['0xcB4eB43E31C830e22baF764c64F11F32C280496c'.toLowerCase(), 'plain4balances'],
      ['0xc1C49622b63B961ce1D352ecb7D8261Ab5556695'.toLowerCase(), 'plain4eth'],
      ['0x0E2615ce69Cd3Dc3Ff6f66a975bEa0655F3bA7b9'.toLowerCase(), 'plain4optimized'],
      ['0x4A5bF7Ab9A8202692051c19B102d3eDD62aaBAE6'.toLowerCase(), 'metausd'],
      ['0x0B4dc7A945695D11FD83e40B2DfC2B896A02395F'.toLowerCase(), 'metausdbalances'],
    ]),
    graphEndpoint: 'https://api.thegraph.com/subgraphs/name/convex-community/volume-xdai-test',
  },
  harmony: {
    shortId: 'hmny',
    nativeCurrencySymbol: 'ONE',
    chainId: 1666600000,
    nativeCurrencyCoingeckoId: 'harmony',
    platformCoingeckoId: 'harmony-shard-0',
    nativeAssetId: 'one', // Coin id from the blockchain's coins config
    nativeAssetErc20WrapperId: 'wone', // Used by crypto facto, since it handles wrapped native as native
    rpcUrl: 'https://rpc.s0.t.hmny.io',
    multicallAddress: '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
    multicall2Address: '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
    DISABLED_POOLS_ADDRESSES: [].map((a) => a.toLowerCase()),
    approxBlocksPerDay: 43200,
    getCryptoRegistryAddress: async () => '', // Has one crypto pool but no crypto registry
  },
  moonbeam: {
    shortId: 'moon',
    nativeCurrencySymbol: 'GLMR',
    chainId: 1284,
    nativeCurrencyCoingeckoId: 'moonbeam',
    platformCoingeckoId: 'moonbeam',
    nativeAssetId: 'moonbeam', // Coin id from the blockchain's coins config
    nativeAssetErc20WrapperId: 'wGLMR', // Used by crypto facto, since it handles wrapped native as native
    rpcUrl: 'https://moonbeam.api.onfinality.io/public',
    multicallAddress: '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
    multicall2Address: '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
    getFactoryRegistryAddress: async () => '0x4244eB811D6e0Ef302326675207A95113dB4E1F8',
    factoryImplementationAddressMap: new Map([
      ['0x6842E0412AC1c00464dc48961330156a07268d14'.toLowerCase(), 'plain2basic'],
      ['0x9fAe78C4bBB649deB7b2295dDB8A03adA7eB660F'.toLowerCase(), 'plain2balances'],
      ['0xfCE359115dFe1533a2458650123F86C454BC0213'.toLowerCase(), 'plain2eth'],
      ['0x09C62ad0694e3f1ad8cF8876aaBe56138C586f5F'.toLowerCase(), 'plain2optimized'],
      ['0xD19Baeadc667Cf2015e395f2B08668Ef120f41F5'.toLowerCase(), 'plain3basic'],
      ['0x04e39EF8332e979Cf8e4f8891E64934FF65F231b'.toLowerCase(), 'plain3balances'],
      ['0xC9438d8928486bD9621D326002F4672bF684187A'.toLowerCase(), 'plain3eth'],
      ['0x2b70A5B878665FfDB4A06Ba40a264d6c70f68F4B'.toLowerCase(), 'plain3optimized'],
      ['0x2D036f0Ff6F440dB623e0D9D3B5Daa509e5500C3'.toLowerCase(), 'plain4basic'],
      ['0x7Bb707085905c9D80854652809A1ba8480C11789'.toLowerCase(), 'plain4balances'],
      ['0xec9cEBE650E181079576C1b6d0d2e092B1EdfF13'.toLowerCase(), 'plain4eth'],
      ['0xe8269B33E47761f552E1a3070119560d5fa8bBD6'.toLowerCase(), 'plain4optimized'],
    ]),
    BASE_POOL_LP_TO_GAUGE_LP_MAP: new Map([]),
    DISABLED_POOLS_ADDRESSES: [].map((a) => a.toLowerCase()),
    approxBlocksPerDay: 7000, // https://moonscan.io/chart/blocks
  },
  kava: {
    nativeCurrencySymbol: 'KAVA',
    chainId: 2222,
    nativeCurrencyCoingeckoId: 'kava',
    platformCoingeckoId: 'kava',
    nativeAssetId: 'kava', // Coin id from the blockchain's coins config
    nativeAssetErc20WrapperId: 'wrapped-kava', // Used by crypto facto, since it handles wrapped native as native
    rpcUrl: 'https://evm.kava.io',
    multicallAddress: '0x7ED7bBd8C454a1B0D9EdD939c45a81A03c20131C',
    multicall2Address: '0x30A62aA52Fa099C4B227869EB6aeaDEda054d121',
    getFactoryRegistryAddress: async () => '0x40bc62805471eF53DdD5C5cF99ed3d9e5aa81b48',
    factoryImplementationAddressMap: new Map([
      ['0x2632679f5CA396a1bd2647092d9dBf7eC5d7B263'.toLowerCase(), 'plain2basic'],
      ['0x12f196251EfcaCA0fd73D5b58132B16760ba96A8'.toLowerCase(), 'plain2balances'],
      ['0xafdAB4F8F6E6992B16e3906295FbA390aAB59CA5'.toLowerCase(), 'plain2eth'],
      ['0x50D7A3e0d5350d52e9E08a1b58EeFD1dB8759d7D'.toLowerCase(), 'plain2optimized'],
      ['0xc8913D486a42459e6B34db33F0C660FCa61306b9'.toLowerCase(), 'plain3basic'],
      ['0xC5eC776A55eA062FA3173C6C76703E9c9fA91C47'.toLowerCase(), 'plain3balances'],
      ['0xED2c5F2C4CAb6E82630d5615EA15Dd47d8B29983'.toLowerCase(), 'plain3eth'],
      ['0xE7d5293c01685A414dDDE527eB5eFfbF92b52648'.toLowerCase(), 'plain3optimized'],
      ['0x77016d2dE65DE15a3C36bEBBDdc90804f670d2d0'.toLowerCase(), 'plain4basic'],
      ['0xd59C875DcCb6cDCb3a75B91b58A363b5e4B0ca9A'.toLowerCase(), 'plain4balances'],
      ['0x6378dD741B24BD884f3590d7bc7555FdB2f5b003'.toLowerCase(), 'plain4eth'],
      ['0x509495DFEEc3a53aCb2F60669985d868131Ad9a5'.toLowerCase(), 'plain4optimized'],
    ]),
    BASE_POOL_LP_TO_GAUGE_LP_MAP: new Map([]),
    DISABLED_POOLS_ADDRESSES: [].map((a) => a.toLowerCase()),
    approxBlocksPerDay: 13500, // https://explorer.kava.io/
  },
};
export default configs;
