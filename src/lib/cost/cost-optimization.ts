/**
 * Cost Optimization Recommendations Service
 * Analyzes cost patterns and provides actionable optimization recommendations
 */

import { PrismaClient } from '@prisma/client';
import { comprehensiveCostTracker, type CostAnalytics } from './comprehensive-cost-tracker';
import { realTimeCostAlerts } from './realtime-cost-alerts';

const prisma = new PrismaClient();

export interface OptimizationRecommendation {
  id: string;
  type: 'caching' | 'batching' | 'provider_switch' | 'query_optimization' | 'rate_limiting' | 'feature_flag' | 'usage_pattern';
  title: string;
  description: string;
  rationale: string;
  potentialSavings: {
    monthly: number; // USD
    percentage: number; // % of current cost
  };
  implementation: {
    effort: 'low' | 'medium' | 'high';
    time: 'hours' | 'days' | 'weeks';
    complexity: 'simple' | 'moderate' | 'complex';
  };
  impact: {
    cost: 'low' | 'medium' | 'high';
    performance: 'positive' | 'neutral' | 'negative';
    user_experience: 'positive' | 'neutral' | 'negative';
  };
  status: 'recommended' | 'in_progress' | 'implemented' | 'rejected';
  priority: 'low' | 'medium' | 'high' | 'critical';
  actions: OptimizationAction[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface OptimizationAction {
  type: 'feature_flag' | 'code_change' | 'configuration' | 'infrastructure' | 'policy';
  description: string;
  details: Record<string, any>;
  automated: boolean;
}

export interface CostPattern {
  id: string;
  name: string;
  description: string;
  pattern: 'spike' | 'trend' | 'waste' | 'inefficiency' | 'opportunity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metrics: {
    current: number;
    expected: number;
    variance: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  affectedEntities: string[]; // users, operations, providers
  recommendations: string[]; // recommendation IDs
  detectedAt: Date;
}

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  target: 'provider' | 'operation' | 'user' | 'system';
  recommendations: string[]; // recommendation IDs
  expectedSavings: {
    monthly: number;
    percentage: number;
  };
  implementation: {
    phases: OptimizationPhase[];
    totalDuration: string;
    dependencies: string[];
  };
  risks: {
    level: 'low' | 'medium' | 'high';
    description: string;
    mitigation: string;
  }[];
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
}

export interface OptimizationPhase {
  name: string;
  description: string;
  duration: string;
  actions: OptimizationAction[];
  successCriteria: string[];
}

export class CostOptimizationService {
  private static instance: CostOptimizationService;
  private recommendations: Map<string, OptimizationRecommendation> = new Map();
  private patterns: Map<string, CostPattern> = new Map();
  private strategies: Map<string, OptimizationStrategy> = new Map();
  private analysisInterval: NodeJS.Timeout | null = null;

  static getInstance(): CostOptimizationService {
    if (!CostOptimizationService.instance) {
      CostOptimizationService.instance = new CostOptimizationService();
    }
    return CostOptimizationService.instance;
  }

  private constructor() {
    this.initializeDefaultRecommendations();
    this.startPeriodicAnalysis();
  }

  /**
   * Generate comprehensive optimization recommendations
   */
  async generateRecommendations(
    userId?: string,
    timeRange: { start: Date; end: Date } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    }
  ): Promise<OptimizationRecommendation[]> {
    // Get cost analytics
    const analytics = await comprehensiveCostTracker.getCostAnalytics(userId, timeRange);
    
    // Analyze different aspects of cost
    const recommendations: OptimizationRecommendation[] = [];
    
    // Provider optimization
    recommendations.push(...await this.analyzeProviderOptimization(analytics));
    
    // Caching opportunities
    recommendations.push(...await this.analyzeCachingOpportunities(analytics));
    
    // Batching opportunities
    recommendations.push(...await this.analyzeBatchingOpportunities(analytics));
    
    // Query optimization
    recommendations.push(...await this.analyzeQueryOptimization(analytics));
    
    // Usage pattern optimization
    recommendations.push(...await this.analyzeUsagePatterns(analytics));
    
    // Rate limiting
    recommendations.push(...await this.analyzeRateLimitingOpportunities(analytics));
    
    // Feature flag optimization
    recommendations.push(...await this.analyzeFeatureFlagOptimization(analytics));
    
    // Store recommendations
    recommendations.forEach(rec => {
      this.recommendations.set(rec.id, rec);
      this.saveRecommendationToDatabase(rec);
    });
    
    // Sort by priority and potential savings
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.potentialSavings.monthly - a.potentialSavings.monthly;
      });
  }

  private async analyzeProviderOptimization(analytics: CostAnalytics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Analyze provider costs
    for (const [provider, cost] of Object.entries(analytics.costByProvider)) {
      const percentage = (cost / analytics.totalCost) * 100;
      
      // Check for expensive providers
      if (provider === 'openai' && percentage > 60) {
        recommendations.push({
          id: `provider_switch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'provider_switch',
          title: 'Switch to More Cost-Effective AI Provider',
          description: `OpenAI accounts for ${percentage.toFixed(1)}% of your costs. Consider switching to alternative providers for non-critical operations.`,
          rationale: 'Alternative providers like Anthropic Claude Haiku or OpenRouter can offer similar performance at lower costs for specific use cases.',
          potentialSavings: {
            monthly: cost * 0.3, // 30% savings estimate
            percentage: 30,
          },
          implementation: {
            effort: 'medium',
            time: 'days',
            complexity: 'moderate',
          },
          impact: {
            cost: 'high',
            performance: 'neutral',
            user_experience: 'neutral',
          },
          status: 'recommended',
          priority: percentage > 80 ? 'high' : 'medium',
          actions: [
            {
              type: 'feature_flag',
              description: 'Enable provider switching feature flag',
              details: { flagKey: 'ai-provider-alternative', enabled: true },
              automated: true,
            },
            {
              type: 'configuration',
              description: 'Configure provider fallback logic',
              details: { primaryProvider: 'openai', fallbackProvider: 'anthropic' },
              automated: false,
            },
          ],
          metadata: { provider, currentCost: cost, percentage },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      
      // Check for token inefficiency
      if (provider === 'openai' || provider === 'anthropic') {
        const avgTokensPerOperation = analytics.totalTokens / analytics.totalOperations;
        if (avgTokensPerOperation > 5000) {
          recommendations.push({
            id: `token_optimization_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'query_optimization',
            title: 'Optimize Token Usage for ' + provider.charAt(0).toUpperCase() + provider.slice(1),
            description: `High token usage detected: ${avgTokensPerOperation.toFixed(0)} tokens per operation on average.`,
            rationale: 'Optimizing prompts and responses can significantly reduce token usage while maintaining quality.',
            potentialSavings: {
              monthly: cost * 0.2, // 20% savings estimate
              percentage: 20,
            },
            implementation: {
              effort: 'medium',
              time: 'days',
              complexity: 'moderate',
            },
            impact: {
              cost: 'medium',
              performance: 'positive',
              user_experience: 'neutral',
            },
            status: 'recommended',
            priority: 'medium',
            actions: [
              {
                type: 'code_change',
                description: 'Implement prompt optimization',
                details: { strategy: 'concise_prompts', expectedReduction: '20%' },
                automated: false,
              },
              {
                type: 'feature_flag',
                description: 'Enable token counting and limits',
                details: { flagKey: 'ai-token-optimization', enabled: true },
                automated: true,
              },
            ],
            metadata: { provider, avgTokensPerOperation },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }
    }
    
    return recommendations;
  }

  private async analyzeCachingOpportunities(analytics: CostAnalytics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Check for duplicate operations
    const duplicateOperations = await this.findDuplicateOperations();
    if (duplicateOperations.length > 0) {
      const potentialSavings = duplicateOperations.length * 0.05; // $0.05 per duplicate operation
      
      recommendations.push({
        id: `caching_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'caching',
        title: 'Implement Result Caching',
        description: `Found ${duplicateOperations.length} duplicate operations that could benefit from caching.`,
        rationale: 'Caching results of identical queries can eliminate redundant API calls and reduce costs.',
        potentialSavings: {
          monthly: potentialSavings * 30, // Monthly estimate
          percentage: (potentialSavings * 30 / analytics.totalCost) * 100,
        },
        implementation: {
          effort: 'medium',
          time: 'days',
          complexity: 'moderate',
        },
        impact: {
          cost: 'medium',
          performance: 'positive',
          user_experience: 'positive',
        },
        status: 'recommended',
        priority: 'high',
        actions: [
          {
            type: 'feature_flag',
            description: 'Enable AI search caching',
            details: { flagKey: 'ai-search-caching', enabled: true, ttl: 3600 },
            automated: true,
          },
          {
            type: 'code_change',
            description: 'Implement cache key generation',
            details: { strategy: 'query_hash', includeContext: true },
            automated: false,
          },
        ],
        metadata: { duplicateOperations: duplicateOperations.length },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    return recommendations;
  }

  private async analyzeBatchingOpportunities(analytics: CostAnalytics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Check for high frequency operations
    const highFrequencyOperations = await this.findHighFrequencyOperations();
    if (highFrequencyOperations.length > 0) {
      recommendations.push({
        id: `batching_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'batching',
        title: 'Implement Request Batching',
        description: `Found ${highFrequencyOperations.length} operations suitable for batching.`,
        rationale: 'Combining multiple similar requests into batches can reduce API overhead and costs.',
        potentialSavings: {
          monthly: analytics.totalCost * 0.15, // 15% savings estimate
          percentage: 15,
        },
        implementation: {
          effort: 'medium',
          time: 'days',
          complexity: 'moderate',
        },
        impact: {
          cost: 'medium',
          performance: 'positive',
          user_experience: 'neutral',
        },
        status: 'recommended',
        priority: 'medium',
        actions: [
          {
            type: 'feature_flag',
            description: 'Enable request batching',
            details: { flagKey: 'ai-request-batching', enabled: true, batchSize: 10 },
            automated: true,
          },
          {
            type: 'code_change',
            description: 'Implement batch queue processing',
            details: { strategy: 'time_window', maxWaitTime: 5000 },
            automated: false,
          },
        ],
        metadata: { highFrequencyOperations: highFrequencyOperations.length },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    return recommendations;
  }

  private async analyzeQueryOptimization(analytics: CostAnalytics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Check for inefficient queries
    const inefficientQueries = await this.findInefficientQueries();
    if (inefficientQueries.length > 0) {
      recommendations.push({
        id: `query_optimization_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'query_optimization',
        title: 'Optimize AI Query Generation',
        description: `Found ${inefficientQueries.length} inefficient queries that can be optimized.`,
        rationale: 'Improving query quality and specificity can reduce token usage and improve results.',
        potentialSavings: {
          monthly: analytics.totalCost * 0.1, // 10% savings estimate
          percentage: 10,
        },
        implementation: {
          effort: 'medium',
          time: 'weeks',
          complexity: 'moderate',
        },
        impact: {
          cost: 'medium',
          performance: 'positive',
          user_experience: 'positive',
        },
        status: 'recommended',
        priority: 'medium',
        actions: [
          {
            type: 'feature_flag',
            description: 'Enable query optimization',
            details: { flagKey: 'ai-query-optimization', enabled: true },
            automated: true,
          },
          {
            type: 'code_change',
            description: 'Implement query refinement logic',
            details: { strategy: 'template_based', contextAware: true },
            automated: false,
          },
        ],
        metadata: { inefficientQueries: inefficientQueries.length },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    return recommendations;
  }

  private async analyzeUsagePatterns(analytics: CostAnalytics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Check for unusual usage patterns
    const unusualPatterns = await this.findUnusualUsagePatterns();
    
    for (const pattern of unusualPatterns) {
      if (pattern.type === 'high_frequency_user') {
        recommendations.push({
          id: `usage_pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'usage_pattern',
          title: 'Optimize High-Frequency User Usage',
          description: `User ${pattern.userId} has unusually high usage: ${pattern.operations} operations.`,
          rationale: 'High-frequency users may benefit from usage quotas or optimized workflows.',
          potentialSavings: {
            monthly: pattern.cost * 0.3, // 30% savings estimate
            percentage: 30,
          },
          implementation: {
            effort: 'low',
            time: 'hours',
            complexity: 'simple',
          },
          impact: {
            cost: 'medium',
            performance: 'neutral',
            user_experience: 'neutral',
          },
          status: 'recommended',
          priority: 'medium',
          actions: [
            {
              type: 'policy',
              description: 'Implement user-specific quotas',
              details: { userId: pattern.userId, dailyLimit: 100 },
              automated: true,
            },
            {
              type: 'feature_flag',
              description: 'Enable usage tracking for user',
              details: { flagKey: 'usage-tracking', enabled: true, targetUser: pattern.userId },
              automated: true,
            },
          ],
          metadata: { userId: pattern.userId, operations: pattern.operations, cost: pattern.cost },
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
    
    return recommendations;
  }

  private async analyzeRateLimitingOpportunities(analytics: CostAnalytics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Check for operations that could benefit from rate limiting
    const rateLimitCandidates = await this.findRateLimitCandidates();
    
    if (rateLimitCandidates.length > 0) {
      recommendations.push({
        id: `rate_limiting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'rate_limiting',
        title: 'Implement Smart Rate Limiting',
        description: `Found ${rateLimitCandidates.length} operations suitable for rate limiting.`,
        rationale: 'Rate limiting can prevent cost spikes and encourage more efficient usage patterns.',
        potentialSavings: {
          monthly: analytics.totalCost * 0.1, // 10% savings estimate
          percentage: 10,
        },
        implementation: {
          effort: 'low',
          time: 'hours',
          complexity: 'simple',
        },
        impact: {
          cost: 'medium',
          performance: 'neutral',
          user_experience: 'neutral',
        },
        status: 'recommended',
        priority: 'medium',
        actions: [
          {
            type: 'feature_flag',
            description: 'Enable rate limiting',
            details: { flagKey: 'ai-rate-limiting', enabled: true, requestsPerMinute: 10 },
            automated: true,
          },
          {
            type: 'configuration',
            description: 'Configure rate limit rules',
            details: { rules: rateLimitCandidates },
            automated: true,
          },
        ],
        metadata: { candidates: rateLimitCandidates.length },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    return recommendations;
  }

  private async analyzeFeatureFlagOptimization(analytics: CostAnalytics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];
    
    // Check for expensive features that could be toggled
    const expensiveFeatures = await this.findExpensiveFeatures();
    
    for (const feature of expensiveFeatures) {
      recommendations.push({
        id: `feature_optimization_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'feature_flag',
        title: `Optimize ${feature.name} Feature`,
        description: `Feature ${feature.name} accounts for ${feature.percentage.toFixed(1)}% of costs but may not be essential for all users.`,
        rationale: ' selectively enabling expensive features based on user tiers or usage patterns can reduce costs.',
        potentialSavings: {
          monthly: feature.cost * 0.5, // 50% savings estimate
          percentage: 50,
        },
        implementation: {
          effort: 'low',
          time: 'hours',
          complexity: 'simple',
        },
        impact: {
          cost: 'high',
          performance: 'neutral',
          user_experience: 'neutral',
        },
        status: 'recommended',
        priority: 'medium',
        actions: [
          {
            type: 'feature_flag',
            description: `Enable selective ${feature.name}`,
            details: { flagKey: feature.flagKey, enabled: true, rolloutPercentage: 50 },
            automated: true,
          },
          {
            type: 'policy',
            description: `Implement ${feature.name} usage tiers`,
            details: { tiers: ['basic', 'premium', 'enterprise'] },
            automated: false,
          },
        ],
        metadata: { feature: feature.name, cost: feature.cost, percentage: feature.percentage },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    
    return recommendations;
  }

  /**
   * Implement an optimization recommendation
   */
  async implementRecommendation(recommendationId: string): Promise<boolean> {
    const recommendation = this.recommendations.get(recommendationId);
    if (!recommendation || recommendation.status !== 'recommended') {
      return false;
    }

    recommendation.status = 'in_progress';
    recommendation.updatedAt = new Date();

    try {
      // Execute actions
      for (const action of recommendation.actions) {
        await this.executeOptimizationAction(action);
      }

      recommendation.status = 'implemented';
      recommendation.updatedAt = new Date();

      console.log(`✅ [COST-OPTIMIZATION] Implemented recommendation: ${recommendation.title}`);
      return true;
    } catch (error) {
      recommendation.status = 'recommended'; // Revert on failure
      recommendation.updatedAt = new Date();
      console.error(`❌ [COST-OPTIMIZATION] Failed to implement recommendation: ${recommendation.title}`, error);
      return false;
    }
  }

  private async executeOptimizationAction(action: OptimizationAction): Promise<void> {
    switch (action.type) {
      case 'feature_flag':
        if (action.automated) {
          const { featureFlagService } = await import('@/lib/feature-flags/feature-flag-service');
          await featureFlagService.updateFlag(
            action.details.flagKey,
            { enabled: action.details.enabled, rolloutPercentage: action.details.rolloutPercentage || 100 },
            'cost-optimization'
          );
        }
        break;
      case 'configuration':
        // Configuration changes would depend on the specific config system
        console.log(`🔧 [COST-OPTIMIZATION] Configuration update: ${action.description}`);
        break;
      case 'policy':
        // Policy implementation would depend on the specific policy system
        console.log(`📋 [COST-OPTIMIZATION] Policy update: ${action.description}`);
        break;
      case 'code_change':
        // Code changes would need to be implemented manually
        console.log(`💻 [COST-OPTIMIZATION] Code change required: ${action.description}`);
        break;
      case 'infrastructure':
        // Infrastructure changes would need to be implemented manually
        console.log(`🏗️ [COST-OPTIMIZATION] Infrastructure change required: ${action.description}`);
        break;
    }
  }

  /**
   * Get all recommendations
   */
  getRecommendations(status?: OptimizationRecommendation['status']): OptimizationRecommendation[] {
    const recommendations = Array.from(this.recommendations.values());
    return status ? recommendations.filter(r => r.status === status) : recommendations;
  }

  /**
   * Get cost patterns
   */
  async getCostPatterns(): Promise<CostPattern[]> {
    await this.analyzeCostPatterns();
    return Array.from(this.patterns.values());
  }

  private async analyzeCostPatterns(): Promise<void> {
    // Analyze recent cost data for patterns
    const recentData = await prisma.ai_cost_entries.findMany({
      where: {
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Detect spikes
    const spikes = this.detectCostSpikes(recentData);
    spikes.forEach(spike => {
      this.patterns.set(spike.id, spike);
    });

    // Detect trends
    const trends = this.detectCostTrends(recentData);
    trends.forEach(trend => {
      this.patterns.set(trend.id, trend);
    });

    // Detect waste
    const waste = this.detectCostWaste(recentData);
    waste.forEach(w => {
      this.patterns.set(w.id, w);
    });
  }

  private detectCostSpikes(data: any[]): CostPattern[] {
    const spikes: CostPattern[] = [];
    // Implementation would detect unusual cost spikes
    return spikes;
  }

  private detectCostTrends(data: any[]): CostPattern[] {
    const trends: CostPattern[] = [];
    // Implementation would detect cost trends
    return trends;
  }

  private detectCostWaste(data: any[]): CostPattern[] {
    const waste: CostPattern[] = [];
    // Implementation would detect wasted costs
    return waste;
  }

  // Helper methods for analysis
  private async findDuplicateOperations(): Promise<Array<{ query: string; count: number }>> {
    const duplicates = await prisma.$queryRaw`
      SELECT query, COUNT(*) as count
      FROM ai_searches
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY query
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10
    ` as Array<{ query: string; count: number }>;
    
    return duplicates;
  }

  private async findHighFrequencyOperations(): Promise<Array<{ operation: string; count: number }>> {
    const highFreq = await prisma.$queryRaw`
      SELECT operation_type as operation, COUNT(*) as count
      FROM ai_cost_entries
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY operation_type
      HAVING COUNT(*) > 50
      ORDER BY count DESC
    ` as Array<{ operation: string; count: number }>;
    
    return highFreq;
  }

  private async findInefficientQueries(): Promise<Array<{ query: string; inefficiency: number }>> {
    // Simplified implementation
    return [];
  }

  private async findUnusualUsagePatterns(): Promise<Array<{
    type: string;
    userId: string;
    operations: number;
    cost: number;
  }>> {
    const unusual = await prisma.$queryRaw`
      SELECT 
        user_id,
        COUNT(*) as operations,
        SUM(cost) as cost
      FROM ai_cost_entries
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY user_id
      HAVING COUNT(*) > 100 OR SUM(cost) > 50
      ORDER BY cost DESC
      LIMIT 5
    ` as Array<{ user_id: string; operations: number; cost: number }>;
    
    return unusual.map(u => ({ ...u, type: 'high_frequency_user' }));
  }

  private async findRateLimitCandidates(): Promise<Array<{ operation: string; avgCost: number }>> {
    const candidates = await prisma.$queryRaw`
      SELECT 
        operation_type as operation,
        AVG(cost) as avg_cost
      FROM ai_cost_entries
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      GROUP BY operation_type
      HAVING AVG(cost) > 0.1
      ORDER BY avg_cost DESC
    ` as Array<{ operation: string; avg_cost: number }>;
    
    return candidates;
  }

  private async findExpensiveFeatures(): Promise<Array<{
    name: string;
    flagKey: string;
    cost: number;
    percentage: number;
  }>> {
    // Simplified implementation - would analyze feature flag usage
    return [
      {
        name: 'AI Search Enhancement',
        flagKey: 'ai-search-enhancement',
        cost: 100,
        percentage: 25,
      },
      {
        name: 'Real-time Results',
        flagKey: 'real-time-results',
        cost: 75,
        percentage: 18.75,
      },
    ];
  }

  private async saveRecommendationToDatabase(recommendation: OptimizationRecommendation): Promise<void> {
    await prisma.ai_cost_optimizations.create({
      data: {
        id: recommendation.id,
        type: recommendation.type,
        description: recommendation.description,
        potential_savings: recommendation.potentialSavings.monthly,
        implementation_effort: recommendation.implementation.effort,
        priority: recommendation.priority,
        status: recommendation.status,
        metadata: recommendation.metadata,
      },
    });
  }

  private initializeDefaultRecommendations(): void {
    // Initialize with common recommendations
  }

  private startPeriodicAnalysis(): void {
    // Run analysis every 6 hours
    this.analysisInterval = setInterval(async () => {
      try {
        await this.generateRecommendations();
        await this.analyzeCostPatterns();
      } catch (error) {
        console.error('Cost optimization analysis error:', error);
      }
    }, 6 * 60 * 60 * 1000);

    console.log('✅ [COST-OPTIMIZATION] Periodic analysis started');
  }

  /**
   * Stop periodic analysis
   */
  stopAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
      console.log('🛑 [COST-OPTIMIZATION] Periodic analysis stopped');
    }
  }
}

// Export singleton instance
export const costOptimizationService = CostOptimizationService.getInstance();

// Export utility functions
export async function getCostOptimizationRecommendations(
  userId?: string,
  timeRange?: { start: Date; end: Date }
): Promise<OptimizationRecommendation[]> {
  return costOptimizationService.generateRecommendations(userId, timeRange);
}

export async function implementCostOptimization(recommendationId: string): Promise<boolean> {
  return costOptimizationService.implementRecommendation(recommendationId);
}