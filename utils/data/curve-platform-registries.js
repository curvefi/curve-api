import memoize from 'memoizee';
import configs from 'constants/configs';

const getPlatformRegistries = memoize((blockchainId) => {
  const config = configs[blockchainId];
  if (typeof config === 'undefined') {
    throw new Error(`No config data for blockchainId "${blockchainId}"`);
  }

  const {
    getFactoryRegistryAddress,
    getCryptoRegistryAddress,
    getFactoryCryptoRegistryAddress,
    getFactoryCrvusdRegistryAddress,
    getFactoryTricryptoRegistryAddress,
    getFactoryEywaRegistryAddress,
    hasNoMainRegistry,
  } = config;

  return [
    (!hasNoMainRegistry ? 'main' : null),
    (typeof getFactoryRegistryAddress === 'function' ? 'factory' : null),
    (typeof getCryptoRegistryAddress === 'function' ? 'crypto' : null),
    (typeof getFactoryCryptoRegistryAddress === 'function' ? 'factory-crypto' : null),
    (typeof getFactoryCrvusdRegistryAddress === 'function' ? 'factory-crvusd' : null),
    (typeof getFactoryTricryptoRegistryAddress === 'function' ? 'factory-tricrypto' : null),
    (typeof getFactoryEywaRegistryAddress === 'function' ? 'factory-eywa' : null),
  ].filter((o) => o !== null);
});

export default getPlatformRegistries;
