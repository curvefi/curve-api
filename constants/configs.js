import {
  getPolygonFactoryRegistry,
  getPolygonMulticall,
  getfantomFactoryRegistry,
  getfantomMulticall,
  getArbitrumFactoryRegistry,
  getArbitrumMulticall,
  getAvalancheFactoryRegistry,
  getAvalancheMulticall
} from 'utils/getters';
import WEB3_CONSTANTS from 'constants/Web3';

const configs = {
  ethereum: {
    nativeCurrencySymbol: 'ETH',
    nativeCurrencyCoingeckoId: 'ethereum',
    platformCoingeckoId: 'ethereum',
    rpcUrl: WEB3_CONSTANTS.RPC_URL,
    getFactoryRegistryAddress: async () => '0xb9fc157394af804a3578134a6585c0dc9cc990d4',
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
      ['0x5F890841f657d90E081bAbdB532A05996Af79Fe6'.toLowerCase(), 'v1metausd'],
      ['0x2f956eee002b0debd468cf2e0490d1aec65e027f'.toLowerCase(), 'v1metabtc'],
    ]),
    getFactoryCryptoRegistryAddress: async () => '0xF18056Bbd320E96A48e3Fbf8bC061322531aac99',
  },
  polygon: {
    nativeCurrencySymbol: 'MATIC',
    nativeCurrencyCoingeckoId: 'matic-network',
    platformCoingeckoId: 'polygon-pos',
    rpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_POLYGON}`,
    multicallAddress: getPolygonMulticall(),
    getFactoryRegistryAddress: async () => getPolygonFactoryRegistry(),
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
    ]),
    BASE_POOL_LP_TO_GAUGE_LP_MAP: new Map([
      ['0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171', '0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c'], // meta usd
      ['0xf8a57c1d3b9629b77b6726a042ca48990A84Fb49', '0xffbACcE0CC7C19d46132f1258FC16CF6871D153c'], // meta btc
    ])
  },
  fantom: {
    nativeCurrencySymbol: 'FTM',
    nativeCurrencyCoingeckoId: 'fantom',
    platformCoingeckoId: 'fantom',
    rpcUrl: 'https://rpc.ftm.tools/',
    multicallAddress: getfantomMulticall(),
    getFactoryRegistryAddress: async () => getfantomFactoryRegistry(),
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
    ])
  },
  arbitrum: {
    nativeCurrencySymbol: 'ETH',
    nativeCurrencyCoingeckoId: 'ethereum',
    platformCoingeckoId: 'ethereum',
    rpcUrl: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_ARBITRUM}`,
    multicallAddress: getArbitrumMulticall(),
    getFactoryRegistryAddress: async () => getArbitrumFactoryRegistry(),
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
      ['0x094d12e5b541784701FD8d65F11fc0598FBC6332'.toLowerCase(), 'metabtc'],
      ['0xF1f85a74AD6c64315F85af52d3d46bF715236ADc'.toLowerCase(), 'metabtcbalances'],
    ]),
    BASE_POOL_LP_TO_GAUGE_LP_MAP: new Map([
      ['0x7f90122bf0700f9e7e1f688fe926940e8839f353', '0xbF7E49483881C76487b0989CD7d9A8239B20CA41'], // meta usd
      ['0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb', '0xC2b1DF84112619D190193E48148000e3990Bf627'], // meta btc
    ])
  },
  avalanche: {
    nativeCurrencySymbol: 'AVAX',
    nativeCurrencyCoingeckoId: 'avalanche-2',
    platformCoingeckoId: 'avalanche',
    rpcUrl: `https://api.avax.network/ext/bc/C/rpc`,
    multicallAddress: getAvalancheMulticall(),
    getFactoryRegistryAddress: async () => getAvalancheFactoryRegistry(),
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
    ])
  },
};

export default configs;
