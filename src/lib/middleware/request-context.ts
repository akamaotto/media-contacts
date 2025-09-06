/**
 * Request Context Middleware
 * Automatically injects request context tracking into API endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { RequestTracker } from '@/lib/monitoring/request-tracker';
import { recordAPIRequest } from '@/lib/monitoring/api-health-monitor';

export interface RequestContextMiddlewareOptions {
  enableLogging?: boolean;
  trackUserAgent?: boolean;
  trackIP?: boolean;
  additionalMetadata?: (request: NextRequest) => Record<string, any>;
}

/**
 * Middleware to automatically inject request context tracking
 */
export function withRequestContext(
  handler: (request: NextRequest, context: { tracker: RequestTracker }) => Promise<NextResponse>,
  options: RequestContextMiddlewareOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const {
      enableLogging = true,
      trackUserAgent = true,
      trackIP = true,
      additionalMetadata
    } = options;

    // Create additional metadata
    const metadata: Record<string, any> = {};
    
    if (trackUserAgent) {
      metadata.userAgent = request.headers.get('user-agent');
    }
    
    if (additionalMetadata) {
      Object.assign(metadata, additionalMetadata(request));
    }

    // Create request tracker
    const tracker = RequestTracker.create(request, metadata);
    
    if (enableLogging) {
      console.log(`🎯 [REQUEST-CONTEXT] [${tracker.getTraceId()}] Request started: ${request.method} ${request.url}`);
    }

    try {
      // Track request start
      tracker.trackOperationStart('request_processing', {
        url: request.url,
        method: request.method
      });

      // Execute the handler with context
      const response = await handler(request, { tracker });

      // Track successful completion
      const endTime = Date.now();
      const responseTime = endTime - Date.now();
      
      tracker.trackOperationComplete('request_processing', {
        status: response.status,
        statusText: response.statusText,
        responseTime
      });

      // Record request for API health monitoring
      const url = new URL(request.url);
      recordAPIRequest({
        timestamp: new Date(),
        endpoint: url.pathname,
        method: request.method,
        responseTime,
        statusCode: response.status,
        success: response.status < 400,
        traceId: tracker.getTraceId(),
        userId: tracker.getContext().userId
      });

      // Add trace ID to response headers
      response.headers.set('X-Trace-ID', tracker.getTraceId());

      if (enableLogging) {
        const summary = tracker.getOperationSummary();
        console.log(`✅ [REQUEST-CONTEXT] [${tracker.getTraceId()}] Request completed successfully`, {
          status: response.status,
          operations: summary.total,
          totalDuration: `${summary.totalDuration}ms`
        });
      }

      return response;

    } catch (error) {
      // Track failed request
      const err = error instanceof Error ? error : new Error('Unknown error');
      const endTime = Date.now();
      const responseTime = endTime - Date.now();
      
      tracker.trackOperationFailed('request_processing', err);
      tracker.logError(err, 'request_processing');

      // Record failed request for API health monitoring
      const url = new URL(request.url);
      recordAPIRequest({
        timestamp: new Date(),
        endpoint: url.pathname,
        method: request.method,
        responseTime,
        statusCode: 500, // Default to 500 for unhandled errors
        success: false,
        errorCategory: 'application',
        traceId: tracker.getTraceId(),
        userId: tracker.getContext().userId
      });

      if (enableLogging) {
        console.error(`❌ [REQUEST-CONTEXT] [${tracker.getTraceId()}] Request failed:`, {
          error: err.message,
          url: request.url,
          method: request.method
        });
      }

      // Re-throw the error to be handled by the application
      throw error;

    } finally {
      // Clean up context after a delay to allow for any async logging
      setTimeout(() => {
        tracker.cleanup();
      }, 5000);
    }
  };
}

/**
 * Higher-order function to wrap API route handlers with request context
 */
export function withRequestTracking<T extends Record<string, any> = {}>(
  handlers: T,
  options: RequestContextMiddlewareOptions = {}
): T {
  const wrappedHandlers = {} as T;

  for (const [method, handler] of Object.entries(handlers)) {
    if (typeof handler === 'function') {
      wrappedHandlers[method as keyof T] = withRequestContext(handler, options) as T[keyof T];
    } else {
      wrappedHandlers[method as keyof T] = handler;
    }
  }

  return wrappedHandlers;
}

/**
 * Utility to extract request context from headers (for client-side usage)
 */
export function getTraceIdFromResponse(response: Response): string | null {
  return response.headers.get('X-Trace-ID');
}

/**
 * Utility to add trace ID to client requests
 */
export function addTraceIdToRequest(request: RequestInit, traceId: string): RequestInit {
  return {
    ...request,
    headers: {
      ...request.headers,
      'X-Parent-Trace-ID': traceId
    }
  };
}