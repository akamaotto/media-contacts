/**
 * Base types for AI service implementations
 */

export interface AIServiceRequest {
  correlationId: string;
  userId?: string;
  operation: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface AIServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AIServiceError;
  metadata: {
    correlationId: string;
    operation: string;
    duration: number;
    timestamp: number;
    service: string;
    tokensUsed?: number;
    cost?: number;
    cached?: boolean;
    retryCount?: number;
  };
}

export interface AIServiceError {
  code: string;
  message: string;
  type: 'NETWORK' | 'API' | 'AUTHENTICATION' | 'RATE_LIMIT' | 'QUOTA' | 'VALIDATION' | 'INTERNAL';
  retryable: boolean;
  retryAfter?: number;
  details?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrorTypes: string[];
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeoutMs: number;
  monitoringPeriodMs: number;
  expectedRecoveryTimeMs: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttlLocal: number; // seconds
  ttlCold: number; // seconds
  maxSize: number;
  keyPrefix: string;
}

export interface ServiceMetrics {
  service: string;
  operation: string;
  duration: number;
  success: boolean;
  tokensUsed?: number;
  cost?: number;
  cached: boolean;
  retryCount: number;
  timestamp: number;
  correlationId: string;
  userId?: string;
  errorCode?: string;
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: number;
  responseTime: number;
  errorRate: number;
  uptime: number;
  requestCount: number;
  errorCount: number;
  lastError?: string;
  metadata?: Record<string, any>;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  windowMs: number;
}

export interface QuotaInfo {
  limit: number;
  used: number;
  remaining: number;
  resetTime: number;
  period: 'daily' | 'monthly';
}

// Generic service interface
export interface IAIService {
  readonly serviceName: string;
  readonly version: string;

  /**
   * Initialize the service with configuration
   */
  initialize(): Promise<void>;

  /**
   * Check if the service is healthy and ready to accept requests
   */
  healthCheck(): Promise<ServiceHealth>;

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): Promise<RateLimitInfo | null>;

  /**
   * Get current quota usage
   */
  getQuotaStatus(): Promise<QuotaInfo | null>;

  /**
   * Shutdown the service gracefully
   */
  shutdown(): Promise<void>;
}

// Request/Response interfaces for different AI operations
export interface ContactExtractionRequest extends AIServiceRequest {
  content: string;
  context?: {
    source?: string;
    language?: string;
    region?: string;
    beats?: string[];
  };
  options?: {
    confidence?: number;
    maxContacts?: number;
    includeSocial?: boolean;
  };
}

export interface ContactExtractionResponse {
  contacts: ExtractedContact[];
  confidence: number;
  processingTime: number;
  sourceAnalysis: {
    type: 'article' | 'website' | 'social' | 'directory' | 'other';
    quality: 'high' | 'medium' | 'low';
    relevance: number;
  };
}

export interface ExtractedContact {
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  organization?: string;
  website?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
    mastodon?: string;
  };
  confidence: number;
  metadata?: {
    source?: string;
    extractedAt?: string;
    verificationStatus?: 'verified' | 'unverified' | 'pending';
  };
}

export interface ContentAnalysisRequest extends AIServiceRequest {
  content: string;
  analysisType: 'sentiment' | 'topic' | 'quality' | 'contact_density' | 'relevance';
  context?: {
    beats?: string[];
    regions?: string[];
    languages?: string[];
  };
  options?: {
    detailLevel?: 'basic' | 'detailed' | 'comprehensive';
    includeReasoning?: boolean;
  };
}

export interface ContentAnalysisResponse {
  analysis: {
    score: number;
    confidence: number;
    reasoning?: string;
    details?: Record<string, any>;
  };
  processingTime: number;
  metadata: {
    contentLength: number;
    language?: string;
    topics?: string[];
  };
}

export interface WebSearchRequest extends AIServiceRequest {
  query: string;
  filters?: {
    domains?: string[];
    excludeDomains?: string[];
    dateRange?: {
      from: string;
      to: string;
    };
    safeSearch?: 'off' | 'moderate' | 'strict';
  };
  options?: {
    maxResults?: number;
    includeSummaries?: boolean;
    sortBy?: 'relevance' | 'date' | 'authority';
  };
}

export interface WebSearchResponse {
  results: SearchResult[];
  totalResults: number;
  queryTime: number;
  searchId: string;
  metadata: {
    searchEngine: string;
    filters?: Record<string, any>;
  };
}

export interface SearchResult {
  url: string;
  title: string;
  summary?: string;
  publishedDate?: string;
  domain: string;
  authority: number;
  relevanceScore: number;
  metadata?: {
    language?: string;
    region?: string;
    contentLength?: number;
    contentType?: string;
  };
}

export interface ContentScrapingRequest extends AIServiceRequest {
  url: string;
  options?: {
    includeImages?: boolean;
    includeLinks?: boolean;
    waitForJavaScript?: number;
    customHeaders?: Record<string, string>;
    userAgent?: string;
  };
}

export interface ContentScrapingResponse {
  url: string;
  title: string;
  content: string;
  metadata: {
    contentType: string;
    contentLength: number;
    author?: string;
    publishedDate?: string;
    language?: string;
    wordCount: number;
    readingTime?: number;
  };
  links?: ExtractedLink[];
  images?: ExtractedImage[];
  error?: string;
}

export interface ExtractedLink {
  url: string;
  text?: string;
  type: 'internal' | 'external';
  trustScore?: number;
}

export interface ExtractedImage {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}