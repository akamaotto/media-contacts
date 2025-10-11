/**
 * AI Query Enhancement Tests
 * Comprehensive test suite for AI-powered query enhancement
 */

import { AIQueryEnhancer } from '../ai-enhancement';
import { QueryEnhancementRequest, QueryCriteria } from '../types';
import { createMockPrismaClient, createMockQueryGenerationRequest } from '@/tests/utils/test-helpers';
import { setupMockServices, configureMockBehavior } from '@/tests/mocks/ai-services.mock';

// Mock AI service manager
jest.mock('../../services/index', () => ({
  aiServiceManager: {
    executeQuery: jest.fn()
  }
}));

describe('AIQueryEnhancer', () => {
  let enhancer: AIQueryEnhancer;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    enhancer = new AIQueryEnhancer();
    setupMockServices();
    jest.clearAllMocks();
  });

  describe('enhanceQuery', () => {
    const createMockRequest = (overrides: Partial<QueryEnhancementRequest> = {}): QueryEnhancementRequest => ({
      originalQuery: 'artificial intelligence',
      criteria: {
        categories: ['Technology'],
        countries: ['US'],
        languages: ['English']
      },
      enhancementType: 'expansion',
      options: {
        maxResults: 5,
        temperature: 0.7,
        creativity: 'medium'
      },
      diversityBoost: false,
      ...overrides
    });

    it('should enhance query using expansion', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: [
          'artificial intelligence journalist',
          'AI technology reporter',
          'machine learning media contact'
        ],
        metadata: {
          service: 'openai',
          model: 'gpt-4',
          processingTime: 1200,
          tokensUsed: 150
        }
      });

      const request = createMockRequest({ enhancementType: 'expansion' });
      const result = await enhancer.enhanceQuery(request);

      expect(result).toHaveLength(3);
      expect(result).toContain('artificial intelligence journalist');
      expect(result).toContain('AI technology reporter');
      expect(result).toContain('machine learning media contact');
    });

    it('should enhance query using refinement', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: [
          'artificial intelligence technology journalist',
          'AI research reporter specialist'
        ],
        metadata: {
          service: 'anthropic',
          model: 'claude-3-sonnet',
          processingTime: 900,
          tokensUsed: 120
        }
      });

      const request = createMockRequest({
        enhancementType: 'refinement',
        originalQuery: 'AI reporters'
      });
      const result = await enhancer.enhanceQuery(request);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('artificial intelligence');
      expect(result[1]).toContain('AI research');
    });

    it('should enhance query using localization', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: [
          'artificial intelligence journalist United States',
          'AI reporter American media'
        ],
        metadata: {
          service: 'openai',
          model: 'gpt-4',
          processingTime: 1000,
          tokensUsed: 130
        }
      });

      const request = createMockRequest({
        enhancementType: 'localization',
        criteria: { countries: ['US'] }
      });
      const result = await enhancer.enhanceQuery(request);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('United States');
      expect(result[1]).toContain('American');
    });

    it('should handle unknown enhancement types', async () => {
      const request = createMockRequest({
        enhancementType: 'unknown' as any
      });

      await expect(enhancer.enhanceQuery(request)).rejects.toThrow('Unknown enhancement type: unknown');
    });

    it('should apply diversity boost when requested', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery
        .mockResolvedValueOnce({
          queries: ['artificial intelligence journalist', 'AI reporter'],
          metadata: { service: 'openai', model: 'gpt-4' }
        })
        .mockResolvedValueOnce({
          queries: ['machine learning writer', 'tech media contact'],
          metadata: { service: 'openai', model: 'gpt-4' }
        });

      const request = createMockRequest({
        diversityBoost: true,
        options: { maxResults: 4 }
      });
      const result = await enhancer.enhanceQuery(request);

      expect(result).toHaveLength(4);
      expect(aiServiceManager.executeQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle AI service failures gracefully', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockRejectedValue(new Error('AI service unavailable'));

      const request = createMockRequest();
      const result = await enhancer.enhanceQuery(request);

      // Should return fallback queries
      expect(result).toHaveLength(0); // Empty result on failure
    });

    it('should respect maxResults limit', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: [
          'query 1', 'query 2', 'query 3', 'query 4', 'query 5', 'query 6'
        ],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const request = createMockRequest({
        options: { maxResults: 3 }
      });
      const result = await enhancer.enhanceQuery(request);

      expect(result).toHaveLength(3);
    });

    it('should handle empty input query', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: ['technology journalist', 'tech reporter'],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const request = createMockRequest({ originalQuery: '' });
      const result = await enhancer.enhanceQuery(request);

      expect(result).toHaveLength(2);
    });

    it('should validate enhancement request structure', async () => {
      const invalidRequest = {} as QueryEnhancementRequest;

      await expect(enhancer.enhanceQuery(invalidRequest)).rejects.toThrow();
    });
  });

  describe('expandQuery', () => {
    it('should expand query with related terms', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: [
          'artificial intelligence journalist',
          'AI technology reporter',
          'machine learning writer',
          'tech media contact'
        ],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const request: QueryEnhancementRequest = {
        originalQuery: 'AI',
        criteria: { categories: ['Technology'] },
        enhancementType: 'expansion',
        options: { maxResults: 10, creativity: 'high' }
      };

      const result = await enhancer.enhanceQuery(request);

      expect(result.length).toBeGreaterThan(1);
      expect(result.some(q => q.includes('artificial intelligence'))).toBe(true);
      expect(result.some(q => q.includes('machine learning'))).toBe(true);
    });

    it('should use different AI models based on criteria', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: ['tech journalist'],
        metadata: { service: 'anthropic', model: 'claude-3-sonnet' }
      });

      const request: QueryEnhancementRequest = {
        originalQuery: 'tech',
        criteria: { categories: ['Technology'], languages: ['English'] },
        enhancementType: 'expansion',
        options: { maxResults: 5 }
      };

      await enhancer.enhanceQuery(request);

      expect(aiServiceManager.executeQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          service: expect.any(String),
          query: expect.stringContaining('tech'),
          options: expect.objectContaining({
            model: expect.any(String),
            temperature: expect.any(Number)
          })
        })
      );
    });
  });

  describe('refineQuery', () => {
    it('should improve query specificity', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: [
          'artificial intelligence technology journalist',
          'AI research reporter specialist'
        ],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const request: QueryEnhancementRequest = {
        originalQuery: 'AI reporters',
        criteria: { beats: ['AI Research'] },
        enhancementType: 'refinement',
        options: { maxResults: 5 }
      };

      const result = await enhancer.enhanceQuery(request);

      expect(result.every(q => q.length > 'AI reporters'.length)).toBe(true);
      expect(result.some(q => q.includes('research'))).toBe(true);
    });

    it('should incorporate criteria into refined queries', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: [
          'artificial intelligence startup journalist',
          'AI funding technology reporter'
        ],
        metadata: { service: 'anthropic', model: 'claude-3-sonnet' }
      });

      const request: QueryEnhancementRequest = {
        originalQuery: 'AI journalists',
        criteria: {
          categories: ['Business'],
          beats: ['Startups'],
          topics: ['funding']
        },
        enhancementType: 'refinement',
        options: { maxResults: 5 }
      };

      const result = await enhancer.enhanceQuery(request);

      expect(result.some(q => q.includes('startup') || q.includes('funding'))).toBe(true);
    });
  });

  describe('localizeQuery', () => {
    it('should add geographic context to queries', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: [
          'artificial intelligence journalist United States',
          'AI reporter American media'
        ],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const request: QueryEnhancementRequest = {
        originalQuery: 'AI journalist',
        criteria: { countries: ['US'] },
        enhancementType: 'localization',
        options: { maxResults: 5 }
      };

      const result = await enhancer.enhanceQuery(request);

      expect(result.some(q => q.includes('United States') || q.includes('American'))).toBe(true);
    });

    it('should handle multiple countries', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: [
          'AI journalist US',
          'artificial intelligence reporter UK',
          'tech media contact Canada'
        ],
        metadata: { service: 'anthropic', model: 'claude-3-sonnet' }
      });

      const request: QueryEnhancementRequest = {
        originalQuery: 'AI journalist',
        criteria: { countries: ['US', 'GB', 'CA'] },
        enhancementType: 'localization',
        options: { maxResults: 10 }
      };

      const result = await enhancer.enhanceQuery(request);

      expect(result.some(q => q.includes('US') || q.includes('American'))).toBe(true);
      expect(result.some(q => q.includes('UK') || q.includes('British'))).toBe(true);
      expect(result.some(q => q.includes('Canada') || q.includes('Canadian'))).toBe(true);
    });
  });

  describe('addDiversity', () => {
    it('should add diverse query variations', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery
        .mockResolvedValueOnce({
          queries: ['AI technology journalist'],
          metadata: { service: 'openai', model: 'gpt-4' }
        })
        .mockResolvedValueOnce({
          queries: ['artificial intelligence reporter'],
          metadata: { service: 'anthropic', model: 'claude-3-sonnet' }
        });

      const request: QueryEnhancementRequest = {
        originalQuery: 'AI journalist',
        criteria: { categories: ['Technology'] },
        enhancementType: 'expansion',
        options: { maxResults: 5 },
        diversityBoost: true
      };

      const result = await enhancer.enhanceQuery(request);

      expect(result.length).toBeGreaterThan(1);
      expect(result).toContain('AI technology journalist');
      expect(result).toContain('artificial intelligence reporter');
    });
  });

  describe('getStats', () => {
    it('should return enhancement statistics', () => {
      const stats = enhancer.getStats();

      expect(stats).toHaveProperty('totalEnhancements');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('breakdownByType');
      expect(stats.breakdownByType).toHaveProperty('expansion');
      expect(stats.breakdownByType).toHaveProperty('refinement');
      expect(stats.breakdownByType).toHaveProperty('localization');
      expect(stats.breakdownByType).toHaveProperty('diversification');
    });

    it('should track different enhancement types', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: ['test query'],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      // Test different enhancement types
      const requests = [
        { enhancementType: 'expansion' as const },
        { enhancementType: 'refinement' as const },
        { enhancementType: 'localization' as const }
      ];

      for (const enhancementType of requests) {
        const request = {
          originalQuery: 'test',
          criteria: {},
          enhancementType,
          options: { maxResults: 5 },
          diversityBoost: false
        };
        await enhancer.enhanceQuery(request);
      }

      const stats = enhancer.getStats();
      expect(stats.breakdownByType.expansion).toBeGreaterThan(0);
      expect(stats.breakdownByType.refinement).toBeGreaterThan(0);
      expect(stats.breakdownByType.localization).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle timeout errors', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const request: QueryEnhancementRequest = {
        originalQuery: 'test',
        criteria: {},
        enhancementType: 'expansion',
        options: { maxResults: 5 },
        diversityBoost: false
      };

      const result = await enhancer.enhanceQuery(request);
      expect(result).toEqual([]);
    });

    it('should handle malformed AI responses', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: null, // Malformed response
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const request: QueryEnhancementRequest = {
        originalQuery: 'test',
        criteria: {},
        enhancementType: 'expansion',
        options: { maxResults: 5 },
        diversityBoost: false
      };

      const result = await enhancer.enhanceQuery(request);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should retry on transient failures', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce({
          queries: ['success query'],
          metadata: { service: 'openai', model: 'gpt-4' }
        });

      const request: QueryEnhancementRequest = {
        originalQuery: 'test',
        criteria: {},
        enhancementType: 'expansion',
        options: { maxResults: 5 },
        diversityBoost: false
      };

      const result = await enhancer.enhanceQuery(request);
      expect(result).toEqual(['success query']);
      expect(aiServiceManager.executeQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('performance', () => {
    it('should complete enhancement within reasonable time', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: ['fast query'],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const request: QueryEnhancementRequest = {
        originalQuery: 'test',
        criteria: {},
        enhancementType: 'expansion',
        options: { maxResults: 5 },
        diversityBoost: false
      };

      const startTime = Date.now();
      await enhancer.enhanceQuery(request);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle batch processing efficiently', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        queries: ['batch query 1', 'batch query 2'],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const requests = Array.from({ length: 5 }, (_, i) => ({
        originalQuery: `test ${i}`,
        criteria: {},
        enhancementType: 'expansion' as const,
        options: { maxResults: 2 },
        diversityBoost: false
      }));

      const startTime = Date.now();
      const results = await Promise.all(requests.map(req => enhancer.enhanceQuery(req)));
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(results.every(r => Array.isArray(r))).toBe(true);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});