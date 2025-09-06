/**
 * Client-Side Cache and Fallback System
 * Provides caching and fallback mechanisms for API data
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  source: 'api' | 'cache' | 'fallback';
  version: string;
}

export interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  maxAge: number; // Maximum age before data is considered stale
  fallbackData?: any;
  version?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}

/**
 * ClientCache class for managing client-side data caching
 */
export class ClientCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = { hits: 0, misses: 0 };
  private maxSize: number;
  private defaultTTL: number;
  private defaultMaxAge: number;

  constructor(options: {
    maxSize?: number;
    defaultTTL?: number;
    defaultMaxAge?: number;
  } = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.defaultMaxAge = options.defaultMaxAge || 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, options: Partial<CacheOptions> = {}): void {
    const now = new Date();
    const ttl = options.ttl || this.defaultTTL;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: new Date(now.getTime() + ttl),
      source: 'api',
      version: options.version || '1.0'
    };

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, entry);
    console.log(`📦 [CLIENT-CACHE] Cached data for key: ${key} (expires: ${entry.expiresAt.toISOString()})`);
  }

  /**
   * Get data from cache
   */
  get<T>(key: string, options: Partial<CacheOptions> = {}): {
    data: T | null;
    isExpired: boolean;
    isStale: boolean;
    source: 'api' | 'cache' | 'fallback';
    age: number;
  } {
    const entry = this.cache.get(key);
    const now = new Date();

    if (!entry) {
      this.stats.misses++;
      
      // Return fallback data if available
      if (options.fallbackData) {
        console.log(`🔄 [CLIENT-CACHE] Cache miss for ${key}, using fallback data`);
        return {
          data: options.fallbackData,
          isExpired: false,
          isStale: true,
          source: 'fallback',
          age: 0
        };
      }

      console.log(`❌ [CLIENT-CACHE] Cache miss for key: ${key}`);
      return {
        data: null,
        isExpired: true,
        isStale: true,
        source: 'cache',
        age: 0
      };
    }

    this.stats.hits++;
    const age = now.getTime() - entry.timestamp.getTime();
    const isExpired = now > entry.expiresAt;
    const maxAge = options.maxAge || this.defaultMaxAge;
    const isStale = age > maxAge;

    if (isExpired) {
      console.log(`⏰ [CLIENT-CACHE] Cache expired for key: ${key} (age: ${age}ms)`);
      this.cache.delete(key);
      
      // Return fallback data if available
      if (options.fallbackData) {
        return {
          data: options.fallbackData,
          isExpired: true,
          isStale: true,
          source: 'fallback',
          age
        };
      }
      
      return {
        data: null,
        isExpired: true,
        isStale: true,
        source: 'cache',
        age
      };
    }

    console.log(`✅ [CLIENT-CACHE] Cache hit for key: ${key} (age: ${age}ms, stale: ${isStale})`);
    
    return {
      data: entry.data,
      isExpired: false,
      isStale,
      source: entry.source,
      age
    };
  }

  /**
   * Check if data exists in cache (without affecting stats)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    const now = new Date();
    const isExpired = now > entry.expiresAt;
    
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove data from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ [CLIENT-CACHE] Removed key: ${key}`);
    }
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    console.log(`🧹 [CLIENT-CACHE] Cache cleared`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.timestamp);
    
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
        : 0,
      oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : undefined,
      newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : undefined
    };
  }

  /**
   * Evict oldest entries to make room
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp.getTime() < oldestTime) {
        oldestTime = entry.timestamp.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ [CLIENT-CACHE] Evicted oldest entry: ${oldestKey}`);
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = new Date();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 [CLIENT-CACHE] Cleaned up ${cleaned} expired entries`);
    }

    return cleaned;
  }

  /**
   * Start periodic cleanup
   */
  startPeriodicCleanup(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
    console.log(`🔄 [CLIENT-CACHE] Starting periodic cleanup every ${intervalMs}ms`);
    
    return setInterval(() => {
      this.cleanup();
    }, intervalMs);
  }
}

/**
 * Default cache instance
 */
export const defaultCache = new ClientCache({
  maxSize: 50,
  defaultTTL: 5 * 60 * 1000,    // 5 minutes
  defaultMaxAge: 30 * 60 * 1000  // 30 minutes
});

/**
 * Cache-aware fetch function with fallback support
 */
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    cache?: ClientCache;
    cacheOptions?: Partial<CacheOptions>;
    fallbackData?: T;
    useStaleWhileRevalidate?: boolean;
  } = {}
): Promise<{
  data: T;
  fromCache: boolean;
  isStale: boolean;
  source: 'api' | 'cache' | 'fallback';
}> {
  // Helper: detect media-contacts keys
  const isMediaContactsKey = (k: string) => k.startsWith('/api/media-contacts');
  // Helper: runtime flag to bypass cache for media contacts for debugging
  const isBypassEnabled = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const qsBypass = window.location.search.includes('nocache=contacts');
      const lsBypass = window.localStorage.getItem('BYPASS_CONTACTS_CACHE') === '1';
      return qsBypass || lsBypass;
    } catch {
      return false;
    }
  };
  // Helper: validate that returned data includes id fields where expected
  const validateIds = (data: any) => {
    let total = 0;
    let missing = 0;
    if (Array.isArray(data)) {
      total = data.length;
      missing = data.reduce((acc, item) => acc + ((item && typeof item.id === 'string' && item.id.length > 0) ? 0 : 1), 0);
    } else if (data && typeof data === 'object') {
      total = 1;
      missing = (typeof (data as any).id === 'string' && (data as any).id.length > 0) ? 0 : 1;
    }
    return { total, missing };
  };
  const maybeLogIdDiagnostics = (stage: string, k: string, payload: any) => {
    if (!isMediaContactsKey(k)) return;
    const { total, missing } = validateIds(payload);
    if (total > 0) {
      if (missing > 0) {
        console.warn(`🧪 [CLIENT-CACHE][${stage}] Detected records missing id for key: ${k} — missing ${missing}/${total}`);
      } else {
        console.log(`🧪 [CLIENT-CACHE][${stage}] All records include id for key: ${k} — total ${total}`);
      }
    }
  };

  const cache = options.cache || defaultCache;
  const cacheOptions = options.cacheOptions || {};
  
  // Optional bypass for media contacts cache to isolate caching issues
  if (isMediaContactsKey(key) && isBypassEnabled()) {
    console.warn(`🚫 [CLIENT-CACHE] Bypassing cache for key: ${key} (debug bypass enabled)`);
    const fresh = await fetchFn();
    maybeLogIdDiagnostics('bypass_return', key, fresh);
    return {
      data: fresh,
      fromCache: false,
      isStale: false,
      source: 'api'
    };
  }
  
  // Try to get from cache first
  const cached = cache.get<T>(key, { 
    ...cacheOptions, 
    fallbackData: options.fallbackData 
  });

  // If we have fresh data, return it
  if (cached.data && !cached.isExpired && !cached.isStale) {
    maybeLogIdDiagnostics('cache_hit', key, cached.data);
    return {
      data: cached.data,
      fromCache: true,
      isStale: false,
      source: cached.source
    };
  }

  // If using stale-while-revalidate and we have stale data, return it and fetch in background
  if (options.useStaleWhileRevalidate && cached.data && !cached.isExpired) {
    // Return stale data immediately
    const staleResult = {
      data: cached.data,
      fromCache: true,
      isStale: true,
      source: cached.source as 'api' | 'cache' | 'fallback'
    };
    maybeLogIdDiagnostics('stale_return', key, cached.data);

    // Fetch fresh data in background
    fetchFn()
      .then(freshData => {
        // Only cache if data appears valid (contains id fields for media contacts)
        if (isMediaContactsKey(key)) {
          const { missing } = validateIds(freshData);
          if (missing > 0) {
            console.warn(`⚠️ [CLIENT-CACHE] Skipping cache write: missing id fields for key: ${key}`);
          } else {
            cache.set(key, freshData, cacheOptions);
          }
          maybeLogIdDiagnostics('bg_refresh', key, freshData);
        } else {
          cache.set(key, freshData, cacheOptions);
        }
        console.log(`🔄 [CLIENT-CACHE] Background refresh completed for key: ${key}`);
      })
      .catch(error => {
        console.warn(`⚠️ [CLIENT-CACHE] Background refresh failed for key: ${key}`, error);
      });

    return staleResult;
  }

  // No cache hit or expired, fetch fresh data
  try {
    console.log(`🌐 [CLIENT-CACHE] Fetching fresh data for key: ${key}`);
    const freshData = await fetchFn();
    maybeLogIdDiagnostics('fresh_fetch', key, freshData);
    
    // Cache the fresh data (skip if invalid for media contacts)
    if (isMediaContactsKey(key)) {
      const { missing } = validateIds(freshData);
      if (missing > 0) {
        console.warn(`⚠️ [CLIENT-CACHE] Skipping cache write: missing id fields for key: ${key}`);
      } else {
        cache.set(key, freshData, cacheOptions);
      }
    } else {
      cache.set(key, freshData, cacheOptions);
    }
    
    return {
      data: freshData,
      fromCache: false,
      isStale: false,
      source: 'api'
    };
  } catch (error) {
    console.error(`❌ [CLIENT-CACHE] Fetch failed for key: ${key}`, error);
    
    // If we have stale cached data, return it as fallback
    if (cached.data) {
      console.log(`🔄 [CLIENT-CACHE] Using stale cached data as fallback for key: ${key}`);
      return {
        data: cached.data,
        fromCache: true,
        isStale: true,
        source: cached.source
      };
    }
    
    // If we have fallback data, return it
    if (options.fallbackData) {
      console.log(`🔄 [CLIENT-CACHE] Using fallback data for key: ${key}`);
      return {
        data: options.fallbackData,
        fromCache: false,
        isStale: true,
        source: 'fallback'
      };
    }
    
    // No fallback available, re-throw the error
    throw error;
  }
}

/**
 * Utility to create a cache key from URL and parameters
 */
export function createCacheKey(url: string, params?: Record<string, any>): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${JSON.stringify(params[key])}`)
    .join('&');
    
  return `${url}?${sortedParams}`;
}

/**
 * Progressive enhancement utility
 */
export function withProgressiveEnhancement<T>(
  primaryFn: () => Promise<T>,
  fallbackFn: () => T,
  options: {
    timeout?: number;
    retries?: number;
  } = {}
): Promise<{ data: T; enhanced: boolean }> {
  const timeout = options.timeout || 5000;
  const retries = options.retries || 1;
  
  return new Promise(async (resolve) => {
    let attempts = 0;
    
    const attemptPrimary = async (): Promise<void> => {
      attempts++;
      
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), timeout);
        });
        
        const result = await Promise.race([primaryFn(), timeoutPromise]);
        resolve({ data: result, enhanced: true });
      } catch (error) {
        console.warn(`⚠️ [PROGRESSIVE-ENHANCEMENT] Primary function failed (attempt ${attempts}):`, error);
        
        if (attempts < retries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
          setTimeout(attemptPrimary, delay);
        } else {
          // Use fallback
          console.log(`🔄 [PROGRESSIVE-ENHANCEMENT] Using fallback after ${attempts} attempts`);
          const fallbackData = fallbackFn();
          resolve({ data: fallbackData, enhanced: false });
        }
      }
    };
    
    attemptPrimary();
  });
}