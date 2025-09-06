/**
 * Standardized API Response Utilities
 * Provides consistent response structures for success and error cases
 */

import { NextResponse } from 'next/server';

export interface APISuccessResponse<T = any> {
  success: true;
  data: T;
  metadata?: {
    traceId?: string;
    timestamp: string;
    performance?: {
      totalRequestTime: number;
      operationCount?: number;
      [key: string]: any;
    };
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
    [key: string]: any;
  };
}

export interface APIErrorResponse {
  success: false;
  error: {
    id: string;
    message: string;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    isRetryable: boolean;
    recoveryStrategy: string;
    suggestedActions: string[];
    retryAfterMs?: number;
    maxRetries?: number;
    validationErrors?: Record<string, string[]>;
  };
  context: {
    traceId: string;
    timestamp: string;
    endpoint: string;
    method: string;
    userId?: string;
    [key: string]: any;
  };
  debug?: {
    technicalMessage: string;
    originalError: string;
    stackTrace?: string;
    [key: string]: any;
  };
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  metadata?: Partial<APISuccessResponse<T>['metadata']>,
  options?: {
    status?: number;
    headers?: Record<string, string>;
  }
): NextResponse {
  const response: APISuccessResponse<T> = {
    success: true,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  };

  const nextResponse = NextResponse.json(response, { status: options?.status || 200 });

  // Add custom headers
  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      nextResponse.headers.set(key, value);
    });
  }

  // Add trace ID header if available
  if (metadata?.traceId) {
    nextResponse.headers.set('X-Trace-ID', metadata.traceId);
  }

  return nextResponse;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: Partial<APIErrorResponse['error']> & { message: string },
  context: Partial<APIErrorResponse['context']> & { traceId: string; endpoint: string },
  options?: {
    status?: number;
    headers?: Record<string, string>;
    debug?: APIErrorResponse['debug'];
  }
): NextResponse {
  const response: APIErrorResponse = {
    success: false,
    error: {
      id: error.id ?? `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      message: error.message,
      category: error.category ?? 'application',
      severity: error.severity ?? 'medium',
      isRetryable: error.isRetryable ?? false,
      recoveryStrategy: error.recoveryStrategy ?? 'user_action_required',
      suggestedActions: error.suggestedActions ?? ['Try again later', 'Contact support if the issue persists'],
      retryAfterMs: error.retryAfterMs,
      maxRetries: error.maxRetries,
      validationErrors: error.validationErrors
    },
    context: {
      timestamp: new Date().toISOString(),
      method: 'GET',
      ...context
    },
    ...(options?.debug && { debug: options.debug })
  };

  const nextResponse = NextResponse.json(response, { status: options?.status || 500 });

  // Add custom headers
  if (options?.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      nextResponse.headers.set(key, value);
    });
  }

  // Add trace ID header
  nextResponse.headers.set('X-Trace-ID', context.traceId);

  // Add retry-after header for retryable errors
  if (error.isRetryable && error.retryAfterMs) {
    nextResponse.headers.set('Retry-After', Math.ceil(error.retryAfterMs / 1000).toString());
  }

  return nextResponse;
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(
  validationErrors: Record<string, string[]>,
  context: { traceId: string; endpoint: string; method?: string },
  message = 'Validation failed'
): NextResponse {
  return createErrorResponse(
    {
      message,
      category: 'validation',
      severity: 'medium',
      isRetryable: false,
      recoveryStrategy: 'user_action_required',
      suggestedActions: [
        'Review the validation errors below',
        'Correct the invalid fields',
        'Try your request again'
      ],
      validationErrors
    },
    context,
    { status: 400 }
  );
}

/**
 * Create an authentication error response
 */
export function createAuthErrorResponse(
  context: { traceId: string; endpoint: string; method?: string },
  message = 'Authentication required'
): NextResponse {
  return createErrorResponse(
    {
      message,
      category: 'authentication',
      severity: 'high',
      isRetryable: false,
      recoveryStrategy: 'user_action_required',
      suggestedActions: [
        'Log in to your account',
        'Check if your session has expired',
        'Contact support if you continue having issues'
      ]
    },
    context,
    { status: 401 }
  );
}

/**
 * Create an authorization error response
 */
export function createAuthorizationErrorResponse(
  context: { traceId: string; endpoint: string; method?: string },
  message = 'Insufficient permissions'
): NextResponse {
  return createErrorResponse(
    {
      message,
      category: 'authorization',
      severity: 'high',
      isRetryable: false,
      recoveryStrategy: 'user_action_required',
      suggestedActions: [
        'Contact your administrator for access',
        'Verify you have the correct permissions',
        'Log out and log back in'
      ]
    },
    context,
    { status: 403 }
  );
}

/**
 * Create a database connection error response
 */
export function createDatabaseErrorResponse(
  context: { traceId: string; endpoint: string; method?: string },
  message = 'Database connection issue',
  isRetryable = true
): NextResponse {
  return createErrorResponse(
    {
      message,
      category: 'database_connection',
      severity: 'critical',
      isRetryable,
      recoveryStrategy: isRetryable ? 'retry_with_backoff' : 'system_maintenance',
      suggestedActions: isRetryable ? [
        'Wait a few seconds and try again',
        'Check our status page for updates',
        'Contact support if the issue persists'
      ] : [
        'Our database is currently undergoing maintenance',
        'Please try again later',
        'Check our status page for updates'
      ],
      retryAfterMs: isRetryable ? 5000 : undefined,
      maxRetries: isRetryable ? 3 : undefined
    },
    context,
    { 
      status: 503,
      headers: isRetryable ? { 'Retry-After': '5' } : undefined
    }
  );
}

/**
 * Create a rate limit error response
 */
export function createRateLimitErrorResponse(
  context: { traceId: string; endpoint: string; method?: string },
  retryAfterMs = 60000,
  message = 'Rate limit exceeded'
): NextResponse {
  return createErrorResponse(
    {
      message,
      category: 'rate_limit',
      severity: 'medium',
      isRetryable: true,
      recoveryStrategy: 'retry_with_backoff',
      suggestedActions: [
        `Wait ${Math.ceil(retryAfterMs / 1000)} seconds before trying again`,
        'Reduce the frequency of your requests',
        'Contact support if you need higher rate limits'
      ],
      retryAfterMs,
      maxRetries: 1
    },
    context,
    { 
      status: 429,
      headers: {
        'Retry-After': Math.ceil(retryAfterMs / 1000).toString(),
        'X-RateLimit-Reset': new Date(Date.now() + retryAfterMs).toISOString()
      }
    }
  );
}

/**
 * Create a not found error response
 */
export function createNotFoundErrorResponse(
  context: { traceId: string; endpoint: string; method?: string },
  resource = 'Resource',
  message?: string
): NextResponse {
  return createErrorResponse(
    {
      message: message || `${resource} not found`,
      category: 'validation',
      severity: 'medium',
      isRetryable: false,
      recoveryStrategy: 'user_action_required',
      suggestedActions: [
        'Verify the resource exists',
        'Check your request parameters',
        'Contact support if you believe this is an error'
      ]
    },
    context,
    { status: 404 }
  );
}

/**
 * Utility to extract common context from request and tracker
 */
export function getResponseContext(
  request: Request,
  traceId: string,
  additionalContext?: Record<string, any>
): { traceId: string; endpoint: string; method: string; [key: string]: any } {
  const url = new URL(request.url);
  
  return {
    traceId,
    endpoint: url.pathname,
    method: request.method || 'GET',
    ...additionalContext
  };
}

/**
 * Type guard to check if a response is an error response
 */
export function isErrorResponse(response: any): response is APIErrorResponse {
  return response && response.success === false && response.error;
}

/**
 * Type guard to check if a response is a success response
 */
export function isSuccessResponse<T = any>(response: any): response is APISuccessResponse<T> {
  return response && response.success === true && response.data !== undefined;
}