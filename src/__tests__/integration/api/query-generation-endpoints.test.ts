/**
 * Query Generation API Endpoints Integration Tests
 * Tests the complete request/response cycle for AI-powered query generation functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/query-generation/route';
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

// Mock Query Generation Service
jest.mock('@/lib/ai/query-generation/service', () => ({
  QueryGenerationService: jest.fn().mockImplementation(() => ({
    generateQueries: jest.fn().mockResolvedValue([
      {
        id: 'query-1',
        query: 'AI technology journalists United States 2024',
        type: 'ENHANCED',
        templateId: 'template-ai-journalists',
        scores: {
          relevance: 0.95,
          diversity: 0.80,
          coverage: 0.90,
          overall: 0.88
        },
        metadata: {
          enhanced: true,
          processingTime: 850,
          aiModel: 'gpt-4',
          tokensUsed: 150
        }
      },
      {
        id: 'query-2',
        query: 'artificial intelligence reporters tech news media',
        type: 'ENHANCED',
        templateId: 'template-tech-reporters',
        scores: {
          relevance: 0.88,
          diversity: 0.85,
          coverage: 0.82,
          overall: 0.85
        },
        metadata: {
          enhanced: true,
          processingTime: 720,
          aiModel: 'gpt-4',
          tokensUsed: 130
        }
      },
      {
        id: 'query-3',
        query: 'machine learning journalists Silicon Valley publications',
        type: 'TEMPLATE',
        templateId: 'template-ml-journalists',
        scores: {
          relevance: 0.82,
          diversity: 0.90,
          coverage: 0.75,
          overall: 0.82
        },
        metadata: {
          enhanced: false,
          processingTime: 200,
          templateName: 'ml-journalists-template'
        }
      }
    ]),
    getQuerySuggestions: jest.fn().mockResolvedValue([
      {
        query: 'AI startup founders profiles',
        category: 'enhancement',
        confidence: 0.92,
        rationale: 'Broadens scope to include startup ecosystem coverage'
      },
      {
        query: 'tech journalists covering enterprise AI',
        category: 'refinement',
        confidence: 0.88,
        rationale: 'Focuses on enterprise AI sector for more targeted results'
      }
    ]),
    validateQuery: jest.fn().mockResolvedValue({
      valid: true,
      score: 0.85,
      suggestions: [
        'Consider adding geographic filters for better targeting',
        'Include specific AI subdomains for more precise results'
      ],
      analysis: {
        complexity: 'medium',
        specificity: 'high',
        searchability: 'excellent'
      }
    })
  }))
}));

// Mock Template Engine
jest.mock('@/lib/ai/query-generation/template-engine', () => ({
  TemplateEngine: jest.fn().mockImplementation(() => ({
    renderTemplate: jest.fn().mockResolvedValue({
      query: 'AI technology journalists in San Francisco Bay Area',
      templateId: 'tech-journalists-sf',
      parameters: {
        beats: ['technology', 'AI'],
        location: 'San Francisco Bay Area',
        timeframe: '2024'
      }
    }),
    getAvailableTemplates: jest.fn().mockResolvedValue([
      {
        id: 'tech-journalists',
        name: 'Technology Journalists',
        description: 'Queries for technology and AI journalists',
        parameters: ['beats', 'location', 'timeframe'],
        examples: [
          'AI technology journalists in United States',
          'tech reporters covering artificial intelligence'
        ]
      },
      {
        id: 'business-reporters',
        name: 'Business Reporters',
        description: 'Queries for business and finance reporters',
        parameters: ['industry', 'company_size', 'region'],
        examples: [
          'business reporters covering tech startups',
          'finance journalists for enterprise companies'
        ]
      }
    ])
  }))
}));

// Mock dependencies
jest.mock('@/lib/ai/query-generation/ai-enhancement', () => ({
  enhanceQueryWithAI: jest.fn().mockResolvedValue({
    enhancedQuery: 'artificial intelligence technology journalists and reporters covering machine learning developments in 2024',
    enhancement: {
      originalQuery: 'AI journalists',
      addedTerms: ['artificial intelligence', 'technology', 'reporters', 'machine learning', 'developments', '2024'],
      removedTerms: [],
      reasoning: 'Expanded query to include related AI terminology and timeframe for better coverage',
      confidence: 0.92
    }
  })
}));

jest.mock('@/lib/ai/query-generation/scoring', () => ({
  scoreQuery: jest.fn().mockReturnValue({
    relevance: 0.88,
    diversity: 0.75,
    coverage: 0.82,
    overall: 0.82,
    factors: {
      termSpecificity: 0.90,
      scope: 0.85,
      uniqueness: 0.78,
      searchability: 0.92
    }
  })
}));

jest.mock('@/lib/ai/query-generation/deduplication', () => ({
  deduplicateQueries: jest.fn().mockImplementation((queries) => {
    // Return queries with similarity scores
    return queries.map((query: any, index: number) => ({
      ...query,
      similarityScore: index === 0 ? 1.0 : 0.75 - (index * 0.1),
      duplicates: []
    }));
  })
}));

jest.mock('@/app/api/ai/shared/logger', () => ({
  AILogger: {
    logBusiness: jest.fn().mockResolvedValue(undefined),
    logPerformance: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Query Generation API Endpoints Integration', () => {
  describe('POST /api/ai/query-generation', () => {
    let correlationId: string;

    beforeEach(() => {
      correlationId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      jest.clearAllMocks();
    });

    it('should generate enhanced queries from user input', async () => {
      // Arrange
      const queryRequest = {
        query: 'AI journalists',
        context: {
          beats: ['technology', 'AI'],
          regions: ['US'],
          languages: ['English'],
          targetAudience: 'tech professionals'
        },
        options: {
          maxQueries: 5,
          enableAIEnhancement: true,
          useTemplates: true,
          diversityThreshold: 0.7,
          confidenceThreshold: 0.75
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
      expect(data.data).toHaveProperty('queries');
      expect(Array.isArray(data.data.queries)).toBe(true);
      expect(data.data.queries.length).toBeGreaterThan(0);
      expect(data.data.queries.length).toBeLessThanOrEqual(5);

      // Verify query structure
      data.data.queries.forEach((query: any) => {
        expect(query).toHaveProperty('id');
        expect(query).toHaveProperty('query');
        expect(query).toHaveProperty('type');
        expect(query).toHaveProperty('scores');
        expect(query.scores).toHaveProperty('relevance');
        expect(query.scores).toHaveProperty('diversity');
        expect(query.scores).toHaveProperty('coverage');
        expect(query.scores).toHaveProperty('overall');
        expect(query.scores.overall).toBeGreaterThanOrEqual(0.75);
        expect(query).toHaveProperty('metadata');
      });

      expect(data).toHaveCorrelationId();
    });

    it('should provide query suggestions and recommendations', async () => {
      // Arrange
      const queryRequest = {
        query: 'technology reporters',
        options: {
          includeSuggestions: true,
          maxSuggestions: 5,
          suggestionTypes: ['enhancement', 'refinement', 'expansion']
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
      expect(data.data).toHaveProperty('suggestions');
      expect(Array.isArray(data.data.suggestions)).toBe(true);

      if (data.data.suggestions.length > 0) {
        data.data.suggestions.forEach((suggestion: any) => {
          expect(suggestion).toHaveProperty('query');
          expect(suggestion).toHaveProperty('category');
          expect(suggestion).toHaveProperty('confidence');
          expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
          expect(suggestion.confidence).toBeLessThanOrEqual(1);
          expect(suggestion).toHaveProperty('rationale');
        });
      }
    });

    it('should validate and score provided queries', async () => {
      // Arrange
      const validationRequest = {
        validateQueries: [
          'AI technology journalists United States',
          'machine learning reporters',
          'tech news writers covering artificial intelligence'
        ],
        context: {
          targetRegion: 'US',
          languages: ['English'],
          beats: ['technology']
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(validationRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.data).toHaveProperty('validationResults');
      expect(Array.isArray(data.data.validationResults)).toBe(true);
      expect(data.data.validationResults).toHaveLength(3);

      data.data.validationResults.forEach((result: any) => {
        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('score');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(result).toHaveProperty('analysis');
      });
    });

    it('should use templates when requested', async () => {
      // Arrange
      const templateRequest = {
        query: 'business journalists',
        options: {
          useTemplates: true,
          templateIds: ['business-reporters'],
          templateParameters: {
            industry: 'technology',
            company_size: 'enterprise',
            region: 'US'
          }
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(templateRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.data.queries.length).toBeGreaterThan(0);

      // Check that template-based queries are included
      const templateQueries = data.data.queries.filter((q: any) => q.type === 'TEMPLATE');
      expect(templateQueries.length).toBeGreaterThan(0);

      templateQueries.forEach((query: any) => {
        expect(query).toHaveProperty('templateId');
        expect(query.metadata).toHaveProperty('templateName');
      });
    });

    it('should handle invalid query generation requests', async () => {
      // Arrange
      const invalidRequest = {
        query: '', // Empty query
        options: {
          maxQueries: -1, // Invalid negative number
          confidenceThreshold: 1.5 // Invalid confidence threshold
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
      expect(data.error).toContain('validation');
    });

    it('should handle query generation service failures', async () => {
      // Arrange
      const { QueryGenerationService } = require('@/lib/ai/query-generation/service');
      QueryGenerationService.mockImplementation(() => ({
        generateQueries: jest.fn().mockRejectedValue(new Error('AI service temporarily unavailable'))
      }));

      const queryRequest = {
        query: 'AI journalists',
        options: { maxQueries: 5 }
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
      expect(data.error).toContain('temporarily unavailable');
    });

    it('should deduplicate similar queries', async () => {
      // Arrange
      const deduplicationRequest = {
        query: 'AI technology journalists',
        options: {
          maxQueries: 10,
          enableDeduplication: true,
          similarityThreshold: 0.8
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(deduplicationRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();

      // Verify queries have similarity scores
      data.data.queries.forEach((query: any) => {
        expect(query).toHaveProperty('similarityScore');
        expect(query.similarityScore).toBeGreaterThanOrEqual(0);
        expect(query.similarityScore).toBeLessThanOrEqual(1);
      });

      // Verify no duplicate queries (same text)
      const queryTexts = data.data.queries.map((q: any) => q.query);
      const uniqueTexts = new Set(queryTexts);
      expect(uniqueTexts.size).toBe(queryTexts.length);
    });

    it('should provide different query types', async () => {
      // Arrange
      const queryRequest = {
        query: 'technology reporters',
        options: {
          maxQueries: 8,
          enableAIEnhancement: true,
          useTemplates: true,
          includeVariations: true
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

      const queryTypes = data.data.queries.map((q: any) => q.type);
      const hasEnhanced = queryTypes.includes('ENHANCED');
      const hasTemplate = queryTypes.includes('TEMPLATE');

      expect(hasEnhanced || hasTemplate).toBe(true);
    });

    it('should handle concurrent query generation requests', async () => {
      // Arrange
      const requests = Array.from({ length: 5 }, (_, i) => {
        const queryRequest = {
          query: `technology reporters ${i}`,
          options: { maxQueries: 3 }
        };

        return new NextRequest('http://localhost:3000/api/ai/query-generation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `${correlationId}-${i}`
          },
          body: JSON.stringify(queryRequest)
        });
      });

      // Act
      const startTime = Date.now();
      const responses = await Promise.allSettled(requests.map(req => POST(req)));
      const endTime = Date.now();

      // Assert
      expect(responses).toHaveLength(5);

      const successfulResponses = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 200
      );
      expect(successfulResponses.length).toBe(5);

      // Verify concurrent execution completes in reasonable time
      expect(endTime - startTime).toBeLessThan(8000); // 8 seconds for 5 concurrent requests

      // Verify all responses have different correlation IDs
      const responseData = await Promise.all(
        successfulResponses.map(async (r) => {
          const data = await (r as PromiseFulfilledResult<Response>).value.json();
          return data;
        })
      );

      const correlationIds = responseData.map(d => d.correlationId);
      const uniqueIds = new Set(correlationIds);
      expect(uniqueIds.size).toBe(5);
    });

    it('should respect query limits and constraints', async () => {
      // Arrange
      const constrainedRequest = {
        query: 'AI journalists',
        options: {
          maxQueries: 3,
          confidenceThreshold: 0.8,
          diversityThreshold: 0.7,
          maxLength: 100
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(constrainedRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.data.queries.length).toBeLessThanOrEqual(3);

      data.data.queries.forEach((query: any) => {
        expect(query.scores.overall).toBeGreaterThanOrEqual(0.8);
        expect(query.query.length).toBeLessThanOrEqual(100);
      });
    });
  });
});