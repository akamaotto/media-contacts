/**
 * AI API Shared Module Exports
 * Central export point for all AI API shared utilities
 */

// Types
export type {
  AIRequestContext,
  AISearchRequest,
  AISearchResponse,
  SearchProgress,
  ContactImportRequest,
  ContactImportResponse,
  AIErrorResponse,
  RateLimitInfo,
  AIPagination,
  AIResponse,
  AICorsConfig,
  AIValidationSchema,
  AIMiddlewareFunction,
  AISearchFilters,
  AIHealthCheck
} from './types';

export { AIErrorType } from './types';

// Errors
export {
  AIAPIError,
  ValidationError,
  RateLimitError,
  AIErrorHandler,
  AIValidator,
  generateCorrelationId
} from './errors';

// Middleware
export {
  requestIdMiddleware,
  requestLoggingMiddleware,
  corsMiddleware,
  authenticationMiddleware,
  rateLimitMiddleware,
  validationMiddleware,
  errorHandlingMiddleware,
  responseLoggingMiddleware,
  AIMiddlewareStack,
  withAIMiddleware
} from './middleware';

// Rate Limiting
export {
  AIRateLimiter,
  rateLimiter,
  applyRateLimit,
  isRateLimited
} from './rate-limiter';

// Logging
export {
  AILogger,
  logger,
  LogLevel,
  LogType
} from './logger';

// CORS
export {
  AICorsMiddleware,
  initializeCors,
  type CORSConfig
} from './cors';

// Validation
export {
  AIValidationMiddleware,
  AISearchSchema,
  AIProgressSchema,
  AIImportSchema,
  AIHealthSchema,
  AISearchQuerySchema,
  AIContactQuerySchema,
  withValidation
} from './validation';

// Utility functions
export function createAIResponse<T>(
  data: T,
  context: { correlationId: string },
  options: {
    success?: boolean;
    rateLimit?: RateLimitInfo;
    error?: string;
  } = {}
): AIResponse<T> {
  return {
    success: options.success !== false,
    data: options.error ? undefined : data,
    error: options.error ? {
      success: false,
      error: options.error,
      type: AIErrorType.INTERNAL,
      correlationId: context.correlationId,
      timestamp: new Date().toISOString(),
      retryable: false
    } : undefined,
    correlationId: context.correlationId,
    timestamp: new Date().toISOString(),
    rateLimit: options.rateLimit
  };
}

export function generateErrorResponse(
  error: string | Error,
  correlationId: string,
  type: AIErrorType = AIErrorType.INTERNAL
): AIErrorResponse {
  const message = error instanceof Error ? error.message : error;

  return {
    success: false,
    error: message,
    type,
    correlationId,
    timestamp: new Date().toISOString(),
    retryable: type === AIErrorType.EXTERNAL_SERVICE || type === AIErrorType.TIMEOUT
  };
}

// Re-export base classes for compatibility
export { BaseController } from '../../shared/base-controller';
export { BaseService } from '../../shared/base-service';
export { BaseRepository } from '../../shared/base-repository';
export { APIError, ErrorType } from '../../shared/errors';
export type { RequestContext, PaginationParams, APIResponse as BaseAPIResponse } from '../../shared/types';