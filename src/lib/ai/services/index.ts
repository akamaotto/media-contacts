/**
 * AI Services Module - Main Export
 * Provides unified access to all AI services and management utilities
 */

// Configuration Management
export { aiConfigManager, AIConfigManager } from './config/manager';
export type {
  AIServiceConfig,
  OpenAIConfig,
  AnthropicConfig,
  ExaConfig,
  FirecrawlConfig,
  ServiceHealth as ConfigServiceHealth,
  ServiceMetrics,
  RetryConfig,
  CircuitBreakerConfig,
  CacheConfig
} from './config/types';

// Individual Service Clients
export { openAIService, OpenAIService } from './openai/client';
export { exaService, ExaService } from './exa/client';
export { firecrawlService, FirecrawlService } from './firecrawl/client';
export { anthropicService, AnthropicService } from './anthropic/client';

// Service Manager
export { aiServiceManager, AIServiceManagerImpl } from './manager/index';
export type {
  AIServiceManager,
  AISearchQuery,
  AISearchResult,
  ExtractionContext,
  AnalysisType,
  AnalysisResult
} from './manager/index';

// Security
export { aiSecurityManager, AISecurityManager } from './security/index';
export type {
  PIIPattern,
  PIIAnalysisResult,
  APIKeyInfo,
  APIKeyUsage,
  AccessPolicy,
  AccessRule,
  EncryptionConfig,
  AuditLog
} from './security/index';

// Performance Monitoring
export { aiPerformanceMonitor, AIPerformanceMonitor } from './monitoring/index';
export type {
  PerformanceMetrics,
  AggregatedMetrics,
  RateLimitConfig,
  RateLimitResult,
  AlertRule,
  Alert,
  DashboardData
} from './monitoring/index';

// Base Types and Interfaces
export type {
  AIServiceRequest,
  AIServiceResponse,
  AIServiceError,
  ContactExtractionRequest,
  ContactExtractionResponse,
  ContentAnalysisRequest,
  ContentAnalysisResponse,
  WebSearchRequest,
  WebSearchResponse,
  ContentScrapingRequest,
  ContentScrapingResponse,
  ExtractedContact,
  SearchResult,
  ServiceHealth,
  RateLimitInfo,
  QuotaInfo,
  IAIService
} from './base/types';

// Utility Functions
export const createAIRequest = (
  operation: string,
  userId?: string,
  metadata?: Record<string, any>
) => ({
  correlationId: Math.random().toString(36).substr(2, 9),
  userId,
  operation,
  timestamp: Date.now(),
  metadata
});

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return '';
  }
};

export const calculateReadingTime = (content: string): number => {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  return Math.ceil(words / wordsPerMinute);
};

// Error handling utilities
export class AIServiceError extends Error {
  public readonly code: string;
  public readonly type: string;
  public readonly retryable: boolean;
  public readonly details?: any;

  constructor(
    code: string,
    message: string,
    type: string,
    retryable: boolean = false,
    details?: any
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.type = type;
    this.retryable = retryable;
    this.details = details;
  }
}

// Constants
export const AI_SERVICES = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  EXA: 'exa',
  FIRECRAWL: 'firecrawl'
} as const;

export const AI_OPERATIONS = {
  SEARCH_WEB: 'searchWeb',
  EXTRACT_CONTACTS: 'extractContacts',
  ANALYZE_CONTENT: 'analyzeContent',
  SCRAPE_CONTENT: 'scrapeContent',
  GENERATE_EMBEDDINGS: 'generateEmbeddings',
  VALIDATE_CONTACTS: 'validateContacts'
} as const;

export const AI_ERROR_TYPES = {
  NETWORK: 'NETWORK',
  API: 'API',
  AUTHENTICATION: 'AUTHENTICATION',
  RATE_LIMIT: 'RATE_LIMIT',
  QUOTA: 'QUOTA',
  VALIDATION: 'VALIDATION',
  INTERNAL: 'INTERNAL'
} as const;

// Default configurations
export const DEFAULT_AI_CONFIG = {
  global: {
    enableCaching: true,
    cacheTTLLocal: 3600,
    cacheTTLCold: 86400,
    enableMetrics: true,
    enableAuditLogging: true,
    environment: 'development' as const,
    logLevel: 'info' as const
  }
};

export const DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrorTypes: ['NETWORK', 'API', 'RATE_LIMIT']
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  recoveryTimeoutMs: 60000,
  monitoringPeriodMs: 300000,
  expectedRecoveryTimeMs: 30000
};

export const DEFAULT_CACHE_CONFIG = {
  enabled: true,
  ttlLocal: 3600,
  ttlCold: 86400,
  maxSize: 1000,
  keyPrefix: 'ai'
};

// Health check utilities
export const performHealthCheck = async (): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    error?: string;
  }>;
  timestamp: string;
}> => {
  try {
    const services = await aiServiceManager.getServiceHealth();
    const overallStatus = services.every(s => s.status === 'healthy') ? 'healthy' :
                          services.some(s => s.status === 'unhealthy') ? 'unhealthy' : 'degraded';

    return {
      status: overallStatus,
      services: services.map(s => ({
        name: s.service,
        status: s.status,
        responseTime: s.responseTime,
        error: s.lastError
      })),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      services: [],
      timestamp: new Date().toISOString()
    };
  }
};

// Initialize function for convenience
export const initializeAIServices = async (): Promise<void> => {
  try {
    await aiServiceManager.initialize();
    console.info('AI Services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize AI Services:', error);
    throw error;
  }
};

// Export a convenient default export
export default {
  // Services
  manager: aiServiceManager,
  config: aiConfigManager,
  security: aiSecurityManager,
  monitoring: aiPerformanceMonitor,

  // Individual services
  openai: openAIService,
  anthropic: anthropicService,
  exa: exaService,
  firecrawl: firecrawlService,

  // Utilities
  initialize: initializeAIServices,
  healthCheck: performHealthCheck,
  createRequest: createAIRequest,
  Error: AIServiceError,

  // Constants
  SERVICES: AI_SERVICES,
  OPERATIONS: AI_OPERATIONS,
  ERROR_TYPES: AI_ERROR_TYPES,
  DEFAULT_CONFIG: DEFAULT_AI_CONFIG
};