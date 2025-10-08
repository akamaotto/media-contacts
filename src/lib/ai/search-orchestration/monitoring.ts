/**
 * Search Orchestration Monitoring Service
 * Provides comprehensive monitoring and metrics collection for the search orchestration system
 */

import { EventEmitter } from 'events';
import { SearchStage, SearchProgress, OrchestrationMetrics, HealthCheck, ServiceHealth } from './types';

interface SearchMetrics {
  searchId: string;
  userId: string;
  startTime: number;
  endTime?: number;
  currentStage: SearchStage;
  progress: SearchProgress;
  stageTimes: Record<SearchStage, number>;
  error?: string;
  cancelled: boolean;
}

interface PerformanceMetrics {
  requestCount: number;
  successCount: number;
  errorCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
}

interface StageMetrics {
  stage: SearchStage;
  count: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  errorCount: number;
  errorRate: number;
}

interface ResourceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  queueSize: number;
  cacheSize: number;
  cacheHitRate: number;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

interface MonitoringConfig {
  enabled: boolean;
  metricsRetentionPeriod: number; // In milliseconds
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    queueSize: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  samplingRate: number;
  exportInterval: number;
}

export class SearchOrchestrationMonitoring extends EventEmitter {
  private activeSearches: Map<string, SearchMetrics> = new Map();
  private completedSearches: SearchMetrics[] = [];
  private stageMetrics: Map<SearchStage, StageMetrics> = new Map();
  private performanceMetrics: PerformanceMetrics;
  private resourceMetrics: ResourceMetrics;
  private alerts: Alert[] = new Map();
  private config: MonitoringConfig;
  private metricsTimer?: NodeJS.Timeout;
  private alertTimer?: NodeJS.Timeout;

  constructor(config?: Partial<MonitoringConfig>) {
    super();
    this.config = this.mergeConfig(config);
    this.performanceMetrics = this.initializePerformanceMetrics();
    this.resourceMetrics = this.initializeResourceMetrics();
    this.initializeStageMetrics();

    if (this.config.enabled) {
      this.startMetricsCollection();
      this.startAlertMonitoring();
    }
  }

  /**
   * Start monitoring a new search
   */
  startSearch(searchId: string, userId: string): void {
    if (!this.config.enabled) return;

    const metrics: SearchMetrics = {
      searchId,
      userId,
      startTime: Date.now(),
      currentStage: SearchStage.INITIALIZING,
      progress: {
        percentage: 0,
        stage: SearchStage.INITIALIZING,
        message: 'Starting search...',
        currentStep: 0,
        totalSteps: 5,
        stageProgress: {}
      },
      stageTimes: {} as Record<SearchStage, number>,
      cancelled: false
    };

    this.activeSearches.set(searchId, metrics);
    this.recordStageStart(searchId, SearchStage.INITIALIZING);
  }

  /**
   * Update search progress
   */
  updateProgress(searchId: string, progress: SearchProgress, stage?: SearchStage): void {
    if (!this.config.enabled) return;

    const metrics = this.activeSearches.get(searchId);
    if (!metrics) return;

    metrics.progress = progress;
    if (stage && stage !== metrics.currentStage) {
      this.recordStageEnd(searchId, metrics.currentStage);
      this.recordStageStart(searchId, stage);
      metrics.currentStage = stage;
    }

    // Emit progress update event
    this.emit('progressUpdate', {
      searchId,
      progress,
      stage: metrics.currentStage,
      duration: Date.now() - metrics.startTime
    });
  }

  /**
   * Record search completion
   */
  completeSearch(searchId: string, success: boolean, error?: string): void {
    if (!this.config.enabled) return;

    const metrics = this.activeSearches.get(searchId);
    if (!metrics) return;

    metrics.endTime = Date.now();
    metrics.currentStage = success ? SearchStage.COMPLETED : SearchStage.FAILED;
    if (error) {
      metrics.error = error;
    }

    // Record final stage
    this.recordStageEnd(searchId, metrics.currentStage);

    // Update performance metrics
    const duration = metrics.endTime - metrics.startTime;
    this.updatePerformanceMetrics(duration, success);

    // Move to completed searches
    this.completedSearches.push(metrics);
    this.activeSearches.delete(searchId);

    // Clean up old completed searches
    this.cleanupCompletedSearches();

    // Emit completion event
    this.emit('searchCompleted', {
      searchId,
      success,
      duration,
      stageTimes: metrics.stageTimes,
      error
    });

    // Check for alerts
    this.checkPerformanceAlerts();
  }

  /**
   * Record search cancellation
   */
  cancelSearch(searchId: string, reason?: string): void {
    if (!this.config.enabled) return;

    const metrics = this.activeSearches.get(searchId);
    if (!metrics) return;

    metrics.endTime = Date.now();
    metrics.currentStage = SearchStage.CANCELLED;
    metrics.cancelled = true;
    if (reason) {
      metrics.error = reason;
    }

    this.recordStageEnd(searchId, SearchStage.CANCELLED);

    this.completedSearches.push(metrics);
    this.activeSearches.delete(searchId);

    this.emit('searchCancelled', {
      searchId,
      reason,
      duration: metrics.endTime - metrics.startTime
    });
  }

  /**
   * Record stage start time
   */
  private recordStageStart(searchId: string, stage: SearchStage): void {
    const metrics = this.activeSearches.get(searchId);
    if (!metrics) return;

    metrics.stageTimes[stage] = Date.now();

    const stageMetrics = this.stageMetrics.get(stage);
    if (stageMetrics) {
      stageMetrics.count++;
    }
  }

  /**
   * Record stage end time
   */
  private recordStageEnd(searchId: string, stage: SearchStage): void {
    const metrics = this.activeSearches.get(searchId);
    if (!metrics || !metrics.stageTimes[stage]) return;

    const endTime = Date.now();
    const duration = endTime - metrics.stageTimes[stage];

    const stageMetrics = this.stageMetrics.get(stage);
    if (stageMetrics) {
      const totalTime = stageMetrics.averageTime * (stageMetrics.count - 1) + duration;
      stageMetrics.averageTime = totalTime / stageMetrics.count;
      stageMetrics.minTime = Math.min(stageMetrics.minTime, duration);
      stageMetrics.maxTime = Math.max(stageMetrics.maxTime, duration);
    }
  }

  /**
   * Update resource metrics
   */
  updateResourceMetrics(metrics: Partial<ResourceMetrics>): void {
    if (!this.config.enabled) return;

    this.resourceMetrics = { ...this.resourceMetrics, ...metrics };

    this.emit('resourceMetricsUpdate', this.resourceMetrics);

    // Check for resource alerts
    this.checkResourceAlerts();
  }

  /**
   * Create an alert
   */
  createAlert(
    type: 'error' | 'warning' | 'info',
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    details?: Record<string, any>
  ): string {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: Alert = {
      id: alertId,
      type,
      severity,
      message,
      details,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.set(alertId, alert);

    this.emit('alertCreated', alert);

    return alertId;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) return;

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.emit('alertResolved', alert);
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): {
    performance: PerformanceMetrics;
    resource: ResourceMetrics;
    stages: Record<SearchStage, StageMetrics>;
    activeSearches: number;
    completedSearches: number;
    alerts: Alert[];
  } {
    return {
      performance: { ...this.performanceMetrics },
      resource: { ...this.resourceMetrics },
      stages: Object.fromEntries(this.stageMetrics),
      activeSearches: this.activeSearches.size,
      completedSearches: this.completedSearches.length,
      alerts: Array.from(this.alerts.values()).filter(a => !a.resolved)
    };
  }

  /**
   * Get detailed search analytics
   */
  getSearchAnalytics(timeRange?: { from: Date; to: Date }): {
    totalSearches: number;
    successRate: number;
    averageDuration: number;
    stageBreakdown: Record<SearchStage, { count: number; averageTime: number }>;
    errorBreakdown: Record<string, number>;
    userBreakdown: Record<string, number>;
    timeSeriesData: Array<{ timestamp: Date; searches: number; errors: number; avgDuration: number }>;
  } {
    const allSearches = [...this.completedSearches, ...Array.from(this.activeSearches.values())];

    // Filter by time range if provided
    const filteredSearches = timeRange
      ? allSearches.filter(s => s.startTime >= timeRange.from.getTime() && s.startTime <= timeRange.to.getTime())
      : allSearches;

    const completedSearches = filteredSearches.filter(s => s.endTime);
    const successfulSearches = completedSearches.filter(s => !s.error && !s.cancelled);

    // Calculate basic metrics
    const totalSearches = filteredSearches.length;
    const successRate = totalSearches > 0 ? (successfulSearches.length / totalSearches) * 100 : 0;
    const averageDuration = completedSearches.length > 0
      ? completedSearches.reduce((sum, s) => sum + (s.endTime! - s.startTime), 0) / completedSearches.length
      : 0;

    // Stage breakdown
    const stageBreakdown: Record<SearchStage, { count: number; averageTime: number }> = {} as any;
    for (const [stage, metrics] of this.stageMetrics) {
      stageBreakdown[stage] = {
        count: metrics.count,
        averageTime: metrics.averageTime
      };
    }

    // Error breakdown
    const errorBreakdown: Record<string, number> = {};
    for (const search of completedSearches) {
      if (search.error) {
        errorBreakdown[search.error] = (errorBreakdown[search.error] || 0) + 1;
      }
    }

    // User breakdown
    const userBreakdown: Record<string, number> = {};
    for (const search of filteredSearches) {
      userBreakdown[search.userId] = (userBreakdown[search.userId] || 0) + 1;
    }

    // Time series data (simplified - would normally aggregate by time intervals)
    const timeSeriesData = this.generateTimeSeriesData(completedSearches);

    return {
      totalSearches,
      successRate,
      averageDuration,
      stageBreakdown,
      errorBreakdown,
      userBreakdown,
      timeSeriesData
    };
  }

  /**
   * Get health status
   */
  getHealthStatus(serviceHealth?: ServiceHealth[]): HealthCheck {
    const metrics = this.getCurrentMetrics();
    const activeAlerts = metrics.alerts.filter(a => a.severity === 'high' || a.severity === 'critical');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (activeAlerts.length > 0 || metrics.performance.errorRate > this.config.alertThresholds.errorRate) {
      overallStatus = 'unhealthy';
    } else if (metrics.performance.errorRate > this.config.alertThresholds.errorRate * 0.5 ||
               metrics.performance.averageResponseTime > this.config.alertThresholds.responseTime * 0.8) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      services: serviceHealth || [],
      metrics: {
        searchesProcessed: metrics.performance.requestCount,
        contactsFound: 0, // Would be calculated elsewhere
        averageProcessingTime: metrics.performance.averageResponseTime,
        cacheHitRate: metrics.resource.cacheHitRate,
        costEfficiency: 0, // Would be calculated elsewhere
        errorRate: metrics.performance.errorRate,
        concurrentSearches: metrics.activeSearches,
        queueUtilization: metrics.resource.queueSize / 100, // Normalized
        memoryUsage: metrics.resource.memoryUsage,
        cpuUsage: metrics.resource.cpuUsage
      },
      activeSearches: metrics.activeSearches,
      queueSize: metrics.resource.queueSize,
      errorRate: metrics.performance.errorRate,
      averageResponseTime: metrics.performance.averageResponseTime
    };
  }

  /**
   * Export metrics for external monitoring systems
   */
  exportMetrics(): {
    timestamp: Date;
    performance: PerformanceMetrics;
    resource: ResourceMetrics;
    stageMetrics: Record<SearchStage, StageMetrics>;
    alerts: Alert[];
  } {
    return {
      timestamp: new Date(),
      performance: { ...this.performanceMetrics },
      resource: { ...this.resourceMetrics },
      stageMetrics: Object.fromEntries(this.stageMetrics),
      alerts: Array.from(this.alerts.values())
    };
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.exportInterval);
  }

  /**
   * Start alert monitoring
   */
  private startAlertMonitoring(): void {
    this.alertTimer = setInterval(() => {
      this.checkAllAlerts();
    }, 60000); // Check alerts every minute
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    // This would normally collect system metrics
    // For now, we'll simulate some basic resource metrics
    const memUsage = process.memoryUsage();
    this.updateResourceMetrics({
      memoryUsage: memUsage.heapUsed,
      cpuUsage: Math.random() * 100, // Would use actual CPU monitoring
      activeConnections: this.activeSearches.size,
      queueSize: 0, // Would get from orchestration service
      cacheSize: 0, // Would get from cache service
      cacheHitRate: this.resourceMetrics.cacheHitRate
    });
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(): void {
    const { errorRate, averageResponseTime } = this.performanceMetrics;

    if (errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert(
        'error',
        'high',
        `High error rate detected: ${errorRate.toFixed(2)}%`,
        { errorRate, threshold: this.config.alertThresholds.errorRate }
      );
    }

    if (averageResponseTime > this.config.alertThresholds.responseTime) {
      this.createAlert(
        'warning',
        'medium',
        `High response time detected: ${averageResponseTime.toFixed(0)}ms`,
        { averageResponseTime, threshold: this.config.alertThresholds.responseTime }
      );
    }
  }

  /**
   * Check for resource alerts
   */
  private checkResourceAlerts(): void {
    const { memoryUsage, cpuUsage, queueSize } = this.resourceMetrics;

    if (memoryUsage > this.config.alertThresholds.memoryUsage) {
      this.createAlert(
        'error',
        'high',
        `High memory usage detected: ${(memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        { memoryUsage, threshold: this.config.alertThresholds.memoryUsage }
      );
    }

    if (cpuUsage > this.config.alertThresholds.cpuUsage) {
      this.createAlert(
        'warning',
        'medium',
        `High CPU usage detected: ${cpuUsage.toFixed(2)}%`,
        { cpuUsage, threshold: this.config.alertThresholds.cpuUsage }
      );
    }

    if (queueSize > this.config.alertThresholds.queueSize) {
      this.createAlert(
        'warning',
        'medium',
        `High queue size detected: ${queueSize}`,
        { queueSize, threshold: this.config.alertThresholds.queueSize }
      );
    }
  }

  /**
   * Check all alerts
   */
  private checkAllAlerts(): void {
    this.checkPerformanceAlerts();
    this.checkResourceAlerts();
  }

  /**
   * Clean up old completed searches
   */
  private cleanupCompletedSearches(): void {
    const cutoffTime = Date.now() - this.config.metricsRetentionPeriod;
    this.completedSearches = this.completedSearches.filter(s => s.startTime > cutoffTime);
  }

  /**
   * Generate time series data
   */
  private generateTimeSeriesData(searches: SearchMetrics[]): Array<{ timestamp: Date; searches: number; errors: number; avgDuration: number }> {
    // Simplified time series generation - would normally aggregate by time intervals
    const timeBuckets = new Map<number, { searches: number; errors: number; totalDuration: number }>();

    for (const search of searches) {
      if (!search.endTime) continue;

      const bucketTime = Math.floor(search.startTime / 300000) * 300000; // 5-minute buckets
      const bucket = timeBuckets.get(bucketTime) || { searches: 0, errors: 0, totalDuration: 0 };

      bucket.searches++;
      if (search.error) bucket.errors++;
      bucket.totalDuration += search.endTime - search.startTime;

      timeBuckets.set(bucketTime, bucket);
    }

    return Array.from(timeBuckets.entries())
      .map(([timestamp, data]) => ({
        timestamp: new Date(timestamp),
        searches: data.searches,
        errors: data.errors,
        avgDuration: data.searches > 0 ? data.totalDuration / data.searches : 0
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .slice(-100); // Keep last 100 data points
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(duration: number, success: boolean): void {
    this.performanceMetrics.requestCount++;

    if (success) {
      this.performanceMetrics.successCount++;
    } else {
      this.performanceMetrics.errorCount++;
    }

    // Update average response time
    const totalRequests = this.performanceMetrics.requestCount;
    const currentAvg = this.performanceMetrics.averageResponseTime;
    this.performanceMetrics.averageResponseTime = (currentAvg * (totalRequests - 1) + duration) / totalRequests;

    // Update error rate
    this.performanceMetrics.errorRate = (this.performanceMetrics.errorCount / totalRequests) * 100;

    // Update throughput (requests per second over last minute)
    this.performanceMetrics.throughput = totalRequests / 60; // Simplified
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      throughput: 0,
      errorRate: 0
    };
  }

  /**
   * Initialize resource metrics
   */
  private initializeResourceMetrics(): ResourceMetrics {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      activeConnections: 0,
      queueSize: 0,
      cacheSize: 0,
      cacheHitRate: 0
    };
  }

  /**
   * Initialize stage metrics
   */
  private initializeStageMetrics(): void {
    const stages = Object.values(SearchStage);
    for (const stage of stages) {
      this.stageMetrics.set(stage, {
        stage,
        count: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errorCount: 0,
        errorRate: 0
      });
    }
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config?: Partial<MonitoringConfig>): MonitoringConfig {
    const defaultConfig: MonitoringConfig = {
      enabled: true,
      metricsRetentionPeriod: 24 * 60 * 60 * 1000, // 24 hours
      alertThresholds: {
        errorRate: 10, // 10%
        responseTime: 30000, // 30 seconds
        queueSize: 100,
        memoryUsage: 500 * 1024 * 1024, // 500MB
        cpuUsage: 80 // 80%
      },
      samplingRate: 1.0,
      exportInterval: 30000 // 30 seconds
    };

    if (!config) return defaultConfig;

    return {
      ...defaultConfig,
      ...config,
      alertThresholds: { ...defaultConfig.alertThresholds, ...config.alertThresholds }
    };
  }

  /**
   * Graceful shutdown
   */
  async destroy(): Promise<void> {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }

    if (this.alertTimer) {
      clearInterval(this.alertTimer);
    }

    this.removeAllListeners();
  }
}

// Export singleton instance
export const searchMonitoring = new SearchOrchestrationMonitoring();