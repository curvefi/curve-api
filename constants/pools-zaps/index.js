/**
 * There is no onchain registry for zaps, so this is a hardcoded registry.
 * Note: JSON files need ALL addresses to be lowercase in order to match properly.
 */

import arbitrum from './arbitrum.json';
import avalanche from './avalanche.json';
import ethereum from './ethereum.json';
import fantom from './fantom.json';
import harmony from './harmony.json';
import optimism from './optimism.json';
import polygon from './polygon.json';
import xdai from './xdai.json';

export default {
  arbitrum,
  avalanche,
  ethereum,
  fantom,
  harmony,
  optimism,
  polygon,
  xdai,
};
