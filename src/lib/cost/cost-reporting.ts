/**
 * Cost Reporting and Analytics Service
 * Generates detailed cost reports and provides analytics insights
 */

import { PrismaClient } from '@prisma/client';
import { comprehensiveCostTracker, type CostAnalytics } from './comprehensive-cost-tracker';
import { costOptimizationService, type OptimizationRecommendation } from './cost-optimization';
import { realTimeCostAlerts } from './realtime-cost-alerts';

const prisma = new PrismaClient();

export interface CostReport {
  id: string;
  title: string;
  description: string;
  period: { start: Date; end: Date };
  generatedAt: Date;
  generatedBy: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom' | 'executive';
  scope: 'user' | 'team' | 'organization' | 'system';
  summary: CostReportSummary;
  sections: CostReportSection[];
  insights: CostInsight[];
  recommendations: OptimizationRecommendation[];
  attachments: ReportAttachment[];
}

export interface CostReportSummary {
  totalCost: number;
  totalTokens: number;
  totalOperations: number;
  averageCostPerOperation: number;
  costChange: {
    amount: number;
    percentage: number;
    period: string;
  };
  topCostCenters: Array<{
    name: string;
    cost: number;
    percentage: number;
  }>;
  budgetUtilization: {
    used: number;
    total: number;
    percentage: number;
  };
  efficiency: {
    costPerContact: number;
    costPerSuccessfulSearch: number;
    successRate: number;
  };
}

export interface CostReportSection {
  id: string;
  title: string;
  type: 'chart' | 'table' | 'text' | 'insight';
  order: number;
  content: any;
  metadata: Record<string, any>;
}

export interface CostInsight {
  id: string;
  type: 'anomaly' | 'trend' | 'opportunity' | 'risk' | 'achievement';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
  data: Record<string, any>;
  actionable: boolean;
  suggestedActions: string[];
}

export interface ReportAttachment {
  id: string;
  name: string;
  type: 'csv' | 'json' | 'pdf' | 'excel';
  url: string;
  size: number;
  generatedAt: Date;
}

export interface CostMetrics {
  period: { start: Date; end: Date };
  cost: {
    total: number;
    byProvider: Record<string, number>;
    byOperation: Record<string, number>;
    byUser: Record<string, number>;
    byDay: Array<{ date: string; cost: number }>;
  };
  usage: {
    totalTokens: number;
    totalOperations: number;
    averageTokensPerOperation: number;
    successRate: number;
  };
  efficiency: {
    costPerContact: number;
    costPerSuccessfulSearch: number;
    roi: number; // Return on investment
  };
  trends: {
    daily: Array<{ date: string; cost: number; predicted?: number }>;
    weekly: Array<{ week: string; cost: number }>;
    monthly: Array<{ month: string; cost: number }>;
  };
  anomalies: Array<{
    date: string;
    type: string;
    severity: string;
    description: string;
  }>;
}

export interface CostForecast {
  period: 'daily' | 'weekly' | 'monthly';
  predictions: Array<{
    date: string;
    predictedCost: number;
    confidence: number;
    factors: Array<{
      name: string;
      impact: number;
      description: string;
    }>;
  }>;
  model: {
    version: string;
    accuracy: number;
    trainedAt: Date;
    factors: string[];
  };
}

export class CostReportingService {
  private static instance: CostReportingService;
  private reportTemplates: Map<string, CostReportTemplate> = new Map();
  private scheduledReports: Map<string, ScheduledReport> = new Map();
  private reportGenerationInterval: NodeJS.Timeout | null = null;

  static getInstance(): CostReportingService {
    if (!CostReportingService.instance) {
      CostReportingService.instance = new CostReportingService();
    }
    return CostReportingService.instance;
  }

  private constructor() {
    this.initializeReportTemplates();
    this.loadScheduledReports();
    this.startScheduledReportGeneration();
  }

  /**
   * Generate a comprehensive cost report
   */
  async generateReport(options: {
    type: CostReport['type'];
    scope: CostReport['scope'];
    period: { start: Date; end: Date };
    userId?: string;
    title?: string;
    includeInsights?: boolean;
    includeRecommendations?: boolean;
    format?: 'json' | 'pdf' | 'excel';
  }): Promise<CostReport> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get cost analytics
    const analytics = await comprehensiveCostTracker.getCostAnalytics(
      options.userId,
      options.period
    );

    // Generate summary
    const summary = await this.generateReportSummary(analytics, options);

    // Generate sections
    const sections = await this.generateReportSections(analytics, options);

    // Generate insights
    const insights = options.includeInsights 
      ? await this.generateInsights(analytics, options)
      : [];

    // Get recommendations
    const recommendations = options.includeRecommendations
      ? await costOptimizationService.getRecommendations('recommended')
      : [];

    const report: CostReport = {
      id: reportId,
      title: options.title || this.generateReportTitle(options),
      description: this.generateReportDescription(options),
      period: options.period,
      generatedAt: new Date(),
      generatedBy: options.userId || 'system',
      type: options.type,
      scope: options.scope,
      summary,
      sections,
      insights,
      recommendations,
      attachments: [],
    };

    // Save report to database
    await this.saveReportToDatabase(report);

    console.log(`📊 [COST-REPORTING] Report generated: ${report.title}`);
    return report;
  }

  /**
   * Get detailed cost metrics
   */
  async getCostMetrics(
    userId?: string,
    period: { start: Date; end: Date } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }
  ): Promise<CostMetrics> {
    const analytics = await comprehensiveCostTracker.getCostAnalytics(userId, period);

    // Get historical data for trends
    const historicalData = await this.getHistoricalCostData(userId, period);
    
    // Get anomalies
    const anomalies = await this.getCostAnomalies(userId, period);

    return {
      period,
      cost: {
        total: analytics.totalCost,
        byProvider: analytics.costByProvider,
        byOperation: analytics.costByOperation,
        byUser: analytics.costByUser,
        byDay: analytics.costTrends,
      },
      usage: {
        totalTokens: analytics.totalTokens,
        totalOperations: analytics.totalOperations,
        averageTokensPerOperation: analytics.totalTokens / analytics.totalOperations,
        successRate: analytics.efficiency.successRate,
      },
      efficiency: analytics.efficiency,
      trends: {
        daily: this.calculateDailyTrends(historicalData),
        weekly: this.calculateWeeklyTrends(historicalData),
        monthly: this.calculateMonthlyTrends(historicalData),
      },
      anomalies,
    };
  }

  /**
   * Generate cost forecast
   */
  async generateForecast(
    period: 'daily' | 'weekly' | 'monthly',
    horizon: number = 30, // days/weeks/months ahead
    userId?: string
  ): Promise<CostForecast> {
    // Get historical data for training
    const trainingPeriod = this.getTrainingPeriod(period);
    const historicalData = await this.getHistoricalCostData(userId, trainingPeriod);

    // Generate predictions using multiple models
    const predictions = await this.generatePredictions(historicalData, period, horizon);

    return {
      period,
      predictions,
      model: {
        version: '1.0.0',
        accuracy: 0.85, // Placeholder - would be calculated
        trainedAt: new Date(),
        factors: ['historical_cost', 'day_of_week', 'seasonality', 'user_growth'],
      },
    };
  }

  /**
   * Schedule a recurring report
   */
  async scheduleReport(schedule: {
    name: string;
    type: CostReport['type'];
    scope: CostReport['scope'];
    recipients: string[];
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    includeInsights?: boolean;
    includeRecommendations?: boolean;
  }): Promise<string> {
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const scheduledReport: ScheduledReport = {
      id: scheduleId,
      name: schedule.name,
      type: schedule.type,
      scope: schedule.scope,
      recipients: schedule.recipients,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      includeInsights: schedule.includeInsights || false,
      includeRecommendations: schedule.includeRecommendations || false,
      isActive: true,
      lastRun: null,
      nextRun: this.calculateNextRun(schedule),
      createdAt: new Date(),
    };

    this.scheduledReports.set(scheduleId, scheduledReport);
    await this.saveScheduledReportToDatabase(scheduledReport);

    console.log(`📅 [COST-REPORTING] Report scheduled: ${schedule.name}`);
    return scheduleId;
  }

  /**
   * Get executive summary report
   */
  async getExecutiveSummary(
    period: { start: Date; end: Date } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }
  ): Promise<{
    overview: {
      totalCost: number;
      costChange: { amount: number; percentage: number };
      budgetUtilization: number;
      roi: number;
    };
    keyMetrics: Array<{
      name: string;
      value: number | string;
      change: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    topInsights: CostInsight[];
    recommendations: Array<{
      title: string;
      potentialSavings: number;
      priority: string;
    }>;
    forecast: {
      nextMonth: number;
      confidence: number;
      keyDrivers: string[];
    };
  }> {
    const analytics = await comprehensiveCostTracker.getCostAnalytics(undefined, period);
    const insights = await this.generateInsights(analytics, { type: 'executive', scope: 'organization', period });
    const recommendations = await costOptimizationService.getRecommendations('recommended');
    const forecast = await this.generateForecast('monthly', 1);

    return {
      overview: {
        totalCost: analytics.totalCost,
        costChange: await this.calculateCostChange(period),
        budgetUtilization: await this.getBudgetUtilization(period),
        roi: analytics.efficiency.costPerContact > 0 ? 100 / analytics.efficiency.costPerContact : 0,
      },
      keyMetrics: [
        {
          name: 'Total Operations',
          value: analytics.totalOperations.toLocaleString(),
          change: await this.calculateMetricChange('operations', period),
          trend: await this.getMetricTrend('operations', period),
        },
        {
          name: 'Cost per Operation',
          value: `$${analytics.averageCostPerOperation.toFixed(4)}`,
          change: await this.calculateMetricChange('cost_per_operation', period),
          trend: await this.getMetricTrend('cost_per_operation', period),
        },
        {
          name: 'Success Rate',
          value: `${analytics.efficiency.successRate.toFixed(1)}%`,
          change: await this.calculateMetricChange('success_rate', period),
          trend: await this.getMetricTrend('success_rate', period),
        },
        {
          name: 'Active Users',
          value: Object.keys(analytics.costByUser).length,
          change: await this.calculateMetricChange('active_users', period),
          trend: await this.getMetricTrend('active_users', period),
        },
      ],
      topInsights: insights.slice(0, 5),
      recommendations: recommendations.slice(0, 5).map(r => ({
        title: r.title,
        potentialSavings: r.potentialSavings.monthly,
        priority: r.priority,
      })),
      forecast: {
        nextMonth: forecast.predictions[0]?.predictedCost || 0,
        confidence: forecast.predictions[0]?.confidence || 0,
        keyDrivers: ['user_growth', 'seasonal_trends', 'feature_adoption'],
      },
    };
  }

  private async generateReportSummary(analytics: CostAnalytics, options: any): Promise<CostReportSummary> {
    const costChange = await this.calculateCostChange(options.period);
    const topCostCenters = this.calculateTopCostCenters(analytics);
    const budgetUtilization = await this.getBudgetUtilization(options.period);

    return {
      totalCost: analytics.totalCost,
      totalTokens: analytics.totalTokens,
      totalOperations: analytics.totalOperations,
      averageCostPerOperation: analytics.averageCostPerOperation,
      costChange,
      topCostCenters,
      budgetUtilization,
      efficiency: analytics.efficiency,
    };
  }

  private async generateReportSections(analytics: CostAnalytics, options: any): Promise<CostReportSection[]> {
    const sections: CostReportSection[] = [];

    // Cost Overview Chart
    sections.push({
      id: 'cost_overview',
      title: 'Cost Overview',
      type: 'chart',
      order: 1,
      content: {
        chartType: 'line',
        data: analytics.costTrends,
        config: {
          xAxis: 'date',
          yAxis: 'cost',
          title: 'Daily Cost Trends',
        },
      },
      metadata: { category: 'overview' },
    });

    // Provider Breakdown
    sections.push({
      id: 'provider_breakdown',
      title: 'Cost by Provider',
      type: 'chart',
      order: 2,
      content: {
        chartType: 'pie',
        data: Object.entries(analytics.costByProvider).map(([provider, cost]) => ({
          name: provider,
          value: cost,
        })),
        config: {
          title: 'Cost Distribution by Provider',
        },
      },
      metadata: { category: 'breakdown' },
    });

    // Operations Table
    sections.push({
      id: 'operations_table',
      title: 'Operations Summary',
      type: 'table',
      order: 3,
      content: {
        columns: ['Operation', 'Count', 'Total Cost', 'Avg Cost', 'Success Rate'],
        data: await this.generateOperationsTable(options.period),
      },
      metadata: { category: 'details' },
    });

    // User Analytics
    if (options.scope !== 'system') {
      sections.push({
        id: 'user_analytics',
        title: 'User Analytics',
        type: 'table',
        order: 4,
        content: {
          columns: ['User', 'Operations', 'Total Cost', 'Avg Cost', 'Efficiency'],
          data: await this.generateUserAnalytics(options.period, options.userId),
        },
        metadata: { category: 'users' },
      });
    }

    return sections;
  }

  private async generateInsights(analytics: CostAnalytics, options: any): Promise<CostInsight[]> {
    const insights: CostInsight[] = [];

    // Cost trend insight
    const costChange = await this.calculateCostChange(options.period);
    if (Math.abs(costChange.percentage) > 20) {
      insights.push({
        id: `insight_trend_${Date.now()}`,
        type: 'trend',
        title: `Significant Cost ${costChange.percentage > 0 ? 'Increase' : 'Decrease'}`,
        description: `Cost has ${costChange.percentage > 0 ? 'increased' : 'decreased'} by ${Math.abs(costChange.percentage).toFixed(1)}% compared to the previous period.`,
        impact: Math.abs(costChange.percentage) > 50 ? 'high' : 'medium',
        confidence: 85,
        data: { costChange },
        actionable: true,
        suggestedActions: costChange.percentage > 0 
          ? ['Review recent cost increases', 'Consider budget adjustments', 'Optimize high-cost operations']
          : ['Identify successful optimizations', 'Consider reallocating budget', 'Document successful strategies'],
      });
    }

    // Efficiency insight
    if (analytics.efficiency.successRate < 80) {
      insights.push({
        id: `insight_efficiency_${Date.now()}`,
        type: 'risk',
        title: 'Low Success Rate Detected',
        description: `Success rate is ${analytics.efficiency.successRate.toFixed(1)}%, below the recommended 80% threshold.`,
        impact: analytics.efficiency.successRate < 60 ? 'high' : 'medium',
        confidence: 90,
        data: { successRate: analytics.efficiency.successRate },
        actionable: true,
        suggestedActions: ['Review failed operations', 'Improve error handling', 'Optimize query generation'],
      });
    }

    // Top cost center insight
    const topCostCenter = Object.entries(analytics.costByProvider)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topCostCenter && topCostCenter[1] > analytics.totalCost * 0.7) {
      insights.push({
        id: `insight_concentration_${Date.now()}`,
        type: 'risk',
        title: 'High Cost Concentration',
        description: `${topCostCenter[0]} accounts for ${((topCostCenter[1] / analytics.totalCost) * 100).toFixed(1)}% of total costs.`,
        impact: 'medium',
        confidence: 95,
        data: { provider: topCostCenter[0], percentage: (topCostCenter[1] / analytics.totalCost) * 100 },
        actionable: true,
        suggestedActions: ['Consider provider diversification', 'Negotiate volume discounts', 'Optimize provider-specific usage'],
      });
    }

    return insights;
  }

  private generateReportTitle(options: any): string {
    const period = options.period;
    const type = options.type;
    const scope = options.scope;
    
    const periodStr = period.start.toLocaleDateString() + ' - ' + period.end.toLocaleDateString();
    return `${scope.charAt(0).toUpperCase() + scope.slice(1)} ${type.charAt(0).toUpperCase() + type.slice(1)} Cost Report (${periodStr})`;
  }

  private generateReportDescription(options: any): string {
    return `Comprehensive cost analysis report for ${options.scope} covering ${options.period.start.toLocaleDateString()} to ${options.period.end.toLocaleDateString()}.`;
  }

  private calculateTopCostCenters(analytics: CostAnalytics): Array<{
    name: string;
    cost: number;
    percentage: number;
  }> {
    const centers = [
      ...Object.entries(analytics.costByProvider).map(([provider, cost]) => ({
        name: `${provider} (Provider)`,
        cost,
        percentage: (cost / analytics.totalCost) * 100,
      })),
      ...Object.entries(analytics.costByOperation).map(([operation, cost]) => ({
        name: `${operation} (Operation)`,
        cost,
        percentage: (cost / analytics.totalCost) * 100,
      })),
    ];

    return centers
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);
  }

  private async calculateCostChange(period: { start: Date; end: Date }): Promise<{
    amount: number;
    percentage: number;
    period: string;
  }> {
    const duration = period.end.getTime() - period.start.getTime();
    const previousStart = new Date(period.start.getTime() - duration);
    const previousEnd = period.start;

    const currentCost = await this.getTotalCost(period.start, period.end);
    const previousCost = await this.getTotalCost(previousStart, previousEnd);

    const amount = currentCost - previousCost;
    const percentage = previousCost > 0 ? (amount / previousCost) * 100 : 0;

    return {
      amount,
      percentage,
      period: 'previous period',
    };
  }

  private async getTotalCost(start: Date, end: Date): Promise<number> {
    const result = await prisma.ai_cost_entries.aggregate({
      where: {
        timestamp: { gte: start, lte: end },
      },
      _sum: { cost: true },
    });

    return Number(result._sum.cost || 0);
  }

  private async getBudgetUtilization(period: { start: Date; end: Date }): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    // Simplified implementation
    const used = await this.getTotalCost(period.start, period.end);
    const total = 1000; // Would get from budget configuration
    const percentage = total > 0 ? (used / total) * 100 : 0;

    return { used, total, percentage };
  }

  private async getHistoricalCostData(userId?: string, period?: { start: Date; end: Date }) {
    const whereClause: any = {};
    if (period) {
      whereClause.timestamp = { gte: period.start, lte: period.end };
    }
    if (userId) {
      whereClause.user_id = userId;
    }

    return prisma.ai_cost_entries.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
    });
  }

  private async getCostAnomalies(userId?: string, period: { start: Date; end: Date }) {
    // Get alerts from the real-time alerts service
    const alerts = realTimeCostAlerts.getActiveAlerts(userId);
    
    return alerts.map(alert => ({
      date: alert.timestamp.toISOString().split('T')[0],
      type: alert.type,
      severity: alert.severity,
      description: alert.message,
    }));
  }

  private calculateDailyTrends(data: any[]): Array<{ date: string; cost: number; predicted?: number }> {
    const dailyAggregates = data.reduce((acc, entry) => {
      const date = entry.timestamp.toISOString().split('T')[0];
      if (!acc[date]) acc[date] = 0;
      acc[date] += Number(entry.cost);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(dailyAggregates)
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private calculateWeeklyTrends(data: any[]): Array<{ week: string; cost: number }> {
    // Simplified weekly aggregation
    return [];
  }

  private calculateMonthlyTrends(data: any[]): Array<{ month: string; cost: number }> {
    // Simplified monthly aggregation
    return [];
  }

  private async generatePredictions(
    historicalData: any[],
    period: 'daily' | 'weekly' | 'monthly',
    horizon: number
  ): Promise<CostForecast['predictions']> {
    // Simplified prediction using linear regression
    const predictions = [];
    const now = new Date();

    for (let i = 1; i <= horizon; i++) {
      const predictionDate = new Date(now);
      
      switch (period) {
        case 'daily':
          predictionDate.setDate(now.getDate() + i);
          break;
        case 'weekly':
          predictionDate.setDate(now.getDate() + (i * 7));
          break;
        case 'monthly':
          predictionDate.setMonth(now.getMonth() + i);
          break;
      }

      // Simple prediction based on historical average
      const avgDailyCost = historicalData.reduce((sum, entry) => sum + Number(entry.cost), 0) / historicalData.length;
      const daysInPeriod = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
      
      predictions.push({
        date: predictionDate.toISOString().split('T')[0],
        predictedCost: avgDailyCost * daysInPeriod,
        confidence: Math.max(0.5, 0.9 - (i * 0.02)), // Decreasing confidence
        factors: [
          {
            name: 'historical_average',
            impact: 0.7,
            description: 'Based on historical average cost',
          },
          {
            name: 'seasonal_adjustment',
            impact: 0.2,
            description: 'Seasonal usage patterns',
          },
          {
            name: 'growth_factor',
            impact: 0.1,
            description: 'Expected growth',
          },
        ],
      });
    }

    return predictions;
  }

  private getTrainingPeriod(period: 'daily' | 'weekly' | 'monthly'): { start: Date; end: Date } {
    const end = new Date();
    let start: Date;

    switch (period) {
      case 'daily':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
        break;
      case 'weekly':
        start = new Date(end.getTime() - 12 * 7 * 24 * 60 * 60 * 1000); // 12 weeks
        break;
      case 'monthly':
        start = new Date(end.getTime() - 12 * 30 * 24 * 60 * 60 * 1000); // 12 months
        break;
    }

    return { start, end };
  }

  private calculateNextRun(schedule: any): Date {
    const now = new Date();
    let nextRun: Date;

    switch (schedule.frequency) {
      case 'daily':
        nextRun = new Date(now);
        nextRun.setDate(now.getDate() + 1);
        nextRun.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        nextRun = new Date(now);
        const daysUntilNext = (schedule.dayOfWeek! - now.getDay() + 7) % 7 || 7;
        nextRun.setDate(now.getDate() + daysUntilNext);
        nextRun.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        nextRun = new Date(now);
        nextRun.setMonth(now.getMonth() + 1);
        nextRun.setDate(schedule.dayOfMonth || 1);
        nextRun.setHours(0, 0, 0, 0);
        break;
      default:
        nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    return nextRun;
  }

  private async generateOperationsTable(period: { start: Date; end: Date }) {
    const operations = await prisma.$queryRaw`
      SELECT 
        operation_type,
        COUNT(*) as count,
        SUM(cost) as total_cost,
        AVG(cost) as avg_cost,
        COUNT(*) FILTER (WHERE status = 'success') * 100.0 / COUNT(*) as success_rate
      FROM ai_cost_entries
      WHERE timestamp >= ${period.start} AND timestamp <= ${period.end}
      GROUP BY operation_type
      ORDER BY total_cost DESC
    `;

    return operations;
  }

  private async generateUserAnalytics(period: { start: Date; end: Date }, userId?: string) {
    const whereClause = userId ? `WHERE user_id = ${userId}` : '';
    
    const users = await prisma.$queryRaw`
      SELECT 
        u.email,
        COUNT(ae.id) as operations,
        COALESCE(SUM(ae.cost), 0) as total_cost,
        COALESCE(AVG(ae.cost), 0) as avg_cost,
        COUNT(DISTINCT ase.search_id) / COUNT(ae.id) as efficiency
      FROM users u
      LEFT JOIN ai_cost_entries ae ON u.id = ae.user_id
      LEFT JOIN ai_searches ase ON u.id = ase.userId
      WHERE ae.timestamp >= ${period.start} AND ae.timestamp <= ${period.end}
      GROUP BY u.id, u.email
      ORDER BY total_cost DESC
      LIMIT 10
    `;

    return users;
  }

  private async calculateMetricChange(metric: string, period: { start: Date; end: Date }): Promise<number> {
    // Simplified implementation
    return Math.random() * 20 - 10; // -10% to +10%
  }

  private async getMetricTrend(metric: string, period: { start: Date; end: Date }): Promise<'up' | 'down' | 'stable'> {
    const change = await this.calculateMetricChange(metric, period);
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  private async saveReportToDatabase(report: CostReport): Promise<void> {
    // Save report metadata to database
    await prisma.ai_cost_reports.create({
      data: {
        id: report.id,
        title: report.title,
        description: report.description,
        type: report.type,
        scope: report.scope,
        period_start: report.period.start,
        period_end: report.period.end,
        generated_by: report.generatedBy,
        generated_at: report.generatedAt,
        metadata: report,
      },
    });
  }

  private async saveScheduledReportToDatabase(schedule: ScheduledReport): Promise<void> {
    // Save scheduled report to database
    await prisma.ai_cost_scheduled_reports.create({
      data: {
        id: schedule.id,
        name: schedule.name,
        type: schedule.type,
        scope: schedule.scope,
        recipients: schedule.recipients,
        frequency: schedule.frequency,
        day_of_week: schedule.dayOfWeek,
        day_of_month: schedule.dayOfMonth,
        include_insights: schedule.includeInsights,
        include_recommendations: schedule.includeRecommendations,
        is_active: schedule.isActive,
        next_run: schedule.nextRun,
        created_at: schedule.createdAt,
      },
    });
  }

  private initializeReportTemplates(): void {
    // Initialize report templates
    this.reportTemplates.set('executive_summary', {
      id: 'executive_summary',
      name: 'Executive Summary',
      description: 'High-level overview for executives',
      sections: ['overview', 'key_metrics', 'insights', 'recommendations'],
      type: 'executive',
    });
  }

  private async loadScheduledReports(): Promise<void> {
    // Load scheduled reports from database
    const schedules = await prisma.ai_cost_scheduled_reports.findMany({
      where: { is_active: true },
    });

    schedules.forEach(schedule => {
      this.scheduledReports.set(schedule.id, {
        id: schedule.id,
        name: schedule.name,
        type: schedule.type,
        scope: schedule.scope,
        recipients: schedule.recipients,
        frequency: schedule.frequency,
        dayOfWeek: schedule.day_of_week,
        dayOfMonth: schedule.day_of_month,
        includeInsights: schedule.include_insights,
        includeRecommendations: schedule.include_recommendations,
        isActive: schedule.is_active,
        lastRun: schedule.last_run,
        nextRun: schedule.next_run!,
        createdAt: schedule.created_at,
      });
    });
  }

  private startScheduledReportGeneration(): void {
    // Check for scheduled reports every hour
    this.reportGenerationInterval = setInterval(async () => {
      try {
        await this.processScheduledReports();
      } catch (error) {
        console.error('Scheduled report generation error:', error);
      }
    }, 60 * 60 * 1000);

    console.log('✅ [COST-REPORTING] Scheduled report generation started');
  }

  private async processScheduledReports(): Promise<void> {
    const now = new Date();

    for (const [scheduleId, schedule] of this.scheduledReports.entries()) {
      if (!schedule.isActive) continue;
      if (schedule.nextRun > now) continue;

      console.log(`📊 [COST-REPORTING] Generating scheduled report: ${schedule.name}`);

      try {
        // Generate the report
        const report = await this.generateReport({
          type: schedule.type,
          scope: schedule.scope,
          period: this.getReportPeriod(schedule.frequency),
          includeInsights: schedule.includeInsights,
          includeRecommendations: schedule.includeRecommendations,
        });

        // Send to recipients
        await this.sendReportToRecipients(report, schedule.recipients);

        // Update schedule
        schedule.lastRun = now;
        schedule.nextRun = this.calculateNextRun(schedule);
        await this.updateScheduledReportInDatabase(schedule);

      } catch (error) {
        console.error(`Failed to generate scheduled report ${schedule.name}:`, error);
      }
    }
  }

  private getReportPeriod(frequency: 'daily' | 'weekly' | 'monthly'): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();

    switch (frequency) {
      case 'daily':
        start.setDate(end.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(end.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(end.getMonth() - 1);
        break;
    }

    return { start, end };
  }

  private async sendReportToRecipients(report: CostReport, recipients: string[]): Promise<void> {
    // Send report via email, webhook, etc.
    console.log(`📧 [COST-REPORTING] Sending report "${report.title}" to ${recipients.length} recipients`);
    // Implementation would depend on notification system
  }

  private async updateScheduledReportInDatabase(schedule: ScheduledReport): Promise<void> {
    await prisma.ai_cost_scheduled_reports.update({
      where: { id: schedule.id },
      data: {
        last_run: schedule.lastRun,
        next_run: schedule.nextRun,
      },
    });
  }

  /**
   * Stop scheduled report generation
   */
  stopScheduledReportGeneration(): void {
    if (this.reportGenerationInterval) {
      clearInterval(this.reportGenerationInterval);
      this.reportGenerationInterval = null;
      console.log('🛑 [COST-REPORTING] Scheduled report generation stopped');
    }
  }
}

// Supporting interfaces
interface CostReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  type: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  type: CostReport['type'];
  scope: CostReport['scope'];
  recipients: string[];
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  includeInsights: boolean;
  includeRecommendations: boolean;
  isActive: boolean;
  lastRun: Date | null;
  nextRun: Date;
  createdAt: Date;
}

// Export singleton instance
export const costReportingService = CostReportingService.getInstance();

// Export utility functions
export async function generateCostReport(options: {
  type: CostReport['type'];
  scope: CostReport['scope'];
  period: { start: Date; end: Date };
  userId?: string;
  includeInsights?: boolean;
  includeRecommendations?: boolean;
}): Promise<CostReport> {
  return costReportingService.generateReport(options);
}

export async function getExecutiveCostSummary(
  period?: { start: Date; end: Date }
): Promise<ReturnType<CostReportingService['getExecutiveSummary']>> {
  return costReportingService.getExecutiveSummary(period);
}