/**
 * Post-Launch Monitoring Service
 * Comprehensive monitoring service for the "Find Contacts with AI" feature post-launch
 */

import { aiSearchMonitor } from './ai-search-monitor';
import { alertManager } from './alert-manager';
import { apiHealthMonitor } from './api-health-monitor';
import { databaseMonitor } from '../database/database-monitor';
import { aiCostMonitor } from '../cost/ai-cost-monitor';
import { automatedReportingService } from '../analytics/automated-reporting-service';
import { businessImpactCalculator } from '../analytics/business-impact-calculator';
import { 
  featureAdoptionTracker,
  type AdoptionMetrics
} from '../analytics/feature-adoption-tracker';
import { 
  userSatisfactionTracker,
  type SatisfactionReport
} from '../analytics/user-satisfaction-tracker';

export interface PostLaunchMetrics {
  timestamp: Date;
  feature: 'ai-search';
  environment: string;
  health: {
    overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    components: {
      api: string;
      database: string;
      aiServices: string;
      costMonitoring: string;
      errorTracking: string;
    };
    uptime: number;
  };
  performance: {
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
    };
    throughput: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
    errorRate: number;
    availability: number;
  };
  usage: {
    dailySearches: number;
    weeklySearches: number;
    monthlySearches: number;
    uniqueUsers: number;
    repeatUsers: number;
    successRate: number;
    averageResultsPerSearch: number;
    featureAdoptionRate: number;
    searchAbandonmentRate: number;
  };
  userExperience: {
    satisfactionScore: number;
    averageSessionDuration: number;
    averageTimeToFirstResult: number;
    userRetentionRate: number;
    feedbackCount: number;
    reportedIssues: number;
  };
  businessImpact: {
    contactsDiscovered: number;
    productivityGainHours: number;
    costSavings: number;
    roi: number;
    costPerContact: number;
    revenueAtRisk: number;
  };
  costs: {
    dailyTotal: number;
    monthlyTotal: number;
    costPerSearch: number;
    costByProvider: Record<string, number>;
    projectedMonthlySpend: number;
  };
  errors: {
    failedSearches: number;
    failedExtractions: number;
    systemErrors: number;
    userErrors: number;
    errorCategories: Record<string, number>;
    criticalErrors: number;
  };
}

export interface MonitoringAlert {
  id: string;
  type: 'performance' | 'availability' | 'cost' | 'usage' | 'business' | 'security';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  threshold: number;
  triggeredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  recommendations: string[];
}

export interface SuccessCriteria {
  id: string;
  name: string;
  description: string;
  category: 'technical' | 'user-adoption' | 'business' | 'operational';
  threshold: number;
  weight: number; // Importance weighting 1-10
  currentValue: number;
  achieved: boolean;
  trend: 'improving' | 'stable' | 'declining';
  lastEvaluated: Date;
}

export interface PostLaunchReport {
  id: string;
  generatedAt: Date;
  timeRange: { start: Date; end: Date };
  environment: string;
  metrics: PostLaunchMetrics;
  alerts: MonitoringAlert[];
  successCriteria: SuccessCriteria[];
  overallScore: number;
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  nextSteps: string[];
}

export interface MonitoringConfiguration {
  environment: string;
  enabled: boolean;
  monitoringInterval: number; // milliseconds
  alerting: {
    enabled: boolean;
    channels: string[];
    thresholds: Record<string, number>;
    cooldownPeriod: number; // milliseconds
  };
  reporting: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    includeDetailedMetrics: boolean;
  };
  successCriteria: {
    enabled: boolean;
    evaluationInterval: number; // milliseconds
    autoGenerateRecommendations: boolean;
  };
}

export class PostLaunchMonitoringService {
  private static instance: PostLaunchMonitoringService;
  private config: MonitoringConfiguration;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsHistory: PostLaunchMetrics[] = [];
  private activeAlerts = new Map<string, MonitoringAlert>();
  private subscribers: Set<(metrics: PostLaunchMetrics) => void> = new Set();
  private lastMetrics: PostLaunchMetrics | null = null;

  private constructor() {
    this.config = this.getDefaultConfiguration();
  }

  static getInstance(): PostLaunchMonitoringService {
    if (!PostLaunchMonitoringService.instance) {
      PostLaunchMonitoringService.instance = new PostLaunchMonitoringService();
    }
    return PostLaunchMonitoringService.instance;
  }

  /**
   * Initialize the monitoring service
   */
  async initialize(config?: Partial<MonitoringConfiguration>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log(`🚀 [POST-LAUNCH-MONITOR] Initializing monitoring for ${this.config.environment} environment`);

    // Validate configuration
    this.validateConfiguration();

    // Initialize dependent services
    await this.initializeDependentServices();

    // Start monitoring if enabled
    if (this.config.enabled) {
      await this.startMonitoring();
    }

    console.log(`✅ [POST-LAUNCH-MONITOR] Monitoring service initialized`);
  }

  /**
   * Start the monitoring process
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️ [POST-LAUNCH-MONITOR] Monitoring already running');
      return;
    }

    this.isMonitoring = true;
    
    // Start monitoring interval
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, this.config.monitoringInterval);

    // Collect initial metrics
    await this.collectMetrics();

    console.log(`✅ [POST-LAUNCH-MONITOR] Monitoring started (interval: ${this.config.monitoringInterval}ms)`);
  }

  /**
   * Stop the monitoring process
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.log('⚠️ [POST-LAUNCH-MONITOR] Monitoring not running');
      return;
    }

    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🛑 [POST-LAUNCH-MONITOR] Monitoring stopped');
  }

  /**
   * Collect comprehensive metrics
   */
  async collectMetrics(): Promise<PostLaunchMetrics> {
    const timestamp = new Date();
    
    try {
      // Collect health metrics
      const health = await this.collectHealthMetrics();
      
      // Collect performance metrics
      const performance = await this.collectPerformanceMetrics();
      
      // Collect usage metrics
      const usage = await this.collectUsageMetrics();
      
      // Collect user experience metrics
      const userExperience = await this.collectUserExperienceMetrics();
      
      // Collect business impact metrics
      const businessImpact = await this.collectBusinessImpactMetrics();
      
      // Collect cost metrics
      const costs = await this.collectCostMetrics();
      
      // Collect error metrics
      const errors = await this.collectErrorMetrics();

      const metrics: PostLaunchMetrics = {
        timestamp,
        feature: 'ai-search',
        environment: this.config.environment,
        health,
        performance,
        usage,
        userExperience,
        businessImpact,
        costs,
        errors
      };

      // Store metrics
      this.metricsHistory.push(metrics);
      this.lastMetrics = metrics;

      // Keep only last 1000 metrics to prevent memory issues
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory = this.metricsHistory.slice(-1000);
      }

      // Check for alerts
      if (this.config.alerting.enabled) {
        await this.checkAlerts(metrics);
      }

      // Evaluate success criteria
      if (this.config.successCriteria.enabled) {
        await this.evaluateSuccessCriteria(metrics);
      }

      // Notify subscribers
      this.notifySubscribers(metrics);

      return metrics;

    } catch (error) {
      console.error('❌ [POST-LAUNCH-MONITOR] Error collecting metrics:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive post-launch report
   */
  async generateReport(timeRange?: { start: Date; end: Date }): Promise<PostLaunchReport> {
    const now = new Date();
    const defaultTimeRange = {
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: now
    };

    const reportTimeRange = timeRange || defaultTimeRange;

    // Get metrics for the time range
    const relevantMetrics = this.getMetricsForTimeRange(reportTimeRange);
    
    if (relevantMetrics.length === 0) {
      throw new Error('No metrics available for the specified time range');
    }

    // Calculate aggregated metrics
    const aggregatedMetrics = this.aggregateMetrics(relevantMetrics);

    // Get current alerts
    const alerts = Array.from(this.activeAlerts.values());

    // Evaluate success criteria
    const successCriteria = await this.evaluateAllSuccessCriteria(aggregatedMetrics);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(successCriteria);

    // Generate recommendations
    const recommendations = this.generateRecommendations(aggregatedMetrics, alerts, successCriteria);

    // Generate next steps
    const nextSteps = this.generateNextSteps(overallScore, recommendations);

    const report: PostLaunchReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: now,
      timeRange: reportTimeRange,
      environment: this.config.environment,
      metrics: aggregatedMetrics,
      alerts,
      successCriteria,
      overallScore,
      recommendations,
      nextSteps
    };

    console.log(`📊 [POST-LAUNCH-MONITOR] Generated report: ${report.id}`);

    return report;
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PostLaunchMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): PostLaunchMetrics[] {
    return limit ? this.metricsHistory.slice(-limit) : [...this.metricsHistory];
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): MonitoringAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;

    console.log(`✅ [POST-LAUNCH-MONITOR] Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolvedAt = new Date();
    this.activeAlerts.delete(alertId);

    console.log(`✅ [POST-LAUNCH-MONITOR] Alert resolved: ${alertId}`);
    return true;
  }

  /**
   * Subscribe to metrics updates
   */
  subscribe(callback: (metrics: PostLaunchMetrics) => void): () => void {
    this.subscribers.add(callback);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Update monitoring configuration
   */
  updateConfiguration(config: Partial<MonitoringConfiguration>): void {
    const wasMonitoring = this.isMonitoring;
    
    if (wasMonitoring) {
      this.stopMonitoring();
    }

    this.config = { ...this.config, ...config };

    if (wasMonitoring && this.config.enabled) {
      this.startMonitoring();
    }

    console.log('⚙️ [POST-LAUNCH-MONITOR] Configuration updated');
  }

  private async collectHealthMetrics(): Promise<PostLaunchMetrics['health']> {
    const apiHealth = await apiHealthMonitor.getSystemHealthMetrics();
    const dbHealth = await databaseMonitor.getHealthStatus();
    const aiHealth = aiSearchMonitor.getMetrics();

    return {
      overall: this.determineOverallHealth(apiHealth.overall, dbHealth.overall, aiHealth.searchSuccessRate),
      components: {
        api: apiHealth.overall,
        database: dbHealth.overall,
        aiServices: aiHealth.searchSuccessRate >= 90 ? 'healthy' : 'degraded',
        costMonitoring: 'healthy', // Simplified
        errorTracking: 'healthy' // Simplified
      },
      uptime: apiHealth.uptime
    };
  }

  private async collectPerformanceMetrics(): Promise<PostLaunchMetrics['performance']> {
    const aiMetrics = aiSearchMonitor.getMetrics();

    return {
      responseTime: {
        p50: aiMetrics.searchLatency || 500,
        p95: aiMetrics.searchLatency * 1.5 || 1000,
        p99: aiMetrics.searchLatency * 2 || 2000
      },
      throughput: {
        requestsPerMinute: aiMetrics.searchesPerMinute || 0,
        requestsPerHour: (aiMetrics.searchesPerMinute || 0) * 60
      },
      errorRate: 100 - aiMetrics.searchSuccessRate,
      availability: 99.9 // Simplified
    };
  }

  private async collectUsageMetrics(): Promise<PostLaunchMetrics['usage']> {
    const aiMetrics = aiSearchMonitor.getMetrics();
    const adoptionMetrics = await featureAdoptionTracker.getAdoptionMetrics({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    });

    return {
      dailySearches: aiMetrics.totalSearches || 0,
      weeklySearches: (aiMetrics.totalSearches || 0) * 7, // Simplified
      monthlySearches: (aiMetrics.totalSearches || 0) * 30, // Simplified
      uniqueUsers: aiMetrics.uniqueSearchers || 0,
      repeatUsers: Math.floor((aiMetrics.uniqueSearchers || 0) * 0.3), // Simplified
      successRate: aiMetrics.searchSuccessRate,
      averageResultsPerSearch: aiMetrics.averageResultsPerSearch || 0,
      featureAdoptionRate: adoptionMetrics.adoptionRate || 0,
      searchAbandonmentRate: 15 // Simplified
    };
  }

  private async collectUserExperienceMetrics(): Promise<PostLaunchMetrics['userExperience']> {
    const satisfactionReport = await userSatisfactionTracker.generateSatisfactionReport({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    });

    return {
      satisfactionScore: satisfactionReport.metrics.averageRating || 0,
      averageSessionDuration: 300, // 5 minutes, simplified
      averageTimeToFirstResult: 2000, // 2 seconds, simplified
      userRetentionRate: 85, // 85%, simplified
      feedbackCount: satisfactionReport.metrics.feedbackCount || 0,
      reportedIssues: 5 // Simplified
    };
  }

  private async collectBusinessImpactMetrics(): Promise<PostLaunchMetrics['businessImpact']> {
    const impactReport = await businessImpactCalculator.generateImpactReport({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    });

    return {
      contactsDiscovered: impactReport.currentMetrics.directValue.contactsDiscovered,
      productivityGainHours: impactReport.currentMetrics.efficiency.timeSaved,
      costSavings: impactReport.currentMetrics.efficiency.costSavings,
      roi: impactReport.currentMetrics.roi.monthlyROI,
      costPerContact: impactReport.currentMetrics.costs.costPerContact,
      revenueAtRisk: 1000 // Simplified
    };
  }

  private async collectCostMetrics(): Promise<PostLaunchMetrics['costs']> {
    const costMetrics = aiCostMonitor.getCostMetrics();

    return {
      dailyTotal: costMetrics.dailySpend || 0,
      monthlyTotal: (costMetrics.dailySpend || 0) * 30,
      costPerSearch: costMetrics.costPerSearch || 0,
      costByProvider: costMetrics.costByProvider || {},
      projectedMonthlySpend: (costMetrics.dailySpend || 0) * 30 * 1.1 // 10% growth projection
    };
  }

  private async collectErrorMetrics(): Promise<PostLaunchMetrics['errors']> {
    const aiMetrics = aiSearchMonitor.getMetrics();

    return {
      failedSearches: Math.floor((aiMetrics.totalSearches || 0) * (1 - aiMetrics.searchSuccessRate / 100)),
      failedExtractions: 5, // Simplified
      systemErrors: 2, // Simplified
      userErrors: 3, // Simplified
      errorCategories: aiMetrics.errorCategories || {},
      criticalErrors: 1 // Simplified
    };
  }

  private async checkAlerts(metrics: PostLaunchMetrics): Promise<void> {
    const thresholds = this.config.alerting.thresholds;
    const newAlerts: MonitoringAlert[] = [];

    // Performance alerts
    if (metrics.performance.errorRate > (thresholds.errorRate || 10)) {
      newAlerts.push(this.createAlert(
        'performance',
        'critical',
        'High Error Rate',
        `Error rate is ${metrics.performance.errorRate}% which exceeds threshold of ${thresholds.errorRate}%`,
        'errorRate',
        metrics.performance.errorRate,
        thresholds.errorRate,
        ['Investigate recent changes', 'Check service dependencies', 'Review error logs']
      ));
    }

    // Cost alerts
    if (metrics.costs.dailyTotal > (thresholds.dailyCost || 100)) {
      newAlerts.push(this.createAlert(
        'cost',
        'warning',
        'High Daily Cost',
        `Daily cost is $${metrics.costs.dailyTotal} which exceeds threshold of $${thresholds.dailyCost}`,
        'dailyCost',
        metrics.costs.dailyTotal,
        thresholds.dailyCost,
        ['Review cost optimization strategies', 'Consider caching mechanisms', 'Optimize AI service usage']
      ));
    }

    // Usage alerts
    if (metrics.usage.successRate < (thresholds.successRate || 90)) {
      newAlerts.push(this.createAlert(
        'usage',
        'critical',
        'Low Success Rate',
        `Success rate is ${metrics.usage.successRate}% which is below threshold of ${thresholds.successRate}%`,
        'successRate',
        metrics.usage.successRate,
        thresholds.successRate,
        ['Investigate failure patterns', 'Improve error handling', 'Enhance search algorithms']
      ));
    }

    // Add new alerts
    for (const alert of newAlerts) {
      if (!this.activeAlerts.has(alert.id)) {
        this.activeAlerts.set(alert.id, alert);
        console.log(`🚨 [POST-LAUNCH-MONITOR] Alert triggered: ${alert.title}`);
      }
    }

    // Check for resolved alerts
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (this.isAlertResolved(alert, metrics)) {
        this.resolveAlert(alertId);
      }
    }
  }

  private createAlert(
    type: MonitoringAlert['type'],
    severity: MonitoringAlert['severity'],
    title: string,
    description: string,
    metric: string,
    currentValue: number,
    threshold: number,
    recommendations: string[]
  ): MonitoringAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      description,
      metric,
      currentValue,
      threshold,
      triggeredAt: new Date(),
      acknowledged: false,
      recommendations
    };
  }

  private isAlertResolved(alert: MonitoringAlert, metrics: PostLaunchMetrics): boolean {
    switch (alert.metric) {
      case 'errorRate':
        return metrics.performance.errorRate < alert.threshold;
      case 'dailyCost':
        return metrics.costs.dailyTotal < alert.threshold;
      case 'successRate':
        return metrics.usage.successRate > alert.threshold;
      default:
        return false;
    }
  }

  private async evaluateSuccessCriteria(metrics: PostLaunchMetrics): Promise<void> {
    // This would evaluate predefined success criteria
    // Implementation depends on specific criteria defined for the feature
  }

  private async evaluateAllSuccessCriteria(metrics: PostLaunchMetrics): Promise<SuccessCriteria[]> {
    // Default success criteria for AI Search feature
    const criteria: SuccessCriteria[] = [
      {
        id: 'search_success_rate',
        name: 'Search Success Rate',
        description: 'Percentage of searches that complete successfully',
        category: 'technical',
        threshold: 90,
        weight: 10,
        currentValue: metrics.usage.successRate,
        achieved: metrics.usage.successRate >= 90,
        trend: 'stable',
        lastEvaluated: new Date()
      },
      {
        id: 'response_time',
        name: 'Response Time',
        description: '95th percentile response time for searches',
        category: 'technical',
        threshold: 2000,
        weight: 8,
        currentValue: metrics.performance.responseTime.p95,
        achieved: metrics.performance.responseTime.p95 <= 2000,
        trend: 'stable',
        lastEvaluated: new Date()
      },
      {
        id: 'daily_usage',
        name: 'Daily Usage',
        description: 'Number of searches performed per day',
        category: 'user-adoption',
        threshold: 100,
        weight: 7,
        currentValue: metrics.usage.dailySearches,
        achieved: metrics.usage.dailySearches >= 100,
        trend: 'improving',
        lastEvaluated: new Date()
      },
      {
        id: 'user_satisfaction',
        name: 'User Satisfaction',
        description: 'Average user satisfaction rating',
        category: 'user-adoption',
        threshold: 4.0,
        weight: 9,
        currentValue: metrics.userExperience.satisfactionScore,
        achieved: metrics.userExperience.satisfactionScore >= 4.0,
        trend: 'stable',
        lastEvaluated: new Date()
      },
      {
        id: 'cost_efficiency',
        name: 'Cost Efficiency',
        description: 'Daily cost should remain within budget',
        category: 'business',
        threshold: 100,
        weight: 6,
        currentValue: metrics.costs.dailyTotal,
        achieved: metrics.costs.dailyTotal <= 100,
        trend: 'stable',
        lastEvaluated: new Date()
      }
    ];

    return criteria;
  }

  private calculateOverallScore(successCriteria: SuccessCriteria[]): number {
    if (successCriteria.length === 0) return 0;

    const totalWeight = successCriteria.reduce((sum, criteria) => sum + criteria.weight, 0);
    const achievedWeight = successCriteria
      .filter(criteria => criteria.achieved)
      .reduce((sum, criteria) => sum + criteria.weight, 0);

    return Math.round((achievedWeight / totalWeight) * 100);
  }

  private generateRecommendations(
    metrics: PostLaunchMetrics,
    alerts: MonitoringAlert[],
    successCriteria: SuccessCriteria[]
  ): PostLaunchReport['recommendations'] {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    // Critical alerts need immediate attention
    alerts
      .filter(alert => alert.severity === 'critical' || alert.severity === 'emergency')
      .forEach(alert => {
        immediate.push(...alert.recommendations);
      });

    // Failed success criteria
    successCriteria
      .filter(criteria => !criteria.achieved)
      .forEach(criteria => {
        if (criteria.weight >= 8) {
          immediate.push(`Address critical criteria: ${criteria.name}`);
        } else if (criteria.weight >= 5) {
          shortTerm.push(`Improve criteria: ${criteria.name}`);
        } else {
          longTerm.push(`Optimize criteria: ${criteria.name}`);
        }
      });

    // Performance-based recommendations
    if (metrics.performance.errorRate > 5) {
      shortTerm.push('Investigate and reduce error rate');
    }

    if (metrics.costs.dailyTotal > 80) {
      shortTerm.push('Optimize costs through caching and query optimization');
    }

    if (metrics.usage.featureAdoptionRate < 50) {
      longTerm.push('Enhance feature discoverability and user onboarding');
    }

    return {
      immediate: [...new Set(immediate)], // Remove duplicates
      shortTerm: [...new Set(shortTerm)],
      longTerm: [...new Set(longTerm)]
    };
  }

  private generateNextSteps(overallScore: number, recommendations: PostLaunchReport['recommendations']): string[] {
    const nextSteps: string[] = [];

    if (overallScore >= 80) {
      nextSteps.push('Continue current monitoring and optimization');
      nextSteps.push('Plan feature expansion and enhancements');
      nextSteps.push('Document success factors and best practices');
    } else if (overallScore >= 60) {
      nextSteps.push('Address immediate recommendations');
      nextSteps.push('Increase monitoring frequency');
      nextSteps.push('Schedule performance optimization sprint');
    } else {
      nextSteps.push('Conduct emergency review of all systems');
      nextSteps.push('Consider temporary feature rollback if issues persist');
      nextSteps.push('Allocate additional resources for problem resolution');
    }

    return nextSteps;
  }

  private getMetricsForTimeRange(timeRange: { start: Date; end: Date }): PostLaunchMetrics[] {
    return this.metricsHistory.filter(
      metrics => metrics.timestamp >= timeRange.start && metrics.timestamp <= timeRange.end
    );
  }

  private aggregateMetrics(metrics: PostLaunchMetrics[]): PostLaunchMetrics {
    if (metrics.length === 0) {
      throw new Error('No metrics to aggregate');
    }

    // Use the most recent metrics as base and aggregate numerical values
    const latest = metrics[metrics.length - 1];

    // For demonstration, we'll return the latest metrics
    // In a real implementation, you would aggregate values across the time range
    return latest;
  }

  private determineOverallHealth(apiHealth: string, dbHealth: string, aiSuccessRate: number): PostLaunchMetrics['health']['overall'] {
    if (apiHealth === 'unhealthy' || dbHealth === 'unhealthy' || aiSuccessRate < 50) {
      return 'critical';
    } else if (apiHealth === 'degraded' || dbHealth === 'degraded' || aiSuccessRate < 80) {
      return 'unhealthy';
    } else if (apiHealth === 'healthy' && dbHealth === 'healthy' && aiSuccessRate >= 95) {
      return 'healthy';
    } else {
      return 'degraded';
    }
  }

  private notifySubscribers(metrics: PostLaunchMetrics): void {
    this.subscribers.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('❌ [POST-LAUNCH-MONITOR] Error in subscriber callback:', error);
      }
    });
  }

  private validateConfiguration(): void {
    if (!this.config.environment) {
      throw new Error('Environment is required in configuration');
    }

    if (this.config.monitoringInterval < 10000) { // 10 seconds minimum
      throw new Error('Monitoring interval must be at least 10 seconds');
    }
  }

  private async initializeDependentServices(): Promise<void> {
    // Initialize dependent monitoring services
    // This would ensure all required services are properly started
    console.log('🔧 [POST-LAUNCH-MONITOR] Initializing dependent services');
  }

  private getDefaultConfiguration(): MonitoringConfiguration {
    return {
      environment: process.env.NODE_ENV || 'development',
      enabled: true,
      monitoringInterval: 60000, // 1 minute
      alerting: {
        enabled: true,
        channels: ['console', 'log'],
        thresholds: {
          errorRate: 10,
          dailyCost: 100,
          successRate: 90
        },
        cooldownPeriod: 300000 // 5 minutes
      },
      reporting: {
        enabled: true,
        frequency: 'daily',
        recipients: [],
        includeDetailedMetrics: true
      },
      successCriteria: {
        enabled: true,
        evaluationInterval: 300000, // 5 minutes
        autoGenerateRecommendations: true
      }
    };
  }
}

// Export singleton instance
export const postLaunchMonitoringService = PostLaunchMonitoringService.getInstance();

// Export utility functions
export async function initializePostLaunchMonitoring(config?: Partial<MonitoringConfiguration>): Promise<void> {
  return postLaunchMonitoringService.initialize(config);
}

export async function startPostLaunchMonitoring(): Promise<void> {
  return postLaunchMonitoringService.startMonitoring();
}

export function stopPostLaunchMonitoring(): void {
  postLaunchMonitoringService.stopMonitoring();
}

export async function generatePostLaunchReport(timeRange?: { start: Date; end: Date }): Promise<PostLaunchReport> {
  return postLaunchMonitoringService.generateReport(timeRange);
}

export function getCurrentPostLaunchMetrics(): PostLaunchMetrics | null {
  return postLaunchMonitoringService.getCurrentMetrics();
}

export function getPostLaunchAlerts(): MonitoringAlert[] {
  return postLaunchMonitoringService.getActiveAlerts();
}