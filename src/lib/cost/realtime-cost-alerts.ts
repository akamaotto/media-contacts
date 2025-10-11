/**
 * Real-time Cost Alerts and Budget Control Service
 * Provides immediate alerts and automated budget controls
 */

import { PrismaClient } from '@prisma/client';
import { comprehensiveCostTracker } from './comprehensive-cost-tracker';
import { costTracker } from '@/lib/security/cost-tracker';
import { featureFlagService } from '@/lib/feature-flags/feature-flag-service';

const prisma = new PrismaClient();

export interface AlertConfiguration {
  id: string;
  name: string;
  description: string;
  type: 'budget' | 'anomaly' | 'threshold' | 'trend' | 'rate';
  conditions: {
    metric: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'spike' | 'trend';
    value: number;
    timeWindow?: string; // '1h', '24h', '7d', '30d'
    percentage?: number; // for spike detection
  }[];
  actions: AlertAction[];
  isActive: boolean;
  cooldownPeriod: number; // minutes
  lastTriggered?: Date;
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'feature_flag' | 'rate_limit' | 'disable_feature';
  config: {
    recipients?: string[];
    url?: string;
    flagKey?: string;
    flagValue?: boolean;
    limit?: number;
    feature?: string;
  };
}

export interface BudgetControl {
  id: string;
  userId?: string;
  budgetType: 'daily' | 'weekly' | 'monthly';
  limit: number;
  currentSpend: number;
  warningThreshold: number; // percentage
  criticalThreshold: number; // percentage
  actions: {
    warning: AlertAction[];
    critical: AlertAction[];
    exceeded: AlertAction[];
  };
  isActive: boolean;
}

export interface RealTimeAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metadata: Record<string, any>;
  userId?: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface CostSpike {
  id: string;
  detectedAt: Date;
  metric: string;
  currentValue: number;
  expectedValue: number;
  spikeMultiplier: number;
  timeWindow: string;
  affectedUsers: string[];
  estimatedCost: number;
}

export class RealTimeCostAlerts {
  private static instance: RealTimeCostAlerts;
  private alertConfigurations: Map<string, AlertConfiguration> = new Map();
  private budgetControls: Map<string, BudgetControl> = new Map();
  private activeAlerts: Map<string, RealTimeAlert> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertCooldowns: Map<string, Date> = new Map();
  private subscribers: Map<string, Set<(alert: RealTimeAlert) => void>> = new Map();

  static getInstance(): RealTimeCostAlerts {
    if (!RealTimeCostAlerts.instance) {
      RealTimeCostAlerts.instance = new RealTimeCostAlerts();
    }
    return RealTimeCostAlerts.instance;
  }

  private constructor() {
    this.initializeDefaultAlerts();
    this.loadAlertConfigurations();
    this.loadBudgetControls();
    this.startRealTimeMonitoring();
  }

  /**
   * Record a cost and immediately check for alerts
   */
  async recordCostAndCheck(costData: {
    userId: string;
    operationType: string;
    provider: string;
    cost: number;
    tokensUsed?: number;
    metadata?: Record<string, any>;
  }): Promise<string> {
    // Record the cost
    const costId = await comprehensiveCostTracker.recordCost(costData);

    // Immediately check for alerts
    await this.checkRealTimeAlerts(costData);

    // Check budget controls
    await this.checkBudgetControls(costData);

    // Check for anomalies
    await this.detectAnomalies(costData);

    return costId;
  }

  /**
   * Create a new alert configuration
   */
  async createAlertConfiguration(config: Omit<AlertConfiguration, 'id'>): Promise<string> {
    const id = `alert_config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alertConfig: AlertConfiguration = { ...config, id };
    this.alertConfigurations.set(id, alertConfig);

    // Store in database
    await prisma.ai_cost_alerts.create({
      data: {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: 'system',
        alert_type: config.type,
        severity: 'medium',
        title: config.name,
        message: config.description,
        current_spend: 0,
        period_start: new Date(),
        period_end: new Date(),
      },
    });

    console.log(`🚨 [REALTIME-ALERTS] Alert configuration created: ${config.name}`);
    return id;
  }

  /**
   * Create a budget control
   */
  async createBudgetControl(control: Omit<BudgetControl, 'id' | 'currentSpend'>): Promise<string> {
    const id = `budget_control_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const budgetControl: BudgetControl = { ...control, id, currentSpend: 0 };
    this.budgetControls.set(id, budgetControl);

    // Create budget in cost tracker
    await costTracker.createBudget({
      userId: control.userId || 'system',
      name: `${control.budgetType} Budget Control`,
      budgetType: control.budgetType,
      amount: control.limit,
      period: this.getBudgetPeriod(control.budgetType),
      alertThresholds: [control.warningThreshold, control.criticalThreshold],
      isActive: control.isActive,
    });

    console.log(`💰 [REALTIME-ALERTS] Budget control created: ${control.budgetType} - $${control.limit}`);
    return id;
  }

  /**
   * Subscribe to real-time alerts
   */
  subscribe(alertType: string, callback: (alert: RealTimeAlert) => void): () => void {
    if (!this.subscribers.has(alertType)) {
      this.subscribers.set(alertType, new Set());
    }
    this.subscribers.get(alertType)!.add(callback);

    return () => {
      this.subscribers.get(alertType)?.delete(callback);
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(userId?: string): RealTimeAlert[] {
    const alerts = Array.from(this.activeAlerts.values());
    return userId ? alerts.filter(a => a.userId === userId) : alerts;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    // Update in database
    await prisma.ai_cost_alerts.updateMany({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledged_at: new Date(),
      },
    });

    console.log(`✅ [REALTIME-ALERTS] Alert acknowledged: ${alert.title} by ${userId}`);
    return true;
  }

  private async checkRealTimeAlerts(costData: any): Promise<void> {
    for (const [configId, config] of this.alertConfigurations.entries()) {
      if (!config.isActive) continue;

      // Check cooldown
      if (this.isInCooldown(configId)) continue;

      const shouldAlert = await this.evaluateAlertCondition(config, costData);
      if (shouldAlert) {
        await this.triggerAlert(config, costData);
        this.setCooldown(configId);
      }
    }
  }

  private async evaluateAlertCondition(config: AlertConfiguration, costData: any): Promise<boolean> {
    for (const condition of config.conditions) {
      let value: number;
      let expectedValue: number = 0;

      switch (condition.metric) {
        case 'cost':
          value = costData.cost;
          break;
        case 'tokens':
          value = costData.tokensUsed || 0;
          break;
        case 'hourly_cost':
          value = await this.getHourlyCost(costData.userId);
          expectedValue = await this.getAverageHourlyCost(costData.userId);
          break;
        case 'daily_cost':
          value = await this.getDailyCost(costData.userId);
          break;
        default:
          continue;
      }

      let matches = false;

      switch (condition.operator) {
        case 'gt':
          matches = value > condition.value;
          break;
        case 'gte':
          matches = value >= condition.value;
          break;
        case 'lt':
          matches = value < condition.value;
          break;
        case 'lte':
          matches = value <= condition.value;
          break;
        case 'eq':
          matches = value === condition.value;
          break;
        case 'spike':
          const spikeMultiplier = condition.percentage || 300; // Default 3x
          matches = expectedValue > 0 && (value / expectedValue) > (spikeMultiplier / 100);
          break;
        case 'trend':
          // Would need more complex trend analysis
          matches = false;
          break;
      }

      if (!matches) return false;
    }

    return true;
  }

  private async triggerAlert(config: AlertConfiguration, costData: any): Promise<void> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alert: RealTimeAlert = {
      id: alertId,
      ruleId: config.id,
      ruleName: config.name,
      type: config.type,
      severity: this.getSeverityFromType(config.type),
      title: `Alert: ${config.name}`,
      message: this.generateAlertMessage(config, costData),
      metadata: { costData, config },
      userId: costData.userId,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.activeAlerts.set(alertId, alert);

    // Store in database
    await prisma.ai_cost_alerts.create({
      data: {
        id: alertId,
        user_id: costData.userId || 'system',
        alert_type: config.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        current_spend: costData.cost,
        period_start: new Date(),
        period_end: new Date(),
      },
    });

    // Execute actions
    await this.executeAlertActions(config.actions, alert, costData);

    // Notify subscribers
    this.notifySubscribers(alert.type, alert);

    // Update last triggered
    config.lastTriggered = new Date();

    console.log(`🚨 [REALTIME-ALERTS] Alert triggered: ${config.name}`);
  }

  private async executeAlertActions(actions: AlertAction[], alert: RealTimeAlert, costData: any): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case 'email':
          await this.sendEmailAlert(action.config.recipients || [], alert);
          break;
        case 'webhook':
          await this.sendWebhookAlert(action.config.url, alert);
          break;
        case 'slack':
          await this.sendSlackAlert(action.config, alert);
          break;
        case 'feature_flag':
          await this.updateFeatureFlag(action.config.flagKey, action.config.flagValue, alert);
          break;
        case 'rate_limit':
          await this.implementRateLimit(action.config.limit, costData.userId);
          break;
        case 'disable_feature':
          await this.disableFeature(action.config.feature, costData.userId);
          break;
      }
    }
  }

  private async checkBudgetControls(costData: any): Promise<void> {
    for (const [controlId, control] of this.budgetControls.entries()) {
      if (!control.isActive) continue;
      if (control.userId && control.userId !== costData.userId) continue;

      // Update current spend
      control.currentSpend = await this.getCurrentSpend(control.userId, control.budgetType);

      const utilizationPercentage = (control.currentSpend / control.limit) * 100;

      // Check thresholds
      if (utilizationPercentage >= 100) {
        await this.executeBudgetControlActions(control.actions.exceeded, control, 'exceeded');
      } else if (utilizationPercentage >= control.criticalThreshold) {
        await this.executeBudgetControlActions(control.actions.critical, control, 'critical');
      } else if (utilizationPercentage >= control.warningThreshold) {
        await this.executeBudgetControlActions(control.actions.warning, control, 'warning');
      }
    }
  }

  private async executeBudgetControlActions(
    actions: AlertAction[],
    control: BudgetControl,
    level: string
  ): Promise<void> {
    const alert: RealTimeAlert = {
      id: `budget_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: control.id,
      ruleName: `${control.budgetType} Budget ${level}`,
      type: 'budget',
      severity: level === 'exceeded' ? 'critical' : level === 'critical' ? 'error' : 'warning',
      title: `Budget ${level} for ${control.budgetType}`,
      message: `${control.budgetType} budget ${level}: $${control.currentSpend.toFixed(2)} of $${control.limit.toFixed(2)} (${((control.currentSpend / control.limit) * 100).toFixed(1)}%)`,
      metadata: { control, level },
      userId: control.userId,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.activeAlerts.set(alert.id, alert);

    // Execute actions
    await this.executeAlertActions(actions, alert, { currentSpend: control.currentSpend });

    console.log(`💰 [REALTIME-ALERTS] Budget control triggered: ${control.budgetType} - ${level}`);
  }

  private async detectAnomalies(costData: any): Promise<void> {
    // Detect cost spikes
    const currentHourlyCost = await this.getHourlyCost(costData.userId);
    const averageHourlyCost = await this.getAverageHourlyCost(costData.userId);
    
    if (averageHourlyCost > 0 && (currentHourlyCost / averageHourlyCost) > 3) {
      await this.createCostSpikeAlert({
        id: `spike_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        detectedAt: new Date(),
        metric: 'hourly_cost',
        currentValue: currentHourlyCost,
        expectedValue: averageHourlyCost,
        spikeMultiplier: currentHourlyCost / averageHourlyCost,
        timeWindow: '1h',
        affectedUsers: [costData.userId],
        estimatedCost: currentHourlyCost * 24, // Daily estimate
      });
    }

    // Detect unusual patterns
    const dailyCost = await this.getDailyCost(costData.userId);
    const averageDailyCost = await this.getAverageDailyCost(costData.userId);
    
    if (averageDailyCost > 0 && (dailyCost / averageDailyCost) > 5) {
      await this.createAnomalyAlert('unusual_daily_spend', {
        current: dailyCost,
        average: averageDailyCost,
        multiplier: dailyCost / averageDailyCost,
      }, costData.userId);
    }
  }

  private async createCostSikeAlert(spike: CostSpike): Promise<void> {
    const alert: RealTimeAlert = {
      id: `spike_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: 'anomaly_detection',
      ruleName: 'Cost Spike Detected',
      type: 'anomaly',
      severity: 'error',
      title: `Cost Spike Detected: ${spike.metric}`,
      message: `Unusual cost spike detected in ${spike.metric}: $${spike.currentValue.toFixed(2)} (${spike.spikeMultiplier.toFixed(1)}x normal)`,
      metadata: { spike },
      timestamp: new Date(),
      acknowledged: false,
    };

    this.activeAlerts.set(alert.id, alert);
    this.notifySubscribers('anomaly', alert);

    console.log(`📈 [REALTIME-ALERTS] Cost spike detected: ${spike.spikeMultiplier.toFixed(1)}x`);
  }

  private async createAnomalyAlert(type: string, data: any, userId?: string): Promise<void> {
    const alert: RealTimeAlert = {
      id: `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: 'anomaly_detection',
      ruleName: 'Unusual Pattern Detected',
      type: 'anomaly',
      severity: 'warning',
      title: `Unusual Pattern: ${type}`,
      message: `Unusual pattern detected: ${type}`,
      metadata: { type, data },
      userId,
      timestamp: new Date(),
      acknowledged: false,
    };

    this.activeAlerts.set(alert.id, alert);
    this.notifySubscribers('anomaly', alert);

    console.log(`🔍 [REALTIME-ALERTS] Anomaly detected: ${type}`);
  }

  private async getHourlyCost(userId?: string): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const whereClause: any = {
      timestamp: { gte: oneHourAgo },
    };
    if (userId) whereClause.user_id = userId;

    const result = await prisma.ai_cost_entries.aggregate({
      where: whereClause,
      _sum: { cost: true },
    });

    return Number(result._sum.cost || 0);
  }

  private async getDailyCost(userId?: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const whereClause: any = {
      timestamp: { gte: today },
    };
    if (userId) whereClause.user_id = userId;

    const result = await prisma.ai_cost_entries.aggregate({
      where: whereClause,
      _sum: { cost: true },
    });

    return Number(result._sum.cost || 0);
  }

  private async getAverageHourlyCost(userId?: string): Promise<number> {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const whereClause: any = {
      timestamp: { gte: last24Hours },
    };
    if (userId) whereClause.user_id = userId;

    const result = await prisma.ai_cost_entries.aggregate({
      where: whereClause,
      _sum: { cost: true },
    });

    const totalCost = Number(result._sum.cost || 0);
    return totalCost / 24; // Average per hour
  }

  private async getAverageDailyCost(userId?: string): Promise<number> {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const whereClause: any = {
      timestamp: { gte: last30Days },
    };
    if (userId) whereClause.user_id = userId;

    const result = await prisma.ai_cost_entries.aggregate({
      where: whereClause,
      _sum: { cost: true },
    });

    const totalCost = Number(result._sum.cost || 0);
    return totalCost / 30; // Average per day
  }

  private async getCurrentSpend(userId?: string, budgetType: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<number> {
    let startDate: Date;
    
    switch (budgetType) {
      case 'daily':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    const whereClause: any = {
      timestamp: { gte: startDate },
    };
    if (userId) whereClause.user_id = userId;

    const result = await prisma.ai_cost_entries.aggregate({
      where: whereClause,
      _sum: { cost: true },
    });

    return Number(result._sum.cost || 0);
  }

  private getBudgetPeriod(budgetType: 'daily' | 'weekly' | 'monthly'): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (budgetType) {
      case 'daily':
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 1);
        break;
      case 'weekly':
        start = new Date();
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 7);
        break;
      case 'monthly':
        start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
        break;
    }

    return { start, end };
  }

  private getSeverityFromType(type: string): RealTimeAlert['severity'] {
    switch (type) {
      case 'budget':
        return 'warning';
      case 'anomaly':
        return 'error';
      case 'threshold':
        return 'warning';
      case 'trend':
        return 'info';
      case 'rate':
        return 'error';
      default:
        return 'info';
    }
  }

  private generateAlertMessage(config: AlertConfiguration, costData: any): string {
    return `${config.description} - Cost: $${costData.cost.toFixed(4)} - User: ${costData.userId}`;
  }

  private notifySubscribers(alertType: string, alert: RealTimeAlert): void {
    const subscribers = this.subscribers.get(alertType);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          console.error('Error in alert subscriber:', error);
        }
      });
    }
  }

  private isInCooldown(configId: string): boolean {
    const cooldownEnd = this.alertCooldowns.get(configId);
    if (!cooldownEnd) return false;
    return new Date() < cooldownEnd;
  }

  private setCooldown(configId: string): void {
    const config = this.alertConfigurations.get(configId);
    if (config) {
      const cooldownEnd = new Date(Date.now() + config.cooldownPeriod * 60 * 1000);
      this.alertCooldowns.set(configId, cooldownEnd);
    }
  }

  // Action implementations
  private async sendEmailAlert(recipients: string[], alert: RealTimeAlert): Promise<void> {
    console.log(`📧 [REALTIME-ALERTS] Email alert sent to ${recipients.join(', ')}: ${alert.title}`);
    // Implementation would depend on email service
  }

  private async sendWebhookAlert(url: string, alert: RealTimeAlert): Promise<void> {
    console.log(`🔗 [REALTIME-ALERTS] Webhook alert sent to ${url}: ${alert.title}`);
    // Implementation would make HTTP request
  }

  private async sendSlackAlert(config: any, alert: RealTimeAlert): Promise<void> {
    console.log(`💬 [REALTIME-ALERTS] Slack alert sent: ${alert.title}`);
    // Implementation would use Slack API
  }

  private async updateFeatureFlag(flagKey: string, value: boolean, alert: RealTimeAlert): Promise<void> {
    try {
      await featureFlagService.updateFlag(flagKey, { enabled: value }, 'cost-alert');
      console.log(`🚩 [REALTIME-ALERTS] Feature flag ${flagKey} set to ${value} due to: ${alert.title}`);
    } catch (error) {
      console.error(`Failed to update feature flag ${flagKey}:`, error);
    }
  }

  private async implementRateLimit(limit: number, userId?: string): Promise<void> {
    console.log(`🚦 [REALTIME-ALERTS] Rate limit of ${limit} implemented for user ${userId}`);
    // Implementation would update rate limiting configuration
  }

  private async disableFeature(feature: string, userId?: string): Promise<void> {
    console.log(`🚫 [REALTIME-ALERTS] Feature ${feature} disabled for user ${userId}`);
    // Implementation would disable the feature
  }

  private initializeDefaultAlerts(): void {
    // Default high cost alert
    this.alertConfigurations.set('high_cost', {
      id: 'high_cost',
      name: 'High Cost Operation',
      description: 'Alert when a single operation cost exceeds $1.00',
      type: 'threshold',
      conditions: [
        { metric: 'cost', operator: 'gt', value: 1.00 },
      ],
      actions: [
        { type: 'email', config: { recipients: ['admin@example.com'] } },
        { type: 'feature_flag', config: { flagKey: 'ai-search-rate-limiting', flagValue: true } },
      ],
      isActive: true,
      cooldownPeriod: 60, // 1 hour
    });

    // Default cost spike alert
    this.alertConfigurations.set('cost_spike', {
      id: 'cost_spike',
      name: 'Cost Spike Detection',
      description: 'Alert when hourly cost spikes 3x above normal',
      type: 'anomaly',
      conditions: [
        { metric: 'hourly_cost', operator: 'spike', percentage: 300, timeWindow: '1h' },
      ],
      actions: [
        { type: 'slack', config: {} },
        { type: 'webhook', config: { url: process.env.COST_ALERT_WEBHOOK_URL } },
      ],
      isActive: true,
      cooldownPeriod: 30, // 30 minutes
    });
  }

  private async loadAlertConfigurations(): Promise<void> {
    // Load from database
    const configs = await prisma.ai_cost_alerts.findMany({
      where: { user_id: 'system' },
    });

    // Convert to AlertConfiguration format
    // Implementation would depend on actual database schema
  }

  private async loadBudgetControls(): Promise<void> {
    // Load from database
    const budgets = await prisma.ai_cost_budgets.findMany({
      where: { is_active: true },
    });

    // Convert to BudgetControl format
    // Implementation would depend on actual database schema
  }

  private startRealTimeMonitoring(): void {
    // Check for alerts every minute
    this.monitoringInterval = setInterval(async () => {
      try {
        // Check for system-wide alerts
        await this.checkSystemWideAlerts();
        
        // Clean up old alerts
        await this.cleanupOldAlerts();
      } catch (error) {
        console.error('Real-time monitoring error:', error);
      }
    }, 60 * 1000);

    console.log('✅ [REALTIME-ALERTS] Real-time monitoring started');
  }

  private async checkSystemWideAlerts(): Promise<void> {
    // Check system-wide metrics
    const systemHourlyCost = await this.getHourlyCost();
    if (systemHourlyCost > 50) {
      await this.createSystemAlert('high_system_cost', {
        metric: 'hourly_cost',
        value: systemHourlyCost,
        threshold: 50,
      });
    }
  }

  private async createSystemAlert(type: string, data: any): Promise<void> {
    const alert: RealTimeAlert = {
      id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: 'system_monitoring',
      ruleName: 'System Alert',
      type: 'system',
      severity: 'warning',
      title: `System Alert: ${type}`,
      message: `System-wide alert: ${type}`,
      metadata: { type, data },
      timestamp: new Date(),
      acknowledged: false,
    };

    this.activeAlerts.set(alert.id, alert);
    this.notifySubscribers('system', alert);

    console.log(`🖥️ [REALTIME-ALERTS] System alert: ${type}`);
  }

  private async cleanupOldAlerts(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.timestamp < cutoffDate && alert.acknowledged) {
        this.activeAlerts.delete(alertId);
      }
    }
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 [REALTIME-ALERTS] Real-time monitoring stopped');
    }
  }
}

// Export singleton instance
export const realTimeCostAlerts = RealTimeCostAlerts.getInstance();

// Export utility functions
export async function recordCostWithAlerts(costData: {
  userId: string;
  operationType: string;
  provider: string;
  cost: number;
  tokensUsed?: number;
  metadata?: Record<string, any>;
}): Promise<string> {
  return realTimeCostAlerts.recordCostAndCheck(costData);
}

export function subscribeToCostAlerts(alertType: string, callback: (alert: RealTimeAlert) => void): () => void {
  return realTimeCostAlerts.subscribe(alertType, callback);
}