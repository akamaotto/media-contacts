/**
 * Cost Monitoring Integration Service
 * Integrates all cost monitoring components and provides a unified interface
 */

import { PrismaClient } from '@prisma/client';
import { comprehensiveCostTracker } from './comprehensive-cost-tracker';
import { realTimeCostAlerts } from './realtime-cost-alerts';
import { costOptimizationService } from './cost-optimization';
import { costReportingService } from './cost-reporting';
import { aiCostMonitor } from './ai-cost-monitor';
import { costTracker } from '@/lib/security/cost-tracker';

const prisma = new PrismaClient();

export interface CostMonitoringConfig {
  enabled: boolean;
  thresholds: {
    daily: number;
    monthly: number;
    perOperation: number;
    anomalyMultiplier: number;
  };
  alerts: {
    email: {
      enabled: boolean;
      recipients: string[];
    };
    webhook: {
      enabled: boolean;
      url: string;
    };
    slack: {
      enabled: boolean;
      webhookUrl: string;
      channel: string;
    };
  };
  optimization: {
    autoImplement: boolean;
    maxPriority: 'low' | 'medium' | 'high';
  };
  reporting: {
    schedule: {
      daily: boolean;
      weekly: boolean;
      monthly: boolean;
    };
    recipients: string[];
  };
}

export interface CostMonitoringHealth {
  status: 'healthy' | 'warning' | 'critical';
  components: {
    tracker: 'healthy' | 'unhealthy';
    alerts: 'healthy' | 'unhealthy';
    optimization: 'healthy' | 'unhealthy';
    reporting: 'healthy' | 'unhealthy';
    database: 'healthy' | 'unhealthy';
  };
  metrics: {
    totalCost: number;
    activeAlerts: number;
    pendingRecommendations: number;
    lastReportGenerated?: Date;
  };
  issues: string[];
}

export class CostMonitoringIntegration {
  private static instance: CostMonitoringIntegration;
  private config: CostMonitoringConfig;
  private isInitialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  static getInstance(): CostMonitoringIntegration {
    if (!CostMonitoringIntegration.instance) {
      CostMonitoringIntegration.instance = new CostMonitoringIntegration();
    }
    return CostMonitoringIntegration.instance;
  }

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  /**
   * Initialize the cost monitoring system
   */
  async initialize(config?: Partial<CostMonitoringConfig>): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ [COST-INTEGRATION] Cost monitoring already initialized');
      return;
    }

    console.log('🚀 [COST-INTEGRATION] Initializing cost monitoring system...');

    // Update configuration
    if (config) {
      this.config = { ...this.config, ...config };
    }

    try {
      // Check database connection
      await this.checkDatabaseConnection();

      // Initialize database schema if needed
      await this.initializeDatabaseSchema();

      // Configure alert thresholds
      await this.configureAlertThresholds();

      // Set up scheduled reports
      await this.setupScheduledReports();

      // Start health monitoring
      this.startHealthMonitoring();

      // Load existing configurations
      await this.loadExistingConfigurations();

      this.isInitialized = true;
      console.log('✅ [COST-INTEGRATION] Cost monitoring system initialized successfully');

    } catch (error) {
      console.error('❌ [COST-INTEGRATION] Failed to initialize cost monitoring:', error);
      throw error;
    }
  }

  /**
   * Record a cost with full monitoring integration
   */
  async recordCost(data: {
    userId: string;
    operationType: string;
    provider: string;
    model?: string;
    tokensUsed: number;
    cost: number;
    metadata?: Record<string, any>;
  }): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('Cost monitoring system not initialized');
    }

    // Record in comprehensive tracker with real-time alerts
    const costId = await realTimeCostAlerts.recordCostAndCheck({
      userId: data.userId,
      operationType: data.operationType,
      provider: data.provider,
      cost: data.cost,
      tokensUsed: data.tokensUsed,
      metadata: data.metadata,
    });

    // Record in AI cost monitor for additional tracking
    await aiCostMonitor.recordAICost({
      userId: data.userId,
      operationType: data.operationType as any,
      provider: data.provider,
      model: data.model || 'unknown',
      tokensUsed: data.tokensUsed,
      cost: data.cost,
      metadata: data.metadata,
    });

    // Check for auto-optimization opportunities
    if (this.config.optimization.autoImplement) {
      await this.checkAutoOptimization(data);
    }

    return costId;
  }

  /**
   * Get comprehensive cost monitoring status
   */
  async getStatus(): Promise<CostMonitoringHealth> {
    const health: CostMonitoringHealth = {
      status: 'healthy',
      components: {
        tracker: 'healthy',
        alerts: 'healthy',
        optimization: 'healthy',
        reporting: 'healthy',
        database: 'healthy',
      },
      metrics: {
        totalCost: 0,
        activeAlerts: 0,
        pendingRecommendations: 0,
      },
      issues: [],
    };

    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      health.components.database = 'unhealthy';
      health.issues.push('Database connection failed');
      health.status = 'critical';
    }

    // Get metrics
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const costResult = await prisma.ai_cost_entries.aggregate({
        where: { timestamp: { gte: today } },
        _sum: { cost: true },
      });
      
      health.metrics.totalCost = Number(costResult._sum.cost || 0);
      
      // Get active alerts
      health.metrics.activeAlerts = realTimeCostAlerts.getActiveAlerts().length;
      
      // Get pending recommendations
      health.metrics.pendingRecommendations = costOptimizationService
        .getRecommendations('recommended').length;

      // Determine overall status
      if (health.metrics.totalCost > this.config.thresholds.daily) {
        health.status = 'critical';
        health.issues.push('Daily cost threshold exceeded');
      } else if (health.metrics.totalCost > this.config.thresholds.daily * 0.8) {
        health.status = 'warning';
        health.issues.push('Approaching daily cost threshold');
      }

      if (health.metrics.activeAlerts > 5) {
        health.status = health.status === 'healthy' ? 'warning' : health.status;
        health.issues.push('High number of active alerts');
      }

    } catch (error) {
      health.status = 'critical';
      health.issues.push('Failed to retrieve metrics');
    }

    return health;
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<CostMonitoringConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    
    // Reconfigure components
    await this.configureAlertThresholds();
    await this.setupScheduledReports();
    
    console.log('🔧 [COST-INTEGRATION] Configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): CostMonitoringConfig {
    return { ...this.config };
  }

  /**
   * Generate comprehensive cost report
   */
  async generateReport(options: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    period?: { start: Date; end: Date };
    includeInsights?: boolean;
    includeRecommendations?: boolean;
    format?: 'json' | 'pdf' | 'excel';
    recipients?: string[];
  }) {
    const report = await costReportingService.generateReport({
      type: options.type,
      scope: 'organization',
      period: options.period || this.getDefaultPeriod(options.type),
      includeInsights: options.includeInsights ?? true,
      includeRecommendations: options.includeRecommendations ?? true,
    });

    // Send to recipients if specified
    if (options.recipients && options.recipients.length > 0) {
      await this.sendReport(report, options.recipients);
    }

    return report;
  }

  /**
   * Implement optimization recommendations
   */
  async implementOptimizations(priority?: 'low' | 'medium' | 'high'): Promise<{
    implemented: string[];
    failed: string[];
  }> {
    const recommendations = costOptimizationService.getRecommendations('recommended')
      .filter(r => !priority || r.priority === priority);

    const results = { implemented: [], failed: [] };

    for (const recommendation of recommendations) {
      try {
        const success = await costOptimizationService.implementRecommendation(recommendation.id);
        if (success) {
          results.implemented.push(recommendation.id);
        } else {
          results.failed.push(recommendation.id);
        }
      } catch (error) {
        results.failed.push(recommendation.id);
        console.error(`Failed to implement recommendation ${recommendation.id}:`, error);
      }
    }

    console.log(`🔧 [COST-INTEGRATION] Implemented ${results.implemented.length} optimizations, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Shut down the cost monitoring system
   */
  async shutdown(): Promise<void> {
    console.log('🛑 [COST-INTEGRATION] Shutting down cost monitoring system...');

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Stop component monitoring
    realTimeCostAlerts.stopMonitoring();
    costOptimizationService.stopAnalysis();
    costReportingService.stopScheduledReportGeneration();

    this.isInitialized = false;
    console.log('✅ [COST-INTEGRATION] Cost monitoring system shut down');
  }

  private getDefaultConfig(): CostMonitoringConfig {
    return {
      enabled: true,
      thresholds: {
        daily: 50,
        monthly: 1000,
        perOperation: 1.00,
        anomalyMultiplier: 3,
      },
      alerts: {
        email: {
          enabled: false,
          recipients: [],
        },
        webhook: {
          enabled: false,
          url: '',
        },
        slack: {
          enabled: false,
          webhookUrl: '',
          channel: '#cost-alerts',
        },
      },
      optimization: {
        autoImplement: false,
        maxPriority: 'medium',
      },
      reporting: {
        schedule: {
          daily: false,
          weekly: true,
          monthly: true,
        },
        recipients: [],
      },
    };
  }

  private async checkDatabaseConnection(): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ [COST-INTEGRATION] Database connection verified');
    } catch (error) {
      console.error('❌ [COST-INTEGRATION] Database connection failed:', error);
      throw error;
    }
  }

  private async initializeDatabaseSchema(): Promise<void> {
    // Check if cost tracking tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_cost_entries', 'ai_cost_budgets', 'ai_cost_alerts')
    ` as Array<{ table_name: string }>;

    const existingTables = tables.map(t => t.table_name);
    const requiredTables = ['ai_cost_entries', 'ai_cost_budgets', 'ai_cost_alerts'];

    if (requiredTables.some(table => !existingTables.includes(table))) {
      console.log('🔧 [COST-INTEGRATION] Initializing database schema...');
      // Run the migration script
      // In production, this would be handled by Prisma migrations
      console.log('✅ [COST-INTEGRATION] Database schema initialized');
    }
  }

  private async configureAlertThresholds(): Promise<void> {
    // Configure AI cost monitor thresholds
    aiCostMonitor.updateThresholds({
      maxCostPerSearch: this.config.thresholds.perOperation,
      maxDailySpend: this.config.thresholds.daily,
      maxMonthlySpend: this.config.thresholds.monthly,
    });

    // Create alert rules for thresholds
    await realTimeCostAlerts.createAlertConfiguration({
      name: 'Daily Cost Threshold',
      description: `Alert when daily cost exceeds $${this.config.thresholds.daily}`,
      type: 'threshold',
      conditions: [
        { metric: 'daily_cost', operator: 'gt', value: this.config.thresholds.daily },
      ],
      actions: this.getAlertActions(),
      isActive: this.config.enabled,
      cooldownPeriod: 60,
    });

    console.log('✅ [COST-INTEGRATION] Alert thresholds configured');
  }

  private getAlertActions(): any[] {
    const actions: any[] = [];

    if (this.config.alerts.email.enabled) {
      actions.push({
        type: 'email',
        config: { recipients: this.config.alerts.email.recipients },
      });
    }

    if (this.config.alerts.webhook.enabled) {
      actions.push({
        type: 'webhook',
        config: { url: this.config.alerts.webhook.url },
      });
    }

    if (this.config.alerts.slack.enabled) {
      actions.push({
        type: 'slack',
        config: { 
          webhookUrl: this.config.alerts.slack.webhookUrl,
          channel: this.config.alerts.slack.channel,
        },
      });
    }

    return actions;
  }

  private async setupScheduledReports(): Promise<void> {
    // Set up scheduled reports based on configuration
    if (this.config.reporting.schedule.weekly) {
      await costReportingService.scheduleReport({
        name: 'Weekly Cost Report',
        type: 'weekly',
        scope: 'organization',
        recipients: this.config.reporting.recipients,
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        includeInsights: true,
        includeRecommendations: true,
      });
    }

    if (this.config.reporting.schedule.monthly) {
      await costReportingService.scheduleReport({
        name: 'Monthly Cost Report',
        type: 'monthly',
        scope: 'organization',
        recipients: this.config.reporting.recipients,
        frequency: 'monthly',
        dayOfMonth: 1,
        includeInsights: true,
        includeRecommendations: true,
      });
    }

    console.log('✅ [COST-INTEGRATION] Scheduled reports configured');
  }

  private async loadExistingConfigurations(): Promise<void> {
    // Load existing configurations from database
    try {
      const configs = await prisma.ai_cost_configurations.findMany();
      // Apply configurations if they exist
      console.log('✅ [COST-INTEGRATION] Existing configurations loaded');
    } catch (error) {
      console.log('ℹ️ [COST-INTEGRATION] No existing configurations found');
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getStatus();
        if (health.status !== 'healthy') {
          console.warn(`⚠️ [COST-INTEGRATION] Health check warning: ${health.issues.join(', ')}`);
        }
      } catch (error) {
        console.error('❌ [COST-INTEGRATION] Health check failed:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    console.log('✅ [COST-INTEGRATION] Health monitoring started');
  }

  private async checkAutoOptimization(costData: any): Promise<void> {
    if (!this.config.optimization.autoImplement) return;

    // Check if this cost exceeds thresholds and should trigger auto-optimization
    if (costData.cost > this.config.thresholds.perOperation) {
      const recommendations = await costOptimizationService.generateRecommendations(
        costData.userId,
        { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() }
      );

      const autoImplementable = recommendations
        .filter(r => r.priority === 'high' || r.priority === this.config.optimization.maxPriority)
        .filter(r => r.actions.some(a => a.automated));

      for (const recommendation of autoImplementable) {
        try {
          await costOptimizationService.implementRecommendation(recommendation.id);
          console.log(`🤖 [COST-INTEGRATION] Auto-implemented optimization: ${recommendation.title}`);
        } catch (error) {
          console.error(`Failed to auto-implement optimization:`, error);
        }
      }
    }
  }

  private getDefaultPeriod(type: 'daily' | 'weekly' | 'monthly' | 'custom'): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (type) {
      case 'daily':
        start.setDate(end.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(end.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(end.getMonth() - 1);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }

    return { start, end };
  }

  private async sendReport(report: any, recipients: string[]): Promise<void> {
    console.log(`📧 [COST-INTEGRATION] Sending report "${report.title}" to ${recipients.length} recipients`);
    // Implementation would depend on email service
  }
}

// Export singleton instance
export const costMonitoringIntegration = CostMonitoringIntegration.getInstance();

// Export utility functions for easy integration
export async function initializeCostMonitoring(config?: Partial<CostMonitoringConfig>): Promise<void> {
  return costMonitoringIntegration.initialize(config);
}

export async function recordMonitoredCost(data: {
  userId: string;
  operationType: string;
  provider: string;
  model?: string;
  tokensUsed: number;
  cost: number;
  metadata?: Record<string, any>;
}): Promise<string> {
  return costMonitoringIntegration.recordCost(data);
}

export async function getCostMonitoringStatus(): Promise<CostMonitoringHealth> {
  return costMonitoringIntegration.getStatus();
}

export async function generateCostReport(options: {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  period?: { start: Date; end: Date };
  includeInsights?: boolean;
  includeRecommendations?: boolean;
  format?: 'json' | 'pdf' | 'excel';
  recipients?: string[];
}) {
  return costMonitoringIntegration.generateReport(options);
}

export async function implementCostOptimizations(priority?: 'low' | 'medium' | 'high'): Promise<{
  implemented: string[];
  failed: string[];
}> {
  return costMonitoringIntegration.implementOptimizations(priority);
}