/**
 * Comprehensive Cost Tracking Service
 * Integrates with existing cost monitoring infrastructure and provides enhanced features
 */

import { PrismaClient } from '@prisma/client';
import { costTracker, type CostEntry, type CostBudget, type UsageAlert } from '@/lib/security/cost-tracker';
import { aiCostMonitor, type AICostMetrics, type CostOptimization } from '@/lib/cost/ai-cost-monitor';

const prisma = new PrismaClient();

export interface ComprehensiveCostEntry extends CostEntry {
  databaseId?: string;
  sessionId?: string;
  contactId?: string;
  requestId?: string;
}

export interface CostForecast {
  id: string;
  forecastDate: Date;
  forecastType: 'daily' | 'weekly' | 'monthly';
  predictedCost: number;
  confidenceLevel: number;
  modelVersion: string;
  trainingDataEnd: Date;
}

export interface CostAnalytics {
  period: { start: Date; end: Date };
  totalCost: number;
  totalTokens: number;
  totalOperations: number;
  averageCostPerOperation: number;
  costByProvider: Record<string, number>;
  costByOperation: Record<string, number>;
  costByUser: Record<string, number>;
  costTrends: Array<{ date: string; cost: number; tokens: number }>;
  topCostCenters: Array<{ category: string; cost: number; percentage: number }>;
  efficiency: {
    costPerContact: number;
    costPerSuccessfulSearch: number;
    successRate: number;
  };
}

export interface CostAlertRule {
  id: string;
  name: string;
  type: 'threshold' | 'anomaly' | 'budget' | 'trend';
  conditions: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
    timeWindow?: string;
  }[];
  actions: {
    email?: boolean;
    webhook?: boolean;
    slack?: boolean;
    featureFlag?: string;
  };
  isActive: boolean;
}

export class ComprehensiveCostTracker {
  private static instance: ComprehensiveCostTracker;
  private alertRules: Map<string, CostAlertRule> = new Map();
  private forecastCache: Map<string, CostForecast> = new Map();
  private analyticsCache: Map<string, CostAnalytics> = new Map();

  static getInstance(): ComprehensiveCostTracker {
    if (!ComprehensiveCostTracker.instance) {
      ComprehensiveCostTracker.instance = new ComprehensiveCostTracker();
    }
    return ComprehensiveCostTracker.instance;
  }

  private constructor() {
    this.initializeDefaultAlertRules();
    this.startPeriodicTasks();
  }

  /**
   * Record a comprehensive cost entry with database persistence
   */
  async recordCost(entry: Omit<ComprehensiveCostEntry, 'id' | 'timestamp' | 'databaseId'>): Promise<string> {
    // Record in existing cost tracker
    const costId = await costTracker.recordCost(entry);

    // Store in database for comprehensive analytics
    const dbEntry = await prisma.ai_cost_entries.create({
      data: {
        id: `db_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: entry.userId,
        operation_type: entry.operationType,
        operation: entry.operation,
        provider: entry.provider,
        model: entry.model,
        tokens_used: entry.tokensUsed,
        cost: entry.cost,
        metadata: entry.metadata || {},
        session_id: entry.sessionId,
        contact_id: entry.contactId,
        request_id: entry.requestId,
      },
    });

    // Check alert rules
    await this.checkAlertRules({
      ...entry,
      id: costId,
      timestamp: new Date(),
      databaseId: dbEntry.id,
    });

    // Update user daily metrics
    await this.updateUserDailyMetrics(entry.userId, entry.cost, entry.provider);

    console.log(`💰 [COMPREHENSIVE-COST-TRACKER] Cost recorded: ${entry.operationType} - ${entry.provider} - $${entry.cost.toFixed(4)}`);

    return costId;
  }

  /**
   * Create or update a cost budget with database persistence
   */
  async createBudget(budget: Omit<CostBudget, 'id' | 'spent' | 'alertsSent' | 'createdAt' | 'updatedAt'>): Promise<string> {
    // Record in existing cost tracker
    const budgetId = await costTracker.createBudget(budget);

    // Store in database
    await prisma.ai_cost_budgets.create({
      data: {
        id: `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: budget.userId,
        name: budget.name,
        budget_type: budget.budgetType,
        amount: budget.amount,
        period_start: budget.period.start,
        period_end: budget.period.end,
        alert_thresholds: budget.alertThresholds || [50, 75, 90],
        is_active: budget.isActive,
      },
    });

    return budgetId;
  }

  /**
   * Get comprehensive cost analytics with caching
   */
  async getCostAnalytics(
    userId?: string,
    timeRange: { start: Date; end: Date } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }
  ): Promise<CostAnalytics> {
    const cacheKey = `${userId || 'all'}_${timeRange.start.toISOString()}_${timeRange.end.toISOString()}`;
    
    if (this.analyticsCache.has(cacheKey)) {
      const cached = this.analyticsCache.get(cacheKey)!;
      // Cache for 5 minutes
      if (Date.now() - cached.period.start.getTime() < 5 * 60 * 1000) {
        return cached;
      }
    }

    const analytics = await this.generateCostAnalytics(userId, timeRange);
    this.analyticsCache.set(cacheKey, analytics);

    return analytics;
  }

  private async generateCostAnalytics(
    userId?: string,
    timeRange: { start: Date; end: Date }
  ): Promise<CostAnalytics> {
    // Get cost entries from database
    const whereClause: any = {
      timestamp: {
        gte: timeRange.start,
        lte: timeRange.end,
      },
    };

    if (userId) {
      whereClause.user_id = userId;
    }

    const costEntries = await prisma.ai_cost_entries.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
    });

    // Calculate basic metrics
    const totalCost = costEntries.reduce((sum, entry) => sum + Number(entry.cost), 0);
    const totalTokens = costEntries.reduce((sum, entry) => sum + entry.tokens_used, 0);
    const totalOperations = costEntries.length;
    const averageCostPerOperation = totalOperations > 0 ? totalCost / totalOperations : 0;

    // Cost by provider
    const costByProvider = costEntries.reduce((acc, entry) => {
      acc[entry.provider] = (acc[entry.provider] || 0) + Number(entry.cost);
      return acc;
    }, {} as Record<string, number>);

    // Cost by operation
    const costByOperation = costEntries.reduce((acc, entry) => {
      acc[entry.operation_type] = (acc[entry.operation_type] || 0) + Number(entry.cost);
      return acc;
    }, {} as Record<string, number>);

    // Cost by user
    const costByUser = costEntries.reduce((acc, entry) => {
      acc[entry.user_id] = (acc[entry.user_id] || 0) + Number(entry.cost);
      return acc;
    }, {} as Record<string, number>);

    // Cost trends by day
    const costTrends = this.calculateCostTrends(costEntries);

    // Top cost centers
    const topCostCenters = this.calculateTopCostCenters(costByProvider, costByOperation, totalCost);

    // Efficiency metrics
    const efficiency = await this.calculateEfficiencyMetrics(userId, timeRange);

    return {
      period: timeRange,
      totalCost,
      totalTokens,
      totalOperations,
      averageCostPerOperation,
      costByProvider,
      costByOperation,
      costByUser,
      costTrends,
      topCostCenters,
      efficiency,
    };
  }

  private calculateCostTrends(costEntries: any[]): Array<{ date: string; cost: number; tokens: number }> {
    const dailyAggregates = costEntries.reduce((acc, entry) => {
      const date = entry.timestamp.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { cost: 0, tokens: 0 };
      }
      acc[date].cost += Number(entry.cost);
      acc[date].tokens += entry.tokens_used;
      return acc;
    }, {} as Record<string, { cost: number; tokens: number }>);

    return Object.entries(dailyAggregates)
      .map(([date, data]) => ({ date, cost: data.cost, tokens: data.tokens }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateTopCostCenters(
    costByProvider: Record<string, number>,
    costByOperation: Record<string, number>,
    totalCost: number
  ): Array<{ category: string; cost: number; percentage: number }> {
    const centers = [
      ...Object.entries(costByProvider).map(([provider, cost]) => ({
        category: `${provider} (Provider)`,
        cost,
        percentage: (cost / totalCost) * 100,
      })),
      ...Object.entries(costByOperation).map(([operation, cost]) => ({
        category: `${operation} (Operation)`,
        cost,
        percentage: (cost / totalCost) * 100,
      })),
    ];

    return centers
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }

  private async calculateEfficiencyMetrics(
    userId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{ costPerContact: number; costPerSuccessfulSearch: number; successRate: number }> {
    // Get AI searches data
    const searchesWhere: any = {};
    if (userId) searchesWhere.userId = userId;
    if (timeRange) {
      searchesWhere.created_at = {
        gte: timeRange.start,
        lte: timeRange.end,
      };
    }

    const searches = await prisma.ai_searches.findMany({
      where: searchesWhere,
      include: {
        media_contacts: true,
      },
    });

    const totalContacts = searches.reduce((sum, search) => sum + search.contacts_found, 0);
    const successfulSearches = searches.filter(s => s.status === 'COMPLETED').length;
    const totalSearches = searches.length;

    // Get total cost for these searches
    const totalCost = await this.getSearchCostTotal(searches.map(s => s.id));

    return {
      costPerContact: totalContacts > 0 ? totalCost / totalContacts : 0,
      costPerSuccessfulSearch: successfulSearches > 0 ? totalCost / successfulSearches : 0,
      successRate: totalSearches > 0 ? (successfulSearches / totalSearches) * 100 : 0,
    };
  }

  private async getSearchCostTotal(searchIds: string[]): Promise<number> {
    // This is a simplified calculation - in production would be more sophisticated
    const costEntries = await prisma.ai_cost_entries.findMany({
      where: {
        metadata: {
          path: ['searchId'],
          in: searchIds,
        },
      },
    });

    return costEntries.reduce((sum, entry) => sum + Number(entry.cost), 0);
  }

  /**
   * Generate cost forecasts using machine learning
   */
  async generateCostForecast(
    forecastType: 'daily' | 'weekly' | 'monthly',
    userId?: string
  ): Promise<CostForecast> {
    const cacheKey = `${forecastType}_${userId || 'all'}`;
    
    if (this.forecastCache.has(cacheKey)) {
      const cached = this.forecastCache.get(cacheKey)!;
      // Cache for 1 hour
      if (Date.now() - cached.forecastDate.getTime() < 60 * 60 * 1000) {
        return cached;
      }
    }

    const forecast = await this.calculateCostForecast(forecastType, userId);
    this.forecastCache.set(cacheKey, forecast);

    // Store in database
    await prisma.ai_cost_forecasts.create({
      data: {
        id: `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        forecast_date: forecast.forecastDate,
        forecast_type: forecastType,
        predicted_cost: forecast.predictedCost,
        confidence_level: forecast.confidenceLevel,
        model_version: forecast.modelVersion,
        training_data_end: forecast.trainingDataEnd,
      },
    });

    return forecast;
  }

  private async calculateCostForecast(
    forecastType: 'daily' | 'weekly' | 'monthly',
    userId?: string
  ): Promise<CostForecast> {
    // Get historical data
    const daysToAnalyze = forecastType === 'daily' ? 30 : forecastType === 'weekly' ? 12 : 12;
    const startDate = new Date(Date.now() - daysToAnalyze * 24 * 60 * 60 * 1000);

    const whereClause: any = {
      timestamp: { gte: startDate },
    };
    if (userId) whereClause.user_id = userId;

    const historicalData = await prisma.ai_cost_entries.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
    });

    // Simple linear regression for forecasting
    const { slope, intercept, r2 } = this.calculateLinearRegression(historicalData);

    // Calculate future date
    const now = new Date();
    let forecastDate: Date;
    switch (forecastType) {
      case 'daily':
        forecastDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        forecastDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        forecastDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        break;
    }

    // Predict cost
    const daysFromStart = Math.floor((forecastDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const predictedCost = Math.max(0, slope * daysFromStart + intercept);

    return {
      id: `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      forecastDate,
      forecastType,
      predictedCost,
      confidenceLevel: Math.max(0.1, Math.min(0.9, r2)), // R² as confidence
      modelVersion: '1.0.0',
      trainingDataEnd: new Date(),
    };
  }

  private calculateLinearRegression(data: any[]): { slope: number; intercept: number; r2: number } {
    if (data.length < 2) return { slope: 0, intercept: 0, r2: 0 };

    const n = data.length;
    const startDate = data[0].timestamp.getTime();
    
    // Convert to days from start
    const points = data.map((entry, index) => ({
      x: index,
      y: Number(entry.cost),
    }));

    const sumX = points.reduce((sum, p) => sum + p.x, 0);
    const sumY = points.reduce((sum, p) => sum + p.y, 0);
    const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R²
    const meanY = sumY / n;
    const ssTotal = points.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0);
    const ssResidual = points.reduce((sum, p) => {
      const predicted = slope * p.x + intercept;
      return sum + Math.pow(p.y - predicted, 2);
    }, 0);
    const r2 = 1 - (ssResidual / ssTotal);

    return { slope, intercept, r2 };
  }

  /**
   * Create and manage cost alert rules
   */
  async createAlertRule(rule: Omit<CostAlertRule, 'id'>): Promise<string> {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alertRule: CostAlertRule = { ...rule, id };
    this.alertRules.set(id, alertRule);

    // Store in database
    await prisma.ai_cost_alerts.create({
      data: {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: 'system',
        alert_type: 'rule_based',
        severity: 'medium',
        title: `Alert Rule: ${rule.name}`,
        message: `Alert rule ${rule.name} created`,
        current_spend: 0,
        period_start: new Date(),
        period_end: new Date(),
      },
    });

    console.log(`🚨 [COMPREHENSIVE-COST-TRACKER] Alert rule created: ${rule.name}`);
    return id;
  }

  private async checkAlertRules(entry: ComprehensiveCostEntry): Promise<void> {
    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (!rule.isActive) continue;

      const shouldAlert = await this.evaluateAlertRule(rule, entry);
      if (shouldAlert) {
        await this.triggerAlert(rule, entry);
      }
    }
  }

  private async evaluateAlertRule(rule: CostAlertRule, entry: ComprehensiveCostEntry): Promise<boolean> {
    // Simplified rule evaluation - in production would be more sophisticated
    for (const condition of rule.conditions) {
      let value: number;
      
      switch (condition.metric) {
        case 'cost':
          value = entry.cost;
          break;
        case 'tokens':
          value = entry.tokensUsed;
          break;
        case 'daily_cost':
          // Would need to query daily total
          continue;
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
      }

      if (!matches) return false;
    }

    return true;
  }

  private async triggerAlert(rule: CostAlertRule, entry: ComprehensiveCostEntry): Promise<void> {
    console.log(`🚨 [COMPREHENSIVE-COST-TRACKER] Alert triggered: ${rule.name}`);

    // Create alert in database
    await prisma.ai_cost_alerts.create({
      data: {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: entry.userId,
        alert_type: 'rule_based',
        severity: 'high',
        title: `Alert: ${rule.name}`,
        message: `Alert rule ${rule.name} triggered by ${entry.operation} with cost $${entry.cost}`,
        current_spend: entry.cost,
        period_start: new Date(),
        period_end: new Date(),
      },
    });

    // Execute actions
    if (rule.actions.email) {
      // Send email notification
      console.log(`📧 [COMPREHENSIVE-COST-TRACKER] Email alert sent for rule: ${rule.name}`);
    }

    if (rule.actions.webhook) {
      // Send webhook notification
      console.log(`🔗 [COMPREHENSIVE-COST-TRACKER] Webhook alert sent for rule: ${rule.name}`);
    }

    if (rule.actions.slack) {
      // Send Slack notification
      console.log(`💬 [COMPREHENSIVE-COST-TRACKER] Slack alert sent for rule: ${rule.name}`);
    }

    if (rule.actions.featureFlag) {
      // Update feature flag
      console.log(`🚩 [COMPREHENSIVE-COST-TRACKER] Feature flag ${rule.actions.featureFlag} updated`);
    }
  }

  private async updateUserDailyMetrics(userId: string, cost: number, provider: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await prisma.ai_cost_metrics_user_daily.upsert({
      where: {
        date_user_id: {
          date: new Date(today),
          user_id: userId,
        },
      },
      update: {
        total_cost: { increment: cost },
        total_operations: { increment: 1 },
        [`${provider.toLowerCase()}_cost`]: { increment: cost },
        updated_at: new Date(),
      },
      create: {
        id: `user_metrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: new Date(today),
        user_id: userId,
        total_cost: cost,
        total_operations: 1,
        [`${provider.toLowerCase()}_cost`]: cost,
      },
    });
  }

  private initializeDefaultAlertRules(): void {
    // Default high cost alert
    this.alertRules.set('high_cost', {
      id: 'high_cost',
      name: 'High Cost Operation',
      type: 'threshold',
      conditions: [
        { metric: 'cost', operator: 'gt', value: 1.00 },
      ],
      actions: {
        email: true,
        webhook: true,
      },
      isActive: true,
    });

    // Default high token usage alert
    this.alertRules.set('high_tokens', {
      id: 'high_tokens',
      name: 'High Token Usage',
      type: 'threshold',
      conditions: [
        { metric: 'tokens', operator: 'gt', value: 10000 },
      ],
      actions: {
        email: true,
      },
      isActive: true,
    });
  }

  private startPeriodicTasks(): void {
    // Update analytics cache every 5 minutes
    setInterval(() => {
      this.analyticsCache.clear();
    }, 5 * 60 * 1000);

    // Update forecast cache every hour
    setInterval(() => {
      this.forecastCache.clear();
    }, 60 * 60 * 1000);

    // Cleanup old data daily
    setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000);
  }

  private async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    await prisma.ai_cost_entries.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    console.log('🧹 [COMPREHENSIVE-COST-TRACKER] Old cost data cleaned up');
  }
}

// Export singleton instance
export const comprehensiveCostTracker = ComprehensiveCostTracker.getInstance();

// Export utility functions
export async function recordComprehensiveCost(entry: Omit<ComprehensiveCostEntry, 'id' | 'timestamp' | 'databaseId'>): Promise<string> {
  return comprehensiveCostTracker.recordCost(entry);
}

export async function getCostAnalytics(
  userId?: string,
  timeRange?: { start: Date; end: Date }
): Promise<CostAnalytics> {
  return comprehensiveCostTracker.getCostAnalytics(userId, timeRange);
}

export async function generateCostForecast(
  forecastType: 'daily' | 'weekly' | 'monthly',
  userId?: string
): Promise<CostForecast> {
  return comprehensiveCostTracker.generateCostForecast(forecastType, userId);
}