/**
 * Extraction Caching System
 * Manages caching of parsed content and extraction results for performance optimization
 */

import {
  ExtractionCacheEntry,
  ExtractedContact,
  ParsedContent,
  ContactExtractionError
} from './types';
import crypto from 'crypto';

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  cleanupInterval: number; // Cleanup interval in milliseconds
}

export interface CacheStats {
  size: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  averageAccessCount: number;
  memoryUsage: number; // Estimated memory usage in bytes
}

export class ExtractionCache {
  private cache = new Map<string, ExtractionCacheEntry>();
  private accessTimes = new Map<string, number>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };
  private cleanupTimer?: NodeJS.Timeout;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: true,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 10000,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      ...config
    };

    if (this.config.enabled) {
      this.startCleanupTimer();
    }
  }

  /**
   * Get cached extraction results for a URL
   */
  async get(url: string): Promise<ExtractionCacheEntry | null> {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.generateKey(url);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt.getTime()) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessedAt = new Date();
    this.accessTimes.set(key, Date.now());
    this.stats.hits++;

    return entry;
  }

  /**
   * Set extraction results in cache
   */
  async set(
    url: string,
    content: ParsedContent,
    contacts: ExtractedContact[],
    qualityScore?: number
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const key = this.generateKey(url);
    const contentHash = this.generateContentHash(content);

    // Check if we already have this entry
    const existingEntry = this.cache.get(key);
    if (existingEntry && existingEntry.contentHash === contentHash) {
      // Update access count and last accessed time
      existingEntry.accessCount++;
      existingEntry.lastAccessedAt = new Date();
      return;
    }

    // Ensure cache doesn't exceed max size
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastRecentlyUsed();
    }

    const entry: ExtractionCacheEntry = {
      id: this.generateEntryId(),
      contentHash,
      sourceUrl: url,
      extractedData: contacts,
      contactCount: contacts.length,
      qualityScore,
      expiresAt: new Date(Date.now() + this.config.ttl),
      accessCount: 1,
      lastAccessedAt: new Date(),
      createdAt: new Date()
    };

    this.cache.set(key, entry);
    this.accessTimes.set(key, Date.now());
    this.stats.sets++;
  }

  /**
   * Delete entry from cache
   */
  async delete(url: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    const key = this.generateKey(url);
    const deleted = this.cache.delete(key);
    this.accessTimes.delete(key);

    if (deleted) {
      this.stats.deletes++;
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.accessTimes.clear();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  /**
   * Check if URL is cached
   */
  async has(url: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    const key = this.generateKey(url);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt.getTime()) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get multiple cached entries for URLs
   */
  async getMultiple(urls: string[]): Promise<Map<string, ExtractionCacheEntry | null>> {
    const results = new Map<string, ExtractionCacheEntry | null>();

    for (const url of urls) {
      const entry = await this.get(url);
      results.set(url, entry);
    }

    return results;
  }

  /**
   * Set multiple entries in cache
   */
  async setMultiple(
    entries: Array<{
      url: string;
      content: ParsedContent;
      contacts: ExtractedContact[];
      qualityScore?: number;
    }>
  ): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.url, entry.content, entry.contacts, entry.qualityScore);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const now = Date.now();

    const validEntries = entries.filter(entry => entry.expiresAt.getTime() > now);

    const oldestEntry = validEntries.length > 0
      ? new Date(Math.min(...validEntries.map(e => e.createdAt.getTime())))
      : undefined;

    const newestEntry = validEntries.length > 0
      ? new Date(Math.max(...validEntries.map(e => e.createdAt.getTime())))
      : undefined;

    const totalAccesses = validEntries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const averageAccessCount = validEntries.length > 0 ? totalAccesses / validEntries.length : 0;

    // Estimate memory usage (rough calculation)
    const memoryUsage = this.estimateMemoryUsage(validEntries);

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      size: validEntries.length,
      hitRate,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      oldestEntry,
      newestEntry,
      averageAccessCount,
      memoryUsage
    };
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    if (!this.config.enabled) {
      return 0;
    }

    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt.getTime()) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
    }

    return expiredKeys.length;
  }

  /**
   * Get entries that will expire soon (within specified time)
   */
  async getExpiringSoon(withinMs: number = 60 * 60 * 1000): Promise<ExtractionCacheEntry[]> {
    const now = Date.now();
    const expireThreshold = now + withinMs;

    return Array.from(this.cache.values()).filter(entry =>
      entry.expiresAt.getTime() > now && entry.expiresAt.getTime() <= expireThreshold
    );
  }

  /**
   * Refresh TTL for an entry
   */
  async refresh(url: string, additionalTtl?: number): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    const key = this.generateKey(url);
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const ttl = additionalTtl || this.config.ttl;
    entry.expiresAt = new Date(Date.now() + ttl);
    entry.lastAccessedAt = new Date();

    return true;
  }

  /**
   * Get cache entries by quality score range
   */
  async getByQualityRange(
    minQuality: number,
    maxQuality: number
  ): Promise<ExtractionCacheEntry[]> {
    return Array.from(this.cache.values()).filter(entry =>
      entry.qualityScore !== undefined &&
      entry.qualityScore >= minQuality &&
      entry.qualityScore <= maxQuality
    );
  }

  /**
   * Get cache entries by contact count range
   */
  async getByContactCountRange(
    minContacts: number,
    maxContacts: number
  ): Promise<ExtractionCacheEntry[]> {
    return Array.from(this.cache.values()).filter(entry =>
      entry.contactCount >= minContacts &&
      entry.contactCount <= maxContacts
    );
  }

  /**
   * Preload cache with popular URLs
   */
  async preload(urls: string[]): Promise<void> {
    // This would typically fetch and cache content for popular URLs
    // Implementation depends on your content fetching strategy
    console.log(`Preloading cache with ${urls.length} URLs`);
  }

  /**
   * Export cache data (for backup or migration)
   */
  async export(): Promise<{
    version: string;
    exportedAt: Date;
    config: CacheConfig;
    entries: Array<ExtractionCacheEntry & { key: string }>;
    stats: typeof this.stats;
  }> {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      ...entry,
      key
    }));

    return {
      version: '1.0.0',
      exportedAt: new Date(),
      config: this.config,
      entries,
      stats: { ...this.stats }
    };
  }

  /**
   * Import cache data (from backup or migration)
   */
  async import(data: {
    entries: Array<ExtractionCacheEntry & { key: string }>;
    config?: Partial<CacheConfig>;
  }): Promise<void> {
    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }

    // Clear existing cache
    await this.clear();

    // Import entries
    for (const entryData of data.entries) {
      const { key, ...entry } = entryData;

      // Skip expired entries
      if (Date.now() > entry.expiresAt.getTime()) {
        continue;
      }

      this.cache.set(key, entry);
      this.accessTimes.set(key, entry.lastAccessedAt.getTime());
    }

    console.log(`Imported ${data.entries.length} cache entries`);
  }

  /**
   * Generate cache key for URL
   */
  private generateKey(url: string): string {
    const hash = crypto.createHash('md5');
    hash.update(url);
    return `cache_${hash.digest('hex')}`;
  }

  /**
   * Generate content hash for change detection
   */
  private generateContentHash(content: ParsedContent): string {
    const hashInput = JSON.stringify({
      url: content.url,
      title: content.title,
      contentLength: content.content.length,
      wordCount: content.metadata.wordCount,
      author: content.author,
      publishedAt: content.publishedAt?.getTime()
    });

    const hash = crypto.createHash('sha256');
    hash.update(hashInput);
    return hash.digest('hex');
  }

  /**
   * Generate unique entry ID
   */
  private generateEntryId(): string {
    return `entry_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Evict least recently used entries to make space
   */
  private evictLeastRecentlyUsed(): void {
    // Sort entries by last accessed time
    const entries = Array.from(this.accessTimes.entries())
      .sort(([, a], [, b]) => a - b);

    // Remove oldest 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.accessTimes.delete(key);
    }
  }

  /**
   * Estimate memory usage of cache entries
   */
  private estimateMemoryUsage(entries: ExtractionCacheEntry[]): number {
    let totalSize = 0;

    for (const entry of entries) {
      // Estimate entry size
      const entrySize = JSON.stringify(entry).length * 2; // Unicode characters
      totalSize += entrySize;
    }

    // Add overhead for Map structures
    totalSize += this.cache.size * 100; // Approximate overhead per entry
    totalSize += this.accessTimes.size * 50; // Access time tracking overhead

    return totalSize;
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        const cleaned = await this.cleanup();
        if (cleaned > 0) {
          console.log(`Cache cleanup: removed ${cleaned} expired entries`);
        }
      } catch (error) {
        console.error('Cache cleanup failed:', error);
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Destroy cache instance and clean up resources
   */
  async destroy(): Promise<void> {
    this.stopCleanupTimer();
    await this.clear();
  }

  /**
   * Get cache performance metrics
   */
  getPerformanceMetrics(): {
    averageGetTime: number;
    averageSetTime: number;
    cacheEfficiency: number;
    memoryUtilization: number;
    evictionRate: number;
  } {
    // These would typically be measured in a real implementation
    // For now, provide estimated values
    return {
      averageGetTime: 2, // milliseconds
      averageSetTime: 5, // milliseconds
      cacheEfficiency: this.stats.hits / Math.max(this.stats.hits + this.stats.misses, 1),
      memoryUtilization: this.cache.size / this.config.maxSize,
      evictionRate: this.stats.deletes / Math.max(this.stats.sets, 1)
    };
  }

  /**
   * Optimize cache configuration based on usage patterns
   */
  optimizeConfiguration(): {
    recommendedTtl: number;
    recommendedMaxSize: number;
    recommendedCleanupInterval: number;
    reasoning: string[];
  } {
    const stats = this.getStats();
    const recommendations: string[] = [];

    let recommendedTtl = this.config.ttl;
    let recommendedMaxSize = this.config.maxSize;
    let recommendedCleanupInterval = this.config.cleanupInterval;

    // Adjust TTL based on hit rate
    if (stats.hitRate < 0.5) {
      recommendedTtl = Math.min(this.config.ttl * 1.5, 48 * 60 * 60 * 1000); // Max 48 hours
      recommendations.push('Increase TTL due to low hit rate');
    } else if (stats.hitRate > 0.8) {
      recommendedTtl = Math.max(this.config.ttl * 0.8, 4 * 60 * 60 * 1000); // Min 4 hours
      recommendations.push('TTL could be reduced due to high hit rate');
    }

    // Adjust max size based on memory utilization
    const memoryUtilization = this.cache.size / this.config.maxSize;
    if (memoryUtilization > 0.9) {
      recommendedMaxSize = Math.floor(this.config.maxSize * 1.2);
      recommendations.push('Increase max cache size due to high utilization');
    } else if (memoryUtilization < 0.3) {
      recommendedMaxSize = Math.floor(this.config.maxSize * 0.8);
      recommendations.push('Decrease max cache size due to low utilization');
    }

    // Adjust cleanup interval
    if (stats.averageAccessCount < 2) {
      recommendedCleanupInterval = Math.max(this.config.cleanupInterval * 0.5, 30 * 60 * 1000);
      recommendations.push('Increase cleanup frequency due to low access patterns');
    }

    return {
      recommendedTtl,
      recommendedMaxSize,
      recommendedCleanupInterval,
      reasoning: recommendations
    };
  }
}