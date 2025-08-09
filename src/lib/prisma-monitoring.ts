/**
 * Prisma Connection Pool Monitoring
 * Provides metrics, health checks, and monitoring for database connections
 */

import { prisma } from '@/lib/prisma';

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
let queryMetrics: QueryMetrics[] = [];
const MAX_METRICS_HISTORY = 100;

/**
 * Get current connection pool metrics
 */
export async function getConnectionMetrics(): Promise<ConnectionMetrics> {
  const startTime = Date.now();
  
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
    await prisma.$queryRaw`SELECT COUNT(*) FROM "User"`;
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
 * Log slow queries (for monitoring)
 */
export function logSlowQuery(query: string, duration: number, threshold = 1000) {
  if (duration > threshold) {
    console.warn(`Slow query detected (${duration}ms):`, {
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
      duration,
      timestamp: new Date().toISOString()
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
