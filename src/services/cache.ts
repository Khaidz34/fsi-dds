// Client-side caching utility
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // milliseconds
}

const cache = new Map<string, CacheEntry<any>>();

export const cacheService = {
  set: <T,>(key: string, data: T, ttlSeconds: number = 300) => {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  },

  get: <T,>(key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      cache.delete(key);
      return null;
    }

    return entry.data as T;
  },

  has: (key: string): boolean => {
    const entry = cache.get(key);
    if (!entry) return false;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      cache.delete(key);
      return false;
    }

    return true;
  },

  clear: (key?: string) => {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear();
    }
  },

  // Get cache stats for debugging
  getStats: () => {
    return {
      size: cache.size,
      entries: Array.from(cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        expired: Date.now() - entry.timestamp > entry.ttl
      }))
    };
  }
};

// Debounce utility for preventing duplicate requests
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
};

// Throttle utility for rate limiting
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};
