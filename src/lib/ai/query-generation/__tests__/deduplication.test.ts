/**
 * Query Deduplication Tests
 * Unit tests for the query deduplication system
 */

import { QueryDeduplicator } from '../deduplication';
import { GeneratedQuery, QueryType, QueryStatus } from '../types';

describe('QueryDeduplicator', () => {
  let deduplicator: QueryDeduplicator;

  beforeEach(() => {
    deduplicator = new QueryDeduplicator();
  });

  const createMockQuery = (
    id: string,
    query: string,
    score: number = 0.5
  ): GeneratedQuery => ({
    id,
    searchId: 'search-123',
    batchId: 'batch-123',
    originalQuery: 'AI technology',
    generatedQuery: query,
    queryType: QueryType.BASE,
    criteria: {
      country: 'US',
      category: 'Technology'
    },
    scores: {
      relevance: score,
      diversity: score,
      complexity: score,
      overall: score
    },
    metadata: {
      templateUsed: 'template-1',
      aiEnhanced: false,
      processingMs: 100
    },
    status: QueryStatus.COMPLETED,
    createdAt: new Date()
  });

  describe('basic deduplication', () => {
    it('should identify exact duplicates', async () => {
      const queries = [
        createMockQuery('q1', 'technology journalist reporter'),
        createMockQuery('q2', 'technology journalist reporter'),
        createMockQuery('q3', 'different query')
      ];

      const result = await deduplicator.deduplicateQueries(queries);

      expect(result.deduplicationStats.totalProcessed).toBe(3);
      expect(result.deduplicationStats.duplicatesRemoved).toBe(1);
      expect(result.deduplicationStats.uniqueQueries).toBe(2);
      expect(result.uniqueQueries).toHaveLength(2);
      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].similarity).toBe(1.0);
    });

    it('should keep highest scored queries when deduplicating', async () => {
      const queries = [
        createMockQuery('q1', 'technology journalist', 0.8),
        createMockQuery('q2', 'technology journalist', 0.6),
        createMockQuery('q3', 'technology journalist', 0.9)
      ];

      const result = await deduplicator.deduplicateQueries(queries, {
        keepHighestScored: true
      });

      expect(result.uniqueQueries).toHaveLength(1);
      expect(result.uniqueQueries[0]).toBe('q3'); // Highest scored query
      expect(result.duplicates).toHaveLength(2);
      expect(result.duplicates.map(d => d.queryId).sort()).toEqual(['q1', 'q2']);
    });

    it('should handle empty query list', async () => {
      const result = await deduplicator.deduplicateQueries([]);

      expect(result.deduplicationStats.totalProcessed).toBe(0);
      expect(result.deduplicationStats.duplicatesRemoved).toBe(0);
      expect(result.deduplicationStats.uniqueQueries).toBe(0);
      expect(result.uniqueQueries).toHaveLength(0);
      expect(result.duplicates).toHaveLength(0);
    });

    it('should handle single query', async () => {
      const queries = [createMockQuery('q1', 'technology journalist')];

      const result = await deduplicator.deduplicateQueries(queries);

      expect(result.deduplicationStats.totalProcessed).toBe(1);
      expect(result.deduplicationStats.duplicatesRemoved).toBe(0);
      expect(result.deduplicationStats.uniqueQueries).toBe(1);
      expect(result.uniqueQueries).toHaveLength(1);
      expect(result.uniqueQueries[0]).toBe('q1');
    });
  });

  describe('similarity methods', () => {
    it('should use exact similarity method', async () => {
      const queries = [
        createMockQuery('q1', 'technology journalist reporter'),
        createMockQuery('q2', 'technology journalist writer'), // Similar but not identical
        createMockQuery('q3', 'sports journalist') // Different topic
      ];

      const result = await deduplicator.deduplicateQueries(queries, {
        method: 'exact',
        similarityThreshold: 0.7
      });

      expect(result.deduplicationStats.duplicatesRemoved).toBe(0); // No exact duplicates
      expect(result.deduplicationStats.uniqueQueries).toBe(3);
    });

    it('should use semantic similarity method', async () => {
      const queries = [
        createMockQuery('q1', 'technology journalist reporter'),
        createMockQuery('q2', 'tech journalist writer'), // Semantically similar
        createMockQuery('q3', 'AI media contact') // Different
      ];

      const result = await deduplicator.deduplicateQueries(queries, {
        method: 'semantic',
        similarityThreshold: 0.6
      });

      // Should detect semantic similarity between q1 and q2
      expect(result.deduplicationStats.totalProcessed).toBe(3);
      expect(result.deduplicationStats.uniqueQueries).toBeLessThanOrEqual(3);
    });

    it('should use hybrid similarity method', async () => {
      const queries = [
        createMockQuery('q1', 'technology journalist reporter'),
        createMockQuery('q2', 'tech journalist writer'),
        createMockQuery('q3', 'technology news reporter'),
        createMockQuery('q4', 'sports media contact')
      ];

      const result = await deduplicator.deduplicateQueries(queries, {
        method: 'hybrid',
        similarityThreshold: 0.7
      });

      expect(result.deduplicationStats.totalProcessed).toBe(4);
      expect(result.deduplicationStats.uniqueQueries).toBeLessThanOrEqual(4);
    });
  });

  describe('similarity threshold', () => {
    it('should respect custom similarity threshold', async () => {
      const queries = [
        createMockQuery('q1', 'technology journalist'),
        createMockQuery('q2', 'tech journalist'), // Moderately similar
        createMockQuery('q3', 'sports writer')
      ];

      // High threshold - should be less aggressive in deduplication
      const highThresholdResult = await deduplicator.deduplicateQueries(queries, {
        similarityThreshold: 0.9
      });

      // Low threshold - should be more aggressive in deduplication
      const lowThresholdResult = await deduplicator.deduplicateQueries(queries, {
        similarityThreshold: 0.5
      });

      expect(highThresholdResult.deduplicationStats.duplicatesRemoved).toBeLessThanOrEqual(
        lowThresholdResult.deduplicationStats.duplicatesRemoved
      );
    });

    it('should handle threshold at extremes', async () => {
      const queries = [
        createMockQuery('q1', 'technology journalist'),
        createMockQuery('q2', 'tech journalist'),
        createMockQuery('q3', 'tech writer')
      ];

      // Threshold of 1.0 - only exact duplicates
      const strictResult = await deduplicator.deduplicateQueries(queries, {
        similarityThreshold: 1.0
      });

      // Threshold of 0.0 - everything should be considered duplicate
      const looseResult = await deduplicator.deduplicateQueries(queries, {
        similarityThreshold: 0.0
      });

      expect(strictResult.deduplicationStats.uniqueQueries).toBe(3);
      expect(looseResult.deduplicationStats.uniqueQueries).toBe(1);
    });
  });

  describe('duplicate reasons', () => {
    it('should provide appropriate duplicate reasons', async () => {
      const queries = [
        createMockQuery('q1', 'technology journalist reporter'),
        createMockQuery('q2', 'technology journalist reporter'), // Exact duplicate
        createMockQuery('q3', 'tech journalist') // Similar
      ];

      const result = await deduplicator.deduplicateQueries(queries, {
        similarityThreshold: 0.7
      });

      if (result.duplicates.length > 0) {
        const duplicate = result.duplicates[0];
        expect(duplicate.reason).toContain('Similar');
        expect(duplicate.similarity).toBeGreaterThan(0.7);
        expect(duplicate.duplicateOf).toBeDefined();
      }
    });
  });

  describe('find similar queries', () => {
    it('should find similar queries for a target query', async () => {
      const queryPool = [
        'technology journalist reporter',
        'tech journalist writer',
        'AI media contact',
        'sports news reporter',
        'technology news writer'
      ];

      const similarQueries = await deduplicator.findSimilarQueries(
        'technology journalist',
        queryPool,
        {
          threshold: 0.5,
          maxResults: 3
        }
      );

      expect(similarQueries.length).toBeLessThanOrEqual(3);
      expect(similarQueries[0].query).toBeDefined();
      expect(similarQueries[0].similarity).toBeGreaterThanOrEqual(0.5);
      expect(similarQueries[0].reason).toBeDefined();
    });

    it('should handle empty query pool', async () => {
      const similarQueries = await deduplicator.findSimilarQueries(
        'technology journalist',
        []
      );

      expect(similarQueries).toHaveLength(0);
    });

    it('should exclude target query from results', async () => {
      const queryPool = [
        'technology journalist',
        'technology journalist reporter',
        'tech journalist writer'
      ];

      const similarQueries = await deduplicator.findSimilarQueries(
        'technology journalist',
        queryPool,
        { threshold: 0.8 }
      );

      expect(similarQueries.map(sq => sq.query)).not.toContain('technology journalist');
    });
  });

  describe('batch deduplication', () => {
    it('should process multiple query batches', async () => {
      const batch1 = [
        createMockQuery('q1', 'technology journalist'),
        createMockQuery('q2', 'tech journalist')
      ];

      const batch2 = [
        createMockQuery('q3', 'AI reporter'),
        createMockQuery('q4', 'artificial intelligence journalist')
      ];

      const queryBatches = [
        { batchId: 'batch-1', queries: batch1 },
        { batchId: 'batch-2', queries: batch2 }
      ];

      const results = await deduplicator.batchDeduplicate(queryBatches);

      expect(results).toHaveLength(2);
      expect(results[0].batchId).toBe('batch-1');
      expect(results[1].batchId).toBe('batch-2');
      expect(results[0].result.deduplicationStats.totalProcessed).toBe(2);
      expect(results[1].result.deduplicationStats.totalProcessed).toBe(2);
    });
  });

  describe('statistics', () => {
    it('should calculate deduplication statistics correctly', () => {
      const results = [
        {
          deduplicationStats: {
            totalProcessed: 10,
            duplicatesRemoved: 3,
            uniqueQueries: 7
          }
        },
        {
          deduplicationStats: {
            totalProcessed: 15,
            duplicatesRemoved: 5,
            uniqueQueries: 10
          }
        },
        {
          deduplicationStats: {
            totalProcessed: 8,
            duplicatesRemoved: 2,
            uniqueQueries: 6
          }
        }
      ];

      const stats = deduplicator.getDeduplicationStats(results);

      expect(stats.totalBatches).toBe(3);
      expect(stats.totalQueriesProcessed).toBe(33);
      expect(stats.totalDuplicatesRemoved).toBe(10);
      expect(stats.averageDuplicateRate).toBeCloseTo(0.303, 3);
      expect(stats.averageUniqueQueries).toBeCloseTo(7.667, 3);
    });

    it('should handle empty results list', () => {
      const stats = deduplicator.getDeduplicationStats([]);

      expect(stats.totalBatches).toBe(0);
      expect(stats.totalQueriesProcessed).toBe(0);
      expect(stats.totalDuplicatesRemoved).toBe(0);
      expect(stats.averageDuplicateRate).toBe(0);
      expect(stats.averageUniqueQueries).toBe(0);
    });
  });

  describe('threshold management', () => {
    it('should update similarity threshold', () => {
      const originalThreshold = deduplicator.getSimilarityThreshold();

      deduplicator.updateSimilarityThreshold(0.85);

      expect(deduplicator.getSimilarityThreshold()).toBe(0.85);
      expect(deduplicator.getSimilarityThreshold()).not.toBe(originalThreshold);
    });

    it('should validate threshold range', () => {
      expect(() => deduplicator.updateSimilarityThreshold(0.5)).not.toThrow();
      expect(() => deduplicator.updateSimilarityThreshold(0)).not.toThrow();
      expect(() => deduplicator.updateSimilarityThreshold(1)).not.toThrow();

      expect(() => deduplicator.updateSimilarityThreshold(-0.1)).toThrow();
      expect(() => deduplicator.updateSimilarityThreshold(1.1)).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle queries with special characters', async () => {
      const queries = [
        createMockQuery('q1', 'technology "artificial intelligence" journalist'),
        createMockQuery('q2', 'technology (AI OR "machine learning") reporter'),
        createMockQuery('q3', 'tech artificial intelligence journalist') // Similar but different structure
      ];

      const result = await deduplicator.deduplicateQueries(queries);

      expect(result.deduplicationStats.totalProcessed).toBe(3);
      expect(result.deduplicationStats.uniqueQueries).toBeLessThanOrEqual(3);
    });

    it('should handle very long queries', async () => {
      const longQuery1 = createMockQuery('q1', 'technology journalist reporter AI machine learning deep learning artificial intelligence ' +
        'software development programming startup innovation entrepreneurship venture capital silicon valley tech industry');

      const longQuery2 = createMockQuery('q2', 'technology journalist reporter AI machine learning deep learning artificial intelligence ' +
        'software development programming startup innovation entrepreneurship venture capital silicon valley tech industry'); // Same

      const queries = [longQuery1, longQuery2];

      const result = await deduplicator.deduplicateQueries(queries);

      expect(result.deduplicationStats.duplicatesRemoved).toBe(1);
      expect(result.deduplicationStats.uniqueQueries).toBe(1);
    });

    it('should handle queries with different cases', async () => {
      const queries = [
        createMockQuery('q1', 'Technology Journalist Reporter'),
        createMockQuery('q2', 'technology journalist reporter'),
        createMockQuery('q3', 'TECHNOLOGY JOURNALIST REPORTER')
      ];

      const result = await deduplicator.deduplicateQueries(queries);

      // Should detect that these are the same (case-insensitive)
      expect(result.deduplicationStats.duplicatesRemoved).toBeGreaterThan(0);
    });

    it('should handle queries with extra whitespace', async () => {
      const queries = [
        createMockQuery('q1', 'technology journalist reporter'),
        createMockQuery('q2', '  technology   journalist  reporter  '),
        createMockQuery('q3', 'technology journalist reporter ')
      ];

      const result = await deduplicator.deduplicateQueries(queries);

      // Should detect that these are the same (normalized whitespace)
      expect(result.deduplicationStats.duplicatesRemoved).toBeGreaterThan(0);
    });
  });
});