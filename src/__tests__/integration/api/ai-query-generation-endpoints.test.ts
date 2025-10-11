/**
 * AI Query Generation API Endpoints Integration Tests
 * Tests the complete request/response cycle for AI query generation functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/ai/query-generation/route';
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
jest.mock('@/lib/ai/query-generation', () => ({
  QueryGenerationService: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    generateQueries: jest.fn().mockResolvedValue({
      searchId: 'test-search-id-123',
      batchId: 'test-batch-id-456',
      originalQuery: 'AI technology journalists',
      queries: [
        {
          id: 'query-1',
          generatedQuery: 'AI technology journalists in United States',
          queryType: 'enhanced',
          scores: {
            relevance: 0.95,
            diversity: 0.85,
            specificity: 0.90
          },
          metadata: {
            enhancementType: 'geographic',
            confidence: 0.92,
            estimatedResults: 1500
          },
          criteria: {
            countries: ['US'],
            languages: ['English']
          }
        },
        {
          id: 'query-2',
          generatedQuery: 'artificial intelligence reporters tech media',
          queryType: 'synonym',
          scores: {
            relevance: 0.88,
            diversity: 0.92,
            specificity: 0.75
          },
          metadata: {
            enhancementType: 'synonym',
            confidence: 0.85,
            estimatedResults: 2200
          },
          criteria: {
            beats: ['technology', 'AI'],
            categories: ['technology']
          }
        }
      ],
      metrics: {
        totalGenerated: 2,
        totalDuplicates: 0,
        averageScore: 0.915,
        processingTimeMs: 1250,
        status: 'completed'
      },
      status: 'completed',
      errors: []
    }),
    getStats: jest.fn().mockResolvedValue({
      totalQueriesGenerated: 1250,
      averageProcessingTime: 1350,
      averageRelevanceScore: 0.87,
      templateUsage: {
        geographic: 450,
        synonym: 380,
        temporal: 220,
        topical: 200
      },
      languageDistribution: {
        English: 850,
        Spanish: 200,
        French: 100,
        German: 100
      },
      templateStats: {
        geographic: {
          count: 450,
          averageScore: 0.89,
          averageConfidence: 0.85
        },
        synonym: {
          count: 380,
          averageScore: 0.86,
          averageConfidence: 0.82
        },
        temporal: {
          count: 220,
          averageScore: 0.91,
          averageConfidence: 0.88
        },
        topical: {
          count: 200,
          averageScore: 0.88,
          averageConfidence: 0.84
        }
      }
    }),
    getConfig: jest.fn().mockResolvedValue({
      maxQueries: 20,
      diversityThreshold: 0.7,
      minRelevanceScore: 0.3,
      enableAIEnhancement: true,
      fallbackStrategies: true,
      cacheEnabled: true,
      defaultPriority: 'medium',
      timeoutMs: 30000
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

describe('AI Query Generation API Endpoints Integration', () => {
  describe('POST /api/ai/query-generation', () => {
    let correlationId: string;

    beforeEach(() => {
      correlationId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      jest.clearAllMocks();
    });

    it('should generate queries successfully with basic parameters', async () => {
      // Arrange
      const queryRequest = {
        query: 'AI technology journalists',
        criteria: {
          countries: ['US', 'UK'],
          categories: ['technology'],
          beats: ['AI', 'technology']
        },
        options: {
          maxQueries: 10,
          diversityThreshold: 0.7,
          minRelevanceScore: 0.3,
          enableAIEnhancement: true,
          fallbackStrategies: true,
          cacheEnabled: true,
          priority: 'medium'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.searchId).toBe('test-search-id-123');
      expect(data.data.batchId).toBe('test-batch-id-456');
      expect(data.data.originalQuery).toBe('AI technology journalists');
      expect(data.data.queries).toHaveLength(2);
      expect(data.data.queries[0].generatedQuery).toBe('AI technology journalists in United States');
      expect(data.data.queries[0].queryType).toBe('enhanced');
      expect(data.data.queries[0].scores.relevance).toBe(0.95);
      expect(data.data.queries[0].metadata.enhancementType).toBe('geographic');
      expect(data.data.metrics.totalGenerated).toBe(2);
      expect(data.data.metrics.averageScore).toBe(0.915);
      expect(data.data.status).toBe('completed');
      expect(data).toHaveCorrelationId();
    });

    it('should handle complex query generation criteria', async () => {
      // Arrange
      const complexRequest = {
        searchId: 'existing-search-id',
        query: 'healthcare innovation reporters',
        criteria: {
          countries: ['US', 'Canada', 'UK', 'Germany'],
          categories: ['healthcare', 'technology', 'innovation'],
          beats: ['healthcare', 'innovation', 'medical'],
          languages: ['English', 'Spanish', 'German'],
          topics: ['digital health', 'medical technology', 'healthcare AI'],
          outlets: ['reuters.com', 'bloomberg.com', 'statnews.com'],
          regions: ['North America', 'Europe'],
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-12-31'
          }
        },
        options: {
          maxQueries: 15,
          diversityThreshold: 0.8,
          minRelevanceScore: 0.4,
          enableAIEnhancement: true,
          fallbackStrategies: true,
          cacheEnabled: false,
          priority: 'high'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(complexRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      
      // Verify the query generation service was called with correct parameters
      const { QueryGenerationService } = require('@/lib/ai/query-generation');
      const mockService = QueryGenerationService.mock.instances[0];
      expect(mockService.generateQueries).toHaveBeenCalledWith(
        expect.objectContaining({
          searchId: 'existing-search-id',
          originalQuery: 'healthcare innovation reporters',
          criteria: expect.objectContaining({
            countries: ['US', 'Canada', 'UK', 'Germany'],
            categories: ['healthcare', 'technology', 'innovation'],
            beats: ['healthcare', 'innovation', 'medical'],
            languages: ['English', 'Spanish', 'German'],
            topics: ['digital health', 'medical technology', 'healthcare AI'],
            outlets: ['reuters.com', 'bloomberg.com', 'statnews.com'],
            regions: ['North America', 'Europe'],
            dateRange: {
              startDate: '2024-01-01',
              endDate: '2024-12-31'
            }
          }),
          options: expect.objectContaining({
            maxQueries: 15,
            diversityThreshold: 0.8,
            minRelevanceScore: 0.4,
            enableAIEnhancement: true,
            fallbackStrategies: true,
            cacheEnabled: false,
            priority: 'high'
          }),
          userId: testUsers.user.id
        })
      );
    });

    it('should handle minimal query generation request', async () => {
      // Arrange
      const minimalRequest = {
        query: 'tech reporters'
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(minimalRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.queries).toBeDefined();
      expect(data.data.metrics).toBeDefined();
    });

    it('should handle invalid query generation request', async () => {
      // Arrange
      const invalidRequest = {
        query: '', // Empty query
        criteria: 'invalid-criteria', // Should be object
        options: {
          maxQueries: -1, // Invalid negative number
          diversityThreshold: 1.5 // Invalid > 1
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
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
      expect(data.error).toBeDefined();
    });

    it('should handle service failures during query generation', async () => {
      // Arrange
      const { QueryGenerationService } = require('@/lib/ai/query-generation');
      QueryGenerationService.mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        generateQueries: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      }));

      const queryRequest = {
        query: 'AI technology journalists',
        options: { maxQueries: 10 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('QUERY_GENERATION_FAILED');
    });

    it('should handle specific query generation errors', async () => {
      // Arrange
      const { QueryGenerationService, QueryGenerationError } = require('@/lib/ai/query-generation');
      QueryGenerationService.mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        generateQueries: jest.fn().mockRejectedValue(
          new QueryGenerationError('Insufficient query complexity', 'LOW_COMPLEXITY', 'validation')
        )
      }));

      const queryRequest = {
        query: 'a', // Too simple
        options: { maxQueries: 10 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('LOW_COMPLEXITY');
      expect(data.error.message).toContain('Insufficient query complexity');
      expect(data.error.type).toBe('validation');
    });
  });

  describe('GET /api/ai/query-generation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return service health status', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/query-generation?action=health', {
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
      expect(data.data.service).toBe('query-generation');
      expect(data.data.status).toBe('healthy');
      expect(data.data.version).toBe('1.0.0');
      expect(data.data.uptime).toBeGreaterThan(0);
      expect(data.data.timestamp).toBeRecent();
      expect(data.data.statistics).toBeDefined();
    });

    it('should return template statistics', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/query-generation?action=templates', {
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
      expect(data.data.templates).toBeDefined();
      expect(data.data.templates.geographic).toBeDefined();
      expect(data.data.templates.synonym).toBeDefined();
      expect(data.data.templates.temporal).toBeDefined();
      expect(data.data.templates.topical).toBeDefined();
    });

    it('should return service configuration', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/query-generation?action=config', {
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
      expect(data.data.config).toBeDefined();
      expect(data.data.config.maxQueries).toBe(20);
      expect(data.data.config.diversityThreshold).toBe(0.7);
      expect(data.data.config.minRelevanceScore).toBe(0.3);
      expect(data.data.config.enableAIEnhancement).toBe(true);
      expect(data.data.config.fallbackStrategies).toBe(true);
      expect(data.data.config.cacheEnabled).toBe(true);
      expect(data.data.config.defaultPriority).toBe('medium');
      expect(data.data.config.timeoutMs).toBe(30000);
    });

    it('should handle invalid action parameter', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/query-generation?action=invalid', {
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

    it('should handle missing authentication', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/query-generation?action=health', {
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

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent query generation requests', async () => {
      // Arrange
      const queryRequests = Array.from({ length: 5 }, (_, i) => {
        const request = {
          query: `test query ${i}`,
          criteria: {
            countries: ['US'],
            categories: ['technology']
          },
          options: {
            maxQueries: 5,
            priority: 'normal'
          }
        };
        
        return new NextRequest('http://localhost:3000/api/ai/query-generation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `concurrent-query-${i}`
          },
          body: JSON.stringify(request)
        });
      });

      // Act
      const startTime = Date.now();
      const responses = await Promise.allSettled(queryRequests.map(req => POST(req)));
      const endTime = Date.now();

      // Assert
      expect(responses).toHaveLength(5);
      const successfulResponses = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 200
      );
      expect(successfulResponses.length).toBe(5);

      // Should complete in reasonable time (concurrent execution)
      expect(endTime - startTime).toBeLessThan(5000);

      // Each response should have unique batch ID
      const batchIds = await Promise.all(
        successfulResponses.map(async (r) => {
          const data = await (r as PromiseFulfilledResult<Response>).value.json();
          return data.data.batchId;
        })
      );
      const uniqueIds = new Set(batchIds);
      expect(uniqueIds.size).toBe(5);
    });

    it('should handle concurrent status checks', async () => {
      // Arrange
      const statusRequests = Array.from({ length: 10 }, (_, i) =>
        new NextRequest('http://localhost:3000/api/ai/query-generation?action=health', {
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

  describe('Request/Response Validation', () => {
    it('should validate correlation ID format', async () => {
      // Arrange
      const queryRequest = {
        query: 'test query',
        options: { maxQueries: 5 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': 'invalid-correlation-id'
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toHaveCorrelationId();
      // System should generate valid correlation ID if invalid one provided
      expect(/^[a-f0-9-]{36}$/i.test(data.correlationId)).toBe(true);
    });

    it('should include proper response headers', async () => {
      // Arrange
      const queryRequest = {
        query: 'test query',
        options: { maxQueries: 5 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await POST(request);

      // Assert
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('X-Correlation-ID')).toBeDefined();
    });

    it('should handle query length limits', async () => {
      // Arrange
      const longQuery = 'x'.repeat(1000); // At the limit
      const queryRequest = {
        query: longQuery,
        options: { maxQueries: 5 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
    });

    it('should reject queries that are too long', async () => {
      // Arrange
      const tooLongQuery = 'x'.repeat(1001); // Over the limit
      const queryRequest = {
        query: tooLongQuery,
        options: { maxQueries: 5 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('too long');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON in POST requests', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
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
      const largeCriteria = {
        countries: Array.from({ length: 100 }, (_, i) => `country-${i}`),
        categories: Array.from({ length: 100 }, (_, i) => `category-${i}`),
        beats: Array.from({ length: 100 }, (_, i) => `beat-${i}`),
        languages: Array.from({ length: 100 }, (_, i) => `language-${i}`),
        topics: Array.from({ length: 100 }, (_, i) => `topic-${i}`),
        outlets: Array.from({ length: 100 }, (_, i) => `outlet-${i}`),
        regions: Array.from({ length: 100 }, (_, i) => `region-${i}`)
      };

      const queryRequest = {
        query: 'test query',
        criteria: largeCriteria,
        options: { maxQueries: 50 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.error).toContain('too large');
    });

    it('should handle service timeouts', async () => {
      // Arrange
      const { QueryGenerationService } = require('@/lib/ai/query-generation');
      QueryGenerationService.mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(undefined),
        generateQueries: jest.fn().mockImplementation(() => 
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 100)
          )
        )
      }));

      const queryRequest = {
        query: 'test query',
        options: { maxQueries: 5 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
    });
  });

  describe('Query Generation Quality', () => {
    it('should generate diverse queries', async () => {
      // Arrange
      const queryRequest = {
        query: 'technology journalists',
        criteria: {
          countries: ['US', 'UK', 'Canada'],
          categories: ['technology']
        },
        options: {
          maxQueries: 10,
          diversityThreshold: 0.8,
          enableAIEnhancement: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.queries).toBeDefined();
      
      // Check that queries have different types
      const queryTypes = new Set(data.data.queries.map((q: any) => q.queryType));
      expect(queryTypes.size).toBeGreaterThan(1);
      
      // Check that queries meet relevance threshold
      data.data.queries.forEach((query: any) => {
        expect(query.scores.relevance).toBeGreaterThanOrEqual(0.3);
      });
    });

    it('should respect minimum relevance score threshold', async () => {
      // Arrange
      const queryRequest = {
        query: 'test query',
        options: {
          maxQueries: 10,
          minRelevanceScore: 0.8
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      
      // All generated queries should meet the minimum relevance score
      data.data.queries.forEach((query: any) => {
        expect(query.scores.relevance).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should apply proper criteria to generated queries', async () => {
      // Arrange
      const queryRequest = {
        query: 'healthcare reporters',
        criteria: {
          countries: ['US', 'Canada'],
          languages: ['English'],
          beats: ['healthcare'],
          dateRange: {
            startDate: '2024-01-01',
            endDate: '2024-12-31'
          }
        },
        options: {
          maxQueries: 5,
          enableAIEnhancement: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      
      // Check that generated queries have appropriate criteria
      data.data.queries.forEach((query: any) => {
        expect(query.criteria).toBeDefined();
        if (query.criteria.countries) {
          expect(query.criteria.countries).toEqual(
            expect.arrayContaining(['US', 'Canada'])
          );
        }
        if (query.criteria.languages) {
          expect(query.criteria.languages).toContain('English');
        }
      });
    });
  });
});