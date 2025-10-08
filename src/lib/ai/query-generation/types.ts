/**
 * Query Generation Service Types
 * Types and interfaces for the AI-powered query generation system
 */

export interface QueryGenerationRequest {
  searchId: string;
  batchId: string;
  originalQuery: string;
  criteria: QueryCriteria;
  options: QueryGenerationOptions;
  userId: string;
}

export interface QueryCriteria {
  countries?: string[];
  categories?: string[];
  beats?: string[];
  languages?: string[];
  topics?: string[];
  outlets?: string[];
  regions?: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface QueryGenerationOptions {
  maxQueries: number;
  diversityThreshold: number;
  minRelevanceScore: number;
  enableAIEnhancement: boolean;
  fallbackStrategies: boolean;
  cacheEnabled: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface GeneratedQuery {
  id: string;
  searchId: string;
  batchId: string;
  originalQuery: string;
  generatedQuery: string;
  templateId?: string;
  queryType: QueryType;
  criteria: Partial<QueryCriteria>;
  scores: QueryScores;
  metadata: QueryMetadata;
  status: QueryStatus;
  processingTime?: number;
  errorMessage?: string;
  createdAt: Date;
}

export interface QueryScores {
  relevance: number;
  diversity: number;
  complexity: number;
  overall: number;
}

export interface QueryMetadata {
  country?: string;
  category?: string;
  beat?: string;
  language?: string;
  templateUsed?: string;
  aiEnhanced: boolean;
  processingMs: number;
  tokensGenerated?: number;
  modelUsed?: string;
}

export interface QueryTemplate {
  id: string;
  name: string;
  template: string;
  type: QueryTemplateType;
  criteria: Partial<QueryCriteria>;
  variables: Record<string, any>;
  priority: number;
  isActive: boolean;
  usageCount: number;
  successCount: number;
  averageConfidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueryPerformanceMetrics {
  queryId: string;
  operation: QueryOperationType;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: string;
  tokensProcessed?: number;
  tokensGenerated?: number;
  modelUsed?: string;
  successRate?: number;
  relevanceScore?: number;
  metadata?: Record<string, any>;
}

export interface QueryGenerationResult {
  searchId: string;
  batchId: string;
  originalQuery: string;
  queries: GeneratedQuery[];
  metrics: {
    totalGenerated: number;
    totalDuplicates: number;
    averageScore: number;
    processingTimeMs: number;
    diversityScore: number;
    coverageByCriteria: {
      countries: string[];
      categories: string[];
      beats: string[];
      languages: string[];
    };
  };
  status: 'completed' | 'partial' | 'failed';
  errors?: string[];
}

export interface QueryDeduplicationResult {
  duplicates: Array<{
    queryId: string;
    duplicateOf: string;
    similarity: number;
    reason: string;
  }>;
  uniqueQueries: string[];
  deduplicationStats: {
    totalProcessed: number;
    duplicatesRemoved: number;
    uniqueQueries: number;
  };
}

export interface QueryEnhancementRequest {
  baseQuery: string;
  criteria: Partial<QueryCriteria>;
  enhancementType: 'expansion' | 'refinement' | 'localization';
  targetCount: number;
  diversityBoost: boolean;
}

export interface QueryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  normalizedQuery?: string;
}

export interface QueryGenerationJob {
  id: string;
  searchId: string;
  batchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalQueries: number;
  processedQueries: number;
  startTime: Date;
  endTime?: Date;
  errorMessage?: string;
  metadata: Record<string, any>;
}

export interface QueryGenerationConfig {
  ai: {
    enabled: boolean;
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
  };
  templates: {
    maxTemplatesPerQuery: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  scoring: {
    relevanceWeight: number;
    diversityWeight: number;
    complexityWeight: number;
    minScore: number;
  };
  deduplication: {
    enabled: boolean;
    similarityThreshold: number;
    method: 'exact' | 'semantic' | 'hybrid';
  };
  performance: {
    trackingEnabled: boolean;
    batchProcessing: boolean;
    maxConcurrent: number;
    timeoutMs: number;
  };
}

export enum QueryType {
  BASE = 'BASE',
  ENHANCED = 'ENHANCED',
  LOCALIZED = 'LOCALIZED',
  EXPANDED = 'EXPANDED',
  REFINED = 'REFINED',
  FALLBACK = 'FALLBACK'
}

export enum QueryTemplateType {
  BASE = 'BASE',
  COUNTRY_SPECIFIC = 'COUNTRY_SPECIFIC',
  CATEGORY_SPECIFIC = 'CATEGORY_SPECIFIC',
  BEAT_SPECIFIC = 'BEAT_SPECIFIC',
  LANGUAGE_SPECIFIC = 'LANGUAGE_SPECIFIC',
  COMPOSITE = 'COMPOSITE'
}

export enum QueryStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum QueryOperationType {
  TEMPLATE_SELECTION = 'TEMPLATE_SELECTION',
  AI_ENHANCEMENT = 'AI_ENHANCEMENT',
  SCORING = 'SCORING',
  DEDUPLICATION = 'DEDUPLICATION',
  VALIDATION = 'VALIDATION',
  PERFORMANCE_TRACKING = 'PERFORMANCE_TRACKING'
}

export enum QueryEnhancementType {
  EXPANSION = 'expansion',
  REFINEMENT = 'refinement',
  LOCALIZATION = 'localization',
  DIVERSIFICATION = 'diversification',
  OPTIMIZATION = 'optimization'
}

// Error types
export class QueryGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly type: 'TEMPLATE_ERROR' | 'AI_ERROR' | 'SCORING_ERROR' | 'DEDUPLICATION_ERROR' | 'VALIDATION_ERROR',
    public readonly details?: any
  ) {
    super(message);
    this.name = 'QueryGenerationError';
  }
}

// Performance tracking interfaces
export interface QueryBatchMetrics {
  batchId: string;
  totalQueries: number;
  successfulQueries: number;
  failedQueries: number;
  averageScore: number;
  diversityScore: number;
  processingTimeMs: number;
  aiEnhancementTimeMs: number;
  deduplicationTimeMs: number;
  scoringTimeMs: number;
  timestamp: Date;
}

export interface QueryEffectivenessMetrics {
  searchId: string;
  queryId: string;
  searchResultsCount: number;
  contactsFound: number;
  averageRelevanceScore: number;
  conversionRate: number;
  timestamp: Date;
}