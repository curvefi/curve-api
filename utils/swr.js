/**
 * Returns a Promise-wrapped instance of a stale-while-revalidate cache helper that
 * takes care of serving fresh data, caching it, and revalidating as needed, using
 * Redis as cache storage.
 */

import { createStaleWhileRevalidateCache, EmitterEvents } from 'stale-while-revalidate-cache';
import { Redis } from 'ioredis';
import CACHE_SETTINGS from '#root/constants/CacheSettings.js';
import { IS_DEV } from '#root/constants/AppConstants.js';
import { NotFoundError, ParamError } from '#root/utils/api.js';

const cacheNode = IS_DEV ? process.env.DEV_REDIS_HOST : process.env.PROD_REDIS_HOST
console.log('Using Redis node:', cacheNode);

const redis = new Redis(cacheNode); // To update prod redis server

const storage = {
  async getItem(key) {
    return redis.get(key);
  },
  async setItem(key, value) {
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

swr.onAny((event, payload) => {
  switch (event) {
    case EmitterEvents.cacheGetFailed:
      console.log('Error: cacheGetFailed', payload);
      break

    case EmitterEvents.cacheSetFailed:
      console.log('Error: cacheSetFailed', payload);
      break

    case EmitterEvents.revalidateFailed:
      if (IS_DEV) {
        console.log(payload);
        throw new Error('Error: revalidateFailed ↑');
      } else if (!(payload.error instanceof ParamError) && !(payload.error instanceof NotFoundError)) {
        console.log('Error: revalidateFailed', payload.cacheKey);
      }
      break;
  }
});


export default swr;
