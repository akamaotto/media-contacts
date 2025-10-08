/**
 * AI API Middleware Stack
 * Implements authentication, rate limiting, logging, and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { AIRequestContext, RateLimitInfo, AIMiddlewareFunction } from './types';
import { AIAPIError, generateCorrelationId } from './errors';
import { AIRateLimiter } from './rate-limiter';
import { AILogger } from './logger';
import { AICorsMiddleware } from './cors';
import { AIValidationMiddleware } from './validation';

/**
 * Request ID Generation Middleware
 */
export async function requestIdMiddleware(
  request: NextRequest,
  context: Partial<AIRequestContext>
): Promise<NextRequest> {
  const correlationId = request.headers.get('x-correlation-id') || generateCorrelationId();

  // Add correlation ID to request headers for downstream processing
  const modifiedRequest = new Request(request.url, request);
  modifiedRequest.headers.set('x-correlation-id', correlationId);

  context.correlationId = correlationId;

  return modifiedRequest as NextRequest;
}

/**
 * Request Logging Middleware
 */
export async function requestLoggingMiddleware(
  request: NextRequest,
  context: Partial<AIRequestContext>
): Promise<NextRequest> {
  const startTime = Date.now();
  const correlationId = context.correlationId || generateCorrelationId();

  // Log incoming request
  await AILogger.logRequest({
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries()),
    ip: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown',
    correlationId,
    timestamp: new Date().toISOString(),
    userId: context.userId || null
  });

  // Store start time for response time calculation
  (request as any).__startTime = startTime;
  (request as any).__correlationId = correlationId;

  return request;
}

/**
 * CORS Middleware
 */
export async function corsMiddleware(
  request: NextRequest,
  context: Partial<AIRequestContext>
): Promise<NextRequest | Response> {
  return await AICorsMiddleware.handle(request);
}

/**
 * Authentication Middleware
 */
export async function authenticationMiddleware(
  request: NextRequest,
  context: Partial<AIRequestContext>
): Promise<NextRequest> {
  const correlationId = context.correlationId || generateCorrelationId();

  try {
    const session = await auth();

    if (!session?.user) {
      throw AIAPIError.authentication('Valid session required');
    }

    // Check user role - AI endpoints require USER role at minimum
    if (!['USER', 'ADMIN'].includes(session.user.role || '')) {
      throw AIAPIError.authorization('User role required for AI endpoints');
    }

    // Update context with user information
    context.userId = session.user.id;
    context.userRole = session.user.role as 'USER' | 'ADMIN';

    await AILogger.logAuthentication({
      userId: session.user.id,
      userRole: session.user.role,
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      correlationId,
      success: true
    });

    return request;

  } catch (error) {
    await AILogger.logAuthentication({
      userId: context.userId || null,
      userRole: context.userRole || null,
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      correlationId,
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    });

    throw error;
  }
}

/**
 * Rate Limiting Middleware
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  context: Partial<AIRequestContext>
): Promise<NextRequest> {
  const correlationId = context.correlationId || generateCorrelationId();
  const userId = context.userId;

  if (!userId) {
    throw AIAPIError.authentication('User ID required for rate limiting');
  }

  try {
    // Determine endpoint type for rate limiting
    const endpointType = determineEndpointType(request.url);
    const rateLimitInfo = await AIRateLimiter.checkLimit(userId, endpointType);

    // Add rate limit headers to response
    const response = new Response(null, { status: 200 });
    response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitInfo.resetTime.toString());

    if (rateLimitInfo.retryAfter) {
      response.headers.set('Retry-After', rateLimitInfo.retryAfter.toString());
    }

    // Store rate limit info for later use
    (request as any).__rateLimitInfo = rateLimitInfo;

    await AILogger.logRateLimit({
      userId,
      endpointType,
      limit: rateLimitInfo.limit,
      remaining: rateLimitInfo.remaining,
      correlationId
    });

    return request;

  } catch (error) {
    if (error instanceof AIAPIError && error.type === 'RATE_LIMIT') {
      await AILogger.logRateLimitViolation({
        userId,
        endpointType: determineEndpointType(request.url),
        correlationId,
        retryAfter: error.retryAfter
      });
    }
    throw error;
  }
}

/**
 * Input Validation Middleware
 */
export async function validationMiddleware(
  request: NextRequest,
  context: Partial<AIRequestContext>
): Promise<NextRequest> {
  const endpointType = determineEndpointType(request.url);

  return await AIValidationMiddleware.validate(request, endpointType);
}

/**
 * Error Handling Middleware
 */
export async function errorHandlingMiddleware(
  request: NextRequest,
  context: Partial<AIRequestContext>
): Promise<NextRequest> {
  // This middleware catches errors from previous middleware
  // and ensures proper error response format
  return request;
}

/**
 * Response Logging Middleware
 */
export async function responseLoggingMiddleware(
  response: Response,
  request: NextRequest,
  context: Partial<AIRequestContext>
): Promise<Response> {
  const correlationId = context.correlationId || (request as any).__correlationId;
  const startTime = (request as any).__startTime;
  const endTime = Date.now();

  const responseTime = startTime ? endTime - startTime : 0;

  await AILogger.logResponse({
    method: request.method,
    url: request.url,
    statusCode: response.status,
    responseTime,
    correlationId,
    userId: context.userId || null,
    timestamp: new Date().toISOString()
  });

  return response;
}

/**
 * Complete AI Middleware Stack
 */
export class AIMiddlewareStack {
  private static middlewares: AIMiddlewareFunction[] = [
    requestIdMiddleware,
    requestLoggingMiddleware,
    corsMiddleware,
    authenticationMiddleware,
    rateLimitMiddleware,
    validationMiddleware,
    errorHandlingMiddleware
  ];

  /**
   * Execute all middleware in sequence
   */
  static async execute(
    request: NextRequest,
    context: Partial<AIRequestContext> = {}
  ): Promise<{ request: NextRequest; context: AIRequestContext }> {
    let currentRequest = request;

    for (const middleware of this.middlewares) {
      const result = await middleware(currentRequest, context);

      // If middleware returns a Response, it means the request should be terminated early
      if (result instanceof Response) {
        throw result;
      }

      currentRequest = result;
    }

    // Ensure we have a complete context
    const completeContext: AIRequestContext = {
      userId: context.userId || null,
      userRole: context.userRole || null,
      ip: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      correlationId: context.correlationId || generateCorrelationId(),
      timestamp: Date.now()
    };

    return { request: currentRequest, context: completeContext };
  }

  /**
   * Execute middleware for specific endpoint types
   */
  static async executeForEndpoint(
    request: NextRequest,
    endpointType: 'search' | 'progress' | 'import' | 'health',
    context: Partial<AIRequestContext> = {}
  ): Promise<{ request: NextRequest; context: AIRequestContext }> {
    // Store endpoint type for downstream middleware
    (request as any).__endpointType = endpointType;

    return this.execute(request, context);
  }
}

/**
 * Utility functions
 */

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return 'unknown';
}

function determineEndpointType(url: string): 'search' | 'progress' | 'import' | 'health' {
  if (url.includes('/search')) return 'search';
  if (url.includes('/progress') || url.includes('/status')) return 'progress';
  if (url.includes('/import') || url.includes('/contacts')) return 'import';
  if (url.includes('/health')) return 'health';

  // Default to search for unknown endpoints
  return 'search';
}

/**
 * Apply middleware to Next.js route handler
 */
export function withAIMiddleware(
  handler: (request: NextRequest, context: AIRequestContext) => Promise<NextResponse>,
  options: {
    skipAuth?: boolean;
    skipRateLimit?: boolean;
    customMiddlewares?: AIMiddlewareFunction[];
  } = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let context: AIRequestContext;
    let processedRequest: NextRequest;

    try {
      // Build middleware stack based on options
      let middlewares = [...AIMiddlewareStack.middlewares];

      if (options.skipAuth) {
        middlewares = middlewares.filter(m => m !== authenticationMiddleware);
      }

      if (options.skipRateLimit) {
        middlewares = middlewares.filter(m => m !== rateLimitMiddleware);
      }

      if (options.customMiddlewares) {
        middlewares = [...middlewares, ...options.customMiddlewares];
      }

      // Execute middleware
      let currentRequest = request;
      const partialContext: Partial<AIRequestContext> = {};

      for (const middleware of middlewares) {
        const result = await middleware(currentRequest, partialContext);

        if (result instanceof Response) {
          return result as NextResponse;
        }

        currentRequest = result;
      }

      // Complete context
      context = {
        userId: partialContext.userId || null,
        userRole: partialContext.userRole || null,
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        correlationId: partialContext.correlationId || generateCorrelationId(),
        timestamp: Date.now()
      };

      processedRequest = currentRequest;

    } catch (error) {
      // Handle middleware errors
      const correlationId = generateCorrelationId();

      if (error instanceof Response) {
        return error as NextResponse;
      }

      const apiError = AIAPIError.fromUnknown(error);
      return NextResponse.json(
        apiError.toErrorResponse(correlationId),
        { status: apiError.statusCode }
      );
    }

    try {
      // Execute the actual route handler
      const response = await handler(processedRequest, context);

      // Add correlation ID to response headers
      response.headers.set('X-Correlation-ID', context.correlationId);

      // Add rate limit headers if available
      const rateLimitInfo = (processedRequest as any).__rateLimitInfo;
      if (rateLimitInfo) {
        response.headers.set('X-RateLimit-Limit', rateLimitInfo.limit.toString());
        response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
        response.headers.set('X-RateLimit-Reset', rateLimitInfo.resetTime.toString());
        if (rateLimitInfo.retryAfter) {
          response.headers.set('Retry-After', rateLimitInfo.retryAfter.toString());
        }
      }

      // Log response
      await responseLoggingMiddleware(response, processedRequest, context);

      return response;

    } catch (error) {
      // Handle handler errors
      const apiError = AIAPIError.fromUnknown(error);

      return NextResponse.json(
        apiError.toErrorResponse(context.correlationId),
        {
          status: apiError.statusCode,
          headers: {
            'X-Correlation-ID': context.correlationId
          }
        }
      );
    }
  };
}