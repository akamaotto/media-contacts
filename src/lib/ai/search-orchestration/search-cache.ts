/**
 * Search Cache Service
 * Provides caching functionality for search orchestration to improve performance
 */

import { createHash } from 'crypto';
import { SearchConfiguration, SearchResult, AggregatedSearchResult, ExtractedContact } from './types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  metadata?: Record<string, any>;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  currentSize: number;
  maxSize: number;
  hitRate: number;
  averageAccessTime: number;
  memoryUsage: number;
}

interface CacheConfig {
  enabled: boolean;
  maxSize: number; // Maximum number of entries
  maxMemorySize: number; // Maximum memory usage in bytes
  defaultTTL: number; // Default TTL in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
  compressionEnabled: boolean;
  serializationFormat: 'json' | 'binary';
}

export class SearchCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;
  private memoryUsage = 0;

  constructor(config?: Partial<CacheConfig>) {
    this.config = this.mergeConfig(config);
    this.stats = this.initializeStats();

    if (this.config.enabled) {
      this.startCleanupTimer();
    }
  }

  /**
   * Generate cache key from search configuration
   */
  generateKey(configuration: SearchConfiguration): string {
    const keyData = {
      query: configuration.query.toLowerCase().trim(),
      criteria: {
        countries: configuration.criteria.countries?.sort() || [],
        categories: configuration.criteria.categories?.sort() || [],
        beats: configuration.criteria.beats?.sort() || [],
        languages: configuration.criteria.languages?.sort() || [],
        domains: configuration.criteria.domains?.sort() || [],
        excludeDomains: configuration.criteria.excludeDomains?.sort() || [],
        dateRange: configuration.criteria.dateRange,
        safeSearch: configuration.criteria.safeSearch
      },
      options: {
        maxResults: configuration.options.maxResults,
        maxContactsPerSource: configuration.options.maxContactsPerSource,
        confidenceThreshold: configuration.options.confidenceThreshold,
        enableAIEnhancement: configuration.options.enableAIEnhancement,
        enableContactExtraction: configuration.options.enableContactExtraction,
        enableContentScraping: configuration.options.enableContentScraping,
        strictValidation: configuration.options.strictValidation
      }
    };

    const keyString = JSON.stringify(keyData);
    return createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * Cache search results
   */
  async set(
    configuration: SearchConfiguration,
    results: AggregatedSearchResult,
    ttl?: number
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const key = this.generateKey(configuration);
      const entrySize = this.calculateSize(results);

      // Check if we need to evict entries
      await this.ensureCapacity(entrySize);

      const entry: CacheEntry<AggregatedSearchResult> = {
        data: results,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL,
        accessCount: 0,
        lastAccessed: Date.now(),
        size: entrySize,
        metadata: {
          searchId: results.searchId,
          totalResults: results.totalResults,
          uniqueContacts: results.uniqueContacts,
          processingTime: results.processingTime,
          cachedAt: new Date().toISOString()
        }
      };

      this.cache.set(key, entry);
      this.memoryUsage += entrySize;
      this.updateStats();

    } catch (error) {
      console.error('Failed to cache search results:', error);
    }
  }

  /**
   * Get cached search results
   */
  async get(configuration: SearchConfiguration): Promise<AggregatedSearchResult | null> {
    if (!this.config.enabled) {
      return null;
    }

    const startTime = Date.now();

    try {
      const key = this.generateKey(configuration);
      const entry = this.cache.get(key);

      if (!entry) {
        this.stats.misses++;
        this.updateStats();
        return null;
      }

      // Check if entry is expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.memoryUsage -= entry.size;
        this.stats.misses++;
        this.updateStats();
        return null;
      }

      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();

      this.stats.hits++;
      this.stats.averageAccessTime = (this.stats.averageAccessTime + (Date.now() - startTime)) / 2;
      this.updateStats();

      // Return a copy to prevent mutations
      return JSON.parse(JSON.stringify(entry.data));

    } catch (error) {
      console.error('Failed to get cached search results:', error);
      this.stats.misses++;
      this.updateStats();
      return null;
    }
  }

  /**
   * Cache individual search results
   */
  async setSearchResults(
    configuration: SearchConfiguration,
    results: SearchResult[],
    ttl?: number
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const key = this.generateKey(configuration) + ':results';
      const entrySize = this.calculateSize(results);

      await this.ensureCapacity(entrySize);

      const entry: CacheEntry<SearchResult[]> = {
        data: results,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL,
        accessCount: 0,
        lastAccessed: Date.now(),
        size: entrySize,
        metadata: {
          resultCount: results.length,
          cachedAt: new Date().toISOString()
        }
      };

      this.cache.set(key, entry);
      this.memoryUsage += entrySize;
      this.updateStats();

    } catch (error) {
      console.error('Failed to cache search results:', error);
    }
  }

  /**
   * Get cached individual search results
   */
  async getSearchResults(configuration: SearchConfiguration): Promise<SearchResult[] | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const key = this.generateKey(configuration) + ':results';
      const entry = this.cache.get(key);

      if (!entry || Date.now() - entry.timestamp > entry.ttl) {
        if (entry) {
          this.cache.delete(key);
          this.memoryUsage -= entry.size;
        }
        return null;
      }

      entry.accessCount++;
      entry.lastAccessed = Date.now();

      return JSON.parse(JSON.stringify(entry.data));

    } catch (error) {
      console.error('Failed to get cached search results:', error);
      return null;
    }
  }

  /**
   * Cache extracted contacts
   */
  async setContacts(
    url: string,
    contacts: ExtractedContact[],
    ttl?: number
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const key = `contacts:${createHash('sha256').update(url).digest('hex')}`;
      const entrySize = this.calculateSize(contacts);

      await this.ensureCapacity(entrySize);

      const entry: CacheEntry<ExtractedContact[]> = {
        data: contacts,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL * 2, // Contacts cached longer
        accessCount: 0,
        lastAccessed: Date.now(),
        size: entrySize,
        metadata: {
          url,
          contactCount: contacts.length,
          cachedAt: new Date().toISOString()
        }
      };

      this.cache.set(key, entry);
      this.memoryUsage += entrySize;
      this.updateStats();

    } catch (error) {
      console.error('Failed to cache contacts:', error);
    }
  }

  /**
   * Get cached extracted contacts
   */
  async getContacts(url: string): Promise<ExtractedContact[] | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const key = `contacts:${createHash('sha256').update(url).digest('hex')}`;
      const entry = this.cache.get(key);

      if (!entry || Date.now() - entry.timestamp > entry.ttl) {
        if (entry) {
          this.cache.delete(key);
          this.memoryUsage -= entry.size;
        }
        return null;
      }

      entry.accessCount++;
      entry.lastAccessed = Date.now();

      return JSON.parse(JSON.stringify(entry.data));

    } catch (error) {
      console.error('Failed to get cached contacts:', error);
      return null;
    }
  }

  /**
   * Check if cache has entry for configuration
   */
  async has(configuration: SearchConfiguration): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const key = this.generateKey(configuration);
      const entry = this.cache.get(key);

      return entry !== undefined && Date.now() - entry.timestamp <= entry.ttl;

    } catch (error) {
      console.error('Failed to check cache:', error);
      return false;
    }
  }

  /**
   * Delete cache entry
   */
  async delete(configuration: SearchConfiguration): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const key = this.generateKey(configuration);
      const entry = this.cache.get(key);

      if (entry) {
        this.cache.delete(key);
        this.memoryUsage -= entry.size;
        this.updateStats();
        return true;
      }

      return false;

    } catch (error) {
      console.error('Failed to delete cache entry:', error);
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.memoryUsage = 0;
    this.stats = this.initializeStats();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache entries (for debugging)
   */
  getEntries(): Array<{ key: string; entry: CacheEntry<any> }> {
    const entries: Array<{ key: string; entry: CacheEntry<any> }> = [];

    for (const [key, entry] of this.cache) {
      entries.push({
        key: key.substring(0, 16) + '...', // Truncate key for readability
        entry: {
          ...entry,
          data: Array.isArray(entry.data) ? `[Array: ${entry.data.length}]` : '[Object]'
        }
      });
    }

    return entries;
  }

  /**
   * Ensure cache has capacity for new entry
   */
  private async ensureCapacity(requiredSize: number): Promise<void> {
    // Check size limits
    while (
      (this.cache.size >= this.config.maxSize) ||
      (this.memoryUsage + requiredSize > this.config.maxMemorySize)
    ) {
      await this.evictLeastRecentlyUsed();
    }
  }

  /**
   * Evict least recently used entries
   */
  private async evictLeastRecentlyUsed(): Promise<void> {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.cache.delete(oldestKey);
      this.memoryUsage -= entry.size;
      this.stats.evictions++;
    }
  }

  /**
   * Cleanup expired entries
   */
  private async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const entry = this.cache.get(key)!;
      this.cache.delete(key);
      this.memoryUsage -= entry.size;
      this.stats.evictions++;
    }

    this.updateStats();
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Calculate approximate size of data
   */
  private calculateSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return Buffer.byteLength(jsonString, 'utf8');
    } catch (error) {
      console.error('Failed to calculate data size:', error);
      return 1024; // Default to 1KB
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.currentSize = this.cache.size;
    this.stats.maxSize = this.config.maxSize;
    this.stats.memoryUsage = this.memoryUsage;
    this.stats.hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
      : 0;
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      evictions: 0,
      currentSize: 0,
      maxSize: this.config.maxSize,
      hitRate: 0,
      averageAccessTime: 0,
      memoryUsage: 0
    };
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config?: Partial<CacheConfig>): CacheConfig {
    const defaultConfig: CacheConfig = {
      enabled: true,
      maxSize: 1000,
      maxMemorySize: 100 * 1024 * 1024, // 100MB
      defaultTTL: 3600000, // 1 hour
      cleanupInterval: 300000, // 5 minutes
      compressionEnabled: false,
      serializationFormat: 'json'
    };

    if (!config) return defaultConfig;

    return {
      ...defaultConfig,
      ...config
    };
  }

  /**
   * Graceful shutdown
   */
  async destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    await this.clear();
  }
}

// Export singleton instance
export const searchCache = new SearchCache();