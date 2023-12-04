/**
 * Returns a Promise-wrapped instance of a stale-while-revalidate cache helper that
 * takes care of serving fresh data, caching it, and revalidating as needed, using
 * memcached hosts as cache storage.
 */

import { createStaleWhileRevalidateCache } from 'stale-while-revalidate-cache';
import { Client } from 'memjs';
import getCacheNodes from '#root/utils/getCacheNodes.js';
import CACHE_SETTINGS from '#root/constants/CacheSettings.js';

const swrPromise = new Promise(async (resolve, reject) => {
  const cacheNodes = await getCacheNodes();

  if (cacheNodes.length > 0) {
    console.log('Using memcached store nodes:');
    console.log(cacheNodes);

    const client = Client.create(cacheNodes.join(',')); // memjs takes a comma-separated list of hosts

    const storage = {
      async getItem(key) {
        return (await client.get(key)).value;
      },
      async setItem(key, value) {
        await client.set(key, value, { expires: CACHE_SETTINGS.maxTimeToLive / 1000 });
      },
      async removeItem(key) {
        await client.delete(key);
      },
    };

    const swr = createStaleWhileRevalidateCache({
      storage,
      ...CACHE_SETTINGS,
    });

    resolve(swr);
  } else {
    reject('No memcached nodes found');
  }
});

// Wrapper that exposes the same intuitive api as naked swr, while
// making up for the async nature of memcached nodes retrieval
const swr = async (key, fn, configOverrides) => (await swrPromise)(key, fn, configOverrides);

export default swr;
