/**
 * On most chains we can retrieve coin prices from their token address straight from
 * coingecko, and for the few token addresses unknown to coingecko on this chain, derive
 * missing prices using the others (using `/pages/api/getPools/_utils.js`).
 *
 * However on some less popular chains, coingecko has listed very few (if any) token
 * addresses, hence there's no primary source of data to derive missing prices from.
 * For these less popular chains, we can hardcode some address<>coingeckoId info
 * for a few major coins in order for our scripts to have some basic price information
 * to derive the rest of the prices from.
 */

export default {
  ethereum: {
    '0xc2cb1040220768554cf699b0d863a3cd4324ce32': 'dai', // yDAI
    '0x26ea744e5b887e5205727f55dfbe8685e3b21951': 'usd-coin', // yUSDC
    '0xe6354ed5bc4b393a5aad09f21c46e101e692d447': 'tether', // yUSDT
    '0x04bc0ab673d88ae9dbc9da2380cb6b79c4bca9ae': 'binance-usd', // yBUSD
    '0x16de59092dae5ccf4a1e6439d611fd0653f0bd01': 'dai', // ycDAI
    '0xd6ad7a6750a7593e092a9b218d66c0a814a3436e': 'usd-coin', // ycUSDC
    '0x83f798e925bcd4017eb265844fddabb448f1707d': 'tether', // ycUSDT
  },
  polygon: {
    '0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7': 'binance-usd',
    '0x7bdf330f423ea880ff95fc41a280fd5ecfd3d09f': 'tether-eurt',
    '0x5a35d30c8b23e571e4f7efc25f353c91fd12f8e8': 'popcorn',
    '0xb34d4803a9bafd5bd54d0d6db49248cf82934c1a': 'interest-bearing-bitcoin',
    '0x3066818837c5e6ed6601bd5a91b0762877a6b731': 'uma',
    '0x769434dca303597c8fc4997bf3dab233e961eda2': 'xsgd',
    '0xc67238827da94b15f6ba10f3d35f690809919f75': 'ampleforth',
    '0x553d3d295e0f695b9228246232edf400ed3560b5': 'pax-gold',
  },
  arbitrum: {
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
  },
  avalanche: {
    '0x47afa96cdc9fab46904a55a6ad4bf6660b53c38a': 'dai',
    '0x46a51127c3ce23fb7ab1de06226147f446e4a857': 'usd-coin',
    '0x532e6537fea298397212f09a61e03311686f548e': 'tether',
    '0x686bef2417b6dc32c50a3cbfbcc3bb60e1e9a15d': 'wrapped-bitcoin',
    '0xdbf31df14b66535af65aac99c32e9ea844e14501': 'renbtc',
    '0x53f7c5869a859f0aec3d334ee8b4cf01e3492f21': 'weth',
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': 'avalanche-2',
    '0x6807ed4369d9399847f306d7d835538915fa749d': 'dai', // bDAI
    '0xc53a6eda2c847ce9f10b5c8d51bc2a9ed2fe3d44': 'avalanche-2', // u.AVAX
  },
  fantom: {
    '0x04c762a5df2fa02fe868f25359e0c259fb811cfe': 'dai', // iDAI
    '0x328a7b4d538a2b3942653a9983fda3c12c571141': 'usd-coin', // iUSDC
    '0x70fac71debfd67394d1278d98a29dea79dc6e57a': 'tether', // iUSDT
    '0xc931f61b1534eb21d8c11b24f3f5ab2471d4ab50': 'binance-usd', // iUSDT
  },
  optimism: {
    '0x1337bedc9d22ecbe766df105c9623922a27963ec': 'usd-coin', // 3crv approximation
  },
  xdai: {
    '0x4ecaba5870353805a9f068101a40e0f32ed605c6': 'tether',
  },
};
