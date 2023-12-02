/**
 * Global cache settings:
 * - minTimeToStale is the number of milliseconds until a cache entry is considered
 *   stale, and is then refreshed
 * - maxTimeToLive is the number of milliseconds until a cache entry is considered
 *   expired (by opposition to *stale*): if considered expired, it will not be returned,
 *   it will be refreshed instead and will only return after this fresh invocation
 */

const CACHE_SETTINGS = {
  minTimeToStale: 30 * 1000, // 30s
  maxTimeToLive: 60 * 60 * 1000, // 1h
  serialize: JSON.stringify, // serialize product object to string
  deserialize: JSON.parse, // deserialize cached product string to object
};

export default CACHE_SETTINGS;
