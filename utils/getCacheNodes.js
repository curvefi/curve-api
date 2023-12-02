const { IS_DEV } = require("../constants/AppConstants");
const fs = require('fs/promises');

// Matches `NodeListPath` in elasticache_settings.config
const ELASTICACHE_NODE_LIST_PATH = '/var/nodelist';

// Returns an array of memcached hosts
const getCacheNodes = async () => {
  if (IS_DEV) {
    return [process.env.DEV_MEMCACHED_HOST];
  } else {
    console.log("Reading elastic cache configuration")
    // Load elasticache configuration.
    const data = await fs.readFile(ELASTICACHE_NODE_LIST_PATH, 'UTF8');
    let cacheNodes = []
    if (data) {
      let lines = data.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].length > 0) {
          cacheNodes.push(lines[i])
        }
      }
    }

    return cacheNodes.join(',');
  }
}

module.exports = getCacheNodes;
