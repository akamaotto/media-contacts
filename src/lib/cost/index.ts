/**
 * Cost Monitoring System - Main Entry Point
 * Comprehensive cost tracking, monitoring, and optimization for AI services
 */

// Export main integration service
export {
  costMonitoringIntegration,
  initializeCostMonitoring,
  recordMonitoredCost,
  getCostMonitoringStatus,
  generateCostReport,
  implementCostOptimizations,
  type CostMonitoringConfig,
  type CostMonitoringHealth,
} from './cost-integration';

// Export comprehensive cost tracker
export {
  comprehensiveCostTracker,
  recordComprehensiveCost,
  getCostAnalytics,
  generateCostForecast,
  type ComprehensiveCostEntry,
  type CostAnalytics,
  type CostForecast,
} from './comprehensive-cost-tracker';

// Export real-time alerts service
export {
  realTimeCostAlerts,
  recordCostWithAlerts,
  subscribeToCostAlerts,
  type RealTimeAlert,
  type AlertConfiguration,
  type BudgetControl,
} from './realtime-cost-alerts';

// Export cost optimization service
export {
  costOptimizationService,
  getCostOptimizationRecommendations,
  implementCostOptimization,
  type OptimizationRecommendation,
  type CostPattern,
  type OptimizationStrategy,
} from './cost-optimization';

// Export cost reporting service
export {
  costReportingService,
  generateCostReport as generateDetailedCostReport,
  getExecutiveCostSummary,
  type CostReport,
  type CostMetrics,
  type CostForecast as DetailedCostForecast,
} from './cost-reporting';

// Export AI cost monitor (existing)
export {
  aiCostMonitor,
  recordAICost,
  getAICostMetrics,
  getCostOptimizationSuggestions,
  type AICostMetrics,
  type CostThresholds,
  type CostOptimization as ExistingCostOptimization,
} from './ai-cost-monitor';

// Export cost tracker (existing)
export {
  costTracker,
  type CostEntry,
  type CostBudget,
  type UsageAlert,
  type CostSummary,
} from '@/lib/security/cost-tracker';

// Re-export for convenience
export type {
  // Enhanced types
  CostEntry as EnhancedCostEntry,
  CostBudget as EnhancedCostBudget,
  UsageAlert as EnhancedUsageAlert,
} from '@/lib/security/cost-tracker';

/**
 * Initialize the complete cost monitoring system with default configuration
 */
export async function setupCostMonitoring(config?: {
  enabled?: boolean;
  thresholds?: {
    daily?: number;
    monthly?: number;
    perOperation?: number;
    anomalyMultiplier?: number;
  };
  alerts?: {
    email?: {
      enabled?: boolean;
      recipients?: string[];
    };
    webhook?: {
      enabled?: boolean;
      url?: string;
    };
    slack?: {
      enabled?: boolean;
      webhookUrl?: string;
      channel?: string;
    };
  };
  optimization?: {
    autoImplement?: boolean;
    maxPriority?: 'low' | 'medium' | 'high';
  };
  reporting?: {
    schedule?: {
      daily?: boolean;
      weekly?: boolean;
      monthly?: boolean;
    };
    recipients?: string[];
  };
}): Promise<void> {
  const defaultConfig = {
    enabled: true,
    thresholds: {
      daily: 50,
      monthly: 1000,
      perOperation: 1.00,
      anomalyMultiplier: 3,
      ...config?.thresholds,
    },
    alerts: {
      email: {
        enabled: false,
        recipients: [],
        ...config?.alerts?.email,
      },
      webhook: {
        enabled: false,
        url: process.env.COST_ALERT_WEBHOOK_URL || '',
        ...config?.alerts?.webhook,
      },
      slack: {
        enabled: false,
        webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
        channel: '#cost-alerts',
        ...config?.alerts?.slack,
      },
    },
    optimization: {
      autoImplement: false,
      maxPriority: 'medium',
      ...config?.optimization,
    },
    reporting: {
      schedule: {
        daily: false,
        weekly: true,
        monthly: true,
        ...config?.reporting?.schedule,
      },
      recipients: config?.reporting?.recipients || [],
    },
  };

  return initializeCostMonitoring(defaultConfig);
}

/**
 * Record a cost for an AI service operation
 * This is the main function to use for recording costs throughout the application
 */
export async function recordAIServiceCost(data: {
  userId: string;
  operationType: 'search' | 'extraction' | 'query-generation' | 'enhancement';
  provider: 'openai' | 'anthropic' | 'exa' | 'firecrawl' | 'openrouter';
  model?: string;
  tokensUsed: number;
  cost: number;
  metadata?: {
    sessionId?: string;
    contactId?: string;
    query?: string;
    resultCount?: number;
    responseTime?: number;
    searchId?: string;
    requestId?: string;
    [key: string]: any;
  };
}): Promise<string> {
  return recordMonitoredCost({
    userId: data.userId,
    operationType: data.operationType,
    provider: data.provider,
    model: data.model,
    tokensUsed: data.tokensUsed,
    cost: data.cost,
    metadata: data.metadata,
  });
}

/**
 * Get a complete overview of cost monitoring status
 */
export async function getCostOverview() {
  const status = await getCostMonitoringStatus();
  const metrics = await getCostAnalytics();
  const recommendations = await getCostOptimizationRecommendations();
  const alerts = realTimeCostAlerts.getActiveAlerts();

  return {
    status,
    metrics,
    recommendations: {
      total: recommendations.length,
      highPriority: recommendations.filter(r => r.priority === 'high').length,
      mediumPriority: recommendations.filter(r => r.priority === 'medium').length,
      lowPriority: recommendations.filter(r => r.priority === 'low').length,
    },
    alerts: {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
    },
  };
}

/**
 * Subscribe to cost monitoring events
 */
export function subscribeToCostEvents(callbacks: {
  onAlert?: (alert: RealTimeAlert) => void;
  onBudgetExceeded?: (data: { userId: string; budgetType: string; amount: number }) => void;
  onAnomaly?: (anomaly: { type: string; description: string; severity: string }) => void;
  onRecommendation?: (recommendation: OptimizationRecommendation) => void;
}) {
  const unsubscribers: (() => void)[] = [];

  if (callbacks.onAlert) {
    unsubscribers.push(subscribeToCostAlerts('alert', callbacks.onAlert));
  }
  if (callbacks.onBudgetExceeded) {
    unsubscribers.push(subscribeToCostAlerts('budget', callbacks.onAlert));
  }
  if (callbacks.onAnomaly) {
    unsubscribers.push(subscribeToCostAlerts('anomaly', callbacks.onAlert));
  }
  if (callbacks.onRecommendation) {
    // Would need to implement recommendation subscription
    console.log('Recommendation subscription not yet implemented');
  }

  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

/**
 * Cost monitoring utilities
 */
export const costUtils = {
  /**
   * Calculate cost per token for different providers
   */
  calculateCostPerToken: (provider: string, model: string): number => {
    const rates: Record<string, Record<string, number>> = {
      openai: {
        'gpt-3.5-turbo': 0.002,
        'gpt-4': 0.03,
        'gpt-4-turbo': 0.01,
      },
      anthropic: {
        'claude-instant': 0.0008,
        'claude-2': 0.008,
        'claude-3-opus': 0.075,
        'claude-3-sonnet': 0.015,
        'claude-3-haiku': 0.00025,
      },
      openrouter: {
        // OpenRouter rates vary by model
      },
    };

    return rates[provider]?.[model] || 0.01; // Default rate
  },

  /**
   * Estimate cost before making an API call
   */
  estimateCost: (provider: string, model: string, tokens: number): number => {
    return costUtils.calculateCostPerToken(provider, model) * tokens;
  },

  /**
   * Format cost for display
   */
  formatCost: (cost: number, precision: number = 4): string => {
    return `$${cost.toFixed(precision)}`;
  },

  /**
   * Get cost optimization suggestions for a specific scenario
   */
  getOptimizationSuggestions: async (
    scenario: 'high_frequency' | 'high_cost' | 'low_success' | 'general'
  ): Promise<OptimizationRecommendation[]> => {
    const allRecommendations = await getCostOptimizationRecommendations();
    
    switch (scenario) {
      case 'high_frequency':
        return allRecommendations.filter(r => 
          r.type === 'caching' || r.type === 'batching' || r.type === 'rate_limiting'
        );
      case 'high_cost':
        return allRecommendations.filter(r => 
          r.type === 'provider_switch' || r.type === 'query_optimization'
        );
      case 'low_success':
        return allRecommendations.filter(r => 
          r.description.toLowerCase().includes('success') || 
          r.description.toLowerCase().includes('efficiency')
        );
      default:
        return allRecommendations;
    }
  },
};

/**
 * Middleware for automatically tracking costs in API routes
 */
export function withCostTracking(
  handler: (data: any) => Promise<any>,
  options: {
    operationType: string;
    provider: string;
    model?: string;
    getTokenCount?: (data: any, result: any) => number;
    getCost?: (data: any, result: any) => number;
  }
) {
  return async (data: any) => {
    const startTime = Date.now();
    let result: any;
    let error: Error | null = null;

    try {
      result = await handler(data);
    } catch (e) {
      error = e as Error;
      throw e;
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Calculate tokens or cost
      let tokensUsed = 0;
      let cost = 0;

      if (options.getTokenCount) {
        tokensUsed = options.getTokenCount(data, result);
        cost = costUtils.estimateCost(options.provider, options.model || 'default', tokensUsed);
      } else if (options.getCost) {
        cost = options.getCost(data, result);
      }

      // Record the cost if we have a user ID
      if (data.userId && (tokensUsed > 0 || cost > 0)) {
        try {
          await recordAIServiceCost({
            userId: data.userId,
            operationType: options.operationType as any,
            provider: options.provider as any,
            model: options.model,
            tokensUsed,
            cost,
            metadata: {
              duration,
              success: !error,
              ...data,
            },
          });
        } catch (recordingError) {
          console.error('Failed to record cost:', recordingError);
        }
      }
    }

    return result;
  };
}

// Default export for convenience
export default {
  setup: setupCostMonitoring,
  record: recordAIServiceCost,
  getStatus: getCostMonitoringStatus,
  getOverview: getCostOverview,
  generateReport: generateCostReport,
  implementOptimizations: implementCostOptimizations,
  subscribe: subscribeToCostEvents,
  utils: costUtils,
  middleware: withCostTracking,
};