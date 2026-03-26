/**
 * Cache Layer Module
 * Provides in-memory caching with TTL support and statistics tracking
 * 
 * Cache Key Strategy:
 * - payments:admin:{month} - admin payments list
 * - payments:user:{userId}:{month} - user payment stats
 * - stats:dashboard:{month} - dashboard stats
 * 
 * TTL Configuration:
 * - Payments: 5 minutes (300000ms)
 * - Stats: 10 minutes (600000ms)
 */

class CacheLayer {
  constructor() {
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      sets: 0
    };
    this.invalidationLog = [];
    this.maxLogSize = 1000;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if expired/missing
   */
  get(key) {
    const entry = this.store.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, data, ttl) {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    this.stats.sets++;
  }

  /**
   * Invalidate cache entry
   * @param {string} key - Cache key (supports wildcards: key:*)
   * @param {string} reason - Reason for invalidation
   * @returns {number} - Number of entries invalidated
   */
  invalidate(key, reason = 'manual') {
    let count = 0;

    if (key.endsWith('*')) {
      // Wildcard invalidation
      const prefix = key.slice(0, -1);
      for (const [cacheKey] of this.store.entries()) {
        if (cacheKey.startsWith(prefix)) {
          this.store.delete(cacheKey);
          count++;
          this._logInvalidation(cacheKey, reason);
        }
      }
    } else {
      // Exact key invalidation
      if (this.store.has(key)) {
        this.store.delete(key);
        count++;
        this._logInvalidation(key, reason);
      }
    }

    this.stats.invalidations += count;
    return count;
  }

  /**
   * Clear all cache
   * @param {string} reason - Reason for clearing
   */
  clear(reason = 'manual') {
    const count = this.store.size;
    this.store.clear();
    this.stats.invalidations += count;
    this._logInvalidation('*', reason);
  }

  /**
   * Get cache statistics
   * @returns {object} - Cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      invalidations: this.stats.invalidations,
      sets: this.stats.sets,
      hitRate: `${hitRate}%`,
      size: this.store.size,
      totalRequests: total
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      sets: 0
    };
  }

  /**
   * Get invalidation log
   * @returns {array} - Recent invalidation events
   */
  getInvalidationLog() {
    return this.invalidationLog;
  }

  /**
   * Clear invalidation log
   */
  clearInvalidationLog() {
    this.invalidationLog = [];
  }

  /**
   * Log invalidation event
   * @private
   */
  _logInvalidation(key, reason) {
    this.invalidationLog.push({
      key,
      reason,
      timestamp: new Date().toISOString()
    });

    // Keep log size manageable
    if (this.invalidationLog.length > this.maxLogSize) {
      this.invalidationLog.shift();
    }
  }

  /**
   * Get cache entry info (for debugging)
   * @param {string} key - Cache key
   * @returns {object|null} - Entry info or null
   */
  getEntryInfo(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    const remaining = entry.ttl - age;

    return {
      key,
      age,
      ttl: entry.ttl,
      remaining: Math.max(0, remaining),
      expired: remaining <= 0,
      dataSize: JSON.stringify(entry.data).length
    };
  }

  /**
   * Get all cache keys
   * @returns {array} - Array of cache keys
   */
  getAllKeys() {
    return Array.from(this.store.keys());
  }
}

// Export singleton instance
module.exports = new CacheLayer();
