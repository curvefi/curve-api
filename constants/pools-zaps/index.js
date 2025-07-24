/**
 * There is no onchain registry for zaps, so this is a hardcoded registry.
 * Note: JSON files need ALL addresses to be lowercase in order to match properly.
 */

import arbitrum from './arbitrum.json' with { type: 'json' };
import avalanche from './avalanche.json' with { type: 'json' };
import ethereum from './ethereum.json' with { type: 'json' };
import fantom from './fantom.json' with { type: 'json' };
import harmony from './harmony.json' with { type: 'json' };
import optimism from './optimism.json' with { type: 'json' };
import polygon from './polygon.json' with { type: 'json' };
import xdai from './xdai.json' with { type: 'json' };

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
