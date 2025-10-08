/**
 * Search Orchestration Service Types
 * Defines interfaces and types for the search orchestration system
 */

import { SearchStatus } from '@prisma/client';

export interface SearchConfiguration {
  query: string;
  criteria: {
    countries?: string[];
    categories?: string[];
    beats?: string[];
    languages?: string[];
    domains?: string[];
    excludeDomains?: string[];
    dateRange?: {
      from: string;
      to: string;
    };
    safeSearch?: 'off' | 'moderate' | 'strict';
  };
  options: {
    maxResults?: number;
    maxContactsPerSource?: number;
    confidenceThreshold?: number;
    enableAIEnhancement?: boolean;
    enableContactExtraction?: boolean;
    enableContentScraping?: boolean;
    enableCaching?: boolean;
    strictValidation?: boolean;
    processingTimeout?: number;
    priority?: 'low' | 'normal' | 'high';
  };
}

export interface SearchJob {
  id: string;
  searchId: string;
  userId: string;
  configuration: SearchConfiguration;
  status: SearchStatus;
  progress: SearchProgress;
  results: SearchResult[];
  errors: string[];
  metadata: SearchJobMetadata;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SearchProgress {
  percentage: number;
  stage: SearchStage;
  message: string;
  currentStep: number;
  totalSteps: number;
  stageProgress: StageProgress;
}

export interface StageProgress {
  queryGeneration?: number;
  webSearch?: number;
  contentScraping?: number;
  contactExtraction?: number;
  resultAggregation?: number;
  finalization?: number;
}

export enum SearchStage {
  INITIALIZING = 'initializing',
  QUERY_GENERATION = 'query_generation',
  WEB_SEARCH = 'web_search',
  CONTENT_SCRAPING = 'content_scraping',
  CONTACT_EXTRACTION = 'contact_extraction',
  RESULT_AGGREGATION = 'result_aggregation',
  FINALIZATION = 'finalization',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface SearchResult {
  id: string;
  url: string;
  title: string;
  summary?: string;
  content?: string;
  publishedDate?: string;
  domain: string;
  authority: number;
  relevanceScore: number;
  confidenceScore: number;
  contacts: ExtractedContact[];
  metadata: SearchResultMetadata;
  sourceType: 'exa' | 'firecrawl' | 'manual';
  processingTime: number;
}

export interface ExtractedContact {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  email?: string;
  phone?: string;
  socialProfiles?: SocialProfile[];
  confidenceScore: number;
  relevanceScore: number;
  qualityScore: number;
  verificationStatus: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'MANUAL_REVIEW';
  extractionMethod: 'AI_BASED' | 'RULE_BASED' | 'HYBRID' | 'MANUAL';
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface SocialProfile {
  platform: string;
  url: string;
  username?: string;
  verified?: boolean;
}

export interface SearchResultMetadata {
  language?: string;
  region?: string;
  contentLength?: number;
  contentType?: string;
  author?: string;
  image?: string;
  contactCount?: number;
  extractionTime?: number;
  searchQuery?: string;
  matchedCriteria?: string[];
}

export interface SearchJobMetadata {
  correlationId: string;
  totalQueries: number;
  totalSources: number;
  totalContacts: number;
  processingTime: number;
  cacheHit: boolean;
  retryCount: number;
  costBreakdown: SearchCostBreakdown;
  performanceMetrics: SearchPerformanceMetrics;
}

export interface SearchCostBreakdown {
  queryGeneration: number;
  webSearch: number;
  contentScraping: number;
  contactExtraction: number;
  total: number;
}

export interface SearchPerformanceMetrics {
  queryGenerationTime: number;
  webSearchTime: number;
  contentScrapingTime: number;
  contactExtractionTime: number;
  resultAggregationTime: number;
  totalTime: number;
  sourcesProcessed: number;
  contactsFound: number;
  contactsImported: number;
  cacheHitRate: number;
  errorRate: number;
}

export interface AggregatedSearchResult {
  searchId: string;
  status: SearchStatus;
  totalResults: number;
  uniqueContacts: number;
  duplicateContacts: number;
  averageConfidence: number;
  averageQuality: number;
  processingTime: number;
  results: SearchResult[];
  contacts: ExtractedContact[];
  duplicates: DuplicateGroup[];
  metrics: SearchMetrics;
  errors?: string[];
}

export interface DuplicateGroup {
  id: string;
  similarityScore: number;
  duplicateType: 'EMAIL' | 'NAME_OUTLET' | 'NAME_TITLE' | 'OUTLET_TITLE' | 'SIMILAR_BIO' | 'SOCIAL_MEDIA';
  contacts: string[];
  selectedContact: string;
  verificationStatus: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'MANUAL_REVIEW';
  metadata: Record<string, any>;
}

export interface SearchMetrics {
  queryMetrics: {
    totalGenerated: number;
    totalDuplicates: number;
    averageScore: number;
    diversityScore: number;
    coverageByCriteria: Record<string, string[]>;
  };
  sourceMetrics: {
    totalSources: number;
    successfulSources: number;
    failedSources: number;
    averageAuthority: number;
    contentQualityDistribution: Record<string, number>;
  };
  contactMetrics: {
    totalFound: number;
    totalImported: number;
    averageConfidence: number;
    averageQuality: number;
    confidenceDistribution: Record<string, number>;
    extractionMethodBreakdown: Record<string, number>;
  };
  performanceMetrics: {
    processingSpeed: number;
    accuracyEstimate: number;
    cacheEffectiveness: number;
    costEfficiency: number;
  };
}

export interface SearchOrchestrationConfig {
  concurrency: {
    maxConcurrentSearches: number;
    maxConcurrentQueries: number;
    maxConcurrentExtractions: number;
  };
  timeouts: {
    queryGeneration: number;
    webSearch: number;
    contentScraping: number;
    contactExtraction: number;
    totalSearch: number;
  };
  retry: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  thresholds: {
    minRelevanceScore: number;
    minConfidenceScore: number;
    minQualityScore: number;
    maxResultsPerSource: number;
  };
}

export interface SearchRequest {
  userId: string;
  configuration: SearchConfiguration;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

export interface SearchResponse {
  searchId: string;
  status: SearchStatus;
  progress: SearchProgress;
  results?: SearchResult[];
  contacts?: ExtractedContact[];
  metrics?: SearchMetrics;
  errors?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgressUpdate {
  searchId: string;
  progress: SearchProgress;
  results?: SearchResult[];
  errors?: string[];
  timestamp: Date;
}

export interface CancellationRequest {
  searchId: string;
  userId: string;
  reason?: string;
}

export interface CancellationResponse {
  searchId: string;
  success: boolean;
  message: string;
  cancelledAt: Date;
}

export interface SearchFilter {
  status?: SearchStatus[];
  userId?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  query?: string;
  minContacts?: number;
  maxResults?: number;
}

export interface SearchStatistics {
  totalSearches: number;
  activeSearches: number;
  completedSearches: number;
  failedSearches: number;
  cancelledSearches: number;
  averageProcessingTime: number;
  averageContactsPerSearch: number;
  averageResultsPerSearch: number;
  cacheHitRate: number;
  errorRate: number;
  costPerSearch: number;
  searchesByTimeRange: Record<string, number>;
  topQueries: Array<{ query: string; count: number }>;
}

export interface OrchestrationError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  searchId?: string;
  stage?: SearchStage;
  retryable: boolean;
  suggestedAction?: string;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  services: ServiceHealth[];
  metrics: OrchestrationMetrics;
  activeSearches: number;
  queueSize: number;
  errorRate: number;
  averageResponseTime: number;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  uptime: number;
  lastError?: string;
  metadata?: Record<string, any>;
}

export interface OrchestrationMetrics {
  searchesProcessed: number;
  contactsFound: number;
  averageProcessingTime: number;
  cacheHitRate: number;
  costEfficiency: number;
  errorRate: number;
  concurrentSearches: number;
  queueUtilization: number;
  memoryUsage: number;
  cpuUsage: number;
}