/**
 * AI Search Orchestration API Endpoints Integration Tests
 * Tests the complete request/response cycle for AI search orchestration functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/ai/search/orchestration/route';
import { testFixtures, testUsers } from '../config/test-config';

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: {
      id: testUsers.user.id,
      email: testUsers.user.email,
      name: testUsers.user.name,
      role: testUsers.user.role
    }
  }))
}));

// Mock dependencies
jest.mock('@/lib/ai/search-orchestration', () => ({
  SearchOrchestrationService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    submitSearch: jest.fn().mockResolvedValue({
      searchId: 'test-search-id-123',
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString()
    }),
    getSearchStatus: jest.fn().mockResolvedValue({
      searchId: 'test-search-id-123',
      status: 'processing',
      progress: 45,
      results: [],
      contacts: [],
      metrics: {
        totalQueries: 5,
        completedQueries: 2,
        averageConfidence: 0.85
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    cancelSearch: jest.fn().mockResolvedValue({
      searchId: 'test-search-id-123',
      success: true,
      message: 'Search cancelled successfully',
      cancelledAt: new Date().toISOString()
    }),
    getSearchStatistics: jest.fn().mockResolvedValue({
      totalSearches: 25,
      successfulSearches: 22,
      failedSearches: 3,
      averageProcessingTime: 120000,
      totalContactsFound: 150,
      averageConfidenceScore: 0.82
    }),
    getHealthStatus: jest.fn().mockResolvedValue({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      activeSearches: 3,
      queueSize: 1,
      errorRate: 0.04,
      averageResponseTime: 850,
      services: {
        database: 'healthy',
        redis: 'healthy',
        external_apis: 'healthy'
      },
      metrics: {
        responseTime: 850,
        activeSearches: 3,
        queueSize: 1,
        errorRate: 0.04
      }
    })
  }))
}));

jest.mock('@/app/api/ai/shared/logger', () => ({
  AILogger: {
    logBusiness: jest.fn().mockResolvedValue(undefined),
    logPerformance: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('AI Search Orchestration API Endpoints Integration', () => {
  describe('POST /api/ai/search/orchestration', () => {
    let correlationId: string;

    beforeEach(() => {
      correlationId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      jest.clearAllMocks();
    });

    it('should submit a new search request successfully', async () => {
      // Arrange
      const searchRequest = {
        query: 'AI technology journalists',
        countries: ['US', 'UK'],
        categories: ['technology'],
        beats: ['AI', 'technology'],
        languages: ['English'],
        maxResults: 20,
        maxContactsPerSource: 5,
        confidenceThreshold: 0.7,
        enableAIEnhancement: true,
        enableContactExtraction: true,
        enableContentScraping: true,
        priority: 'normal',
        trackProgress: true
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(searchRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.searchId).toBe('test-search-id-123');
      expect(data.data.status).toBe('pending');
      expect(data.data.progress).toBe(0);
      expect(data.data.createdAt).toBeRecent();
      expect(data.data.estimatedDuration).toBeDefined();
      expect(data.data.estimatedDuration.min).toBe(30000);
      expect(data.data.estimatedDuration.max).toBe(300000);
      expect(data).toHaveCorrelationId();
    });

    it('should handle complex search criteria', async () => {
      // Arrange
      const complexSearchRequest = {
        query: 'healthcare innovation reporters',
        countries: ['US', 'Canada', 'UK'],
        categories: ['healthcare', 'technology'],
        beats: ['healthcare', 'innovation'],
        languages: ['English', 'Spanish'],
        domains: ['reuters.com', 'bloomberg.com'],
        excludeDomains: ['spam.com'],
        dateRange: {
          from: '2024-01-01',
          to: '2024-12-31'
        },
        safeSearch: true,
        maxResults: 50,
        maxContactsPerSource: 10,
        confidenceThreshold: 0.8,
        enableAIEnhancement: true,
        enableContactExtraction: true,
        enableContentScraping: false,
        strictValidation: true,
        processingTimeout: 180000,
        priority: 'high'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(complexSearchRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      
      // Verify the orchestration service was called with correct parameters
      const { SearchOrchestrationService } = require('@/lib/ai/search-orchestration');
      const mockService = SearchOrchestrationService.mock.instances[0];
      expect(mockService.submitSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUsers.user.id,
          configuration: expect.objectContaining({
            query: 'healthcare innovation reporters',
            criteria: expect.objectContaining({
              countries: ['US', 'Canada', 'UK'],
              categories: ['healthcare', 'technology'],
              beats: ['healthcare', 'innovation'],
              languages: ['English', 'Spanish'],
              domains: ['reuters.com', 'bloomberg.com'],
              excludeDomains: ['spam.com'],
              dateRange: {
                from: '2024-01-01',
                to: '2024-12-31'
              },
              safeSearch: true
            }),
            options: expect.objectContaining({
              maxResults: 50,
              maxContactsPerSource: 10,
              confidenceThreshold: 0.8,
              enableAIEnhancement: true,
              enableContactExtraction: true,
              enableContentScraping: false,
              strictValidation: true,
              processingTimeout: 180000,
              priority: 'high'
            })
          }),
          priority: 'high',
          timeout: undefined
        })
      );
    });

    it('should handle invalid search request', async () => {
      // Arrange
      const invalidRequest = {
        query: '', // Empty query
        countries: 'invalid-countries', // Should be array
        maxResults: -1 // Invalid negative number
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(invalidRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
    });

    it('should handle service failures during search submission', async () => {
      // Arrange
      const { SearchOrchestrationService } = require('@/lib/ai/search-orchestration');
      SearchOrchestrationService.mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        submitSearch: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      }));

      const searchRequest = testFixtures.searchQueries[0];
      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(searchRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Service unavailable');
    });
  });

  describe('GET /api/ai/search/orchestration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return search status for valid search ID', async () => {
      // Arrange
      const searchId = 'test-search-id-123';
      const request = new NextRequest(`http://localhost:3000/api/ai/search/orchestration?searchId=${searchId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.searchId).toBe(searchId);
      expect(data.data.status).toBe('processing');
      expect(data.data.progress).toBe(45);
      expect(data.data.results).toEqual([]);
      expect(data.data.contacts).toEqual([]);
      expect(data.data.metrics).toBeDefined();
      expect(data.data.createdAt).toBeRecent();
      expect(data.data.updatedAt).toBeRecent();
    });

    it('should return search statistics', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=statistics', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.totalSearches).toBe(25);
      expect(data.data.successfulSearches).toBe(22);
      expect(data.data.failedSearches).toBe(3);
      expect(data.data.averageProcessingTime).toBe(120000);
      expect(data.data.totalContactsFound).toBe(150);
      expect(data.data.averageConfidenceScore).toBe(0.82);
    });

    it('should return health status', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=health', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.orchestration.status).toBe('healthy');
      expect(data.data.orchestration.activeSearches).toBe(3);
      expect(data.data.orchestration.queueSize).toBe(1);
      expect(data.data.orchestration.errorRate).toBe(0.04);
      expect(data.data.orchestration.averageResponseTime).toBe(850);
      expect(data.data.services.database).toBe('healthy');
      expect(data.data.services.redis).toBe('healthy');
      expect(data.data.services.external_apis).toBe('healthy');
    });

    it('should return active searches', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=active&limit=10&stage=processing', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.searches).toEqual([]);
      expect(data.data.total).toBe(0);
      expect(data.data.limit).toBe(10);
      expect(data.data.stage).toBe('processing');
    });

    it('should handle missing search ID', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('searchId is required');
    });

    it('should handle non-existent search ID', async () => {
      // Arrange
      const { SearchOrchestrationService } = require('@/lib/ai/search-orchestration');
      SearchOrchestrationService.mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        getSearchStatus: jest.fn().mockResolvedValue(null)
      }));

      const nonExistentId = 'non-existent-search-id';
      const request = new NextRequest(`http://localhost:3000/api/ai/search/orchestration?searchId=${nonExistentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Search not found');
    });
  });

  describe('DELETE /api/ai/search/orchestration', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should cancel a search successfully', async () => {
      // Arrange
      const searchId = 'test-search-id-123';
      const reason = 'User requested cancellation';
      const request = new NextRequest(`http://localhost:3000/api/ai/search/orchestration?searchId=${searchId}&reason=${encodeURIComponent(reason)}&action=cancel`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await DELETE(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.searchId).toBe(searchId);
      expect(data.data.cancelled).toBe(true);
      expect(data.data.message).toBe('Search cancelled successfully');
      expect(data.data.cancelledAt).toBeRecent();
    });

    it('should handle cancellation of non-existent search', async () => {
      // Arrange
      const { SearchOrchestrationService } = require('@/lib/ai/search-orchestration');
      SearchOrchestrationService.mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        cancelSearch: jest.fn().mockResolvedValue({
          searchId: 'non-existent-id',
          success: false,
          message: 'Search not found',
          cancelledAt: new Date().toISOString()
        })
      }));

      const nonExistentId = 'non-existent-search-id';
      const request = new NextRequest(`http://localhost:3000/api/ai/search/orchestration?searchId=${nonExistentId}&action=cancel`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await DELETE(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(false); // Failed cancellation
      expect(data.data.cancelled).toBe(false);
    });

    it('should handle missing search ID in cancellation', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=cancel', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await DELETE(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('searchId is required');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent search submissions', async () => {
      // Arrange
      const searchRequests = Array.from({ length: 5 }, (_, i) => {
        const request = {
          query: `test search ${i}`,
          countries: ['US'],
          categories: ['technology'],
          maxResults: 10
        };
        
        return new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `concurrent-submit-${i}`
          },
          body: JSON.stringify(request)
        });
      });

      // Act
      const startTime = Date.now();
      const responses = await Promise.allSettled(searchRequests.map(req => POST(req)));
      const endTime = Date.now();

      // Assert
      expect(responses).toHaveLength(5);
      const successfulResponses = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 202
      );
      expect(successfulResponses.length).toBe(5);

      // Should complete in reasonable time (concurrent execution)
      expect(endTime - startTime).toBeLessThan(5000);

      // Each response should have unique search ID
      const searchIds = await Promise.all(
        successfulResponses.map(async (r) => {
          const data = await (r as PromiseFulfilledResult<Response>).value.json();
          return data.data.searchId;
        })
      );
      const uniqueIds = new Set(searchIds);
      expect(uniqueIds.size).toBe(5);
    });

    it('should handle concurrent status checks', async () => {
      // Arrange
      const searchId = 'test-search-id-123';
      const statusRequests = Array.from({ length: 10 }, (_, i) =>
        new NextRequest(`http://localhost:3000/api/ai/search/orchestration?searchId=${searchId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `concurrent-status-${i}`
          }
        })
      );

      // Act
      const startTime = Date.now();
      const responses = await Promise.allSettled(statusRequests.map(req => GET(req)));
      const endTime = Date.now();

      // Assert
      expect(responses).toHaveLength(10);
      const successfulResponses = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 200
      );
      expect(successfulResponses.length).toBe(10);

      // Should complete quickly (concurrent execution)
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=health', {
        method: 'GET',
        headers: {
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
    });

    it('should include proper correlation ID in responses', async () => {
      // Arrange
      const correlationId = 'custom-correlation-id-123';
      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=health', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        }
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.correlationId).toBe(correlationId);
      expect(response.headers.get('X-Correlation-ID')).toBe(correlationId);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON in POST requests', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: 'invalid-json{'
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
    });

    it('should handle oversized requests', async () => {
      // Arrange
      const largeQuery = 'x'.repeat(10000); // Very long query
      const largeFilters = {
        beats: Array.from({ length: 100 }, (_, i) => `beat-${i}`)
      };
      
      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify({
          query: largeQuery,
          filters: largeFilters
        })
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.error).toContain('too large');
    });

    it('should handle invalid action parameters', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search/orchestration?action=invalid', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid request');
    });
  });
});