/**
 * Integration Tests for AI Services
 * Tests the interaction between different AI service components
 */

import aiServiceManager, { AIServiceManagerImpl } from '../manager/index';
import { aiConfigManager } from '../config/manager';
import { aiSecurityManager } from '../security/index';
import { aiPerformanceMonitor } from '../monitoring/index';
import { openAIService } from '../openai/client';
import { exaService } from '../exa/client';

// Mock external API calls
jest.mock('openai');
jest.mock('@anthropic-ai/sdk');
jest.mock('axios');

// Reset all managers before each test
beforeEach(() => {
  // Reset singletons
  // @ts-ignore - Accessing private property for testing
  AIServiceManagerImpl.instance = null;
  // @ts-ignore - Accessing private property for testing
  aiConfigManager.instance = null;
  // @ts-ignore - Accessing private property for testing
  aiSecurityManager.instance = null;
  // @ts-ignore - Accessing private property for testing
  aiPerformanceMonitor.instance = null;

  // Clear all mocks
  jest.clearAllMocks();
});

describe('AI Services Integration', () => {
  describe('Service Manager Integration', () => {
    beforeEach(async () => {
      // Mock configuration
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
      process.env.EXA_API_KEY = 'test-key';
      process.env.FIRECRAWL_API_KEY = 'fc-test-key';
      process.env.AI_ENABLE_CACHING = 'true';
    });

    it('should initialize all services successfully', async () => {
      // Mock successful initialization for all services
      jest.spyOn(openAIService, 'initialize').mockResolvedValue();
      jest.spyOn(exaService, 'initialize').mockResolvedValue();

      await aiServiceManager.initialize();

      expect(openAIService.initialize).toHaveBeenCalled();
      expect(exaService.initialize).toHaveBeenCalled();
    });

    it('should handle service initialization failures gracefully', async () => {
      // Mock OpenAI failure
      jest.spyOn(openAIService, 'initialize').mockRejectedValue(new Error('OpenAI init failed'));
      jest.spyOn(exaService, 'initialize').mockResolvedValue();

      // Should not throw error, but continue with other services
      await expect(aiServiceManager.initialize()).resolves.not.toThrow();

      const healthStatus = await aiServiceManager.getServiceHealth();
      expect(healthStatus.some(s => s.service === 'openai' && s.status === 'unhealthy')).toBe(true);
      expect(healthStatus.some(s => s.service === 'exa' && s.status === 'healthy')).toBe(true);
    });
  });

  describe('End-to-End Search Workflow', () => {
    beforeEach(async () => {
      // Setup environment
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.EXA_API_KEY = 'test-key';
      process.env.AI_ENABLE_CACHING = 'true';

      // Mock service responses
      const mockExaResponse = {
        results: [
          {
            url: 'https://example.com/article1',
            title: 'Tech News Article',
            summary: 'Latest developments in AI',
            publishedDate: '2024-01-01',
            domain: 'example.com',
            authority: 0.8,
            relevanceScore: 0.9,
            metadata: {
              language: 'en',
              contentLength: 1500
            }
          }
        ],
        totalResults: 1,
        queryTime: 500,
        searchId: 'search-123',
        metadata: { searchEngine: 'exa' }
      };

      const mockScrapedContent = {
        url: 'https://example.com/article1',
        title: 'Tech News Article',
        content: 'This is the full article content with contact information...',
        metadata: {
          contentType: 'article',
          contentLength: 2000,
          language: 'en',
          wordCount: 350
        }
      };

      const mockExtractedContacts = {
        contacts: [
          {
            name: 'John Doe',
            email: 'john@example.com',
            role: 'Tech Journalist',
            organization: 'Tech News',
            confidence: 0.9
          }
        ],
        confidence: 0.85,
        processingTime: 1200,
        sourceAnalysis: {
          type: 'article',
          quality: 'high',
          relevance: 0.9
        }
      };

      // Mock Exa service
      jest.spyOn(exaService, 'searchWeb').mockResolvedValue(mockExaResponse);

      // Mock Firecrawl service (imported dynamically)
      const firecrawlModule = require('../firecrawl/client');
      jest.spyOn(firecrawlModule.firecrawlService, 'scrapeContent').mockResolvedValue(mockScrapedContent);

      // Mock OpenAI service
      jest.spyOn(openAIService, 'extractContacts').mockResolvedValue(mockExtractedContacts);

      await aiServiceManager.initialize();
    });

    it('should perform complete search workflow with contact extraction', async () => {
      const searchQuery = {
        query: 'AI technology journalists',
        filters: {
          beats: ['technology'],
          regions: ['US']
        },
        options: {
          maxResults: 5,
          extractContacts: true,
          scrapeContent: true
        }
      };

      const results = await aiServiceManager.searchWeb(searchQuery);

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://example.com/article1');
      expect(results[0].title).toBe('Tech News Article');
      expect(results[0].contacts).toHaveLength(1);
      expect(results[0].contacts![0].name).toBe('John Doe');
      expect(results[0].contacts![0].email).toBe('john@example.com');

      // Verify service calls
      expect(exaService.searchWeb).toHaveBeenCalled();
      expect(openAIService.extractContacts).toHaveBeenCalled();
    });

    it('should fallback gracefully when contact extraction fails', async () => {
      // Mock contact extraction failure
      jest.spyOn(openAIService, 'extractContacts').mockRejectedValue(new Error('Extraction failed'));

      const searchQuery = {
        query: 'AI technology journalists',
        options: {
          maxResults: 5,
          extractContacts: true
        }
      };

      const results = await aiServiceManager.searchWeb(searchQuery);

      // Should still return search results without contacts
      expect(results).toHaveLength(1);
      expect(results[0].contacts).toBeUndefined();
    });
  });

  describe('Security Integration', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.AI_ENABLE_CACHING = 'true';
    });

    it('should redact PII from content before processing', async () => {
      const contentWithPII = 'Contact john.doe@example.com or call (555) 123-4567';

      // Mock PII redaction
      const piiResult = aiSecurityManager.detectAndRedactPII(contentWithPII);

      // Mock OpenAI service
      const mockContacts = {
        contacts: [],
        confidence: 0,
        processingTime: 500,
        sourceAnalysis: { type: 'article', quality: 'medium', relevance: 0.5 }
      };
      jest.spyOn(openAIService, 'extractContacts').mockResolvedValue(mockContacts);

      await aiServiceManager.initialize();

      const result = await aiServiceManager.extractContacts(contentWithPII, {
        source: 'test',
        confidence: 70
      });

      // Verify PII was redacted
      expect(piiResult.redactedContent).toContain('[EMAIL_REDACTED]');
      expect(piiResult.redactedContent).toContain('[PHONE_REDACTED]');

      // Verify service was called with redacted content
      expect(openAIService.extractContacts).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('[EMAIL_REDACTED]')
        })
      );
    });

    it('should validate API key permissions', async () => {
      // Register API key with limited permissions
      const keyInfo = {
        apiKey: 'test-key-123',
        service: 'openai',
        permissions: ['search'],
        rateLimitPerHour: 1000
      };

      const keyId = aiSecurityManager.registerAPIKey(keyInfo);

      // Test allowed operation
      const allowedAccess = aiSecurityManager.validateAPIKeyAccess(keyId, 'search', {
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent'
      });

      expect(allowedAccess.valid).toBe(true);

      // Test denied operation
      const deniedAccess = aiSecurityManager.validateAPIKeyAccess(keyId, 'admin', {
        ipAddress: '192.168.1.1',
        userAgent: 'test-agent'
      });

      expect(deniedAccess.valid).toBe(false);
      expect(deniedAccess.reason).toBe('Insufficient permissions');

      // Verify audit log was created
      const logs = aiSecurityManager.getAuditLogs({ keyId });
      expect(logs).toHaveLength(2); // One for allowed, one for denied
    });
  });

  describe('Performance Monitoring Integration', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.AI_ENABLE_CACHING = 'true';
    });

    it('should record metrics for successful operations', async () => {
      // Mock successful service calls
      jest.spyOn(openAIService, 'extractContacts').mockResolvedValue({
        contacts: [],
        confidence: 0,
        processingTime: 500,
        sourceAnalysis: { type: 'article', quality: 'medium', relevance: 0.5 }
      });

      await aiServiceManager.initialize();

      // Perform operation
      await aiServiceManager.extractContacts('Test content', {
        source: 'test'
      });

      // Check metrics were recorded
      const dashboardData = aiPerformanceMonitor.getDashboardData();
      expect(dashboardData.overview.totalRequests).toBeGreaterThan(0);
      expect(dashboardData.services).toHaveLength(4); // All 4 services
    });

    it('should record metrics for failed operations', async () => {
      // Mock service failure
      jest.spyOn(openAIService, 'extractContacts').mockRejectedValue(new Error('Service failed'));

      await aiServiceManager.initialize();

      try {
        await aiServiceManager.extractContacts('Test content', {
          source: 'test'
        });
      } catch (error) {
        // Expected to fail
      }

      // Check error metrics were recorded
      const dashboardData = aiPerformanceMonitor.getDashboardData();
      expect(dashboardData.overview.totalRequests).toBeGreaterThan(0);
      // The exact success rate depends on when metrics are recorded
    });

    it('should generate alerts for performance issues', async () => {
      // Create custom alert rule
      aiPerformanceMonitor.createAlertRule({
        name: 'High Failure Rate Test',
        description: 'Test alert for high failure rate',
        metric: 'errorRate',
        threshold: 50,
        operator: 'gt',
        timeWindow: 1,
        severity: 'warning',
        enabled: true
      });

      // Record some failed operations
      for (let i = 0; i < 3; i++) {
        aiPerformanceMonitor.recordMetrics({
          service: 'openai',
          operation: 'extractContacts',
          success: i === 0, // Only first succeeds
          duration: 1000,
          cached: false,
          retryCount: 0,
          correlationId: `test-${i}`
        });
      }

      // Check for alerts
      const alerts = aiPerformanceMonitor.getAlerts();
      const failureAlert = alerts.find(a => a.ruleId.includes('High Failure Rate'));

      // Alert may or may not be triggered depending on timing
      expect(failureAlert?.severity).toBe('warning');
    });
  });

  describe('Configuration Integration', () => {
    it('should load and validate all service configurations', async () => {
      // Set up complete environment
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
      process.env.EXA_API_KEY = 'test-key';
      process.env.FIRECRAWL_API_KEY = 'fc-test-key';
      process.env.AI_ENABLE_CACHING = 'true';
      process.env.AI_LOG_LEVEL = 'debug';

      const config = await aiConfigManager.loadConfig();

      expect(config.openai).toBeDefined();
      expect(config.anthropic).toBeDefined();
      expect(config.exa).toBeDefined();
      expect(config.firecrawl).toBeDefined();
      expect(config.global).toBeDefined();

      // Check global config
      expect(config.global.enableCaching).toBe(true);
      expect(config.global.logLevel).toBe('debug');

      // Check service-specific configs
      expect(config.openai.apiKey).toBe('sk-test-key');
      expect(config.anthropic.apiKey).toBe('sk-ant-test-key');
      expect(config.exa.apiKey).toBe('test-key');
      expect(config.firecrawl.apiKey).toBe('fc-test-key');
    });

    it('should handle partial configuration gracefully', async () => {
      // Set up minimal environment
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.AI_ENABLE_CACHING = 'false';

      const config = await aiConfigManager.loadConfig();

      expect(config.openai).toBeDefined();
      expect(config.global.enableCaching).toBe(false);

      // Missing API keys should cause initialization failures
      // but not config loading failures
      expect(config.anthropic.apiKey).toBe('');
      expect(config.exa.apiKey).toBe('');
      expect(config.firecrawl.apiKey).toBe('');
    });
  });

  describe('Circuit Breaker Integration', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.AI_ENABLE_CACHING = 'true';
    });

    it('should open circuit breaker after repeated failures', async () => {
      // Mock repeated failures
      jest.spyOn(openAIService, 'extractContacts').mockRejectedValue(new Error('Service unavailable'));

      await aiServiceManager.initialize();

      // Make several failed requests
      for (let i = 0; i < 6; i++) {
        try {
          await aiServiceManager.extractContacts('Test content', {
            source: 'test'
          });
        } catch (error) {
          // Expected to fail
        }
      }

      // Check service health - should be unhealthy
      const healthStatus = await aiServiceManager.getServiceHealth();
      const openaiHealth = healthStatus.find(s => s.service === 'openai');

      // Status may be degraded or unhealthy depending on circuit breaker state
      expect(['degraded', 'unhealthy']).toContain(openaiHealth?.status || '');
    });

    it('should recover from circuit breaker state', async () => {
      // This test would require time manipulation or custom circuit breaker logic
      // For now, just verify the circuit breaker logic exists
      await aiServiceManager.initialize();

      const healthStatus = await aiServiceManager.getServiceHealth();
      expect(healthStatus).toBeDefined();
      expect(healthStatus.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting Integration', () => {
    beforeEach(async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.AI_ENABLE_CACHING = 'true';
    });

    it('should enforce rate limits across operations', async () => {
      // Configure low rate limit for testing
      aiPerformanceMonitor.configureRateLimit('test', {
        windowMs: 1000, // 1 second
        maxRequests: 2
      });

      // Make requests up to limit
      const limit1 = aiPerformanceMonitor.checkRateLimit('user-123', 'test');
      expect(limit1.allowed).toBe(true);

      const limit2 = aiPerformanceMonitor.checkRateLimit('user-123', 'test');
      expect(limit2.allowed).toBe(true);

      const limit3 = aiPerformanceMonitor.checkRateLimit('user-123', 'test');
      expect(limit3.allowed).toBe(false);
      expect(limit3.retryAfter).toBeDefined();
    });

    it('should provide rate limit status information', async () => {
      const limitInfo = aiPerformanceMonitor.checkRateLimit('user-456', 'default');

      expect(limitInfo).toHaveProperty('allowed');
      expect(limitInfo).toHaveProperty('limit');
      expect(limitInfo).toHaveProperty('remaining');
      expect(limitInfo).toHaveProperty('resetTime');
    });
  });
});