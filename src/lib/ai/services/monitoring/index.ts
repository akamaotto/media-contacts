/**
 * AI Services Performance Monitoring and Rate Limiting
 * Provides comprehensive monitoring, metrics collection, and rate limiting
 */

import { randomUUID } from 'crypto';
import { ServiceHealth, ServiceMetrics } from '../base/types';

// Performance Metrics
export interface PerformanceMetrics {
  service: string;
  operation: string;
  timestamp: number;
  duration: number;
  success: boolean;
  tokensUsed?: number;
  cost?: number;
  cached: boolean;
  retryCount: number;
  errorCode?: string;
  errorMessage?: string;
  userId?: string;
  correlationId: string;
  metadata?: Record<string, any>;
}

// Aggregated Metrics
export interface AggregatedMetrics {
  service: string;
  timeWindow: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  throughput: number; // requests per second
  totalTokensUsed: number;
  totalCost: number;
  cacheHitRate: number;
  topErrors: Array<{ error: string; count: number }>;
  topOperations: Array<{ operation: string; count: number; avgDuration: number }>;
}

// Rate Limiting
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
  totalHits: number;
}

// Alerting
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  timeWindow: number; // minutes
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  conditions?: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  details: Record<string, any>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolved: boolean;
  resolvedAt?: number;
}

// Dashboard Data
export interface DashboardData {
  overview: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    activeAlerts: number;
    totalCost: number;
  };
  services: Array<{
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    requests: number;
    successRate: number;
    avgResponseTime: number;
    cost: number;
  }>;
  recentMetrics: PerformanceMetrics[];
  activeAlerts: Alert[];
  topOperations: Array<{
    operation: string;
    count: number;
    avgDuration: number;
    successRate: number;
  }>;
}

// Memory store for metrics (in production, use Redis or similar)
class MetricsStore {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100000;

  add(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  get(filters?: {
    service?: string;
    operation?: string;
    fromTime?: number;
    toTime?: number;
    success?: boolean;
  }): PerformanceMetrics[] {
    let filtered = [...this.metrics];

    if (filters) {
      if (filters.service) {
        filtered = filtered.filter(m => m.service === filters.service);
      }
      if (filters.operation) {
        filtered = filtered.filter(m => m.operation === filters.operation);
      }
      if (filters.fromTime) {
        filtered = filtered.filter(m => m.timestamp >= filters.fromTime!);
      }
      if (filters.toTime) {
        filtered = filtered.filter(m => m.timestamp <= filters.toTime!);
      }
      if (filters.success !== undefined) {
        filtered = filtered.filter(m => m.success === filters.success);
      }
    }

    return filtered;
  }

  clear(olderThan?: number): void {
    if (olderThan) {
      this.metrics = this.metrics.filter(m => m.timestamp > olderThan);
    } else {
      this.metrics = [];
    }
  }

  getStats(): { count: number; oldestTimestamp?: number; newestTimestamp?: number } {
    if (this.metrics.length === 0) {
      return { count: 0 };
    }

    const timestamps = this.metrics.map(m => m.timestamp);
    return {
      count: this.metrics.length,
      oldestTimestamp: Math.min(...timestamps),
      newestTimestamp: Math.max(...timestamps)
    };
  }
}

// Rate Limiter Implementation
class RateLimiter {
  private windows = new Map<string, { count: number; resetTime: number }>();

  check(identifier: string, config: RateLimitConfig): RateLimitResult {
    const key = config.keyGenerator ? config.keyGenerator(identifier) : identifier;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    let window = this.windows.get(key);
    if (!window || window.resetTime <= now) {
      window = { count: 0, resetTime: now + config.windowMs };
      this.windows.set(key, window);
    }

    // Clean up expired windows
    for (const [k, w] of this.windows.entries()) {
      if (w.resetTime <= now) {
        this.windows.delete(k);
      }
    }

    window.count++;
    const remaining = Math.max(0, config.maxRequests - window.count);
    const retryAfter = remaining === 0 ? window.resetTime - now : undefined;

    return {
      allowed: window.count <= config.maxRequests,
      limit: config.maxRequests,
      remaining,
      resetTime: window.resetTime,
      retryAfter,
      totalHits: window.count
    };
  }

  reset(identifier: string): void {
    this.windows.delete(identifier);
  }

  clear(): void {
    this.windows.clear();
  }
}

export class AIPerformanceMonitor {
  private static instance: AIPerformanceMonitor;
  private metricsStore = new MetricsStore();
  private rateLimiter = new RateLimiter();
  private alerts = new Map<string, Alert>();
  private alertRules = new Map<string, AlertRule>();
  private rateLimitConfigs = new Map<string, RateLimitConfig>();

  private constructor() {
    this.initializeDefaultAlertRules();
    this.initializeDefaultRateLimits();
  }

  public static getInstance(): AIPerformanceMonitor {
    if (!AIPerformanceMonitor.instance) {
      AIPerformanceMonitor.instance = new AIPerformanceMonitor();
    }
    return AIPerformanceMonitor.instance;
  }

  /**
   * Record performance metrics
   */
  public recordMetrics(metrics: Omit<PerformanceMetrics, 'timestamp'>): void {
    const fullMetrics: PerformanceMetrics = {
      ...metrics,
      timestamp: Date.now()
    };

    this.metricsStore.add(fullMetrics);
    this.checkAlerts(fullMetrics);
  }

  /**
   * Check rate limits
   */
  public checkRateLimit(identifier: string, rateLimitKey?: string): RateLimitResult {
    const config = rateLimitKey ?
      this.rateLimitConfigs.get(rateLimitKey) :
      this.rateLimitConfigs.get('default');

    if (!config) {
      return {
        allowed: true,
        limit: 0,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalHits: 0
      };
    }

    return this.rateLimiter.check(identifier, config);
  }

  /**
   * Get aggregated metrics for a time window
   */
  public getAggregatedMetrics(
    service?: string,
    timeWindowMinutes: number = 15
  ): AggregatedMetrics[] {
    const now = Date.now();
    const fromTime = now - (timeWindowMinutes * 60 * 1000);

    const metrics = this.metricsStore.get({
      service,
      fromTime,
      toTime: now
    });

    // Group by service
    const serviceGroups = new Map<string, PerformanceMetrics[]>();
    metrics.forEach(metric => {
      if (!serviceGroups.has(metric.service)) {
        serviceGroups.set(metric.service, []);
      }
      serviceGroups.get(metric.service)!.push(metric);
    });

    return Array.from(serviceGroups.entries()).map(([serviceName, serviceMetrics]) => {
      const successfulMetrics = serviceMetrics.filter(m => m.success);
      const failedMetrics = serviceMetrics.filter(m => !m.success);

      const durations = successfulMetrics.map(m => m.duration).sort((a, b) => a - b);
      const averageResponseTime = durations.length > 0 ?
        durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

      const p95Index = Math.floor(durations.length * 0.95);
      const p99Index = Math.floor(durations.length * 0.99);
      const p95ResponseTime = durations[p95Index] || 0;
      const p99ResponseTime = durations[p99Index] || 0;

      const errorRate = serviceMetrics.length > 0 ?
        (failedMetrics.length / serviceMetrics.length) * 100 : 0;

      const throughput = timeWindowMinutes > 0 ?
        serviceMetrics.length / (timeWindowMinutes * 60) : 0;

      const totalTokensUsed = serviceMetrics.reduce((sum, m) => sum + (m.tokensUsed || 0), 0);
      const totalCost = serviceMetrics.reduce((sum, m) => sum + (m.cost || 0), 0);
      const cachedRequests = serviceMetrics.filter(m => m.cached).length;
      const cacheHitRate = serviceMetrics.length > 0 ? (cachedRequests / serviceMetrics.length) * 100 : 0;

      // Top errors
      const errorCounts = new Map<string, number>();
      failedMetrics.forEach(m => {
        const error = m.errorMessage || m.errorCode || 'Unknown error';
        errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
      });

      const topErrors = Array.from(errorCounts.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([error, count]) => ({ error, count }));

      // Top operations
      const operationStats = new Map<string, { count: number; totalDuration: number }>();
      serviceMetrics.forEach(m => {
        if (!operationStats.has(m.operation)) {
          operationStats.set(m.operation, { count: 0, totalDuration: 0 });
        }
        const stats = operationStats.get(m.operation)!;
        stats.count++;
        stats.totalDuration += m.duration;
      });

      const topOperations = Array.from(operationStats.entries())
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 5)
        .map(([operation, stats]) => ({
          operation,
          count: stats.count,
          avgDuration: stats.totalDuration / stats.count
        }));

      return {
        service: serviceName,
        timeWindow: `${timeWindowMinutes}m`,
        totalRequests: serviceMetrics.length,
        successfulRequests: successfulMetrics.length,
        failedRequests: failedMetrics.length,
        averageResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        errorRate,
        throughput,
        totalTokensUsed,
        totalCost,
        cacheHitRate,
        topErrors,
        topOperations
      };
    });
  }

  /**
   * Get dashboard data
   */
  public getDashboardData(): DashboardData {
    const now = Date.now();
    const last15Minutes = now - (15 * 60 * 1000);
    const lastHour = now - (60 * 60 * 1000);

    const recentMetrics = this.metricsStore.get({
      fromTime: last15Minutes,
      toTime: now
    });

    const successfulMetrics = recentMetrics.filter(m => m.success);
    const failedMetrics = recentMetrics.filter(m => !m.success);

    const overview = {
      totalRequests: recentMetrics.length,
      successRate: recentMetrics.length > 0 ? (successfulMetrics.length / recentMetrics.length) * 100 : 100,
      averageResponseTime: successfulMetrics.length > 0 ?
        successfulMetrics.reduce((sum, m) => sum + m.duration, 0) / successfulMetrics.length : 0,
      activeAlerts: Array.from(this.alerts.values()).filter(a => !a.resolved && !a.acknowledged).length,
      totalCost: recentMetrics.reduce((sum, m) => sum + (m.cost || 0), 0)
    };

    // Service stats
    const serviceStats = new Map<string, {
      requests: number;
      successful: number;
      totalDuration: number;
      cost: number;
    }>();

    recentMetrics.forEach(m => {
      if (!serviceStats.has(m.service)) {
        serviceStats.set(m.service, { requests: 0, successful: 0, totalDuration: 0, cost: 0 });
      }
      const stats = serviceStats.get(m.service)!;
      stats.requests++;
      if (m.success) {
        stats.successful++;
        stats.totalDuration += m.duration;
      }
      stats.cost += m.cost || 0;
    });

    const services = Array.from(serviceStats.entries()).map(([name, stats]) => ({
      name,
      status: this.getServiceStatus(name, stats),
      requests: stats.requests,
      successRate: stats.requests > 0 ? (stats.successful / stats.requests) * 100 : 100,
      avgResponseTime: stats.successful > 0 ? stats.totalDuration / stats.successful : 0,
      cost: stats.cost
    }));

    // Top operations
    const operationStats = new Map<string, { count: number; totalDuration: number; successful: number }>();
    recentMetrics.forEach(m => {
      if (!operationStats.has(m.operation)) {
        operationStats.set(m.operation, { count: 0, totalDuration: 0, successful: 0 });
      }
      const stats = operationStats.get(m.operation)!;
      stats.count++;
      if (m.success) {
        stats.totalDuration += m.duration;
        stats.successful++;
      }
    });

    const topOperations = Array.from(operationStats.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([operation, stats]) => ({
        operation,
        count: stats.count,
        avgDuration: stats.successful > 0 ? stats.totalDuration / stats.successful : 0,
        successRate: stats.count > 0 ? (stats.successful / stats.count) * 100 : 100
      }));

    return {
      overview,
      services,
      recentMetrics: recentMetrics.slice(-100),
      activeAlerts: Array.from(this.alerts.values()).filter(a => !a.resolved && !a.acknowledged),
      topOperations
    };
  }

  /**
   * Create alert rule
   */
  public createAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = randomUUID();
    const alertRule: AlertRule = { ...rule, id };
    this.alertRules.set(id, alertRule);
    return id;
  }

  /**
   * Configure rate limiting
   */
  public configureRateLimit(key: string, config: RateLimitConfig): void {
    this.rateLimitConfigs.set(key, config);
  }

  /**
   * Get active alerts
   */
  public getAlerts(filters?: {
    severity?: string;
    acknowledged?: boolean;
    resolved?: boolean;
    fromTime?: number;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (filters) {
      if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }
      if (filters.acknowledged !== undefined) {
        alerts = alerts.filter(a => a.acknowledged === filters.acknowledged);
      }
      if (filters.resolved !== undefined) {
        alerts = alerts.filter(a => a.resolved === filters.resolved);
      }
      if (filters.fromTime) {
        alerts = alerts.filter(a => a.timestamp >= filters.fromTime!);
      }
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.acknowledged = true;
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * Get metrics for export
   */
  public exportMetrics(format: 'json' | 'csv' = 'json', filters?: {
    service?: string;
    fromTime?: number;
    toTime?: number;
  }): string {
    const metrics = this.metricsStore.get(filters);

    if (format === 'csv') {
      const headers = [
        'timestamp', 'service', 'operation', 'duration', 'success',
        'tokensUsed', 'cost', 'cached', 'retryCount', 'errorCode', 'userId', 'correlationId'
      ];

      const rows = metrics.map(m => [
        new Date(m.timestamp).toISOString(),
        m.service,
        m.operation,
        m.duration.toString(),
        m.success.toString(),
        (m.tokensUsed || 0).toString(),
        (m.cost || 0).toString(),
        m.cached.toString(),
        m.retryCount.toString(),
        m.errorCode || '',
        m.userId || '',
        m.correlationId
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Clear old metrics
   */
  public cleanup(olderThanHours: number = 24): void {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    this.metricsStore.clear(cutoffTime);

    // Clean up old resolved alerts
    const alertCutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.resolved && alert.resolvedAt! < alertCutoffTime) {
        this.alerts.delete(id);
      }
    }
  }

  private initializeDefaultAlertRules(): void {
    // High error rate alert
    this.createAlertRule({
      name: 'High Error Rate',
      description: 'Error rate exceeds 10%',
      metric: 'errorRate',
      threshold: 10,
      operator: 'gt',
      timeWindow: 5,
      severity: 'warning',
      enabled: true
    });

    // Slow response time alert
    this.createAlertRule({
      name: 'Slow Response Time',
      description: 'Average response time exceeds 30 seconds',
      metric: 'averageResponseTime',
      threshold: 30000,
      operator: 'gt',
      timeWindow: 5,
      severity: 'warning',
      enabled: true
    });

    // Service down alert
    this.createAlertRule({
      name: 'Service Unavailable',
      description: 'Service has 100% error rate',
      metric: 'errorRate',
      threshold: 100,
      operator: 'eq',
      timeWindow: 2,
      severity: 'critical',
      enabled: true
    });

    // High cost alert
    this.createAlertRule({
      name: 'High Cost Alert',
      description: 'Hourly cost exceeds $10',
      metric: 'totalCost',
      threshold: 10,
      operator: 'gt',
      timeWindow: 60,
      severity: 'warning',
      enabled: true
    });
  }

  private initializeDefaultRateLimits(): void {
    // Default rate limit
    this.configureRateLimit('default', {
      windowMs: 60000, // 1 minute
      maxRequests: 100
    });

    // Per-service rate limits
    this.configureRateLimit('openai', {
      windowMs: 60000,
      maxRequests: 60
    });

    this.configureRateLimit('anthropic', {
      windowMs: 60000,
      maxRequests: 50
    });

    this.configureRateLimit('exa', {
      windowMs: 60000,
      maxRequests: 60
    });

    this.configureRateLimit('firecrawl', {
      windowMs: 60000,
      maxRequests: 100
    });
  }

  private checkAlerts(metrics: PerformanceMetrics): void {
    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (!rule.enabled) continue;

      try {
        const shouldAlert = this.evaluateAlertRule(rule, metrics);
        if (shouldAlert) {
          this.createAlert(ruleId, rule, metrics);
        }
      } catch (error) {
        console.error(`Error evaluating alert rule ${ruleId}:`, error);
      }
    }
  }

  private evaluateAlertRule(rule: AlertRule, metrics: PerformanceMetrics): boolean {
    const timeWindow = rule.timeWindow * 60 * 1000; // Convert minutes to milliseconds
    const fromTime = Date.now() - timeWindow;

    const recentMetrics = this.metricsStore.get({
      service: metrics.service,
      fromTime
    });

    let value: number;

    switch (rule.metric) {
      case 'errorRate':
        const failedRequests = recentMetrics.filter(m => !m.success).length;
        value = recentMetrics.length > 0 ? (failedRequests / recentMetrics.length) * 100 : 0;
        break;

      case 'averageResponseTime':
        const successfulMetrics = recentMetrics.filter(m => m.success);
        value = successfulMetrics.length > 0 ?
          successfulMetrics.reduce((sum, m) => sum + m.duration, 0) / successfulMetrics.length : 0;
        break;

      case 'totalCost':
        value = recentMetrics.reduce((sum, m) => sum + (m.cost || 0), 0);
        break;

      default:
        return false;
    }

    switch (rule.operator) {
      case 'gt': return value > rule.threshold;
      case 'lt': return value < rule.threshold;
      case 'eq': return value === rule.threshold;
      case 'gte': return value >= rule.threshold;
      case 'lte': return value <= rule.threshold;
      default: return false;
    }
  }

  private createAlert(ruleId: string, rule: AlertRule, metrics: PerformanceMetrics): void {
    // Check if we already have an active alert for this rule and service
    const existingAlert = Array.from(this.alerts.values()).find(alert =>
      alert.ruleId === ruleId &&
      !alert.resolved &&
      alert.details.service === metrics.service
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: Alert = {
      id: randomUUID(),
      ruleId,
      timestamp: Date.now(),
      severity: rule.severity,
      message: `${rule.name}: ${rule.description}`,
      details: {
        service: metrics.service,
        operation: metrics.operation,
        metric: rule.metric,
        value: this.getMetricValue(rule.metric, metrics),
        threshold: rule.threshold,
        correlationId: metrics.correlationId
      },
      acknowledged: false,
      resolved: false
    };

    this.alerts.set(alert.id, alert);

    console.warn(`AI Service Alert: ${alert.message}`, alert.details);
  }

  private getMetricValue(metric: string, metrics: PerformanceMetrics): number {
    switch (metric) {
      case 'errorRate': return metrics.success ? 0 : 100;
      case 'averageResponseTime': return metrics.duration;
      case 'totalCost': return metrics.cost || 0;
      default: return 0;
    }
  }

  private getServiceStatus(name: string, stats: { requests: number; successful: number }): 'healthy' | 'degraded' | 'unhealthy' {
    if (stats.requests === 0) return 'healthy';

    const errorRate = ((stats.requests - stats.successful) / stats.requests) * 100;

    if (errorRate >= 50) return 'unhealthy';
    if (errorRate >= 10) return 'degraded';
    return 'healthy';
  }
}

// Export singleton instance
export const aiPerformanceMonitor = AIPerformanceMonitor.getInstance();