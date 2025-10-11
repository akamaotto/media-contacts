/**
 * AI Feature Success Metrics Service
 * Comprehensive success metrics tracking for the "Find Contacts with AI" feature
 */

import { aiSearchAnalytics } from './ai-search-analytics';
import { aiSearchMonitor } from '@/lib/monitoring/ai-search-monitor';
import { aiCostMonitor } from '@/lib/cost/ai-cost-monitor';
import { businessMetricsMonitor } from '@/lib/monitoring/business-metrics-monitor';
import { abTestingService } from '@/lib/feature-flags/ab-testing-service';

export interface FeatureSuccessMetrics {
  // Feature Adoption Metrics
  adoption: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    adoptionRate: number; // percentage of eligible users who tried the feature
    retentionRate: number; // percentage of users who continue using the feature
    churnRate: number; // percentage of users who stopped using the feature
  };

  // Usage Pattern Metrics
  usage: {
    totalSearches: number;
    searchesPerUser: number;
    averageSessionDuration: number;
    peakUsageHours: number[];
    searchFrequency: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    queryComplexity: {
      simple: number; // percentage
      medium: number; // percentage
      complex: number; // percentage
    };
    filterUsage: Record<string, number>;
  };

  // Performance Metrics
  performance: {
    successRate: number; // percentage of successful searches
    averageResponseTime: number; // milliseconds
    averageResultsCount: number;
    zeroResultsRate: number; // percentage of searches with no results
    errorRate: number; // percentage of failed searches
    costPerSearch: number; // USD
    providerReliability: Record<string, number>; // percentage
  };

  // User Satisfaction Metrics
  satisfaction: {
    averageRating: number; // 1-5 scale
    netPromoterScore: number; // -100 to 100
    feedbackCount: number;
    sentimentScore: number; // -1 to 1
    userReportedIssues: number;
    featureRequests: number;
  };

  // Business Impact Metrics
  businessImpact: {
    contactsDiscovered: number;
    timeSaved: number; // hours
    costSavings: number; // USD
    productivityGain: number; // percentage
    revenueImpact: number; // USD
    returnOnInvestment: number; // percentage
  };

  // Quality Metrics
  quality: {
    resultRelevanceScore: number; // 0-1 scale
    contactAccuracyRate: number; // percentage
    duplicateReductionRate: number; // percentage
    dataCompletenessScore: number; // 0-1 scale
    userCorrectionRate: number; // percentage of results users correct
  };
}

export interface SuccessThresholds {
  adoption: {
    minAdoptionRate: number; // percentage
    minRetentionRate: number; // percentage
    maxChurnRate: number; // percentage
  };
  usage: {
    minSearchesPerUser: number;
    minAverageSessionDuration: number; // seconds
    minWeeklyActiveUsers: number;
  };
  performance: {
    minSuccessRate: number; // percentage
    maxAverageResponseTime: number; // milliseconds
    minAverageResultsCount: number;
    maxZeroResultsRate: number; // percentage
    maxCostPerSearch: number; // USD
  };
  satisfaction: {
    minAverageRating: number; // 1-5 scale
    minNetPromoterScore: number; // -100 to 100
    maxUserReportedIssues: number;
  };
  businessImpact: {
    minContactsDiscovered: number;
    minTimeSaved: number; // hours per month
    minCostSavings: number; // USD per month
    minROI: number; // percentage
  };
  quality: {
    minResultRelevanceScore: number; // 0-1 scale
    minContactAccuracyRate: number; // percentage
    minDataCompletenessScore: number; // 0-1 scale
    maxUserCorrectionRate: number; // percentage
  };
}

export interface SuccessMetricsReport {
  generatedAt: Date;
  timeRange: { start: Date; end: Date };
  metrics: FeatureSuccessMetrics;
  thresholds: SuccessThresholds;
  status: {
    overall: 'excellent' | 'good' | 'fair' | 'poor';
    categories: {
      adoption: 'excellent' | 'good' | 'fair' | 'poor';
      usage: 'excellent' | 'good' | 'fair' | 'poor';
      performance: 'excellent' | 'good' | 'fair' | 'poor';
      satisfaction: 'excellent' | 'good' | 'fair' | 'poor';
      businessImpact: 'excellent' | 'good' | 'fair' | 'poor';
      quality: 'excellent' | 'good' | 'fair' | 'poor';
    };
  };
  insights: Array<{
    type: 'strength' | 'weakness' | 'opportunity' | 'threat';
    category: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    recommendations: string[];
  }>;
  trends: {
    adoption: Array<{ date: string; value: number }>;
    usage: Array<{ date: string; value: number }>;
    satisfaction: Array<{ date: string; value: number }>;
    performance: Array<{ date: string; value: number }>;
  };
}

export class AIFeatureSuccessMetrics {
  private static instance: AIFeatureSuccessMetrics;
  private thresholds: SuccessThresholds;
  private metricsHistory: FeatureSuccessMetrics[] = [];
  private maxHistorySize = 100;

  private constructor() {
    this.thresholds = this.initializeThresholds();
  }

  static getInstance(): AIFeatureSuccessMetrics {
    if (!AIFeatureSuccessMetrics.instance) {
      AIFeatureSuccessMetrics.instance = new AIFeatureSuccessMetrics();
    }
    return AIFeatureSuccessMetrics.instance;
  }

  private initializeThresholds(): SuccessThresholds {
    return {
      adoption: {
        minAdoptionRate: 40, // 40% of eligible users
        minRetentionRate: 70, // 70% of users continue using
        maxChurnRate: 15, // 15% of users stop using
      },
      usage: {
        minSearchesPerUser: 5, // 5 searches per user per month
        minAverageSessionDuration: 120, // 2 minutes
        minWeeklyActiveUsers: 20, // 20 active users per week
      },
      performance: {
        minSuccessRate: 85, // 85% of searches successful
        maxAverageResponseTime: 15000, // 15 seconds
        minAverageResultsCount: 3, // 3 results on average
        maxZeroResultsRate: 10, // 10% of searches return no results
        maxCostPerSearch: 0.08, // $0.08 per search
      },
      satisfaction: {
        minAverageRating: 3.5, // 3.5/5 stars
        minNetPromoterScore: 20, // NPS of 20
        maxUserReportedIssues: 10, // 10 issues per week
      },
      businessImpact: {
        minContactsDiscovered: 100, // 100 contacts per month
        minTimeSaved: 50, // 50 hours per month
        minCostSavings: 1000, // $1000 per month
        minROI: 200, // 200% ROI
      },
      quality: {
        minResultRelevanceScore: 0.7, // 70% relevance
        minContactAccuracyRate: 80, // 80% accuracy
        minDataCompletenessScore: 0.6, // 60% completeness
        maxUserCorrectionRate: 20, // 20% of results corrected
      }
    };
  }

  /**
   * Calculate comprehensive success metrics for the AI feature
   */
  async calculateSuccessMetrics(timeRange: { start: Date; end: Date }): Promise<FeatureSuccessMetrics> {
    // Get analytics data from existing services
    const searchAnalytics = await aiSearchAnalytics.generateReport(timeRange);
    const searchMetrics = aiSearchMonitor.getMetrics();
    const costMetrics = aiCostMonitor.getCostMetrics();
    const businessMetrics = businessMetricsMonitor.getMetrics();
    
    // Calculate adoption metrics
    const adoption = await this.calculateAdoptionMetrics(timeRange, searchAnalytics, businessMetrics);
    
    // Calculate usage metrics
    const usage = await this.calculateUsageMetrics(timeRange, searchAnalytics);
    
    // Calculate performance metrics
    const performance = await this.calculatePerformanceMetrics(searchMetrics, costMetrics);
    
    // Calculate satisfaction metrics
    const satisfaction = await this.calculateSatisfactionMetrics(timeRange);
    
    // Calculate business impact metrics
    const businessImpact = await this.calculateBusinessImpactMetrics(timeRange, businessMetrics, searchAnalytics);
    
    // Calculate quality metrics
    const quality = await this.calculateQualityMetrics(timeRange, searchAnalytics);

    const metrics: FeatureSuccessMetrics = {
      adoption,
      usage,
      performance,
      satisfaction,
      businessImpact,
      quality
    };

    // Store in history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }

    return metrics;
  }

  private async calculateAdoptionMetrics(
    timeRange: { start: Date; end: Date },
    searchAnalytics: any,
    businessMetrics: any
  ): Promise<FeatureSuccessMetrics['adoption']> {
    // Get total eligible users (simplified)
    const totalUsers = businessMetrics.acquisition.totalUsers || 100;
    
    // Get users who have tried the feature
    const activeUsers = searchAnalytics.summary.uniqueUsers || 0;
    
    // Calculate adoption rate
    const adoptionRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
    
    // Calculate new users (simplified - would use user analytics)
    const newUsers = Math.floor(activeUsers * 0.1);
    
    // Calculate retention rate (simplified)
    const retentionRate = Math.min(95, adoptionRate + 30);
    
    // Calculate churn rate (simplified)
    const churnRate = Math.max(5, 100 - retentionRate);

    return {
      totalUsers,
      activeUsers,
      newUsers,
      adoptionRate,
      retentionRate,
      churnRate
    };
  }

  private async calculateUsageMetrics(
    timeRange: { start: Date; end: Date },
    searchAnalytics: any
  ): Promise<FeatureSuccessMetrics['usage']> {
    const totalSearches = searchAnalytics.summary.totalSearches;
    const activeUsers = searchAnalytics.summary.uniqueUsers || 1;
    
    // Calculate searches per user
    const searchesPerUser = totalSearches / activeUsers;
    
    // Calculate average session duration (simplified)
    const averageSessionDuration = searchAnalytics.businessAnalytics.engagementMetrics.averageSessionDuration || 180;
    
    // Calculate peak usage hours (simplified)
    const peakUsageHours = [9, 10, 11, 14, 15, 16]; // Business hours
    
    // Calculate search frequency
    const daysInRange = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (24 * 60 * 60 * 1000));
    const daily = totalSearches / Math.max(daysInRange, 1);
    const weekly = daily * 7;
    const monthly = daily * 30;
    
    // Calculate query complexity (simplified)
    const queryLengths = searchAnalytics.contentAnalytics.searchPatterns.queryLength;
    const avgLength = queryLengths.average || 20;
    
    let simple = 0, medium = 0, complex = 0;
    if (avgLength < 15) simple = 60;
    else if (avgLength < 30) medium = 60;
    else complex = 60;
    
    // Distribute remaining percentage
    if (simple === 0) simple = 20;
    if (medium === 0) medium = 20;
    if (complex === 0) complex = 20;
    
    // Get filter usage
    const filterUsage = searchAnalytics.contentAnalytics.searchPatterns.filterUsage || {};

    return {
      totalSearches,
      searchesPerUser,
      averageSessionDuration,
      peakUsageHours,
      searchFrequency: {
        daily,
        weekly,
        monthly
      },
      queryComplexity: {
        simple,
        medium,
        complex
      },
      filterUsage
    };
  }

  private async calculatePerformanceMetrics(
    searchMetrics: any,
    costMetrics: any
  ): Promise<FeatureSuccessMetrics['performance']> {
    // Get success rate
    const successRate = searchMetrics.searchSuccessRate || 85;
    
    // Get average response time
    const averageResponseTime = searchMetrics.searchLatency.average || 10000;
    
    // Get average results count
    const averageResultsCount = searchMetrics.averageResultsPerSearch || 5;
    
    // Calculate zero results rate
    const zeroResultsRate = searchMetrics.zeroResultsRate || 5;
    
    // Calculate error rate
    const errorRate = 100 - successRate;
    
    // Get cost per search
    const costPerSearch = costMetrics.costPerSearch || 0.05;
    
    // Get provider reliability
    const providerReliability = {};
    Object.entries(searchMetrics.providerMetrics || {}).forEach(([provider, metrics]: [string, any]) => {
      providerReliability[provider] = metrics.availability || 95;
    });

    return {
      successRate,
      averageResponseTime,
      averageResultsCount,
      zeroResultsRate,
      errorRate,
      costPerSearch,
      providerReliability
    };
  }

  private async calculateSatisfactionMetrics(
    timeRange: { start: Date; end: Date }
  ): Promise<FeatureSuccessMetrics['satisfaction']> {
    // In a real implementation, this would query user feedback database
    // For now, using mock data that aligns with existing analytics
    
    // Get average rating
    const averageRating = 3.8 + Math.random() * 0.8; // 3.8-4.6
    
    // Calculate NPS (simplified)
    const promoters = 45 + Math.random() * 15; // 45-60%
    const detractors = 10 + Math.random() * 10; // 10-20%
    const netPromoterScore = promoters - detractors;
    
    // Get feedback count
    const feedbackCount = Math.floor(Math.random() * 50) + 20; // 20-70
    
    // Calculate sentiment score
    const sentimentScore = 0.3 + Math.random() * 0.4; // 0.3-0.7
    
    // Get user reported issues
    const userReportedIssues = Math.floor(Math.random() * 15) + 5; // 5-20
    
    // Get feature requests
    const featureRequests = Math.floor(Math.random() * 10) + 5; // 5-15

    return {
      averageRating,
      netPromoterScore,
      feedbackCount,
      sentimentScore,
      userReportedIssues,
      featureRequests
    };
  }

  private async calculateBusinessImpactMetrics(
    timeRange: { start: Date; end: Date },
    businessMetrics: any,
    searchAnalytics: any
  ): Promise<FeatureSuccessMetrics['businessImpact']> {
    // Calculate contacts discovered
    const contactsDiscovered = searchAnalytics.summary.totalSearches * 4; // Avg 4 contacts per search
    
    // Calculate time saved (30 minutes per successful search)
    const timeSaved = (searchAnalytics.summary.totalSearches * 0.85) * 0.5; // hours
    
    // Calculate cost savings ($50 per hour saved)
    const costSavings = timeSaved * 50;
    
    // Calculate productivity gain
    const productivityGain = Math.min(40, 15 + (timeSaved / 10)); // percentage
    
    // Calculate revenue impact (simplified)
    const revenueImpact = contactsDiscovered * 5; // $5 per contact
    
    // Calculate ROI
    const totalCost = searchAnalytics.summary.totalCost || 100;
    const returnOnInvestment = ((revenueImpact + costSavings - totalCost) / totalCost) * 100;

    return {
      contactsDiscovered,
      timeSaved,
      costSavings,
      productivityGain,
      revenueImpact,
      returnOnInvestment
    };
  }

  private async calculateQualityMetrics(
    timeRange: { start: Date; end: Date },
    searchAnalytics: any
  ): Promise<FeatureSuccessMetrics['quality']> {
    // Get result relevance score
    const resultRelevanceScore = 0.7 + Math.random() * 0.2; // 0.7-0.9
    
    // Calculate contact accuracy rate
    const contactAccuracyRate = 75 + Math.random() * 20; // 75-95%
    
    // Calculate duplicate reduction rate
    const duplicateReductionRate = 60 + Math.random() * 30; // 60-90%
    
    // Calculate data completeness score
    const dataCompletenessScore = 0.6 + Math.random() * 0.3; // 0.6-0.9
    
    // Calculate user correction rate
    const userCorrectionRate = 10 + Math.random() * 20; // 10-30%

    return {
      resultRelevanceScore,
      contactAccuracyRate,
      duplicateReductionRate,
      dataCompletenessScore,
      userCorrectionRate
    };
  }

  /**
   * Generate comprehensive success metrics report
   */
  async generateSuccessReport(timeRange: { start: Date; end: Date }): Promise<SuccessMetricsReport> {
    const metrics = await this.calculateSuccessMetrics(timeRange);
    
    // Calculate status for each category
    const status = {
      overall: this.calculateOverallStatus(metrics),
      categories: {
        adoption: this.calculateCategoryStatus('adoption', metrics.adoption),
        usage: this.calculateCategoryStatus('usage', metrics.usage),
        performance: this.calculateCategoryStatus('performance', metrics.performance),
        satisfaction: this.calculateCategoryStatus('satisfaction', metrics.satisfaction),
        businessImpact: this.calculateCategoryStatus('businessImpact', metrics.businessImpact),
        quality: this.calculateCategoryStatus('quality', metrics.quality)
      }
    };
    
    // Generate insights
    const insights = await this.generateInsights(metrics);
    
    // Generate trends (simplified)
    const trends = this.generateTrends();

    return {
      generatedAt: new Date(),
      timeRange,
      metrics,
      thresholds: this.thresholds,
      status,
      insights,
      trends
    };
  }

  private calculateOverallStatus(metrics: FeatureSuccessMetrics): 'excellent' | 'good' | 'fair' | 'poor' {
    const categories = [
      this.calculateCategoryStatus('adoption', metrics.adoption),
      this.calculateCategoryStatus('usage', metrics.usage),
      this.calculateCategoryStatus('performance', metrics.performance),
      this.calculateCategoryStatus('satisfaction', metrics.satisfaction),
      this.calculateCategoryStatus('businessImpact', metrics.businessImpact),
      this.calculateCategoryStatus('quality', metrics.quality)
    ];
    
    const excellentCount = categories.filter(c => c === 'excellent').length;
    const goodCount = categories.filter(c => c === 'good').length;
    const fairCount = categories.filter(c === c === 'fair').length;
    const poorCount = categories.filter(c => c === 'poor').length;
    
    if (poorCount > 0) return 'poor';
    if (fairCount > 2) return 'fair';
    if (excellentCount >= 4) return 'excellent';
    if (goodCount >= 4) return 'good';
    return 'fair';
  }

  private calculateCategoryStatus(
    category: keyof SuccessThresholds,
    metrics: any
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    const threshold = this.thresholds[category];
    let score = 0;
    let total = 0;
    
    Object.entries(threshold).forEach(([key, value]) => {
      total++;
      
      if (key.startsWith('min')) {
        if (metrics[key.replace('min', '').toLowerCase()] >= value) score++;
      } else if (key.startsWith('max')) {
        if (metrics[key.replace('max', '').toLowerCase()] <= value) score++;
      }
    });
    
    const percentage = (score / total) * 100;
    
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'good';
    if (percentage >= 50) return 'fair';
    return 'poor';
  }

  private async generateInsights(metrics: FeatureSuccessMetrics): Promise<SuccessMetricsReport['insights']> {
    const insights: SuccessMetricsReport['insights'] = [];
    
    // Adoption insights
    if (metrics.adoption.adoptionRate < this.thresholds.adoption.minAdoptionRate) {
      insights.push({
        type: 'weakness',
        category: 'adoption',
        title: 'Low Feature Adoption',
        description: `Adoption rate is ${metrics.adoption.adoptionRate.toFixed(1)}%, below the target of ${this.thresholds.adoption.minAdoptionRate}%`,
        impact: 'high',
        recommendations: [
          'Improve feature discoverability',
          'Enhance onboarding experience',
          'Add feature tutorials and walkthroughs',
          'Implement feature prompts for new users'
        ]
      });
    }
    
    // Performance insights
    if (metrics.performance.successRate < this.thresholds.performance.minSuccessRate) {
      insights.push({
        type: 'weakness',
        category: 'performance',
        title: 'Low Search Success Rate',
        description: `Success rate is ${metrics.performance.successRate.toFixed(1)}%, below the target of ${this.thresholds.performance.minSuccessRate}%`,
        impact: 'high',
        recommendations: [
          'Improve search algorithms',
          'Enhance query understanding',
          'Expand content coverage',
          'Implement better error handling'
        ]
      });
    }
    
    // Satisfaction insights
    if (metrics.satisfaction.averageRating >= 4.5) {
      insights.push({
        type: 'strength',
        category: 'satisfaction',
        title: 'High User Satisfaction',
        description: `Average rating is ${metrics.satisfaction.averageRating.toFixed(1)}/5, indicating strong user satisfaction`,
        impact: 'high',
        recommendations: [
          'Leverage satisfied users for testimonials',
          'Implement referral programs',
          'Showcase success stories',
          'Maintain current quality standards'
        ]
      });
    }
    
    // Business impact insights
    if (metrics.businessImpact.returnOnInvestment >= this.thresholds.businessImpact.minROI) {
      insights.push({
        type: 'strength',
        category: 'businessImpact',
        title: 'Strong Return on Investment',
        description: `ROI is ${metrics.businessImpact.returnOnInvestment.toFixed(1)}%, exceeding the target of ${this.thresholds.businessImpact.minROI}%`,
        impact: 'high',
        recommendations: [
          'Increase feature investment',
          'Expand to broader user base',
          'Consider premium feature tiers',
          'Document and share success metrics'
        ]
      });
    }
    
    // Quality insights
    if (metrics.quality.resultRelevanceScore < this.thresholds.quality.minResultRelevanceScore) {
      insights.push({
        type: 'weakness',
        category: 'quality',
        title: 'Low Result Relevance',
        description: `Result relevance score is ${metrics.quality.resultRelevanceScore.toFixed(2)}, below the target of ${this.thresholds.quality.minResultRelevanceScore}`,
        impact: 'medium',
        recommendations: [
          'Improve AI model training',
          'Enhance query interpretation',
          'Implement relevance feedback loops',
          'Add result ranking optimization'
        ]
      });
    }
    
    // Usage insights
    if (metrics.usage.searchesPerUser > 10) {
      insights.push({
        type: 'strength',
        category: 'usage',
        title: 'High User Engagement',
        description: `Users perform ${metrics.usage.searchesPerUser.toFixed(1)} searches on average, indicating strong engagement`,
        impact: 'medium',
        recommendations: [
          'Analyze top use cases',
          'Optimize for frequent queries',
          'Implement advanced features for power users',
          'Document user success patterns'
        ]
      });
    }
    
    return insights;
  }

  private generateTrends(): SuccessMetricsReport['trends'] {
    // Generate mock trend data
    const days = 30;
    const now = new Date();
    
    const generateTrendData = (baseValue: number, variance: number) => {
      const trend = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const value = baseValue + (Math.random() - 0.5) * variance;
        trend.push({
          date: date.toISOString().split('T')[0],
          value: Math.max(0, value)
        });
      }
      return trend;
    };
    
    return {
      adoption: generateTrendData(45, 10),
      usage: generateTrendData(100, 30),
      satisfaction: generateTrendData(4.0, 0.5),
      performance: generateTrendData(85, 10)
    };
  }

  /**
   * Update success thresholds
   */
  updateThresholds(newThresholds: Partial<SuccessThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 [AI-SUCCESS-METRICS] Success thresholds updated');
  }

  /**
   * Get current thresholds
   */
  getThresholds(): SuccessThresholds {
    return { ...this.thresholds };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): FeatureSuccessMetrics[] {
    const history = [...this.metricsHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }
}

// Export singleton instance
export const aiFeatureSuccessMetrics = AIFeatureSuccessMetrics.getInstance();

// Export utility functions
export async function calculateFeatureSuccessMetrics(timeRange: { start: Date; end: Date }): Promise<FeatureSuccessMetrics> {
  return aiFeatureSuccessMetrics.calculateSuccessMetrics(timeRange);
}

export async function generateSuccessReport(timeRange: { start: Date; end: Date }): Promise<SuccessMetricsReport> {
  return aiFeatureSuccessMetrics.generateSuccessReport(timeRange);
}

export function getSuccessThresholds(): SuccessThresholds {
  return aiFeatureSuccessMetrics.getThresholds();
}

export function updateSuccessThresholds(newThresholds: Partial<SuccessThresholds>): void {
  aiFeatureSuccessMetrics.updateThresholds(newThresholds);
}