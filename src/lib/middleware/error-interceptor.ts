/**
 * Error Interceptor Middleware
 * Automatically intercepts and analyzes errors in API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { RequestTracker } from '@/lib/monitoring/request-tracker';
import { interceptError, createErrorResponse, type InterceptedError } from '@/lib/api/error-interceptor';

export interface ErrorInterceptorOptions {
  enableAutoRecovery?: boolean;
  logErrors?: boolean;
  includeStackTrace?: boolean;
  customErrorHandler?: (interceptedError: InterceptedError) => NextResponse | null;
}

/**
 * Middleware to automatically intercept and handle errors
 */
export function withErrorInterception(
  handler: (request: NextRequest, context: { tracker: RequestTracker }) => Promise<NextResponse>,
  options: ErrorInterceptorOptions = {}
) {
  return async (request: NextRequest, context: { tracker: RequestTracker }): Promise<NextResponse> => {
    const {
      enableAutoRecovery = true,
      logErrors = true,
      includeStackTrace = process.env.NODE_ENV === 'development',
      customErrorHandler
    } = options;

    const { tracker } = context;
    const traceId = tracker.getTraceId();

    try {
      // Execute the original handler
      return await handler(request, context);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error occurred');
      
      if (logErrors) {
        console.error(`🚨 [ERROR-MIDDLEWARE] [${traceId}] Unhandled error in ${request.method} ${request.url}:`, {
          error: err.message,
          stack: includeStackTrace ? err.stack : undefined
        });
      }

      // Intercept and analyze the error
      const interceptedError = interceptError(err, request, tracker, {
        url: request.url,
        method: request.method,
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer')
      });

      // Try custom error handler first
      if (customErrorHandler) {
        const customResponse = customErrorHandler(interceptedError);
        if (customResponse) {
          return customResponse;
        }
      }

      // Auto-recovery logic for specific error types
      if (enableAutoRecovery && interceptedError.analysis.recoveryStrategy === 'retry_immediately') {
        console.log(`🔄 [ERROR-MIDDLEWARE] [${traceId}] Attempting immediate retry for recoverable error`);
        
        try {
          // Track retry attempt
          tracker.trackOperationStart('auto_retry');
          
          // Retry the original handler
          const retryResult = await handler(request, context);
          
          tracker.trackOperationComplete('auto_retry', { success: true });
          console.log(`✅ [ERROR-MIDDLEWARE] [${traceId}] Auto-retry successful`);
          
          return retryResult;
          
        } catch (retryError) {
          const retryErr = retryError instanceof Error ? retryError : new Error('Retry failed');
          tracker.trackOperationFailed('auto_retry', retryErr);
          
          console.warn(`⚠️ [ERROR-MIDDLEWARE] [${traceId}] Auto-retry failed:`, retryErr.message);
          
          // Update the intercepted error with retry failure info
          interceptedError.metadata.additionalData = {
            ...interceptedError.metadata.additionalData,
            autoRetryAttempted: true,
            autoRetryFailed: true,
            retryError: retryErr.message
          };
        }
      }

      // Create structured error response
      return createErrorResponse(interceptedError);
    }
  };
}

/**
 * Higher-order function to wrap API route handlers with error interception
 */
export function withErrorHandling<T extends Record<string, any> = {}>(
  handlers: T,
  options: ErrorInterceptorOptions = {}
): T {
  const wrappedHandlers = {} as T;

  for (const [method, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function') {
      wrappedHandlers[method as keyof T] = withErrorInterception(handler, options) as T[keyof T];
    } else {
      wrappedHandlers[method as keyof T] = handler;
    }
  }

  return wrappedHandlers;
}

/**
 * Utility to create a complete API handler with both request tracking and error interception
 */
export function createAPIHandler(
  handler: (request: NextRequest, context: { tracker: RequestTracker }) => Promise<NextResponse>,
  options: {
    requestTracking?: {
      enableLogging?: boolean;
      trackUserAgent?: boolean;
      trackIP?: boolean;
      additionalMetadata?: (request: NextRequest) => Record<string, any>;
    };
    errorInterception?: ErrorInterceptorOptions;
  } = {}
) {
  // First wrap with error interception
  const errorInterceptedHandler = withErrorInterception(handler, options.errorInterception);
  
  // Then wrap with request tracking (this is done in the route file)
  return errorInterceptedHandler;
}

/**
 * Utility to handle specific error types with custom logic
 */
export function createCustomErrorHandler(
  handlers: Partial<Record<string, (interceptedError: InterceptedError) => NextResponse | null>>
): (interceptedError: InterceptedError) => NextResponse | null {
  return (interceptedError: InterceptedError) => {
    const { category, severity } = interceptedError.analysis;
    
    // Try category-specific handler
    const categoryHandler = handlers[category];
    if (categoryHandler) {
      const result = categoryHandler(interceptedError);
      if (result) return result;
    }
    
    // Try severity-specific handler
    const severityHandler = handlers[severity];
    if (severityHandler) {
      const result = severityHandler(interceptedError);
      if (result) return result;
    }
    
    // Try generic handler
    const genericHandler = handlers['*'];
    if (genericHandler) {
      return genericHandler(interceptedError);
    }
    
    return null;
  };
}

/**
 * Pre-built error handlers for common scenarios
 */
export const commonErrorHandlers = {
  /**
   * Handler for database connection errors with fallback
   */
  databaseConnectionError: (interceptedError: InterceptedError): NextResponse | null => {
    if (interceptedError.analysis.category === 'database_connection') {
      return NextResponse.json({
        success: false,
        error: {
          id: interceptedError.metadata.errorId,
          message: 'Our database is temporarily unavailable. Please try again in a few moments.',
          category: 'database_connection',
          severity: 'critical',
          isRetryable: true,
          recoveryStrategy: 'retry_with_backoff',
          suggestedActions: [
            'Wait 30 seconds and try again',
            'Check our status page for updates',
            'Contact support if the issue persists'
          ],
          retryAfterMs: 30000,
          maxRetries: 2
        },
        context: {
          traceId: interceptedError.context.traceId,
          timestamp: interceptedError.context.timestamp.toISOString(),
          endpoint: interceptedError.context.endpoint
        }
      }, { 
        status: 503,
        headers: {
          'Retry-After': '30'
        }
      });
    }
    return null;
  },

  /**
   * Handler for validation errors with detailed feedback
   */
  validationError: (interceptedError: InterceptedError): NextResponse | null => {
    if (interceptedError.analysis.category === 'validation') {
      return NextResponse.json({
        success: false,
        error: {
          id: interceptedError.metadata.errorId,
          message: interceptedError.analysis.userMessage,
          category: 'validation',
          severity: 'medium',
          isRetryable: false,
          recoveryStrategy: 'user_action_required',
          suggestedActions: interceptedError.analysis.suggestedActions,
          validationDetails: interceptedError.metadata.additionalData
        },
        context: {
          traceId: interceptedError.context.traceId,
          timestamp: interceptedError.context.timestamp.toISOString(),
          endpoint: interceptedError.context.endpoint
        }
      }, { status: 400 });
    }
    return null;
  },

  /**
   * Handler for rate limiting with progressive backoff
   */
  rateLimitError: (interceptedError: InterceptedError): NextResponse | null => {
    if (interceptedError.analysis.category === 'rate_limit') {
      const retryAfter = Math.min(interceptedError.analysis.retryAfterMs || 10000, 60000); // Cap at 1 minute
      
      return NextResponse.json({
        success: false,
        error: {
          id: interceptedError.metadata.errorId,
          message: 'You are making requests too quickly. Please slow down and try again.',
          category: 'rate_limit',
          severity: 'medium',
          isRetryable: true,
          recoveryStrategy: 'retry_with_backoff',
          suggestedActions: [
            `Wait ${Math.ceil(retryAfter / 1000)} seconds before trying again`,
            'Reduce the frequency of your requests',
            'Contact support if you need higher rate limits'
          ],
          retryAfterMs: retryAfter,
          maxRetries: 1
        },
        context: {
          traceId: interceptedError.context.traceId,
          timestamp: interceptedError.context.timestamp.toISOString(),
          endpoint: interceptedError.context.endpoint
        }
      }, { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil(retryAfter / 1000).toString(),
          'X-RateLimit-Reset': new Date(Date.now() + retryAfter).toISOString()
        }
      });
    }
    return null;
  }
};