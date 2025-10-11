/**
 * Real-time Alert Notification System
 * Handles sending alerts through various channels with rate limiting and templating
 */

import { alertConfigManager, type AlertChannel, type AlertTemplate, type AlertRule } from './alert-config';
import { aiSearchMonitor, type AISearchAlert } from './ai-search-monitor';

export interface NotificationMessage {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  description: string;
  current_value: number;
  threshold_value: number;
  unit: string;
  metric: string;
  timestamp: Date;
  environment: string;
  recommendations?: string[];
  affected_services?: string[];
  dashboard_url?: string;
  tags?: Record<string, string>;
}

export interface NotificationResult {
  success: boolean;
  channel: string;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

export interface RateLimitInfo {
  count: number;
  resetTime: Date;
  lastSent: Date;
}

/**
 * Alert Notifier Class
 */
export class AlertNotifier {
  private static instance: AlertNotifier;
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private notificationHistory: NotificationResult[] = [];
  private maxHistorySize = 1000;

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): AlertNotifier {
    if (!AlertNotifier.instance) {
      AlertNotifier.instance = new AlertNotifier();
    }
    return AlertNotifier.instance;
  }

  /**
   * Send notification through specified channels
   */
  async sendNotification(
    message: NotificationMessage,
    channelIds: string[] = []
  ): Promise<NotificationResult[]> {
    const config = alertConfigManager.getConfiguration();
    const results: NotificationResult[] = [];

    // If no channels specified, use default channels from rule
    const targetChannels = channelIds.length > 0 
      ? channelIds 
      : this.getDefaultChannelsForSeverity(message.severity);

    // Check if we're in maintenance window
    if (config.globalSettings.maintenanceWindows.length > 0) {
      const now = new Date();
      const inMaintenance = config.globalSettings.maintenanceWindows.some(window => {
        const start = new Date(window.start);
        const end = new Date(window.end);
        return now >= start && now <= end;
      });

      if (inMaintenance) {
        console.log(`🔧 [ALERT-NOTIFIER] In maintenance window - suppressing alert: ${message.title}`);
        return results;
      }
    }

    for (const channelId of targetChannels) {
      const channel = config.channels.find(c => c.id === channelId);
      if (!channel || !channel.enabled) {
        results.push({
          success: false,
          channel: channelId,
          error: 'Channel not found or disabled',
          timestamp: new Date()
        });
        continue;
      }

      // Check rate limiting
      if (this.isRateLimited(channelId, channel.rateLimit)) {
        results.push({
          success: false,
          channel: channelId,
          error: 'Rate limit exceeded',
          timestamp: new Date()
        });
        continue;
      }

      try {
        const result = await this.sendToChannel(message, channel);
        results.push(result);
        
        if (result.success) {
          this.updateRateLimit(channelId);
        }
      } catch (error) {
        results.push({
          success: false,
          channel: channelId,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        });
      }
    }

    // Store results in history
    this.notificationHistory.push(...results);
    if (this.notificationHistory.length > this.maxHistorySize) {
      this.notificationHistory = this.notificationHistory.slice(-this.maxHistorySize);
    }

    return results;
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(message: NotificationMessage, channel: AlertChannel): Promise<NotificationResult> {
    switch (channel.type) {
      case 'console':
        return this.sendToConsole(message, channel);
      case 'log':
        return this.sendToLog(message, channel);
      case 'email':
        return this.sendToEmail(message, channel);
      case 'slack':
        return this.sendToSlack(message, channel);
      case 'webhook':
        return this.sendToWebhook(message, channel);
      case 'sms':
        return this.sendToSMS(message, channel);
      default:
        throw new Error(`Unknown channel type: ${channel.type}`);
    }
  }

  /**
   * Send to console
   */
  private async sendToConsole(message: NotificationMessage, channel: AlertChannel): Promise<NotificationResult> {
    const emoji = this.getSeverityEmoji(message.severity);
    const colorize = channel.config.colorize !== false;
    
    let output = `${emoji} [ALERT] ${message.title}`;
    
    if (colorize) {
      const color = this.getSeverityColor(message.severity);
      output = `\x1b[${color}m${output}\x1b[0m`;
    }
    
    console.log(output);
    console.log(`  Severity: ${message.severity.toUpperCase()}`);
    console.log(`  Metric: ${message.metric} = ${message.current_value}${message.unit} (threshold: ${message.threshold_value}${message.unit})`);
    console.log(`  Description: ${message.description}`);
    
    if (message.recommendations && message.recommendations.length > 0) {
      console.log(`  Recommendations:`);
      message.recommendations.forEach(rec => console.log(`    • ${rec}`));
    }
    
    if (channel.config.timestamp !== false) {
      console.log(`  Time: ${message.timestamp.toISOString()}`);
    }
    
    console.log(''); // Empty line for readability
    
    return {
      success: true,
      channel: channel.id,
      timestamp: new Date()
    };
  }

  /**
   * Send to log file
   */
  private async sendToLog(message: NotificationMessage, channel: AlertChannel): Promise<NotificationResult> {
    try {
      if (typeof window === 'undefined') {
        const fs = require('fs');
        const path = require('path');
        
        const logEntry = {
          timestamp: message.timestamp.toISOString(),
          level: message.severity.toUpperCase(),
          alert: {
            id: message.id,
            ruleId: message.ruleId,
            ruleName: message.ruleName,
            title: message.title,
            message: message.message,
            severity: message.severity,
            metric: message.metric,
            currentValue: message.current_value,
            thresholdValue: message.threshold_value,
            unit: message.unit,
            environment: message.environment,
            recommendations: message.recommendations,
            affectedServices: message.affected_services,
            tags: message.tags
          }
        };
        
        const logLine = channel.config.format === 'json' 
          ? JSON.stringify(logEntry) 
          : `${logEntry.timestamp} [${logEntry.level}] ${message.title}: ${message.message}`;
        
        fs.appendFileSync(channel.config.file || '/var/log/media-contacts/alerts.log', logLine + '\n');
      }
      
      return {
        success: true,
        channel: channel.id,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        channel: channel.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Send to email
   */
  private async sendToEmail(message: NotificationMessage, channel: AlertChannel): Promise<NotificationResult> {
    try {
      const template = alertConfigManager.getAlertTemplate('standard_alert');
      const subject = this.renderTemplate(template?.subject || '[{{severity}}] {{alert_name}}', message);
      const body = this.renderTemplate(template?.body || this.getDefaultEmailBody(), message);
      
      // In a real implementation, you would use a service like Nodemailer
      // For now, we'll just log the email that would be sent
      console.log(`📧 [ALERT-NOTIFIER] Email would be sent to: ${channel.config.to?.join(', ')}`);
      console.log(`📧 [ALERT-NOTIFIER] Subject: ${subject}`);
      console.log(`📧 [ALERT-NOTIFIER] Body: ${body.substring(0, 200)}...`);
      
      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return {
        success: true,
        channel: channel.id,
        messageId: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        channel: channel.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Send to Slack
   */
  private async sendToSlack(message: NotificationMessage, channel: AlertChannel): Promise<NotificationResult> {
    try {
      const template = alertConfigManager.getAlertTemplate('slack_alert');
      const payload = JSON.parse(this.renderTemplate(template?.body || this.getDefaultSlackBody(), message));
      
      const response = await fetch(channel.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }
      
      return {
        success: true,
        channel: channel.id,
        messageId: `slack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        channel: channel.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Send to webhook
   */
  private async sendToWebhook(message: NotificationMessage, channel: AlertChannel): Promise<NotificationResult> {
    try {
      const payload = {
        alert: {
          id: message.id,
          ruleId: message.ruleId,
          ruleName: message.ruleName,
          severity: message.severity,
          title: message.title,
          message: message.message,
          description: message.description,
          metric: message.metric,
          currentValue: message.current_value,
          thresholdValue: message.threshold_value,
          unit: message.unit,
          timestamp: message.timestamp.toISOString(),
          environment: message.environment,
          recommendations: message.recommendations,
          affectedServices: message.affected_services,
          tags: message.tags
        }
      };
      
      const response = await fetch(channel.config.url, {
        method: channel.config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...channel.config.headers
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
      }
      
      return {
        success: true,
        channel: channel.id,
        messageId: `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        channel: channel.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Send to SMS
   */
  private async sendToSMS(message: NotificationMessage, channel: AlertChannel): Promise<NotificationResult> {
    try {
      // In a real implementation, you would use a service like Twilio
      // For now, we'll just log the SMS that would be sent
      const smsBody = `[${message.severity.toUpperCase()}] ${message.title}: ${message.current_value}${message.unit} (threshold: ${message.threshold_value}${message.unit})`;
      
      console.log(`📱 [ALERT-NOTIFIER] SMS would be sent to: ${channel.config.phoneNumber}`);
      console.log(`📱 [ALERT-NOTIFIER] Body: ${smsBody}`);
      
      // Simulate SMS sending
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return {
        success: true,
        channel: channel.id,
        messageId: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        channel: channel.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if channel is rate limited
   */
  private isRateLimited(channelId: string, rateLimit?: { maxPerHour: number; maxPerDay: number }): boolean {
    if (!rateLimit) return false;
    
    const now = new Date();
    const rateLimitInfo = this.rateLimits.get(channelId);
    
    if (!rateLimitInfo) return false;
    
    // Check hourly limit
    const hoursSinceReset = (now.getTime() - rateLimitInfo.resetTime.getTime()) / (1000 * 60 * 60);
    if (hoursSinceReset < 1 && rateLimitInfo.count >= rateLimit.maxPerHour) {
      return true;
    }
    
    // Check daily limit
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dailyCount = this.notificationHistory.filter(
      result => result.channel === channelId && result.timestamp >= oneDayAgo
    ).length;
    
    if (dailyCount >= rateLimit.maxPerDay) {
      return true;
    }
    
    return false;
  }

  /**
   * Update rate limit information
   */
  private updateRateLimit(channelId: string): void {
    const now = new Date();
    const rateLimitInfo = this.rateLimits.get(channelId);
    
    if (!rateLimitInfo) {
      this.rateLimits.set(channelId, {
        count: 1,
        resetTime: now,
        lastSent: now
      });
      return;
    }
    
    const hoursSinceReset = (now.getTime() - rateLimitInfo.resetTime.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceReset >= 1) {
      // Reset hourly counter
      rateLimitInfo.count = 1;
      rateLimitInfo.resetTime = now;
    } else {
      rateLimitInfo.count++;
    }
    
    rateLimitInfo.lastSent = now;
  }

  /**
   * Get default channels for severity level
   */
  private getDefaultChannelsForSeverity(severity: string): string[] {
    switch (severity) {
      case 'emergency':
        return ['console', 'log', 'email', 'slack', 'webhook'];
      case 'critical':
        return ['console', 'log', 'email', 'slack'];
      case 'warning':
        return ['console', 'log'];
      case 'info':
        return ['console', 'log'];
      default:
        return ['console', 'log'];
    }
  }

  /**
   * Get severity emoji
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'emergency': return '🆘';
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  }

  /**
   * Get severity color for console output
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'emergency': return '91'; // Red
      case 'critical': return '91'; // Red
      case 'warning': return '93'; // Yellow
      case 'info': return '94'; // Blue
      default: return '37'; // White
    }
  }

  /**
   * Render template with message variables
   */
  private renderTemplate(template: string, message: NotificationMessage): string {
    let rendered = template;
    
    const variables = {
      severity: message.severity,
      alert_name: message.title,
      environment: message.environment,
      timestamp: message.timestamp.toISOString(),
      description: message.description,
      current_value: message.current_value.toString(),
      unit: message.unit,
      threshold_value: message.threshold_value.toString(),
      metric: message.metric,
      recommendations: message.recommendations?.join('\n') || '',
      affected_services: message.affected_services?.join(', ') || '',
      dashboard_url: message.dashboard_url || '',
      emoji: this.getSeverityEmoji(message.severity),
      color: this.getSeverityColor(message.severity)
    };
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, value);
    }
    
    return rendered;
  }

  /**
   * Get default email body
   */
  private getDefaultEmailBody(): string {
    return `
Alert: {{alert_name}}
Severity: {{severity}}
Environment: {{environment}}
Timestamp: {{timestamp}}

Description: {{description}}

Current Value: {{current_value}} {{unit}}
Threshold: {{threshold_value}} {{unit}}

{{#if recommendations}}
Recommendations:
{{recommendations}}
{{/if}}

{{#if affected_services}}
Affected Services:
{{affected_services}}
{{/if}}
    `.trim();
  }

  /**
   * Get default Slack body
   */
  private getDefaultSlackBody(): string {
    return JSON.stringify({
      text: "{{emoji}} *{{severity.toUpperCase()}: {{alert_name}}*",
      attachments: [
        {
          color: "{{severity}}",
          fields: [
            {
              title: "Environment",
              "value": "{{environment}}",
              "short": true
            },
            {
              title: "Metric",
              "value": "{{metric}}",
              "short": true
            },
            {
              title: "Current Value",
              "value": "{{current_value}} {{unit}}",
              "short": true
            },
            {
              title: "Threshold",
              "value": "{{threshold_value}} {{unit}}",
              "short": true
            },
            {
              title: "Description",
              "value": "{{description}}",
              "short": false
            }
          ]
        }
      ]
    });
  }

  /**
   * Start cleanup interval for rate limits and history
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupRateLimits();
      this.cleanupHistory();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Clean up expired rate limits
   */
  private cleanupRateLimits(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    for (const [channelId, rateLimitInfo] of this.rateLimits.entries()) {
      if (rateLimitInfo.resetTime < oneHourAgo) {
        this.rateLimits.delete(channelId);
      }
    }
  }

  /**
   * Clean up old notification history
   */
  private cleanupHistory(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const originalSize = this.notificationHistory.length;
    
    this.notificationHistory = this.notificationHistory.filter(
      result => result.timestamp >= oneDayAgo
    );
    
    if (this.notificationHistory.length < originalSize) {
      console.log(`🧹 [ALERT-NOTIFIER] Cleaned up ${originalSize - this.notificationHistory.length} old notification records`);
    }
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): {
    totalSent: number;
    successRate: number;
    byChannel: Record<string, { sent: number; failed: number }>;
    bySeverity: Record<string, number>;
    last24h: number;
  } {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentNotifications = this.notificationHistory.filter(
      result => result.timestamp >= oneDayAgo
    );
    
    const totalSent = this.notificationHistory.length;
    const successfulSent = this.notificationHistory.filter(result => result.success).length;
    const successRate = totalSent > 0 ? (successfulSent / totalSent) * 100 : 0;
    
    const byChannel: Record<string, { sent: number; failed: number }> = {};
    const bySeverity: Record<string, number> = {};
    
    for (const result of this.notificationHistory) {
      if (!byChannel[result.channel]) {
        byChannel[result.channel] = { sent: 0, failed: 0 };
      }
      
      if (result.success) {
        byChannel[result.channel].sent++;
      } else {
        byChannel[result.channel].failed++;
      }
    }
    
    return {
      totalSent,
      successRate,
      byChannel,
      bySeverity,
      last24h: recentNotifications.length
    };
  }

  /**
   * Convert AI Search Alert to Notification Message
   */
  aiSearchAlertToNotification(alert: AISearchAlert): NotificationMessage {
    return {
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
      affected_services: alert.affectedProviders,
      tags: {}
    };
  }
}

// Export singleton instance
export const alertNotifier = AlertNotifier.getInstance();

// Export utility functions
export async function sendAlert(message: NotificationMessage, channelIds?: string[]): Promise<NotificationResult[]> {
  return alertNotifier.sendNotification(message, channelIds);
}

export async function sendAISearchAlert(alert: AISearchAlert, channelIds?: string[]): Promise<NotificationResult[]> {
  const message = alertNotifier.aiSearchAlertToNotification(alert);
  return alertNotifier.sendNotification(message, channelIds);
}

export function getNotificationStats() {
  return alertNotifier.getNotificationStats();
}