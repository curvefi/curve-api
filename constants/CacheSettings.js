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
 * Redis only uses `maxTimeToLive` as its `expiry` prop.
 *
 * `maxTimeToLive` is set to a very long period to prevent outtages at all costs. With
 * monitoring in place, any broken script or stale data would get caught rapidly, but
 * we never want a situation where the fix would take too long to ship, and the cache
 * entries would get deleted, and nothing could be served anymore by the api: so an
 * absurdly high value is used to minimize the risk of downtime, while still allowing
 * unused cache entries to be deleted in a reasonable timeframe.
 */

const CACHE_SETTINGS = {
  minTimeToStale: 30 * 1000, // 30s
  maxTimeToLive: 14 * 24 * 60 * 60 * 1000, // 14d
  serialize: JSON.stringify, // serialize product object to string
  deserialize: JSON.parse, // deserialize cached product string to object
};

export default CACHE_SETTINGS;
