/**
 * Cache Utility
 * Provides an in-memory cache with TTL for geolocation results.
 */

const NodeCache = require('node-cache');

// TTL = 10 minutes (600 seconds), check for expired keys every 120 seconds
const cache = new NodeCache({
  stdTTL: 600,
  checkperiod: 120,
  useClones: true,
  deleteOnExpire: true,
});

/**
 * Get a cached geolocation result by IP address.
 * @param {string} ip - The IP address key
 * @returns {object|undefined} Cached data or undefined
 */
function getCachedLocation(ip) {
  return cache.get(ip);
}

/**
 * Store a geolocation result in cache.
 * @param {string} ip - The IP address key
 * @param {object} data - The geolocation data to cache
 */
function setCachedLocation(ip, data) {
  cache.set(ip, data);
}

/**
 * Get cache statistics.
 * @returns {object} Cache stats (hits, misses, keys, etc.)
 */
function getCacheStats() {
  return cache.getStats();
}

/**
 * Flush the entire cache.
 */
function flushCache() {
  cache.flushAll();
}

module.exports = {
  getCachedLocation,
  setCachedLocation,
  getCacheStats,
  flushCache,
};
