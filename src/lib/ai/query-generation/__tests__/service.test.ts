/**
 * Query Generation Service Tests
 * Integration tests for the complete query generation service
 */

import { QueryGenerationService } from '../service';
import { QueryGenerationRequest, QueryType, QueryStatus } from '../types';

// Mock Prisma Client
const mockPrisma = {
  ai_query_templates: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  ai_generated_queries: {
    create: jest.fn()
  },
  ai_query_performance_logs: {
    create: jest.fn()
  }
} as any;

// Mock AI Service Manager
jest.mock('../ai-enhancement', () => ({
  AIQueryEnhancer: jest.fn().mockImplementation(() => ({
    enhanceQuery: jest.fn().mockResolvedValue([
      'enhanced technology journalist AI',
      'AI tech media contact',
      'artificial intelligence reporter'
    ]),
    getStats: jest.fn().mockReturnValue({
      totalEnhancements: 10,
      successRate: 0.95,
      averageProcessingTime: 2500,
      breakdownByType: {
        expansion: 4,
        refinement: 3,
        localization: 2,
        diversification: 1,
        optimization: 0
      }
    })
  }))
}));

describe('QueryGenerationService', () => {
  let service: QueryGenerationService;

  beforeEach(() => {
    service = new QueryGenerationService(mockPrisma);
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      mockPrisma.ai_query_templates.count.mockResolvedValue(5);

      await service.initialize();

      expect(mockPrisma.ai_query_templates.count).toHaveBeenCalled();
    });

    it('should seed templates when database is empty', async () => {
      mockPrisma.ai_query_templates.count.mockResolvedValue(0);
      mockPrisma.ai_query_templates.create.mockImplementation((data: any) => ({
        id: 'template-id',
        ...data.data
      }));

      await service.initialize();

      expect(mockPrisma.ai_query_templates.create).toHaveBeenCalled();
    });
  });

  describe('query generation', () => {
    const createMockRequest = (overrides: Partial<QueryGenerationRequest> = {}): QueryGenerationRequest => ({
      searchId: 'search-123',
      batchId: 'batch-123',
      originalQuery: 'AI technology',
      criteria: {
        categories: ['Technology'],
        countries: ['US']
      },
      options: {
        maxQueries: 10,
        diversityThreshold: 0.7,
        minRelevanceScore: 0.3,
        enableAIEnhancement: true,
        fallbackStrategies: true,
        cacheEnabled: true,
        priority: 'medium'
      },
      userId: 'user-123',
      ...overrides
    });

    beforeEach(() => {
      // Mock template data
      mockPrisma.ai_query_templates.findMany.mockResolvedValue([
        {
          id: 'template-1',
          name: 'Base Template',
          template: '{query} journalist reporter',
          type: 'BASE',
          country: null,
          category: null,
          beat: null,
          language: null,
          variables: {},
          priority: 100,
          isActive: true,
          usageCount: 50,
          successCount: 45,
          averageConfidence: 0.85,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'template-2',
          name: 'Technology Template',
          template: '{query} technology {category} journalist',
          type: 'CATEGORY_SPECIFIC',
          country: null,
          category: 'Technology',
          beat: null,
          language: null,
          variables: {},
          priority: 90,
          isActive: true,
          usageCount: 30,
          successCount: 28,
          averageConfidence: 0.88,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      // Mock database operations
      mockPrisma.ai_generated_queries.create.mockResolvedValue({ id: 'query-id' });
      mockPrisma.ai_query_performance_logs.create.mockResolvedValue({ id: 'log-id' });
    });

    it('should generate queries successfully', async () => {
      const request = createMockRequest();

      const result = await service.generateQueries(request);

      expect(result.searchId).toBe(request.searchId);
      expect(result.batchId).toBe(request.batchId);
      expect(result.originalQuery).toBe(request.originalQuery);
      expect(result.queries).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.status).toBe('completed');
    });

    it('should generate queries with AI enhancement enabled', async () => {
      const request = createMockRequest({
        options: {
          ...createMockRequest().options,
          enableAIEnhancement: true
        }
      });

      const result = await service.generateQueries(request);

      expect(result.queries.length).toBeGreaterThan(0);
      // Should have both template-based and AI-enhanced queries
      const hasAIEnhanced = result.queries.some(q => q.metadata?.aiEnhanced === true);
      expect(hasAIEnhanced).toBe(true);
    });

    it('should generate queries without AI enhancement', async () => {
      const request = createMockRequest({
        options: {
          ...createMockRequest().options,
          enableAIEnhancement: false
        }
      });

      const result = await service.generateQueries(request);

      expect(result.queries.length).toBeGreaterThan(0);
      // Should only have template-based queries
      const hasAIEnhanced = result.queries.some(q => q.metadata?.aiEnhanced === true);
      expect(hasAIEnhanced).toBe(false);
    });

    it('should respect maxQueries limit', async () => {
      const request = createMockRequest({
        options: {
          ...createMockRequest().options,
          maxQueries: 5
        }
      });

      const result = await service.generateQueries(request);

      expect(result.queries.length).toBeLessThanOrEqual(5);
    });

    it('should filter queries by minimum relevance score', async () => {
      const request = createMockRequest({
        options: {
          ...createMockRequest().options,
          minRelevanceScore: 0.7
        }
      });

      const result = await service.generateQueries(request);

      // All queries should meet the minimum score
      result.queries.forEach(query => {
        expect(query.scores.overall).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('should handle complex criteria', async () => {
      const request = createMockRequest({
        criteria: {
          categories: ['Technology', 'Business'],
          beats: ['AI', 'Startups'],
          countries: ['US', 'GB'],
          languages: ['English'],
          topics: ['artificial intelligence', 'machine learning']
        }
      });

      const result = await service.generateQueries(request);

      expect(result.queries.length).toBeGreaterThan(0);
      expect(result.metrics.coverageByCriteria.categories).toContain('Technology');
      expect(result.metrics.coverageByCriteria.categories).toContain('Business');
      expect(result.metrics.coverageByCriteria.beats).toContain('AI');
      expect(result.metrics.coverageByCriteria.beats).toContain('Startups');
    });

    it('should save queries to database', async () => {
      const request = createMockRequest();

      await service.generateQueries(request);

      expect(mockPrisma.ai_generated_queries.create).toHaveBeenCalledTimes(
        expect.any(Number) // Should be called for each generated query
      );
    });

    it('should log performance metrics', async () => {
      const request = createMockRequest();

      await service.generateQueries(request);

      expect(mockPrisma.ai_query_performance_logs.create).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle AI enhancement failures gracefully', async () => {
      // Mock AI enhancement failure
      const { AIQueryEnhancer } = require('../ai-enhancement');
      AIQueryEnhancer.mockImplementation(() => ({
        enhanceQuery: jest.fn().mockRejectedValue(new Error('AI service unavailable')),
        getStats: jest.fn()
      }));

      const request = {
        searchId: 'search-123',
        batchId: 'batch-123',
        originalQuery: 'AI technology',
        criteria: {
          categories: ['Technology']
        },
        options: {
          maxQueries: 10,
          diversityThreshold: 0.7,
          minRelevanceScore: 0.3,
          enableAIEnhancement: true,
          fallbackStrategies: true,
          cacheEnabled: true,
          priority: 'medium'
        },
        userId: 'user-123'
      };

      // Setup template mock
      mockPrisma.ai_query_templates.findMany.mockResolvedValue([
        {
          id: 'template-1',
          name: 'Base Template',
          template: '{query} journalist reporter',
          type: 'BASE',
          country: null,
          category: null,
          beat: null,
          language: null,
          variables: {},
          priority: 100,
          isActive: true,
          usageCount: 50,
          successCount: 45,
          averageConfidence: 0.85,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      mockPrisma.ai_generated_queries.create.mockResolvedValue({ id: 'query-id' });
      mockPrisma.ai_query_performance_logs.create.mockResolvedValue({ id: 'log-id' });

      const service = new QueryGenerationService(mockPrisma);
      await service.initialize();

      const result = await service.generateQueries(request);

      // Should still generate queries using templates only
      expect(result.queries.length).toBeGreaterThan(0);
      expect(result.status).toBe('completed');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.ai_query_templates.findMany.mockRejectedValue(new Error('Database connection failed'));

      const request = {
        searchId: 'search-123',
        batchId: 'batch-123',
        originalQuery: 'AI technology',
        criteria: {
          categories: ['Technology']
        },
        options: {
          maxQueries: 10,
          diversityThreshold: 0.7,
          minRelevanceScore: 0.3,
          enableAIEnhancement: false,
          fallbackStrategies: true,
          cacheEnabled: true,
          priority: 'medium'
        },
        userId: 'user-123'
      };

      const service = new QueryGenerationService(mockPrisma);
      await service.initialize();

      await expect(service.generateQueries(request)).rejects.toThrow();
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      const newConfig = {
        ai: {
          enabled: false,
          model: 'gpt-3.5-turbo',
          temperature: 0.5,
          maxTokens: 500,
          timeoutMs: 15000
        }
      };

      service.updateConfig(newConfig);

      const currentConfig = service.getConfig();
      expect(currentConfig.ai.enabled).toBe(false);
      expect(currentConfig.ai.model).toBe('gpt-3.5-turbo');
      expect(currentConfig.ai.temperature).toBe(0.5);
    });

    it('should merge partial configuration updates', () => {
      const originalConfig = service.getConfig();

      service.updateConfig({
        ai: {
          enabled: false
        }
      });

      const updatedConfig = service.getConfig();
      expect(updatedConfig.ai.enabled).toBe(false);
      expect(updatedConfig.ai.model).toBe(originalConfig.ai.model); // Unchanged
    });
  });

  describe('statistics', () => {
    it('should return service statistics', async () => {
      mockPrisma.ai_query_templates.count.mockResolvedValue(10);
      mockPrisma.ai_query_templates.groupBy.mockResolvedValue([
        { type: 'BASE', _count: { type: 5 } },
        { type: 'CATEGORY_SPECIFIC', _count: { type: 3 } }
      ]);
      mockPrisma.ai_query_templates.findMany.mockResolvedValue([]);

      await service.initialize();

      const stats = await service.getStats();

      expect(stats.templateStats).toBeDefined();
      expect(stats.aiStats).toBeDefined();
      expect(stats.scoringStats).toBeDefined();
      expect(stats.deduplicationStats).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle a complete real-world scenario', async () => {
      // Setup comprehensive mock data
      mockPrisma.ai_query_templates.findMany.mockResolvedValue([
        {
          id: 'template-1',
          name: 'Base Template',
          template: '{query} journalist reporter',
          type: 'BASE',
          country: null,
          category: null,
          beat: null,
          language: null,
          variables: {},
          priority: 100,
          isActive: true,
          usageCount: 50,
          successCount: 45,
          averageConfidence: 0.85,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'template-2',
          name: 'Technology Template',
          template: '{query} technology journalist',
          type: 'CATEGORY_SPECIFIC',
          country: null,
          category: 'Technology',
          beat: null,
          language: null,
          variables: {},
          priority: 95,
          isActive: true,
          usageCount: 30,
          successCount: 28,
          averageConfidence: 0.88,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      mockPrisma.ai_generated_queries.create.mockResolvedValue({ id: 'query-id' });
      mockPrisma.ai_query_performance_logs.create.mockResolvedValue({ id: 'log-id' });

      const request = {
        searchId: 'search-complex',
        batchId: 'batch-complex',
        originalQuery: 'artificial intelligence startups',
        criteria: {
          categories: ['Technology', 'Business'],
          beats: ['AI', 'Startups', 'Venture Capital'],
          countries: ['US', 'GB', 'CA'],
          languages: ['English'],
          topics: ['machine learning', 'funding', 'innovation'],
          outlets: ['TechCrunch', 'Wired', 'VentureBeat']
        },
        options: {
          maxQueries: 15,
          diversityThreshold: 0.75,
          minRelevanceScore: 0.4,
          enableAIEnhancement: true,
          fallbackStrategies: true,
          cacheEnabled: true,
          priority: 'high'
        },
        userId: 'user-advanced'
      };

      await service.initialize();
      const result = await service.generateQueries(request);

      expect(result.searchId).toBe(request.searchId);
      expect(result.queries.length).toBeGreaterThan(0);
      expect(result.queries.length).toBeLessThanOrEqual(15);
      expect(result.metrics.totalGenerated).toBeGreaterThan(0);
      expect(result.metrics.averageScore).toBeGreaterThan(0);
      expect(result.metrics.processingTimeMs).toBeGreaterThan(0);
      expect(result.metrics.diversityScore).toBeGreaterThan(0);

      // Check criteria coverage
      expect(result.metrics.coverageByCriteria.categories).toContain('Technology');
      expect(result.metrics.coverageByCriteria.beats).toContain('AI');
      expect(result.metrics.coverageByCriteria.countries).toContain('US');

      // Check query types
      const queryTypes = new Set(result.queries.map(q => q.queryType));
      expect(queryTypes.size).toBeGreaterThan(0);
    });

    it('should handle high priority requests efficiently', async () => {
      const startTime = Date.now();

      mockPrisma.ai_query_templates.findMany.mockResolvedValue([
        {
          id: 'template-1',
          name: 'Fast Template',
          template: '{query} journalist',
          type: 'BASE',
          country: null,
          category: null,
          beat: null,
          language: null,
          variables: {},
          priority: 100,
          isActive: true,
          usageCount: 100,
          successCount: 98,
          averageConfidence: 0.92,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      mockPrisma.ai_generated_queries.create.mockResolvedValue({ id: 'query-id' });
      mockPrisma.ai_query_performance_logs.create.mockResolvedValue({ id: 'log-id' });

      const request = {
        searchId: 'search-fast',
        batchId: 'batch-fast',
        originalQuery: 'breaking news technology',
        criteria: {
          categories: ['Technology']
        },
        options: {
          maxQueries: 5,
          diversityThreshold: 0.8,
          minRelevanceScore: 0.5,
          enableAIEnhancement: false, // Disable AI for speed
          fallbackStrategies: false,
          cacheEnabled: true,
          priority: 'high'
        },
        userId: 'user-priority'
      };

      await service.initialize();
      const result = await service.generateQueries(request);

      const processingTime = Date.now() - startTime;

      expect(result.status).toBe('completed');
      expect(result.queries.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(1000); // Should be fast
    });
  });
});