/**
 * Database Performance Monitoring Endpoint
 * Provides detailed database performance metrics and slow query analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabasePerformanceMetrics, getRecentSlowQueries, getQueryMetrics } from '@/lib/database/prisma-monitoring';
import { withRequestContext } from '@/lib/middleware/request-context';
import { withErrorInterception } from '@/lib/middleware/error-interceptor';
import { RequestTracker } from '@/lib/monitoring/request-tracker';

export const dynamic = 'force-dynamic';

/**
 * GET /api/monitoring/database - Get comprehensive database performance metrics
 */
async function getDatabasePerformance(request: NextRequest, { tracker }: { tracker: RequestTracker }) {
  const traceId = tracker.getTraceId();
  const { searchParams } = new URL(request.url);
  const includeSlowQueries = searchParams.get('slow_queries') !== 'false';
  const slowQueryLimit = parseInt(searchParams.get('slow_query_limit') || '20');
  
  console.log(`📊 [DB-PERFORMANCE] [${traceId}] Getting database performance metrics...`);

  try {
    tracker.trackOperationStart('database_performance_metrics');

    // Get comprehensive performance metrics
    const performanceMetrics = await getDatabasePerformanceMetrics();
    
    // Get additional slow query details if requested
    const slowQueries = includeSlowQueries ? getRecentSlowQueries(slowQueryLimit) : [];
    
    tracker.trackOperationComplete('database_performance_metrics', {
      slowQueriesIncluded: includeSlowQueries,
      slowQueryCount: slowQueries.length,
      averageQueryTime: performanceMetrics.queryMetrics.averageQueryTime
    });

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      traceId,
      performance: {
        connection: {
          status: performanceMetrics.connectionMetrics.status,
          totalConnections: performanceMetrics.connectionMetrics.totalConnections,
          activeConnections: performanceMetrics.connectionMetrics.activeConnections,
          idleConnections: performanceMetrics.connectionMetrics.idleConnections,
          poolSize: performanceMetrics.connectionMetrics.connectionPoolSize,
          poolUsage: `${((performanceMetrics.connectionMetrics.totalConnections / performanceMetrics.connectionMetrics.connectionPoolSize) * 100).toFixed(1)}%`,
          databaseUrl: performanceMetrics.connectionMetrics.databaseUrl
        },
        queries: {
          totalQueries: performanceMetrics.queryMetrics.totalQueries,
          averageQueryTime: Math.round(performanceMetrics.queryMetrics.averageQueryTime),
          p95QueryTime: Math.round(performanceMetrics.queryMetrics.p95QueryTime),
          p99QueryTime: Math.round(performanceMetrics.queryMetrics.p99QueryTime),
          slowQueries: performanceMetrics.queryMetrics.slowQueries,
          slowQueryRate: performanceMetrics.queryMetrics.totalQueries > 0 
            ? `${((performanceMetrics.queryMetrics.slowQueries / performanceMetrics.queryMetrics.totalQueries) * 100).toFixed(1)}%`
            : '0%',
          queryTypeBreakdown: performanceMetrics.queryMetrics.queryTypeBreakdown
        },
        trends: {
          averageQueryTimeChange: `${performanceMetrics.performanceTrends.averageQueryTimeChange > 0 ? '+' : ''}${performanceMetrics.performanceTrends.averageQueryTimeChange.toFixed(1)}%`,
          slowQueryTrend: `${performanceMetrics.performanceTrends.slowQueryTrend > 0 ? '+' : ''}${performanceMetrics.performanceTrends.slowQueryTrend.toFixed(1)}%`,
          connectionUsageTrend: `${performanceMetrics.performanceTrends.connectionUsageTrend > 0 ? '+' : ''}${performanceMetrics.performanceTrends.connectionUsageTrend.toFixed(1)}%`
        },
        recommendations: performanceMetrics.recommendations
      },
      ...(includeSlowQueries && {
        slowQueries: slowQueries.map(sq => ({
          query: sq.query,
          duration: sq.duration,
          timestamp: sq.timestamp.toISOString(),
          queryType: sq.queryType,
          parameters: sq.parameters
        }))
      }),
      metadata: {
        endpoint: '/api/monitoring/database',
        includeSlowQueries,
        slowQueryLimit: includeSlowQueries ? slowQueryLimit : 0
      }
    };

    console.log(`✅ [DB-PERFORMANCE] [${traceId}] Database performance metrics retrieved`, {
      averageQueryTime: `${Math.round(performanceMetrics.queryMetrics.averageQueryTime)}ms`,
      slowQueries: performanceMetrics.queryMetrics.slowQueries,
      connectionStatus: performanceMetrics.connectionMetrics.status
    });

    return NextResponse.json(response);

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    tracker.trackOperationFailed('database_performance_metrics', err);
    tracker.logError(err, 'database_performance_metrics');

    console.error(`💥 [DB-PERFORMANCE] [${traceId}] Failed to get database performance metrics:`, err.message);

    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      traceId,
      error: {
        message: 'Failed to retrieve database performance metrics',
        details: err.message
      },
      metadata: {
        endpoint: '/api/monitoring/database',
        error: true
      }
    }, { status: 500 });
  }
}

/**
 * POST /api/monitoring/database/analyze - Analyze slow queries and provide optimization suggestions
 */
async function analyzeSlowQueries(request: NextRequest, { tracker }: { tracker: RequestTracker }) {
  const traceId = tracker.getTraceId();
  
  console.log(`🔍 [DB-PERFORMANCE] [${traceId}] Analyzing slow queries...`);

  try {
    tracker.trackOperationStart('slow_query_analysis');

    const slowQueries = getRecentSlowQueries(100); // Analyze last 100 slow queries
    const queryMetrics = getQueryMetrics();
    
    // Analyze query patterns
    const queryPatterns = new Map<string, {
      count: number;
      totalDuration: number;
      averageDuration: number;
      maxDuration: number;
      queries: string[];
    }>();

    slowQueries.forEach(sq => {
      const pattern = sq.queryType || 'unknown';
      if (!queryPatterns.has(pattern)) {
        queryPatterns.set(pattern, {
          count: 0,
          totalDuration: 0,
          averageDuration: 0,
          maxDuration: 0,
          queries: []
        });
      }
      
      const patternData = queryPatterns.get(pattern)!;
      patternData.count++;
      patternData.totalDuration += sq.duration;
      patternData.maxDuration = Math.max(patternData.maxDuration, sq.duration);
      patternData.queries.push(sq.query.substring(0, 100));
    });

    // Calculate averages and sort by impact
    const analysisResults = Array.from(queryPatterns.entries()).map(([pattern, data]) => {
      data.averageDuration = data.totalDuration / data.count;
      return {
        pattern,
        ...data,
        impact: data.count * data.averageDuration, // Simple impact score
        uniqueQueries: [...new Set(data.queries)].length
      };
    }).sort((a, b) => b.impact - a.impact);

    // Generate optimization recommendations
    const optimizationRecommendations: string[] = [];
    
    analysisResults.forEach((result, index) => {
      if (index < 3) { // Top 3 patterns
        optimizationRecommendations.push(
          `High impact: ${result.pattern} queries (${result.count} occurrences, avg ${Math.round(result.averageDuration)}ms) - Consider adding indexes or optimizing query structure`
        );
      }
      
      if (result.averageDuration > 5000) {
        optimizationRecommendations.push(
          `Very slow: ${result.pattern} queries averaging ${Math.round(result.averageDuration)}ms - Immediate optimization needed`
        );
      }
    });

    if (optimizationRecommendations.length === 0) {
      optimizationRecommendations.push('No significant slow query patterns detected - performance looks good');
    }

    tracker.trackOperationComplete('slow_query_analysis', {
      slowQueriesAnalyzed: slowQueries.length,
      patternsFound: analysisResults.length,
      recommendationsGenerated: optimizationRecommendations.length
    });

    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      traceId,
      analysis: {
        summary: {
          totalSlowQueries: slowQueries.length,
          uniquePatterns: analysisResults.length,
          timeRange: slowQueries.length > 0 ? {
            from: slowQueries[slowQueries.length - 1].timestamp.toISOString(),
            to: slowQueries[0].timestamp.toISOString()
          } : null,
          averageSlowQueryDuration: slowQueries.length > 0 
            ? Math.round(slowQueries.reduce((sum, sq) => sum + sq.duration, 0) / slowQueries.length)
            : 0
        },
        patterns: analysisResults.slice(0, 10), // Top 10 patterns
        recommendations: optimizationRecommendations,
        queryTypeBreakdown: queryMetrics.queryTypeBreakdown
      },
      metadata: {
        endpoint: '/api/monitoring/database/analyze',
        queriesAnalyzed: slowQueries.length
      }
    };

    console.log(`✅ [DB-PERFORMANCE] [${traceId}] Slow query analysis completed`, {
      slowQueries: slowQueries.length,
      patterns: analysisResults.length,
      recommendations: optimizationRecommendations.length
    });

    return NextResponse.json(response);

  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown error');
    
    tracker.trackOperationFailed('slow_query_analysis', err);
    tracker.logError(err, 'slow_query_analysis');

    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      traceId,
      error: {
        message: 'Failed to analyze slow queries',
        details: err.message
      }
    }, { status: 500 });
  }
}

// Wrap handlers with error interception first, then request context
const errorInterceptedGET = withErrorInterception(getDatabasePerformance, {
  enableAutoRecovery: false,
  logErrors: true
});

const errorInterceptedPOST = withErrorInterception(analyzeSlowQueries, {
  enableAutoRecovery: false,
  logErrors: true
});

// Export wrapped handlers
export const GET = withRequestContext(errorInterceptedGET, {
  enableLogging: true,
  additionalMetadata: (request) => ({
    endpoint: '/api/monitoring/database',
    feature: 'database_performance_monitoring'
  })
});

export const POST = withRequestContext(errorInterceptedPOST, {
  enableLogging: true,
  additionalMetadata: (request) => ({
    endpoint: '/api/monitoring/database',
    feature: 'database_performance_monitoring',
    action: 'analyze_slow_queries'
  })
});