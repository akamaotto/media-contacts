/**
 * Advanced Caching Service for Performance Optimization
 * Implements multiple caching strategies for different use cases
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

// Dynamic TTL based on data volatility
const getDynamicTTL = (dataType: string): number => {
  const ttlMap: Record<string, number> = {
    search: 600,    // 10 minutes for search results
    stats: 1800,    // 30 minutes for statistics
    available: 300, // 5 minutes for availability data
    metrics: 300,   // 5 minutes for metrics
    charts: 600,    // 10 minutes for charts
    activity: 120,  // 2 minutes for activity feeds
    geographic: 900, // 15 minutes for geographic data
    historical: 3600, // 1 hour for historical data
    default: 900    // 15 minutes for other data
  };
  
  return ttlMap[dataType] || ttlMap.default;
};

export class CacheService {
  private static instance: CacheService;
  private cache = new Map<string, CacheItem<any>>();
  private readonly DEFAULT_TTL = 900; // 15 minutes default
  private readonly MAX_CACHE_SIZE = 1000;
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    // Update access stats
    item.accessCount++;
    item.lastAccessed = Date.now();

    return item.data;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Enforce cache size limit
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL,
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.cache.set(key, item);
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache items with matching prefix
   */
  clearByPrefix(prefix: string): number {
    let cleared = 0;
    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    return cleared;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let totalSize = 0;
    let expiredCount = 0;
    let totalAccess = 0;

    for (const [, item] of this.cache) {
      totalSize++;
      totalAccess += item.accessCount;
      
      if (now - item.timestamp > item.ttl * 1000) {
        expiredCount++;
      }
    }

    return {
      totalItems: totalSize,
      expiredItems: expiredCount,
      totalAccess,
      hitRate: this.cache.size > 0 ? totalAccess / this.cache.size : 0,
      memoryUsage: process.memoryUsage().heapUsed
    };
  }

  /**
   * Memoization decorator for expensive operations
   */
  memoize<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    ttl?: number
  ): T {
    return (async (...args: Parameters<T>) => {
      const key = keyGenerator 
        ? keyGenerator(...args)
        : `memoized_${fn.name}_${JSON.stringify(args)}`;

      const cached = this.get(key);
      if (cached !== null) {
        return cached;
      }

      const result = await fn(...args);
      this.set(key, result, ttl);
      return result;
    }) as T;
  }

  /**
   * Cache-aside pattern with fallback
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    let cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Write-through pattern
   */
  async writeThrough<T>(
    key: string,
    data: T,
    writer: (data: T) => Promise<void>,
    ttl?: number
  ): Promise<void> {
    await writer(data);
    this.set(key, data, ttl);
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl * 1000) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cache cleanup: removed ${cleaned} expired items`);
    }
  }

  /**
   * Evict least recently used items when cache is full
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Cleanup on shutdown
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();

/**
 * Cache key generators for common patterns
 */
export const CacheKeys = {
  filters: {
    countries: (query: string, limit: number) => `filters:countries:${query || 'popular'}:${limit}`,
    beats: (query: string, limit: number) => `filters:beats:${query || 'popular'}:${limit}`,
    outlets: (query: string, limit: number) => `filters:outlets:${query || 'popular'}:${limit}`,
    regions: (query: string, limit: number) => `filters:regions:${query || 'popular'}:${limit}`,
    languages: (query: string, limit: number) => `filters:languages:${query || 'popular'}:${limit}`,
  },
  beats: {
    all: (filters?: any, page?: number, pageSize?: number) => 
      `beats_all_${JSON.stringify(filters || {})}_${page || 1}_${pageSize || 10}`,
    byId: (id: string) => `beats_by_id_${id}`,
    search: (query: string, limit?: number) => `beats_search_${query}_${limit || 10}`,
    stats: () => 'beats_stats',
    count: (filters?: any) => `beats_count_${JSON.stringify(filters || {})}`

  },
  categories: {
    all: (filters?: any, page?: number, pageSize?: number) => 
      `categories_all_${JSON.stringify(filters || {})}_${page || 1}_${pageSize || 10}`,
    byId: (id: string) => `categories_by_id_${id}`,
    search: (query: string, limit?: number) => `categories_search_${query}_${limit || 10}`,
    stats: () => 'categories_stats',
    count: (filters?: any) => `categories_count_${JSON.stringify(filters || {})}`

  },
  countries: {
    all: (filters?: any, page?: number, pageSize?: number) => 
      `countries_all_${JSON.stringify(filters || {})}_${page || 1}_${pageSize || 10}`,
    byId: (id: string) => `countries_by_id_${id}`,
    search: (query: string, limit?: number) => `countries_search_${query}_${limit || 10}`,
    stats: () => 'countries_stats',
    count: (filters?: any) => `countries_count_${JSON.stringify(filters || {})}`

  },
  publishers: {
    all: (filters?: any, page?: number, pageSize?: number) => 
      `publishers_all_${JSON.stringify(filters || {})}_${page || 1}_${pageSize || 10}`,
    byId: (id: string) => `publishers_by_id_${id}`,
    search: (query: string, limit?: number) => `publishers_search_${query}_${limit || 10}`,
    stats: () => 'publishers_stats',
    available: () => 'publishers_available',
    count: (filters?: any) => `publishers_count_${JSON.stringify(filters || {})}`

  },
  outlets: {
    all: (filters?: any, page?: number, pageSize?: number) => 
      `outlets_all_${JSON.stringify(filters || {})}_${page || 1}_${pageSize || 10}`,
    byId: (id: string) => `outlets_by_id_${id}`,
    search: (query: string, limit?: number) => `outlets_search_${query}_${limit || 10}`,
    stats: () => 'outlets_stats',
    byPublisher: (publisherId: string) => `outlets_by_publisher_${publisherId}`,
    available: () => 'outlets_available',
    count: (filters?: any) => `outlets_count_${JSON.stringify(filters || {})}`

  },
  languages: {
    all: (filters?: any, page?: number, pageSize?: number) => 
      `languages_all_${JSON.stringify(filters || {})}_${page || 1}_${pageSize || 10}`,
    byId: (id: string) => `languages_by_id_${id}`,
    search: (query: string, limit?: number) => `languages_search_${query}_${limit || 10}`,
    stats: () => 'languages_stats',
    count: (filters?: any) => `languages_count_${JSON.stringify(filters || {})}`

  },
  regions: {
    all: (filters?: any, page?: number, pageSize?: number) => 
      `regions_all_${JSON.stringify(filters || {})}_${page || 1}_${pageSize || 10}`,
    byId: (id: string) => `regions_by_id_${id}`,
    search: (query: string, limit?: number) => `regions_search_${query}_${limit || 10}`,
    stats: () => 'regions_stats',
    count: (filters?: any) => `regions_count_${JSON.stringify(filters || {})}`

  },
  mediaContacts: {
    all: (filters?: any, page?: number, pageSize?: number) => {
      // Create a normalized version of filters with sorted arrays
      const normalizedFilters: any = {};
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (Array.isArray(value)) {
            // Sort arrays to ensure consistent cache keys
            normalizedFilters[key] = [...value].sort();
          } else {
            normalizedFilters[key] = value;
          }
        }
      }
      return `media_contacts_all_${JSON.stringify(normalizedFilters || {})}_${page || 1}_${pageSize || 10}`;
    },
    byId: (id: string) => `media_contacts_by_id_${id}`,
    search: (query: string, limit?: number) => `media_contacts_search_${query}_${limit || 10}`,
    stats: () => 'media_contacts_stats',
    count: (filters?: any) => {
      // Create a normalized version of filters with sorted arrays
      const normalizedFilters: any = {};
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          if (Array.isArray(value)) {
            // Sort arrays to ensure consistent cache keys
            normalizedFilters[key] = [...value].sort();
          } else {
            normalizedFilters[key] = value;
          }
        }
      }
      return `media_contacts_count_${JSON.stringify(normalizedFilters || {})}`;
    }
  }
};

// Export dynamic TTL function
export { getDynamicTTL };