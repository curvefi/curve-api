import REFERENCE_ASSETS from '../reference-assets.json'  assert { type: 'json' };
import coins from '../coins/index.js';

const pools = [{
  dataIndex: 0,
  id: 'compound',
  name: 'Compound',
  pageMetaData: {
    title: 'Compounded',
    description: 'A curve.finance portal for swapping cDAI/cUSDC',
  },
  lpTokenInfo: {
    name: 'cCurve',
    symbol: 'cCrv',
  },
  coingeckoInfo: {
    id: 'compound',
    symbol: 'COMP',
  },
  assets: 'cDAI+cUSDC',
  coins: [
    coins.cdai,
    coins.cusdc,
  ],
  underlyingCoins: [
    coins.dai,
    coins.usdc,
  ],
  isLendingPool: true,
  addresses: {
    swap: '0xA2B47E3D5c44877cca798226B7B8118F9BFb7A56',
    lpToken: '0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2',
    gauge: '0x7ca5b0a2910B33e9759DC7dDB0413949071D7575',
    deposit: '0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06',
  },
  hasAMultiplier: false,
  isOldPool: true,
}, {
  dataIndex: 1,
  id: 'usdt',
  name: 'USDT',
  pageMetaData: {
    title: 'Tethered',
    description: 'A curve.finance Tethered portal for swapping cDAI/cUSDC/USDT',
  },
  lpTokenInfo: {
    name: 'tCurve',
    symbol: 'tCrv',
  },
  coingeckoInfo: {
    id: 'tether',
    symbol: 'USDT',
  },
  assets: 'cDAI+cUSDC+USDT',
  coins: [
    coins.cdai,
    coins.cusdc,
    coins.usdt,
  ],
  underlyingCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  isLendingPool: true,
  addresses: {
    swap: '0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C',
    lpToken: '0x9fC689CCaDa600B6DF723D9E47D84d76664a1F23',
    gauge: '0xBC89cd85491d81C6AD2954E6d0362Ee29fCa8F53',
    deposit: '0xac795D2c97e60DF6a99ff1c814727302fD747a80',
  },
  hasAMultiplier: false,
  isOldPool: true,
}, {
  dataIndex: 5,
  id: 'pax',
  name: 'PAX',
  lpTokenInfo: {
    name: 'pCurve',
    symbol: 'pCrv',
  },
  coingeckoInfo: {
    id: 'paxos-standard',
    symbol: 'PAX',
  },
  assets: 'ycDAI+ycUSDC+ycUSDT+PAX',
  coins: [
    coins.ycdai,
    coins.ycusdc,
    coins.ycusdt,
    coins.pax,
  ],
  underlyingCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
    coins.pax,
  ],
  isLendingPool: true,
  // Additional context we might want to include for yctokens: `<router-link to='/yctokens'>ycTokens</router-link> are forked yTokens without owner and Compound lending available for ycUSDT`
  addresses: {
    swap: '0x06364f10B501e868329afBc005b3492902d6C763',
    lpToken: '0xD905e2eaeBe188fc92179b6350807D8bd91Db0D8',
    gauge: '0x64E3C23bfc40722d3B649844055F1D51c1ac041d',
    deposit: '0xA50cCc70b6a011CffDdf45057E39679379187287',
  },
  hasAMultiplier: false,
  isOldPool: true,
}, {
  dataIndex: 2,
  id: 'iearn',
  idAlias: 'y',
  name: 'Y',
  pageMetaData: {
    title: 'Yield',
    description: 'A curve.finance yTokens portal for swapping DAI/USDC/USDT/TUSD',
  },
  lpTokenInfo: {
    name: 'yCurve',
    symbol: 'yCrv',
  },
  coingeckoInfo: {
    id: 'yearn-finance',
    symbol: 'YFI',
  },
  assets: 'yDAI+yUSDC+yUSDT+yTUSD',
  coins: [
    coins.ydai,
    coins.yusdc,
    coins.yusdt,
    coins.ytusd,
  ],
  underlyingCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
    coins.tusd,
  ],
  isLendingPool: true,
  addresses: {
    swap: '0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51',
    lpToken: '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8',
    gauge: '0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1',
    deposit: '0xbBC81d23Ea2c3ec7e56D39296F0cbB648873a5d3',
    stakingRewards: '0x0001FB050Fe7312791bF6475b96569D83F695C9f',
  },
  hasAMultiplier: false,
  isOldPool: true,
}, {
  dataIndex: 3,
  id: 'busd',
  name: 'BUSD',
  pageMetaData: {
    title: 'bUSD',
    description: 'A curve.finance portal for swapping BUSD and other stablecoins',
  },
  lpTokenInfo: {
    name: 'bCurve',
    symbol: 'bCrv',
  },
  coingeckoInfo: {
    id: 'binance-usd',
    symbol: 'BUSD',
  },
  assets: 'yDAI+yUSDC+yUSDT+yBUSD',
  coins: [
    coins.ydai,
    coins.yusdc,
    coins.yusdt,
    coins.ybusd,
  ],
  underlyingCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
    coins.busd,
  ],
  isLendingPool: true,
  addresses: {
    swap: '0x79a8C46DeA5aDa233ABaFFD40F3A0A2B1e5A4F27',
    lpToken: '0x3B3Ac5386837Dc563660FB6a0937DFAa5924333B',
    gauge: '0x69Fb7c45726cfE2baDeE8317005d3F94bE838840',
    deposit: '0xb6c057591E073249F2D9D88Ba59a46CFC9B59EdB',
  },
  hasAMultiplier: false,
  isOldPool: true,
}, {
  dataIndex: 4,
  id: 'susdv2',
  name: 'sUSD',
  lpTokenInfo: {
    name: 'sCurve',
    symbol: 'sCrv',
  },
  coingeckoInfo: {
    id: 'nusd',
    symbol: 'SUSD',
  },
  assets: 'DAI+USDC+USDT+sUSD',
  coins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
    coins.susd,
  ],
  addresses: {
    swap: '0xA5407eAE9Ba41422680e2e00537571bcC53efBfD',
    lpToken: '0xC25a3A3b969415c80451098fa907EC722572917F',
    gauge: '0xA90996896660DEcC6E997655E065b23788857849',
    deposit: '0xFCBa3E75865d2d561BE8D220616520c171F12851',
  },
  hasAMultiplier: false,
  isOldPool: true,
}, {
  dataIndex: 7,
  id: 'ren',
  name: 'ren',
  lpTokenInfo: {
    name: 'renCurve',
    symbol: 'renCrv',
  },
  coingeckoInfo: {
    id: 'renbtc',
    symbol: 'RENBTC',
    referenceAssetId: 'bitcoin',
  },
  assets: 'renBTC+wBTC',
  coins: [
    coins.renbtc,
    coins.wbtc,
  ],
  referenceAsset: REFERENCE_ASSETS.BTC,
  addresses: {
    swap: '0x93054188d876f558f4a66B2EF1d97d16eDf0895B',
    lpToken: '0x49849C98ae39Fff122806C06791Fa73784FB3675',
    gauge: '0xB1F2cdeC61db658F091671F5f199635aEF202CAC',
    adapter: '0x73aB2Bd10aD10F7174a1AD5AFAe3ce3D991C5047',
  },
  hasAMultiplier: false,
}, {
  dataIndex: 8,
  id: 'sbtc',
  name: 'sbtc',
  lpTokenInfo: {
    name: 'sbtcCurve',
    symbol: 'sbtcCrv',
  },
  coingeckoInfo: {
    id: 'sbtc',
    symbol: 'SBTC',
    referenceAssetId: 'bitcoin',
  },
  assets: 'renBTC+wBTC+sBTC',
  coins: [
    coins.renbtc,
    coins.wbtc,
    coins.sbtc,
  ],
  referenceAsset: REFERENCE_ASSETS.BTC,
  addresses: {
    swap: '0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714',
    lpToken: '0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3',
    gauge: '0x705350c4BcD35c9441419DdD5d2f097d7a55410F',
    stakingRewards: '0x13C1542A468319688B89E323fe9A3Be3A90EBb27',
    adapter: '0xAEade605D01FE9a8e9C4B3AA0130A90d62167029',
  },
  hasAMultiplier: false,
}, {
  dataIndex: 9,
  id: 'hbtc',
  name: 'hbtc',
  lpTokenInfo: {
    name: 'hbtcCurve',
    symbol: 'hbtcCrv',
  },
  coingeckoInfo: {
    id: 'huobi-btc',
    symbol: 'HBTC',
    referenceAssetId: 'bitcoin',
  },
  assets: 'hBTC+wBTC',
  coins: [
    coins.hbtc,
    coins.wbtc,
  ],
  referenceAsset: REFERENCE_ASSETS.BTC,
  addresses: {
    swap: '0x4CA9b3063Ec5866A4B82E437059D2C43d1be596F',
    lpToken: '0xb19059ebb43466C323583928285a49f558E572Fd',
    gauge: '0x4c18E409Dc8619bFb6a1cB56D114C3f592E0aE79',
  },
  hasAMultiplier: false,
}, {
  dataIndex: 10,
  id: '3pool',
  name: '3pool',
  lpTokenInfo: {
    name: '3poolCurve',
    symbol: '3poolCrv',
  },
  assets: 'DAI+USDC+USDT',
  coins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7',
    lpToken: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
    gauge: '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A',
  },
  hasAMultiplier: false,
}, {
  dataIndex: 11,
  id: 'gusd',
  name: 'gusd',
  lpTokenInfo: {
    name: 'gusdCurve',
    symbol: 'gusdCrv',
  },
  coingeckoInfo: {
    id: 'gemini-dollar',
    symbol: 'GUSD',
  },
  assets: 'GUSD+3pool',
  isMetaPool: true,
  coins: [
    coins.gusd,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x4f062658EaAF2C1ccf8C8e36D6824CDf41167956',
    lpToken: '0xD2967f45c4f384DEEa880F807Be904762a3DeA07',
    gauge: '0xC5cfaDA84E902aD92DD40194f0883ad49639b023',
    deposit: '0x64448B78561690B70E17CBE8029a3e5c1bB7136e',
  },
}, {
  dataIndex: 12,
  id: 'husd',
  name: 'husd',
  lpTokenInfo: {
    name: 'husdCurve',
    symbol: 'husdCrv',
  },
  coingeckoInfo: {
    id: 'husd',
    symbol: 'HUSD',
  },
  assets: 'HUSD+3pool',
  isMetaPool: true,
  coins: [
    coins.husd,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604',
    lpToken: '0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858',
    gauge: '0x2db0E83599a91b508Ac268a6197b8B14F5e72840',
    deposit: '0x09672362833d8f703D5395ef3252D4Bfa51c15ca',
  },
}, {
  dataIndex: 13,
  id: 'usdk',
  name: 'usdk',
  lpTokenInfo: {
    name: 'usdkCurve',
    symbol: 'usdkCrv',
  },
  coingeckoInfo: {
    id: 'usdk',
    symbol: 'USDK',
  },
  assets: 'USDK+3pool',
  isMetaPool: true,
  coins: [
    coins.usdk,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
    lpToken: '0x97E2768e8E73511cA874545DC5Ff8067eB19B787',
    gauge: '0xC2b1DF84112619D190193E48148000e3990Bf627',
    deposit: '0xF1f85a74AD6c64315F85af52d3d46bF715236ADc',
  },
}, {
  dataIndex: 14,
  id: 'usdn',
  name: 'usdn',
  lpTokenInfo: {
    name: 'usdnCurve',
    symbol: 'usdnCrv',
  },
  coingeckoInfo: {
    id: 'neutrino',
    symbol: 'USDN',
  },
  assets: 'USDN+3pool',
  isMetaPool: true,
  coins: [
    coins.usdn,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1',
    lpToken: '0x4f3E8F405CF5aFC05D68142F3783bDfE13811522',
    gauge: '0xF98450B5602fa59CC66e1379DFfB6FDDc724CfC4',
    deposit: '0x094d12e5b541784701FD8d65F11fc0598FBC6332',
  },
}, {
  dataIndex: 15,
  id: 'linkusd',
  name: 'linkusd',
  lpTokenInfo: {
    name: 'linkusdCurve',
    symbol: 'linkusdCrv',
  },
  coingeckoInfo: {
    id: 'linkusd',
    symbol: 'LINKUSD',
  },
  assets: 'LINKUSD+3pool',
  isMetaPool: true,
  coins: [
    coins.linkusd,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  isRiskier: true,
  hasNoGauge: true,
  addresses: {
    swap: '0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171',
    lpToken: '0x6D65b498cb23deAba52db31c93Da9BFFb340FB8F',
    deposit: '0x1de7f0866e2c4adAC7b457c58Cc25c8688CDa1f2',
  },
  riskLevel: 3,
}, {
  dataIndex: 16,
  id: 'musd',
  name: 'musd',
  lpTokenInfo: {
    name: 'musdCurve',
    symbol: 'musdCrv',
  },
  coingeckoInfo: {
    id: 'musd',
    symbol: 'MUSD',
  },
  assets: 'musd+3pool',
  isMetaPool: true,
  coins: [
    coins.musd,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6',
    lpToken: '0x1AEf73d49Dedc4b1778d0706583995958Dc862e6',
    gauge: '0x5f626c30EC1215f4EdCc9982265E8b1F411D1352',
    deposit: '0x803A2B40c5a9BB2B86DD630B274Fa2A9202874C2',
  },
}, {
  dataIndex: 17,
  id: 'rsv',
  name: 'rsv',
  lpTokenInfo: {
    name: 'rsvCurve',
    symbol: 'rsvCrv',
  },
  coingeckoInfo: {
    id: 'reserve',
    symbol: 'RSV',
  },
  assets: 'rsv+3pool',
  isMetaPool: true,
  coins: [
    coins.rsv,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0xC18cC39da8b11dA8c3541C598eE022258F9744da',
    lpToken: '0xC2Ee6b0334C261ED60C72f6054450b61B8f18E35',
    gauge: '0x4dC4A289a8E33600D8bD4cf5F6313E43a37adec7',
    deposit: '0xBE175115BF33E12348ff77CcfEE4726866A0Fbd5',
  },
}, {
  dataIndex: 18,
  id: 'tbtc',
  name: 'tbtc',
  lpTokenInfo: {
    name: 'tbtcCurve',
    symbol: 'tbtcCrv',
  },
  coingeckoInfo: {
    id: 'tbtc',
    symbol: 'TBTC',
    referenceAssetId: 'bitcoin',
  },
  assets: 'tbtc+sbtcCrv',
  isMetaPool: true,
  coins: [
    coins.tbtc,
    coins.sbtccrv,
  ],
  metaCoins: [
    coins.renbtc,
    coins.wbtc,
    coins.sbtc,
  ],
  referenceAsset: REFERENCE_ASSETS.BTC,
  addresses: {
    swap: '0xC25099792E9349C7DD09759744ea681C7de2cb66',
    lpToken: '0x64eda51d3Ad40D56b9dFc5554E06F94e1Dd786Fd',
    gauge: '0x6828bcF74279eE32f2723eC536c22c51Eed383C6',
    deposit: '0xaa82ca713D94bBA7A89CEAB55314F9EfFEdDc78c',
  },
}, {
  dataIndex: 19,
  id: 'dusd',
  name: 'dusd',
  lpTokenInfo: {
    name: 'dusdCurve',
    symbol: 'dusdCrv',
  },
  coingeckoInfo: {
    id: 'defidollar',
    symbol: 'DUSD',
  },
  assets: 'dusd+3pool',
  isMetaPool: true,
  coins: [
    coins.dusd,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x8038C01A0390a8c547446a0b2c18fc9aEFEcc10c',
    lpToken: '0x3a664Ab939FD8482048609f652f9a0B0677337B9',
    gauge: '0xAEA6c312f4b3E04D752946d329693F7293bC2e6D',
    deposit: '0x61E10659fe3aa93d036d099405224E4Ac24996d0',
  },
}, {
  dataIndex: 20,
  id: 'pbtc',
  name: 'pbtc',
  lpTokenInfo: {
    name: 'pbtcCurve',
    symbol: 'pbtcCrv',
  },
  coingeckoInfo: {
    id: 'ptokens-btc',
    symbol: 'PBTC',
    referenceAssetId: 'bitcoin',
  },
  assets: 'pbtc+sbtcCrv',
  isMetaPool: true,
  coins: [
    coins.pbtc,
    coins.sbtccrv,
  ],
  metaCoins: [
    coins.renbtc,
    coins.wbtc,
    coins.sbtc,
  ],
  referenceAsset: REFERENCE_ASSETS.BTC,
  addresses: {
    swap: '0x7F55DDe206dbAD629C080068923b36fe9D6bDBeF',
    lpToken: '0xDE5331AC4B3630f94853Ff322B66407e0D6331E8',
    gauge: '0xd7d147c6Bb90A718c3De8C0568F9B560C79fa416',
    deposit: '0x11F419AdAbbFF8d595E7d5b223eee3863Bb3902C',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 21,
  id: 'bbtc',
  name: 'bbtc',
  lpTokenInfo: {
    name: 'bbtcCurve',
    symbol: 'bbtcCrv',
  },
  coingeckoInfo: {
    id: 'binance-wrapped-btc',
    symbol: 'BBTC',
    referenceAssetId: 'bitcoin',
  },
  assets: 'bbtc+sbtcCrv',
  isMetaPool: true,
  coins: [
    coins.bbtc,
    coins.sbtccrv,
  ],
  metaCoins: [
    coins.renbtc,
    coins.wbtc,
    coins.sbtc,
  ],
  referenceAsset: REFERENCE_ASSETS.BTC,
  addresses: {
    swap: '0x071c661B4DeefB59E2a3DdB20Db036821eeE8F4b',
    lpToken: '0x410e3E86ef427e30B9235497143881f717d93c2A',
    gauge: '0xdFc7AdFa664b08767b735dE28f9E84cd30492aeE',
    deposit: '0xC45b2EEe6e09cA176Ca3bB5f7eEe7C47bF93c756',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 22,
  id: 'obtc',
  name: 'obtc',
  lpTokenInfo: {
    name: 'obtcCurve',
    symbol: 'obtcCrv',
  },
  coingeckoInfo: {
    id: 'boringdao-btc',
    symbol: 'OBTC',
    referenceAssetId: 'bitcoin',
  },
  assets: 'obtc+sbtcCrv',
  isMetaPool: true,
  coins: [
    coins.obtc,
    coins.sbtccrv,
  ],
  metaCoins: [
    coins.renbtc,
    coins.wbtc,
    coins.sbtc,
  ],
  referenceAsset: REFERENCE_ASSETS.BTC,
  addresses: {
    swap: '0xd81dA8D904b52208541Bade1bD6595D8a251F8dd',
    lpToken: '0x2fE94ea3d5d4a175184081439753DE15AeF9d614',
    gauge: '0x11137B10C210b579405c21A07489e28F3c040AB1',
    deposit: '0xd5BCf53e2C81e1991570f33Fa881c49EEa570C8D',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 23,
  id: 'ust',
  name: 'ust',
  lpTokenInfo: {
    name: 'ustCurve',
    symbol: 'ustCrv',
  },
  coingeckoInfo: {
    id: 'terrausd',
    symbol: 'UST',
  },
  assets: 'ust+3pool',
  isMetaPool: true,
  coins: [
    coins.ust,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x890f4e345B1dAED0367A877a1612f86A1f86985f',
    lpToken: '0x94e131324b6054c0D789b190b2dAC504e4361b53',
    gauge: '0x3B7020743Bc2A4ca9EaF9D0722d42E20d6935855',
    deposit: '0xB0a0716841F2Fc03fbA72A891B8Bb13584F52F2d',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 24,
  id: 'eurs',
  name: 'eurs',
  lpTokenInfo: {
    name: 'eursCurve',
    symbol: 'eursCrv',
  },
  coingeckoInfo: {
    id: 'stasis-eurs',
    symbol: 'EURS',
    referenceAssetId: 'stasis-eurs', // Using stasis-eurs as the oracle for EUR/USD
  },
  assets: 'eurs+seur',
  coins: [
    coins.eurs,
    coins.seur,
  ],
  referenceAsset: REFERENCE_ASSETS.EUR,
  addresses: {
    swap: '0x0Ce6a5fF5217e38315f87032CF90686C96627CAA',
    lpToken: '0x194eBd173F6cDacE046C53eACcE9B953F28411d1',
    gauge: '0x90Bb609649E0451E5aD952683D64BD2d1f245840',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 25,
  id: 'seth',
  name: 'seth',
  lpTokenInfo: {
    name: 'sethCurve',
    symbol: 'eCrv',
  },
  coingeckoInfo: {
    id: 'seth',
    symbol: 'SETH',
    referenceAssetId: 'ethereum',
  },
  assets: 'eth+seth',
  coins: [
    coins.eth,
    coins.seth,
  ],
  referenceAsset: REFERENCE_ASSETS.ETH,
  addresses: {
    swap: '0xc5424b857f758e906013f3555dad202e4bdb4567',
    lpToken: '0xA3D87FffcE63B53E0d54fAa1cc983B7eB0b74A9c',
    gauge: '0x3C0FFFF15EA30C35d7A85B85c0782D6c94e1d238',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 26,
  id: 'aave',
  name: 'aave',
  lpTokenInfo: {
    name: 'aaveCurve',
    symbol: 'a3Crv',
  },
  coingeckoInfo: {
    id: 'aave',
    symbol: 'AAVE',
  },
  assets: 'aDAI+aUSDC+aUSDT',
  coins: [
    coins.adai,
    coins.ausdc,
    coins.ausdt,
  ],
  underlyingCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  isLendingPool: true,
  isModernLendingPool: true,
  addresses: {
    swap: '0xDeBF20617708857ebe4F679508E7b7863a8A8EeE',
    lpToken: '0xFd2a8fA60Abd58Efe3EeE34dd494cD491dC14900',
    gauge: '0xd662908ADA2Ea1916B3318327A97eB18aD588b5d',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 27,
  id: 'steth',
  name: 'steth',
  lpTokenInfo: {
    name: 'stethCurve',
    symbol: 'stethCrv',
  },
  coingeckoInfo: {
    id: 'staked-ether',
    symbol: 'STETH',
    referenceAssetId: 'ethereum',
  },
  assets: 'eth+steth',
  coins: [
    coins.eth,
    coins.steth,
  ],
  referenceAsset: REFERENCE_ASSETS.ETH,
  addresses: {
    swap: '0xDC24316b9AE028F1497c275EB9192a3Ea0f67022',
    lpToken: '0x06325440D014e39736583c165C2963BA99fAf14E',
    gauge: '0x182B723a58739a9c974cFDB385ceaDb237453c28',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 28,
  id: 'saave',
  name: 'saave',
  lpTokenInfo: {
    name: 'saaveCurve',
    symbol: 'saCrv',
  },
  coingeckoInfo: {
    id: 'aave',
    symbol: 'AAVE',
  },
  assets: 'aDAI+asUSD',
  coins: [
    coins.adai,
    coins.asusd,
  ],
  underlyingCoins: [
    coins.dai,
    coins.susd,
  ],
  isLendingPool: true,
  isModernLendingPool: true,
  addresses: {
    swap: '0xEB16Ae0052ed37f479f7fe63849198Df1765a733',
    lpToken: '0x02d341CcB60fAaf662bC0554d13778015d1b285C',
    gauge: '0x462253b8F74B72304c145DB0e4Eebd326B22ca39',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 29,
  id: 'ankreth',
  name: 'ankreth',
  lpTokenInfo: {
    name: 'ankrethCurve',
    symbol: 'aethCrv',
  },
  coingeckoInfo: {
    id: 'ankreth',
    symbol: 'AETH',
    referenceAssetId: 'ethereum',
  },
  assets: 'eth+ankreth',
  coins: [
    coins.eth,
    coins.ankreth,
  ],
  referenceAsset: REFERENCE_ASSETS.ETH,
  addresses: {
    swap: '0xA96A65c051bF88B4095Ee1f2451C2A9d43F53Ae2',
    lpToken: '0xaA17A236F2bAdc98DDc0Cf999AbB47D47Fc0A6Cf',
    gauge: '0x6d10ed2cf043e6fcf51a0e7b4c2af3fa06695707',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 30,
  id: 'usdp',
  name: 'usdp',
  lpTokenInfo: {
    name: 'usdpCurve',
    symbol: 'usdpCrv',
  },
  coingeckoInfo: {
    id: 'usdp',
    symbol: 'USDP',
  },
  assets: 'usdp+3pool',
  isMetaPool: true,
  coins: [
    coins.usdp,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x42d7025938bEc20B69cBae5A77421082407f053A',
    lpToken: '0x7Eb40E450b9655f4B3cC4259BCC731c63ff55ae6',
    gauge: '0x055be5DDB7A925BfEF3417FC157f53CA77cA7222',
    deposit: '0x3c8cAee4E09296800f8D29A68Fa3837e2dae4940',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 31,
  id: 'ib',
  name: 'ironbank',
  lpTokenInfo: {
    name: 'ibCurve',
    symbol: 'ib3Crv',
  },
  coingeckoInfo: {
    id: 'cream-2',
    symbol: 'CREAM',
  },
  assets: 'cyDAI+cyUSDC+cyUSDT',
  coins: [
    coins.cydai,
    coins.cyusdc,
    coins.cyusdt,
  ],
  underlyingCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  isLendingPool: true,
  isModernLendingPool: true,
  addresses: {
    swap: '0x2dded6Da1BF5DBdF597C45fcFaa3194e53EcfeAF',
    lpToken: '0x5282a4eF67D9C33135340fB3289cc1711c13638C',
    gauge: '0xF5194c3325202F456c95c1Cf0cA36f8475C1949F',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 32,
  id: 'link',
  name: 'link',
  lpTokenInfo: {
    name: 'linkCurve',
    symbol: 'linkCrv',
  },
  coingeckoInfo: {
    id: 'chainlink',
    symbol: 'LINK',
    referenceAssetId: 'chainlink',
  },
  referenceAsset: REFERENCE_ASSETS.LINK,
  assets: 'LINK+sLINK',
  coins: [
    coins.link,
    coins.slink,
  ],
  addresses: {
    swap: '0xF178C0b5Bb7e7aBF4e12A4838C7b7c5bA2C623c0',
    lpToken: '0xcee60cfa923170e4f8204ae08b4fa6a3f5656f3a',
    gauge: '0xfd4d8a17df4c27c1dd245d153ccf4499e806c87d',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 33,
  id: 'tusd',
  name: 'tusd',
  lpTokenInfo: {
    name: 'tusdCurve',
    symbol: 'tusdCrv',
  },
  assets: 'tusd+3pool',
  isMetaPool: true,
  coins: [
    coins.tusd,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0xecd5e75afb02efa118af914515d6521aabd189f1',
    lpToken: '0xecd5e75afb02efa118af914515d6521aabd189f1',
    gauge: '0x359FD5d6417aE3D8D6497d9B2e7A890798262BA4',
    deposit: '0xA79828DF1850E8a3A3064576f380D90aECDD3359',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 34,
  id: 'frax',
  name: 'frax',
  lpTokenInfo: {
    name: 'fraxCurve',
    symbol: 'fraxCrv',
  },
  coingeckoInfo: {
    id: 'frax',
    symbol: 'FRAX',
  },
  assets: 'frax+3pool',
  isMetaPool: true,
  coins: [
    coins.frax,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B',
    lpToken: '0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B',
    deposit: '0xA79828DF1850E8a3A3064576f380D90aECDD3359',
    gauge: '0x72e158d38dbd50a483501c24f792bdaaa3e7d55c',
  },
  isRiskier: true,
  riskLevel: 2,
  isPendingGaugeVoteToStartCrvRewards: true,
  expectedCrvRewardsStart: '28th of April',
}, {
  dataIndex: 35,
  id: 'lusd',
  name: 'lusd',
  lpTokenInfo: {
    name: 'lusdCurve',
    symbol: 'lusdCrv',
  },
  coingeckoInfo: {
    id: 'liquity-usd',
    symbol: 'LUSD',
  },
  assets: 'lusd+3pool',
  isMetaPool: true,
  coins: [
    coins.lusd,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA',
    lpToken: '0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA',
    deposit: '0xA79828DF1850E8a3A3064576f380D90aECDD3359',
    gauge: '0x9b8519a9a00100720ccdc8a120fbed319ca47a14',
  },
  isRiskier: true,
  riskLevel: 1,
  isPendingGaugeVoteToStartCrvRewards: true,
  expectedCrvRewardsStart: '28th of April',
  gaugeVersion: 2,
}, {
  dataIndex: 36,
  id: 'busdv2',
  name: 'busdv2',
  lpTokenInfo: {
    name: 'busdCurve',
    symbol: 'busdCrv',
  },
  coingeckoInfo: {
    id: 'binance-usd',
    symbol: 'BUSD',
  },
  assets: 'busd+3pool',
  isMetaPool: true,
  coins: [
    coins.busd,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x4807862AA8b2bF68830e4C8dc86D0e9A998e085a',
    lpToken: '0x4807862AA8b2bF68830e4C8dc86D0e9A998e085a',
    gauge: '0xd4b22fedca85e684919955061fdf353b9d38389b',
    deposit: '0xA79828DF1850E8a3A3064576f380D90aECDD3359',
  },
  gaugeVersion: 2,
}, {
  dataIndex: 37,
  id: 'reth',
  name: 'reth',
  lpTokenInfo: {
    name: 'rethCurve',
    symbol: 'rethCrv',
  },
  coingeckoInfo: {
    id: 'reth',
    symbol: 'RETH',
    referenceAssetId: 'ethereum',
  },
  assets: 'eth+reth',
  coins: [
    coins.eth,
    coins.reth,
  ],
  referenceAsset: REFERENCE_ASSETS.ETH,
  addresses: {
    swap: '0xF9440930043eb3997fc70e1339dBb11F341de7A8',
    lpToken: '0x53a901d48795C58f485cBB38df08FA96a24669D5',
    gauge: '0x824F13f1a2F29cFEEa81154b46C0fc820677A637',
  },
  gaugeVersion: 4,
}, {
  dataIndex: 38,
  id: 'alusd',
  name: 'alusd',
  lpTokenInfo: {
    name: 'alusdCurve',
    symbol: 'alusdCrv',
  },
  coingeckoInfo: {
    id: 'alchemix-usd',
    symbol: 'alUSD',
  },
  assets: 'alusd+3pool',
  isMetaPool: true,
  coins: [
    coins.alusd,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
    lpToken: '0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c',
    gauge: '0x9582C4ADACB3BCE56Fea3e590F05c3ca2fb9C477',
    deposit: '0xA79828DF1850E8a3A3064576f380D90aECDD3359',
  },
  gaugeVersion: 4,
}, {
  dataIndex: 39,
  id: 'tricrypto',
  name: 'tricrypto',
  lpTokenInfo: {
    name: '3CrvCrypto',
    symbol: '3CrvCrypto',
  },
  assets: 'usdt+weth+wbtc',
  coins: [
    coins.usdt,
    coins.wbtc,
    coins.weth,
  ],
  allowTradingEth: true,
  addresses: {
    swap: '0x80466c64868E1ab14a1Ddf27A676C3fcBE638Fe5',
    lpToken: '0xcA3d75aC011BF5aD07a98d02f18225F9bD9A6BDF',
    deposit: '0x331aF2E331bd619DefAa5DAc6c038f53FCF9F785',
    gauge: '0x6955a55416a06839309018A8B0cB72c4DDC11f15',
  },
  gaugeVersion: 4,
  cryptoPool: true,
  referenceAsset: REFERENCE_ASSETS.CRYPTO,
}, {
  dataIndex: 40,
  id: 'tricrypto2',
  name: 'tricrypto2',
  lpTokenInfo: {
    name: '3CrvCrypto2',
    symbol: '3CrvCrypto2',
  },
  assets: 'usdt+weth+wbtc',
  coins: [
    coins.usdt,
    coins.wbtc,
    coins.weth,
  ],
  addresses: {
    swap: '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46',
    lpToken: '0xc4AD29ba4B3c580e6D59105FFf484999997675Ff',
    deposit: '0x331aF2E331bd619DefAa5DAc6c038f53FCF9F785',
  },
  gaugeVersion: 4,
  hasNoGauge: true,
  cryptoPool: true,
  referenceAsset: REFERENCE_ASSETS.CRYPTO,
}, {
  dataIndex: 38,
  id: 'mim',
  name: 'mim',
  lpTokenInfo: {
    name: 'mimCurve',
    symbol: 'mimCrv',
  },
  coingeckoInfo: {
    referenceAssetId: 'dollar',
  },
  assets: 'mim+3pool',
  isMetaPool: true,
  coins: [
    coins.mim,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x5a6A4D54456819380173272A5E8E9B9904BdF41B',
    lpToken: '0x5a6A4D54456819380173272A5E8E9B9904BdF41B',
    deposit: '0xA79828DF1850E8a3A3064576f380D90aECDD3359',
    gauge: '0xd8b712d29381748dB89c36BCa0138d7c75866ddF'
  },
  additionalRewards: [{
    name: 'SPELL',
    amountDataKey: 'spellRewards',
    rewardTokenCoingeckoId: 'spell-token',
    amountDataKey: 'spellRewards',
    rewardTokenAddress: '0x090185f2135308bad17527004364ebcc2d37e5f6',
    rewardTokenDecimals: 18,
  }],
  gaugeVersion: 2,
}, {
  dataIndex: 39,
  id: 'tricrypto2',
  name: 'tricrypto2',
  lpTokenInfo: {
    name: '3CrvCrypto2',
    symbol: '3CrvCrypto2',
  },
  assets: 'usdt+weth+wbtc',
  coins: [
    coins.usdt,
    coins.wbtc,
    coins.weth,
  ],
  allowTradingEth: true,
  addresses: {
    swap: '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46',
    lpToken: '0xc4AD29ba4B3c580e6D59105FFf484999997675Ff',
    deposit: '0x3993d34e7e99Abf6B6f367309975d1360222D446',
    gauge: '0xDeFd8FdD20e0f34115C7018CCfb655796F6B2168',
    migrator: '0x0ce658f9bc3af831271199578449810023dba703'
  },
  gaugeVersion: 4,
  cryptoPool: true,
  referenceAsset: REFERENCE_ASSETS.CRYPTO,
},
{
  dataIndex: 40,
  id: 'eurt',
  name: 'eurt',
  lpTokenInfo: {
    name: 'eurtCurve',
    symbol: 'eurtCrv',
  },
  coingeckoInfo: {
    id: 'tether-eurt',
    symbol: 'EURT',
    referenceAssetId: 'stasis-eurs', // Using stasis-eurs as the oracle for EUR/USD
  },
  assets: 'eurt+seur',
  coins: [
    coins.eurt,
    coins.seur,
  ],
  referenceAsset: REFERENCE_ASSETS.EUR,
  addresses: {
    swap: '0xfd5db7463a3ab53fd211b4af195c5bccc1a03890',
    lpToken: '0xfd5db7463a3ab53fd211b4af195c5bccc1a03890',
    gauge: '0xe8060Ad8971450E624d5289A10017dD30F5dA85F',
  },
  gaugeVersion: 4,
},

{
  dataIndex: 41,
  id: 'eurtusd',
  name: 'eurtusd',
  referenceAsset: REFERENCE_ASSETS.CRYPTO,
  isForexMetaPool: true,
  lpTokenInfo: {
    name: 'eurUsdCurve',
    symbol: 'eurUsdCrv',
  },
  coingeckoInfo: {
    id: 'tether-eurt',
    symbol: 'EURt',
    referenceAssetId: 'tether-eurt',
  },
  isMetaPool: true,
  cryptoPool: true,
  assets: 'EURt+3pool',
  coins: [
    coins.eurt,
    coins.tricrv
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x9838eCcC42659FA8AA7daF2aD134b53984c9427b',
    lpToken: '0x3b6831c0077a1e44ED0a21841C3bC4dC11bCE833',
    gauge: '0x4Fd86Ce7Ecea88F7E0aA78DC12625996Fb3a04bC',
    deposit: '0x5D0F47B32fDd343BfA74cE221808e2abE4A53827',
  },
  gaugeVersion: 4
},
{
  dataIndex: 42,
  id: 'eursusd',
  name: 'eursusd',
  referenceAsset: REFERENCE_ASSETS.CRYPTO,
  cryptoPool: true,
  isPlainCryptoPool: true,
  lpTokenInfo: {
    name: 'eurUsdCurve',
    symbol: 'eurUsdCrv',
  },
  coingeckoInfo: {
    id: 'stasis-eurs',
    symbol: 'EURs',
    referenceAssetId: 'stasis-eurs',
  },
  assets: 'EURs+USDC',
  coins: [
    coins.usdc,
    coins.eurs,
  ],
  addresses: {
    swap: '0x98a7F18d4E56Cfe84E3D081B40001B3d5bD3eB8B',
    lpToken: '0x3D229E1B4faab62F621eF2F6A610961f7BD7b23B',
    gauge: '0x65CA7Dc5CB661fC58De57B1E1aF404649a27AD35',
  }
},
{
  dataIndex: 43,
  id: 'crveth',
  name: 'crveth',
  referenceAsset: REFERENCE_ASSETS.CRYPTO,
  cryptoPool: true,
  isPlainCryptoPool: true,
  lpTokenInfo: {
    name: 'CrvEthCurve',
    symbol: 'CrvEthCrv',
  },
  coingeckoInfo: {
    id: 'curve-dao-token',
    symbol: 'CRV',
    referenceAssetId: 'curve-dao-token',
  },
  assets: 'CRV+ETH',
  useAssetsStringForDisplayPurposes: true,
  coins: [
    coins.weth,
    coins.crv,
  ],
  coinsInPlaceReplacements: [
    coins.eth,
  ],
  addresses: {
    swap: '0x8301AE4fc9c624d1D396cbDAa1ed877821D7C511',
    lpToken: '0xEd4064f376cB8d68F770FB1Ff088a3d0F3FF5c4d',
    gauge: '0x1cEBdB0856dd985fAe9b8fEa2262469360B8a3a6',
  },
  allowTradingEth: true,
},
{
  dataIndex: 44,
  id: 'rai',
  name: 'rai',
  lpTokenInfo: {
    name: 'raiCurve',
    symbol: 'raiCrv',
  },
  coingeckoInfo: {
    id: 'rai',
    symbol: 'RAI',
    referenceAssetId: 'dollar',
  },
  assets: 'RAI+3pool',
  isMetaPool: true,
  coins: [
    coins.rai,
    coins.tricrv,
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0x618788357D0EBd8A37e763ADab3bc575D54c2C7d',
    lpToken: '0x6BA5b4e438FA0aAf7C1bD179285aF65d13bD3D90',
    deposit: '0xcB636B81743Bb8a7F1E355DEBb7D33b07009cCCC',
    gauge: '0x66ec719045bBD62db5eBB11184c18237D3Cc2E62',
  },
  isRiskier: true,
  riskLevel: 3,
  isStablePoolWithSpecialUnpeggedAssets: true, // Special stable pool implementation to pair rai+usd
},
{
  dataIndex: 45,
  id: 'cvxeth',
  name: 'cvxeth',
  referenceAsset: REFERENCE_ASSETS.CRYPTO,
  cryptoPool: true,
  isPlainCryptoPool: true,
  lpTokenInfo: {
    name: 'CvxEthCurve',
    symbol: 'CvxEthCrv',
  },
  coingeckoInfo: {
    id: 'convex-finance',
    symbol: 'CVX',
  },
  assets: 'CVX+ETH',
  useAssetsStringForDisplayPurposes: true,
  coins: [
    coins.weth,
    coins.cvx,
  ],
  coinsInPlaceReplacements: [
    coins.eth,
  ],
  addresses: {
    swap: '0xB576491F1E6e5E62f1d8F26062Ee822B40B0E0d4',
    lpToken: '0x3A283D9c08E8b55966afb64C515f5143cf907611',
    gauge: '0x7E1444BA99dcdFfE8fBdb42C02F0005D14f13BE1',
  },
  allowTradingEth: true,
},
{
  dataIndex: 46,
  id: 'xautusd',
  name: 'xautusd',
  referenceAsset: REFERENCE_ASSETS.CRYPTO,
  isForexMetaPool: true,
  lpTokenInfo: {
    name: 'xautUsdCurve',
    symbol: 'xautUsdCrv',
  },
  coingeckoInfo: {
    id: 'tether-gold',
    symbol: 'XAUt',
    referenceAssetId: 'tether-gold',
  },
  isMetaPool: true,
  cryptoPool: true,
  assets: 'XAUt+3pool',
  coins: [
    coins.xaut,
    coins.tricrv
  ],
  metaCoins: [
    coins.dai,
    coins.usdc,
    coins.usdt,
  ],
  addresses: {
    swap: '0xAdCFcf9894335dC340f6Cd182aFA45999F45Fc44',
    lpToken: '0x8484673cA7BfF40F82B041916881aeA15ee84834',
    gauge: '0x1B3E14157ED33F60668f2103bCd5Db39a1573E5B',
    deposit: '0xc5FA220347375ac4f91f9E4A4AAb362F22801504',
  },
  gaugeVersion: 4,
},
{
  dataIndex: 47,
  id: 'spelleth',
  name: 'spelleth',
  referenceAsset: REFERENCE_ASSETS.SPELL,
  cryptoPool: true,
  isPlainCryptoPool: true,
  lpTokenInfo: {
    name: 'SpellEthCurve',
    symbol: 'SpellEthCrv',
  },
  coingeckoInfo: {
    id: 'spell-token',
    symbol: 'SPELL',
  },
  assets: 'SPELL+ETH',
  useAssetsStringForDisplayPurposes: true,
  coins: [
    coins.weth,
    coins.spell,
  ],
  coinsInPlaceReplacements: [
    coins.eth,
  ],
  addresses: {
    swap: '0x98638FAcf9a3865cd033F36548713183f6996122',
    lpToken: '0x8282BD15dcA2EA2bDf24163E8f2781B30C43A2ef',
    gauge: '0x08380a4999Be1a958E2abbA07968d703C7A3027C',
  },
  allowTradingEth: true,
  gaugeVersion: 4,
},
{
  dataIndex: 48,
  id: 'teth',
  name: 'teth',
  referenceAsset: REFERENCE_ASSETS.T,
  cryptoPool: true,
  isPlainCryptoPool: true,
  lpTokenInfo: {
    name: 'TEthCurve',
    symbol: 'TEthCrv',
  },
  coingeckoInfo: {
    id: 'threshold-network-token',
    symbol: 'T',
  },
  assets: 'T+ETH',
  useAssetsStringForDisplayPurposes: true,
  coins: [
    coins.weth,
    coins.t,
  ],
  coinsInPlaceReplacements: [
    coins.eth,
  ],
  addresses: {
    swap: '0x752eBeb79963cf0732E9c0fec72a49FD1DEfAEAC',
    lpToken: '0xCb08717451aaE9EF950a2524E33B6DCaBA60147B',
    gauge: '0x6070fBD4E608ee5391189E7205d70cc4A274c017',
  },
  allowTradingEth: true,
  gaugeVersion: 4,
},
];

export default pools;
