/**
 * Database Health Check Endpoint
 * Provides comprehensive database health monitoring for system monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseStatus, DatabaseMonitor } from '@/lib/database/database-monitor';
import { withRequestContext } from '@/lib/middleware/request-context';
import { withErrorInterception, commonErrorHandlers } from '@/lib/middleware/error-interceptor';
import { RequestTracker } from '@/lib/monitoring/request-tracker';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/database - Get comprehensive database health status
 */
async function getDatabaseHealth(request: NextRequest, { tracker }: { tracker: RequestTracker }) {
  const traceId = tracker.getTraceId();
  
  console.log(`🏥 [DB-HEALTH] [${traceId}] Starting database health check...`);

  try {
    tracker.trackOperationStart('database_health_check');

    // Get comprehensive database status
    const status = await getDatabaseStatus();
    
    tracker.trackOperationComplete('database_health_check', {
      overall: status.overall,
      connectionStatus: status.connection.isConnected,
      queryValidation: status.queries.isValid,
      metricsStatus: status.metrics.status
    });

    // Determine HTTP status code based on database status
    let httpStatus = 200;
    if (status.overall === 'offline' || status.overall === 'critical') {
      httpStatus = 503; // Service Unavailable
    } else if (status.overall === 'degraded') {
      httpStatus = 200; // OK but with warnings
    }

    const response = {
      status: status.overall,
      timestamp: new Date().toISOString(),
      traceId,
      checks: {
        connection: {
          status: status.connection.isConnected ? 'healthy' : 'unhealthy',
          responseTime: status.connection.connectionTime,
          retryCount: status.connection.retryCount,
          error: status.connection.error
        },
        queries: {
          status: status.queries.isValid ? 'healthy' : 'unhealthy',
          validationTime: status.queries.validationTime,
          queriesExecuted: status.queries.queriesExecuted,
          totalQueries: 7, // Based on our test queries
          errors: status.queries.errors
        },
        connectionPool: {
          status: status.metrics.status,
          totalConnections: status.metrics.totalConnections,
          activeConnections: status.metrics.activeConnections,
          idleConnections: status.metrics.idleConnections,
          poolSize: status.metrics.connectionPoolSize,
          utilization: `${((status.metrics.totalConnections / status.metrics.connectionPoolSize) * 100).toFixed(1)}%`
        },
        healthCheck: {
          status: status.health.status,
          responseTime: status.health.responseTime,
          connectionTest: status.health.connectionTest,
          queryTest: status.health.queryTest,
          message: status.health.message
        }
      },
      metadata: {
        lastCheck: status.lastCheck.toISOString(),
        checkDuration: Date.now() - status.lastCheck.getTime(),
        endpoint: '/api/health/database'
      }
    };

    console.log(`${httpStatus === 200 ? '✅' : '⚠️'} [DB-HEALTH] [${traceId}] Database health check completed: ${status.overall}`);

    return NextResponse.json(response, { status: httpStatus });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    tracker.trackOperationFailed('database_health_check', err);
    tracker.logError(err, 'database_health_check');

    console.error(`💥 [DB-HEALTH] [${traceId}] Health check failed:`, err.message);

    return NextResponse.json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      traceId,
      error: {
        message: 'Health check failed',
        details: err.message
      },
      checks: {
        connection: { status: 'unknown' },
        queries: { status: 'unknown' },
        connectionPool: { status: 'unknown' },
        healthCheck: { status: 'unknown' }
      },
      metadata: {
        endpoint: '/api/health/database',
        error: true
      }
    }, { status: 503 });
  }
}

/**
 * POST /api/health/database - Force a fresh health check
 */
async function forceDatabaseHealthCheck(request: NextRequest, { tracker }: { tracker: RequestTracker }) {
  const traceId = tracker.getTraceId();
  
  console.log(`🔄 [DB-HEALTH] [${traceId}] Forcing fresh database health check...`);

  try {
    tracker.trackOperationStart('force_health_check');

    // Create a new monitor instance to force fresh checks
    const monitor = new DatabaseMonitor();
    const status = await monitor.getStatus();
    
    tracker.trackOperationComplete('force_health_check', {
      overall: status.overall,
      forced: true
    });

    console.log(`✅ [DB-HEALTH] [${traceId}] Forced health check completed: ${status.overall}`);

    return NextResponse.json({
      status: status.overall,
      timestamp: new Date().toISOString(),
      traceId,
      forced: true,
      checks: {
        connection: {
          status: status.connection.isConnected ? 'healthy' : 'unhealthy',
          responseTime: status.connection.connectionTime,
          retryCount: status.connection.retryCount,
          error: status.connection.error
        },
        queries: {
          status: status.queries.isValid ? 'healthy' : 'unhealthy',
          validationTime: status.queries.validationTime,
          queriesExecuted: status.queries.queriesExecuted,
          errors: status.queries.errors
        },
        connectionPool: {
          status: status.metrics.status,
          utilization: `${((status.metrics.totalConnections / status.metrics.connectionPoolSize) * 100).toFixed(1)}%`
        }
      },
      metadata: {
        lastCheck: status.lastCheck.toISOString(),
        endpoint: '/api/health/database',
        forced: true
      }
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    tracker.trackOperationFailed('force_health_check', err);
    tracker.logError(err, 'force_health_check');

    return NextResponse.json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      traceId,
      forced: true,
      error: {
        message: 'Forced health check failed',
        details: err.message
      }
    }, { status: 503 });
  }
}

// Wrap handlers with error interception first, then request context
const errorInterceptedGET = withErrorInterception(getDatabaseHealth, {
  enableAutoRecovery: false, // Don't auto-retry health checks
  logErrors: true,
  customErrorHandler: commonErrorHandlers.databaseConnectionError
});

const errorInterceptedPOST = withErrorInterception(forceDatabaseHealthCheck, {
  enableAutoRecovery: false,
  logErrors: true,
  customErrorHandler: commonErrorHandlers.databaseConnectionError
});

// Export wrapped handlers
export const GET = withRequestContext(errorInterceptedGET, {
  enableLogging: true,
  additionalMetadata: (request) => ({
    endpoint: '/api/health/database',
    feature: 'database_health_monitoring'
  })
});

export const POST = withRequestContext(errorInterceptedPOST, {
  enableLogging: true,
  additionalMetadata: (request) => ({
    endpoint: '/api/health/database',
    feature: 'database_health_monitoring',
    action: 'force_health_check'
  })
});