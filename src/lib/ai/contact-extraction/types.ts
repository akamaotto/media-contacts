/**
 * Contact Extraction Pipeline Types
 * Types and interfaces for the AI-powered contact extraction system
 */

export interface ContactExtractionRequest {
  searchId: string;
  sources: Array<{
    url: string;
    type: string;
    priority?: 'low' | 'medium' | 'high';
  }>;
  options: ContactExtractionOptions;
  userId: string;
}

export interface ContactExtractionOptions {
  enableAIEnhancement: boolean;
  enableEmailValidation: boolean;
  enableSocialDetection: boolean;
  enableDuplicateDetection: boolean;
  enableQualityAssessment: boolean;
  enableCaching: boolean;
  confidenceThreshold: number;
  maxContactsPerSource: number;
  processingTimeout: number;
  batchSize: number;
  includeBio: boolean;
  includeSocialProfiles: boolean;
  strictValidation: boolean;
}

export interface ExtractedContact {
  id: string;
  extractionId: string;
  searchId: string;
  sourceUrl: string;
  name: string;
  title?: string;
  bio?: string;
  email?: string;
  emailType?: EmailType;
  emailValidation?: EmailValidationStatus;
  confidenceScore: number;
  relevanceScore: number;
  qualityScore: number;
  extractionMethod: ExtractionMethod;
  socialProfiles?: SocialProfile[];
  contactInfo?: ContactInfo;
  verificationStatus: VerificationStatus;
  duplicateOf?: string;
  isDuplicate: boolean;
  metadata: ExtractionMetadata;
  processingTimeMs?: number;
  createdAt: Date;
}

export interface SocialProfile {
  platform: string;
  handle: string;
  url: string;
  verified?: boolean;
  followers?: number;
  description?: string;
}

export interface ContactInfo {
  phone?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
  company?: string;
  location?: string;
  languages?: string[];
  beats?: string[];
  outlets?: string[];
}

export interface ExtractionMetadata {
  extractionMethod: ExtractionMethod;
  contentHash?: string;
  textSegments?: TextSegment[];
  aiModelUsed?: string;
  tokensProcessed?: number;
  confidenceFactors?: ConfidenceFactors;
  qualityFactors?: QualityFactors;
  processingSteps: ProcessingStep[];
  validationResults?: ValidationResults;
}

export interface TextSegment {
  type: 'name' | 'email' | 'title' | 'bio' | 'social' | 'contact';
  text: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  context: string;
}

export interface ConfidenceFactors {
  nameConfidence: number;
  emailConfidence: number;
  titleConfidence: number;
  bioConfidence: number;
  socialConfidence: number;
  overallConfidence: number;
}

export interface QualityFactors {
  sourceCredibility: number;
  contentFreshness: number;
  contactCompleteness: number;
  informationConsistency: number;
  overallQuality: number;
}

export interface ProcessingStep {
  operation: ExtractionOperationType;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  details?: any;
  tokensUsed?: number;
  modelUsed?: string;
}

export interface ValidationResults {
  emailValidation?: EmailValidationResult;
  socialValidation?: SocialValidationResult;
  nameValidation?: NameValidationResult;
  overallValidation: 'valid' | 'invalid' | 'suspicious' | 'needs_review';
}

export interface EmailValidationResult {
  email: string;
  isValid: boolean;
  isDisposable: boolean;
  isTemporary: boolean;
  domainExists: boolean;
  mxRecords: boolean;
  spamScore: number;
  suggestions?: string[];
  reasoning: string;
}

export interface SocialValidationResult {
  platform: string;
  handle: string;
  isValid: boolean;
  isVerified: boolean;
  followerCount: number;
  activityScore: number;
  spamIndicators: string[];
  reasoning: string;
}

export interface NameValidationResult {
  name: string;
  isValid: boolean;
  isRealistic: boolean;
  hasTitle: boolean;
  formatType: 'full_name' | 'first_last' | 'first_only' | 'suspicious';
  confidence: number;
  suggestions?: string[];
  reasoning: string;
}

export interface ContactExtractionResult {
  extractionId: string;
  searchId: string;
  status: ExtractionStatus;
  sourcesProcessed: number;
  contactsFound: number;
  contactsImported: number;
  averageConfidence: number;
  averageQuality: number;
  processingTimeMs: number;
  contacts: ExtractedContact[];
  duplicates: DuplicateGroup[];
  errors?: string[];
  metrics: ExtractionMetrics;
}

export interface DuplicateGroup {
  id: string;
  contacts: string[];
  similarityScore: number;
  duplicateType: DuplicateType;
  confidenceScore: number;
  selectedContact?: string;
  reasoning: string;
}

export interface ExtractionMetrics {
  processingSpeed: number; // contacts per second
  accuracyEstimate: number; // based on validation
  confidenceDistribution: {
    high: number; // > 0.8
    medium: number; // 0.5 - 0.8
    low: number; // < 0.5
  };
  extractionMethodBreakdown: Record<ExtractionMethod, number>;
  sourceQualityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  validationResults: {
    emailValidationRate: number;
    socialValidationRate: number;
    duplicateDetectionRate: number;
  };
}

export interface ExtractionJob {
  id: string;
  searchId: string;
  sourceUrl: string;
  sourceType: string;
  status: ExtractionStatus;
  contentHash?: string;
  processingTimeMs?: number;
  contactsFound: number;
  contactsImported: number;
  averageConfidence?: number;
  qualityScore?: number;
  errorMessage?: string;
  metadata?: any;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractionCacheEntry {
  id: string;
  contentHash: string;
  sourceUrl: string;
  extractedData: ExtractedContact[];
  contactCount: number;
  qualityScore?: number;
  expiresAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  createdAt: Date;
}

export interface ExtractionPerformanceLog {
  id: string;
  extractionId: string;
  searchId: string;
  operation: ExtractionOperationType;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: string;
  contentLength?: number;
  contactsProcessed?: number;
  tokensUsed?: number;
  modelUsed?: string;
  successRate?: number;
  confidence?: number;
  metadata?: any;
  createdAt: Date;
}

export interface ContentQualityAssessment {
  url: string;
  credibility: number;
  relevance: number;
  freshness: number;
  authority: number;
  spamScore: number;
  contentLength: number;
  language: string;
  hasContactInfo: boolean;
  isJournalistic: boolean;
  overallScore: number;
  factors: QualityFactors;
  recommendations: string[];
}

export interface ExtractionConfig {
  ai: {
    enabled: boolean;
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
  };
  validation: {
    emailValidation: boolean;
    socialValidation: boolean;
    nameValidation: boolean;
    strictMode: boolean;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  processing: {
    maxConcurrent: number;
    batchSize: number;
    timeoutMs: number;
    retryAttempts: number;
  };
  quality: {
    minConfidence: number;
    minQuality: number;
    enableAssessment: boolean;
  };
}

// Enums
export enum ExtractionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export enum EmailType {
  PERSONAL = 'PERSONAL',
  ALIAS = 'ALIAS',
  GENERIC = 'GENERIC',
  DEPARTMENT = 'DEPARTMENT',
  UNKNOWN = 'UNKNOWN'
}

export enum EmailValidationStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  INVALID = 'INVALID',
  TEMPORARY = 'TEMPORARY',
  DISPOSABLE = 'DISPOSABLE',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED'
}

export enum ExtractionMethod {
  AI_BASED = 'AI_BASED',
  RULE_BASED = 'RULE_BASED',
  HYBRID = 'HYBRID',
  MANUAL = 'MANUAL'
}

export enum ExtractionOperationType {
  CONTENT_FETCHING = 'CONTENT_FETCHING',
  CONTENT_PARSING = 'CONTENT_PARSING',
  AI_EXTRACTION = 'AI_EXTRACTION',
  EMAIL_VALIDATION = 'EMAIL_VALIDATION',
  SOCIAL_DETECTION = 'SOCIAL_DETECTION',
  CONFIDENCE_SCORING = 'CONFIDENCE_SCORING',
  DUPLICATE_DETECTION = 'DUPLICATE_DETECTION',
  QUALITY_ASSESSMENT = 'QUALITY_ASSESSMENT',
  CACHING = 'CACHING',
  VALIDATION = 'VALIDATION'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  MANUAL_REVIEW = 'MANUAL_REVIEW'
}

export enum DuplicateType {
  EMAIL = 'EMAIL',
  NAME_OUTLET = 'NAME_OUTLET',
  NAME_TITLE = 'NAME_TITLE',
  OUTLET_TITLE = 'OUTLET_TITLE',
  SIMILAR_BIO = 'SIMILAR_BIO',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA'
}

// Error types
export class ContactExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly type: 'PARSING_ERROR' | 'AI_ERROR' | 'VALIDATION_ERROR' | 'CACHE_ERROR' | 'EXTRACTION_ERROR',
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ContactExtractionError';
  }
}

// Content types
export interface ParsedContent {
  url: string;
  title?: string;
  content: string;
  html?: string;
  metadata: ContentMetadata;
  links: string[];
  images: string[];
  language?: string;
  publishedAt?: Date;
  author?: string;
}

export interface ContentMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  author?: string;
  publishedAt?: string;
  language?: string;
  wordCount?: number;
  readingTime?: number;
  domain?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
}

// Processing interfaces
export interface BatchProcessingRequest {
  extractionId: string;
  sources: Array<{
    url: string;
    type: string;
    priority: number;
  }>;
  options: ContactExtractionOptions;
  maxConcurrent: number;
}

export interface BatchProcessingResult {
  extractionId: string;
  totalSources: number;
  processedSources: number;
  successfulSources: number;
  failedSources: number;
  totalContacts: number;
  processingTimeMs: number;
  results: Array<{
    url: string;
    status: ExtractionStatus;
    contacts: ExtractedContact[];
    error?: string;
  }>;
}

// Monitoring interfaces
export interface ExtractionStatistics {
  totalExtractions: number;
  successfulExtractions: number;
  averageContactsPerSource: number;
  averageConfidence: number;
  averageProcessingTime: number;
  extractionMethodBreakdown: Record<ExtractionMethod, number>;
  sourceTypeBreakdown: Record<string, number>;
  qualityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  validationStats: {
    emailValidationRate: number;
    duplicateDetectionRate: number;
    overallAccuracy: number;
  };
  performanceStats: {
    throughput: number; // sources per minute
    latency: number; // average processing time
    errorRate: number;
  };
}

// Utility types
export interface ContentHash {
  algorithm: string;
  hash: string;
  timestamp: Date;
}

export interface ExtractionProgress {
  extractionId: string;
  stage: ExtractionOperationType;
  progress: number; // 0-100
  currentSource?: string;
  contactsFound: number;
  estimatedTimeRemaining?: number;
}

export interface ExtractionFilter {
  confidenceMin?: number;
  confidenceMax?: number;
  qualityMin?: number;
  qualityMax?: number;
  extractionMethods?: ExtractionMethod[];
  emailTypes?: EmailType[];
  verificationStatuses?: VerificationStatus[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export interface ExtractionExport {
  format: 'json' | 'csv' | 'xlsx';
  filters?: ExtractionFilter;
  fields?: string[];
  includeMetadata?: boolean;
  includeValidationResults?: boolean;
}