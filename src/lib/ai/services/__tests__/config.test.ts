/**
 * Unit Tests for AI Configuration Manager
 */

import { aiConfigManager, AIConfigManager } from '../config/manager';
import { OpenAIConfig, AnthropicConfig, ExaConfig, FirecrawlConfig } from '../config/types';

// Mock environment variables
const mockEnv = {
  OPENAI_API_KEY: 'sk-test-key',
  OPENAI_BASE_URL: 'https://api.openai.com/v1',
  ANTHROPIC_API_KEY: 'sk-ant-test-key',
  EXA_API_KEY: 'test-key',
  FIRECRAWL_API_KEY: 'fc-test-key',
  AI_ENABLE_CACHING: 'true',
  AI_LOG_LEVEL: 'info'
};

// Setup and teardown
beforeEach(() => {
  // Mock environment variables
  Object.entries(mockEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
});

afterEach(() => {
  // Clean up environment variables
  Object.keys(mockEnv).forEach(key => {
    delete process.env[key];
  });

  // Reset singleton instance
  // @ts-ignore - Accessing private property for testing
  AIConfigManager.instance = null;
});

describe('AIConfigManager', () => {
  describe('loadConfig', () => {
    it('should load configuration successfully with valid environment variables', async () => {
      const config = await aiConfigManager.loadConfig();

      expect(config).toBeDefined();
      expect(config.openai).toBeDefined();
      expect(config.anthropic).toBeDefined();
      expect(config.exa).toBeDefined();
      expect(config.firecrawl).toBeDefined();
      expect(config.global).toBeDefined();

      // Check specific values
      expect(config.openai.apiKey).toBe('sk-test-key');
      expect(config.openai.baseUrl).toBe('https://api.openai.com/v1');
      expect(config.anthropic.apiKey).toBe('sk-ant-test-key');
      expect(config.exa.apiKey).toBe('test-key');
      expect(config.firecrawl.apiKey).toBe('fc-test-key');
    });

    it('should use default values when environment variables are missing', async () => {
      delete process.env.OPENAI_BASE_URL;
      delete process.env.AI_LOG_LEVEL;

      const config = await aiConfigManager.loadConfig();

      expect(config.openai.baseUrl).toBeUndefined();
      expect(config.global.logLevel).toBe('info');
    });

    it('should throw error when required API keys are missing', async () => {
      delete process.env.OPENAI_API_KEY;

      await expect(aiConfigManager.loadConfig()).rejects.toThrow('OpenAI API key is required');
    });

    it('should validate configuration structure', async () => {
      // Add invalid environment variable
      process.env.OPENAI_RATE_LIMIT_REQUESTS_PER_MINUTE = 'invalid-number';

      await expect(aiConfigManager.loadConfig()).rejects.toThrow('Configuration validation failed');
    });
  });

  describe('getServiceConfig', () => {
    beforeEach(async () => {
      await aiConfigManager.loadConfig();
    });

    it('should return OpenAI configuration', () => {
      const config = aiConfigManager.getServiceConfig('openai');

      expect(config).toBeDefined();
      expect((config as OpenAIConfig).apiKey).toBe('sk-test-key');
      expect((config as OpenAIConfig).models).toHaveLength(2);
      expect((config as OpenAIConfig).rateLimits).toBeDefined();
    });

    it('should return Anthropic configuration', () => {
      const config = aiConfigManager.getServiceConfig('anthropic');

      expect(config).toBeDefined();
      expect((config as AnthropicConfig).apiKey).toBe('sk-ant-test-key');
      expect((config as AnthropicConfig).enableContextCaching).toBeDefined();
    });

    it('should return Exa configuration', () => {
      const config = aiConfigManager.getServiceConfig('exa');

      expect(config).toBeDefined();
      expect((config as ExaConfig).apiKey).toBe('test-key');
      expect((config as ExaConfig).searchOptions).toBeDefined();
    });

    it('should return Firecrawl configuration', () => {
      const config = aiConfigManager.getServiceConfig('firecrawl');

      expect(config).toBeDefined();
      expect((config as FirecrawlConfig).apiKey).toBe('fc-test-key');
      expect((config as FirecrawlConfig).crawlOptions).toBeDefined();
    });
  });

  describe('service health management', () => {
    beforeEach(async () => {
      await aiConfigManager.loadConfig();
    });

    it('should update service health status', () => {
      aiConfigManager.updateServiceHealth('openai', {
        status: 'healthy',
        responseTime: 150,
        errorRate: 0
      });

      const health = aiConfigManager.getServiceHealthStatus('openai');
      expect(health).toBeDefined();
      expect(health!.status).toBe('healthy');
      expect(health!.responseTime).toBe(150);
      expect(health!.errorRate).toBe(0);
    });

    it('should get all service health statuses', () => {
      aiConfigManager.updateServiceHealth('openai', { status: 'healthy', responseTime: 100, errorRate: 0 });
      aiConfigManager.updateServiceHealth('anthropic', { status: 'degraded', responseTime: 500, errorRate: 5 });

      const healthStatuses = aiConfigManager.getServiceHealth();
      expect(healthStatuses).toHaveLength(2);
      expect(healthStatuses[0].service).toBe('openai');
      expect(healthStatuses[1].service).toBe('anthropic');
    });

    it('should check if all services are healthy', () => {
      aiConfigManager.updateServiceHealth('openai', { status: 'healthy', responseTime: 100, errorRate: 0 });
      aiConfigManager.updateServiceHealth('anthropic', { status: 'healthy', responseTime: 150, errorRate: 0 });

      expect(aiConfigManager.areAllServicesHealthy()).toBe(true);

      aiConfigManager.updateServiceHealth('exa', { status: 'unhealthy', responseTime: 1000, errorRate: 100 });

      expect(aiConfigManager.areAllServicesHealthy()).toBe(false);
    });
  });

  describe('configuration masking', () => {
    beforeEach(async () => {
      await aiConfigManager.loadConfig();
    });

    it('should mask sensitive configuration values', () => {
      const config = aiConfigManager.getConfig();
      const masked = aiConfigManager.maskSensitiveConfig(config);

      expect(masked.openai.apiKey).toBe('***key');
      expect(masked.anthropic.apiKey).toBe('***key');
      expect(masked.exa.apiKey).toBe('***key');
      expect(masked.firecrawl.apiKey).toBe('***key');
    });

    it('should preserve non-sensitive configuration values', () => {
      const config = aiConfigManager.getConfig();
      const masked = aiConfigManager.maskSensitiveConfig(config);

      expect(masked.openai.baseUrl).toBe(config.openai.baseUrl);
      expect(masked.global.enableCaching).toBe(config.global.enableCaching);
      expect(masked.openai.models).toEqual(config.openai.models);
    });
  });

  describe('error handling', () => {
    it('should handle configuration reload errors gracefully', async () => {
      // Load initial config
      await aiConfigManager.loadConfig();

      // Invalidate the config
      delete process.env.OPENAI_API_KEY;

      // Should throw error on reload
      await expect(aiConfigManager.reloadConfig()).rejects.toThrow();
    });

    it('should provide validation errors', async () => {
      process.env.OPENAI_RATE_LIMIT_REQUESTS_PER_MINUTE = 'invalid';

      try {
        await aiConfigManager.loadConfig();
      } catch (error) {
        const errors = aiConfigManager.getValidationErrors();
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0]).toContain('rateLimits.requestsPerMinute');
      }
    });
  });
});