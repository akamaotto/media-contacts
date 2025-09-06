/**
 * API Health Monitoring System
 * Tracks response times, success rates, and error patterns for all API endpoints
 */

import { RequestTracker } from '@/lib/monitoring/request-tracker';
import { getDatabaseStatus } from '@/lib/database/database-monitor';
import { getCircuitBreakerStats } from '@/lib/caching/circuit-breaker';

export interface EndpointMetrics {
  endpoint: string;
  method: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorsByCategory: Record<string, number>;
  errorsByStatusCode: Record<number, number>;
  lastRequest: Date;
  lastSuccess: Date;
  lastFailure?: Date;
  requestsInLastHour: number;
  requestsInLastDay: number;
  uptimePercentage: number;
}

export interface SystemHealthMetrics {
  overall: 'healthy' | 'degraded' | 'critical' | 'offline';
  timestamp: Date;
  uptime: number;
  endpoints: Record<string, EndpointMetrics>;
  database: {
    status: string;
    connectionPoolUsage: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  circuitBreakers: Record<string, {
    state: string;
    failureRate: number;
    uptime: number;
  }>;
  systemResources: {
    memoryUsage?: number;
    cpuUsage?: number;
  };
  alerts: {
    active: number;
    critical: number;
    warnings: number;
  };
}

export interface RequestRecord {
  timestamp: Date;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
  errorCategory?: string;
  traceId: string;
  userId?: string;
}

export interface HealthCheckDependency {
  name: string;
  check: () => Promise<{ healthy: boolean; responseTime: number; error?: string }>;
  critical: boolean;
  timeout: number;
}

/**
 * APIHealthMonitor class for comprehensive API monitoring
 */
export class APIHealthMonitor {
  private static instance: APIHealthMonitor;
  private requestHistory: RequestRecord[] = [];
  private endpointMetrics = new Map<string, EndpointMetrics>();
  private dependencies = new Map<string, HealthCheckDependency>();
  private startTime = new Date();
  private readonly maxHistorySize = 10000;
  private readonly metricsRetentionHours = 24;

  private constructor() {}

  static getInstance(): APIHealthMonitor {
    if (!APIHealthMonitor.instance) {
      APIHealthMonitor.instance = new APIHealthMonitor();
    }
    return APIHealthMonitor.instance;
  }

  /**
   * Record a request for monitoring
   */
  recordRequest(record: RequestRecord): void {
    // Add to history
    this.requestHistory.push(record);
    
    // Limit history size
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }

    // Update endpoint metrics
    this.updateEndpointMetrics(record);

    console.log(`📊 [API-HEALTH-MONITOR] Request recorded: ${record.method} ${record.endpoint} - ${record.success ? 'SUCCESS' : 'FAILED'} (${record.responseTime}ms)`);
  }

  /**
   * Update metrics for a specific endpoint
   */
  private updateEndpointMetrics(record: RequestRecord): void {
    const key = `${record.method}:${record.endpoint}`;
    let metrics = this.endpointMetrics.get(key);

    if (!metrics) {
      metrics = {
        endpoint: record.endpoint,
        method: record.method,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        errorsByCategory: {},
        errorsByStatusCode: {},
        lastRequest: record.timestamp,
        lastSuccess: record.timestamp,
        requestsInLastHour: 0,
        requestsInLastDay: 0,
        uptimePercentage: 100
      };
      this.endpointMetrics.set(key, metrics);
    }

    // Update basic counters
    metrics.totalRequests++;
    metrics.lastRequest = record.timestamp;

    if (record.success) {
      metrics.successfulRequests++;
      metrics.lastSuccess = record.timestamp;
    } else {
      metrics.failedRequests++;
      metrics.lastFailure = record.timestamp;
      
      // Track errors by category and status code
      if (record.errorCategory) {
        metrics.errorsByCategory[record.errorCategory] = (metrics.errorsByCategory[record.errorCategory] || 0) + 1;
      }
      metrics.errorsByStatusCode[record.statusCode] = (metrics.errorsByStatusCode[record.statusCode] || 0) + 1;
    }

    // Update response time metrics
    metrics.averageResponseTime = this.calculateAverageResponseTime(key);
    metrics.minResponseTime = Math.min(metrics.minResponseTime, record.responseTime);
    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, record.responseTime);
    
    // Calculate percentiles
    const responseTimes = this.getRecentResponseTimes(key, 1000); // Last 1000 requests
    metrics.p95ResponseTime = this.calculatePercentile(responseTimes, 95);
    metrics.p99ResponseTime = this.calculatePercentile(responseTimes, 99);

    // Update success rate
    metrics.successRate = (metrics.successfulRequests / metrics.totalRequests) * 100;

    // Update time-based counters
    metrics.requestsInLastHour = this.getRequestCount(key, 60 * 60 * 1000); // 1 hour
    metrics.requestsInLastDay = this.getRequestCount(key, 24 * 60 * 60 * 1000); // 24 hours

    // Calculate uptime percentage (based on successful requests in last 24 hours)
    const recentRequests = this.getRecentRequests(key, 24 * 60 * 60 * 1000);
    const recentSuccesses = recentRequests.filter(r => r.success).length;
    metrics.uptimePercentage = recentRequests.length > 0 ? (recentSuccesses / recentRequests.length) * 100 : 100;
  }

  /**
   * Get recent response times for an endpoint
   */
  private getRecentResponseTimes(endpointKey: string, limit: number): number[] {
    const [method, endpoint] = endpointKey.split(':');
    return this.requestHistory
      .filter(r => r.method === method && r.endpoint === endpoint)
      .slice(-limit)
      .map(r => r.responseTime)
      .sort((a, b) => a - b);
  }

  /**
   * Calculate average response time for an endpoint
   */
  private calculateAverageResponseTime(endpointKey: string): number {
    const responseTimes = this.getRecentResponseTimes(endpointKey, 100); // Last 100 requests
    if (responseTimes.length === 0) return 0;
    return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Get request count for an endpoint within a time window
   */
  private getRequestCount(endpointKey: string, timeWindowMs: number): number {
    const [method, endpoint] = endpointKey.split(':');
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    
    return this.requestHistory.filter(r => 
      r.method === method && 
      r.endpoint === endpoint && 
      r.timestamp >= cutoffTime
    ).length;
  }

  /**
   * Get recent requests for an endpoint
   */
  private getRecentRequests(endpointKey: string, timeWindowMs: number): RequestRecord[] {
    const [method, endpoint] = endpointKey.split(':');
    const cutoffTime = new Date(Date.now() - timeWindowMs);
    
    return this.requestHistory.filter(r => 
      r.method === method && 
      r.endpoint === endpoint && 
      r.timestamp >= cutoffTime
    );
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(endpoint: string, method: string): EndpointMetrics | undefined {
    return this.endpointMetrics.get(`${method}:${endpoint}`);
  }

  /**
   * Get metrics for all endpoints
   */
  getAllEndpointMetrics(): Record<string, EndpointMetrics> {
    const metrics: Record<string, EndpointMetrics> = {};
    this.endpointMetrics.forEach((value, key) => {
      metrics[key] = { ...value };
    });
    return metrics;
  }

  /**
   * Get comprehensive system health metrics
   */
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    console.log(`🏥 [API-HEALTH-MONITOR] Collecting system health metrics...`);

    // Get database status
    const databaseStatus = await getDatabaseStatus();
    
    // Get circuit breaker stats
    const circuitBreakerStats = getCircuitBreakerStats() as Record<string, any>;

    // Calculate overall system health
    const endpointMetrics = this.getAllEndpointMetrics();
    const criticalEndpoints = Object.values(endpointMetrics).filter(m => m.successRate < 95);
    const degradedEndpoints = Object.values(endpointMetrics).filter(m => m.successRate < 99 && m.successRate >= 95);

    let overall: SystemHealthMetrics['overall'] = 'healthy';
    if (databaseStatus.overall === 'offline' || criticalEndpoints.length > 0) {
      overall = 'critical';
    } else if (databaseStatus.overall === 'critical' || degradedEndpoints.length > 2) {
      overall = 'critical';
    } else if (databaseStatus.overall === 'degraded' || degradedEndpoints.length > 0) {
      overall = 'degraded';
    }

    // Count active alerts (simplified - would integrate with actual alerting system)
    const activeAlerts = criticalEndpoints.length + (databaseStatus.overall === 'critical' ? 1 : 0);
    const criticalAlerts = criticalEndpoints.filter(e => e.successRate < 90).length;
    const warnings = degradedEndpoints.length;

    const systemHealth: SystemHealthMetrics = {
      overall,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      endpoints: endpointMetrics,
      database: {
        status: databaseStatus.overall,
        connectionPoolUsage: ((databaseStatus.metrics.totalConnections / databaseStatus.metrics.connectionPoolSize) * 100),
        averageQueryTime: 0, // Would be calculated from query metrics
        slowQueries: 0 // Would be tracked separately
      },
      circuitBreakers: Object.entries(circuitBreakerStats).reduce((acc, [name, stats]) => {
        acc[name] = {
          state: stats.state,
          failureRate: stats.failureRate,
          uptime: stats.uptime
        };
        return acc;
      }, {} as Record<string, any>),
      systemResources: {
        // Would integrate with system monitoring
        memoryUsage: undefined,
        cpuUsage: undefined
      },
      alerts: {
        active: activeAlerts,
        critical: criticalAlerts,
        warnings
      }
    };

    console.log(`📊 [API-HEALTH-MONITOR] System health: ${overall}`, {
      endpoints: Object.keys(endpointMetrics).length,
      criticalEndpoints: criticalEndpoints.length,
      degradedEndpoints: degradedEndpoints.length,
      databaseStatus: databaseStatus.overall
    });

    return systemHealth;
  }

  /**
   * Register a dependency for health checks
   */
  registerDependency(dependency: HealthCheckDependency): void {
    this.dependencies.set(dependency.name, dependency);
    console.log(`🔗 [API-HEALTH-MONITOR] Registered dependency: ${dependency.name} (critical: ${dependency.critical})`);
  }

  /**
   * Check all registered dependencies
   */
  async checkAllDependencies(): Promise<Record<string, { healthy: boolean; responseTime: number; error?: string; critical: boolean }>> {
    const results: Record<string, any> = {};
    
    console.log(`🔍 [API-HEALTH-MONITOR] Checking ${this.dependencies.size} dependencies...`);

    await Promise.allSettled(
      Array.from(this.dependencies.entries()).map(async ([name, dependency]) => {
        const startTime = Date.now();
        
        try {
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Dependency check timeout')), dependency.timeout);
          });

          const result = await Promise.race([dependency.check(), timeoutPromise]);
          
          results[name] = {
            ...result,
            critical: dependency.critical,
            responseTime: result.responseTime || (Date.now() - startTime)
          };

          console.log(`${result.healthy ? '✅' : '❌'} [API-HEALTH-MONITOR] Dependency ${name}: ${result.healthy ? 'healthy' : 'unhealthy'} (${results[name].responseTime}ms)`);
          
        } catch (error) {
          const responseTime = Date.now() - startTime;
          results[name] = {
            healthy: false,
            responseTime,
            error: error instanceof Error ? error.message : 'Unknown error',
            critical: dependency.critical
          };

          console.error(`❌ [API-HEALTH-MONITOR] Dependency ${name} failed: ${results[name].error} (${responseTime}ms)`);
        }
      })
    );

    return results;
  }

  /**
   * Get endpoint performance summary
   */
  getEndpointPerformanceSummary(): {
    totalEndpoints: number;
    healthyEndpoints: number;
    degradedEndpoints: number;
    criticalEndpoints: number;
    averageResponseTime: number;
    totalRequests: number;
    overallSuccessRate: number;
  } {
    const metrics = Object.values(this.getAllEndpointMetrics());
    
    if (metrics.length === 0) {
      return {
        totalEndpoints: 0,
        healthyEndpoints: 0,
        degradedEndpoints: 0,
        criticalEndpoints: 0,
        averageResponseTime: 0,
        totalRequests: 0,
        overallSuccessRate: 100
      };
    }

    const healthyEndpoints = metrics.filter(m => m.successRate >= 99).length;
    const degradedEndpoints = metrics.filter(m => m.successRate >= 95 && m.successRate < 99).length;
    const criticalEndpoints = metrics.filter(m => m.successRate < 95).length;

    const totalRequests = metrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const totalSuccessful = metrics.reduce((sum, m) => sum + m.successfulRequests, 0);
    const averageResponseTime = metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length;

    return {
      totalEndpoints: metrics.length,
      healthyEndpoints,
      degradedEndpoints,
      criticalEndpoints,
      averageResponseTime,
      totalRequests,
      overallSuccessRate: totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 100
    };
  }

  /**
   * Clean up old request history
   */
  cleanupHistory(): void {
    const cutoffTime = new Date(Date.now() - (this.metricsRetentionHours * 60 * 60 * 1000));
    const originalLength = this.requestHistory.length;
    
    this.requestHistory = this.requestHistory.filter(record => record.timestamp >= cutoffTime);
    
    const cleaned = originalLength - this.requestHistory.length;
    if (cleaned > 0) {
      console.log(`🧹 [API-HEALTH-MONITOR] Cleaned up ${cleaned} old request records`);
    }
  }

  /**
   * Start periodic cleanup
   */
  startPeriodicCleanup(intervalMs: number = 60 * 60 * 1000): NodeJS.Timeout {
    console.log(`🧹 [API-HEALTH-MONITOR] Starting periodic cleanup every ${intervalMs}ms`);
    
    return setInterval(() => {
      this.cleanupHistory();
    }, intervalMs);
  }

  /**
   * Get request history for analysis
   */
  getRequestHistory(limit?: number): RequestRecord[] {
    const history = [...this.requestHistory];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.requestHistory = [];
    this.endpointMetrics.clear();
    this.startTime = new Date();
    console.log(`🔄 [API-HEALTH-MONITOR] All metrics reset`);
  }
}

// Export singleton instance
export const apiHealthMonitor = APIHealthMonitor.getInstance();

/**
 * Utility function to record a request
 */
export function recordAPIRequest(record: RequestRecord): void {
  apiHealthMonitor.recordRequest(record);
}

/**
 * Utility function to get system health
 */
export async function getSystemHealth(): Promise<SystemHealthMetrics> {
  return apiHealthMonitor.getSystemHealthMetrics();
}

/**
 * Utility function to get endpoint metrics
 */
export function getEndpointMetrics(endpoint: string, method: string): EndpointMetrics | undefined {
  return apiHealthMonitor.getEndpointMetrics(endpoint, method);
}

/**
 * Utility function to register a dependency
 */
export function registerHealthDependency(dependency: HealthCheckDependency): void {
  apiHealthMonitor.registerDependency(dependency);
}