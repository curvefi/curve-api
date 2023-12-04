/**
 * There is no onchain registry for zaps, so this is a hardcoded registry.
 * Note: JSON files need ALL addresses to be lowercase in order to match properly.
 */

import arbitrum from './arbitrum.json' assert { type: 'json' };
import avalanche from './avalanche.json' assert { type: 'json' };
import ethereum from './ethereum.json' assert { type: 'json' };
import fantom from './fantom.json' assert { type: 'json' };
import harmony from './harmony.json' assert { type: 'json' };
import optimism from './optimism.json' assert { type: 'json' };
import polygon from './polygon.json' assert { type: 'json' };
import xdai from './xdai.json' assert { type: 'json' };

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
