/**
 * Returns a Promise-wrapped instance of a stale-while-revalidate cache helper that
 * takes care of serving fresh data, caching it, and revalidating as needed, using
 * memcached hosts as cache storage.
 */

import { createStaleWhileRevalidateCache } from 'stale-while-revalidate-cache';
import { Redis } from 'ioredis';
import CACHE_SETTINGS from '#root/constants/CacheSettings.js';
import { IS_DEV } from '#root/constants/AppConstants.js';

const swrPromise = new Promise(async (resolve, reject) => {
  const cacheNode = IS_DEV ? process.env.DEV_REDIS_HOST : process.env.PROD_REDIS_HOST

  console.log('Using memcached store nodes:');
  console.log(cacheNode);

  const redis = new Redis(cacheNode); // To update prod redis server

  const storage = {
    async getItem(key) {
      return redis.get(key);
    },
    async setItem(key, value) {
      // update using PR
      await redis.set(key, value, 'EX', (CACHE_SETTINGS.maxTimeToLive / 1000));
    },
    async removeItem(key) {
      await redis.del(key);
    },
  };

  const swr = createStaleWhileRevalidateCache({
    storage,
    ...CACHE_SETTINGS,
  });

  resolve(swr);
});

// Wrapper that exposes the same intuitive api as naked swr, while
// making up for the async nature of memcached nodes retrieval
const swr = async (key, fn, configOverrides) => (await swrPromise)(key, fn, configOverrides);

export default swr;
