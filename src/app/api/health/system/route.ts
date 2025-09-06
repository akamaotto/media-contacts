/**
 * System Health Check Endpoint
 * Comprehensive health check that verifies all system dependencies
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSystemHealth, apiHealthMonitor } from '@/lib/monitoring/api-health-monitor';
import { withRequestContext } from '@/lib/middleware/request-context';
import { withErrorInterception } from '@/lib/middleware/error-interceptor';
import { RequestTracker } from '@/lib/monitoring/request-tracker';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/system - Get comprehensive system health status
 */
async function getSystemHealthStatus(request: NextRequest, { tracker }: { tracker: RequestTracker }) {
  const traceId = tracker.getTraceId();
  
  console.log(`🏥 [SYSTEM-HEALTH] [${traceId}] Starting comprehensive system health check...`);

  try {
    tracker.trackOperationStart('system_health_check');

    // Get comprehensive system health metrics
    const systemHealth = await getSystemHealth();
    
    // Check all registered dependencies
    const dependencyResults = await apiHealthMonitor.checkAllDependencies();
    
    // Get endpoint performance summary
    const performanceSummary = apiHealthMonitor.getEndpointPerformanceSummary();
    
    tracker.trackOperationComplete('system_health_check', {
      overall: systemHealth.overall,
      endpointsChecked: Object.keys(systemHealth.endpoints).length,
      dependenciesChecked: Object.keys(dependencyResults).length
    });

    // Determine HTTP status based on system health
    let httpStatus = 200;
    if (systemHealth.overall === 'offline' || systemHealth.overall === 'critical') {
      httpStatus = 503; // Service Unavailable
    } else if (systemHealth.overall === 'degraded') {
      httpStatus = 200; // OK but with warnings
    }

    // Check for critical dependency failures
    const criticalDependencyFailures = Object.entries(dependencyResults)
      .filter(([_, result]) => result.critical && !result.healthy);
    
    if (criticalDependencyFailures.length > 0) {
      httpStatus = 503;
    }

    const response = {
      status: systemHealth.overall,
      timestamp: systemHealth.timestamp.toISOString(),
      traceId,
      uptime: systemHealth.uptime,
      summary: {
        endpoints: {
          total: performanceSummary.totalEndpoints,
          healthy: performanceSummary.healthyEndpoints,
          degraded: performanceSummary.degradedEndpoints,
          critical: performanceSummary.criticalEndpoints,
          overallSuccessRate: performanceSummary.overallSuccessRate,
          averageResponseTime: performanceSummary.averageResponseTime,
          totalRequests: performanceSummary.totalRequests
        },
        database: systemHealth.database,
        circuitBreakers: Object.keys(systemHealth.circuitBreakers).length,
        dependencies: {
          total: Object.keys(dependencyResults).length,
          healthy: Object.values(dependencyResults).filter(r => r.healthy).length,
          unhealthy: Object.values(dependencyResults).filter(r => !r.healthy).length,
          critical: Object.values(dependencyResults).filter(r => r.critical && !r.healthy).length
        },
        alerts: systemHealth.alerts
      },
      details: {
        endpoints: systemHealth.endpoints,
        circuitBreakers: systemHealth.circuitBreakers,
        dependencies: dependencyResults,
        systemResources: systemHealth.systemResources
      },
      metadata: {
        checkDuration: Date.now() - systemHealth.timestamp.getTime(),
        endpoint: '/api/health/system'
      }
    };

    console.log(`${httpStatus === 200 ? '✅' : '⚠️'} [SYSTEM-HEALTH] [${traceId}] System health check completed: ${systemHealth.overall}`, {
      endpoints: `${performanceSummary.healthyEndpoints}/${performanceSummary.totalEndpoints} healthy`,
      dependencies: `${Object.values(dependencyResults).filter(r => r.healthy).length}/${Object.keys(dependencyResults).length} healthy`,
      criticalFailures: criticalDependencyFailures.length
    });

    return NextResponse.json(response, { status: httpStatus });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    tracker.trackOperationFailed('system_health_check', err);
    tracker.logError(err, 'system_health_check');

    console.error(`💥 [SYSTEM-HEALTH] [${traceId}] System health check failed:`, err.message);

    return NextResponse.json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      traceId,
      error: {
        message: 'System health check failed',
        details: err.message
      },
      summary: {
        endpoints: { total: 0, healthy: 0, degraded: 0, critical: 0 },
        database: { status: 'unknown' },
        dependencies: { total: 0, healthy: 0, unhealthy: 0, critical: 0 },
        alerts: { active: 1, critical: 1, warnings: 0 }
      },
      metadata: {
        endpoint: '/api/health/system',
        error: true
      }
    }, { status: 503 });
  }
}

/**
 * POST /api/health/system - Force a fresh system health check with dependency verification
 */
async function forceSystemHealthCheck(request: NextRequest, { tracker }: { tracker: RequestTracker }) {
  const traceId = tracker.getTraceId();
  
  console.log(`🔄 [SYSTEM-HEALTH] [${traceId}] Forcing fresh system health check...`);

  try {
    tracker.trackOperationStart('force_system_health_check');

    // Force fresh health check
    const systemHealth = await getSystemHealth();
    
    // Force dependency checks
    const dependencyResults = await apiHealthMonitor.checkAllDependencies();
    
    // Get fresh performance metrics
    const performanceSummary = apiHealthMonitor.getEndpointPerformanceSummary();
    
    tracker.trackOperationComplete('force_system_health_check', {
      overall: systemHealth.overall,
      forced: true
    });

    console.log(`✅ [SYSTEM-HEALTH] [${traceId}] Forced system health check completed: ${systemHealth.overall}`);

    return NextResponse.json({
      status: systemHealth.overall,
      timestamp: new Date().toISOString(),
      traceId,
      forced: true,
      uptime: systemHealth.uptime,
      summary: {
        endpoints: {
          total: performanceSummary.totalEndpoints,
          healthy: performanceSummary.healthyEndpoints,
          degraded: performanceSummary.degradedEndpoints,
          critical: performanceSummary.criticalEndpoints,
          overallSuccessRate: performanceSummary.overallSuccessRate,
          averageResponseTime: performanceSummary.averageResponseTime
        },
        database: systemHealth.database,
        dependencies: {
          total: Object.keys(dependencyResults).length,
          healthy: Object.values(dependencyResults).filter(r => r.healthy).length,
          unhealthy: Object.values(dependencyResults).filter(r => !r.healthy).length,
          critical: Object.values(dependencyResults).filter(r => r.critical && !r.healthy).length
        },
        alerts: systemHealth.alerts
      },
      details: {
        endpoints: systemHealth.endpoints,
        circuitBreakers: systemHealth.circuitBreakers,
        dependencies: dependencyResults
      },
      metadata: {
        endpoint: '/api/health/system',
        forced: true
      }
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    tracker.trackOperationFailed('force_system_health_check', err);
    tracker.logError(err, 'force_system_health_check');

    return NextResponse.json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      traceId,
      forced: true,
      error: {
        message: 'Forced system health check failed',
        details: err.message
      }
    }, { status: 503 });
  }
}

// Wrap handlers with error interception first, then request context
const errorInterceptedGET = withErrorInterception(getSystemHealthStatus, {
  enableAutoRecovery: false,
  logErrors: true
});

const errorInterceptedPOST = withErrorInterception(forceSystemHealthCheck, {
  enableAutoRecovery: false,
  logErrors: true
});

// Export wrapped handlers
export const GET = withRequestContext(errorInterceptedGET, {
  enableLogging: true,
  additionalMetadata: (request) => ({
    endpoint: '/api/health/system',
    feature: 'system_health_monitoring'
  })
});

export const POST = withRequestContext(errorInterceptedPOST, {
  enableLogging: true,
  additionalMetadata: (request) => ({
    endpoint: '/api/health/system',
    feature: 'system_health_monitoring',
    action: 'force_system_health_check'
  })
});