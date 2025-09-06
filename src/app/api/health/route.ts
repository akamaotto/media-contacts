import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { 
  performHealthCheck, 
  getConnectionMetrics, 
  getConnectionStats 
} from '@/lib/database/prisma-monitoring';
import { getDatabaseStatus } from '@/lib/database/database-monitor';
import { withRequestContext } from '@/lib/middleware/request-context';
import { withErrorInterception, commonErrorHandlers } from '@/lib/middleware/error-interceptor';
import { RequestTracker } from '@/lib/monitoring/request-tracker';

/**
 * Health check endpoint that connects to the database to keep it active
 * This helps prevent Neon database from going into suspend mode
 * Enhanced with comprehensive database monitoring
 */
async function getHealthStatus(request: NextRequest, { tracker }: { tracker: RequestTracker }) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';
  const stats = searchParams.get('stats') === 'true';
  const monitor = searchParams.get('monitor') === 'true';
  const traceId = tracker.getTraceId();

  console.log(`🏥 [HEALTH] [${traceId}] Health check requested: detailed=${detailed}, stats=${stats}, monitor=${monitor}`);

  try {
    // For comprehensive monitoring requests
    if (monitor) {
      tracker.trackOperationStart('comprehensive_monitoring');
      
      try {
        const databaseStatus = await getDatabaseStatus();
        
        tracker.trackOperationComplete('comprehensive_monitoring', {
          overall: databaseStatus.overall,
          connectionStatus: databaseStatus.connection.isConnected
        });
        
        const httpStatus = databaseStatus.overall === 'healthy' ? 200 : 
                          databaseStatus.overall === 'degraded' ? 200 : 503;
        
        console.log(`📊 [HEALTH] [${traceId}] Comprehensive monitoring completed: ${databaseStatus.overall}`);
        
        return NextResponse.json({
          status: databaseStatus.overall,
          timestamp: new Date().toISOString(),
          traceId,
          type: 'comprehensive',
          database: {
            overall: databaseStatus.overall,
            connection: {
              status: databaseStatus.connection.isConnected ? 'connected' : 'disconnected',
              responseTime: databaseStatus.connection.connectionTime,
              retryCount: databaseStatus.connection.retryCount,
              error: databaseStatus.connection.error
            },
            queries: {
              valid: databaseStatus.queries.isValid,
              executed: databaseStatus.queries.queriesExecuted,
              errors: databaseStatus.queries.errors.length,
              validationTime: databaseStatus.queries.validationTime
            },
            connectionPool: {
              status: databaseStatus.metrics.status,
              total: databaseStatus.metrics.totalConnections,
              active: databaseStatus.metrics.activeConnections,
              idle: databaseStatus.metrics.idleConnections,
              utilization: `${((databaseStatus.metrics.totalConnections / databaseStatus.metrics.connectionPoolSize) * 100).toFixed(1)}%`
            }
          },
          lastCheck: databaseStatus.lastCheck.toISOString()
        }, { status: httpStatus });
        
      } catch (monitoringError) {
        tracker.trackOperationFailed('comprehensive_monitoring', monitoringError instanceof Error ? monitoringError : new Error('Monitoring failed'));
        console.warn(`⚠️ [HEALTH] [${traceId}] Comprehensive monitoring failed, falling back to detailed check:`, monitoringError);
        // Fall through to detailed check
      }
    }

    // For detailed and stats requests, use the existing monitoring functions
    if (stats) {
      tracker.trackOperationStart('stats_check');
      
      try {
        const connectionStats = await getConnectionStats();
        
        tracker.trackOperationComplete('stats_check');
        console.log(`📈 [HEALTH] [${traceId}] Stats check completed successfully`);
        
        return NextResponse.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          traceId,
          type: 'statistics',
          data: connectionStats
        });
      } catch (monitoringError) {
        tracker.trackOperationFailed('stats_check', monitoringError instanceof Error ? monitoringError : new Error('Stats failed'));
        console.warn(`⚠️ [HEALTH] [${traceId}] Monitoring stats failed, falling back to basic check:`, monitoringError);
        // Fall through to basic check
      }
    }

    if (detailed) {
      tracker.trackOperationStart('detailed_check');
      
      try {
        const healthCheck = await performHealthCheck();
        const connectionMetrics = await getConnectionMetrics();
        
        tracker.trackOperationComplete('detailed_check', {
          healthStatus: healthCheck.status,
          connectionStatus: connectionMetrics.status
        });
        
        console.log(`🔍 [HEALTH] [${traceId}] Detailed check completed: ${healthCheck.status}`);
        
        return NextResponse.json({
          ...healthCheck,
          connectionMetrics,
          traceId,
          type: 'detailed'
        }, { 
          status: healthCheck.status === 'healthy' ? 200 : 503 
        });
      } catch (monitoringError) {
        tracker.trackOperationFailed('detailed_check', monitoringError instanceof Error ? monitoringError : new Error('Detailed check failed'));
        console.warn(`⚠️ [HEALTH] [${traceId}] Detailed health check failed, falling back to basic check:`, monitoringError);
        // Fall through to basic check
      }
    }

    // Basic health check - same simple query that works for media contacts
    tracker.trackOperationStart('basic_check');
    
    await prisma.$queryRaw`SELECT 1`;
    
    tracker.trackOperationComplete('basic_check');
    console.log(`✅ [HEALTH] [${traceId}] Basic health check completed successfully`);
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      traceId,
      database: 'connected',
      type: 'basic'
    });
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    tracker.logError(err, 'health_check');
    console.error(`❌ [HEALTH] [${traceId}] Health check failed:`, err.message);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      traceId,
      database: 'disconnected',
      type: 'basic',
      error: err.message
    }, { status: 503 });
  }
}

// Wrap handler with error interception first, then request context
const errorInterceptedHandler = withErrorInterception(getHealthStatus, {
  enableAutoRecovery: false, // Don't auto-retry health checks
  logErrors: true,
  customErrorHandler: commonErrorHandlers.databaseConnectionError
});

// Export wrapped handler
export const GET = withRequestContext(errorInterceptedHandler, {
  enableLogging: true,
  additionalMetadata: (request) => {
    const { searchParams } = new URL(request.url);
    return {
      endpoint: '/api/health',
      feature: 'health_monitoring',
      checkType: searchParams.get('monitor') === 'true' ? 'comprehensive' :
                 searchParams.get('detailed') === 'true' ? 'detailed' :
                 searchParams.get('stats') === 'true' ? 'statistics' : 'basic'
    };
  }
});
