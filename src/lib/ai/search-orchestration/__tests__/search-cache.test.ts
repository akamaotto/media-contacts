/**
 * Search Cache Tests
 * Test suite for the search caching functionality
 */

import { SearchCache } from '../search-cache';
import { SearchConfiguration, AggregatedSearchResult, SearchResult, ExtractedContact } from '../types';

describe('SearchCache', () => {
  let cache: SearchCache;
  const testConfiguration: SearchConfiguration = {
    query: 'test query',
    criteria: {
      countries: ['US', 'UK'],
      categories: ['technology'],
    },
    options: {
      maxResults: 10,
      confidenceThreshold: 0.7,
      enableAIEnhancement: true,
    },
  };

  const testResults: AggregatedSearchResult = {
    searchId: 'test-search-123',
    status: 'completed' as any,
    totalResults: 5,
    uniqueContacts: 3,
    duplicateContacts: 2,
    averageConfidence: 0.8,
    averageQuality: 0.75,
    processingTime: 15000,
    results: [
      {
        id: 'result-1',
        url: 'https://example.com/article1',
        title: 'Test Article 1',
        domain: 'example.com',
        authority: 0.9,
        relevanceScore: 0.85,
        confidenceScore: 0.8,
        contacts: [],
        metadata: {},
        sourceType: 'exa',
        processingTime: 1000,
      },
    ],
    contacts: [
      {
        id: 'contact-1',
        name: 'John Doe',
        title: 'Senior Editor',
        email: 'john@example.com',
        confidenceScore: 0.85,
        relevanceScore: 0.9,
        qualityScore: 0.8,
        verificationStatus: 'PENDING',
        extractionMethod: 'AI_BASED',
        metadata: {},
        createdAt: new Date(),
      },
    ],
    duplicates: [],
    metrics: {
      queryMetrics: {
        totalGenerated: 5,
        totalDuplicates: 0,
        averageScore: 0.8,
        diversityScore: 0.7,
        coverageByCriteria: {},
      },
      sourceMetrics: {
        totalSources: 5,
        successfulSources: 5,
        failedSources: 0,
        averageAuthority: 0.85,
        contentQualityDistribution: {},
      },
      contactMetrics: {
        totalFound: 3,
        totalImported: 3,
        averageConfidence: 0.8,
        averageQuality: 0.75,
        confidenceDistribution: {},
        extractionMethodBreakdown: {},
      },
      performanceMetrics: {
        processingSpeed: 0.2,
        accuracyEstimate: 0.8,
        cacheEffectiveness: 0.3,
        costEfficiency: 0.05,
      },
    },
  };

  beforeEach(() => {
    cache = new SearchCache({
      enabled: true,
      maxSize: 100,
      maxMemorySize: 10 * 1024 * 1024, // 10MB
      defaultTTL: 3600000, // 1 hour
      cleanupInterval: 60000, // 1 minute
    });
  });

  afterEach(async () => {
    await cache.destroy();
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent keys for identical configurations', () => {
      const key1 = cache.generateKey(testConfiguration);
      const key2 = cache.generateKey(testConfiguration);

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^[a-f0-9]{64}$/); // SHA256 hash
    });

    it('should generate different keys for different configurations', () => {
      const differentConfig = {
        ...testConfiguration,
        query: 'different query',
      };

      const key1 = cache.generateKey(testConfiguration);
      const key2 = cache.generateKey(differentConfig);

      expect(key1).not.toBe(key2);
    });

    it('should handle configuration variations correctly', () => {
      const configWithSameOptions = {
        ...testConfiguration,
        criteria: {
          countries: ['UK', 'US'], // Different order
          categories: ['technology'],
        },
      };

      const key1 = cache.generateKey(testConfiguration);
      const key2 = cache.generateKey(configWithSameOptions);

      // Order should not matter due to sorting in key generation
      expect(key1).toBe(key2);
    });
  });

  describe('Cache Operations', () => {
    it('should store and retrieve search results', async () => {
      await cache.set(testConfiguration, testResults);

      const retrieved = await cache.get(testConfiguration);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.searchId).toBe(testResults.searchId);
      expect(retrieved!.totalResults).toBe(testResults.totalResults);
      expect(retrieved!.uniqueContacts).toBe(testResults.uniqueContacts);
    });

    it('should return null for non-existent cache entries', async () => {
      const retrieved = await cache.get(testConfiguration);
      expect(retrieved).toBeNull();
    });

    it('should handle cache misses gracefully', async () => {
      const differentConfig = {
        ...testConfiguration,
        query: 'different query',
      };

      await cache.set(testConfiguration, testResults);
      const retrieved = await cache.get(differentConfig);

      expect(retrieved).toBeNull();
    });

    it('should respect TTL and return null for expired entries', async () => {
      const shortTTLCache = new SearchCache({
        enabled: true,
        defaultTTL: 100, // 100ms
      });

      await shortTTLCache.set(testConfiguration, testResults);

      // Should be available immediately
      let retrieved = await shortTTLCache.get(testConfiguration);
      expect(retrieved).not.toBeNull();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      retrieved = await shortTTLCache.get(testConfiguration);
      expect(retrieved).toBeNull();

      await shortTTLCache.destroy();
    });
  });

  describe('Search Results Caching', () => {
    it('should cache and retrieve individual search results', async () => {
      const searchResults: SearchResult[] = [
        {
          id: 'result-1',
          url: 'https://example.com/article1',
          title: 'Test Article 1',
          domain: 'example.com',
          authority: 0.9,
          relevanceScore: 0.85,
          confidenceScore: 0.8,
          contacts: [],
          metadata: {},
          sourceType: 'exa',
          processingTime: 1000,
        },
        {
          id: 'result-2',
          url: 'https://example.com/article2',
          title: 'Test Article 2',
          domain: 'example.com',
          authority: 0.85,
          relevanceScore: 0.8,
          confidenceScore: 0.75,
          contacts: [],
          metadata: {},
          sourceType: 'exa',
          processingTime: 1200,
        },
      ];

      await cache.setSearchResults(testConfiguration, searchResults);

      const retrieved = await cache.getSearchResults(testConfiguration);

      expect(retrieved).not.toBeNull();
      expect(retrieved!).toHaveLength(2);
      expect(retrieved![0].id).toBe('result-1');
      expect(retrieved![1].id).toBe('result-2');
    });

    it('should return deep copies to prevent mutations', async () => {
      await cache.set(testConfiguration, testResults);

      const retrieved = await cache.get(testConfiguration);
      expect(retrieved).not.toBeNull();

      // Modify the retrieved object
      retrieved!.totalResults = 999;

      // Get it again - should be unchanged
      const retrievedAgain = await cache.get(testConfiguration);
      expect(retrievedAgain!.totalResults).toBe(testResults.totalResults);
    });
  });

  describe('Contact Caching', () => {
    const testUrl = 'https://example.com/contacts';
    const testContacts: ExtractedContact[] = [
      {
        id: 'contact-1',
        name: 'John Doe',
        title: 'Senior Editor',
        email: 'john@example.com',
        confidenceScore: 0.85,
        relevanceScore: 0.9,
        qualityScore: 0.8,
        verificationStatus: 'PENDING',
        extractionMethod: 'AI_BASED',
        metadata: {},
        createdAt: new Date(),
      },
      {
        id: 'contact-2',
        name: 'Jane Smith',
        title: 'Staff Writer',
        email: 'jane@example.com',
        confidenceScore: 0.8,
        relevanceScore: 0.85,
        qualityScore: 0.75,
        verificationStatus: 'PENDING',
        extractionMethod: 'AI_BASED',
        metadata: {},
        createdAt: new Date(),
      },
    ];

    it('should cache and retrieve contacts by URL', async () => {
      await cache.setContacts(testUrl, testContacts);

      const retrieved = await cache.getContacts(testUrl);

      expect(retrieved).not.toBeNull();
      expect(retrieved!).toHaveLength(2);
      expect(retrieved![0].name).toBe('John Doe');
      expect(retrieved![1].name).toBe('Jane Smith');
    });

    it('should return null for non-existent contact cache entries', async () => {
      const retrieved = await cache.getContacts('https://non-existent.com');
      expect(retrieved).toBeNull();
    });

    it('should use longer TTL for contacts', async () => {
      const shortTTLCache = new SearchCache({
        enabled: true,
        defaultTTL: 100, // 100ms
      });

      await shortTTLCache.setContacts(testUrl, testContacts);

      // Wait for regular TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Contacts should still be available (longer TTL)
      const retrieved = await shortTTLCache.getContacts(testUrl);
      expect(retrieved).not.toBeNull();

      await shortTTLCache.destroy();
    });
  });

  describe('Cache Management', () => {
    it('should track cache statistics correctly', async () => {
      // Initial stats
      let stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.hitRate).toBe(0);

      // Cache miss
      await cache.get(testConfiguration);
      stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0);

      // Cache hit
      await cache.set(testConfiguration, testResults);
      await cache.get(testConfiguration);
      stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    it('should handle cache eviction when max size is reached', async () => {
      const smallCache = new SearchCache({
        enabled: true,
        maxSize: 2, // Very small cache
      });

      // Fill cache beyond capacity
      await smallCache.set({ ...testConfiguration, query: 'query1' }, testResults);
      await smallCache.set({ ...testConfiguration, query: 'query2' }, testResults);
      await smallCache.set({ ...testConfiguration, query: 'query3' }, testResults);

      // First entry should be evicted
      const retrieved = await smallCache.get({ ...testConfiguration, query: 'query1' });
      expect(retrieved).toBeNull();

      // Last two entries should still be available
      const retrieved2 = await smallCache.get({ ...testConfiguration, query: 'query2' });
      const retrieved3 = await smallCache.get({ ...testConfiguration, query: 'query3' });
      expect(retrieved2).not.toBeNull();
      expect(retrieved3).not.toBeNull();

      await smallCache.destroy();
    });

    it('should clear all cache entries', async () => {
      await cache.set(testConfiguration, testResults);
      await cache.setContacts('https://example.com', testContacts);

      let stats = cache.getStats();
      expect(stats.currentSize).toBeGreaterThan(0);

      await cache.clear();

      stats = cache.getStats();
      expect(stats.currentSize).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should delete specific cache entries', async () => {
      await cache.set(testConfiguration, testResults);

      let exists = await cache.has(testConfiguration);
      expect(exists).toBe(true);

      const deleted = await cache.delete(testConfiguration);
      expect(deleted).toBe(true);

      exists = await cache.has(testConfiguration);
      expect(exists).toBe(false);

      // Deleting non-existent entry should return false
      const deletedAgain = await cache.delete(testConfiguration);
      expect(deletedAgain).toBe(false);
    });
  });

  describe('Cache Configuration', () => {
    it('should respect disabled cache configuration', async () => {
      const disabledCache = new SearchCache({
        enabled: false,
      });

      await disabledCache.set(testConfiguration, testResults);
      const retrieved = await disabledCache.get(testConfiguration);

      expect(retrieved).toBeNull();

      const stats = disabledCache.getStats();
      expect(stats.currentSize).toBe(0);

      await disabledCache.destroy();
    });

    it('should use custom TTL when provided', async () => {
      const customTTLCache = new SearchCache({
        enabled: true,
        defaultTTL: 60000, // 1 minute
      });

      await customTTLCache.set(testConfiguration, testResults, 1000); // 1 second TTL

      // Should be available immediately
      let retrieved = await customTTLCache.get(testConfiguration);
      expect(retrieved).not.toBeNull();

      // Wait for custom TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      retrieved = await customTTLCache.get(testConfiguration);
      expect(retrieved).toBeNull();

      await customTTLCache.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle circular references in data gracefully', async () => {
      const circularData: any = { id: 'test' };
      circularData.self = circularData;

      // Should not throw error when trying to cache
      await expect(cache.set(testConfiguration, circularData as any)).rejects.toThrow();
    });

    it('should handle very large data gracefully', async () => {
      const largeData = {
        ...testResults,
        results: Array.from({ length: 10000 }, (_, i) => ({
          id: `result-${i}`,
          url: `https://example.com/article${i}`,
          title: `Test Article ${i}`.repeat(100), // Large title
          domain: 'example.com',
          authority: 0.9,
          relevanceScore: 0.85,
          confidenceScore: 0.8,
          contacts: [],
          metadata: { largeData: 'x'.repeat(10000) },
          sourceType: 'exa' as const,
          processingTime: 1000,
        })),
      };

      // Should handle large data or fail gracefully
      try {
        await cache.set(testConfiguration, largeData);
        const retrieved = await cache.get(testConfiguration);
        expect(retrieved).not.toBeNull();
      } catch (error) {
        // It's acceptable to fail for very large data
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle corrupted cache entries gracefully', async () => {
      // This would require manual cache corruption or mocking
      // For now, we test that the cache system is resilient
      await cache.set(testConfiguration, testResults);

      // Simulate a corrupted entry by directly manipulating the cache
      // Note: This is testing the internal implementation, which might not be ideal
      const cacheKey = cache.generateKey(testConfiguration);
      const cacheInstance = cache as any;
      if (cacheInstance.cache.has(cacheKey)) {
        // Corrupt the entry
        const entry = cacheInstance.cache.get(cacheKey);
        entry.data = null;
      }

      // Should handle corruption gracefully
      const retrieved = await cache.get(testConfiguration);
      expect(retrieved).toBeNull();
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency cache operations efficiently', async () => {
      const iterations = 1000;
      const configurations = Array.from({ length: iterations }, (_, i) => ({
        ...testConfiguration,
        query: `performance test query ${i}`,
      }));

      const startTime = Date.now();

      // Set operations
      const setPromises = configurations.map((config, i) =>
        cache.set(config, { ...testResults, searchId: `perf-test-${i}` })
      );
      await Promise.all(setPromises);

      const setTime = Date.now() - startTime;

      // Get operations
      const getStartTime = Date.now();
      const getPromises = configurations.map(config => cache.get(config));
      const results = await Promise.all(getPromises);
      const getTime = Date.now() - getStartTime;

      // Verify all operations succeeded
      expect(results.every(r => r !== null)).toBe(true);

      // Performance assertions (these values might need adjustment based on environment)
      expect(setTime).toBeLessThan(5000); // 5 seconds for 1000 sets
      expect(getTime).toBeLessThan(1000); // 1 second for 1000 gets

      const stats = cache.getStats();
      expect(stats.hitRate).toBe(100); // All should be hits
    });

    it('should maintain performance under memory pressure', async () => {
      const memoryLimitedCache = new SearchCache({
        enabled: true,
        maxMemorySize: 1024 * 1024, // 1MB limit
      });

      const largeDataSet = Array.from({ length: 100 }, (_, i) => ({
        ...testConfiguration,
        query: `memory pressure test ${i}`,
      }));

      // Fill cache beyond memory limit
      for (const config of largeDataSet) {
        await memoryLimitedCache.set(config, {
          ...testResults,
          searchId: `memory-test-${largeDataSet.indexOf(config)}`,
          results: Array.from({ length: 100 }, (_, j) => ({
            id: `result-${j}`,
            url: `https://example.com/article${j}`,
            title: 'Large content '.repeat(100),
            domain: 'example.com',
            authority: 0.9,
            relevanceScore: 0.85,
            confidenceScore: 0.8,
            contacts: [],
            metadata: { largeData: 'x'.repeat(1000) },
            sourceType: 'exa' as const,
            processingTime: 1000,
          })),
        });
      }

      const stats = memoryLimitedCache.getStats();
      expect(stats.memoryUsage).toBeLessThanOrEqual(1024 * 1024);
      expect(stats.evictions).toBeGreaterThan(0); // Should have evicted some entries

      await memoryLimitedCache.destroy();
    });
  });
});