/**
 * Shared type definitions for AI API endpoints
 */

import { NextRequest } from 'next/server';

// Request context for AI operations
export interface AIRequestContext {
  userId: string | null;
  userRole: 'ADMIN' | 'USER' | null;
  ip: string;
  userAgent: string;
  correlationId: string;
  timestamp: number;
}

// Search request types
export interface AISearchRequest {
  query: string;
  filters?: {
    beats?: string[];
    regions?: string[];
    countries?: string[];
    languages?: string[];
    categories?: string[];
    outletTypes?: string[];
  };
  maxResults?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface AISearchResponse {
  searchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  results?: any[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

// Progress tracking types
export interface SearchProgress {
  searchId: string;
  status: AISearchResponse['status'];
  progress: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  resultsFound?: number;
  errors?: string[];
}

// Contact import types
export interface ContactImportRequest {
  searchId: string;
  contactIds: string[];
  targetLists?: string[];
  tags?: string[];
}

export interface ContactImportResponse {
  importId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imported: number;
  failed: number;
  errors?: string[];
  createdAt: string;
}

// Error response types
export interface AIErrorResponse {
  success: false;
  error: string;
  type: AIErrorType;
  details?: any;
  correlationId: string;
  timestamp: string;
  retryable: boolean;
  retryAfter?: number;
}

export enum AIErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  RATE_LIMIT = 'RATE_LIMIT',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  DATABASE = 'DATABASE',
  TIMEOUT = 'TIMEOUT',
  INTERNAL = 'INTERNAL'
}

// Rate limiting types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// Pagination for AI results
export interface AIPagination {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// API Response wrapper
export interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AIErrorResponse;
  correlationId: string;
  timestamp: string;
  rateLimit?: RateLimitInfo;
}

// CORS configuration
export interface AICorsConfig {
  origins: string[];
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
}

// Request validation schemas
export interface AIValidationSchema {
  body?: any;
  query?: any;
  params?: any;
}

// Middleware types
export type AIMiddlewareFunction = (
  request: NextRequest,
  context: Partial<AIRequestContext>
) => Promise<NextRequest | Response>;

// Search filters
export interface AISearchFilters {
  query?: string;
  beats?: string[];
  regions?: string[];
  countries?: string[];
  languages?: string[];
  categories?: string[];
  outletTypes?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  verifiedOnly?: boolean;
}

// Health check types
export interface AIHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'healthy' | 'unhealthy';
    redis: 'healthy' | 'unhealthy';
    external_apis: 'healthy' | 'degraded' | 'unhealthy';
  };
  metrics: {
    responseTime: number;
    activeSearches: number;
    queueSize: number;
    errorRate: number;
  };
  timestamp: string;
}