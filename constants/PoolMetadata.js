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
}];

const FACTO_STABLE_NG_EYWA_POOL_IDS = EYWA_POOLS_METADATA.map(({ fantomFactoryStableNgPoolId }) => fantomFactoryStableNgPoolId);

export {
  EYWA_POOLS_METADATA,
  FACTO_STABLE_NG_EYWA_POOL_IDS,
};
