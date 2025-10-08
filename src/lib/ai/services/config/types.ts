/**
 * AI Service Configuration Types
 * Defines configuration interfaces for all external AI services
 */

export interface ModelConfig {
  name: string;
  maxTokens: number;
  costPer1kTokens: number;
  maxRequestsPerMinute?: number;
  maxTokensPerMinute?: number;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  tokensPerMinute?: number;
  retryAttempts: number;
  backoffMultiplier: number;
  maxBackoffSeconds: number;
}

export interface QuotaConfig {
  requestsPerMonth: number;
  costPerMonth?: number;
  alertThreshold: number; // percentage before alerting
}

export interface OpenAIConfig {
  apiKey: string;
  baseUrl?: string;
  organization?: string;
  models: ModelConfig[];
  rateLimits: RateLimitConfig;
  costLimits: {
    maxDailySpend: number;
    maxMonthlySpend: number;
    alertThreshold: number;
  };
}

export interface AnthropicConfig {
  apiKey: string;
  baseUrl?: string;
  models: ModelConfig[];
  rateLimits: RateLimitConfig;
  costLimits: {
    maxDailySpend: number;
    maxMonthlySpend: number;
    alertThreshold: number;
  };
  enableContextCaching: boolean;
}

export interface ExaConfig {
  apiKey: string;
  baseUrl?: string;
  quotas: QuotaConfig;
  rateLimits: RateLimitConfig;
  searchOptions: {
    maxResults: number;
    includeDomains?: string[];
    excludeDomains?: string[];
    safeSearch?: 'off' | 'moderate' | 'strict';
  };
}

export interface FirecrawlConfig {
  apiKey: string;
  baseUrl?: string;
  rateLimits: RateLimitConfig;
  crawlOptions: {
    timeout: number;
    maxPages: number;
    includePatterns?: string[];
    excludePatterns?: string[];
    allowJavaScript: boolean;
    screenshot?: boolean;
    headers?: Record<string, string>;
  };
  quotas: QuotaConfig;
}

export interface AIServiceConfig {
  openai: OpenAIConfig;
  anthropic: AnthropicConfig;
  exa: ExaConfig;
  firecrawl: FirecrawlConfig;
  global: {
    enableCaching: boolean;
    cacheTTLLocal: number; // seconds
    cacheTTLCold: number; // seconds
    enableMetrics: boolean;
    enableAuditLogging: boolean;
    environment: 'development' | 'staging' | 'production';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime: number;
  errorRate: number;
  remainingQuota?: number;
  quotaResetTime?: string;
  details?: Record<string, any>;
}

export interface ServiceMetrics {
  service: string;
  operation: string;
  duration: number;
  success: boolean;
  tokensUsed?: number;
  cost?: number;
  timestamp: string;
  correlationId: string;
  userId?: string;
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  metadata?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  monitoringPeriodMs: number;
  expectedRecoveryTimeMs: number;
}