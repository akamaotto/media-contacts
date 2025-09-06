/**
 * Cost Tracking and Usage Alerts Service
 * Monitors AI operation costs and sends alerts when thresholds are exceeded
 */

export interface CostEntry {
  id: string;
  userId: string;
  operationType: string;
  operation: string;
  provider: string; // 'openrouter', 'openai', etc.
  model: string;
  tokensUsed: number;
  cost: number;
  timestamp: Date;
  metadata?: {
    sessionId?: string;
    contactId?: string;
    apiKeyId?: string;
    inputTokens?: number;
    outputTokens?: number;
    requestId?: string;
    ip?: string;
  };
}

export interface CostBudget {
  id: string;
  userId: string;
  name: string;
  budgetType: 'daily' | 'weekly' | 'monthly' | 'total';
  amount: number; // Budget amount in USD
  spent: number; // Amount spent so far
  period: {
    start: Date;
    end: Date;
  };
  alertThresholds: number[]; // Percentage thresholds for alerts (e.g., [50, 75, 90])
  alertsSent: number[]; // Which thresholds have already triggered alerts
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageAlert {
  id: string;
  userId: string;
  alertType: 'budget_threshold' | 'unusual_spending' | 'cost_spike' | 'quota_exceeded';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  budgetId?: string;
  currentSpend: number;
  threshold?: number;
  period: {
    start: Date;
    end: Date;
  };
  acknowledged: boolean;
  createdAt: Date;
  acknowledgedAt?: Date;
}

export interface CostSummary {
  totalCost: number;
  totalTokens: number;
  operationCount: number;
  averageCostPerOperation: number;
  averageTokensPerOperation: number;
  costByOperation: Record<string, number>;
  costByModel: Record<string, number>;
  costByDay: Array<{ date: string; cost: number; tokens: number }>;
  topExpensiveOperations: Array<{
    id: string;
    operation: string;
    cost: number;
    tokens: number;
    timestamp: Date;
  }>;
}

/**
 * Cost Tracker Class
 */
export class CostTracker {
  private static instance: CostTracker;
  private costs: Map<string, CostEntry> = new Map();
  private budgets: Map<string, CostBudget> = new Map();
  private alerts: Map<string, UsageAlert> = new Map();

  static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  /**
   * Record a cost entry
   */
  async recordCost(entry: Omit<CostEntry, 'id' | 'timestamp'>): Promise<string> {
    const costEntry: CostEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.costs.set(costEntry.id, costEntry);

    // Update budget spending
    await this.updateBudgetSpending(entry.userId, entry.cost);

    // Check for usage alerts
    await this.checkUsageAlerts(entry.userId, entry.cost);

    return costEntry.id;
  }

  /**
   * Create a budget
   */
  async createBudget(budget: Omit<CostBudget, 'id' | 'spent' | 'alertsSent' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const budgetEntry: CostBudget = {
      ...budget,
      id: this.generateId(),
      spent: 0,
      alertsSent: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.budgets.set(budgetEntry.id, budgetEntry);
    return budgetEntry.id;
  }

  /**
   * Update a budget
   */
  async updateBudget(budgetId: string, updates: Partial<CostBudget>): Promise<boolean> {
    const budget = this.budgets.get(budgetId);
    if (!budget) return false;

    Object.assign(budget, updates, { updatedAt: new Date() });
    return true;
  }

  /**
   * Get user budgets
   */
  getUserBudgets(userId: string): CostBudget[] {
    return Array.from(this.budgets.values())
      .filter(budget => budget.userId === userId);
  }

  /**
   * Get cost summary for a user
   */
  getCostSummary(userId: string, timeRange?: { start: Date; end: Date }): CostSummary {
    let userCosts = Array.from(this.costs.values())
      .filter(cost => cost.userId === userId);

    if (timeRange) {
      userCosts = userCosts.filter(
        cost => cost.timestamp >= timeRange.start && cost.timestamp <= timeRange.end
      );
    }

    const totalCost = userCosts.reduce((sum, cost) => sum + cost.cost, 0);
    const totalTokens = userCosts.reduce((sum, cost) => sum + cost.tokensUsed, 0);
    const operationCount = userCosts.length;
    const averageCostPerOperation = operationCount > 0 ? totalCost / operationCount : 0;
    const averageTokensPerOperation = operationCount > 0 ? totalTokens / operationCount : 0;

    // Cost by operation type
    const costByOperation = userCosts.reduce((acc, cost) => {
      acc[cost.operationType] = (acc[cost.operationType] || 0) + cost.cost;
      return acc;
    }, {} as Record<string, number>);

    // Cost by model
    const costByModel = userCosts.reduce((acc, cost) => {
      acc[cost.model] = (acc[cost.model] || 0) + cost.cost;
      return acc;
    }, {} as Record<string, number>);

    // Cost by day
    const costByDay = this.aggregateCostsByDay(userCosts);

    // Top expensive operations
    const topExpensiveOperations = userCosts
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)
      .map(cost => ({
        id: cost.id,
        operation: cost.operation,
        cost: cost.cost,
        tokens: cost.tokensUsed,
        timestamp: cost.timestamp
      }));

    return {
      totalCost,
      totalTokens,
      operationCount,
      averageCostPerOperation,
      averageTokensPerOperation,
      costByOperation,
      costByModel,
      costByDay,
      topExpensiveOperations
    };
  }

  /**
   * Get system-wide cost summary
   */
  getSystemCostSummary(timeRange?: { start: Date; end: Date }): CostSummary & {
    userCount: number;
    costByUser: Record<string, number>;
    topSpenders: Array<{ userId: string; cost: number; operations: number }>;
  } {
    let allCosts = Array.from(this.costs.values());

    if (timeRange) {
      allCosts = allCosts.filter(
        cost => cost.timestamp >= timeRange.start && cost.timestamp <= timeRange.end
      );
    }

    const baseSummary = this.getCostSummary('', timeRange);
    
    // Recalculate for all costs
    const totalCost = allCosts.reduce((sum, cost) => sum + cost.cost, 0);
    const totalTokens = allCosts.reduce((sum, cost) => sum + cost.tokensUsed, 0);
    const operationCount = allCosts.length;

    // Cost by user
    const costByUser = allCosts.reduce((acc, cost) => {
      acc[cost.userId] = (acc[cost.userId] || 0) + cost.cost;
      return acc;
    }, {} as Record<string, number>);

    const userCount = Object.keys(costByUser).length;

    // Top spenders
    const topSpenders = Object.entries(costByUser)
      .map(([userId, cost]) => ({
        userId,
        cost,
        operations: allCosts.filter(c => c.userId === userId).length
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    return {
      ...baseSummary,
      totalCost,
      totalTokens,
      operationCount,
      averageCostPerOperation: operationCount > 0 ? totalCost / operationCount : 0,
      averageTokensPerOperation: operationCount > 0 ? totalTokens / operationCount : 0,
      costByDay: this.aggregateCostsByDay(allCosts),
      userCount,
      costByUser,
      topSpenders
    };
  }

  /**
   * Get usage alerts for a user
   */
  getUserAlerts(userId: string, acknowledged?: boolean): UsageAlert[] {
    let alerts = Array.from(this.alerts.values())
      .filter(alert => alert.userId === userId);

    if (acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === acknowledged);
    }

    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    return true;
  }

  /**
   * Check if user is within budget
   */
  isWithinBudget(userId: string): { withinBudget: boolean; budgets: Array<{ budget: CostBudget; percentUsed: number }> } {
    const userBudgets = this.getUserBudgets(userId)
      .filter(budget => budget.isActive && this.isBudgetPeriodActive(budget));

    const budgetStatus = userBudgets.map(budget => {
      const percentUsed = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
      return { budget, percentUsed };
    });

    const withinBudget = budgetStatus.every(status => status.percentUsed < 100);

    return { withinBudget, budgets: budgetStatus };
  }

  /**
   * Get cost predictions based on current usage
   */
  getCostPredictions(userId: string): {
    dailyAverage: number;
    weeklyProjection: number;
    monthlyProjection: number;
    budgetExhaustionDate?: Date;
  } {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentCosts = Array.from(this.costs.values())
      .filter(cost => cost.userId === userId && cost.timestamp >= last30Days);

    if (recentCosts.length === 0) {
      return {
        dailyAverage: 0,
        weeklyProjection: 0,
        monthlyProjection: 0
      };
    }

    const totalRecentCost = recentCosts.reduce((sum, cost) => sum + cost.cost, 0);
    const daysWithData = Math.max(1, (Date.now() - last30Days.getTime()) / (24 * 60 * 60 * 1000));
    const dailyAverage = totalRecentCost / daysWithData;

    const weeklyProjection = dailyAverage * 7;
    const monthlyProjection = dailyAverage * 30;

    // Find the most restrictive active budget
    const activeBudgets = this.getUserBudgets(userId)
      .filter(budget => budget.isActive && this.isBudgetPeriodActive(budget));

    let budgetExhaustionDate: Date | undefined;
    
    if (activeBudgets.length > 0 && dailyAverage > 0) {
      const mostRestrictiveBudget = activeBudgets.reduce((min, budget) => {
        const remaining = budget.amount - budget.spent;
        const daysUntilExhaustion = remaining / dailyAverage;
        const minRemaining = min.amount - min.spent;
        const minDaysUntilExhaustion = minRemaining / dailyAverage;
        
        return daysUntilExhaustion < minDaysUntilExhaustion ? budget : min;
      });

      const remaining = mostRestrictiveBudget.amount - mostRestrictiveBudget.spent;
      const daysUntilExhaustion = remaining / dailyAverage;
      
      if (daysUntilExhaustion > 0) {
        budgetExhaustionDate = new Date(Date.now() + daysUntilExhaustion * 24 * 60 * 60 * 1000);
      }
    }

    return {
      dailyAverage,
      weeklyProjection,
      monthlyProjection,
      budgetExhaustionDate
    };
  }

  /**
   * Update budget spending
   */
  private async updateBudgetSpending(userId: string, cost: number): Promise<void> {
    const userBudgets = this.getUserBudgets(userId)
      .filter(budget => budget.isActive && this.isBudgetPeriodActive(budget));

    for (const budget of userBudgets) {
      budget.spent += cost;
      budget.updatedAt = new Date();

      // Check for threshold alerts
      await this.checkBudgetThresholds(budget);
    }
  }

  /**
   * Check budget thresholds and create alerts
   */
  private async checkBudgetThresholds(budget: CostBudget): Promise<void> {
    const percentUsed = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;

    for (const threshold of budget.alertThresholds) {
      if (percentUsed >= threshold && !budget.alertsSent.includes(threshold)) {
        budget.alertsSent.push(threshold);

        const severity = this.getThresholdSeverity(threshold);
        
        await this.createAlert({
          userId: budget.userId,
          alertType: 'budget_threshold',
          severity,
          title: `Budget ${threshold}% Threshold Reached`,
          message: `Your "${budget.name}" budget has reached ${threshold}% usage ($${budget.spent.toFixed(2)} of $${budget.amount.toFixed(2)})`,
          budgetId: budget.id,
          currentSpend: budget.spent,
          threshold,
          period: budget.period
        });
      }
    }

    // Check for budget exceeded
    if (percentUsed >= 100 && !budget.alertsSent.includes(100)) {
      budget.alertsSent.push(100);

      await this.createAlert({
        userId: budget.userId,
        alertType: 'quota_exceeded',
        severity: 'critical',
        title: 'Budget Exceeded',
        message: `Your "${budget.name}" budget has been exceeded ($${budget.spent.toFixed(2)} of $${budget.amount.toFixed(2)})`,
        budgetId: budget.id,
        currentSpend: budget.spent,
        threshold: 100,
        period: budget.period
      });
    }
  }

  /**
   * Check for unusual spending patterns
   */
  private async checkUsageAlerts(userId: string, cost: number): Promise<void> {
    // Check for cost spikes (single operation cost > $1.00)
    if (cost > 1.00) {
      await this.createAlert({
        userId,
        alertType: 'cost_spike',
        severity: 'high',
        title: 'High Cost Operation Detected',
        message: `A single AI operation cost $${cost.toFixed(2)}, which is unusually high`,
        currentSpend: cost,
        period: {
          start: new Date(),
          end: new Date()
        }
      });
    }

    // Check for unusual daily spending (> 5x daily average)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCosts = Array.from(this.costs.values())
      .filter(c => c.userId === userId && c.timestamp >= last7Days);

    if (recentCosts.length > 0) {
      const avgDailyCost = recentCosts.reduce((sum, c) => sum + c.cost, 0) / 7;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayCosts = recentCosts.filter(c => c.timestamp >= today);
      const todayTotal = todayCosts.reduce((sum, c) => sum + c.cost, 0);

      if (todayTotal > avgDailyCost * 5 && avgDailyCost > 0) {
        await this.createAlert({
          userId,
          alertType: 'unusual_spending',
          severity: 'medium',
          title: 'Unusual Spending Pattern Detected',
          message: `Today's spending ($${todayTotal.toFixed(2)}) is ${(todayTotal / avgDailyCost).toFixed(1)}x your daily average`,
          currentSpend: todayTotal,
          period: {
            start: today,
            end: new Date()
          }
        });
      }
    }
  }

  /**
   * Create a usage alert
   */
  private async createAlert(alert: Omit<UsageAlert, 'id' | 'acknowledged' | 'createdAt'>): Promise<string> {
    const usageAlert: UsageAlert = {
      ...alert,
      id: this.generateId(),
      acknowledged: false,
      createdAt: new Date()
    };

    this.alerts.set(usageAlert.id, usageAlert);
    return usageAlert.id;
  }

  /**
   * Check if budget period is currently active
   */
  private isBudgetPeriodActive(budget: CostBudget): boolean {
    const now = new Date();
    return now >= budget.period.start && now <= budget.period.end;
  }

  /**
   * Get severity based on threshold percentage
   */
  private getThresholdSeverity(threshold: number): UsageAlert['severity'] {
    if (threshold >= 90) return 'critical';
    if (threshold >= 75) return 'high';
    if (threshold >= 50) return 'medium';
    return 'low';
  }

  /**
   * Aggregate costs by day
   */
  private aggregateCostsByDay(costs: CostEntry[]): Array<{ date: string; cost: number; tokens: number }> {
    const dailyAggregates = costs.reduce((acc, cost) => {
      const date = cost.timestamp.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { cost: 0, tokens: 0 };
      }
      acc[date].cost += cost.cost;
      acc[date].tokens += cost.tokensUsed;
      return acc;
    }, {} as Record<string, { cost: number; tokens: number }>);

    return Object.entries(dailyAggregates)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old cost entries and alerts
   */
  async cleanup(maxAge: number = 90 * 24 * 60 * 60 * 1000): Promise<{ costs: number; alerts: number }> {
    const cutoff = new Date(Date.now() - maxAge);
    let costsRemoved = 0;
    let alertsRemoved = 0;

    // Clean up old cost entries
    for (const [id, cost] of this.costs.entries()) {
      if (cost.timestamp < cutoff) {
        this.costs.delete(id);
        costsRemoved++;
      }
    }

    // Clean up acknowledged alerts older than 30 days
    const alertCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.acknowledged && alert.createdAt < alertCutoff) {
        this.alerts.delete(id);
        alertsRemoved++;
      }
    }

    return { costs: costsRemoved, alerts: alertsRemoved };
  }
}

// Export singleton instance
export const costTracker = CostTracker.getInstance();
