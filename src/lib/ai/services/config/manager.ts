/**
 * AI Service Configuration Manager
 * Handles loading, validation, and management of AI service configurations
 */

import { z } from 'zod';
import {
  AIServiceConfig,
  OpenAIConfig,
  AnthropicConfig,
  ExaConfig,
  FirecrawlConfig,
  ServiceHealth
} from './types';

// Configuration validation schemas
const modelConfigSchema = z.object({
  name: z.string(),
  maxTokens: z.number().positive(),
  costPer1kTokens: z.number().nonnegative(),
  maxRequestsPerMinute: z.number().positive().optional(),
  maxTokensPerMinute: z.number().positive().optional(),
});

const rateLimitConfigSchema = z.object({
  requestsPerMinute: z.number().positive(),
  tokensPerMinute: z.number().positive().optional(),
  retryAttempts: z.number().min(0).max(10),
  backoffMultiplier: z.number().min(1).max(10),
  maxBackoffSeconds: z.number().positive(),
});

const quotaConfigSchema = z.object({
  requestsPerMonth: z.number().positive(),
  costPerMonth: z.number().nonnegative().optional(),
  alertThreshold: z.number().min(0).max(100),
});

const openAIConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  organization: z.string().optional(),
  models: z.array(modelConfigSchema).min(1),
  rateLimits: rateLimitConfigSchema,
  costLimits: z.object({
    maxDailySpend: z.number().nonnegative(),
    maxMonthlySpend: z.number().nonnegative(),
    alertThreshold: z.number().min(0).max(100),
  }),
});

const anthropicConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  models: z.array(modelConfigSchema).min(1),
  rateLimits: rateLimitConfigSchema,
  costLimits: z.object({
    maxDailySpend: z.number().nonnegative(),
    maxMonthlySpend: z.number().nonnegative(),
    alertThreshold: z.number().min(0).max(100),
  }),
  enableContextCaching: z.boolean(),
});

const exaConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  quotas: quotaConfigSchema,
  rateLimits: rateLimitConfigSchema,
  searchOptions: z.object({
    maxResults: z.number().positive().max(100),
    includeDomains: z.array(z.string().url()).optional(),
    excludeDomains: z.array(z.string().url()).optional(),
    safeSearch: z.enum(['off', 'moderate', 'strict']).optional(),
  }),
});

const firecrawlConfigSchema = z.object({
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
  rateLimits: rateLimitConfigSchema,
  crawlOptions: z.object({
    timeout: z.number().positive(),
    maxPages: z.number().positive(),
    includePatterns: z.array(z.string()).optional(),
    excludePatterns: z.array(z.string()).optional(),
    allowJavaScript: z.boolean(),
    screenshot: z.boolean().optional(),
    headers: z.record(z.string()).optional(),
  }),
  quotas: quotaConfigSchema,
});

const aiServiceConfigSchema = z.object({
  openai: openAIConfigSchema,
  anthropic: anthropicConfigSchema,
  exa: exaConfigSchema,
  firecrawl: firecrawlConfigSchema,
  global: z.object({
    enableCaching: z.boolean(),
    cacheTTLLocal: z.number().positive(),
    cacheTTLCold: z.number().positive(),
    enableMetrics: z.boolean(),
    enableAuditLogging: z.boolean(),
    environment: z.enum(['development', 'staging', 'production']),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']),
  }),
});

export class AIConfigManager {
  private static instance: AIConfigManager;
  private config: AIServiceConfig | null = null;
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private configValidationErrors: string[] = [];

  private constructor() {}

  public static getInstance(): AIConfigManager {
    if (!AIConfigManager.instance) {
      AIConfigManager.instance = new AIConfigManager();
    }
    return AIConfigManager.instance;
  }

  /**
   * Load and validate AI service configuration from environment variables
   */
  public async loadConfig(): Promise<AIServiceConfig> {
    try {
      const rawConfig = this.buildConfigFromEnvironment();
      const validatedConfig = this.validateConfig(rawConfig);

      this.config = validatedConfig;
      this.configValidationErrors = [];

      console.info('AI Service configuration loaded successfully', {
        environment: validatedConfig.global.environment,
        servicesEnabled: Object.keys(validatedConfig),
        logLevel: validatedConfig.global.logLevel
      });

      return validatedConfig;
    } catch (error) {
      console.error('Failed to load AI service configuration:', error);
      throw new Error(`AI Service configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current configuration
   */
  public getConfig(): AIServiceConfig {
    if (!this.config) {
      throw new Error('AI Service configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Get configuration for a specific service
   */
  public getServiceConfig<T extends keyof AIServiceConfig>(service: T): Omit<AIServiceConfig[T], 'global'> {
    const config = this.getConfig();
    return config[service] as Omit<AIServiceConfig[T], 'global'>;
  }

  /**
   * Update service health status
   */
  public updateServiceHealth(service: string, health: Partial<ServiceHealth>): void {
    const existing = this.serviceHealth.get(service);
    const updated: ServiceHealth = {
      service,
      status: 'healthy',
      lastCheck: new Date().toISOString(),
      responseTime: 0,
      errorRate: 0,
      ...existing,
      ...health,
    };

    this.serviceHealth.set(service, updated);

    // Log health changes
    if (existing?.status !== updated.status) {
      const level = updated.status === 'unhealthy' ? 'error' :
                   updated.status === 'degraded' ? 'warn' : 'info';
      console[level](`Service health changed: ${service}`, {
        from: existing?.status,
        to: updated.status,
        responseTime: updated.responseTime,
        errorRate: updated.errorRate
      });
    }
  }

  /**
   * Get health status for all services
   */
  public getServiceHealth(): ServiceHealth[] {
    return Array.from(this.serviceHealth.values());
  }

  /**
   * Get health status for a specific service
   */
  public getServiceHealthStatus(service: string): ServiceHealth | undefined {
    return this.serviceHealth.get(service);
  }

  /**
   * Check if all services are healthy
   */
  public areAllServicesHealthy(): boolean {
    return Array.from(this.serviceHealth.values()).every(
      health => health.status === 'healthy'
    );
  }

  /**
   * Get configuration validation errors
   */
  public getValidationErrors(): string[] {
    return [...this.configValidationErrors];
  }

  /**
   * Reload configuration from environment
   */
  public async reloadConfig(): Promise<AIServiceConfig> {
    this.config = null;
    this.serviceHealth.clear();
    return this.loadConfig();
  }

  /**
   * Build configuration object from environment variables
   */
  private buildConfigFromEnvironment(): any {
    return {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: process.env.OPENAI_BASE_URL,
        organization: process.env.OPENAI_ORGANIZATION,
        models: [
          {
            name: 'gpt-4o',
            maxTokens: 128000,
            costPer1kTokens: 0.005,
            maxRequestsPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
            maxTokensPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_TOKENS_PER_MINUTE || '100000')
          },
          {
            name: 'gpt-4o-mini',
            maxTokens: 128000,
            costPer1kTokens: 0.00015,
            maxRequestsPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
            maxTokensPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_TOKENS_PER_MINUTE || '100000')
          }
        ],
        rateLimits: {
          requestsPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
          tokensPerMinute: parseInt(process.env.OPENAI_RATE_LIMIT_TOKENS_PER_MINUTE || '100000'),
          retryAttempts: 3,
          backoffMultiplier: 2,
          maxBackoffSeconds: 60
        },
        costLimits: {
          maxDailySpend: parseFloat(process.env.OPENAI_MAX_DAILY_SPEND || '100'),
          maxMonthlySpend: parseFloat(process.env.OPENAI_MAX_MONTHLY_SPEND || '3000'),
          alertThreshold: 80
        }
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || '',
        baseUrl: process.env.ANTHROPIC_BASE_URL,
        models: [
          {
            name: 'claude-3-5-sonnet-20241022',
            maxTokens: 200000,
            costPer1kTokens: 0.015,
            maxRequestsPerMinute: parseInt(process.env.ANTHROPIC_RATE_LIMIT_REQUESTS_PER_MINUTE || '50')
          },
          {
            name: 'claude-3-haiku-20240307',
            maxTokens: 200000,
            costPer1kTokens: 0.00025,
            maxRequestsPerMinute: parseInt(process.env.ANTHROPIC_RATE_LIMIT_REQUESTS_PER_MINUTE || '50')
          }
        ],
        rateLimits: {
          requestsPerMinute: parseInt(process.env.ANTHROPIC_RATE_LIMIT_REQUESTS_PER_MINUTE || '50'),
          retryAttempts: 3,
          backoffMultiplier: 2,
          maxBackoffSeconds: 60
        },
        costLimits: {
          maxDailySpend: parseFloat(process.env.ANTHROPIC_MAX_DAILY_SPEND || '50'),
          maxMonthlySpend: parseFloat(process.env.ANTHROPIC_MAX_MONTHLY_SPEND || '1500'),
          alertThreshold: 80
        },
        enableContextCaching: process.env.ANTHROPIC_ENABLE_CONTEXT_CACHING === 'true'
      },
      exa: {
        apiKey: process.env.EXA_API_KEY || '',
        baseUrl: process.env.EXA_BASE_URL,
        quotas: {
          requestsPerMonth: parseInt(process.env.EXA_SEARCH_QUOTA_PER_MONTH || '10000'),
          costPerMonth: parseFloat(process.env.EXA_COST_PER_MONTH || '100'),
          alertThreshold: 80
        },
        rateLimits: {
          requestsPerMinute: parseInt(process.env.EXA_RATE_LIMIT_REQUESTS_PER_MINUTE || '60'),
          retryAttempts: 3,
          backoffMultiplier: 2,
          maxBackoffSeconds: 60
        },
        searchOptions: {
          maxResults: parseInt(process.env.EXA_MAX_RESULTS || '10'),
          safeSearch: 'moderate'
        }
      },
      firecrawl: {
        apiKey: process.env.FIRECRAWL_API_KEY || '',
        baseUrl: process.env.FIRECRAWL_BASE_URL,
        rateLimits: {
          requestsPerMinute: parseInt(process.env.FIRECRAWL_RATE_LIMIT_REQUESTS_PER_MINUTE || '100'),
          retryAttempts: 3,
          backoffMultiplier: 2,
          maxBackoffSeconds: 60
        },
        crawlOptions: {
          timeout: parseInt(process.env.FIRECRAWL_TIMEOUT_SECONDS || '30') * 1000,
          maxPages: parseInt(process.env.FIRECRAWL_MAX_PAGES || '10'),
          allowJavaScript: true,
          screenshot: false
        },
        quotas: {
          requestsPerMonth: parseInt(process.env.FIRECRAWL_QUOTA_PER_MONTH || '5000'),
          costPerMonth: parseFloat(process.env.FIRECRAWL_COST_PER_MONTH || '50'),
          alertThreshold: 80
        }
      },
      global: {
        enableCaching: process.env.AI_ENABLE_CACHING !== 'false',
        cacheTTLLocal: parseInt(process.env.AI_CACHE_TTL_LOCAL_SECONDS || '3600'),
        cacheTTLCold: parseInt(process.env.AI_CACHE_TTL_COLD_SECONDS || '86400'),
        enableMetrics: process.env.AI_ENABLE_METRICS !== 'false',
        enableAuditLogging: process.env.AI_ENABLE_AUDIT_LOGGING !== 'false',
        environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
        logLevel: (process.env.AI_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info'
      }
    };
  }

  /**
   * Validate configuration using Zod schemas
   */
  private validateConfig(config: any): AIServiceConfig {
    try {
      return aiServiceConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`
        );
        this.configValidationErrors = errorMessages;
        throw new Error(`Configuration validation failed: ${errorMessages.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Mask sensitive configuration values for logging
   */
  public maskSensitiveConfig(config: Partial<AIServiceConfig>): any {
    const masked = { ...config };

    if (masked.openai) {
      masked.openai = {
        ...masked.openai,
        apiKey: masked.openai.apiKey ? '***' + masked.openai.apiKey.slice(-4) : undefined
      };
    }

    if (masked.anthropic) {
      masked.anthropic = {
        ...masked.anthropic,
        apiKey: masked.anthropic.apiKey ? '***' + masked.anthropic.apiKey.slice(-4) : undefined
      };
    }

    if (masked.exa) {
      masked.exa = {
        ...masked.exa,
        apiKey: masked.exa.apiKey ? '***' + masked.exa.apiKey.slice(-4) : undefined
      };
    }

    if (masked.firecrawl) {
      masked.firecrawl = {
        ...masked.firecrawl,
        apiKey: masked.firecrawl.apiKey ? '***' + masked.firecrawl.apiKey.slice(-4) : undefined
      };
    }

    return masked;
  }
}

export const aiConfigManager = AIConfigManager.getInstance();