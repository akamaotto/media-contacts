/**
 * AI External Services Integration Tests with Mocks
 * Tests the integration with external AI services using comprehensive mocks
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { mockAPI } from '../config/test-config';
import { POST } from '@/app/api/ai/search/route';
import { POST as QueryPOST } from '@/app/api/ai/query-generation/route';
import { POST as ExtractPOST } from '@/app/api/ai/contact-extraction/extract/route';

// Mock external services
jest.mock('@/lib/ai/services/openai', () => ({
  OpenAIService: jest.fn().mockImplementation(() => ({
    generateQueryEnhancements: jest.fn(),
    extractContacts: jest.fn(),
    analyzeContent: jest.fn()
  }))
}));

jest.mock('@/lib/ai/services/anthropic', () => ({
  AnthropicService: jest.fn().mockImplementation(() => ({
    generateQueryEnhancements: jest.fn(),
    extractContacts: jest.fn(),
    analyzeContent: jest.fn()
  }))
}));

jest.mock('@/lib/ai/services/exa', () => ({
  ExaService: jest.fn().mockImplementation(() => ({
    search: jest.fn(),
    getSimilarResults: jest.fn()
  }))
}));

jest.mock('@/lib/ai/services/firecrawl', () => ({
  FirecrawlService: jest.fn().mockImplementation(() => ({
    scrape: jest.fn(),
    batchScrape: jest.fn()
  }))
}));

jest.mock('@/app/api/ai/shared/logger', () => ({
  AILogger: {
    logBusiness: jest.fn().mockResolvedValue(undefined),
    logPerformance: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('AI External Services Integration Tests with Mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAPI.clearMocks();
  });

  describe('OpenAI Service Integration', () => {
    it('should handle OpenAI API responses correctly', async () => {
      // Arrange
      const openaiMockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              enhancedQueries: [
                {
                  query: 'AI technology journalists in Silicon Valley',
                  relevance: 0.95,
                  confidence: 0.9
                },
                {
                  query: 'Artificial intelligence reporters covering startups',
                  relevance: 0.88,
                  confidence: 0.85
                }
              ],
              analysis: {
                queryComplexity: 'medium',
                suggestedFilters: ['technology', 'AI', 'startups'],
                estimatedResults: 2500
              }
            })
          }
        }],
        usage: {
          prompt_tokens: 120,
          completion_tokens: 180,
          total_tokens: 300
        }
      };

      mockAPI.setMockResponse('openai', 'chat/completions', openaiMockResponse);

      const { OpenAIService } = require('@/lib/ai/services/openai');
      const openaiService = new OpenAIService();
      (openaiService.generateQueryEnhancements as jest.Mock).mockResolvedValue({
        enhancedQueries: openaiMockResponse.choices[0].message.content,
        usage: openaiMockResponse.usage
      });

      const queryRequest = {
        query: 'AI journalists',
        options: {
          enableAIEnhancement: true,
          service: 'openai'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-openai-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await QueryPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.queries).toBeDefined();
      expect(data.data.queries.length).toBeGreaterThan(0);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      // Arrange
      const openaiErrorResponse = {
        error: {
          message: 'Invalid API key provided',
          type: 'invalid_request_error',
          code: 'invalid_api_key'
        }
      };

      mockAPI.setMockResponse('openai', 'chat/completions', openaiErrorResponse, 401);

      const { OpenAIService } = require('@/lib/ai/services/openai');
      const openaiService = new OpenAIService();
      (openaiService.generateQueryEnhancements as jest.Mock).mockRejectedValue(
        new Error('Invalid API key provided')
      );

      const queryRequest = {
        query: 'AI journalists',
        options: {
          enableAIEnhancement: true,
          service: 'openai'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-openai-error-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await QueryPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Service unavailable');
    });

    it('should handle OpenAI rate limits', async () => {
      // Arrange
      const openaiRateLimitResponse = {
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded'
        }
      };

      mockAPI.setMockResponse('openai', 'chat/completions', openaiRateLimitResponse, 429);

      const { OpenAIService } = require('@/lib/ai/services/openai');
      const openaiService = new OpenAIService();
      (openaiService.generateQueryEnhancements as jest.Mock).mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const queryRequest = {
        query: 'AI journalists',
        options: {
          enableAIEnhancement: true,
          service: 'openai'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-openai-rate-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await QueryPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Service unavailable');
    });
  });

  describe('Anthropic Service Integration', () => {
    it('should handle Anthropic API responses correctly', async () => {
      // Arrange
      const anthropicMockResponse = {
        content: [{
          text: JSON.stringify({
            enhancedQueries: [
              {
                query: 'AI technology journalists in Silicon Valley',
                relevance: 0.95,
                confidence: 0.9
              },
              {
                query: 'Artificial intelligence reporters covering startups',
                relevance: 0.88,
                confidence: 0.85
              }
            ],
            analysis: {
              queryComplexity: 'medium',
              suggestedFilters: ['technology', 'AI', 'startups'],
              estimatedResults: 2500
            }
          })
        }],
        usage: {
          input_tokens: 120,
          output_tokens: 180
        }
      };

      mockAPI.setMockResponse('anthropic', 'messages', anthropicMockResponse);

      const { AnthropicService } = require('@/lib/ai/services/anthropic');
      const anthropicService = new AnthropicService();
      (anthropicService.generateQueryEnhancements as jest.Mock).mockResolvedValue({
        enhancedQueries: anthropicMockResponse.content[0].text,
        usage: anthropicMockResponse.usage
      });

      const queryRequest = {
        query: 'AI journalists',
        options: {
          enableAIEnhancement: true,
          service: 'anthropic'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-anthropic-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await QueryPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.queries).toBeDefined();
      expect(data.data.queries.length).toBeGreaterThan(0);
    });

    it('should handle Anthropic API errors gracefully', async () => {
      // Arrange
      const anthropicErrorResponse = {
        error: {
          message: 'Invalid API key provided',
          type: 'authentication_error'
        }
      };

      mockAPI.setMockResponse('anthropic', 'messages', anthropicErrorResponse, 401);

      const { AnthropicService } = require('@/lib/ai/services/anthropic');
      const anthropicService = new AnthropicService();
      (anthropicService.generateQueryEnhancements as jest.Mock).mockRejectedValue(
        new Error('Invalid API key provided')
      );

      const queryRequest = {
        query: 'AI journalists',
        options: {
          enableAIEnhancement: true,
          service: 'anthropic'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/query-generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-anthropic-error-${Date.now()}`
        },
        body: JSON.stringify(queryRequest)
      });

      // Act
      const response = await QueryPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Service unavailable');
    });
  });

  describe('Exa Service Integration', () => {
    it('should handle Exa search responses correctly', async () => {
      // Arrange
      const exaMockResponse = {
        results: [
          {
            url: 'https://techcrunch.com/2024/01/15/ai-journalists',
            title: 'The Rise of AI Journalism: Meet the Key Players',
            summary: 'An in-depth look at the journalists covering the artificial intelligence beat',
            publishedDate: '2024-01-15',
            domain: 'techcrunch.com',
            authority: 0.92,
            relevanceScore: 0.95,
            metadata: {
              language: 'en',
              contentLength: 2500,
              wordCount: 1200,
              author: 'Sarah Chen',
              topics: ['AI', 'Journalism', 'Technology']
            }
          },
          {
            url: 'https://wired.com/2024/01/10/tech-media-landscape',
            title: 'How Technology is Reshaping the Media Landscape',
            summary: 'Analysis of technology journalists and outlets leading innovation coverage',
            publishedDate: '2024-01-10',
            domain: 'wired.com',
            authority: 0.89,
            relevanceScore: 0.88,
            metadata: {
              language: 'en',
              contentLength: 1800,
              wordCount: 850,
              author: 'Michael Roberts',
              topics: ['Technology', 'Media', 'Digital Transformation']
            }
          }
        ],
        totalResults: 2,
        queryTime: 450,
        searchId: 'exa-search-123',
        metadata: {
          searchEngine: 'exa',
          queryProcessed: 'AI technology journalists',
          filtersApplied: ['date', 'domain']
        }
      };

      mockAPI.setMockResponse('exa', 'search', exaMockResponse);

      const { ExaService } = require('@/lib/ai/services/exa');
      const exaService = new ExaService();
      (exaService.search as jest.Mock).mockResolvedValue(exaMockResponse);

      const searchRequest = {
        query: 'AI technology journalists',
        filters: {
          beats: ['technology', 'AI'],
          regions: ['US'],
          languages: ['English']
        },
        options: {
          maxResults: 10,
          includeSummaries: true,
          extractContacts: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-exa-${Date.now()}`
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
      expect(data.data.results).toBeDefined();
      expect(data.data.results.length).toBeGreaterThan(0);
    });

    it('should handle Exa API errors gracefully', async () => {
      // Arrange
      const exaErrorResponse = {
        error: {
          message: 'Invalid API key provided',
          type: 'authentication_error'
        }
      };

      mockAPI.setMockResponse('exa', 'search', exaErrorResponse, 401);

      const { ExaService } = require('@/lib/ai/services/exa');
      const exaService = new ExaService();
      (exaService.search as jest.Mock).mockRejectedValue(
        new Error('Invalid API key provided')
      );

      const searchRequest = {
        query: 'AI technology journalists',
        options: { maxResults: 10 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-exa-error-${Date.now()}`
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

    it('should handle Exa rate limits', async () => {
      // Arrange
      const exaRateLimitResponse = {
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error'
        }
      };

      mockAPI.setMockResponse('exa', 'search', exaRateLimitResponse, 429);

      const { ExaService } = require('@/lib/ai/services/exa');
      const exaService = new ExaService();
      (exaService.search as jest.Mock).mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const searchRequest = {
        query: 'AI technology journalists',
        options: { maxResults: 10 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-exa-rate-${Date.now()}`
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

  describe('Firecrawl Service Integration', () => {
    it('should handle Firecrawl scraping responses correctly', async () => {
      // Arrange
      const firecrawlMockResponse = {
        url: 'https://techcrunch.com/2024/01/15/ai-journalists',
        title: 'The Rise of AI Journalism: Meet the Key Players',
        content: `
          The Rise of AI Journalism: Meet the Key Players

          By Sarah Chen
          January 15, 2024

          In the rapidly evolving world of technology journalism, a new breed of reporters has emerged to cover one of the most transformative beats: artificial intelligence.

          Leading this movement is John Doe, a veteran technology journalist at Tech News Outlet.

          Contact: john.doe@technewsoutlet.com
          Twitter: @johndoetech
          Phone: +1-555-0123

          Another notable voice is Jane Smith, who covers AI for Wired Magazine.

          Contact: jane.smith@wired.com
          LinkedIn: linkedin.com/in/janesmith
        `,
        metadata: {
          contentType: 'article',
          contentLength: 3200,
          language: 'en',
          wordCount: 1500,
          author: 'Sarah Chen',
          publishedDate: '2024-01-15',
          extractionSuccessful: true,
          contactInfoFound: true,
          socialMediaLinks: 2,
          emailAddresses: 2,
          phoneNumbers: 1
        }
      };

      mockAPI.setMockResponse('firecrawl', 'scrape', firecrawlMockResponse);

      const { FirecrawlService } = require('@/lib/ai/services/firecrawl');
      const firecrawlService = new FirecrawlService();
      (firecrawlService.scrape as jest.Mock).mockResolvedValue(firecrawlMockResponse);

      const extractionRequest = {
        urls: ['https://techcrunch.com/2024/01/15/ai-journalists'],
        options: {
          extractContacts: true,
          includeSocialMedia: true,
          includePhoneNumbers: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-firecrawl-${Date.now()}`
        },
        body: JSON.stringify(extractionRequest)
      });

      // Act
      const response = await ExtractPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.jobId).toBeDefined();
      expect(data.data.status).toBe('processing');
    });

    it('should handle Firecrawl API errors gracefully', async () => {
      // Arrange
      const firecrawlErrorResponse = {
        error: {
          message: 'Invalid API key provided',
          type: 'authentication_error'
        }
      };

      mockAPI.setMockResponse('firecrawl', 'scrape', firecrawlErrorResponse, 401);

      const { FirecrawlService } = require('@/lib/ai/services/firecrawl');
      const firecrawlService = new FirecrawlService();
      (firecrawlService.scrape as jest.Mock).mockRejectedValue(
        new Error('Invalid API key provided')
      );

      const extractionRequest = {
        urls: ['https://example.com/article'],
        options: { extractContacts: true }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-firecrawl-error-${Date.now()}`
        },
        body: JSON.stringify(extractionRequest)
      });

      // Act
      const response = await ExtractPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Internal server error');
    });

    it('should handle Firecrawl rate limits', async () => {
      // Arrange
      const firecrawlRateLimitResponse = {
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error'
        }
      };

      mockAPI.setMockResponse('firecrawl', 'scrape', firecrawlRateLimitResponse, 429);

      const { FirecrawlService } = require('@/lib/ai/services/firecrawl');
      const firecrawlService = new FirecrawlService();
      (firecrawlService.scrape as jest.Mock).mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const extractionRequest = {
        urls: ['https://example.com/article'],
        options: { extractContacts: true }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-firecrawl-rate-${Date.now()}`
        },
        body: JSON.stringify(extractionRequest)
      });

      // Act
      const response = await ExtractPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Internal server error');
    });
  });

  describe('Multi-Service Integration', () => {
    it('should handle operations across multiple AI services', async () => {
      // Arrange
      const openaiMockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              enhancedQueries: [
                {
                  query: 'AI technology journalists in Silicon Valley',
                  relevance: 0.95,
                  confidence: 0.9
                }
              ]
            })
          }
        }]
      };

      const exaMockResponse = {
        results: [
          {
            url: 'https://techcrunch.com/2024/01/15/ai-journalists',
            title: 'The Rise of AI Journalism',
            summary: 'An in-depth look at AI journalists',
            publishedDate: '2024-01-15',
            domain: 'techcrunch.com',
            authority: 0.92,
            relevanceScore: 0.95
          }
        ]
      };

      const firecrawlMockResponse = {
        url: 'https://techcrunch.com/2024/01/15/ai-journalists',
        title: 'The Rise of AI Journalism',
        content: 'Article content with contact information',
        metadata: {
          contactInfoFound: true,
          emailAddresses: 2
        }
      };

      mockAPI.setMockResponse('openai', 'chat/completions', openaiMockResponse);
      mockAPI.setMockResponse('exa', 'search', exaMockResponse);
      mockAPI.setMockResponse('firecrawl', 'scrape', firecrawlMockResponse);

      // Mock services
      const { OpenAIService } = require('@/lib/ai/services/openai');
      const openaiService = new OpenAIService();
      (openaiService.generateQueryEnhancements as jest.Mock).mockResolvedValue({
        enhancedQueries: openaiMockResponse.choices[0].message.content
      });

      const { ExaService } = require('@/lib/ai/services/exa');
      const exaService = new ExaService();
      (exaService.search as jest.Mock).mockResolvedValue(exaMockResponse);

      const { FirecrawlService } = require('@/lib/ai/services/firecrawl');
      const firecrawlService = new FirecrawlService();
      (firecrawlService.scrape as jest.Mock).mockResolvedValue(firecrawlMockResponse);

      const searchRequest = {
        query: 'AI journalists',
        filters: {
          beats: ['technology', 'AI']
        },
        options: {
          maxResults: 5,
          enableAIEnhancement: true,
          extractContacts: true,
          scrapeContent: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-multi-service-${Date.now()}`
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
      expect(data.data.results).toBeDefined();
      expect(data.data.results.length).toBeGreaterThan(0);
    });

    it('should handle cascading failures across multiple services', async () => {
      // Arrange
      const openaiErrorResponse = {
        error: {
          message: 'Invalid API key provided',
          type: 'authentication_error'
        }
      };

      mockAPI.setMockResponse('openai', 'chat/completions', openaiErrorResponse, 401);

      const { OpenAIService } = require('@/lib/ai/services/openai');
      const openaiService = new OpenAIService();
      (openaiService.generateQueryEnhancements as jest.Mock).mockRejectedValue(
        new Error('Invalid API key provided')
      );

      const searchRequest = {
        query: 'AI journalists',
        options: {
          enableAIEnhancement: true,
          fallbackStrategies: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-cascade-failure-${Date.now()}`
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

  describe('Service Health Monitoring', () => {
    it('should detect and report service health issues', async () => {
      // Arrange
      const unhealthyServices = ['openai', 'exa'];
      
      unhealthyServices.forEach(service => {
        const errorResponse = {
          error: {
            message: 'Service unavailable',
            type: 'service_error'
          }
        };
        mockAPI.setMockResponse(service, 'any-endpoint', errorResponse, 503);
      });

      // Act
      const healthCheckPromises = unhealthyServices.map(service => {
        return fetch(`https://api.${service}.com/v1/health`)
          .then(response => ({ service, status: response.status }))
          .catch(error => ({ service, error: error.message }));
      });

      const healthResults = await Promise.all(healthCheckPromises);

      // Assert
      healthResults.forEach(result => {
        expect(result.status).toBe(503);
      });
    });

    it('should handle service recovery scenarios', async () => {
      // Arrange
      const service = 'openai';
      
      // First, set up an error response
      const errorResponse = {
        error: {
          message: 'Service temporarily unavailable',
          type: 'service_error'
        }
      };
      mockAPI.setMockResponse(service, 'chat/completions', errorResponse, 503);

      // Then, set up a successful recovery response
      const successResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              enhancedQueries: [
                {
                  query: 'AI technology journalists',
                  relevance: 0.95,
                  confidence: 0.9
                }
              ]
            })
          }
        }]
      };

      // Act
      // Initial request should fail
      let mockResponse = mockAPI.getMockResponse(service, 'chat/completions');
      expect(mockResponse.status).toBe(503);

      // Update mock to simulate recovery
      mockAPI.setMockResponse(service, 'chat/completions', successResponse, 200);
      mockResponse = mockAPI.getMockResponse(service, 'chat/completions');
      
      // Assert
      expect(mockResponse.status).toBe(200);
      expect(mockResponse.choices).toBeDefined();
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent requests to multiple services', async () => {
      // Arrange
      const concurrentRequests = 10;
      
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              enhancedQueries: [
                {
                  query: 'AI technology journalists',
                  relevance: 0.95,
                  confidence: 0.9
                }
              ]
            })
          }
        }]
      };

      mockAPI.setMockResponse('openai', 'chat/completions', mockResponse);

      // Act
      const startTime = Date.now();
      const requestPromises = Array.from({ length: concurrentRequests }, (_, i) => {
        return new Promise(resolve => {
          setTimeout(() => {
            const response = mockAPI.createMockResponse(mockResponse);
            resolve(response);
          }, Math.random() * 100); // Simulate variable response times
        });
      });

      const responses = await Promise.all(requestPromises);
      const endTime = Date.now();

      // Assert
      expect(responses).toHaveLength(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
      responses.forEach(response => {
        expect(response.ok).toBe(true);
      });
    });

    it('should implement proper retry logic for failed requests', async () => {
      // Arrange
      const service = 'exa';
      let attemptCount = 0;
      
      // Mock a function that simulates retry logic
      const mockRetryFunction = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          // Fail first two attempts
          return Promise.reject(new Error('Service temporarily unavailable'));
        } else {
          // Succeed on third attempt
          return Promise.resolve({
            results: [
              {
                url: 'https://example.com/article',
                title: 'Test Article',
                relevanceScore: 0.9
              }
            ]
          });
        }
      });

      // Act
      let result;
      try {
        result = await mockRetryFunction();
      } catch (error) {
        result = { error: error.message };
      }

      // Assert
      expect(attemptCount).toBe(3);
      expect(result.results).toBeDefined();
      expect(result.results.length).toBe(1);
    });
  });
});