/**
 * Feature Flag Monitoring and Alerting Service
 * Provides monitoring, metrics collection, and alerting for feature flags
 */

import { featureFlagDb } from './feature-flag-db';
import { featureFlagAuditLog } from './audit-log-service';
import { type FeatureFlag } from './feature-flag-service';

export interface FeatureFlagMetrics {
  flagId: string;
  flagKey: string;
  timestamp: Date;
  totalEvaluations: number;
  enabledEvaluations: number;
  disabledEvaluations: number;
  errorRate: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // evaluations per second
  userSegmentStats: Record<string, {
    total: number;
    enabled: number;
    disabled: number;
    errorRate: number;
  }>;
  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  flagId?: string;
  flagKey?: string;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMinutes: number;
  notificationChannels: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  flagId?: string;
  flagKey?: string;
  metric: AlertMetric;
  currentValue: number;
  threshold: number;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  notificationsSent: string[];
}

export type AlertMetric = 
  | 'error_rate'
  | 'response_time'
  | 'throughput'
  | 'cpu_usage'
  | 'memory_usage'
  | 'disk_usage'
  | 'network_io'
  | 'evaluation_count'
  | 'enabled_percentage';

export type AlertOperator = 
  | 'greater_than'
  | 'less_than'
  | 'equals'
  | 'not_equals'
  | 'greater_than_or_equal'
  | 'less_than_or_equal';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type AlertStatus = 'active' | 'acknowledged' | 'resolved' | 'suppressed';

export interface MonitoringDashboard {
  overview: {
    totalFlags: number;
    enabledFlags: number;
    flagsInRollout: number;
    totalEvaluations: number;
    avgResponseTime: number;
    errorRate: number;
    activeAlerts: number;
  };
  flagMetrics: FeatureFlagMetrics[];
  alerts: Alert[];
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: number;
  };
}

export class FeatureFlagMonitoringService {
  private db = featureFlagDb;
  private auditLog = featureFlagAuditLog;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private metricsCache: Map<string, FeatureFlagMetrics[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private readonly metricsRetentionHours = 24 * 7; // 7 days

  /**
   * Initialize the monitoring service
   */
  async initialize(): Promise<void> {
    // Load alert rules from database
    await this.loadAlertRules();
    
    // Load active alerts from database
    await this.loadActiveAlerts();
    
    // Start monitoring
    this.startMonitoring();
    
    console.log('🔍 [MONITORING] Feature flag monitoring service initialized');
  }

  /**
   * Start the monitoring process
   */
  private startMonitoring(): void {
    // Collect metrics every minute
    this.monitoringInterval = setInterval(async () => {
      await this.collectAllMetrics();
      await this.evaluateAlertRules();
    }, 60 * 1000);
    
    console.log('🔍 [MONITORING] Started monitoring interval');
  }

  /**
   * Stop the monitoring process
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🔍 [MONITORING] Stopped monitoring interval');
    }
  }

  /**
   * Collect metrics for all feature flags
   */
  private async collectAllMetrics(): Promise<void> {
    try {
      const flags = await this.db.getAllFlags();
      
      for (const flag of flags) {
        const metrics = await this.collectFlagMetrics(flag.id);
        await this.storeMetrics(metrics);
      }
      
      // Clean up old metrics
      await this.cleanupOldMetrics();
    } catch (error) {
      console.error('🔍 [MONITORING] Failed to collect metrics:', error);
    }
  }

  /**
   * Collect metrics for a specific feature flag
   */
  async collectFlagMetrics(flagId: string): Promise<FeatureFlagMetrics> {
    try {
      const flag = await this.db.getFlagById(flagId);
      if (!flag) {
        throw new Error(`Feature flag with ID ${flagId} not found`);
      }

      // Get evaluation statistics
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 60 * 1000); // Last minute
      
      const stats = await this.db.getFlagStats(flagId, { start: startTime, end: endTime });
      
      // Get system metrics
      const systemMetrics = await this.getSystemMetrics();
      
      // Calculate metrics
      const totalEvaluations = stats.totalEvaluations;
      const enabledEvaluations = stats.enabledEvaluations;
      const disabledEvaluations = totalEvaluations - enabledEvaluations;
      const errorRate = totalEvaluations > 0 
        ? ((totalEvaluations - enabledEvaluations) / totalEvaluations) * 100 
        : 0;
      
      // Mock response time metrics (in a real implementation, this would come from APM)
      const avgResponseTime = 150 + Math.random() * 100;
      const p95ResponseTime = avgResponseTime * 1.5 + Math.random() * 50;
      const p99ResponseTime = avgResponseTime * 2 + Math.random() * 100;
      
      // Calculate throughput (evaluations per second)
      const throughput = totalEvaluations / 60;
      
      // Process user segment stats
      const userSegmentStats: Record<string, any> = {};
      Object.entries(stats.userSegmentStats).forEach(([segment, segmentStats]) => {
        userSegmentStats[segment] = {
          total: segmentStats.total,
          enabled: segmentStats.enabled,
          disabled: segmentStats.total - segmentStats.enabled,
          errorRate: segmentStats.total > 0 
            ? ((segmentStats.total - segmentStats.enabled) / segmentStats.total) * 100 
            : 0
        };
      });
      
      const metrics: FeatureFlagMetrics = {
        flagId,
        flagKey: flag.id,
        timestamp: new Date(),
        totalEvaluations,
        enabledEvaluations,
        disabledEvaluations,
        errorRate,
        avgResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        throughput,
        userSegmentStats,
        systemMetrics
      };
      
      return metrics;
    } catch (error) {
      console.error(`🔍 [MONITORING] Failed to collect metrics for flag ${flagId}:`, error);
      
      // Return default metrics
      return {
        flagId,
        flagKey: flagId,
        timestamp: new Date(),
        totalEvaluations: 0,
        enabledEvaluations: 0,
        disabledEvaluations: 0,
        errorRate: 0,
        avgResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        throughput: 0,
        userSegmentStats: {},
        systemMetrics: {
          cpuUsage: 0,
          memoryUsage: 0,
          diskUsage: 0,
          networkIO: 0
        }
      };
    }
  }

  /**
   * Store metrics in cache and database
   */
  private async storeMetrics(metrics: FeatureFlagMetrics): Promise<void> {
    // Store in cache
    if (!this.metricsCache.has(metrics.flagId)) {
      this.metricsCache.set(metrics.flagId, []);
    }
    
    const flagMetrics = this.metricsCache.get(metrics.flagId)!;
    flagMetrics.push(metrics);
    
    // Keep only recent metrics in cache
    const cutoffTime = new Date(Date.now() - this.metricsRetentionHours * 60 * 60 * 1000);
    const filteredMetrics = flagMetrics.filter(m => m.timestamp > cutoffTime);
    this.metricsCache.set(metrics.flagId, filteredMetrics);
    
    // In a real implementation, also store to database
    // await this.db.storeMetrics(metrics);
  }

  /**
   * Clean up old metrics
   */
  private async cleanupOldMetrics(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.metricsRetentionHours * 60 * 60 * 1000);
    
    for (const [flagId, metrics] of this.metricsCache.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoffTime);
      this.metricsCache.set(flagId, filteredMetrics);
    }
  }

  /**
   * Get system metrics (mock implementation)
   */
  private async getSystemMetrics(): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkIO: number;
  }> {
    // In a real implementation, this would query system monitoring tools
    return {
      cpuUsage: 20 + Math.random() * 30, // 20-50%
      memoryUsage: 30 + Math.random() * 40, // 30-70%
      diskUsage: 10 + Math.random() * 20, // 10-30%
      networkIO: Math.random() * 100 // 0-100 MB/s
    };
  }

  /**
   * Load alert rules from database
   */
  private async loadAlertRules(): Promise<void> {
    try {
      // In a real implementation, load from database
      // const rules = await this.db.getAlertRules();
      
      // For now, create default rules
      const defaultRules: AlertRule[] = [
        {
          id: 'high_error_rate',
          name: 'High Error Rate',
          description: 'Alert when error rate exceeds threshold',
          metric: 'error_rate',
          operator: 'greater_than',
          threshold: 10,
          severity: 'warning',
          enabled: true,
          cooldownMinutes: 15,
          notificationChannels: ['email', 'slack'],
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'critical_error_rate',
          name: 'Critical Error Rate',
          description: 'Alert when error rate is critical',
          metric: 'error_rate',
          operator: 'greater_than',
          threshold: 25,
          severity: 'critical',
          enabled: true,
          cooldownMinutes: 5,
          notificationChannels: ['email', 'slack', 'sms'],
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'high_response_time',
          name: 'High Response Time',
          description: 'Alert when response time exceeds threshold',
          metric: 'response_time',
          operator: 'greater_than',
          threshold: 2000,
          severity: 'warning',
          enabled: true,
          cooldownMinutes: 15,
          notificationChannels: ['email'],
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'high_cpu_usage',
          name: 'High CPU Usage',
          description: 'Alert when CPU usage exceeds threshold',
          metric: 'cpu_usage',
          operator: 'greater_than',
          threshold: 80,
          severity: 'warning',
          enabled: true,
          cooldownMinutes: 10,
          notificationChannels: ['email'],
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      defaultRules.forEach(rule => {
        this.alertRules.set(rule.id, rule);
      });
      
      console.log(`🔍 [MONITORING] Loaded ${defaultRules.length} alert rules`);
    } catch (error) {
      console.error('🔍 [MONITORING] Failed to load alert rules:', error);
    }
  }

  /**
   * Load active alerts from database
   */
  private async loadActiveAlerts(): Promise<void> {
    try {
      // In a real implementation, load from database
      // const alerts = await this.db.getActiveAlerts();
      
      console.log('🔍 [MONITORING] Loaded active alerts');
    } catch (error) {
      console.error('🔍 [MONITORING] Failed to load active alerts:', error);
    }
  }

  /**
   * Evaluate all alert rules
   */
  private async evaluateAlertRules(): Promise<void> {
    try {
      for (const rule of this.alertRules.values()) {
        if (!rule.enabled) continue;
        
        await this.evaluateAlertRule(rule);
      }
    } catch (error) {
      console.error('🔍 [MONITORING] Failed to evaluate alert rules:', error);
    }
  }

  /**
   * Evaluate a specific alert rule
   */
  private async evaluateAlertRule(rule: AlertRule): Promise<void> {
    try {
      // Get relevant metrics
      const metrics = await this.getMetricsForRule(rule);
      
      for (const metric of metrics) {
        const currentValue = this.getMetricValue(metric, rule.metric);
        const isTriggered = this.evaluateCondition(currentValue, rule.operator, rule.threshold);
        
        if (isTriggered) {
          await this.triggerAlert(rule, metric, currentValue);
        } else {
          await this.checkAlertResolution(rule, metric);
        }
      }
    } catch (error) {
      console.error(`🔍 [MONITORING] Failed to evaluate alert rule ${rule.id}:`, error);
    }
  }

  /**
   * Get metrics relevant to an alert rule
   */
  private async getMetricsForRule(rule: AlertRule): Promise<FeatureFlagMetrics[]> {
    if (rule.flagId) {
      // Get metrics for specific flag
      const flagMetrics = this.metricsCache.get(rule.flagId) || [];
      return flagMetrics.length > 0 ? [flagMetrics[flagMetrics.length - 1]] : [];
    } else {
      // Get latest metrics for all flags
      const allMetrics: FeatureFlagMetrics[] = [];
      
      for (const metrics of this.metricsCache.values()) {
        if (metrics.length > 0) {
          allMetrics.push(metrics[metrics.length - 1]);
        }
      }
      
      return allMetrics;
    }
  }

  /**
   * Get a specific metric value from metrics
   */
  private getMetricValue(metrics: FeatureFlagMetrics, metric: AlertMetric): number {
    switch (metric) {
      case 'error_rate':
        return metrics.errorRate;
      case 'response_time':
        return metrics.avgResponseTime;
      case 'throughput':
        return metrics.throughput;
      case 'cpu_usage':
        return metrics.systemMetrics.cpuUsage;
      case 'memory_usage':
        return metrics.systemMetrics.memoryUsage;
      case 'disk_usage':
        return metrics.systemMetrics.diskUsage;
      case 'network_io':
        return metrics.systemMetrics.networkIO;
      case 'evaluation_count':
        return metrics.totalEvaluations;
      case 'enabled_percentage':
        return metrics.totalEvaluations > 0 
          ? (metrics.enabledEvaluations / metrics.totalEvaluations) * 100 
          : 0;
      default:
        return 0;
    }
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    currentValue: number, 
    operator: AlertOperator, 
    threshold: number
  ): boolean {
    switch (operator) {
      case 'greater_than':
        return currentValue > threshold;
      case 'less_than':
        return currentValue < threshold;
      case 'equals':
        return currentValue === threshold;
      case 'not_equals':
        return currentValue !== threshold;
      case 'greater_than_or_equal':
        return currentValue >= threshold;
      case 'less_than_or_equal':
        return currentValue <= threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(
    rule: AlertRule, 
    metrics: FeatureFlagMetrics, 
    currentValue: number
  ): Promise<void> {
    try {
      const alertId = `${rule.id}_${metrics.flagId}_${Date.now()}`;
      
      // Check if alert is already active
      const existingAlertKey = `${rule.id}_${metrics.flagId}`;
      if (this.activeAlerts.has(existingAlertKey)) {
        return; // Alert already active
      }
      
      // Create alert
      const alert: Alert = {
        id: alertId,
        ruleId: rule.id,
        ruleName: rule.name,
        flagId: metrics.flagId,
        flagKey: metrics.flagKey,
        metric: rule.metric,
        currentValue,
        threshold: rule.threshold,
        severity: rule.severity,
        status: 'active',
        message: this.createAlertMessage(rule, metrics, currentValue),
        triggeredAt: new Date(),
        notificationsSent: []
      };
      
      // Store alert
      this.activeAlerts.set(existingAlertKey, alert);
      
      // Send notifications
      await this.sendAlertNotifications(alert, rule);
      
      // Log to audit
      await this.auditLog.logFlagChange({
        flagId: metrics.flagId,
        flagKey: metrics.flagKey,
        action: 'UPDATED',
        oldValue: null,
        newValue: { alert: alert.message },
        performedBy: 'monitoring_system',
        reason: 'Alert triggered'
      });
      
      console.log(`🔍 [MONITORING] Alert triggered: ${alert.message}`);
    } catch (error) {
      console.error('🔍 [MONITORING] Failed to trigger alert:', error);
    }
  }

  /**
   * Check if an alert should be resolved
   */
  private async checkAlertResolution(rule: AlertRule, metrics: FeatureFlagMetrics): Promise<void> {
    try {
      const alertKey = `${rule.id}_${metrics.flagId}`;
      const alert = this.activeAlerts.get(alertKey);
      
      if (!alert || alert.status !== 'active') {
        return; // No active alert
      }
      
      const currentValue = this.getMetricValue(metrics, rule.metric);
      const isTriggered = this.evaluateCondition(currentValue, rule.operator, rule.threshold);
      
      if (!isTriggered) {
        // Resolve alert
        alert.status = 'resolved';
        alert.resolvedAt = new Date();
        alert.resolvedBy = 'monitoring_system';
        
        // Log to audit
        await this.auditLog.logFlagChange({
          flagId: metrics.flagId,
          flagKey: metrics.flagKey,
          action: 'UPDATED',
          oldValue: null,
          newValue: { alert: `Alert resolved: ${alert.message}` },
          performedBy: 'monitoring_system',
          reason: 'Alert automatically resolved'
        });
        
        // Remove from active alerts
        this.activeAlerts.delete(alertKey);
        
        console.log(`🔍 [MONITORING] Alert resolved: ${alert.message}`);
      }
    } catch (error) {
      console.error('🔍 [MONITORING] Failed to check alert resolution:', error);
    }
  }

  /**
   * Create an alert message
   */
  private createAlertMessage(
    rule: AlertRule, 
    metrics: FeatureFlagMetrics, 
    currentValue: number
  ): string {
    const { metric, threshold, operator } = rule;
    
    let operatorText = '';
    switch (operator) {
      case 'greater_than':
        operatorText = '>';
        break;
      case 'less_than':
        operatorText = '<';
        break;
      case 'equals':
        operatorText = '=';
        break;
      case 'not_equals':
        operatorText = '!=';
        break;
      case 'greater_than_or_equal':
        operatorText = '>=';
        break;
      case 'less_than_or_equal':
        operatorText = '<=';
        break;
    }
    
    return `${rule.name}: ${metric} is ${currentValue.toFixed(2)}, which is ${operatorText} threshold of ${threshold}`;
  }

  /**
   * Send alert notifications
   */
  private async sendAlertNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    try {
      for (const channel of rule.notificationChannels) {
        await this.sendNotification(alert, channel);
        alert.notificationsSent.push(channel);
      }
    } catch (error) {
      console.error('🔍 [MONITORING] Failed to send alert notifications:', error);
    }
  }

  /**
   * Send notification to a specific channel
   */
  private async sendNotification(alert: Alert, channel: string): Promise<void> {
    try {
      switch (channel) {
        case 'email':
          await this.sendEmailNotification(alert);
          break;
        case 'slack':
          await this.sendSlackNotification(alert);
          break;
        case 'sms':
          await this.sendSMSNotification(alert);
          break;
        default:
          console.log(`🔍 [MONITORING] Unknown notification channel: ${channel}`);
      }
    } catch (error) {
      console.error(`🔍 [MONITORING] Failed to send ${channel} notification:`, error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: Alert): Promise<void> {
    // In a real implementation, send email
    console.log(`🔍 [MONITORING] Email notification sent: ${alert.message}`);
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: Alert): Promise<void> {
    // In a real implementation, send Slack message
    console.log(`🔍 [MONITORING] Slack notification sent: ${alert.message}`);
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(alert: Alert): Promise<void> {
    // In a real implementation, send SMS
    console.log(`🔍 [MONITORING] SMS notification sent: ${alert.message}`);
  }

  /**
   * Get metrics for a specific flag
   */
  async getFlagMetrics(flagId: string, hours: number = 1): Promise<FeatureFlagMetrics[]> {
    const flagMetrics = this.metricsCache.get(flagId) || [];
    
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return flagMetrics.filter(m => m.timestamp > cutoffTime);
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get monitoring dashboard data
   */
  async getMonitoringDashboard(): Promise<MonitoringDashboard> {
    try {
      const flags = await this.db.getAllFlags();
      
      // Calculate overview metrics
      const totalFlags = flags.length;
      const enabledFlags = flags.filter(f => f.enabled).length;
      const flagsInRollout = flags.filter(f => f.enabled && f.rolloutPercentage > 0 && f.rolloutPercentage < 100).length;
      
      // Get latest metrics for all flags
      let totalEvaluations = 0;
      let totalResponseTime = 0;
      let totalErrorRate = 0;
      let metricsCount = 0;
      
      for (const flag of flags) {
        const flagMetrics = this.metricsCache.get(flag.id);
        if (flagMetrics && flagMetrics.length > 0) {
          const latestMetrics = flagMetrics[flagMetrics.length - 1];
          totalEvaluations += latestMetrics.totalEvaluations;
          totalResponseTime += latestMetrics.avgResponseTime;
          totalErrorRate += latestMetrics.errorRate;
          metricsCount++;
        }
      }
      
      const avgResponseTime = metricsCount > 0 ? totalResponseTime / metricsCount : 0;
      const avgErrorRate = metricsCount > 0 ? totalErrorRate / metricsCount : 0;
      
      // Get latest system metrics
      const systemMetrics = await this.getSystemMetrics();
      
      // Determine system health status
      let systemHealthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (systemMetrics.cpuUsage > 80 || systemMetrics.memoryUsage > 85 || avgErrorRate > 10) {
        systemHealthStatus = 'critical';
      } else if (systemMetrics.cpuUsage > 60 || systemMetrics.memoryUsage > 70 || avgErrorRate > 5) {
        systemHealthStatus = 'warning';
      }
      
      // Get all flag metrics
      const allFlagMetrics: FeatureFlagMetrics[] = [];
      for (const flag of flags) {
        const flagMetrics = this.metricsCache.get(flag.id);
        if (flagMetrics && flagMetrics.length > 0) {
          allFlagMetrics.push(flagMetrics[flagMetrics.length - 1]);
        }
      }
      
      return {
        overview: {
          totalFlags,
          enabledFlags,
          flagsInRollout,
          totalEvaluations,
          avgResponseTime,
          errorRate: avgErrorRate,
          activeAlerts: this.activeAlerts.size
        },
        flagMetrics: allFlagMetrics,
        alerts: Array.from(this.activeAlerts.values()),
        systemHealth: {
          status: systemHealthStatus,
          ...systemMetrics
        }
      };
    } catch (error) {
      console.error('🔍 [MONITORING] Failed to get monitoring dashboard:', error);
      
      // Return default dashboard
      return {
        overview: {
          totalFlags: 0,
          enabledFlags: 0,
          flagsInRollout: 0,
          totalEvaluations: 0,
          avgResponseTime: 0,
          errorRate: 0,
          activeAlerts: 0
        },
        flagMetrics: [],
        alerts: [],
        systemHealth: {
          status: 'healthy',
          cpuUsage: 0,
          memoryUsage: 0,
          diskUsage: 0,
          networkIO: 0
        }
      };
    }
  }

  /**
   * Create a new alert rule
   */
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const newRule: AlertRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.alertRules.set(newRule.id, newRule);
    
    // In a real implementation, save to database
    // await this.db.createAlertRule(newRule);
    
    console.log(`🔍 [MONITORING] Created alert rule: ${newRule.id}`);
    
    return newRule;
  }

  /**
   * Update an alert rule
   */
  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error(`Alert rule with ID ${ruleId} not found`);
    }
    
    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date()
    };
    
    this.alertRules.set(ruleId, updatedRule);
    
    // In a real implementation, update in database
    // await this.db.updateAlertRule(ruleId, updates);
    
    console.log(`🔍 [MONITORING] Updated alert rule: ${ruleId}`);
    
    return updatedRule;
  }

  /**
   * Delete an alert rule
   */
  async deleteAlertRule(ruleId: string): Promise<void> {
    if (!this.alertRules.has(ruleId)) {
      throw new Error(`Alert rule with ID ${ruleId} not found`);
    }
    
    this.alertRules.delete(ruleId);
    
    // In a real implementation, delete from database
    // await this.db.deleteAlertRule(ruleId);
    
    console.log(`🔍 [MONITORING] Deleted alert rule: ${ruleId}`);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.id === alertId) {
        alert.status = 'acknowledged';
        alert.acknowledgedAt = new Date();
        alert.acknowledgedBy = userId;
        
        // In a real implementation, update in database
        // await this.db.updateAlert(alertId, { status: 'acknowledged', acknowledgedAt: new Date(), acknowledgedBy: userId });
        
        console.log(`🔍 [MONITORING] Alert acknowledged: ${alertId}`);
        return;
      }
    }
    
    throw new Error(`Alert with ID ${alertId} not found`);
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string): Promise<void> {
    for (const [key, alert] of this.activeAlerts.entries()) {
      if (alert.id === alertId) {
        alert.status = 'resolved';
        alert.resolvedAt = new Date();
        alert.resolvedBy = userId;
        
        // Remove from active alerts
        this.activeAlerts.delete(key);
        
        // In a real implementation, update in database
        // await this.db.updateAlert(alertId, { status: 'resolved', resolvedAt: new Date(), resolvedBy: userId });
        
        console.log(`🔍 [MONITORING] Alert resolved: ${alertId}`);
        return;
      }
    }
    
    throw new Error(`Alert with ID ${alertId} not found`);
  }
}

// Export singleton instance
export const featureFlagMonitoringService = new FeatureFlagMonitoringService();