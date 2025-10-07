/**
 * Simple in-memory cache service with TTL support
 */

class CacheService {
  private cache: Map<string, { data: any; expiry: number }> = new Map();

  /**
   * Get cached data if exists and not expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      // Expired, remove from cache
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Set data in cache with TTL in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data, expiry });
  }

  /**
   * Delete specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries by prefix
   */
  clearByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Cache key generators
export const CacheKeys = {
  filters: {
    countries: (query: string, limit: number) => `filters:v2:countries:${query || 'popular'}:${limit}`,
    beats: (query: string, limit: number) => `filters:v2:beats:${query || 'popular'}:${limit}`,
    outlets: (query: string, limit: number) => `filters:v2:outlets:${query || 'popular'}:${limit}`,
    regions: (query: string, limit: number) => `filters:regions:${query || 'popular'}:${limit}`,
    languages: (query: string, limit: number) => `filters:languages:${query || 'popular'}:${limit}`,
  },
  mediaContacts: {
    all: (filters: any, page: number, pageSize: number) => 
      `media_contacts:all:${JSON.stringify(filters)}:${page}:${pageSize}`,
    search: (query: string, limit: number) => 
      `media_contacts:search:${query}:${limit}`,
  },
  countries: {
    all: (filters: any, page: number, pageSize: number) => 
      `countries:all:${JSON.stringify(filters)}:${page}:${pageSize}`,
    search: (query: string, limit: number) => 
      `countries:search:${query}:${limit}`,
    stats: () => `countries:stats`,
  },
};
