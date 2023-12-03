/**
 * Global cache settings:
 * - `minTimeToStale` is the number of milliseconds until a cache entry is considered
 *   stale, and is then refreshed
 * - `maxTimeToLive` is the number of milliseconds until a cache entry is considered
 *   expired (by opposition to *stale*): if considered expired, it will not be returned,
 *   it will be refreshed instead and will only return after this fresh invocation
 *
 * Our node-side swr utility bases its behavior on both those props. They can both be
 * overridden in individual swr calls (in practice, `minTimeToStale` is most overridden
 * the most often).
 * Memcached only uses maxTimeToLive as its `expiry` prop.
 */

const CACHE_SETTINGS = {
  minTimeToStale: 30 * 1000, // 30s
  maxTimeToLive: 24 * 60 * 60 * 1000, // 1d
  serialize: JSON.stringify, // serialize product object to string
  deserialize: JSON.parse, // deserialize cached product string to object
};

export default CACHE_SETTINGS;
