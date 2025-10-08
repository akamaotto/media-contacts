/**
 * Template Engine Tests
 * Unit tests for the query template engine
 */

import { PrismaClient } from '@prisma/client';
import { QueryTemplateEngine } from '../template-engine';
import { QueryGenerationRequest } from '../types';

// Mock Prisma Client
const mockPrisma = {
  ai_query_templates: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn()
  }
} as any;

describe('QueryTemplateEngine', () => {
  let templateEngine: QueryTemplateEngine;

  beforeEach(() => {
    templateEngine = new QueryTemplateEngine(mockPrisma);
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should seed default templates when none exist', async () => {
      mockPrisma.ai_query_templates.count.mockResolvedValue(0);
      mockPrisma.ai_query_templates.create.mockImplementation((data: any) => ({
        id: 'mock-id',
        ...data.data
      }));

      await templateEngine.initialize();

      expect(mockPrisma.ai_query_templates.count).toHaveBeenCalled();
      expect(mockPrisma.ai_query_templates.create).toHaveBeenCalledTimes(16); // Number of default templates
    });

    it('should not seed templates when they already exist', async () => {
      mockPrisma.ai_query_templates.count.mockResolvedValue(10);

      await templateEngine.initialize();

      expect(mockPrisma.ai_query_templates.count).toHaveBeenCalled();
      expect(mockPrisma.ai_query_templates.create).not.toHaveBeenCalled();
    });
  });

  describe('template selection', () => {
    beforeEach(async () => {
      // Mock existing templates
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
    });

    it('should select appropriate templates for given criteria', async () => {
      const request: QueryGenerationRequest = {
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
          enableAIEnhancement: false,
          fallbackStrategies: true,
          cacheEnabled: true,
          priority: 'medium'
        },
        userId: 'user-123'
      };

      const templates = await templateEngine.selectTemplates(request);

      expect(templates).toHaveLength(2);
      expect(templates[0].name).toBe('Base Template');
      expect(templates[1].name).toBe('Technology Template');
    });

    it('should use cached templates when available', async () => {
      const request: QueryGenerationRequest = {
        searchId: 'search-123',
        batchId: 'batch-123',
        originalQuery: 'Test query',
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

      // First call should hit database
      await templateEngine.selectTemplates(request);
      expect(mockPrisma.ai_query_templates.findMany).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await templateEngine.selectTemplates(request);
      expect(mockPrisma.ai_query_templates.findMany).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  describe('query generation from templates', () => {
    beforeEach(async () => {
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
    });

    it('should generate valid queries from templates', async () => {
      const templates = await templateEngine.selectTemplates({
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
      });

      const request: QueryGenerationRequest = {
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

      const generatedQueries = await templateEngine.generateFromTemplates(templates, request);

      expect(generatedQueries).toHaveLength(1);
      expect(generatedQueries[0].query).toBe('ai technology journalist reporter');
      expect(generatedQueries[0].templateId).toBe('template-1');
      expect(generatedQueries[0].type).toBe('BASE');
    });

    it('should process complex templates with multiple variables', async () => {
      mockPrisma.ai_query_templates.findMany.mockResolvedValue([
        {
          id: 'template-complex',
          name: 'Complex Template',
          template: '{query} {category} {beat} journalist reporter in {country}',
          type: 'COMPOSITE',
          country: null,
          category: null,
          beat: null,
          language: null,
          variables: {},
          priority: 90,
          isActive: true,
          usageCount: 20,
          successCount: 18,
          averageConfidence: 0.82,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const templates = await templateEngine.selectTemplates({
        searchId: 'search-123',
        batchId: 'batch-123',
        originalQuery: 'AI developments',
        criteria: {
          categories: ['Technology'],
          beats: ['AI'],
          countries: ['US']
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
      });

      const request: QueryGenerationRequest = {
        searchId: 'search-123',
        batchId: 'batch-123',
        originalQuery: 'AI developments',
        criteria: {
          categories: ['Technology'],
          beats: ['AI'],
          countries: ['US']
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

      const generatedQueries = await templateEngine.generateFromTemplates(templates, request);

      expect(generatedQueries).toHaveLength(1);
      expect(generatedQueries[0].query).toBe('ai developments technology ai journalist reporter in US');
    });

    it('should handle templates with custom variables', async () => {
      mockPrisma.ai_query_templates.findMany.mockResolvedValue([
        {
          id: 'template-vars',
          name: 'Variable Template',
          template: '{query} site:{domain} {category} journalist',
          type: 'BASE',
          country: null,
          category: null,
          beat: null,
          language: null,
          variables: { domain: 'techcrunch.com' },
          priority: 95,
          isActive: true,
          usageCount: 15,
          successCount: 14,
          averageConfidence: 0.90,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const templates = await templateEngine.selectTemplates({
        searchId: 'search-123',
        batchId: 'batch-123',
        originalQuery: 'AI startups',
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
      });

      const request: QueryGenerationRequest = {
        searchId: 'search-123',
        batchId: 'batch-123',
        originalQuery: 'AI startups',
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

      const generatedQueries = await templateEngine.generateFromTemplates(templates, request);

      expect(generatedQueries).toHaveLength(1);
      expect(generatedQueries[0].query).toBe('ai startups site:techcrunch.com technology journalist');
    });

    it('should filter out invalid queries', async () => {
      mockPrisma.ai_query_templates.findMany.mockResolvedValue([
        {
          id: 'template-invalid',
          name: 'Invalid Template',
          template: '{query} {unprocessed_variable}',
          type: 'BASE',
          country: null,
          category: null,
          beat: null,
          language: null,
          variables: {},
          priority: 80,
          isActive: true,
          usageCount: 5,
          successCount: 2,
          averageConfidence: 0.60,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const templates = await templateEngine.selectTemplates({
        searchId: 'search-123',
        batchId: 'batch-123',
        originalQuery: 'Test query',
        criteria: {},
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
      });

      const request: QueryGenerationRequest = {
        searchId: 'search-123',
        batchId: 'batch-123',
        originalQuery: 'Test query',
        criteria: {},
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

      const generatedQueries = await templateEngine.generateFromTemplates(templates, request);

      // Should filter out the query with unprocessed variables
      expect(generatedQueries).toHaveLength(0);
    });
  });

  describe('template statistics', () => {
    it('should return template statistics', async () => {
      mockPrisma.ai_query_templates.count.mockResolvedValue(15);
      mockPrisma.ai_query_templates.count.mockResolvedValueOnce(12); // active templates
      mockPrisma.ai_query_templates.groupBy.mockResolvedValue([
        { type: 'BASE', _count: { type: 5 } },
        { type: 'CATEGORY_SPECIFIC', _count: { type: 4 } },
        { type: 'COUNTRY_SPECIFIC', _count: { type: 3 } }
      ]);
      mockPrisma.ai_query_templates.findMany.mockResolvedValue([
        {
          id: 'template-1',
          name: 'Top Template',
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
          successCount: 95,
          averageConfidence: 0.92,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]);

      const stats = await templateEngine.getTemplateStats();

      expect(stats.total).toBe(15);
      expect(stats.active).toBe(12);
      expect(stats.byType).toEqual({
        BASE: 5,
        CATEGORY_SPECIFIC: 4,
        COUNTRY_SPECIFIC: 3
      });
      expect(stats.topPerforming).toHaveLength(1);
      expect(stats.topPerforming[0].name).toBe('Top Template');
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      templateEngine.clearCache();
      // No error should be thrown
      expect(true).toBe(true);
    });

    it('should invalidate cache when needed', async () => {
      // First call to populate cache
      mockPrisma.ai_query_templates.findMany.mockResolvedValue([]);
      await templateEngine.selectTemplates({
        searchId: 'search-123',
        batchId: 'batch-123',
        originalQuery: 'Test',
        criteria: {},
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
      });

      // Clear cache
      templateEngine.clearCache();

      // Next call should hit database again
      await templateEngine.selectTemplates({
        searchId: 'search-123',
        batchId: 'batch-123',
        originalQuery: 'Test',
        criteria: {},
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
      });

      expect(mockPrisma.ai_query_templates.findMany).toHaveBeenCalledTimes(2);
    });
  });
});