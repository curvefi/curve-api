// Metadata for some pools

// Id of eywa pools in fantom factory-stable-ng registry
// Used to only query their api for relevant assets
const EYWA_POOLS_METADATA = [{
  fantomFactoryStableNgPoolId: 0,
  shortName: 'eUSDT',
}, {
  fantomFactoryStableNgPoolId: 1,
  shortName: 'eUSDC',
}, {
  fantomFactoryStableNgPoolId: 2,
  shortName: 'eDAI',
}, {
  fantomFactoryStableNgPoolId: 3,
  shortName: 'eTUSD',
}, {
  fantomFactoryStableNgPoolId: 4,
  shortName: 'EUSD',
}, {
  fantomFactoryStableNgPoolId: 16,
  shortName: 'CrossCurve crvUSDC',
}, {
  fantomFactoryStableNgPoolId: 17,
  shortName: 'CrossCurve 3crypto',
}, {
  fantomFactoryStableNgPoolId: 24,
  shortName: 'CrossCurve Stable',
}, {
  fantomFactoryStableNgPoolId: 37,
  shortName: 'CrossCurve ETH',
}, {
  fantomFactoryStableNgPoolId: 39,
  shortName: 'CrossCurve BTC',
}, {
  fantomFactoryStableNgPoolId: 43,
  shortName: 'CrossCurve Stable 2',
}, {
  fantomFactoryStableNgPoolId: 49,
  shortName: 'CrossCurve ETH 2',
}, {
  fantomFactoryStableNgPoolId: 54,
  shortName: 'CrossCurve Stable 3',
}, {
  sonicFactoryStableNgPoolId: 69,
  shortName: 'CrossCurve Stable ETH',
}, {
  sonicFactoryStableNgPoolId: 70,
  shortName: 'CrossCurve Stable BSC',
}, {
  sonicFactoryStableNgPoolId: 71,
  shortName: 'CrossCurve Stable AVA',
}, {
  sonicFactoryStableNgPoolId: 72,
  shortName: 'CrossCurve Stable POL',
}, {
  sonicFactoryStableNgPoolId: 73,
  shortName: 'CrossCurve Stable ARB',
}, {
  sonicFactoryStableNgPoolId: 74,
  shortName: 'CrossCurve Stable OP',
}, {
  sonicFactoryStableNgPoolId: 75,
  shortName: 'CrossCurve Stable BASE',
}, {
  sonicFactoryStableNgPoolId: 76,
  shortName: 'CrossCurve Stable BL',
}, {
  sonicFactoryStableNgPoolId: 77,
  shortName: 'CrossCurve Stable GNO',
}, {
  sonicFactoryStableNgPoolId: 78,
  shortName: 'CrossCurve Stable TAI',
}, {
  sonicFactoryStableNgPoolId: 79,
  shortName: 'CrossCurve Stable MTL',
}, {
  sonicFactoryStableNgPoolId: 80,
  shortName: 'CrossCurve Stable LIN',
}, {
  sonicFactoryStableNgPoolId: 81,
  shortName: 'CrossCurve Stable CELO',
}, {
  sonicFactoryStableNgPoolId: 82,
  shortName: 'CrossCurve Stable MET',
}, {
  sonicFactoryStableNgPoolId: 83,
  shortName: 'CrossCurve Stable MODE',
}, {
  sonicFactoryStableNgPoolId: 84,
  shortName: 'CrossCurve Stable MTA',
}, {
  sonicFactoryStableNgPoolId: 85,
  shortName: 'CrossCurve Stable KAVA',
}, {
  sonicFactoryStableNgPoolId: 86,
  shortName: 'CrossCurve WETH ETH',
}, {
  sonicFactoryStableNgPoolId: 87,
  shortName: 'CrossCurve WETH ARB',
}, {
  sonicFactoryStableNgPoolId: 88,
  shortName: 'CrossCurve WETH OP',
}, {
  sonicFactoryStableNgPoolId: 89,
  shortName: 'CrossCurve WETH BASE',
}, {
  sonicFactoryStableNgPoolId: 90,
  shortName: 'CrossCurve WETH BL',
}, {
  sonicFactoryStableNgPoolId: 91,
  shortName: 'CrossCurve WETH MTL',
}, {
  sonicFactoryStableNgPoolId: 92,
  shortName: 'CrossCurve WETH BSC',
}, {
  sonicFactoryStableNgPoolId: 93,
  shortName: 'CrossCurve WETH POL',
}, {
  sonicFactoryStableNgPoolId: 94,
  shortName: 'CrossCurve WETH AVA',
}, {
  sonicFactoryStableNgPoolId: 95,
  shortName: 'CrossCurve WETH GNO',
}, {
  sonicFactoryStableNgPoolId: 96,
  shortName: 'CrossCurve WETH MET',
}, {
  sonicFactoryStableNgPoolId: 97,
  shortName: 'CrossCurve WETH MODE',
}, {
  sonicFactoryStableNgPoolId: 98,
  shortName: 'CrossCurve WETH LIN',
}, {
  sonicFactoryStableNgPoolId: 99,
  shortName: 'CrossCurve WETH TAI',
}, {
  sonicFactoryStableNgPoolId: 100,
  shortName: 'CrossCurve WETH MTA',
}, {
  sonicFactoryStableNgPoolId: 60,
  shortName: 'CrossCurve BTC ETH',
}, {
  sonicFactoryStableNgPoolId: 61,
  shortName: 'CrossCurve BTC ARB',
}, {
  sonicFactoryStableNgPoolId: 62,
  shortName: 'CrossCurve BTC OP',
}, {
  sonicFactoryStableNgPoolId: 63,
  shortName: 'CrossCurve BTC AVA',
}, {
  sonicFactoryStableNgPoolId: 64,
  shortName: 'CrossCurve BTC POL',
}, {
  sonicFactoryStableNgPoolId: 65,
  shortName: 'CrossCurve BTC BSC',
}, {
  sonicFactoryStableNgPoolId: 66,
  shortName: 'CrossCurve BTC BASE',
}, {
  sonicFactoryStableNgPoolId: 67,
  shortName: 'CrossCurve BTC LIN',
}, {
  sonicFactoryStableNgPoolId: 68,
  shortName: 'CrossCurve BTC GNO',
}, {
  sonicFactoryStableNgPoolId: 2,
  shortName: 'CrossCurve CRV',
}, {
  sonicFactoryStableNgPoolId: 106,
  shortName: 'CrossCurve CRV 2',
}];

const FANTOM_FACTO_STABLE_NG_EYWA_POOL_IDS = EYWA_POOLS_METADATA.map(({ fantomFactoryStableNgPoolId }) => fantomFactoryStableNgPoolId).filter((str) => !!str);
const SONIC_FACTO_STABLE_NG_EYWA_POOL_IDS = EYWA_POOLS_METADATA.map(({ sonicFactoryStableNgPoolId }) => sonicFactoryStableNgPoolId).filter((str) => !!str);

export {
  EYWA_POOLS_METADATA,
  FANTOM_FACTO_STABLE_NG_EYWA_POOL_IDS,
  SONIC_FACTO_STABLE_NG_EYWA_POOL_IDS,
};
