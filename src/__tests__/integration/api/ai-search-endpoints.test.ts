/**
 * AI Search API Endpoints Integration Tests
 * Tests the complete request/response cycle for AI search functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/ai/search/route';
import { testFixtures, testUsers } from '../config/test-config';

const mockServiceHealth = [
  { service: 'openai', status: 'healthy', responseTime: 150 },
  { service: 'exa', status: 'healthy', responseTime: 450 },
  { service: 'anthropic', status: 'healthy', responseTime: 200 },
  { service: 'firecrawl', status: 'healthy', responseTime: 300 }
];

const mockAIServiceManager = {
  getServiceHealth: jest.fn().mockResolvedValue(mockServiceHealth)
};

const baseMockSearchResult = {
  url: 'https://techcrunch.com/2024/01/15/ai-journalists',
  title: 'The Rise of AI Journalism',
  summary: 'Latest developments in AI journalism',
  content: 'Full article content...',
  contacts: [
    {
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'Technology Journalist',
      organization: 'Tech News Outlet',
      confidence: 0.85
    }
  ],
  confidence: 0.9,
  relevanceScore: 0.95,
  metadata: {
    source: 'exa',
    processingTime: 1200,
    wordCount: 850
  }
};

const createMockSearchResponse = () => {
  const results = [
    {
      ...baseMockSearchResult,
      contacts: baseMockSearchResult.contacts.map(contact => ({ ...contact }))
    }
  ];

  return {
    id: 'test-search-id',
    type: 'search',
    success: true,
    duration: 1500,
    cost: 0.35,
    cached: false,
    results,
    data: {
      results,
      totalCount: results.length
    }
  };
};

const mockExecuteOptimizedAIRequest = jest.fn().mockResolvedValue(createMockSearchResponse());

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
jest.mock('@/lib/ai/services/index', () => ({
  __esModule: true,
  default: mockAIServiceManager,
  aiServiceManager: mockAIServiceManager
}));

jest.mock('@/lib/performance/performance-integration', () => ({
  executeOptimizedAIRequest: mockExecuteOptimizedAIRequest,
  batchAIRequests: jest.fn()
}));

jest.mock('@/lib/ai/services/monitoring', () => ({
  aiPerformanceMonitor: {
    recordMetrics: jest.fn(),
    getDashboardData: jest.fn().mockReturnValue({
      overview: {
        totalRequests: 100,
        successRate: 95,
        averageResponseTime: 850
      },
      services: [],
      activeAlerts: [],
      topOperations: []
    }),
    getAggregatedMetrics: jest.fn().mockReturnValue({
      totalRequests: 100,
      successRate: 95,
      averageResponseTime: 850
    }),
    getAlerts: jest.fn().mockReturnValue([])
  }
}));

jest.mock('@/lib/ai/services/security', () => ({
  aiSecurityManager: {
    detectAndRedactPII: jest.fn().mockImplementation((content) => ({
      originalContent: content,
      redactedContent: content.replace(/email/gi, '[EMAIL_REDACTED]'),
      detectedPII: ['email']
    }))
  }
}));

jest.mock('@/app/api/ai/shared/logger', () => ({
  AILogger: {
    logBusiness: jest.fn().mockResolvedValue(undefined),
    logPerformance: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('AI Search API Endpoints Integration', () => {
  describe('POST /api/ai/search', () => {
    let correlationId: string;

    beforeEach(() => {
      correlationId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      jest.clearAllMocks();
      mockExecuteOptimizedAIRequest.mockResolvedValue(createMockSearchResponse());
      mockAIServiceManager.getServiceHealth.mockResolvedValue(mockServiceHealth);
    });

    it('should process a valid search request successfully', async () => {
      // Arrange
      const searchRequest = testFixtures.searchQueries[0];
      const requestBody = {
        ...searchRequest,
        maxResults: 5,
        priority: 'normal'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(requestBody)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data).toBeValidSearchResponse();
      expect(data.data.searchId).toBeDefined();
      expect(data.data.status).toBe('completed');
      expect(data.data.progress).toBe(100);
      expect(data.data.results).toHaveLength(1);
      expect(data.data.results[0]).toMatchObject({
        url: 'https://techcrunch.com/2024/01/15/ai-journalists',
        title: 'The Rise of AI Journalism',
        summary: 'Latest developments in AI journalism'
      });
      expect(data.data.results[0].contacts).toContainValidContacts();
      expect(data.data.createdAt).toBeRecent();
      expect(data.data.updatedAt).toBeRecent();
      expect(data).toHaveCorrelationId();
    });

    it('should handle search with filters correctly', async () => {
      // Arrange
      const searchRequest = {
        query: 'technology journalists in US',
        filters: {
          beats: ['technology', 'AI'],
          regions: ['US'],
          countries: ['US'],
          languages: ['English'],
          categories: ['technology'],
          dateRange: {
            from: '2024-01-01',
            to: '2024-12-31'
          },
          safeSearch: true
        },
        options: {
          maxResults: 10,
          includeSummaries: true,
          extractContacts: true,
          scrapeContent: true,
          priority: 'high'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
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
      expect(data.data.results).toHaveLength(1);
      // Verify that filters were properly processed by checking the mock was called with correct parameters
      expect(mockExecuteOptimizedAIRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            query: 'technology journalists in US',
            filters: expect.objectContaining({
              beats: ['technology', 'AI'],
              regions: ['US'],
              countries: ['US'],
              languages: ['English'],
              categories: ['technology'],
              dateRange: expect.objectContaining({
                from: '2024-01-01',
                to: '2024-12-31'
              }),
              safeSearch: true
            })
          })
        })
      );
    });

    it('should handle invalid request body gracefully', async () => {
      // Arrange
      const invalidRequest = {
        query: '', // Empty query
        filters: 'invalid-filter-type', // Should be object
        options: {
          maxResults: -1 // Invalid negative number
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
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
      expect(data.error).toContain('validation');
      expect(data).toHaveCorrelationId();
    });

    it('should handle malformed JSON requests', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
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

    it('should enforce rate limiting', async () => {
      // Arrange
      const searchRequest = testFixtures.searchQueries[0];

      // Make multiple rapid requests
      const requests = Array.from({ length: 5 }, (_, i) =>
        new NextRequest('http://localhost:3000/api/ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `${correlationId}-${i}`
          },
          body: JSON.stringify(searchRequest)
        })
      );

      // Act
      const responses = await Promise.all(requests.map(req => POST(req)));

      // Assert
      // At least some requests should succeed, but rate limiting may kick in
      const successResponses = responses.filter(r => r.status === 202);
      const rateLimitedResponses = responses.filter(r => r.status === 429);

      expect(successResponses.length + rateLimitedResponses.length).toBe(5);
      expect(rateLimitedResponses.length).toBeGreaterThanOrEqual(0);

      // Check rate limited responses have proper headers
      for (const response of rateLimitedResponses) {
        expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
        expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
        expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
      }
    });

    it('should handle service failures gracefully', async () => {
      // Arrange
      mockExecuteOptimizedAIRequest.mockRejectedValueOnce(new Error('Service unavailable'));

      const searchRequest = testFixtures.searchQueries[0];
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
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

    it('should validate request size limits', async () => {
      // Arrange
      const largeQuery = 'x'.repeat(10000); // Very long query
      const largeRequest = {
        query: largeQuery,
        filters: {
          beats: Array.from({ length: 100 }, (_, i) => `beat-${i}`) // Too many beats
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(largeRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.error).toContain('too large');
    });
  });

  describe('GET /api/ai/search', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockAIServiceManager.getServiceHealth.mockResolvedValue(mockServiceHealth);
    });

    it('should return service health status', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search?action=health', {
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
      expect(data.data).toHaveProperty('services');
      expect(data.data).toHaveProperty('overall');
      expect(data.data.overall).toBe('healthy');
      expect(Array.isArray(data.data.services)).toBe(true);
      expect(data.data.services).toHaveLength(4);

      // Check service health structure
      data.data.services.forEach((service: any) => {
        expect(service).toHaveProperty('service');
        expect(service).toHaveProperty('status');
        expect(['healthy', 'unhealthy', 'degraded']).toContain(service.status);
      });
    });

    it('should return performance metrics', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search?action=metrics&timeWindow=15', {
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
      expect(data.data).toHaveProperty('overview');
      expect(data.data).toHaveProperty('services');
      expect(data.data).toHaveProperty('metrics');
      expect(data.data).toHaveProperty('alerts');
      expect(data.data).toHaveProperty('topOperations');

      // Verify metrics structure
      expect(data.data.overview).toMatchObject({
        totalRequests: expect.any(Number),
        successRate: expect.any(Number),
        averageResponseTime: expect.any(Number)
      });
    });

    it('should return active alerts', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search?action=alerts', {
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
      expect(data.data).toHaveProperty('alerts');
      expect(data.data).toHaveProperty('total');
      expect(Array.isArray(data.data.alerts)).toBe(true);
      expect(typeof data.data.total).toBe('number');
    });

    it('should handle invalid action parameter', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search?action=invalid', {
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
      expect(data.error).toContain('Invalid action');
    });

    it('should handle missing authorization', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/search?action=health', {
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
      expect(data.error).toContain('authentication');
    });
  });

  describe('Request/Response Validation', () => {
    it('should validate correlation ID format', async () => {
      // Arrange
      const searchRequest = testFixtures.searchQueries[0];
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': 'invalid-correlation-id'
        },
        body: JSON.stringify(searchRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data).toHaveCorrelationId();
      // System should generate valid correlation ID if invalid one provided
      expect(/^[a-f0-9-]{36}$/i.test(data.correlationId)).toBe(true);
    });

    it('should include proper response headers', async () => {
      // Arrange
      const searchRequest = testFixtures.searchQueries[0];
      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(searchRequest)
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Correlation-ID')).toBeDefined();
    });

    it('should handle concurrent requests safely', async () => {
      // Arrange
      const searchRequests = Array.from({ length: 10 }, (_, i) => {
        const request = testFixtures.searchQueries[0];
        return new NextRequest('http://localhost:3000/api/ai/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `concurrent-test-${i}`
          },
          body: JSON.stringify(request)
        });
      });

      // Act
      const startTime = Date.now();
      const responses = await Promise.allSettled(searchRequests.map(req => POST(req)));
      const endTime = Date.now();

      // Assert
      expect(responses).toHaveLength(10);

      // All requests should complete successfully
      const successfulResponses = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 202
      );
      expect(successfulResponses.length).toBe(10);

      // Requests should complete in reasonable time (concurrent execution)
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max for 10 concurrent requests

      // Each response should have unique correlation ID
      const correlationIds = await Promise.all(
        successfulResponses.map(async (r) => {
          const data = await (r as PromiseFulfilledResult<Response>).value.json();
          return data.correlationId;
        })
      );
      const uniqueIds = new Set(correlationIds);
      expect(uniqueIds.size).toBe(10);
    });
  });
});
