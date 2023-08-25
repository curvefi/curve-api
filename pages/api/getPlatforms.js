/**
 * Returns platforms that Curve is deployed on, and which pool registries
 * are available on each platform.
 *
 * Useful to then query e.g. `/api/getPools/PLATFORM/REGISTRY`
 */

import configs from 'constants/configs';
import { arrayToHashmap } from 'utils/Array';
import { fn } from 'utils/api';
import getPlatformRegistries from 'utils/data/curve-platform-registries';

const allBlockchainIds = Array.from(Object.keys(configs));

export default fn(async () => ({
  platforms: arrayToHashmap(allBlockchainIds.map((blockchainId) => [
    blockchainId,
    getPlatformRegistries(blockchainId),
  ])),
}), {
  maxAge: 60 * 60, // 1h
  name: 'getPlatforms',
});
