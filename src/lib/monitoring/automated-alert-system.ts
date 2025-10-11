/**
 * Automated Alert Notification System
 * Integrates with all monitoring systems to provide unified alerting
 */

import { alertConfigManager } from './alert-config';
import { alertNotifier, type NotificationMessage } from './alert-notifier';
import { aiSearchMonitor, type AISearchAlert } from './ai-search-monitor';
import { alertManager } from './alert-manager';
import { databaseMonitor, type DatabaseAlert } from './database-monitor';
import { aiServiceMonitor, type AIServiceAlert } from './ai-service-monitor';
import { systemResourceMonitor, type ResourceAlert } from './system-resource-monitor';
import { userExperienceMonitor, type UserExperienceAlert } from './user-experience-monitor';
import { businessMetricsMonitor, type BusinessAlert } from './business-metrics-monitor';

export interface UnifiedAlert {
  id: string;
  source: 'ai_search' | 'alert_manager' | 'database' | 'ai_service' | 'system_resource' | 'user_experience' | 'business_metrics';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  context: Record<string, any>;
  recommendations: string[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  escalationLevel: number;
  tags: Record<string, string>;
}

export interface AlertEscalationPolicy {
  id: string;
  name: string;
  description: string;
  conditions: {
    severity: UnifiedAlert['severity'][];
    source?: string[];
    metric?: string[];
    duration?: number; // minutes
  };
  actions: Array<{
    type: 'notify' | 'escalate' | 'run_script' | 'create_ticket';
    config: Record<string, any>;
    delay?: number; // minutes
  }>;
  enabled: boolean;
}

export interface AlertDigest {
  id: string;
  type: 'hourly' | 'daily' | 'weekly';
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsBySource: Record<string, number>;
    topIssues: Array<{
      title: string;
      count: number;
      source: string;
    }>;
  };
  alerts: UnifiedAlert[];
  recipients: string[];
  sent: boolean;
  sentAt?: Date;
}

/**
 * Automated Alert System Class
 */
export class AutomatedAlertSystem {
  private static instance: AutomatedAlertSystem;
  private alerts: UnifiedAlert[] = [];
  private escalationPolicies: AlertEscalationPolicy[] = [];
  private digests: AlertDigest[] = [];
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private alertSubscribers: Map<string, (alert: UnifiedAlert) => void> = new Map();
  private maxAlerts = 10000;
  private maxDigests = 1000;

  private constructor() {
    this.initializeEscalationPolicies();
    this.startAlertMonitoring();
    this.startDigestGeneration();
  }

  static getInstance(): AutomatedAlertSystem {
    if (!AutomatedAlertSystem.instance) {
      AutomatedAlertSystem.instance = new AutomatedAlertSystem();
    }
    return AutomatedAlertSystem.instance;
  }

  /**
   * Initialize default escalation policies
   */
  private initializeEscalationPolicies(): void {
    // Emergency escalation policy
    this.escalationPolicies.push({
      id: 'emergency_escalation',
      name: 'Emergency Alert Escalation',
      description: 'Immediate escalation for emergency alerts',
      conditions: {
        severity: ['emergency'],
        duration: 0
      },
      actions: [
        {
          type: 'notify',
          config: {
            channels: ['email', 'slack', 'sms'],
            recipients: ['oncall', 'manager', 'executive']
          }
        },
        {
          type: 'create_ticket',
          config: {
            priority: 'critical',
            assignee: 'oncall'
          }
        }
      ],
      enabled: true
    });

    // Critical escalation policy
    this.escalationPolicies.push({
      id: 'critical_escalation',
      name: 'Critical Alert Escalation',
      description: 'Escalation for critical alerts after 15 minutes',
      conditions: {
        severity: ['critical'],
        duration: 15
      },
      actions: [
        {
          type: 'notify',
          config: {
            channels: ['email', 'slack'],
            recipients: ['oncall', 'manager']
          },
          delay: 15
        },
        {
          type: 'create_ticket',
          config: {
            priority: 'high',
            assignee: 'oncall'
          }
        }
      ],
      enabled: true
    });

    // Warning escalation policy
    this.escalationPolicies.push({
      id: 'warning_escalation',
      name: 'Warning Alert Escalation',
      description: 'Escalation for warning alerts after 1 hour',
      conditions: {
        severity: ['warning'],
        duration: 60
      },
      actions: [
        {
          type: 'notify',
          config: {
            channels: ['email'],
            recipients: ['oncall']
          },
          delay: 60
        }
      ],
      enabled: true
    });

    // Business metrics escalation policy
    this.escalationPolicies.push({
      id: 'business_escalation',
      name: 'Business Metrics Escalation',
      description: 'Escalation for business metric alerts',
      conditions: {
        severity: ['critical', 'warning'],
        source: ['business_metrics'],
        duration: 30
      },
      actions: [
        {
          type: 'notify',
          config: {
            channels: ['email', 'slack'],
            recipients: ['manager', 'business_team']
          },
          delay: 30
        }
      ],
      enabled: true
    });

    console.log(`✅ [AUTOMATED-ALERT-SYSTEM] Initialized ${this.escalationPolicies.length} escalation policies`);
  }

  /**
   * Start monitoring all alert sources
   */
  private startAlertMonitoring(): void {
    // Monitor AI Search alerts
    const aiSearchInterval = setInterval(() => {
      this.processAISearchAlerts();
    }, 30000); // Every 30 seconds
    this.monitoringIntervals.set('ai_search', aiSearchInterval);

    // Monitor Alert Manager alerts
    const alertManagerInterval = setInterval(() => {
      this.processAlertManagerAlerts();
    }, 30000);
    this.monitoringIntervals.set('alert_manager', alertManagerInterval);

    // Monitor Database alerts
    const databaseInterval = setInterval(() => {
      this.processDatabaseAlerts();
    }, 60000); // Every minute
    this.monitoringIntervals.set('database', databaseInterval);

    // Monitor AI Service alerts
    const aiServiceInterval = setInterval(() => {
      this.processAIServiceAlerts();
    }, 30000);
    this.monitoringIntervals.set('ai_service', aiServiceInterval);

    // Monitor System Resource alerts
    const systemResourceInterval = setInterval(() => {
      this.processSystemResourceAlerts();
    }, 30000);
    this.monitoringIntervals.set('system_resource', systemResourceInterval);

    // Monitor User Experience alerts
    const userExperienceInterval = setInterval(() => {
      this.processUserExperienceAlerts();
    }, 60000);
    this.monitoringIntervals.set('user_experience', userExperienceInterval);

    // Monitor Business Metrics alerts
    const businessMetricsInterval = setInterval(() => {
      this.processBusinessMetricsAlerts();
    }, 60000);
    this.monitoringIntervals.set('business_metrics', businessMetricsInterval);

    console.log('✅ [AUTOMATED-ALERT-SYSTEM] Started monitoring all alert sources');
  }

  /**
   * Start digest generation
   */
  private startDigestGeneration(): void {
    // Hourly digest
    const hourlyDigestInterval = setInterval(() => {
      this.generateDigest('hourly');
    }, 60 * 60 * 1000); // Every hour

    // Daily digest
    const dailyDigestInterval = setInterval(() => {
      this.generateDigest('daily');
    }, 24 * 60 * 60 * 1000); // Every day

    // Weekly digest
    const weeklyDigestInterval = setInterval(() => {
      this.generateDigest('weekly');
    }, 7 * 24 * 60 * 60 * 1000); // Every week

    this.monitoringIntervals.set('digest_hourly', hourlyDigestInterval);
    this.monitoringIntervals.set('digest_daily', dailyDigestInterval);
    this.monitoringIntervals.set('digest_weekly', weeklyDigestInterval);

    console.log('✅ [AUTOMATED-ALERT-SYSTEM] Started digest generation');
  }

  /**
   * Process AI Search alerts
   */
  private processAISearchAlerts(): void {
    const aiSearchAlerts = aiSearchMonitor.getAlerts();
    
    aiSearchAlerts.forEach(alert => {
      const existingAlert = this.alerts.find(a => 
        a.source === 'ai_search' && 
        a.title === alert.title && 
        a.metric === alert.metric &&
        (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000 // 5 minutes
      );

      if (!existingAlert) {
        const unifiedAlert = this.convertAISearchAlert(alert);
        this.addAlert(unifiedAlert);
      }
    });
  }

  /**
   * Process Alert Manager alerts
   */
  private processAlertManagerAlerts(): void {
    const alertManagerAlerts = alertManager.getActiveAlerts();
    
    alertManagerAlerts.forEach(alert => {
      const existingAlert = this.alerts.find(a => 
        a.source === 'alert_manager' && 
        a.title === alert.ruleName && 
        a.metric === alert.metric &&
        (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000 // 5 minutes
      );

      if (!existingAlert) {
        const unifiedAlert = this.convertAlertManagerAlert(alert);
        this.addAlert(unifiedAlert);
      }
    });
  }

  /**
   * Process Database alerts
   */
  private processDatabaseAlerts(): void {
    const databaseAlerts = databaseMonitor.getAlerts();
    
    databaseAlerts.forEach(alert => {
      const existingAlert = this.alerts.find(a => 
        a.source === 'database' && 
        a.title === alert.title && 
        a.metric === alert.metric &&
        (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000 // 5 minutes
      );

      if (!existingAlert) {
        const unifiedAlert = this.convertDatabaseAlert(alert);
        this.addAlert(unifiedAlert);
      }
    });
  }

  /**
   * Process AI Service alerts
   */
  private processAIServiceAlerts(): void {
    const aiServiceAlerts = aiServiceMonitor.getAlerts();
    
    aiServiceAlerts.forEach(alert => {
      const existingAlert = this.alerts.find(a => 
        a.source === 'ai_service' && 
        a.title === alert.title && 
        a.metric === alert.metric &&
        (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000 // 5 minutes
      );

      if (!existingAlert) {
        const unifiedAlert = this.convertAIServiceAlert(alert);
        this.addAlert(unifiedAlert);
      }
    });
  }

  /**
   * Process System Resource alerts
   */
  private processSystemResourceAlerts(): void {
    const resourceAlerts = systemResourceMonitor.getAlerts();
    
    resourceAlerts.forEach(alert => {
      const existingAlert = this.alerts.find(a => 
        a.source === 'system_resource' && 
        a.title === alert.title && 
        a.metric === alert.metric &&
        (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000 // 5 minutes
      );

      if (!existingAlert) {
        const unifiedAlert = this.convertResourceAlert(alert);
        this.addAlert(unifiedAlert);
      }
    });
  }

  /**
   * Process User Experience alerts
   */
  private processUserExperienceAlerts(): void {
    const uxAlerts = userExperienceMonitor.getAlerts();
    
    uxAlerts.forEach(alert => {
      const existingAlert = this.alerts.find(a => 
        a.source === 'user_experience' && 
        a.title === alert.title && 
        a.metric === alert.metric &&
        (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000 // 5 minutes
      );

      if (!existingAlert) {
        const unifiedAlert = this.convertUserExperienceAlert(alert);
        this.addAlert(unifiedAlert);
      }
    });
  }

  /**
   * Process Business Metrics alerts
   */
  private processBusinessMetricsAlerts(): void {
    const businessAlerts = businessMetricsMonitor.getAlerts();
    
    businessAlerts.forEach(alert => {
      const existingAlert = this.alerts.find(a => 
        a.source === 'business_metrics' && 
        a.title === alert.title && 
        a.metric === alert.metric &&
        (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000 // 5 minutes
      );

      if (!existingAlert) {
        const unifiedAlert = this.convertBusinessAlert(alert);
        this.addAlert(unifiedAlert);
      }
    });
  }

  /**
   * Convert AI Search alert to unified alert
   */
  private convertAISearchAlert(alert: AISearchAlert): UnifiedAlert {
    return {
      id: `unified_${alert.id}`,
      source: 'ai_search',
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      timestamp: alert.timestamp,
      context: {
        provider: alert.affectedProviders?.join(', '),
        type: alert.type
      },
      recommendations: alert.recommendations,
      acknowledged: false,
      resolved: false,
      escalationLevel: 0,
      tags: {
        provider: alert.affectedProviders?.join(', ') || '',
        type: alert.type
      }
    };
  }

  /**
   * Convert Alert Manager alert to unified alert
   */
  private convertAlertManagerAlert(alert: any): UnifiedAlert {
    return {
      id: `unified_alertmgr_${alert.id}`,
      source: 'alert_manager',
      severity: alert.severity,
      title: alert.ruleName,
      message: alert.message,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      timestamp: alert.triggeredAt,
      context: {
        ruleId: alert.ruleId,
        details: alert.details
      },
      recommendations: [],
      acknowledged: alert.status === 'acknowledged',
      acknowledgedBy: alert.acknowledgedBy,
      acknowledgedAt: alert.acknowledgedAt,
      resolved: alert.status === 'resolved',
      resolvedBy: alert.resolvedBy,
      resolvedAt: alert.resolvedAt,
      escalationLevel: 0,
      tags: alert.tags || {}
    };
  }

  /**
   * Convert Database alert to unified alert
   */
  private convertDatabaseAlert(alert: DatabaseAlert): UnifiedAlert {
    return {
      id: `unified_db_${alert.id}`,
      source: 'database',
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      timestamp: alert.timestamp,
      context: {
        type: alert.type
      },
      recommendations: alert.recommendations,
      acknowledged: false,
      resolved: false,
      escalationLevel: 0,
      tags: {
        type: alert.type
      }
    };
  }

  /**
   * Convert AI Service alert to unified alert
   */
  private convertAIServiceAlert(alert: AIServiceAlert): UnifiedAlert {
    return {
      id: `unified_ai_${alert.id}`,
      source: 'ai_service',
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      timestamp: alert.timestamp,
      context: {
        provider: alert.provider,
        service: alert.service,
        type: alert.type
      },
      recommendations: alert.recommendations,
      acknowledged: false,
      resolved: false,
      escalationLevel: 0,
      tags: {
        provider: alert.provider,
        service: alert.service,
        type: alert.type
      }
    };
  }

  /**
   * Convert Resource alert to unified alert
   */
  private convertResourceAlert(alert: ResourceAlert): UnifiedAlert {
    return {
      id: `unified_res_${alert.id}`,
      source: 'system_resource',
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      timestamp: alert.timestamp,
      context: {
        type: alert.type
      },
      recommendations: alert.recommendations,
      acknowledged: false,
      resolved: false,
      escalationLevel: 0,
      tags: {
        type: alert.type
      }
    };
  }

  /**
   * Convert User Experience alert to unified alert
   */
  private convertUserExperienceAlert(alert: UserExperienceAlert): UnifiedAlert {
    return {
      id: `unified_ux_${alert.id}`,
      source: 'user_experience',
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      timestamp: alert.timestamp,
      context: {
        type: alert.type,
        affectedUsers: alert.affectedUsers
      },
      recommendations: alert.recommendations,
      acknowledged: false,
      resolved: false,
      escalationLevel: 0,
      tags: {
        type: alert.type
      }
    };
  }

  /**
   * Convert Business alert to unified alert
   */
  private convertBusinessAlert(alert: BusinessAlert): UnifiedAlert {
    return {
      id: `unified_biz_${alert.id}`,
      source: 'business_metrics',
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      timestamp: alert.timestamp,
      context: {
        type: alert.type,
        impact: alert.impact
      },
      recommendations: alert.recommendations,
      acknowledged: false,
      resolved: false,
      escalationLevel: 0,
      tags: {
        type: alert.type,
        impact: alert.impact
      }
    };
  }

  /**
   * Add a unified alert
   */
  private addAlert(alert: UnifiedAlert): void {
    this.alerts.push(alert);
    
    // Keep only last N alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Process alert immediately
    this.processAlert(alert);

    // Notify subscribers
    this.alertSubscribers.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert subscriber callback:', error);
      }
    });

    console.log(`🚨 [AUTOMATED-ALERT-SYSTEM] New alert: ${alert.title} (${alert.severity})`);
  }

  /**
   * Process a single alert
   */
  private async processAlert(alert: UnifiedAlert): Promise<void> {
    // Check for escalation policies
    const applicablePolicies = this.escalationPolicies.filter(policy => 
      policy.enabled &&
      policy.conditions.severity.includes(alert.severity) &&
      (!policy.conditions.source || policy.conditions.source.includes(alert.source)) &&
      (!policy.conditions.metric || policy.conditions.metric.includes(alert.metric))
    );

    // Send initial notification
    await this.sendAlertNotification(alert);

    // Schedule escalation actions
    applicablePolicies.forEach(policy => {
      policy.actions.forEach(action => {
        const delay = (action.delay || 0) * 60 * 1000; // Convert minutes to milliseconds
        
        if (delay > 0) {
          setTimeout(() => {
            this.executeEscalationAction(alert, action);
          }, delay);
        } else {
          this.executeEscalationAction(alert, action);
        }
      });
    });
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: UnifiedAlert): Promise<void> {
    const notificationMessage: NotificationMessage = {
      id: alert.id,
      ruleId: alert.id,
      ruleName: alert.title,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      description: alert.message,
      current_value: alert.value,
      threshold_value: alert.threshold,
      unit: '',
      metric: alert.metric,
      timestamp: alert.timestamp,
      environment: process.env.NODE_ENV || 'development',
      recommendations: alert.recommendations,
      affected_services: [alert.source],
      dashboard_url: process.env.DASHBOARD_URL || 'https://dashboard.example.com',
      tags: alert.tags
    };

    // Get default channels for severity
    const config = alertConfigManager.getConfiguration();
    let channelIds: string[] = [];

    switch (alert.severity) {
      case 'emergency':
        channelIds = ['console', 'log', 'email', 'slack', 'webhook'];
        break;
      case 'critical':
        channelIds = ['console', 'log', 'email', 'slack'];
        break;
      case 'warning':
        channelIds = ['console', 'log'];
        break;
      case 'info':
        channelIds = ['console', 'log'];
        break;
    }

    // Send notification
    await alertNotifier.sendNotification(notificationMessage, channelIds);
  }

  /**
   * Execute escalation action
   */
  private async executeEscalationAction(alert: UnifiedAlert, action: any): Promise<void> {
    switch (action.type) {
      case 'notify':
        await this.executeNotifyAction(alert, action.config);
        break;
      case 'escalate':
        await this.executeEscalateAction(alert, action.config);
        break;
      case 'run_script':
        await this.executeRunScriptAction(alert, action.config);
        break;
      case 'create_ticket':
        await this.executeCreateTicketAction(alert, action.config);
        break;
    }
  }

  /**
   * Execute notify action
   */
  private async executeNotifyAction(alert: UnifiedAlert, config: any): Promise<void> {
    const notificationMessage: NotificationMessage = {
      id: `${alert.id}_escalation`,
      ruleId: alert.id,
      ruleName: alert.title,
      severity: alert.severity,
      title: `[ESCALATED] ${alert.title}`,
      message: `This alert has been escalated due to severity: ${alert.severity}`,
      description: alert.message,
      current_value: alert.value,
      threshold_value: alert.threshold,
      unit: '',
      metric: alert.metric,
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
      recommendations: alert.recommendations,
      affected_services: [alert.source],
      dashboard_url: process.env.DASHBOARD_URL || 'https://dashboard.example.com',
      tags: { ...alert.tags, escalated: 'true' }
    };

    await alertNotifier.sendNotification(notificationMessage, config.channels);
  }

  /**
   * Execute escalate action
   */
  private async executeEscalateAction(alert: UnifiedAlert, config: any): Promise<void> {
    // Increase escalation level
    alert.escalationLevel++;
    
    // Log escalation
    console.log(`⬆️ [AUTOMATED-ALERT-SYSTEM] Alert escalated: ${alert.title} (level ${alert.escalationLevel})`);
    
    // Send notification
    await this.executeNotifyAction(alert, config);
  }

  /**
   * Execute run script action
   */
  private async executeRunScriptAction(alert: UnifiedAlert, config: any): Promise<void> {
    console.log(`🔧 [AUTOMATED-ALERT-SYSTEM] Running script for alert: ${alert.title}`);
    
    // In a real implementation, this would execute the specified script
    // For now, we'll just log it
    console.log(`Script: ${config.script}, Args: ${JSON.stringify(config.args || {})}`);
  }

  /**
   * Execute create ticket action
   */
  private async executeCreateTicketAction(alert: UnifiedAlert, config: any): Promise<void> {
    console.log(`🎫 [AUTOMATED-ALERT-SYSTEM] Creating ticket for alert: ${alert.title}`);
    
    // In a real implementation, this would create a ticket in a ticketing system
    // For now, we'll just log it
    console.log(`Ticket created: Priority: ${config.priority}, Assignee: ${config.assignee}`);
  }

  /**
   * Generate alert digest
   */
  private generateDigest(type: 'hourly' | 'daily' | 'weekly'): void {
    const now = new Date();
    let startTime: Date;
    let digestRecipients: string[];

    switch (type) {
      case 'hourly':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        digestRecipients = ['oncall'];
        break;
      case 'daily':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        digestRecipients = ['team', 'manager'];
        break;
      case 'weekly':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        digestRecipients = ['team', 'manager', 'executive'];
        break;
    }

    // Get alerts in the time period
    const periodAlerts = this.alerts.filter(alert => 
      alert.timestamp >= startTime && alert.timestamp <= now
    );

    // Skip if no alerts
    if (periodAlerts.length === 0) {
      return;
    }

    // Calculate summary
    const alertsBySeverity: Record<string, number> = {};
    const alertsBySource: Record<string, number> = {};
    const issueCount: Record<string, { title: string; count: number; source: string }> = {};

    periodAlerts.forEach(alert => {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      alertsBySource[alert.source] = (alertsBySource[alert.source] || 0) + 1;
      
      const issueKey = `${alert.source}:${alert.title}`;
      if (!issueCount[issueKey]) {
        issueCount[issueKey] = { title: alert.title, count: 0, source: alert.source };
      }
      issueCount[issueKey].count++;
    });

    const topIssues = Object.values(issueCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Create digest
    const digest: AlertDigest = {
      id: `digest_${type}_${Date.now()}`,
      type,
      timestamp: now,
      period: {
        start: startTime,
        end: now
      },
      summary: {
        totalAlerts: periodAlerts.length,
        alertsBySeverity,
        alertsBySource,
        topIssues
      },
      alerts: periodAlerts,
      recipients: digestRecipients,
      sent: false
    };

    this.digests.push(digest);
    
    // Keep only last N digests
    if (this.digests.length > this.maxDigests) {
      this.digests = this.digests.slice(-this.maxDigests);
    }

    // Send digest
    this.sendDigest(digest);
  }

  /**
   * Send alert digest
   */
  private async sendDigest(digest: AlertDigest): Promise<void> {
    try {
      // Create digest content
      const subject = `${digest.type.toUpperCase()} Alert Digest - ${digest.summary.totalAlerts} alerts`;
      
      let body = `
Alert Digest: ${digest.type.toUpperCase()}
Period: ${digest.period.start.toISOString()} to ${digest.period.end.toISOString()}

Summary:
- Total Alerts: ${digest.summary.totalAlerts}
- By Severity: ${Object.entries(digest.summary.alertsBySeverity).map(([k, v]) => `${k}: ${v}`).join(', ')}
- By Source: ${Object.entries(digest.summary.alertsBySource).map(([k, v]) => `${k}: ${v}`).join(', ')}

Top Issues:
${digest.summary.topIssues.map((issue, index) => `${index + 1}. ${issue.title} (${issue.count} times, ${issue.source})`).join('\n')}

Alert Details:
${digest.alerts.map(alert => `- [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`).join('\n')}
      `.trim();

      // Send email digest
      if (process.env.DIGEST_EMAIL_RECIPIENTS) {
        const recipients = process.env.DIGEST_EMAIL_RECIPIENTS.split(',');
        
        // In a real implementation, this would send an email
        console.log(`📧 [AUTOMATED-ALERT-SYSTEM] Email digest sent to: ${recipients.join(', ')}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${body.substring(0, 200)}...`);
      }

      // Mark digest as sent
      digest.sent = true;
      digest.sentAt = new Date();
      
      console.log(`✅ [AUTOMATED-ALERT-SYSTEM] ${digest.type} digest sent with ${digest.summary.totalAlerts} alerts`);
    } catch (error) {
      console.error('Error sending digest:', error);
    }
  }

  /**
   * Get all alerts
   */
  getAlerts(filter?: {
    severity?: UnifiedAlert['severity'];
    source?: UnifiedAlert['source'];
    acknowledged?: boolean;
    resolved?: boolean;
    limit?: number;
  }): UnifiedAlert[] {
    let alerts = [...this.alerts];
    
    if (filter) {
      if (filter.severity) {
        alerts = alerts.filter(alert => alert.severity === filter.severity);
      }
      if (filter.source) {
        alerts = alerts.filter(alert => alert.source === filter.source);
      }
      if (filter.acknowledged !== undefined) {
        alerts = alerts.filter(alert => alert.acknowledged === filter.acknowledged);
      }
      if (filter.resolved !== undefined) {
        alerts = alerts.filter(alert => alert.resolved === filter.resolved);
      }
    }
    
    // Sort by timestamp (newest first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply limit
    if (filter?.limit) {
      alerts = alerts.slice(0, filter.limit);
    }
    
    return alerts;
  }

  /**
   * Get alert by ID
   */
  getAlert(id: string): UnifiedAlert | undefined {
    return this.alerts.find(alert => alert.id === id);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(id: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (!alert) return false;
    
    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();
    
    console.log(`✅ [AUTOMATED-ALERT-SYSTEM] Alert acknowledged: ${alert.title} by ${acknowledgedBy}`);
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(id: string, resolvedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === id);
    if (!alert) return false;
    
    alert.resolved = true;
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = new Date();
    
    console.log(`✅ [AUTOMATED-ALERT-SYSTEM] Alert resolved: ${alert.title} by ${resolvedBy}`);
    return true;
  }

  /**
   * Get digests
   */
  getDigests(filter?: {
    type?: 'hourly' | 'daily' | 'weekly';
    sent?: boolean;
    limit?: number;
  }): AlertDigest[] {
    let digests = [...this.digests];
    
    if (filter) {
      if (filter.type) {
        digests = digests.filter(digest => digest.type === filter.type);
      }
      if (filter.sent !== undefined) {
        digests = digests.filter(digest => digest.sent === filter.sent);
      }
    }
    
    // Sort by timestamp (newest first)
    digests.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply limit
    if (filter?.limit) {
      digests = digests.slice(0, filter.limit);
    }
    
    return digests;
  }

  /**
   * Subscribe to alerts
   */
  subscribeToAlerts(id: string, callback: (alert: UnifiedAlert) => void): () => void {
    this.alertSubscribers.set(id, callback);
    
    return () => {
      this.alertSubscribers.delete(id);
    };
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(): {
    totalAlerts: number;
    alertsBySeverity: Record<string, number>;
    alertsBySource: Record<string, number>;
    acknowledgements: {
      acknowledged: number;
      unacknowledged: number;
    };
    resolutions: {
      resolved: number;
      unresolved: number;
    };
    escalationLevels: Record<number, number>;
    digests: {
      total: number;
      sent: number;
      pending: number;
    };
  } {
    const totalAlerts = this.alerts.length;
    
    const alertsBySeverity: Record<string, number> = {};
    const alertsBySource: Record<string, number> = {};
    const escalationLevels: Record<number, number> = {};
    
    let acknowledged = 0;
    let resolved = 0;
    
    this.alerts.forEach(alert => {
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
      alertsBySource[alert.source] = (alertsBySource[alert.source] || 0) + 1;
      escalationLevels[alert.escalationLevel] = (escalationLevels[alert.escalationLevel] || 0) + 1;
      
      if (alert.acknowledged) acknowledged++;
      if (alert.resolved) resolved++;
    });
    
    const digests = {
      total: this.digests.length,
      sent: this.digests.filter(d => d.sent).length,
      pending: this.digests.filter(d => !d.sent).length
    };
    
    return {
      totalAlerts,
      alertsBySeverity,
      alertsBySource,
      acknowledgements: {
        acknowledged,
        unacknowledged: totalAlerts - acknowledged
      },
      resolutions: {
        resolved,
        unresolved: totalAlerts - resolved
      },
      escalationLevels,
      digests
    };
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    // Clear all monitoring intervals
    this.monitoringIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.monitoringIntervals.clear();
    
    console.log('🛑 [AUTOMATED-ALERT-SYSTEM] Automated alert system stopped');
  }

  /**
   * Reset all alerts (for testing)
   */
  reset(): void {
    this.alerts = [];
    this.digests = [];
    console.log('🔄 [AUTOMATED-ALERT-SYSTEM] All alerts and digests reset');
  }
}

// Export singleton instance
export const automatedAlertSystem = AutomatedAlertSystem.getInstance();

// Export utility functions
export function getUnifiedAlerts(filter?: {
  severity?: UnifiedAlert['severity'];
  source?: UnifiedAlert['source'];
  acknowledged?: boolean;
  resolved?: boolean;
  limit?: number;
}): UnifiedAlert[] {
  return automatedAlertSystem.getAlerts(filter);
}

export function acknowledgeAlert(id: string, acknowledgedBy: string): boolean {
  return automatedAlertSystem.acknowledgeAlert(id, acknowledgedBy);
}

export function resolveAlert(id: string, resolvedBy: string): boolean {
  return automatedAlertSystem.resolveAlert(id, resolvedBy);
}

export function getAlertDigests(filter?: {
  type?: 'hourly' | 'daily' | 'weekly';
  sent?: boolean;
  limit?: number;
}): AlertDigest[] {
  return automatedAlertSystem.getDigests(filter);
}

export function subscribeToAlerts(id: string, callback: (alert: UnifiedAlert) => void): () => void {
  return automatedAlertSystem.subscribeToAlerts(id, callback);
}

export function getAlertStatistics() {
  return automatedAlertSystem.getAlertStatistics();
}