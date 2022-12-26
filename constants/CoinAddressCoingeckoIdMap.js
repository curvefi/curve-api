/**
 * In order for the whole app to be aware of the entirety of tokens prices, it:
 * 1. Retrieves the price of a few generic and widely-traded tokens like USDC (the "starting point")
 * 2. Derives the price of every single other token in any Curve pool using Curve pools
 *    themselves and the price that assets are trading at in them
 *
 * Hence the list below represents the only tokens that the app queries Coingecko for.
 * See the context surrounding `REGISTRIES_DEPENDENCIES` in `getPools/index.js`, and
 * `deriveMissingCoinPricesSinglePass` in `getPools/_utils.js` to dig deeper into how this works.
 */

export default {
  ethereum: {
    '0x6b175474e89094c44da98b954eedeac495271d0f': 'dai', // DAI
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'usd-coin', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'tether', // USDT
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'ethereum', // Native ETH
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 'weth', // Native ETH
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': 'wrapped-bitcoin', // wBTC
    '0xc2cb1040220768554cf699b0d863a3cd4324ce32': 'dai', // yDAI
    '0x26ea744e5b887e5205727f55dfbe8685e3b21951': 'usd-coin', // yUSDC
    '0xe6354ed5bc4b393a5aad09f21c46e101e692d447': 'tether', // yUSDT
    '0x04bc0ab673d88ae9dbc9da2380cb6b79c4bca9ae': 'binance-usd', // yBUSD
    '0x16de59092dae5ccf4a1e6439d611fd0653f0bd01': 'dai', // yDAI
    '0x8e870d67f660d95d5be530380d0ec0bd388289e1': 'paxos-standard', // USDP
    '0xd6ad7a6750a7593e092a9b218d66c0a814a3436e': 'usd-coin', // ycUSDC
    '0x83f798e925bcd4017eb265844fddabb448f1707d': 'tether', // ycUSDT
    '0x8cb24ed2e4f7e2065f4eb2be5f6b0064b1919850': 'south-african-tether', // ZARP
    '0x028171bca77440897b824ca71d1c56cac55b68a3': 'aave-dai', // aDAI
    '0xBcca60bB61934080951369a648Fb03DF4F96263C': 'aave-usdc', // aUSDC
    '0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811': 'aave-usdt', // aUSDT
    '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643': 'cdai', // cDAI
    '0x514910771AF9Ca656af840dff83E8264EcF986CA': 'chainlink', // LINK
    '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0': 'matic-network', // MATIC
    '0x6bea7cfef803d1e3d5f7c0103f7ded065644e197': 'gamma-strategies', // GAMMA
    '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f': 'havven', // SNX
    '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'aave', // AAVE
    '0x9c4a4204b79dd291d6b6571c5be8bbcd0622f050': 'tracer-dao', // TCR
    '0xc770eefad204b5180df6a14ee197d99d808ee52d': 'shapeshift-fox-token', // FOX
    '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2': 'sushi', // SUSHI
    '0x31429d1856aD1377A8A0079410B297e1a9e214c2': 'angle-protocol', // ANGLE
    '0xed35af169af46a02ee13b9d79eb57d6d68c1749e': 'ecomi', // OMI
    '0x4104b135dbc9609fc1a9490e61369036497660c8': 'apwine',
    '0x9559aaa82d9649c7a7b220e7c461d2e74c9a3593': 'reth',
    '0xae78736cd615f374d3085123a210448e74fc6393': 'rocket-pool-eth',
    '0xdbdb4d16eda451d0503b854cf79d55697f90c8df': 'alchemix',
    '0x0ec9f76202a7061eb9b3a7d6b59d36215a7e37da': 'blackpool-token',
  },
  polygon: {
    '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063': 'dai', // DAI
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174': 'usd-coin', // USDC
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F': 'tether', // USDT
    '0x1a13F4Ca1d028320A707D99520AbFefca3998b7F': 'usd-coin', // amUSDC
    '0x9719d867a500ef117cc201206b8ab51e794d3f82': 'matic-aave-usdc', // maUSDC
    '0x5c2ed810328349100A66B82b78a1791B101C9D61': 'wrapped-bitcoin', // amWBTC
    '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6': 'wrapped-bitcoin', // amWBTC
    '0x28424507fefb6f7f8E9D3860F56504E4e5f5f390': 'ethereum', // amWETH
    '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270': 'matic-network', // MATIC
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'matic-network', // MATIC
    '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619': 'weth', // WETH
    '0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7': 'binance-usd',
    '0x7bdf330f423ea880ff95fc41a280fd5ecfd3d09f': 'tether-eurt',
    '0x5a35d30c8b23e571e4f7efc25f353c91fd12f8e8': 'popcorn',
    '0xb34d4803a9bafd5bd54d0d6db49248cf82934c1a': 'interest-bearing-bitcoin',
    '0x3066818837c5e6ed6601bd5a91b0762877a6b731': 'uma',
    '0x769434dca303597c8fc4997bf3dab233e961eda2': 'xsgd',
    '0xc67238827da94b15f6ba10f3d35f690809919f75': 'ampleforth',
    '0x553d3d295e0f695b9228246232edf400ed3560b5': 'pax-gold',
    '0x172370d5Cd63279eFa6d502DAB29171933a610AF': 'curve-dao-token', // CRV
    '0x5d146d8b1dacb1ebba5cb005ae1059da8a1fbf57': 'cad-coin', // CADC
    '0xE0B52e49357Fd4DAf2c15e02058DCE6BC0057db4': 'ageur', // agEUR
    '0x6ae7dfc73e0dde2aa99ac063dcf7e8a63265108c': 'jpyc', // JPYC
    '0x431d5dff03120afa4bdf332c61a6e1766ef37bdb': 'jpy-coin', // JPYC
    '0xeCDCB5B88F8e3C15f95c720C51c71c9E2080525d': 'binancecoin', // wBNB
    '0xc3c7d422809852031b44ab29eec9f1eff2a58756': 'lido-dao',
  },
  arbitrum: {
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'ethereum', // Native ETH
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': 'dai',
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': 'usd-coin',
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 'tether',
    '0x82e64f49ed5ec1bc6e43dad4fc8af9bb3a2312ee': 'dai',
    '0x625e7708f30ca75bfd92586e17077590c60eb4cd': 'usd-coin',
    '0x6ab707aca953edaefbc4fd23ba73294241490620': 'tether',
    '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': 'wrapped-bitcoin',
    '0xdbf31df14b66535af65aac99c32e9ea844e14501': 'renbtc',
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'weth',
    '0xfea7a6a0b346362bf88a9e4a88416b77a57d6c2a': 'magic-internet-money',
    '0xd22a58f79e9481d1a88e00c343885a588b34b68b': 'stasis-eurs',
    '0x17fc002b466eec40dae837fc4be5c67993ddbd6f': 'frax',
    '0x115d8bf0a53e751f8a472f88d587944ec1c8ca6d': 'ptokens-btc',
    '0xae6aab43c4f3e0cea4ab83752c278f8debaba689': 'dforce-token',
    '0x13ad51ed4f1b7e9dc168d8a00cb3f4ddd85efa60': 'lido-dao',
  },
  avalanche: {
    '0xd586e7f844cea2f87f50152665bcbc2c279d8d70': 'dai', // DAI
    '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e': 'usd-coin', // USDC
    '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7': 'tether', // USDT
    '0x47afa96cdc9fab46904a55a6ad4bf6660b53c38a': 'dai', // avDAI
    '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE': 'dai', // aAvaDAI
    '0x46a51127c3ce23fb7ab1de06226147f446e4a857': 'usd-coin', // avUSDC
    '0x625E7708f30cA75bfd92586e17077590C60eb4cD': 'usd-coin', // aAvaUSDC
    '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664': 'usd-coin', // USDC.e
    '0x532e6537fea298397212f09a61e03311686f548e': 'tether', // avUSDT
    '0x6ab707Aca953eDAeFBc4fD23bA73294241490620': 'tether', // aAvaUSDT
    '0xc7198437980c041c805A1EDcbA50c1Ce5db95118': 'tether', // USDT.e
    '0x686bef2417b6dc32c50a3cbfbcc3bb60e1e9a15d': 'wrapped-bitcoin', // avWBTC
    '0xdbf31df14b66535af65aac99c32e9ea844e14501': 'renbtc',
    '0x53f7c5869a859f0aec3d334ee8b4cf01e3492f21': 'weth', // avWETH
    '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB': 'weth', // WETH.e
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'avalanche-2',
    '0x6807ed4369d9399847f306d7d835538915fa749d': 'dai', // bDAI
    // '0x1337BedC9D22ecbe766dF105c9623922A27963EC': 'dai', // bDAI
    '0xc53a6eda2c847ce9f10b5c8d51bc2a9ed2fe3d44': 'avalanche-2', // u.AVAX
    '0x264c1383EA520f73dd837F915ef3a732e204a493': 'binancecoin', // BNB
    '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7': 'wrapped-avax', // WAVAX
    '0x6feFd97F328342a8A840546A55FDcfEe7542F9A8': 'ageur', // agEUR
    '0x9fB1d52596c44603198fB0aee434fac3a679f702': 'jarvis-synthetic-euro', // jEUR
  },
  fantom: {
    '0x74b23882a30290451a17c44f4f05243b6b58c76d': 'weth', // WETH
    '0x321162cd933e2be498cd2267a90534a804051b11': 'wrapped-bitcoin', // WBTC
    '0x4e15361fd6b4bb609fa63c81a2be19d873717870': 'fantom', // FTM
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE': 'fantom', // FTM
    '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e': 'dai', // DAI
    '0x07E6332dD090D287d3489245038daF987955DCFB': 'dai', // gDAI
    '0x04068da6c83afcfa0e13ba15a6696662335d5b75': 'usd-coin', // USDC
    '0x049d68029688eabf473097a2fc38ef61633a3c7a': 'tether', // fUSDT
    '0x1e4f97b9f9f913c46f1632781732927b9019c68b': 'curve-dao-token', // CRV
    '0xC931f61B1534EB21D8c11B24f3f5Ab2471d4aB50': 'binance-usd', // BUSD
  },
  optimism: {
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'ethereum', // Native ETH
    '0x7f5c764cbc14f9669b88837ca1490cca17c31607': 'usd-coin',
    '0x625E7708f30cA75bfd92586e17077590C60eb4cD': 'usd-coin', // aOptUSDC
    '0x68f180fcce6836688e9084f035309e29bf0a2095': 'wrapped-bitcoin',
    '0xfdb794692724153d1488ccdbe0c56c252596735f': 'lido-dao',
  },
  xdai: {
    '0x4ecaba5870353805a9f068101a40e0f32ed605c6': 'tether',
    '0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb': 'gnosis',
  },
  aurora: {
    '0xe3520349F477A5F6EB06107066048508498A291b': 'dai',
  },
  moonbeam: {
    '0x8f552a71EFE5eeFc207Bf75485b356A0b3f01eC9': 'usd-coin', // madUSDC
    '0x818ec0A7Fe18Ff94269904fCED6AE3DaE6d6dC0b': 'usd-coin', // mUSDC
    '0x9fda7ceec4c18008096c2fe2b85f05dc300f94d0': 'lido-dao',
    '0xffffffff1fcacbd218edc0eba20fc2308c778080': 'polkadot',
    '0xfa36fe1da08c89ec72ea1f0143a35bfd5daea108': 'polkadot',
  },
  kava: {
    '0xfA9343C3897324496A05fC75abeD6bAC29f8A40f': 'usd-coin',
    '0x765277EebeCA2e31912C9946eAe1021199B39C61': 'dai',
    '0x5C7e299CF531eb66f2A1dF637d37AbB78e6200C7': 'dai', // axlDAI
    '0xB44a9B6905aF7c801311e8F4E76932ee959c663C': 'tether',
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'kava',
    '0xc86c7C0eFbd6A49B35E8714C5f59D99De09A225b': 'kava', // wKAVA
    '0x818ec0A7Fe18Ff94269904fCED6AE3DaE6d6dC0b': 'wrapped-bitcoin',
    '0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D': 'ethereum',
  },
  celo: {
    '0x471ece3750da237f93b8e339c536989b8978a438': 'celo',
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'celo',
    '0xef4229c8c3250C675F21BCefa42f58EfbfF6002a': 'usd-coin',
    '0x37f750B7cC259A2f741AF45294f6a16572CF5cAd': 'usd-coin',
    '0x90Ca507a5D4458a4C6C6249d186b6dCb02a5BCCd': 'dai',
    '0x88eeC49252c8cbc039DCdB394c0c2BA2f1637EA0': 'tether',
    '0xC16B81Af351BA9e64C1a069E3Ab18c244A1E3049': 'ageur',
  },
};
