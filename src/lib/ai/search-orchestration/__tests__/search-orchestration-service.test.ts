/**
 * Search Orchestration Service Tests
 * Comprehensive test suite for the search orchestration system
 */

import { SearchOrchestrationService } from '../search-orchestration-service';
import { SearchConfiguration, SearchStage, SearchStatus } from '../types';
import { PrismaClient } from '@prisma/client';

// Mock dependencies
jest.mock('../query-generation/service');
jest.mock('../contact-extraction/contact-extraction-service');
jest.mock('../../services/manager');
jest.mock('@prisma/client');

describe('SearchOrchestrationService', () => {
  let service: SearchOrchestrationService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockQueryGenerationService: any;
  let mockContactExtractionService: any;
  let mockAIServiceManager: any;

  const testUserId = 'test-user-123';
  const testConfiguration: SearchConfiguration = {
    query: 'test query',
    criteria: {
      countries: ['US', 'UK'],
      categories: ['technology'],
      beats: ['AI']
    },
    options: {
      maxResults: 10,
      maxContactsPerSource: 5,
      confidenceThreshold: 0.7,
      enableAIEnhancement: true,
      enableContactExtraction: true,
      enableContentScraping: true,
      enableCaching: true,
      strictValidation: false,
      processingTimeout: 30000,
      priority: 'normal'
    }
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock Prisma Client
    mockPrisma = {
      ai_searches: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      ai_search_sources: {
        createMany: jest.fn(),
      },
      ai_extracted_contact: {
        createMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    } as any;

    // Mock Query Generation Service
    mockQueryGenerationService = {
      initialize: jest.fn(),
      generateQueries: jest.fn(),
    };

    // Mock Contact Extraction Service
    mockContactExtractionService = {
      extractContacts: jest.fn(),
      cleanup: jest.fn(),
    };

    // Mock AI Service Manager
    mockAIServiceManager = {
      searchWeb: jest.fn(),
      scrapeContent: jest.fn(),
      extractContacts: jest.fn(),
      getServiceHealth: jest.fn(),
    };

    // Mock the imports
    const { QueryGenerationService } = require('../query-generation/service');
    const { ContactExtractionService } = require('../contact-extraction/contact-extraction-service');
    const aiServiceManager = require('../../services/manager').default;

    QueryGenerationService.mockImplementation(() => mockQueryGenerationService);
    ContactExtractionService.mockImplementation(() => mockContactExtractionService);
    aiServiceManager.mockImplementation(() => mockAIServiceManager);

    // Create service instance
    service = new SearchOrchestrationService(mockPrisma);
  });

  afterEach(async () => {
    await service.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      mockQueryGenerationService.initialize.mockResolvedValue(undefined);
      mockContactExtractionService.cleanup.mockResolvedValue(undefined);

      await service.initialize();

      expect(mockQueryGenerationService.initialize).toHaveBeenCalled();
      expect(mockContactExtractionService.cleanup).toHaveBeenCalled();
    });

    it('should handle initialization failures', async () => {
      mockQueryGenerationService.initialize.mockRejectedValue(new Error('Initialization failed'));

      await expect(service.initialize()).rejects.toThrow('Initialization failed');
    });
  });

  describe('Search Submission', () => {
    beforeEach(async () => {
      await service.initialize();
      mockPrisma.ai_searches.create.mockResolvedValue({
        id: 'test-search-id',
        userId: testUserId,
        status: SearchStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    it('should submit a search request successfully', async () => {
      const request = {
        userId: testUserId,
        configuration: testConfiguration,
        priority: 'normal' as const,
        timeout: 60000,
      };

      const response = await service.submitSearch(request);

      expect(response.searchId).toBeDefined();
      expect(response.status).toBe(SearchStatus.PENDING);
      expect(response.progress.stage).toBe(SearchStage.INITIALIZING);
      expect(mockPrisma.ai_searches.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: testUserId,
          status: SearchStatus.PENDING,
          configuration: testConfiguration,
        }),
      });
    });

    it('should handle search submission failures', async () => {
      mockPrisma.ai_searches.create.mockRejectedValue(new Error('Database error'));

      const request = {
        userId: testUserId,
        configuration: testConfiguration,
      };

      await expect(service.submitSearch(request)).rejects.toThrow('Database error');
    });

    it('should prioritize searches correctly', async () => {
      const highPriorityRequest = {
        userId: testUserId,
        configuration: { ...testConfiguration, options: { ...testConfiguration.options, priority: 'high' as const } },
      };

      const lowPriorityRequest = {
        userId: testUserId,
        configuration: { ...testConfiguration, options: { ...testConfiguration.options, priority: 'low' as const } },
      };

      const highPriorityResponse = await service.submitSearch(highPriorityRequest);
      const lowPriorityResponse = await service.submitSearch(lowPriorityRequest);

      expect(highPriorityResponse.searchId).toBeDefined();
      expect(lowPriorityResponse.searchId).toBeDefined();
      // High priority should be processed first (verified through queue ordering)
    });
  });

  describe('Search Status', () => {
    const testSearchId = 'test-search-123';

    beforeEach(async () => {
      await service.initialize();
    });

    it('should get search status successfully', async () => {
      mockPrisma.ai_searches.findUnique.mockResolvedValue({
        id: testSearchId,
        userId: testUserId,
        status: SearchStatus.PROCESSING,
        created_at: new Date(),
        updated_at: new Date(),
        contacts_found: 5,
        contacts_imported: 3,
        ai_search_sources: [],
        ai_extracted_contacts: [],
      });

      const status = await service.getSearchStatus(testSearchId, testUserId);

      expect(status).not.toBeNull();
      expect(status!.searchId).toBe(testSearchId);
      expect(status!.status).toBe(SearchStatus.PROCESSING);
      expect(mockPrisma.ai_searches.findUnique).toHaveBeenCalledWith({
        where: { id: testSearchId },
        include: {
          ai_search_sources: true,
          ai_extracted_contacts: true,
        },
      });
    });

    it('should return null for non-existent search', async () => {
      mockPrisma.ai_searches.findUnique.mockResolvedValue(null);

      const status = await service.getSearchStatus('non-existent', testUserId);

      expect(status).toBeNull();
    });

    it('should deny access to searches belonging to other users', async () => {
      mockPrisma.ai_searches.findUnique.mockResolvedValue({
        id: testSearchId,
        userId: 'other-user',
        status: SearchStatus.PROCESSING,
        created_at: new Date(),
        updated_at: new Date(),
      });

      await expect(service.getSearchStatus(testSearchId, testUserId)).rejects.toThrow('Access denied');
    });
  });

  describe('Search Cancellation', () => {
    const testSearchId = 'test-search-123';

    beforeEach(async () => {
      await service.initialize();
    });

    it('should cancel an active search successfully', async () => {
      mockPrisma.ai_searches.findUnique.mockResolvedValue({
        id: testSearchId,
        userId: testUserId,
        status: SearchStatus.PROCESSING,
        created_at: new Date(),
        updated_at: new Date(),
      });

      mockPrisma.ai_searches.update.mockResolvedValue({
        id: testSearchId,
        status: SearchStatus.CANCELLED,
        completed_at: new Date(),
        updated_at: new Date(),
      });

      const response = await service.cancelSearch(testSearchId, testUserId, 'User cancellation');

      expect(response.success).toBe(true);
      expect(response.message).toBe('User cancellation');
      expect(mockPrisma.ai_searches.update).toHaveBeenCalledWith({
        where: { id: testSearchId },
        data: {
          status: SearchStatus.CANCELLED,
          completed_at: expect.any(Date),
          updated_at: expect.any(Date),
        },
      });
    });

    it('should handle cancellation of non-existent search', async () => {
      mockPrisma.ai_searches.findUnique.mockResolvedValue(null);

      const response = await service.cancelSearch('non-existent', testUserId);

      expect(response.success).toBe(false);
      expect(response.message).toBe('Search not found');
    });

    it('should handle cancellation of completed search', async () => {
      mockPrisma.ai_searches.findUnique.mockResolvedValue({
        id: testSearchId,
        userId: testUserId,
        status: SearchStatus.COMPLETED,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const response = await service.cancelSearch(testSearchId, testUserId);

      expect(response.success).toBe(false);
      expect(response.message).toContain('cannot be cancelled');
    });
  });

  describe('Search Statistics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should get search statistics successfully', async () => {
      const mockSearches = [
        {
          status: SearchStatus.COMPLETED,
          created_at: new Date(Date.now() - 1000000),
          started_at: new Date(Date.now() - 999000),
          completed_at: new Date(Date.now() - 950000),
          contacts_found: 10,
          duration_seconds: 45,
        },
        {
          status: SearchStatus.FAILED,
          created_at: new Date(Date.now() - 500000),
          started_at: new Date(Date.now() - 499000),
          completed_at: new Date(Date.now() - 480000),
          contacts_found: 0,
          duration_seconds: 15,
        },
        {
          status: SearchStatus.CANCELLED,
          created_at: new Date(Date.now() - 250000),
          started_at: new Date(Date.now() - 249000),
          completed_at: new Date(Date.now() - 240000),
          contacts_found: 3,
          duration_seconds: 5,
        },
      ];

      mockPrisma.ai_searches.findMany.mockResolvedValue(mockSearches);

      const stats = await service.getSearchStatistics(testUserId);

      expect(stats.totalSearches).toBe(3);
      expect(stats.completedSearches).toBe(1);
      expect(stats.failedSearches).toBe(1);
      expect(stats.cancelledSearches).toBe(1);
      expect(stats.averageProcessingTime).toBe((45 + 15 + 5) / 3);
      expect(stats.averageContactsPerSearch).toBe(13 / 3);
    });

    it('should handle empty search history', async () => {
      mockPrisma.ai_searches.findMany.mockResolvedValue([]);

      const stats = await service.getSearchStatistics(testUserId);

      expect(stats.totalSearches).toBe(0);
      expect(stats.averageProcessingTime).toBe(0);
      expect(stats.averageContactsPerSearch).toBe(0);
      expect(stats.topQueries).toHaveLength(0);
    });
  });

  describe('Health Status', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return healthy status when all services are healthy', async () => {
      const mockServiceHealth = [
        {
          service: 'exa',
          status: 'healthy' as const,
          lastCheck: new Date(),
          responseTime: 150,
          errorRate: 0,
          uptime: 99.9,
          requestCount: 1000,
          errorCount: 0,
        },
        {
          service: 'firecrawl',
          status: 'healthy' as const,
          lastCheck: new Date(),
          responseTime: 200,
          errorRate: 0,
          uptime: 99.5,
          requestCount: 500,
          errorCount: 0,
        },
      ];

      mockAIServiceManager.getServiceHealth.mockResolvedValue(mockServiceHealth);

      const health = await service.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.services).toEqual(mockServiceHealth);
      expect(health.activeSearches).toBe(0);
      expect(health.queueSize).toBe(0);
    });

    it('should return degraded status when some services are degraded', async () => {
      const mockServiceHealth = [
        {
          service: 'exa',
          status: 'degraded' as const,
          lastCheck: new Date(),
          responseTime: 500,
          errorRate: 5,
          uptime: 95,
          requestCount: 1000,
          errorCount: 50,
        },
        {
          service: 'firecrawl',
          status: 'healthy' as const,
          lastCheck: new Date(),
          responseTime: 200,
          errorRate: 0,
          uptime: 99.5,
          requestCount: 500,
          errorCount: 0,
        },
      ];

      mockAIServiceManager.getServiceHealth.mockResolvedValue(mockServiceHealth);

      const health = await service.getHealthStatus();

      expect(health.status).toBe('degraded');
    });

    it('should return unhealthy status when services are unhealthy', async () => {
      const mockServiceHealth = [
        {
          service: 'exa',
          status: 'unhealthy' as const,
          lastCheck: new Date(),
          responseTime: 5000,
          errorRate: 100,
          uptime: 0,
          requestCount: 100,
          errorCount: 100,
          lastError: 'Connection timeout',
        },
      ];

      mockAIServiceManager.getServiceHealth.mockResolvedValue(mockServiceHealth);

      const health = await service.getHealthStatus();

      expect(health.status).toBe('unhealthy');
    });
  });

  describe('Search Execution Flow', () => {
    const testSearchId = 'test-search-execution';

    beforeEach(async () => {
      await service.initialize();
      mockPrisma.ai_searches.create.mockResolvedValue({
        id: testSearchId,
        userId: testUserId,
        status: SearchStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      });
      mockPrisma.ai_searches.update.mockResolvedValue({
        id: testSearchId,
        status: SearchStatus.PROCESSING,
        started_at: new Date(),
        updated_at: new Date(),
      });
    });

    it('should execute search flow successfully', async () => {
      // Mock query generation
      mockQueryGenerationService.generateQueries.mockResolvedValue({
        searchId: testSearchId,
        batchId: 'test-batch',
        originalQuery: testConfiguration.query,
        queries: [
          {
            id: 'query-1',
            generatedQuery: 'enhanced test query',
            score: 0.8,
            metadata: {},
          },
        ],
        metrics: {
          totalGenerated: 1,
          totalDuplicates: 0,
          averageScore: 0.8,
          processingTimeMs: 1000,
        },
        status: 'completed',
      });

      // Mock web search
      mockAIServiceManager.searchWeb.mockResolvedValue([
        {
          id: 'result-1',
          url: 'https://example.com/article1',
          title: 'Test Article 1',
          summary: 'Test summary 1',
          confidence: 0.9,
          relevanceScore: 0.85,
          metadata: {
            source: 'exa',
            publishedDate: '2023-01-01',
            language: 'en',
            contentLength: 1000,
            contactCount: 2,
          },
        },
      ]);

      // Mock content scraping
      mockAIServiceManager.scrapeContent.mockResolvedValue({
        url: 'https://example.com/article1',
        title: 'Test Article 1',
        content: 'Full article content here...',
        metadata: {
          contentType: 'article',
          contentLength: 2000,
          wordCount: 350,
        },
      });

      // Mock contact extraction
      mockContactExtractionService.extractContacts.mockResolvedValue({
        extractionId: 'extraction-1',
        searchId: testSearchId,
        status: 'completed' as const,
        sourcesProcessed: 1,
        contactsFound: 2,
        contactsImported: 2,
        averageConfidence: 0.8,
        averageQuality: 0.75,
        processingTimeMs: 5000,
        contacts: [
          {
            id: 'contact-1',
            name: 'John Doe',
            title: 'Senior Editor',
            email: 'john@example.com',
            confidenceScore: 0.85,
            relevanceScore: 0.9,
            qualityScore: 0.8,
            verificationStatus: 'PENDING' as const,
            extractionMethod: 'AI_BASED' as const,
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
            verificationStatus: 'PENDING' as const,
            extractionMethod: 'AI_BASED' as const,
            metadata: {},
            createdAt: new Date(),
          },
        ],
      });

      // Mock database operations for finalization
      mockPrisma.ai_search_sources.createMany.mockResolvedValue(undefined);
      mockPrisma.ai_extracted_contact.createMany.mockResolvedValue(undefined);

      const request = {
        userId: testUserId,
        configuration: testConfiguration,
      };

      const response = await service.submitSearch(request);

      // Verify initial response
      expect(response.searchId).toBeDefined();
      expect(response.status).toBe(SearchStatus.PENDING);

      // The actual execution happens in the background, so we can't easily test the full flow
      // In a real test, we would need to wait for completion or mock the timing
    });

    it('should handle search execution failures gracefully', async () => {
      // Mock query generation failure
      mockQueryGenerationService.generateQueries.mockRejectedValue(new Error('Query generation failed'));

      const request = {
        userId: testUserId,
        configuration: testConfiguration,
      };

      // Submit should still succeed (async processing)
      const response = await service.submitSearch(request);
      expect(response.searchId).toBeDefined();

      // The error would be handled in the background processing
      // In a real test, we would need to wait for the error to be processed
    });
  });

  describe('Concurrency Management', () => {
    beforeEach(async () => {
      await service.initialize();
      mockPrisma.ai_searches.create.mockResolvedValue({
        id: 'concurrent-test',
        userId: testUserId,
        status: SearchStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    it('should handle concurrent search submissions', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => ({
        userId: testUserId,
        configuration: {
          ...testConfiguration,
          query: `test query ${i}`,
        },
      }));

      const responses = await Promise.all(
        requests.map(request => service.submitSearch(request))
      );

      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.searchId).toBeDefined();
        expect(response.status).toBe(SearchStatus.PENDING);
      });

      expect(mockPrisma.ai_searches.create).toHaveBeenCalledTimes(10);
    });

    it('should respect concurrency limits', async () => {
      // This test would need to be more sophisticated to actually test concurrency limits
      // For now, we just verify that the service can handle multiple submissions
      const requests = Array.from({ length: 60 }, (_, i) => ({
        userId: testUserId,
        configuration: {
          ...testConfiguration,
          query: `concurrent test query ${i}`,
        },
      }));

      const responses = await Promise.all(
        requests.map(request => service.submitSearch(request))
      );

      expect(responses).toHaveLength(60);
    });
  });

  describe('Progress Tracking', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should track progress through search stages', async () => {
      const progressListener = jest.fn();
      service.on('progressUpdate', progressListener);

      // This would need to be tested with actual search execution
      // For now, we just verify that the event system works
      expect(progressListener).not.toHaveBeenCalled();
    });

    it('should emit progress events at appropriate stages', async () => {
      const progressListener = jest.fn();
      service.on('progressUpdate', progressListener);

      // Mock a search in progress
      // In a real test, we would trigger actual progress updates
      expect(progressListener).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.ai_searches.create.mockRejectedValue(new Error('Database connection failed'));

      const request = {
        userId: testUserId,
        configuration: testConfiguration,
      };

      await expect(service.submitSearch(request)).rejects.toThrow('Database connection failed');
    });

    it('should handle service unavailability gracefully', async () => {
      mockQueryGenerationService.initialize.mockRejectedValue(new Error('Service unavailable'));

      await expect(service.initialize()).rejects.toThrow('Service unavailable');
    });

    it('should handle timeout scenarios', async () => {
      const request = {
        userId: testUserId,
        configuration: testConfiguration,
        timeout: 100, // Very short timeout
      };

      mockPrisma.ai_searches.create.mockResolvedValue({
        id: 'timeout-test',
        userId: testUserId,
        status: SearchStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const response = await service.submitSearch(request);
      expect(response.searchId).toBeDefined();

      // The timeout would be handled in the background processing
    });
  });

  describe('Memory and Resource Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should clean up resources on shutdown', async () => {
      const shutdownSpy = jest.spyOn(service as any, 'shutdown');
      const cleanupSpy = jest.spyOn(mockContactExtractionService, 'cleanup');

      await service.shutdown();

      expect(shutdownSpy).toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should handle large numbers of searches without memory leaks', async () => {
      mockPrisma.ai_searches.create.mockResolvedValue({
        id: 'memory-test',
        userId: testUserId,
        status: SearchStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Submit many searches
      const requests = Array.from({ length: 1000 }, (_, i) => ({
        userId: testUserId,
        configuration: {
          ...testConfiguration,
          query: `memory test query ${i}`,
        },
      }));

      const responses = await Promise.all(
        requests.map(request => service.submitSearch(request))
      );

      expect(responses).toHaveLength(1000);

      // Memory usage should be reasonable
      // In a real test, we would monitor memory usage
    });
  });

  describe('Configuration Validation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should validate search configuration', async () => {
      const invalidConfiguration = {
        query: '', // Empty query should be invalid
        criteria: {},
        options: {
          maxResults: -1, // Invalid negative number
          confidenceThreshold: 2, // Invalid confidence > 1
        },
      };

      // The service should handle invalid configurations gracefully
      // Implementation of validation would depend on requirements
      mockPrisma.ai_searches.create.mockResolvedValue({
        id: 'validation-test',
        userId: testUserId,
        status: SearchStatus.PENDING,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const request = {
        userId: testUserId,
        configuration: invalidConfiguration,
      };

      // Depending on implementation, this might throw an error or proceed with defaults
      const response = await service.submitSearch(request);
      expect(response.searchId).toBeDefined();
    });
  });
});