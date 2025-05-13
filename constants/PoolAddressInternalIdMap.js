/**
 * All factory pools can be accessed in Curve front-ends using their registry id
 * (e.g. `curve.finance/factory-crypto/100` for pool id 100 in the 'factory-crypto' registry
 * on Ethereum).
 *
 * However, non-factory pools (mostly pools that predate the creation of Curve's
 * pool factories) have hardcoded ids within existing Curve front-ends, and for
 * legacy reasons can only be accessed in Curve front-ends using this hardcoded id
 * (e.g. `curve.finance/eurtusd` for the EURT/USD pool on Ethereum).
 *
 * This file maps pool addresses to their respective hardcoded id in Curve front-ends,
 * on each blockchain, to help dynamically generate urls to access these pools.
 */

const lc = (str) => str.toLowerCase();

const PoolAddressInternalIdMap = {
  ethereum: {
    [lc('0x0Ce6a5fF5217e38315f87032CF90686C96627CAA')]: 'eurs',
    [lc('0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1')]: 'usdn',
    [lc('0x2dded6Da1BF5DBdF597C45fcFaa3194e53EcfeAF')]: 'ib',
    [lc('0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb')]: 'usdk',
    [lc('0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604')]: 'husd',
    [lc('0x4CA9b3063Ec5866A4B82E437059D2C43d1be596F')]: 'hbtc',
    [lc('0x4e0915C88bC70750D68C481540F081fEFaF22273')]: '4pool',
    [lc('0x4f062658EaAF2C1ccf8C8e36D6824CDf41167956')]: 'gusd',
    [lc('0x5a6A4D54456819380173272A5E8E9B9904BdF41B')]: 'mim',
    [lc('0x7F55DDe206dbAD629C080068923b36fe9D6bDBeF')]: 'pbtc',
    [lc('0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714')]: 'sbtc',
    [lc('0x42d7025938bEc20B69cBae5A77421082407f053A')]: 'usdp',
    [lc('0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c')]: 'alusd',
    [lc('0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51')]: 'iearn',
    [lc('0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C')]: 'usdt',
    [lc('0x071c661B4DeefB59E2a3DdB20Db036821eeE8F4b')]: 'bbtc',
    [lc('0x79a8C46DeA5aDa233ABaFFD40F3A0A2B1e5A4F27')]: 'busd',
    [lc('0x98a7F18d4E56Cfe84E3D081B40001B3d5bD3eB8B')]: 'eursusd',
    [lc('0x752eBeb79963cf0732E9c0fec72a49FD1DEfAEAC')]: 'teth',
    [lc('0x890f4e345B1dAED0367A877a1612f86A1f86985f')]: 'ust',
    [lc('0x1005f7406f32a61bd760cfa14accd2737913d546')]: '2pool',
    [lc('0x06364f10B501e868329afBc005b3492902d6C763')]: 'pax',
    [lc('0x8038C01A0390a8c547446a0b2c18fc9aEFEcc10c')]: 'dusd',
    [lc('0x8301AE4fc9c624d1D396cbDAa1ed877821D7C511')]: 'crveth',
    [lc('0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6')]: 'musd',
    [lc('0x9838eCcC42659FA8AA7daF2aD134b53984c9427b')]: 'eurtusd',
    [lc('0x80466c64868E1ab14a1Ddf27A676C3fcBE638Fe5')]: 'tricrypto',
    [lc('0x98638FAcf9a3865cd033F36548713183f6996122')]: 'spelleth',
    [lc('0x4807862AA8b2bF68830e4C8dc86D0e9A998e085a')]: 'busdv2',
    [lc('0x93054188d876f558f4a66B2EF1d97d16eDf0895B')]: 'ren',
    [lc('0x618788357D0EBd8A37e763ADab3bc575D54c2C7d')]: 'rai',
    [lc('0xA2B47E3D5c44877cca798226B7B8118F9BFb7A56')]: 'compound',
    [lc('0xA96A65c051bF88B4095Ee1f2451C2A9d43F53Ae2')]: 'ankreth',
    [lc('0xA5407eAE9Ba41422680e2e00537571bcC53efBfD')]: 'susd',
    [lc('0xAdCFcf9894335dC340f6Cd182aFA45999F45Fc44')]: 'xautusd',
    [lc('0xB576491F1E6e5E62f1d8F26062Ee822B40B0E0d4')]: 'cvxeth',
    [lc('0xC18cC39da8b11dA8c3541C598eE022258F9744da')]: 'rsv',
    [lc('0xC25099792E9349C7DD09759744ea681C7de2cb66')]: 'tbtc',
    [lc('0xD51a44d3FaE010294C616388b506AcdA1bfAAE46')]: 'tricrypto2',
    [lc('0xDC24316b9AE028F1497c275EB9192a3Ea0f67022')]: 'steth',
    [lc('0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2')]: 'fraxusdc',
    [lc('0xDeBF20617708857ebe4F679508E7b7863a8A8EeE')]: 'aave',
    [lc('0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171')]: 'linkusd',
    [lc('0xE84f5b1582BA325fDf9cE6B0c1F087ccfC924e54')]: 'euroc',
    [lc('0xEB16Ae0052ed37f479f7fe63849198Df1765a733')]: 'saave',
    [lc('0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA')]: 'lusd',
    [lc('0xF178C0b5Bb7e7aBF4e12A4838C7b7c5bA2C623c0')]: 'link',
    [lc('0xF9440930043eb3997fc70e1339dBb11F341de7A8')]: 'reth',
    [lc('0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7')]: '3pool',
    [lc('0xc5424b857f758e906013f3555dad202e4bdb4567')]: 'seth',
    [lc('0xd81dA8D904b52208541Bade1bD6595D8a251F8dd')]: 'obtc',
    [lc('0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B')]: 'frax',
    [lc('0xecd5e75afb02efa118af914515d6521aabd189f1')]: 'tusd',
    [lc('0xfd5db7463a3ab53fd211b4af195c5bccc1a03890')]: 'eurt',
    [lc('0xa1F8A6807c402E4A15ef4EBa36528A3FED24E577')]: 'frxeth',
    [lc('0xbfab6fa95e0091ed66058ad493189d2cb29385e6')]: 'wbeth',
    [lc('0xf253f83AcA21aAbD2A20553AE0BF7F65C755A07F')]: 'sbtc2',
    [lc('0xae34574ac03a15cd58a92dc79de7b1a0800f1ce3')]: 'fraxusdp',
  },
  arbitrum: {
    [lc('0x7f90122bf0700f9e7e1f688fe926940e8839f353')]: '2pool',
    [lc('0x960ea3e3C7FB317332d990873d354E18d7645590')]: 'tricrypto',
    [lc('0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb')]: 'ren',
    [lc('0xA827a652Ead76c6B0b3D19dba05452E06e25c27e')]: 'eursusd',
    [lc('0x6eB2dc694eB516B16Dc9FBc678C60052BbdD7d80')]: 'wsteth',
    [lc('0xc9b8a3fdecb9d5b218d02555a8baf332e5b740d5')]: 'factory-v2-41',
  },
  aurora: {
    [lc('0xbF7E49483881C76487b0989CD7d9A8239B20CA41')]: '3pool',
  },
  avalanche: {
    [lc('0x7f90122BF0700F9E7e1F688fe926940E8839F353')]: 'aave',
    [lc('0x16a7DA911A4DD1d83F3fF066fE28F3C792C50d90')]: 'ren',
    [lc('0xB755B949C126C04e0348DD881a5cF55d424742B2')]: 'atricrypto',
    [lc('0xD2AcAe14ae2ee0f6557aC6C6D0e407a92C36214b')]: 'aaveV3',
  },
  fantom: {
    [lc('0x27e611fd27b276acbd5ffd632e5eaebec9761e40')]: '2pool',
    [lc('0x92d5ebf3593a92888c25c0abef126583d4b5312e')]: 'fusdt',
    [lc('0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604')]: 'ren',
    [lc('0x3a1659Ddcf2339Be3aeA159cA010979FB49155FF')]: 'tricrypto',
    [lc('0x4FC8D635c3cB1d0aa123859e2B2587d0FF2707b1')]: 'ib',
    [lc('0x0fa949783947Bf6c1b171DB13AEACBB488845B3f')]: 'geist',
  },
  harmony: {
    [lc('0xC5cfaDA84E902aD92DD40194f0883ad49639b023')]: '3pool',
    [lc('0x0e3Dc2BcbFEa84072A0c794B7653d3db364154e0')]: 'atricrypto',
  },
  moonbeam: {
    [lc('0xace58a26b8db90498ef0330fdc9c2655db0c45e2')]: '3pool',
  },
  optimism: {
    [lc('0x1337BedC9D22ecbe766dF105c9623922A27963EC')]: '3pool',
    [lc('0xB90B9B1F91a01Ea22A182CD84C1E22222e39B415')]: 'wsteth',
    [lc('0x29a3d66b30bc4ad674a4fdaf27578b64f6afbfe7')]: 'factory-v2-16',
  },
  polygon: {
    [lc('0x445FE580eF8d70FF569aB36e80c647af338db351')]: 'aave',
    [lc('0x751B1e21756bDbc307CBcC5085c042a0e9AaEf36')]: 'atricrypto',
    [lc('0xC2d95EEF97Ec6C17551d45e77B590dc1F9117C67')]: 'ren',
    [lc('0x92577943c7aC4accb35288aB2CC84D75feC330aF')]: 'atricrypto2',
    [lc('0x92215849c439E1f8612b6646060B4E3E5ef822cC')]: 'atricrypto3',
    [lc('0xB446BF7b8D6D4276d0c75eC0e3ee8dD7Fe15783A')]: 'eurtusd',
    [lc('0x9b3d675FDbe6a0935E8B7d1941bc6f78253549B7')]: 'eursusd',
  },
  xdai: {
    [lc('0x7f90122BF0700F9E7e1F688fe926940E8839F353')]: '3pool',
    [lc('0x85bA9Dfb4a3E4541420Fc75Be02E2B42042D7e46')]: 'rai',
  },
};

const getHardcodedPoolId = (blockchainId, poolAddress) => (
  PoolAddressInternalIdMap[blockchainId]?.[lc(poolAddress)]
);

export default PoolAddressInternalIdMap;
export { getHardcodedPoolId };
