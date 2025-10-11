/**
 * Real-time Alerting Configuration System
 * Centralized configuration for all monitoring alerts and notifications
 */

export interface AlertChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'console' | 'log';
  enabled: boolean;
  config: Record<string, any>;
  rateLimit?: {
    maxPerHour: number;
    maxPerDay: number;
  };
}

export interface AlertThreshold {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  unit: string;
  duration?: number; // in seconds
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: 'performance' | 'availability' | 'cost' | 'usage' | 'error' | 'user_experience' | 'business';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  enabled: boolean;
  thresholds: AlertThreshold[];
  channels: string[]; // Channel IDs
  cooldown: number; // in seconds
  conditions?: {
    and?: AlertRule[];
    or?: AlertRule[];
  };
  tags?: Record<string, string>;
  escalationPolicy?: {
    escalateAfter: number; // seconds
    escalateTo: string[]; // Channel IDs
  };
}

export interface AlertTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  channels: string[];
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  widgets: Array<{
    id: string;
    type: 'metric' | 'chart' | 'table' | 'alert' | 'status';
    title: string;
    query: string;
    refreshInterval: number;
    config: Record<string, any>;
  }>;
  layout: {
    columns: number;
    widgets: Array<{
      widgetId: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  };
  refreshInterval: number;
  public: boolean;
}

export interface AlertConfiguration {
  environment: string;
  channels: AlertChannel[];
  rules: AlertRule[];
  templates: AlertTemplate[];
  dashboards: MonitoringDashboard[];
  globalSettings: {
    timezone: string;
    defaultCooldown: number;
    maxAlertsPerHour: number;
    enableEscalation: boolean;
    maintenanceWindows: Array<{
      start: string; // ISO date
      end: string; // ISO date
      reason: string;
    }>;
  };
}

/**
 * Default Alert Configuration for AI Search Feature
 */
export const DEFAULT_ALERT_CONFIGURATION: AlertConfiguration = {
  environment: 'production',
  channels: [
    {
      id: 'console',
      name: 'Console Output',
      type: 'console',
      enabled: true,
      config: {
        colorize: true,
        timestamp: true
      }
    },
    {
      id: 'log',
      name: 'Log File',
      type: 'log',
      enabled: true,
      config: {
        file: '/var/log/media-contacts/alerts.log',
        format: 'json'
      }
    },
    {
      id: 'email',
      name: 'Email Notifications',
      type: 'email',
      enabled: false,
      config: {
        smtp: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        },
        from: process.env.ALERT_EMAIL_FROM || 'alerts@media-contacts.com',
        to: process.env.ALERT_EMAIL_TO?.split(',') || []
      },
      rateLimit: {
        maxPerHour: 10,
        maxPerDay: 50
      }
    },
    {
      id: 'slack',
      name: 'Slack Notifications',
      type: 'slack',
      enabled: false,
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#alerts',
        username: 'Media Contacts Bot'
      },
      rateLimit: {
        maxPerHour: 20,
        maxPerDay: 100
      }
    },
    {
      id: 'webhook',
      name: 'Generic Webhook',
      type: 'webhook',
      enabled: false,
      config: {
        url: process.env.ALERT_WEBHOOK_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ALERT_WEBHOOK_TOKEN || ''}`
        }
      }
    }
  ],
  rules: [
    // Performance Alerts
    {
      id: 'high_response_time',
      name: 'High API Response Time',
      description: 'Alert when API response time exceeds threshold',
      category: 'performance',
      severity: 'warning',
      enabled: true,
      thresholds: [
        {
          metric: 'api_response_time_p95',
          operator: '>',
          value: 2000,
          unit: 'ms',
          duration: 300
        }
      ],
      channels: ['console', 'log'],
      cooldown: 900,
      tags: { service: 'api', metric: 'response_time' }
    },
    {
      id: 'critical_response_time',
      name: 'Critical API Response Time',
      description: 'Emergency alert when API response time is critical',
      category: 'performance',
      severity: 'critical',
      enabled: true,
      thresholds: [
        {
          metric: 'api_response_time_p95',
          operator: '>',
          value: 5000,
          unit: 'ms',
          duration: 120
        }
      ],
      channels: ['console', 'log', 'email'],
      cooldown: 600,
      tags: { service: 'api', metric: 'response_time', priority: 'high' }
    },
    {
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      description: 'Alert when memory usage exceeds threshold',
      category: 'performance',
      severity: 'warning',
      enabled: true,
      thresholds: [
        {
          metric: 'memory_usage_percent',
          operator: '>',
          value: 80,
          unit: '%',
          duration: 300
        }
      ],
      channels: ['console', 'log'],
      cooldown: 900,
      tags: { service: 'system', metric: 'memory' }
    },
    {
      id: 'critical_memory_usage',
      name: 'Critical Memory Usage',
      description: 'Emergency alert when memory usage is critical',
      category: 'performance',
      severity: 'critical',
      enabled: true,
      thresholds: [
        {
          metric: 'memory_usage_percent',
          operator: '>',
          value: 90,
          unit: '%',
          duration: 60
        }
      ],
      channels: ['console', 'log', 'email'],
      cooldown: 300,
      tags: { service: 'system', metric: 'memory', priority: 'high' }
    },
    
    // Availability Alerts
    {
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'Alert when error rate exceeds threshold',
      category: 'availability',
      severity: 'warning',
      enabled: true,
      thresholds: [
        {
          metric: 'error_rate_percent',
          operator: '>',
          value: 5,
          unit: '%',
          duration: 300
        }
      ],
      channels: ['console', 'log'],
      cooldown: 900,
      tags: { service: 'api', metric: 'error_rate' }
    },
    {
      id: 'critical_error_rate',
      name: 'Critical Error Rate',
      description: 'Emergency alert when error rate is critical',
      category: 'availability',
      severity: 'critical',
      enabled: true,
      thresholds: [
        {
          metric: 'error_rate_percent',
          operator: '>',
          value: 15,
          unit: '%',
          duration: 120
        }
      ],
      channels: ['console', 'log', 'email'],
      cooldown: 300,
      tags: { service: 'api', metric: 'error_rate', priority: 'high' }
    },
    {
      id: 'service_down',
      name: 'Service Down',
      description: 'Alert when a service is down',
      category: 'availability',
      severity: 'emergency',
      enabled: true,
      thresholds: [
        {
          metric: 'service_availability',
          operator: '<',
          value: 95,
          unit: '%',
          duration: 60
        }
      ],
      channels: ['console', 'log', 'email', 'slack'],
      cooldown: 300,
      tags: { service: 'api', metric: 'availability', priority: 'emergency' }
    },
    
    // AI Service Alerts
    {
      id: 'ai_search_failure_rate',
      name: 'AI Search Failure Rate',
      description: 'Alert when AI search failure rate is high',
      category: 'error',
      severity: 'warning',
      enabled: true,
      thresholds: [
        {
          metric: 'ai_search_failure_rate',
          operator: '>',
          value: 10,
          unit: '%',
          duration: 300
        }
      ],
      channels: ['console', 'log'],
      cooldown: 900,
      tags: { service: 'ai-search', metric: 'failure_rate' }
    },
    {
      id: 'ai_service_unavailable',
      name: 'AI Service Unavailable',
      description: 'Alert when an AI service is unavailable',
      category: 'availability',
      severity: 'critical',
      enabled: true,
      thresholds: [
        {
          metric: 'ai_service_availability',
          operator: '<',
          value: 95,
          unit: '%',
          duration: 120
        }
      ],
      channels: ['console', 'log', 'email'],
      cooldown: 600,
      tags: { service: 'ai', metric: 'availability', priority: 'high' }
    },
    
    // Cost Alerts
    {
      id: 'daily_cost_threshold',
      name: 'Daily Cost Threshold',
      description: 'Alert when daily cost exceeds threshold',
      category: 'cost',
      severity: 'warning',
      enabled: true,
      thresholds: [
        {
          metric: 'daily_cost',
          operator: '>',
          value: 50,
          unit: 'USD',
          duration: 0
        }
      ],
      channels: ['console', 'log', 'email'],
      cooldown: 3600,
      tags: { service: 'billing', metric: 'cost' }
    },
    {
      id: 'monthly_cost_threshold',
      name: 'Monthly Cost Threshold',
      description: 'Alert when monthly cost exceeds threshold',
      category: 'cost',
      severity: 'critical',
      enabled: true,
      thresholds: [
        {
          metric: 'monthly_cost',
          operator: '>',
          value: 1000,
          unit: 'USD',
          duration: 0
        }
      ],
      channels: ['console', 'log', 'email'],
      cooldown: 7200,
      tags: { service: 'billing', metric: 'cost', priority: 'high' }
    },
    
    // User Experience Alerts
    {
      id: 'low_user_satisfaction',
      name: 'Low User Satisfaction',
      description: 'Alert when user satisfaction drops',
      category: 'user_experience',
      severity: 'warning',
      enabled: true,
      thresholds: [
        {
          metric: 'user_satisfaction_score',
          operator: '<',
          value: 3.5,
          unit: 'score',
          duration: 3600
        }
      ],
      channels: ['console', 'log', 'email'],
      cooldown: 3600,
      tags: { service: 'user-experience', metric: 'satisfaction' }
    },
    {
      id: 'high_abandonment_rate',
      name: 'High Search Abandonment Rate',
      description: 'Alert when users abandon searches frequently',
      category: 'user_experience',
      severity: 'warning',
      enabled: true,
      thresholds: [
        {
          metric: 'search_abandonment_rate',
          operator: '>',
          value: 30,
          unit: '%',
          duration: 1800
        }
      ],
      channels: ['console', 'log'],
      cooldown: 1800,
      tags: { service: 'user-experience', metric: 'abandonment' }
    },
    
    // Business Metrics Alerts
    {
      id: 'low_productivity_gain',
      name: 'Low Productivity Gain',
      description: 'Alert when productivity gain is low',
      category: 'business',
      severity: 'info',
      enabled: true,
      thresholds: [
        {
          metric: 'productivity_gain_percent',
          operator: '<',
          value: 20,
          unit: '%',
          duration: 86400
        }
      ],
      channels: ['console', 'log'],
      cooldown: 86400,
      tags: { service: 'business', metric: 'productivity' }
    }
  ],
  templates: [
    {
      id: 'standard_alert',
      name: 'Standard Alert Template',
      subject: '[{{severity}}] {{alert_name}} - {{environment}}',
      body: `
Alert: {{alert_name}}
Severity: {{severity}}
Environment: {{environment}}
Timestamp: {{timestamp}}

Description: {{description}}

Current Value: {{current_value}} {{unit}}
Threshold: {{threshold_value}} {{unit}}

{{#if recommendations}}
Recommendations:
{{#each recommendations}}
  • {{this}}
{{/each}}
{{/if}}

{{#if affected_services}}
Affected Services:
{{#each affected_services}}
  • {{this}}
{{/each}}
{{/if}}

View Details: {{dashboard_url}}
      `.trim(),
      variables: ['severity', 'alert_name', 'environment', 'timestamp', 'description', 'current_value', 'unit', 'threshold_value', 'recommendations', 'affected_services', 'dashboard_url'],
      channels: ['email', 'slack']
    },
    {
      id: 'slack_alert',
      name: 'Slack Alert Template',
      subject: '',
      body: `
{
  "text": "{{emoji}} *{{severity.toUpperCase()}: {{alert_name}}*",
  "attachments": [
    {
      "color": "{{color}}",
      "fields": [
        {
          "title": "Environment",
          "value": "{{environment}}",
          "short": true
        },
        {
          "title": "Metric",
          "value": "{{metric}}",
          "short": true
        },
        {
          "title": "Current Value",
          "value": "{{current_value}} {{unit}}",
          "short": true
        },
        {
          "title": "Threshold",
          "value": "{{threshold_value}} {{unit}}",
          "short": true
        },
        {
          "title": "Description",
          "value": "{{description}}",
          "short": false
        }
      ],
      "actions": [
        {
          "type": "button",
          "text": "View Dashboard",
          "url": "{{dashboard_url}}"
        }
      ]
    }
  ]
}
      `.trim(),
      variables: ['emoji', 'severity', 'alert_name', 'environment', 'timestamp', 'description', 'current_value', 'unit', 'threshold_value', 'metric', 'color', 'dashboard_url'],
      channels: ['slack']
    }
  ],
  dashboards: [
    {
      id: 'ai_search_overview',
      name: 'AI Search Overview',
      description: 'Overview dashboard for AI Search feature monitoring',
      widgets: [
        {
          id: 'status_overview',
          type: 'status',
          title: 'System Status',
          query: 'overall_system_health',
          refreshInterval: 30,
          config: {
            showDetails: true,
            statusLevels: ['operational', 'degraded', 'critical']
          }
        },
        {
          id: 'response_time_chart',
          type: 'chart',
          title: 'API Response Time',
          query: 'api_response_time_timeseries',
          refreshInterval: 60,
          config: {
            chartType: 'line',
            timeRange: '1h',
            aggregation: 'p95'
          }
        },
        {
          id: 'error_rate_chart',
          type: 'chart',
          title: 'Error Rate',
          query: 'error_rate_timeseries',
          refreshInterval: 60,
          config: {
            chartType: 'line',
            timeRange: '1h',
            aggregation: 'rate'
          }
        },
        {
          id: 'cost_metrics',
          type: 'metric',
          title: 'Daily Cost',
          query: 'daily_cost_total',
          refreshInterval: 300,
          config: {
            format: 'currency',
            unit: 'USD'
          }
        },
        {
          id: 'active_alerts',
          type: 'alert',
          title: 'Active Alerts',
          query: 'active_alerts_list',
          refreshInterval: 30,
          config: {
            groupBy: 'severity',
            maxItems: 10
          }
        },
        {
          id: 'search_metrics',
          type: 'table',
          title: 'Search Performance',
          query: 'search_performance_table',
          refreshInterval: 120,
          config: {
            columns: ['timestamp', 'total_searches', 'success_rate', 'avg_response_time', 'cost_per_search'],
            sortable: true,
            pageSize: 10
          }
        }
      ],
      layout: {
        columns: 3,
        widgets: [
          { widgetId: 'status_overview', x: 0, y: 0, width: 3, height: 1 },
          { widgetId: 'response_time_chart', x: 0, y: 1, width: 2, height: 2 },
          { widgetId: 'error_rate_chart', x: 2, y: 1, width: 1, height: 2 },
          { widgetId: 'cost_metrics', x: 0, y: 3, width: 1, height: 1 },
          { widgetId: 'active_alerts', x: 1, y: 3, width: 1, height: 1 },
          { widgetId: 'search_metrics', x: 2, y: 3, width: 1, height: 1 }
        ]
      },
      refreshInterval: 60,
      public: false
    }
  ],
  globalSettings: {
    timezone: 'UTC',
    defaultCooldown: 600,
    maxAlertsPerHour: 50,
    enableEscalation: true,
    maintenanceWindows: []
  }
};

/**
 * Alert Configuration Manager
 */
export class AlertConfigManager {
  private static instance: AlertConfigManager;
  private config: AlertConfiguration;
  private configPath: string;

  private constructor() {
    this.configPath = process.env.ALERT_CONFIG_PATH || './alert-config.json';
    this.loadConfiguration();
  }

  static getInstance(): AlertConfigManager {
    if (!AlertConfigManager.instance) {
      AlertConfigManager.instance = new AlertConfigManager();
    }
    return AlertConfigManager.instance;
  }

  private loadConfiguration(): void {
    try {
      if (typeof window === 'undefined' && require('fs').existsSync(this.configPath)) {
        const fs = require('fs');
        const configData = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(configData);
        console.log('✅ [ALERT-CONFIG] Configuration loaded from file');
      } else {
        this.config = { ...DEFAULT_ALERT_CONFIGURATION };
        this.config.environment = process.env.NODE_ENV || 'development';
        console.log('✅ [ALERT-CONFIG] Using default configuration');
      }
    } catch (error) {
      console.error('❌ [ALERT-CONFIG] Error loading configuration:', error);
      this.config = { ...DEFAULT_ALERT_CONFIGURATION };
      this.config.environment = process.env.NODE_ENV || 'development';
    }
  }

  getConfiguration(): AlertConfiguration {
    return { ...this.config };
  }

  updateConfiguration(updates: Partial<AlertConfiguration>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfiguration();
  }

  getAlertRules(category?: string, enabledOnly: boolean = false): AlertRule[] {
    let rules = this.config.rules;
    
    if (category) {
      rules = rules.filter(rule => rule.category === category);
    }
    
    if (enabledOnly) {
      rules = rules.filter(rule => rule.enabled);
    }
    
    return rules;
  }

  getAlertChannels(enabledOnly: boolean = false): AlertChannel[] {
    let channels = this.config.channels;
    
    if (enabledOnly) {
      channels = channels.filter(channel => channel.enabled);
    }
    
    return channels;
  }

  getAlertTemplate(templateId: string): AlertTemplate | undefined {
    return this.config.templates.find(template => template.id === templateId);
  }

  getDashboard(dashboardId: string): MonitoringDashboard | undefined {
    return this.config.dashboards.find(dashboard => dashboard.id === dashboardId);
  }

  addAlertRule(rule: AlertRule): void {
    this.config.rules.push(rule);
    this.saveConfiguration();
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const index = this.config.rules.findIndex(rule => rule.id === ruleId);
    if (index >= 0) {
      this.config.rules[index] = { ...this.config.rules[index], ...updates };
      this.saveConfiguration();
      return true;
    }
    return false;
  }

  deleteAlertRule(ruleId: string): boolean {
    const index = this.config.rules.findIndex(rule => rule.id === ruleId);
    if (index >= 0) {
      this.config.rules.splice(index, 1);
      this.saveConfiguration();
      return true;
    }
    return false;
  }

  addAlertChannel(channel: AlertChannel): void {
    this.config.channels.push(channel);
    this.saveConfiguration();
  }

  updateAlertChannel(channelId: string, updates: Partial<AlertChannel>): boolean {
    const index = this.config.channels.findIndex(channel => channel.id === channelId);
    if (index >= 0) {
      this.config.channels[index] = { ...this.config.channels[index], ...updates };
      this.saveConfiguration();
      return true;
    }
    return false;
  }

  deleteAlertChannel(channelId: string): boolean {
    const index = this.config.channels.findIndex(channel => channel.id === channelId);
    if (index >= 0) {
      this.config.channels.splice(index, 1);
      this.saveConfiguration();
      return true;
    }
    return false;
  }

  private saveConfiguration(): void {
    try {
      if (typeof window === 'undefined') {
        const fs = require('fs');
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        console.log('✅ [ALERT-CONFIG] Configuration saved to file');
      }
    } catch (error) {
      console.error('❌ [ALERT-CONFIG] Error saving configuration:', error);
    }
  }

  isInMaintenanceWindow(): boolean {
    const now = new Date();
    return this.config.globalSettings.maintenanceWindows.some(window => {
      const start = new Date(window.start);
      const end = new Date(window.end);
      return now >= start && now <= end;
    });
  }
}

// Export singleton instance
export const alertConfigManager = AlertConfigManager.getInstance();

// Export utility functions
export function getAlertConfiguration(): AlertConfiguration {
  return alertConfigManager.getConfiguration();
}

export function getAlertRules(category?: string, enabledOnly?: boolean): AlertRule[] {
  return alertConfigManager.getAlertRules(category, enabledOnly);
}

export function getAlertChannels(enabledOnly?: boolean): AlertChannel[] {
  return alertConfigManager.getAlertChannels(enabledOnly);
}

export function isInMaintenanceWindow(): boolean {
  return alertConfigManager.isInMaintenanceWindow();
}