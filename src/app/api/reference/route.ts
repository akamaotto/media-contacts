import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma';
import { performHealthCheck, getConnectionMetrics, logSlowQuery } from '@/lib/database/prisma-monitoring';
import { withRequestContext } from '@/lib/middleware/request-context';
import { withErrorInterception, commonErrorHandlers, createCustomErrorHandler } from '@/lib/middleware/error-interceptor';
import { executeWithRetry, executeWithFallback } from '@/lib/database/database-error-handler';
import { executeWithCircuitBreaker, getCircuitBreakerStats } from '@/lib/caching/circuit-breaker';
import { executeWithDatabaseRetry } from '@/lib/monitoring/retry-manager';
import { RequestTracker } from '@/lib/monitoring/request-tracker';

export const dynamic = 'force-dynamic';

// Local type for database-only reference data
type ReferenceFetchResult = {
  countries: Array<{ id: string; name: string; code: string; phone_code: string; capital: string; flag_emoji: string }>;
  beats: Array<{ id: string; name: string; description: string }>;
  regions: Array<{ id: string; name: string; code: string; category: string }>;
  languages: Array<{ id: string; name: string; code: string }>;
  outlets: Array<{ id: string; name: string; description: string; website: string | null }>;
};

/**
 * GET /api/reference - Get all reference data from database only
 * Database is the single source of truth - no fallback data
 */
async function getReferenceData(request: NextRequest, { tracker }: { tracker: RequestTracker }) {
  const requestStartTime = Date.now();
  const traceId = tracker.getTraceId();
  
  console.log(`🚀 [REFERENCE-API] [${traceId}] Starting reference data fetch from database...`);

  try {
    // Step 1: Authentication check
    tracker.trackOperationStart('authentication');
    const session = await auth();
    
    if (!session?.user) {
      tracker.trackOperationFailed('authentication', new Error('No session or user found'));
      const authError = new Error('Unauthorized');
      authError.name = 'AuthenticationError';
      throw authError;
    }
    
    tracker.setUser(session.user.id || session.user.email || 'unknown', session.user.id);
    tracker.trackOperationComplete('authentication', { 
      userId: session.user.id,
      email: session.user.email 
    });

    // Step 2: Database health check
    tracker.trackOperationStart('database_health_check');
    const healthCheck = await performHealthCheck();
    
    if (healthCheck.status === 'unhealthy') {
      tracker.trackOperationFailed('database_health_check', new Error('Database health check failed'), healthCheck.details);
      const dbError = new Error('Database connection unhealthy');
      dbError.name = 'DatabaseConnectionError';
      throw dbError;
    }

    tracker.trackOperationComplete('database_health_check', {
      status: healthCheck.status,
      responseTime: healthCheck.responseTime
    });

    // Step 3: Fetch all reference data from database
    tracker.trackOperationStart('reference_data_fetch');
    console.log(`🗄️ [REFERENCE-API] [${traceId}] Fetching data from database...`);

    const [countries, beats, regions, languages, outlets] = await Promise.all([
      prisma.countries.findMany({
        select: { id: true, name: true, code: true, phone_code: true, capital: true, flag_emoji: true },
        orderBy: { name: 'asc' }
      }),
      prisma.beats.findMany({
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' }
      }),
      prisma.regions.findMany({
        select: { id: true, name: true, code: true, category: true },
        orderBy: { name: 'asc' }
      }),
      prisma.languages.findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
      }),
      prisma.outlets.findMany({
        select: { id: true, name: true, description: true, website: true },
        orderBy: { name: 'asc' }
      })
    ]);

    tracker.trackOperationComplete('reference_data_fetch', {
      countriesCount: countries.length,
      beatsCount: beats.length,
      regionsCount: regions.length,
      languagesCount: languages.length,
      outletsCount: outlets.length
    });

    const totalRequestTime = Date.now() - requestStartTime;
    const counts = {
      countries: countries.length,
      beats: beats.length,
      regions: regions.length,
      languages: languages.length,
      outlets: outlets.length
    };

    console.log(`✅ [REFERENCE-API] [${traceId}] Database queries completed:`, counts);
    
    const response = NextResponse.json({
      success: true,
      data: {
        countries,
        beats,
        regions,
        languages,
        outlets
      },
      metadata: {
        traceId,
        timestamp: new Date().toISOString(),
        performance: {
          totalRequestTime,
          counts
        },
        database: {
          healthStatus: healthCheck.status,
          source: 'database'
        }
      }
    });

    // Cache for 5 minutes since data comes from database
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    response.headers.set('X-Data-Source', 'database');

    console.log(`🎉 [REFERENCE-API] [${traceId}] Request completed in ${totalRequestTime}ms`);
    return response;

  } catch (error) {
    throw error;
  }
}

// Create custom error handler for reference API
const referenceErrorHandler = createCustomErrorHandler({
  database_connection: commonErrorHandlers.databaseConnectionError,
  validation: commonErrorHandlers.validationError,
  rate_limit: commonErrorHandlers.rateLimitError,
  // Custom handler for reference-specific errors
  '*': (interceptedError) => {
    // Add reference-specific context to all errors
    const response = NextResponse.json({
      success: false,
      error: {
        id: interceptedError.metadata.errorId,
        message: interceptedError.analysis.userMessage,
        category: interceptedError.analysis.category,
        severity: interceptedError.analysis.severity,
        isRetryable: interceptedError.analysis.isRetryable,
        recoveryStrategy: interceptedError.analysis.recoveryStrategy,
        suggestedActions: interceptedError.analysis.suggestedActions,
        ...(interceptedError.analysis.retryAfterMs && { retryAfterMs: interceptedError.analysis.retryAfterMs }),
        ...(interceptedError.analysis.maxRetries && { maxRetries: interceptedError.analysis.maxRetries })
      },
      context: {
        traceId: interceptedError.context.traceId,
        timestamp: interceptedError.context.timestamp.toISOString(),
        endpoint: interceptedError.context.endpoint,
        method: interceptedError.context.method,
        feature: 'reference_data'
      },
      // Include debug info in development
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          technicalMessage: interceptedError.analysis.technicalMessage,
          originalError: interceptedError.originalError.message,
          ...(interceptedError.metadata.stackTrace && { stackTrace: interceptedError.metadata.stackTrace })
        }
      })
    }, { 
      status: interceptedError.analysis.category === 'authentication' ? 401 :
              interceptedError.analysis.category === 'authorization' ? 403 :
              interceptedError.analysis.category === 'validation' ? 400 :
              interceptedError.analysis.category === 'rate_limit' ? 429 :
              interceptedError.analysis.category === 'database_connection' ? 503 :
              interceptedError.analysis.category === 'database_timeout' ? 503 :
              interceptedError.analysis.category === 'network' ? 502 : 500
    });

    // Add retry-after header for retryable errors
    if (interceptedError.analysis.isRetryable && interceptedError.analysis.retryAfterMs) {
      response.headers.set('Retry-After', Math.ceil(interceptedError.analysis.retryAfterMs / 1000).toString());
    }

    return response;
  }
});

// Wrap handler with error interception first, then request context
const errorInterceptedHandler = withErrorInterception(getReferenceData, {
  enableAutoRecovery: true,
  logErrors: true,
  customErrorHandler: referenceErrorHandler
});

// Export the fully wrapped handler
export const GET = withRequestContext(errorInterceptedHandler, {
  enableLogging: true,
  trackUserAgent: true,
  trackIP: true,
  additionalMetadata: (request) => ({
    endpoint: '/api/reference',
    feature: 'reference_data'
  })
});