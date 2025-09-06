/**
 * Prisma Connection Pool Monitoring
 * Provides metrics, health checks, and monitoring for database connections
 * Enhanced with performance monitoring and slow query detection
 */

import { prisma } from '@/lib/database/prisma';

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingConnections: number;
  connectionPoolSize: number;
  timestamp: Date;
  databaseUrl: string;
  status: 'healthy' | 'warning' | 'critical';
}

export interface QueryMetrics {
  totalQueries: number;
  averageQueryTime: number;
  slowQueries: number;
  failedQueries: number;
  timestamp: Date;
  queryTypeBreakdown: Record<string, {
    count: number;
    averageTime: number;
    slowCount: number;
  }>;
  p95QueryTime: number;
  p99QueryTime: number;
}

export interface SlowQueryRecord {
  query: string;
  duration: number;
  timestamp: Date;
  stackTrace?: string;
  parameters?: any;
  queryType: string;
}

export interface DatabasePerformanceMetrics {
  connectionMetrics: ConnectionMetrics;
  queryMetrics: QueryMetrics;
  slowQueries: SlowQueryRecord[];
  performanceTrends: {
    averageQueryTimeChange: number; // percentage change from previous period
    slowQueryTrend: number; // percentage change in slow queries
    connectionUsageTrend: number; // percentage change in connection usage
  };
  recommendations: string[];
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  message: string;
  timestamp: Date;
  responseTime: number;
  connectionTest: boolean;
  queryTest: boolean;
  details?: {
    error?: string;
    connectionMetrics?: Partial<ConnectionMetrics>;
  };
}

// Global metrics storage (in production, use Redis or external monitoring)
let connectionMetrics: ConnectionMetrics[] = [];
const queryMetrics: QueryMetrics[] = [];
const slowQueryRecords: SlowQueryRecord[] = [];
const queryExecutionTimes: number[] = [];
const queryTypeStats = new Map<string, { times: number[]; count: number }>();
const MAX_METRICS_HISTORY = 100;
const MAX_SLOW_QUERY_HISTORY = 500;
const MAX_QUERY_TIME_HISTORY = 1000;

/**
 * Get current connection pool metrics
 */
export async function getConnectionMetrics(): Promise<ConnectionMetrics> {
  try {
    // Get database connection info
    const result = await prisma.$queryRaw<Array<{
      state: string;
      count: bigint;
    }>>`
      SELECT 
        state,
        COUNT(*) as count
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY state
    `;

    let totalConnections = 0;
    let activeConnections = 0;
    let idleConnections = 0;
    let waitingConnections = 0;

    result.forEach(row => {
      const count = Number(row.count);
      totalConnections += count;
      
      switch (row.state) {
        case 'active':
          activeConnections += count;
          break;
        case 'idle':
          idleConnections += count;
          break;
        case 'idle in transaction':
        case 'idle in transaction (aborted)':
          waitingConnections += count;
          break;
      }
    });

    // Determine status based on connection usage
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    const connectionPoolSize = 5; // Default Prisma pool size for PostgreSQL
    const usageRatio = totalConnections / connectionPoolSize;
    
    if (usageRatio > 0.9) {
      status = 'critical';
    } else if (usageRatio > 0.7) {
      status = 'warning';
    }

    const metrics: ConnectionMetrics = {
      totalConnections,
      activeConnections,
      idleConnections,
      waitingConnections,
      connectionPoolSize,
      timestamp: new Date(),
      databaseUrl: process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@') || 'unknown',
      status
    };

    // Store metrics (limit history)
    connectionMetrics.push(metrics);
    if (connectionMetrics.length > MAX_METRICS_HISTORY) {
      connectionMetrics = connectionMetrics.slice(-MAX_METRICS_HISTORY);
    }

    return metrics;
  } catch (error) {
    console.error('Failed to get connection metrics:', error);
    
    const errorMetrics: ConnectionMetrics = {
      totalConnections: -1,
      activeConnections: -1,
      idleConnections: -1,
      waitingConnections: -1,
      connectionPoolSize: 5,
      timestamp: new Date(),
      databaseUrl: 'error',
      status: 'critical'
    };

    return errorMetrics;
  }
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  let connectionTest = false;
  let queryTest = false;
  let error: string | undefined;

  try {
    // Test basic connection
    await prisma.$queryRaw`SELECT 1 as test`;
    connectionTest = true;

    // Test query performance
    const testStart = Date.now();
    // Use a guaranteed existing table; Prisma models map to lowercased pluralized tables in Postgres
    await prisma.$queryRaw`SELECT COUNT(*) FROM public.users`;
    const queryTime = Date.now() - testStart;
    queryTest = queryTime < 5000; // Consider slow if > 5 seconds

    const responseTime = Date.now() - startTime;
    const connectionMetrics = await getConnectionMetrics();

    const status = connectionTest && queryTest && connectionMetrics.status !== 'critical' 
      ? 'healthy' 
      : 'unhealthy';

    return {
      status,
      message: status === 'healthy' 
        ? 'Database connection is healthy' 
        : 'Database connection has issues',
      timestamp: new Date(),
      responseTime,
      connectionTest,
      queryTest,
      details: {
        connectionMetrics
      }
    };

  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
    
    return {
      status: 'unhealthy',
      message: 'Database connection failed',
      timestamp: new Date(),
      responseTime: Date.now() - startTime,
      connectionTest,
      queryTest,
      details: {
        error
      }
    };
  }
}

/**
 * Get connection metrics history
 */
export function getConnectionHistory(): ConnectionMetrics[] {
  return [...connectionMetrics];
}

/**
 * Get query metrics history
 */
export function getQueryHistory(): QueryMetrics[] {
  return [...queryMetrics];
}

/**
 * Log slow queries with enhanced tracking
 */
export function logSlowQuery(query: string, duration: number, threshold = 1000, queryType = 'unknown', parameters?: any) {
  // Always record query execution time for metrics
  queryExecutionTimes.push(duration);
  if (queryExecutionTimes.length > MAX_QUERY_TIME_HISTORY) {
    queryExecutionTimes.shift();
  }

  // Track query type statistics
  if (!queryTypeStats.has(queryType)) {
    queryTypeStats.set(queryType, { times: [], count: 0 });
  }
  const typeStats = queryTypeStats.get(queryType)!;
  typeStats.times.push(duration);
  typeStats.count++;
  
  // Limit query type history
  if (typeStats.times.length > 100) {
    typeStats.times.shift();
  }

  // Log slow queries
  if (duration > threshold) {
    const slowQueryRecord: SlowQueryRecord = {
      query: query.substring(0, 500) + (query.length > 500 ? '...' : ''),
      duration,
      timestamp: new Date(),
      queryType,
      parameters: parameters ? JSON.stringify(parameters).substring(0, 200) : undefined,
      stackTrace: process.env.NODE_ENV === 'development' ? new Error().stack : undefined
    };

    slowQueryRecords.push(slowQueryRecord);
    
    // Limit slow query history
    if (slowQueryRecords.length > MAX_SLOW_QUERY_HISTORY) {
      slowQueryRecords.shift();
    }

    console.warn(`🐌 [SLOW-QUERY] Query took ${duration}ms (threshold: ${threshold}ms):`, {
      query: slowQueryRecord.query,
      queryType,
      duration,
      timestamp: slowQueryRecord.timestamp.toISOString(),
      parameters: slowQueryRecord.parameters
    });
  }
}

/**
 * Monitor connection pool usage and alert if needed
 */
export async function monitorConnectionPool(): Promise<void> {
  try {
    const metrics = await getConnectionMetrics();
    
    if (metrics.status === 'critical') {
      console.error('CRITICAL: Connection pool usage is critical', {
        totalConnections: metrics.totalConnections,
        poolSize: metrics.connectionPoolSize,
        usage: `${((metrics.totalConnections / metrics.connectionPoolSize) * 100).toFixed(1)}%`,
        timestamp: metrics.timestamp.toISOString()
      });
    } else if (metrics.status === 'warning') {
      console.warn('WARNING: Connection pool usage is high', {
        totalConnections: metrics.totalConnections,
        poolSize: metrics.connectionPoolSize,
        usage: `${((metrics.totalConnections / metrics.connectionPoolSize) * 100).toFixed(1)}%`,
        timestamp: metrics.timestamp.toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to monitor connection pool:', error);
  }
}

/**
 * Start periodic monitoring (call this in your app startup)
 */
export function startConnectionMonitoring(intervalMs = 60000): NodeJS.Timeout {
  console.log('Starting Prisma connection monitoring...');
  
  return setInterval(async () => {
    await monitorConnectionPool();
  }, intervalMs);
}

/**
 * Get comprehensive database performance metrics
 */
export async function getDatabasePerformanceMetrics(): Promise<DatabasePerformanceMetrics> {
  const connectionMetricsData = await getConnectionMetrics();
  const queryMetricsData = getQueryMetrics();
  const recentSlowQueries = getRecentSlowQueries(50); // Last 50 slow queries
  const performanceTrends = calculatePerformanceTrends();
  const recommendations = generatePerformanceRecommendations(connectionMetricsData, queryMetricsData, recentSlowQueries);

  return {
    connectionMetrics: connectionMetricsData,
    queryMetrics: queryMetricsData,
    slowQueries: recentSlowQueries,
    performanceTrends,
    recommendations
  };
}

/**
 * Get query performance metrics
 */
export function getQueryMetrics(): QueryMetrics {
  const now = new Date();
  const recentQueries = queryExecutionTimes.slice(-100); // Last 100 queries
  
  if (recentQueries.length === 0) {
    return {
      totalQueries: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      failedQueries: 0,
      timestamp: now,
      queryTypeBreakdown: {},
      p95QueryTime: 0,
      p99QueryTime: 0
    };
  }

  const totalQueries = recentQueries.length;
  const averageQueryTime = recentQueries.reduce((sum, time) => sum + time, 0) / totalQueries;
  const slowQueries = recentQueries.filter(time => time > 1000).length;
  
  // Calculate percentiles
  const sortedTimes = [...recentQueries].sort((a, b) => a - b);
  const p95Index = Math.ceil(0.95 * sortedTimes.length) - 1;
  const p99Index = Math.ceil(0.99 * sortedTimes.length) - 1;
  const p95QueryTime = sortedTimes[Math.max(0, p95Index)] || 0;
  const p99QueryTime = sortedTimes[Math.max(0, p99Index)] || 0;

  // Build query type breakdown
  const queryTypeBreakdown: Record<string, { count: number; averageTime: number; slowCount: number }> = {};
  
  queryTypeStats.forEach((stats, queryType) => {
    const recentTimes = stats.times.slice(-50); // Last 50 queries of this type
    if (recentTimes.length > 0) {
      queryTypeBreakdown[queryType] = {
        count: stats.count,
        averageTime: recentTimes.reduce((sum, time) => sum + time, 0) / recentTimes.length,
        slowCount: recentTimes.filter(time => time > 1000).length
      };
    }
  });

  return {
    totalQueries,
    averageQueryTime,
    slowQueries,
    failedQueries: 0, // Would need to track this separately
    timestamp: now,
    queryTypeBreakdown,
    p95QueryTime,
    p99QueryTime
  };
}

/**
 * Get recent slow queries
 */
export function getRecentSlowQueries(limit = 20): SlowQueryRecord[] {
  return slowQueryRecords
    .slice(-limit)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Calculate performance trends
 */
function calculatePerformanceTrends(): DatabasePerformanceMetrics['performanceTrends'] {
  const currentPeriod = queryExecutionTimes.slice(-50); // Last 50 queries
  const previousPeriod = queryExecutionTimes.slice(-100, -50); // Previous 50 queries
  
  if (currentPeriod.length === 0 || previousPeriod.length === 0) {
    return {
      averageQueryTimeChange: 0,
      slowQueryTrend: 0,
      connectionUsageTrend: 0
    };
  }

  const currentAvg = currentPeriod.reduce((sum, time) => sum + time, 0) / currentPeriod.length;
  const previousAvg = previousPeriod.reduce((sum, time) => sum + time, 0) / previousPeriod.length;
  const averageQueryTimeChange = previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;

  const currentSlowQueries = currentPeriod.filter(time => time > 1000).length;
  const previousSlowQueries = previousPeriod.filter(time => time > 1000).length;
  const slowQueryTrend = previousSlowQueries > 0 ? ((currentSlowQueries - previousSlowQueries) / previousSlowQueries) * 100 : 0;

  // Connection usage trend (simplified)
  const recentConnectionMetrics = connectionMetrics.slice(-10);
  if (recentConnectionMetrics.length >= 2) {
    const currentUsage = recentConnectionMetrics[recentConnectionMetrics.length - 1].totalConnections;
    const previousUsage = recentConnectionMetrics[0].totalConnections;
    const connectionUsageTrend = previousUsage > 0 ? ((currentUsage - previousUsage) / previousUsage) * 100 : 0;
    
    return {
      averageQueryTimeChange,
      slowQueryTrend,
      connectionUsageTrend
    };
  }

  return {
    averageQueryTimeChange,
    slowQueryTrend,
    connectionUsageTrend: 0
  };
}

/**
 * Generate performance recommendations
 */
function generatePerformanceRecommendations(
  connectionMetrics: ConnectionMetrics,
  queryMetrics: QueryMetrics,
  slowQueries: SlowQueryRecord[]
): string[] {
  const recommendations: string[] = [];

  // Connection pool recommendations
  const poolUsage = (connectionMetrics.totalConnections / connectionMetrics.connectionPoolSize) * 100;
  if (poolUsage > 80) {
    recommendations.push('Consider increasing the database connection pool size - current usage is above 80%');
  }

  // Query performance recommendations
  if (queryMetrics.averageQueryTime > 500) {
    recommendations.push('Average query time is above 500ms - consider optimizing frequently used queries');
  }

  if (queryMetrics.p95QueryTime > 2000) {
    recommendations.push('95th percentile query time is above 2 seconds - investigate slow queries');
  }

  const slowQueryRate = queryMetrics.totalQueries > 0 ? (queryMetrics.slowQueries / queryMetrics.totalQueries) * 100 : 0;
  if (slowQueryRate > 5) {
    recommendations.push(`${slowQueryRate.toFixed(1)}% of queries are slow (>1s) - review query optimization`);
  }

  // Specific query type recommendations
  Object.entries(queryMetrics.queryTypeBreakdown).forEach(([queryType, stats]) => {
    if (stats.averageTime > 1000) {
      recommendations.push(`${queryType} queries are averaging ${stats.averageTime.toFixed(0)}ms - consider optimization`);
    }
  });

  // Slow query pattern analysis
  if (slowQueries.length > 0) {
    const queryPatterns = new Map<string, number>();
    slowQueries.forEach(sq => {
      const pattern = sq.queryType || 'unknown';
      queryPatterns.set(pattern, (queryPatterns.get(pattern) || 0) + 1);
    });

    const mostCommonSlowPattern = Array.from(queryPatterns.entries())
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommonSlowPattern && mostCommonSlowPattern[1] > 3) {
      recommendations.push(`Most common slow query type is "${mostCommonSlowPattern[0]}" (${mostCommonSlowPattern[1]} occurrences) - prioritize optimization`);
    }
  }

  // Connection status recommendations
  if (connectionMetrics.status === 'warning') {
    recommendations.push('Database connection pool is under stress - monitor for potential issues');
  } else if (connectionMetrics.status === 'critical') {
    recommendations.push('Database connection pool is critically stressed - immediate attention required');
  }

  if (recommendations.length === 0) {
    recommendations.push('Database performance looks good - no immediate optimizations needed');
  }

  return recommendations;
}

/**
 * Get connection pool statistics for dashboard
 */
export async function getConnectionStats() {
  const current = await getConnectionMetrics();
  const history = getConnectionHistory();
  
  const last24h = history.filter(
    m => Date.now() - m.timestamp.getTime() < 24 * 60 * 60 * 1000
  );

  const avgConnections = last24h.length > 0 
    ? last24h.reduce((sum, m) => sum + m.totalConnections, 0) / last24h.length 
    : 0;

  const maxConnections = last24h.length > 0 
    ? Math.max(...last24h.map(m => m.totalConnections)) 
    : 0;

  const criticalEvents = last24h.filter(m => m.status === 'critical').length;
  const warningEvents = last24h.filter(m => m.status === 'warning').length;

  return {
    current,
    stats: {
      avgConnections: Math.round(avgConnections * 100) / 100,
      maxConnections,
      criticalEvents,
      warningEvents,
      dataPoints: last24h.length
    }
  };
}

/**
 * Clear performance metrics (for testing)
 */
export function clearPerformanceMetrics(): void {
  queryExecutionTimes.length = 0;
  slowQueryRecords.length = 0;
  queryTypeStats.clear();
  console.log('🧹 [PRISMA-MONITORING] Performance metrics cleared');
}
