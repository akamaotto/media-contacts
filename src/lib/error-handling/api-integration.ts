/**
 * API Integration Utilities
 * Helpers for integrating error handling into existing APIs
 */

import { NextRequest, NextResponse } from 'next/server';
import { AppError, ErrorContext, ERROR_CODES } from './error-types';
import { errorHandler } from './error-handler';
import { gracefulDegradation } from './fallback-system';
import { UserMessageGenerator } from './user-messages';

export interface APIErrorHandlerOptions {
  operationType?: string;
  enableFallback?: boolean;
  enableRetry?: boolean;
  logErrors?: boolean;
  includeStackTrace?: boolean;
}

/**
 * Wrap API route handler with error handling
 */
export function withErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: APIErrorHandlerOptions = {}
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const errorContext: ErrorContext = {
      timestamp: new Date(),
      operationType: options.operationType,
      endpoint: new URL(request.url).pathname,
      requestId: generateRequestId(),
      userAgent: request.headers.get('user-agent') || undefined,
      ip: getClientIP(request)
    };

    try {
      const response = await handler(request, context);
      
      // Log successful requests if needed
      if (options.logErrors) {
        console.info(`API Success: ${errorContext.endpoint}`, {
          duration: Date.now() - startTime,
          status: response.status
        });
      }
      
      return response;
    } catch (error) {
      const appError = error instanceof AppError 
        ? error 
        : normalizeAPIError(error as Error, errorContext);

      // Handle the error through our error handling system
      const result = await errorHandler.handleError(appError, errorContext);

      // Return appropriate error response
      return createErrorResponse(result.error || appError, options);
    }
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: AppError,
  options: APIErrorHandlerOptions = {}
): NextResponse {
  const userMessage = UserMessageGenerator.generateMessage(error, {
    operationType: options.operationType
  });

  const responseBody: any = {
    error: {
      code: error.code,
      message: userMessage.message,
      category: error.category,
      severity: error.severity,
      retryable: error.retryable,
      requestId: error.context.requestId
    }
  };

  // Add technical details in development
  if (process.env.NODE_ENV === 'development' || options.includeStackTrace) {
    responseBody.error.technicalMessage = error.technicalMessage;
    responseBody.error.stack = error.stack;
  }

  // Add retry information
  if (error.retryable) {
    responseBody.error.retryAfter = error.retryDelay;
    responseBody.error.maxRetries = error.maxRetries;
  }

  // Add fallback information
  if (error.fallbackOptions) {
    responseBody.error.fallbackOptions = error.fallbackOptions;
  }

  // Add help information
  if (userMessage.helpText) {
    responseBody.error.helpText = userMessage.helpText;
  }

  if (userMessage.actionUrl) {
    responseBody.error.actionUrl = userMessage.actionUrl;
  }

  // Determine HTTP status code
  const statusCode = getHTTPStatusCode(error);

  return NextResponse.json(responseBody, { status: statusCode });
}

/**
 * Normalize generic errors to AppError
 */
function normalizeAPIError(error: Error, context: ErrorContext): AppError {
  const message = error.message.toLowerCase();

  // Check for specific error patterns
  if (message.includes('fetch') || message.includes('network')) {
    return new AppError({
      code: ERROR_CODES.NETWORK_CONNECTION_FAILED,
      message: error.message,
      category: 'network' as any,
      severity: 'medium' as any,
      recoveryStrategy: 'retry' as any,
      userMessage: 'Network connection failed. Please try again.',
      technicalMessage: error.message,
      context,
      originalError: error,
      retryable: true,
      maxRetries: 3,
      retryDelay: 2000
    });
  }

  if (message.includes('timeout')) {
    return new AppError({
      code: ERROR_CODES.NETWORK_TIMEOUT,
      message: error.message,
      category: 'network' as any,
      severity: 'medium' as any,
      recoveryStrategy: 'retry' as any,
      userMessage: 'Request timed out. Please try again.',
      technicalMessage: error.message,
      context,
      originalError: error,
      retryable: true,
      maxRetries: 2,
      retryDelay: 5000
    });
  }

  // Default unknown error
  return new AppError({
    code: ERROR_CODES.UNKNOWN_ERROR,
    message: error.message,
    category: 'unknown' as any,
    severity: 'medium' as any,
    recoveryStrategy: 'retry' as any,
    userMessage: 'An unexpected error occurred. Please try again.',
    technicalMessage: error.message,
    context,
    originalError: error,
    retryable: true,
    maxRetries: 1
  });
}

/**
 * Get HTTP status code for error
 */
function getHTTPStatusCode(error: AppError): number {
  switch (error.category) {
    case 'authentication':
      return 401;
    case 'authorization':
      return 403;
    case 'validation':
      return 400;
    case 'rate_limit':
      return 429;
    case 'quota_exceeded':
      return 402; // Payment Required
    case 'network':
      return 503; // Service Unavailable
    case 'ai_service':
      return 503; // Service Unavailable
    case 'database':
      return 503; // Service Unavailable
    case 'external_api':
      return 502; // Bad Gateway
    case 'configuration':
      return 500; // Internal Server Error
    default:
      return 500; // Internal Server Error
  }
}

/**
 * Extract client IP from request
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return realIP || cfConnectingIP || 'unknown';
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware for AI operations with fallback
 */
export function withAIFallback<T>(
  primaryOperation: () => Promise<T>,
  operationType: 'research' | 'enrichment' | 'duplicate_detection',
  context: any = {}
) {
  return async (): Promise<NextResponse> => {
    try {
      const result = await gracefulDegradation.executeWithAutoFallback(
        primaryOperation,
        operationType,
        context
      );

      if (result.success) {
        const responseBody: any = {
          success: true,
          data: result.result
        };

        // Add fallback information if used
        if (result.fallbackUsed) {
          responseBody.fallback = {
            used: result.fallbackUsed,
            limitations: result.limitations
          };
        }

        return NextResponse.json(responseBody);
      } else {
        throw result.error;
      }
    } catch (error) {
      const errorContext: ErrorContext = {
        timestamp: new Date(),
        operationType,
        ...context
      };

      const appError = error instanceof AppError 
        ? error 
        : normalizeAPIError(error as Error, errorContext);

      return createErrorResponse(appError, { operationType });
    }
  };
}

/**
 * Utility for handling async operations in API routes
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  options: APIErrorHandlerOptions = {}
): Promise<{ success: boolean; data?: T; error?: AppError }> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    const appError = error instanceof AppError 
      ? error 
      : normalizeAPIError(error as Error, context);

    if (options.logErrors) {
      await errorHandler.handleError(appError, context);
    }

    return { success: false, error: appError };
  }
}

/**
 * Create success response with optional fallback info
 */
export function createSuccessResponse<T>(
  data: T,
  fallbackInfo?: { used: string; limitations: string[] }
): NextResponse {
  const responseBody: any = {
    success: true,
    data
  };

  if (fallbackInfo) {
    responseBody.fallback = fallbackInfo;
  }

  return NextResponse.json(responseBody);
}

/**
 * Validate request and handle validation errors
 */
export function validateRequest(
  request: any,
  schema: any,
  context: ErrorContext
): { valid: boolean; data?: any; error?: NextResponse } {
  try {
    const result = schema.parse(request);
    return { valid: true, data: result };
  } catch (error: any) {
    const validationError = new AppError({
      code: ERROR_CODES.INVALID_INPUT,
      message: 'Validation failed',
      category: 'validation' as any,
      severity: 'low' as any,
      recoveryStrategy: 'user_action_required' as any,
      userMessage: 'Please check your input and try again.',
      technicalMessage: error.message,
      context: {
        ...context,
        metadata: {
          validationErrors: error.errors || error.issues
        }
      },
      retryable: false
    });

    return {
      valid: false,
      error: createErrorResponse(validationError, { operationType: context.operationType })
    };
  }
}

/**
 * Rate limit handler
 */
export function handleRateLimit(
  rateLimitResult: { allowed: boolean; remaining: number; resetTime: number },
  context: ErrorContext
): NextResponse | null {
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
    
    const rateLimitError = new AppError({
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded',
      category: 'rate_limit' as any,
      severity: 'medium' as any,
      recoveryStrategy: 'retry' as any,
      userMessage: `Too many requests. Please wait ${retryAfter} seconds and try again.`,
      technicalMessage: 'Rate limit exceeded',
      context: {
        ...context,
        metadata: {
          retryAfter: retryAfter * 1000,
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }
      },
      retryable: true,
      maxRetries: 1,
      retryDelay: retryAfter * 1000
    });

    const response = createErrorResponse(rateLimitError);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimitResult.resetTime / 1000)));
    response.headers.set('Retry-After', String(retryAfter));

    return response;
  }

  return null;
}