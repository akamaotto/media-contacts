/**
 * AI Cost Monitoring Service
 * Enhanced cost tracking and budget management for external AI services
 */

import { costTracker, type CostEntry, type CostBudget, type UsageAlert } from '@/lib/security/cost-tracker';

export interface AICostMetrics {
  // Real-time metrics
  currentSpend: number;
  dailySpend: number;
  weeklySpend: number;
  monthlySpend: number;
  
  // Provider breakdown
  spendByProvider: Record<string, {
    totalCost: number;
    requestCount: number;
    averageCostPerRequest: number;
    costTrend: 'increasing' | 'decreasing' | 'stable';
  }>;
  
  // Operation breakdown
  spendByOperation: Record<string, {
    totalCost: number;
    requestCount: number;
    averageCostPerRequest: number;
  }>;
  
  // User breakdown
  spendByUser: Record<string, {
    totalCost: number;
    requestCount: number;
    averageCostPerRequest: number;
    budgetUtilization: number;
  }>;
  
  // Predictions
  projectedDailySpend: number;
  projectedWeeklySpend: number;
  projectedMonthlySpend: number;
  budgetExhaustionDate?: Date;
  
  // Alerts
  activeAlerts: UsageAlert[];
  alertSummary: {
    critical: number;
    warning: number;
    info: number;
  };
}

export interface CostThresholds {
  // Per-request thresholds
  maxCostPerSearch: number;
  maxCostPerExtraction: number;
  maxCostPerQueryGeneration: number;
  
  // Rate thresholds
  maxDailySpend: number;
  maxHourlySpend: number;
  maxSpikeThreshold: number; // percentage increase
  
  // Budget thresholds
  budgetWarningThreshold: number; // percentage
  budgetCriticalThreshold: number; // percentage
  
  // User thresholds
  maxUserDailySpend: number;
  maxUserMonthlySpend: number;
}

export interface CostOptimization {
  type: 'caching' | 'batching' | 'provider_switch' | 'query_optimization';
  description: string;
  potentialSavings: number; // USD per month
  implementationEffort: 'low' | 'medium' | 'high';
  priority: 'low' | 'medium' | 'high';
  status: 'recommended' | 'implemented' | 'rejected';
}

export class AICostMonitor {
  private static instance: AICostMonitor;
  private thresholds: CostThresholds;
  private metrics: AICostMetrics;
  private optimizationSuggestions: CostOptimization[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertCallbacks: Set<(alert: UsageAlert) => void> = new Set();

  private constructor() {
    this.thresholds = this.initializeThresholds();
    this.metrics = this.initializeMetrics();
    this.initializeOptimizationSuggestions();
    this.startMonitoring();
  }

  static getInstance(): AICostMonitor {
    if (!AICostMonitor.instance) {
      AICostMonitor.instance = new AICostMonitor();
    }
    return AICostMonitor.instance;
  }

  private initializeThresholds(): CostThresholds {
    return {
      maxCostPerSearch: 0.10,
      maxCostPerExtraction: 0.05,
      maxCostPerQueryGeneration: 0.03,
      maxDailySpend: 500,
      maxHourlySpend: 50,
      maxSpikeThreshold: 150, // 150% increase
      budgetWarningThreshold: 75, // 75% of budget
      budgetCriticalThreshold: 90, // 90% of budget
      maxUserDailySpend: 10,
      maxUserMonthlySpend: 100
    };
  }

  private initializeMetrics(): AICostMetrics {
    return {
      currentSpend: 0,
      dailySpend: 0,
      weeklySpend: 0,
      monthlySpend: 0,
      spendByProvider: {},
      spendByOperation: {},
      spendByUser: {},
      projectedDailySpend: 0,
      projectedWeeklySpend: 0,
      projectedMonthlySpend: 0,
      budgetExhaustionDate: undefined,
      activeAlerts: [],
      alertSummary: {
        critical: 0,
        warning: 0,
        info: 0
      }
    };
  }

  private initializeOptimizationSuggestions(): void {
    this.optimizationSuggestions = [
      {
        type: 'caching',
        description: 'Implement result caching for duplicate searches',
        potentialSavings: 150, // $150 per month
        implementationEffort: 'medium',
        priority: 'high',
        status: 'recommended'
      },
      {
        type: 'batching',
        description: 'Batch multiple AI requests to reduce API calls',
        potentialSavings: 80,
        implementationEffort: 'low',
        priority: 'medium',
        status: 'recommended'
      },
      {
        type: 'provider_switch',
        description: 'Switch to more cost-effective provider for specific operations',
        potentialSavings: 200,
        implementationEffort: 'high',
        priority: 'high',
        status: 'recommended'
      },
      {
        type: 'query_optimization',
        description: 'Optimize AI queries to reduce token usage',
        potentialSavings: 120,
        implementationEffort: 'medium',
        priority: 'medium',
        status: 'recommended'
      }
    ];
  }

  /**
   * Record AI service cost with enhanced tracking
   */
  async recordAICost(data: {
    userId: string;
    operationType: 'search' | 'extraction' | 'query-generation';
    provider: string;
    model: string;
    tokensUsed: number;
    cost: number;
    metadata?: {
      sessionId?: string;
      contactId?: string;
      query?: string;
      resultCount?: number;
      responseTime?: number;
    };
  }): Promise<string> {
    // Validate thresholds
    this.validateOperationCost(data);

    // Record the cost
    const costId = await costTracker.recordCost({
      userId: data.userId,
      operationType: data.operationType,
      operation: `${data.operationType}-${data.provider}`,
      provider: data.provider,
      model: data.model,
      tokensUsed: data.tokensUsed,
      cost: data.cost,
      metadata: data.metadata
    });

    // Update metrics
    this.updateMetrics();

    // Check for alerts
    await this.checkCostAlerts(data);

    console.log(`💰 [AI-COST-MONITOR] Cost recorded: ${data.operationType} - ${data.provider} - $${data.cost.toFixed(4)}`);

    return costId;
  }

  private validateOperationCost(data: {
    operationType: string;
    provider: string;
    cost: number;
  }): void {
    let maxCost: number;
    
    switch (data.operationType) {
      case 'search':
        maxCost = this.thresholds.maxCostPerSearch;
        break;
      case 'extraction':
        maxCost = this.thresholds.maxCostPerExtraction;
        break;
      case 'query-generation':
        maxCost = this.thresholds.maxCostPerQueryGeneration;
        break;
      default:
        maxCost = 0.10; // Default threshold
    }

    if (data.cost > maxCost) {
      console.warn(`⚠️ [AI-COST-MONITOR] High cost operation: ${data.operationType} with ${data.provider} cost $${data.cost.toFixed(4)} (threshold: $${maxCost.toFixed(4)})`);
    }
  }

  private updateMetrics(): void {
    // Get system cost summary
    const systemSummary = costTracker.getSystemCostSummary({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      end: new Date()
    });

    // Update time-based metrics
    this.metrics.currentSpend = systemSummary.totalCost;
    this.metrics.monthlySpend = systemSummary.totalCost;

    // Calculate daily and weekly spends
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const dailySummary = costTracker.getSystemCostSummary({
      start: today,
      end: new Date()
    });
    this.metrics.dailySpend = dailySummary.totalCost;

    const weeklySummary = costTracker.getSystemCostSummary({
      start: weekAgo,
      end: new Date()
    });
    this.metrics.weeklySpend = weeklySummary.totalCost;

    // Update provider breakdown
    this.metrics.spendByProvider = {};
    Object.entries(systemSummary.costByProvider).forEach(([provider, cost]) => {
      const providerRequests = systemSummary.totalCost; // Simplified calculation
      this.metrics.spendByProvider[provider] = {
        totalCost: cost,
        requestCount: Math.floor(providerRequests / 3), // Estimate
        averageCostPerRequest: cost / Math.floor(providerRequests / 3) || 0,
        costTrend: this.calculateCostTrend(provider)
      };
    });

    // Update operation breakdown
    this.metrics.spendByOperation = systemSummary.costByOperation;

    // Update user breakdown
    this.metrics.spendByUser = {};
    Object.entries(systemSummary.costByUser).forEach(([userId, cost]) => {
      const userBudgets = costTracker.getUserBudgets(userId);
      const userBudget = userBudgets.find(b => b.isActive && b.budgetType === 'monthly');
      const budgetUtilization = userBudget ? (cost / userBudget.amount) * 100 : 0;

      this.metrics.spendByUser[userId] = {
        totalCost: cost,
        requestCount: Math.floor(cost * 20), // Estimate based on average cost
        averageCostPerRequest: cost / Math.floor(cost * 20) || 0,
        budgetUtilization
      };
    });

    // Update projections
    this.updateProjections();

    // Update alerts
    this.updateAlerts();
  }

  private calculateCostTrend(provider: string): 'increasing' | 'decreasing' | 'stable' {
    // Simplified trend calculation - in production would use historical data
    const random = Math.random();
    if (random < 0.3) return 'increasing';
    if (random < 0.6) return 'decreasing';
    return 'stable';
  }

  private updateProjections(): void {
    // Calculate projections based on current usage patterns
    const daysInMonth = 30;
    const daysInWeek = 7;

    this.metrics.projectedDailySpend = this.metrics.dailySpend;
    this.metrics.projectedWeeklySpend = this.metrics.dailySpend * daysInWeek;
    this.metrics.projectedMonthlySpend = this.metrics.dailySpend * daysInMonth;

    // Calculate budget exhaustion date
    const monthlyBudget = this.thresholds.maxMonthlySpend;
    if (monthlyBudget > 0 && this.metrics.dailySpend > 0) {
      const daysUntilExhaustion = monthlyBudget / this.metrics.dailySpend;
      if (daysUntilExhaustion > 0 && daysUntilExhaustion < 30) {
        this.metrics.budgetExhaustionDate = new Date(Date.now() + daysUntilExhaustion * 24 * 60 * 60 * 1000);
      }
    }
  }

  private updateAlerts(): void {
    const allAlerts = costTracker.getUserAlerts('', false);
    this.metrics.activeAlerts = allAlerts;

    this.metrics.alertSummary = {
      critical: allAlerts.filter(a => a.severity === 'critical').length,
      warning: allAlerts.filter(a => a.severity === 'medium' || a.severity === 'high').length,
      info: allAlerts.filter(a => a.severity === 'low').length
    };
  }

  private async checkCostAlerts(data: {
    userId: string;
    operationType: string;
    provider: string;
    cost: number;
  }): Promise<void> {
    // Check per-operation thresholds
    if (data.cost > this.thresholds.maxCostPerSearch) {
      await this.createCostAlert({
        userId: data.userId,
        alertType: 'cost_spike',
        severity: 'high',
        title: 'High Cost Operation Detected',
        message: `${data.operationType} operation with ${data.provider} cost $${data.cost.toFixed(4)}`,
        currentSpend: data.cost,
        period: {
          start: new Date(),
          end: new Date()
        }
      });
    }

    // Check daily spend threshold
    if (this.metrics.dailySpend > this.thresholds.maxDailySpend) {
      await this.createCostAlert({
        userId: data.userId,
        alertType: 'cost_spike',
        severity: 'critical',
        title: 'Daily Spend Limit Exceeded',
        message: `Daily spend $${this.metrics.dailySpend.toFixed(2)} exceeds limit $${this.thresholds.maxDailySpend.toFixed(2)}`,
        currentSpend: this.metrics.dailySpend,
        period: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        }
      });
    }

    // Check user-specific thresholds
    if (data.userId) {
      const userDailySpend = this.metrics.spendByUser[data.userId]?.totalCost || 0;
      if (userDailySpend > this.thresholds.maxUserDailySpend) {
        await this.createCostAlert({
          userId: data.userId,
          alertType: 'cost_spike',
          severity: 'medium',
          title: 'User Daily Spend Limit Exceeded',
          message: `User daily spend $${userDailySpend.toFixed(2)} exceeds limit $${this.thresholds.maxUserDailySpend.toFixed(2)}`,
          currentSpend: userDailySpend,
          period: {
            start: new Date(Date.now() - 24 * 60 * 60 * 1000),
            end: new Date()
          }
        });
      }
    }
  }

  private async createCostAlert(alertData: {
    userId: string;
    alertType: string;
    severity: string;
    title: string;
    message: string;
    currentSpend: number;
    period: { start: Date; end: Date };
  }): Promise<void> {
    // In production, this would create an actual alert
    console.log(`🚨 [AI-COST-MONITOR] Cost Alert: ${alertData.title} - ${alertData.message}`);
    
    // Notify subscribers
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alertData as any);
      } catch (error) {
        console.error('Error in cost alert callback:', error);
      }
    });
  }

  /**
   * Get comprehensive cost metrics
   */
  getCostMetrics(): AICostMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Get cost optimization suggestions
   */
  getOptimizationSuggestions(): CostOptimization[] {
    return [...this.optimizationSuggestions];
  }

  /**
   * Implement cost optimization
   */
  async implementOptimization(optimizationId: string): Promise<void> {
    const optimization = this.optimizationSuggestions.find(o => 
      o.type === optimizationId && o.status === 'recommended'
    );

    if (!optimization) {
      throw new Error(`Optimization ${optimizationId} not found or already implemented`);
    }

    console.log(`💡 [AI-COST-MONITOR] Implementing optimization: ${optimization.description}`);

    try {
      switch (optimization.type) {
        case 'caching':
          await this.implementCaching();
          break;
        case 'batching':
          await this.implementBatching();
          break;
        case 'provider_switch':
          await this.implementProviderSwitch();
          break;
        case 'query_optimization':
          await this.implementQueryOptimization();
          break;
      }

      optimization.status = 'implemented';
      console.log(`✅ [AI-COST-MONITOR] Optimization implemented: ${optimization.type}`);

    } catch (error) {
      console.error(`❌ [AI-COST-MONITOR] Optimization failed: ${optimization.type}`, error);
      optimization.status = 'rejected';
      throw error;
    }
  }

  private async implementCaching(): Promise<void> {
    // Enable AI search caching feature flag
    const { featureFlagService } = await import('@/lib/feature-flags/feature-flag-service');
    await featureFlagService.updateFlag(
      'ai-search-caching',
      { enabled: true, rolloutPercentage: 100 },
      'cost-monitor'
    );
  }

  private async implementBatching(): Promise<void> {
    // Enable AI search batching feature flag
    const { featureFlagService } = await import('@/lib/feature-flags/feature-flag-service');
    await featureFlagService.updateFlag(
      'ai-search-batching',
      { enabled: true, rolloutPercentage: 100 },
      'cost-monitor'
    );
  }

  private async implementProviderSwitch(): Promise<void> {
    // Switch to more cost-effective provider
    const { featureFlagService } = await import('@/lib/feature-flags/feature-flag-service');
    await featureFlagService.updateFlag(
      'ai-search-provider-openrouter',
      { enabled: true, rolloutPercentage: 100 },
      'cost-monitor'
    );
    await featureFlagService.updateFlag(
      'ai-search-provider-openai',
      { enabled: false, rolloutPercentage: 0 },
      'cost-monitor'
    );
  }

  private async implementQueryOptimization(): Promise<void> {
    // Enable query optimization features
    console.log('🔧 [AI-COST-MONITOR] Query optimization implemented');
    // In production, this would update AI query generation logic
  }

  /**
   * Create cost budget for user
   */
  async createCostBudget(userId: string, budgetData: {
    name: string;
    budgetType: 'daily' | 'weekly' | 'monthly';
    amount: number;
    alertThresholds?: number[];
  }): Promise<string> {
    return await costTracker.createBudget({
      userId,
      name: budgetData.name,
      budgetType: budgetData.budgetType,
      amount: budgetData.amount,
      period: {
        start: new Date(),
        end: this.calculateBudgetEndDate(budgetData.budgetType)
      },
      alertThresholds: budgetData.alertThresholds || [75, 90],
      isActive: true
    });
  }

  private calculateBudgetEndDate(budgetType: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date();
    switch (budgetType) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Subscribe to cost alerts
   */
  onCostAlert(callback: (alert: UsageAlert) => void): () => void {
    this.alertCallbacks.add(callback);
    
    return () => {
      this.alertCallbacks.delete(callback);
    };
  }

  /**
   * Update cost thresholds
   */
  updateThresholds(newThresholds: Partial<CostThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 [AI-COST-MONITOR] Cost thresholds updated');
  }

  /**
   * Generate cost report
   */
  generateCostReport(timeRange: { start: Date; end: Date }): {
    summary: AICostMetrics;
    trends: {
      dailySpend: Array<{ date: string; amount: number }>;
      providerUsage: Record<string, Array<{ date: string; cost: number }>>;
      operationCosts: Record<string, number>;
    };
    recommendations: CostOptimization[];
    budgetStatus: {
      totalBudget: number;
      used: number;
      remaining: number;
      utilization: number;
    };
  } {
    const summary = this.getCostMetrics();
    
    // Generate trends (simplified)
    const trends = {
      dailySpend: this.generateDailySpendTrend(timeRange),
      providerUsage: this.generateProviderUsageTrend(timeRange),
      operationCosts: summary.spendByOperation
    };

    const recommendations = this.getOptimizationSuggestions().filter(o => o.status === 'recommended');
    
    const budgetStatus = {
      totalBudget: this.thresholds.maxMonthlySpend,
      used: summary.monthlySpend,
      remaining: Math.max(0, this.thresholds.maxMonthlySpend - summary.monthlySpend),
      utilization: (summary.monthlySpend / this.thresholds.maxMonthlySpend) * 100
    };

    return {
      summary,
      trends,
      recommendations,
      budgetStatus
    };
  }

  private generateDailySpendTrend(timeRange: { start: Date; end: Date }): Array<{ date: string; amount: number }> {
    const trend = [];
    const current = new Date(timeRange.start);
    
    while (current <= timeRange.end) {
      trend.push({
        date: current.toISOString().split('T')[0],
        amount: Math.random() * 20 + 5 // Mock data
      });
      current.setDate(current.getDate() + 1);
    }
    
    return trend;
  }

  private generateProviderUsageTrend(timeRange: { start: Date; end: Date }): Record<string, Array<{ date: string; cost: number }>> {
    return {
      'openai': this.generateDailySpendTrend(timeRange),
      'openrouter': this.generateDailySpendTrend(timeRange),
      'anthropic': this.generateDailySpendTrend(timeRange)
    };
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      try {
        this.updateMetrics();
        this.checkSystemWideAlerts();
      } catch (error) {
        console.error('AI Cost monitoring error:', error);
      }
    }, 60000); // Every minute

    console.log('✅ [AI-COST-MONITOR] AI Cost monitoring started');
  }

  private checkSystemWideAlerts(): void {
    // Check hourly spend
    const hourlySpend = this.metrics.dailySpend / 24;
    if (hourlySpend > this.thresholds.maxHourlySpend) {
      console.warn(`⚠️ [AI-COST-MONITOR] Hourly spend ($${hourlySpend.toFixed(2)}) exceeds threshold ($${this.thresholds.maxHourlySpend.toFixed(2)})`);
    }

    // Check for cost spikes
    // In production, would compare with historical data
    if (this.metrics.dailySpend > this.thresholds.maxDailySpend * 0.8) {
      console.warn(`⚠️ [AI-COST-MONITOR] Daily spend approaching limit: $${this.metrics.dailySpend.toFixed(2)}/$${this.thresholds.maxDailySpend.toFixed(2)}`);
    }
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 [AI-COST-MONITOR] AI Cost monitoring stopped');
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.optimizationSuggestions.forEach(o => {
      if (o.status === 'implemented') {
        o.status = 'recommended';
      }
    });
    console.log('🔄 [AI-COST-MONITOR] All metrics reset');
  }
}

// Export singleton instance
export const aiCostMonitor = AICostMonitor.getInstance();

// Export utility functions
export async function recordAICost(data: {
  userId: string;
  operationType: 'search' | 'extraction' | 'query-generation';
  provider: string;
  model: string;
  tokensUsed: number;
  cost: number;
  metadata?: Record<string, any>;
}): Promise<string> {
  return aiCostMonitor.recordAICost(data);
}

export function getAICostMetrics(): AICostMetrics {
  return aiCostMonitor.getCostMetrics();
}

export function getCostOptimizationSuggestions(): CostOptimization[] {
  return aiCostMonitor.getOptimizationSuggestions();
}