/**
 * Alert Manager
 * Monitors error rates and triggers alerts when thresholds are exceeded
 */

import { apiHealthMonitor, type EndpointMetrics, type SystemHealthMetrics } from '@/lib/monitoring/api-health-monitor';
import { getCircuitBreakerStats } from '@/lib/caching/circuit-breaker';
import { getDatabaseStatus } from '@/lib/database/database-monitor';

export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertStatus = 'active' | 'resolved' | 'acknowledged' | 'suppressed';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  enabled: boolean;
  condition: AlertCondition;
  threshold: AlertThreshold;
  cooldownMs: number;
  notificationChannels: string[];
  tags: Record<string, string>;
}

export interface AlertCondition {
  type: 'error_rate' | 'response_time' | 'availability' | 'database_health' | 'circuit_breaker' | 'custom';
  target: string; // endpoint, database, circuit breaker name, etc.
  timeWindow: number; // in milliseconds
  evaluationInterval: number; // in milliseconds
}

export interface AlertThreshold {
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  unit: 'percent' | 'milliseconds' | 'count' | 'ratio';
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  details: Record<string, any>;
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  suppressedUntil?: Date;
  notificationsSent: string[];
  tags: Record<string, string>;
}

export interface AlertNotification {
  alertId: string;
  channel: string;
  message: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export type AlertEvaluator = (rule: AlertRule) => Promise<{ triggered: boolean; value: number; details: Record<string, any> }>;
export type AlertNotifier = (alert: Alert, rule: AlertRule) => Promise<{ success: boolean; error?: string }>;

/**
 * Pre-defined alert rules for common scenarios
 */
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'high_error_rate',
    name: 'High Error Rate',
    description: 'Alert when endpoint error rate exceeds 5% over 5 minutes',
    severity: 'critical',
    enabled: true,
    condition: {
      type: 'error_rate',
      target: '*', // All endpoints
      timeWindow: 5 * 60 * 1000, // 5 minutes
      evaluationInterval: 60 * 1000 // 1 minute
    },
    threshold: {
      operator: '>',
      value: 5,
      unit: 'percent'
    },
    cooldownMs: 10 * 60 * 1000, // 10 minutes
    notificationChannels: ['console', 'log'],
    tags: { category: 'availability', priority: 'high' }
  },
  {
    id: 'very_high_error_rate',
    name: 'Very High Error Rate',
    description: 'Emergency alert when endpoint error rate exceeds 20% over 2 minutes',
    severity: 'emergency',
    enabled: true,
    condition: {
      type: 'error_rate',
      target: '*',
      timeWindow: 2 * 60 * 1000, // 2 minutes
      evaluationInterval: 30 * 1000 // 30 seconds
    },
    threshold: {
      operator: '>',
      value: 20,
      unit: 'percent'
    },
    cooldownMs: 5 * 60 * 1000, // 5 minutes
    notificationChannels: ['console', 'log'],
    tags: { category: 'availability', priority: 'emergency' }
  },
  {
    id: 'slow_response_time',
    name: 'Slow Response Time',
    description: 'Alert when average response time exceeds 2 seconds',
    severity: 'warning',
    enabled: true,
    condition: {
      type: 'response_time',
      target: '*',
      timeWindow: 5 * 60 * 1000, // 5 minutes
      evaluationInterval: 2 * 60 * 1000 // 2 minutes
    },
    threshold: {
      operator: '>',
      value: 2000,
      unit: 'milliseconds'
    },
    cooldownMs: 15 * 60 * 1000, // 15 minutes
    notificationChannels: ['console'],
    tags: { category: 'performance', priority: 'medium' }
  },
  {
    id: 'database_unhealthy',
    name: 'Database Unhealthy',
    description: 'Alert when database health is critical or offline',
    severity: 'critical',
    enabled: true,
    condition: {
      type: 'database_health',
      target: 'primary',
      timeWindow: 1 * 60 * 1000, // 1 minute
      evaluationInterval: 30 * 1000 // 30 seconds
    },
    threshold: {
      operator: '!=',
      value: 1, // 1 = healthy, 0 = unhealthy
      unit: 'count'
    },
    cooldownMs: 5 * 60 * 1000, // 5 minutes
    notificationChannels: ['console', 'log'],
    tags: { category: 'infrastructure', priority: 'high' }
  },
  {
    id: 'circuit_breaker_open',
    name: 'Circuit Breaker Open',
    description: 'Alert when circuit breaker opens',
    severity: 'warning',
    enabled: true,
    condition: {
      type: 'circuit_breaker',
      target: '*',
      timeWindow: 1 * 60 * 1000, // 1 minute
      evaluationInterval: 30 * 1000 // 30 seconds
    },
    threshold: {
      operator: '==',
      value: 1, // 1 = open, 0 = closed/half-open
      unit: 'count'
    },
    cooldownMs: 10 * 60 * 1000, // 10 minutes
    notificationChannels: ['console'],
    tags: { category: 'resilience', priority: 'medium' }
  }
];

/**
 * AlertManager class for monitoring and alerting
 */
export class AlertManager {
  private static instance: AlertManager;
  private rules = new Map<string, AlertRule>();
  private activeAlerts = new Map<string, Alert>();
  private alertHistory: Alert[] = [];
  private evaluators = new Map<string, AlertEvaluator>();
  private notifiers = new Map<string, AlertNotifier>();
  private evaluationTimers = new Map<string, NodeJS.Timeout>();
  private lastEvaluations = new Map<string, Date>();
  private notificationHistory: AlertNotification[] = [];

  private constructor() {
    this.setupDefaultEvaluators();
    this.setupDefaultNotifiers();
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  /**
   * Setup default alert evaluators
   */
  private setupDefaultEvaluators(): void {
    // Error rate evaluator
    this.evaluators.set('error_rate', async (rule: AlertRule) => {
      const metrics = apiHealthMonitor.getAllEndpointMetrics();
      const triggeredEndpoints: string[] = [];
      let maxErrorRate = 0;

      for (const [key, metric] of Object.entries(metrics)) {
        if (rule.condition.target === '*' || key.includes(rule.condition.target)) {
          const errorRate = 100 - metric.successRate;
          if (this.evaluateThreshold(errorRate, rule.threshold)) {
            triggeredEndpoints.push(key);
            maxErrorRate = Math.max(maxErrorRate, errorRate);
          }
        }
      }

      return {
        triggered: triggeredEndpoints.length > 0,
        value: maxErrorRate,
        details: {
          triggeredEndpoints,
          totalEndpoints: Object.keys(metrics).length,
          threshold: rule.threshold.value
        }
      };
    });

    // Response time evaluator
    this.evaluators.set('response_time', async (rule: AlertRule) => {
      const metrics = apiHealthMonitor.getAllEndpointMetrics();
      const slowEndpoints: string[] = [];
      let maxResponseTime = 0;

      for (const [key, metric] of Object.entries(metrics)) {
        if (rule.condition.target === '*' || key.includes(rule.condition.target)) {
          if (this.evaluateThreshold(metric.averageResponseTime, rule.threshold)) {
            slowEndpoints.push(key);
            maxResponseTime = Math.max(maxResponseTime, metric.averageResponseTime);
          }
        }
      }

      return {
        triggered: slowEndpoints.length > 0,
        value: maxResponseTime,
        details: {
          slowEndpoints,
          totalEndpoints: Object.keys(metrics).length,
          threshold: rule.threshold.value
        }
      };
    });

    // Database health evaluator
    this.evaluators.set('database_health', async (rule: AlertRule) => {
      try {
        const dbStatus = await getDatabaseStatus();
        const isHealthy = dbStatus.overall === 'healthy' ? 1 : 0;
        
        return {
          triggered: this.evaluateThreshold(isHealthy, rule.threshold),
          value: isHealthy,
          details: {
            status: dbStatus.overall,
            connectionStatus: dbStatus.connection.isConnected,
            queryValidation: dbStatus.queries.isValid,
            threshold: rule.threshold.value
          }
        };
      } catch (error) {
        return {
          triggered: true,
          value: 0,
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
            threshold: rule.threshold.value
          }
        };
      }
    });

    // Circuit breaker evaluator
    this.evaluators.set('circuit_breaker', async (rule: AlertRule) => {
      const circuitStats = getCircuitBreakerStats() as Record<string, any>;
      const openCircuits: string[] = [];

      for (const [name, stats] of Object.entries(circuitStats)) {
        if (rule.condition.target === '*' || name.includes(rule.condition.target)) {
          const isOpen = stats.state === 'OPEN' ? 1 : 0;
          if (this.evaluateThreshold(isOpen, rule.threshold)) {
            openCircuits.push(name);
          }
        }
      }

      return {
        triggered: openCircuits.length > 0,
        value: openCircuits.length,
        details: {
          openCircuits,
          totalCircuits: Object.keys(circuitStats).length,
          threshold: rule.threshold.value
        }
      };
    });
  }

  /**
   * Setup default alert notifiers
   */
  private setupDefaultNotifiers(): void {
    // Console notifier
    this.notifiers.set('console', async (alert: Alert, rule: AlertRule) => {
      const emoji = this.getSeverityEmoji(alert.severity);
      const message = `${emoji} [ALERT] ${alert.ruleName}: ${alert.message}`;
      
      console.log(message, {
        alertId: alert.id,
        severity: alert.severity,
        details: alert.details,
        triggeredAt: alert.triggeredAt.toISOString()
      });

      return { success: true };
    });

    // Log file notifier (simplified - would write to actual log file)
    this.notifiers.set('log', async (alert: Alert, rule: AlertRule) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: alert.severity.toUpperCase(),
        message: `ALERT: ${alert.ruleName} - ${alert.message}`,
        alertId: alert.id,
        ruleId: alert.ruleId,
        details: alert.details,
        tags: alert.tags
      };

      console.log(`📝 [ALERT-LOG] ${JSON.stringify(logEntry)}`);
      return { success: true };
    });
  }

  /**
   * Add or update an alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    
    if (rule.enabled) {
      this.startRuleEvaluation(rule);
    }
    
    console.log(`📋 [ALERT-MANAGER] Added alert rule: ${rule.name} (${rule.severity})`);
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    this.stopRuleEvaluation(ruleId);
    this.rules.delete(ruleId);
    
    console.log(`🗑️ [ALERT-MANAGER] Removed alert rule: ${rule.name}`);
    return true;
  }

  /**
   * Start evaluation for a rule
   */
  private startRuleEvaluation(rule: AlertRule): void {
    // Stop existing timer if any
    this.stopRuleEvaluation(rule.id);

    const timer = setInterval(async () => {
      await this.evaluateRule(rule);
    }, rule.condition.evaluationInterval);

    this.evaluationTimers.set(rule.id, timer);
    console.log(`⏰ [ALERT-MANAGER] Started evaluation for rule: ${rule.name} (every ${rule.condition.evaluationInterval}ms)`);
  }

  /**
   * Stop evaluation for a rule
   */
  private stopRuleEvaluation(ruleId: string): void {
    const timer = this.evaluationTimers.get(ruleId);
    if (timer) {
      clearInterval(timer);
      this.evaluationTimers.delete(ruleId);
    }
  }

  /**
   * Evaluate a single rule
   */
  private async evaluateRule(rule: AlertRule): Promise<void> {
    if (!rule.enabled) return;

    try {
      const evaluator = this.evaluators.get(rule.condition.type);
      if (!evaluator) {
        console.warn(`⚠️ [ALERT-MANAGER] No evaluator found for condition type: ${rule.condition.type}`);
        return;
      }

      const result = await evaluator(rule);
      const now = new Date();
      this.lastEvaluations.set(rule.id, now);

      if (result.triggered) {
        await this.handleTriggeredAlert(rule, result, now);
      } else {
        await this.handleResolvedAlert(rule, now);
      }

    } catch (error) {
      console.error(`❌ [ALERT-MANAGER] Error evaluating rule ${rule.name}:`, error);
    }
  }

  /**
   * Handle a triggered alert
   */
  private async handleTriggeredAlert(
    rule: AlertRule, 
    result: { triggered: boolean; value: number; details: Record<string, any> }, 
    timestamp: Date
  ): Promise<void> {
    const existingAlert = this.getActiveAlertForRule(rule.id);
    
    // Check cooldown period
    if (existingAlert && this.isInCooldown(existingAlert, rule.cooldownMs)) {
      return;
    }

    // Create new alert if none exists
    if (!existingAlert) {
      const alert: Alert = {
        id: this.generateAlertId(),
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        status: 'active',
        message: this.generateAlertMessage(rule, result),
        details: result.details,
        triggeredAt: timestamp,
        notificationsSent: [],
        tags: rule.tags
      };

      this.activeAlerts.set(alert.id, alert);
      this.alertHistory.push(alert);

      console.log(`🚨 [ALERT-MANAGER] Alert triggered: ${alert.ruleName} (${alert.severity})`);

      // Send notifications
      await this.sendNotifications(alert, rule);
    }
  }

  /**
   * Handle a resolved alert
   */
  private async handleResolvedAlert(rule: AlertRule, timestamp: Date): Promise<void> {
    const existingAlert = this.getActiveAlertForRule(rule.id);
    
    if (existingAlert && existingAlert.status === 'active') {
      existingAlert.status = 'resolved';
      existingAlert.resolvedAt = timestamp;
      
      this.activeAlerts.delete(existingAlert.id);
      
      console.log(`✅ [ALERT-MANAGER] Alert resolved: ${existingAlert.ruleName}`);

      // Send resolution notifications
      await this.sendResolutionNotifications(existingAlert, rule);
    }
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    for (const channel of rule.notificationChannels) {
      const notifier = this.notifiers.get(channel);
      if (!notifier) {
        console.warn(`⚠️ [ALERT-MANAGER] No notifier found for channel: ${channel}`);
        continue;
      }

      try {
        const result = await notifier(alert, rule);
        
        const notification: AlertNotification = {
          alertId: alert.id,
          channel,
          message: alert.message,
          timestamp: new Date(),
          success: result.success,
          error: result.error
        };

        this.notificationHistory.push(notification);
        alert.notificationsSent.push(channel);

        if (result.success) {
          console.log(`📤 [ALERT-MANAGER] Notification sent via ${channel} for alert: ${alert.ruleName}`);
        } else {
          console.error(`📤 [ALERT-MANAGER] Failed to send notification via ${channel}:`, result.error);
        }

      } catch (error) {
        console.error(`❌ [ALERT-MANAGER] Error sending notification via ${channel}:`, error);
      }
    }
  }

  /**
   * Send resolution notifications
   */
  private async sendResolutionNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    const resolutionMessage = `RESOLVED: ${alert.ruleName} - Alert has been resolved`;
    
    for (const channel of rule.notificationChannels) {
      const notifier = this.notifiers.get(channel);
      if (!notifier) continue;

      try {
        const resolvedAlert = { ...alert, message: resolutionMessage };
        await notifier(resolvedAlert, rule);
        console.log(`📤 [ALERT-MANAGER] Resolution notification sent via ${channel} for alert: ${alert.ruleName}`);
      } catch (error) {
        console.error(`❌ [ALERT-MANAGER] Error sending resolution notification via ${channel}:`, error);
      }
    }
  }

  /**
   * Evaluate threshold condition
   */
  private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case '>': return value > threshold.value;
      case '<': return value < threshold.value;
      case '>=': return value >= threshold.value;
      case '<=': return value <= threshold.value;
      case '==': return value === threshold.value;
      case '!=': return value !== threshold.value;
      default: return false;
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, result: { value: number; details: Record<string, any> }): string {
    const unit = rule.threshold.unit === 'percent' ? '%' : rule.threshold.unit;
    return `${rule.description} - Current value: ${result.value}${unit}, Threshold: ${rule.threshold.operator} ${rule.threshold.value}${unit}`;
  }

  /**
   * Get active alert for a rule
   */
  private getActiveAlertForRule(ruleId: string): Alert | undefined {
    return Array.from(this.activeAlerts.values()).find(alert => alert.ruleId === ruleId);
  }

  /**
   * Check if alert is in cooldown period
   */
  private isInCooldown(alert: Alert, cooldownMs: number): boolean {
    return Date.now() - alert.triggeredAt.getTime() < cooldownMs;
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get severity emoji
   */
  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      case 'emergency': return '🆘';
      default: return '📢';
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): Alert[] {
    const history = [...this.alertHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): {
    totalRules: number;
    enabledRules: number;
    activeAlerts: number;
    alertsBySeverity: Record<AlertSeverity, number>;
    alertsLast24h: number;
    notificationsSent: number;
  } {
    const activeAlerts = this.getActiveAlerts();
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentAlerts = this.alertHistory.filter(a => a.triggeredAt.getTime() > last24h);

    const alertsBySeverity = activeAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<AlertSeverity, number>);

    return {
      totalRules: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length,
      activeAlerts: activeAlerts.length,
      alertsBySeverity,
      alertsLast24h: recentAlerts.length,
      notificationsSent: this.notificationHistory.length
    };
  }

  /**
   * Start monitoring with default rules
   */
  startMonitoring(): void {
    console.log(`🚀 [ALERT-MANAGER] Starting alert monitoring...`);
    
    // Add default rules
    DEFAULT_ALERT_RULES.forEach(rule => {
      this.addRule(rule);
    });

    console.log(`✅ [ALERT-MANAGER] Alert monitoring started with ${DEFAULT_ALERT_RULES.length} rules`);
  }

  /**
   * Stop all monitoring
   */
  stopMonitoring(): void {
    this.evaluationTimers.forEach((timer, ruleId) => {
      clearInterval(timer);
    });
    this.evaluationTimers.clear();
    
    console.log(`🛑 [ALERT-MANAGER] Alert monitoring stopped`);
  }

  /**
   * Add custom evaluator
   */
  addEvaluator(type: string, evaluator: AlertEvaluator): void {
    this.evaluators.set(type, evaluator);
    console.log(`🔧 [ALERT-MANAGER] Added custom evaluator: ${type}`);
  }

  /**
   * Add custom notifier
   */
  addNotifier(channel: string, notifier: AlertNotifier): void {
    this.notifiers.set(channel, notifier);
    console.log(`📢 [ALERT-MANAGER] Added custom notifier: ${channel}`);
  }
}

// Export singleton instance
export const alertManager = AlertManager.getInstance();

/**
 * Utility functions
 */
export function startAlerting(): void {
  alertManager.startMonitoring();
}

export function stopAlerting(): void {
  alertManager.stopMonitoring();
}

export function getActiveAlerts(): Alert[] {
  return alertManager.getActiveAlerts();
}

export function getAlertStats() {
  return alertManager.getAlertStats();
}