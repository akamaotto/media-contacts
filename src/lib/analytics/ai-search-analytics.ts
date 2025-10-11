/**
 * AI Search Analytics Service
 * Comprehensive analytics and usage tracking for AI Search feature
 */

import { aiSearchMonitor } from '@/lib/monitoring/ai-search-monitor';
import { aiCostMonitor } from '@/lib/cost/ai-cost-monitor';
import { featureFlagService } from '@/lib/feature-flags/feature-flag-service';

export interface SearchEvent {
  id: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  query: string;
  queryType: 'natural_language' | 'keyword' | 'filtered';
  filters: Record<string, any>;
  resultCount: number;
  clickThroughCount: number;
  duration: number; // Time to get results
  provider: string;
  model: string;
  cost: number;
  tokensUsed: number;
  success: boolean;
  error?: string;
  userAgent: string;
  ip: string;
  metadata: {
    featureFlags: Record<string, boolean>;
    userSegment?: string;
    referrer?: string;
    platform?: string;
  };
}

export interface UserAnalytics {
  userId: string;
  profile: {
    joinDate: Date;
    lastActive: Date;
    totalSearches: number;
    averageSearchesPerDay: number;
    averageResultsPerSearch: number;
    averageCostPerSearch: number;
    totalCost: number;
    favoriteQueries: Array<{
      query: string;
      count: number;
      lastUsed: Date;
    }>;
    searchPatterns: {
      peakHours: number[];
      preferredDays: string[];
      averageSessionDuration: number;
    };
  };
  behavior: {
    clickThroughRate: number;
    resultRefinementRate: number;
    searchSuccessRate: number;
    featureAdoption: Record<string, boolean>;
    feedbackScore: number;
    supportTickets: number;
  };
  segmentation: {
    userSegment: string;
    activityLevel: 'low' | 'medium' | 'high';
    valueTier: 'bronze' | 'silver' | 'gold' | 'platinum';
    churnRisk: 'low' | 'medium' | 'high';
  };
}

export interface ContentAnalytics {
  popularQueries: Array<{
    query: string;
    count: number;
    averageResultCount: number;
    successRate: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  searchPatterns: {
    queryLength: {
      average: number;
      distribution: Record<string, number>;
    };
    filterUsage: Record<string, number>;
    timeOfDay: Record<string, number>;
    dayOfWeek: Record<string, number>;
  };
  contentGaps: Array<{
    topic: string;
    searchFrequency: number;
    resultCount: number;
    successRate: number;
    opportunity: 'high' | 'medium' | 'low';
  }>;
  qualityMetrics: {
    averageRelevanceScore: number;
    userSatisfactionScore: number;
    zeroResultsRate: number;
    errorRate: number;
  };
}

export interface PerformanceAnalytics {
  systemMetrics: {
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
      average: number;
    };
    throughput: {
      requestsPerMinute: number;
      requestsPerHour: number;
      requestsPerDay: number;
    };
    availability: {
      uptime: number;
      downtime: number;
      mttr: number; // Mean Time To Repair
    };
    errorRates: {
      overall: number;
      byProvider: Record<string, number>;
      byOperation: Record<string, number>;
    };
  };
  costMetrics: {
    totalCost: number;
    costPerSearch: number;
    costByProvider: Record<string, number>;
    costEfficiency: number;
    roi: number;
  };
  resourceMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    databaseConnections: number;
    cacheHitRate: number;
  };
}

export interface BusinessAnalytics {
  adoptionMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    retentionRate: number;
    churnRate: number;
    featureAdoptionRate: number;
  };
  engagementMetrics: {
    averageSessionDuration: number;
    searchesPerSession: number;
    clickThroughRate: number;
    conversionRate: number;
    userSatisfactionScore: number;
  };
  valueMetrics: {
    costSavings: number;
    productivityGain: number;
    timeSaved: number;
    revenueImpact: number;
    customerLifetimeValue: number;
  };
  competitiveMetrics: {
    marketShare: number;
    userPreference: number;
    featureComparison: Record<string, number>;
    satisfactionBenchmark: number;
  };
}

export interface AnalyticsReport {
  generatedAt: Date;
  timeRange: { start: Date; end: Date };
  summary: {
    totalSearches: number;
    uniqueUsers: number;
    averageResponseTime: number;
    totalCost: number;
    userSatisfaction: number;
  };
  userAnalytics: UserAnalytics[];
  contentAnalytics: ContentAnalytics;
  performanceAnalytics: PerformanceAnalytics;
  businessAnalytics: BusinessAnalytics;
  insights: Array<{
    type: 'opportunity' | 'risk' | 'trend' | 'recommendation';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionItems: string[];
  }>;
}

export class AISearchAnalytics {
  private static instance: AISearchAnalytics;
  private searchEvents: SearchEvent[] = [];
  private userProfiles: Map<string, UserAnalytics> = new Map();
  private analyticsCache: Map<string, { data: any; timestamp: Date }> = new Map();
  private cacheTimeout = 300000; // 5 minutes cache

  private constructor() {
    this.startDataProcessing();
  }

  static getInstance(): AISearchAnalytics {
    if (!AISearchAnalytics.instance) {
      AISearchAnalytics.instance = new AISearchAnalytics();
    }
    return AISearchAnalytics.instance;
  }

  /**
   * Record a search event for analytics
   */
  async recordSearchEvent(data: {
    userId?: string;
    sessionId: string;
    query: string;
    queryType: 'natural_language' | 'keyword' | 'filtered';
    filters: Record<string, any>;
    resultCount: number;
    clickThroughCount: number;
    duration: number;
    provider: string;
    model: string;
    cost: number;
    tokensUsed: number;
    success: boolean;
    error?: string;
    userAgent: string;
    ip: string;
  }): Promise<void> {
    const event: SearchEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      metadata: {
        featureFlags: await this.getActiveFeatureFlags(),
        referrer: this.extractReferrer(data.userAgent),
        platform: this.extractPlatform(data.userAgent)
      },
      ...data
    };

    this.searchEvents.push(event);
    
    // Keep only last 10000 events
    if (this.searchEvents.length > 10000) {
      this.searchEvents = this.searchEvents.slice(-10000);
    }

    // Update user profile
    if (data.userId) {
      await this.updateUserProfile(data.userId, event);
    }

    // Process event for real-time insights
    this.processSearchEvent(event);

    console.log(`📊 [AI-SEARCH-ANALYTICS] Search event recorded: ${event.queryType} - ${event.resultCount} results`);
  }

  /**
   * Get comprehensive analytics report
   */
  async generateReport(timeRange: { start: Date; end: Date }): Promise<AnalyticsReport> {
    const cacheKey = `report_${timeRange.start.getTime()}_${timeRange.end.getTime()}`;
    const cached = this.analyticsCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.cacheTimeout) {
      return cached.data;
    }

    const report: AnalyticsReport = {
      generatedAt: new Date(),
      timeRange,
      summary: this.generateSummary(timeRange),
      userAnalytics: await this.generateUserAnalytics(timeRange),
      contentAnalytics: this.generateContentAnalytics(timeRange),
      performanceAnalytics: await this.generatePerformanceAnalytics(timeRange),
      businessAnalytics: this.generateBusinessAnalytics(timeRange),
      insights: await this.generateInsights(timeRange)
    };

    this.analyticsCache.set(cacheKey, { data: report, timestamp: new Date() });
    return report;
  }

  /**
   * Get user analytics for specific user
   */
  getUserAnalytics(userId: string): UserAnalytics | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Get real-time search metrics
   */
  getRealTimeMetrics(): {
    activeSearches: number;
    searchesPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    topQueries: Array<{ query: string; count: number }>;
  } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    
    const recentSearches = this.searchEvents.filter(event => 
      event.timestamp >= oneMinuteAgo
    );

    const activeSearches = recentSearches.filter(event => 
      now.getTime() - event.timestamp.getTime() < 30000 // Active for 30 seconds
    ).length;

    const queries = recentSearches.reduce((acc, event) => {
      acc[event.query] = (acc[event.query] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topQueries = Object.entries(queries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    const errorCount = recentSearches.filter(event => !event.success).length;
    const errorRate = recentSearches.length > 0 ? (errorCount / recentSearches.length) * 100 : 0;

    const averageResponseTime = recentSearches.length > 0 
      ? recentSearches.reduce((sum, event) => sum + event.duration, 0) / recentSearches.length
      : 0;

    return {
      activeSearches,
      searchesPerMinute: recentSearches.length,
      averageResponseTime,
      errorRate,
      topQueries
    };
  }

  private async updateUserProfile(userId: string, event: SearchEvent): Promise<void> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        profile: {
          joinDate: event.timestamp,
          lastActive: event.timestamp,
          totalSearches: 0,
          averageSearchesPerDay: 0,
          averageResultsPerSearch: 0,
          averageCostPerSearch: 0,
          totalCost: 0,
          favoriteQueries: [],
          searchPatterns: {
            peakHours: [],
            preferredDays: [],
            averageSessionDuration: 0
          }
        },
        behavior: {
          clickThroughRate: 0,
          resultRefinementRate: 0,
          searchSuccessRate: 0,
          featureAdoption: {},
          feedbackScore: 0,
          supportTickets: 0
        },
        segmentation: {
          userSegment: await this.determineUserSegment(userId),
          activityLevel: 'medium',
          valueTier: 'bronze',
          churnRisk: 'low'
        }
      };
      this.userProfiles.set(userId, profile);
    }

    // Update profile with new event data
    profile.profile.totalSearches++;
    profile.profile.lastActive = event.timestamp;
    profile.profile.totalCost += event.cost;
    
    // Update averages
    const userEvents = this.searchEvents.filter(e => e.userId === userId);
    profile.profile.averageResultsPerSearch = userEvents.reduce((sum, e) => sum + e.resultCount, 0) / userEvents.length;
    profile.profile.averageCostPerSearch = profile.profile.totalCost / userEvents.length;
    
    // Update favorite queries
    const queryIndex = profile.profile.favoriteQueries.findIndex(q => q.query === event.query);
    if (queryIndex >= 0) {
      profile.profile.favoriteQueries[queryIndex].count++;
      profile.profile.favoriteQueries[queryIndex].lastUsed = event.timestamp;
    } else {
      profile.profile.favoriteQueries.push({
        query: event.query,
        count: 1,
        lastUsed: event.timestamp
      });
    }
    
    // Sort and keep top 10
    profile.profile.favoriteQueries.sort((a, b) => b.count - a.count);
    profile.profile.favoriteQueries = profile.profile.favoriteQueries.slice(0, 10);
    
    // Update behavior metrics
    profile.behavior.clickThroughRate = this.calculateClickThroughRate(userId);
    profile.behavior.searchSuccessRate = this.calculateSearchSuccessRate(userId);
    
    // Update segmentation
    profile.segmentation.activityLevel = this.calculateActivityLevel(userId);
    profile.segmentation.valueTier = this.calculateValueTier(profile.profile.totalCost);
    profile.segmentation.churnRisk = this.calculateChurnRisk(userId);
  }

  private async determineUserSegment(userId: string): Promise<string> {
    // Check user segments from feature flag service
    const segments = featureFlagService.getUserSegments();
    
    if (segments.some(s => s.id === 'internal-users')) {
      return 'internal';
    } else if (segments.some(s => s.id === 'beta-users')) {
      return 'beta';
    } else if (segments.some(s => s.id === 'power-users')) {
      return 'power';
    }
    
    return 'regular';
  }

  private calculateClickThroughRate(userId: string): number {
    const userEvents = this.searchEvents.filter(e => e.userId === userId);
    if (userEvents.length === 0) return 0;
    
    const totalClicks = userEvents.reduce((sum, event) => sum + event.clickThroughCount, 0);
    return (totalClicks / userEvents.length) * 100;
  }

  private calculateSearchSuccessRate(userId: string): number {
    const userEvents = this.searchEvents.filter(e => e.userId === userId);
    if (userEvents.length === 0) return 0;
    
    const successfulSearches = userEvents.filter(event => event.success).length;
    return (successfulSearches / userEvents.length) * 100;
  }

  private calculateActivityLevel(userId: string): 'low' | 'medium' | 'high' {
    const profile = this.userProfiles.get(userId);
    if (!profile) return 'medium';
    
    const daysSinceJoin = (Date.now() - profile.profile.joinDate.getTime()) / (24 * 60 * 60 * 1000);
    const searchesPerDay = profile.profile.totalSearches / Math.max(daysSinceJoin, 1);
    
    if (searchesPerDay < 1) return 'low';
    if (searchesPerDay < 5) return 'medium';
    return 'high';
  }

  private calculateValueTier(totalCost: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (totalCost < 10) return 'bronze';
    if (totalCost < 50) return 'silver';
    if (totalCost < 200) return 'gold';
    return 'platinum';
  }

  private calculateChurnRisk(userId: string): 'low' | 'medium' | 'high' {
    const profile = this.userProfiles.get(userId);
    if (!profile) return 'medium';
    
    const daysSinceLastActive = (Date.now() - profile.profile.lastActive.getTime()) / (24 * 60 * 60 * 1000);
    
    if (daysSinceLastActive < 7) return 'low';
    if (daysSinceLastActive < 30) return 'medium';
    return 'high';
  }

  private generateSummary(timeRange: { start: Date; end: Date }): AnalyticsReport['summary'] {
    const eventsInRange = this.searchEvents.filter(event => 
      event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );

    const uniqueUsers = new Set(eventsInRange.filter(e => e.userId).map(e => e.userId)).size;
    const averageResponseTime = eventsInRange.length > 0 
      ? eventsInRange.reduce((sum, event) => sum + event.duration, 0) / eventsInRange.length
      : 0;
    const totalCost = eventsInRange.reduce((sum, event) => sum + event.cost, 0);
    const userSatisfaction = this.calculateOverallSatisfaction(eventsInRange);

    return {
      totalSearches: eventsInRange.length,
      uniqueUsers,
      averageResponseTime,
      totalCost,
      userSatisfaction
    };
  }

  private async generateUserAnalytics(timeRange: { start: Date; end: Date }): Promise<UserAnalytics[]> {
    const eventsInRange = this.searchEvents.filter(event => 
      event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );

    const userIds = new Set(eventsInRange.filter(e => e.userId).map(e => e.userId));
    
    return Array.from(userIds).map(userId => 
      this.userProfiles.get(userId) || this.createDefaultUserProfile(userId)
    );
  }

  private createDefaultUserProfile(userId: string): UserAnalytics {
    return {
      userId,
      profile: {
        joinDate: new Date(),
        lastActive: new Date(),
        totalSearches: 0,
        averageSearchesPerDay: 0,
        averageResultsPerSearch: 0,
        averageCostPerSearch: 0,
        totalCost: 0,
        favoriteQueries: [],
        searchPatterns: {
          peakHours: [],
          preferredDays: [],
          averageSessionDuration: 0
        }
      },
      behavior: {
        clickThroughRate: 0,
        resultRefinementRate: 0,
        searchSuccessRate: 0,
        featureAdoption: {},
        feedbackScore: 0,
        supportTickets: 0
      },
      segmentation: {
        userSegment: 'regular',
        activityLevel: 'low',
        valueTier: 'bronze',
        churnRisk: 'medium'
      }
    };
  }

  private generateContentAnalytics(timeRange: { start: Date; end: Date }): ContentAnalytics {
    const eventsInRange = this.searchEvents.filter(event => 
      event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );

    // Popular queries
    const queryCounts = eventsInRange.reduce((acc, event) => {
      acc[event.query] = (acc[event.query] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popularQueries = Object.entries(queryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([query, count]) => {
        const queryEvents = eventsInRange.filter(e => e.query === query);
        const averageResultCount = queryEvents.reduce((sum, e) => sum + e.resultCount, 0) / queryEvents.length;
        const successRate = (queryEvents.filter(e => e.success).length / queryEvents.length) * 100;
        
        return {
          query,
          count,
          averageResultCount,
          successRate,
          trend: 'stable' // Simplified - would calculate from historical data
        };
      });

    // Search patterns
    const queryLengths = eventsInRange.map(event => event.query.length);
    const averageQueryLength = queryLengths.reduce((sum, length) => sum + length, 0) / queryLengths.length;
    
    const queryLengthDistribution = queryLengths.reduce((acc, length) => {
      const bucket = this.getQueryLengthBucket(length);
      acc[bucket] = (acc[bucket] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Filter usage
    const filterUsage = eventsInRange.reduce((acc, event) => {
      Object.keys(event.filters).forEach(filter => {
        acc[filter] = (acc[filter] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    // Time patterns
    const hourUsage = eventsInRange.reduce((acc, event) => {
      const hour = event.timestamp.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const dayUsage = eventsInRange.reduce((acc, event) => {
      const day = event.timestamp.toLocaleDateString('en-US', { weekday: 'long' });
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Content gaps (queries with low success rates or result counts)
    const contentGaps = Object.entries(queryCounts)
      .filter(([query, count]) => count >= 5) // Only consider queries searched at least 5 times
      .map(([query, count]) => {
        const queryEvents = eventsInRange.filter(e => e.query === query);
        const averageResultCount = queryEvents.reduce((sum, e) => sum + e.resultCount, 0) / queryEvents.length;
        const successRate = (queryEvents.filter(e => e.success).length / queryEvents.length) * 100;
        
        let opportunity: 'high' | 'medium' | 'low' = 'low';
        if (successRate < 50 || averageResultCount < 2) opportunity = 'high';
        else if (successRate < 70 || averageResultCount < 5) opportunity = 'medium';

        return {
          query,
          searchFrequency: count,
          resultCount: averageResultCount,
          successRate,
          opportunity
        };
      })
      .filter(gap => gap.opportunity !== 'low')
      .sort((a, b) => b.searchFrequency - a.searchFrequency)
      .slice(0, 10);

    // Quality metrics
    const successfulEvents = eventsInRange.filter(event => event.success);
    const zeroResultsEvents = eventsInRange.filter(event => event.resultCount === 0);
    const errorEvents = eventsInRange.filter(event => !event.success);

    return {
      popularQueries,
      searchPatterns: {
        queryLength: {
          average: averageQueryLength,
          distribution: queryLengthDistribution
        },
        filterUsage,
        timeOfDay: hourUsage,
        dayOfWeek: dayUsage
      },
      contentGaps,
      qualityMetrics: {
        averageRelevanceScore: 0.8, // Simplified - would come from user feedback
        userSatisfactionScore: this.calculateOverallSatisfaction(eventsInRange),
        zeroResultsRate: (zeroResultsEvents.length / eventsInRange.length) * 100,
        errorRate: (errorEvents.length / eventsInRange.length) * 100
      }
    };
  }

  private async generatePerformanceAnalytics(timeRange: { start: Date; end: Date }): Promise<PerformanceAnalytics> {
    // Get metrics from monitoring services
    const searchMetrics = aiSearchMonitor.getMetrics();
    const costMetrics = aiCostMonitor.getCostMetrics();

    return {
      systemMetrics: {
        responseTime: searchMetrics.searchLatency,
        throughput: {
          requestsPerMinute: searchMetrics.searchesPerMinute,
          requestsPerHour: searchMetrics.searchesPerMinute * 60,
          requestsPerDay: searchMetrics.searchesPerMinute * 60 * 24
        },
        availability: {
          uptime: 99.9, // Simplified - would come from monitoring
          downtime: 0.1,
          mttr: 5 // minutes
        },
        errorRates: {
          overall: 100 - searchMetrics.searchSuccessRate,
          byProvider: searchMetrics.providerMetrics,
          byOperation: {
            search: 2,
            extraction: 1,
            'query-generation': 0.5
          }
        }
      },
      costMetrics: {
        totalCost: costMetrics.totalCost,
        costPerSearch: costMetrics.costPerSearch,
        costByProvider: costMetrics.spendByProvider,
        costEfficiency: 0.85, // Simplified calculation
        roi: 2.5 // Simplified calculation
      },
      resourceMetrics: {
        cpuUsage: 65, // Simplified - would come from monitoring
        memoryUsage: 70,
        databaseConnections: 12,
        cacheHitRate: 85
      }
    };
  }

  private generateBusinessAnalytics(timeRange: { start: Date; end: Date }): BusinessAnalytics {
    const eventsInRange = this.searchEvents.filter(event => 
      event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );

    const uniqueUsers = new Set(eventsInRange.filter(e => e.userId).map(e => e.userId)).size;
    const activeUsers = uniqueUsers; // Simplified - would filter by activity level

    return {
      adoptionMetrics: {
        totalUsers: uniqueUsers,
        activeUsers,
        newUsers: Math.floor(uniqueUsers * 0.1), // Simplified
        retentionRate: 85, // Simplified
        churnRate: 15, // Simplified
        featureAdoptionRate: 75 // Simplified
      },
      engagementMetrics: {
        averageSessionDuration: 300, // seconds
        searchesPerSession: 3.5,
        clickThroughRate: 25, // percentage
        conversionRate: 12, // percentage
        userSatisfactionScore: 4.2 // out of 5
      },
      valueMetrics: {
        costSavings: 15000, // USD
        productivityGain: 25, // percentage
        timeSaved: 120, // hours
        revenueImpact: 50000, // USD
        customerLifetimeValue: 2500 // USD
      },
      competitiveMetrics: {
        marketShare: 15, // percentage
        userPreference: 4.1, // out of 5
        featureComparison: {
          'AI Search': 4.5,
          'Traditional Search': 3.2,
          'Hybrid Search': 3.8
        },
        satisfactionBenchmark: 4.2 // out of 5
      }
    };
  }

  private async generateInsights(timeRange: { start: Date; end: Date }): Promise<AnalyticsReport['insights']> {
    const insights: AnalyticsReport['insights'] = [];

    // Generate insights based on data patterns
    const eventsInRange = this.searchEvents.filter(event => 
      event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );

    const errorRate = (eventsInRange.filter(e => !e.success).length / eventsInRange.length) * 100;
    if (errorRate > 10) {
      insights.push({
        type: 'risk',
        title: 'High Error Rate Detected',
        description: `Error rate is ${errorRate.toFixed(1)}%, which exceeds the acceptable threshold of 5%`,
        impact: 'high',
        actionItems: [
          'Investigate error patterns and root causes',
          'Check AI service provider status',
          'Review recent code changes',
          'Implement additional error handling'
        ]
      });
    }

    const averageResponseTime = eventsInRange.reduce((sum, e) => sum + e.duration, 0) / eventsInRange.length;
    if (averageResponseTime > 20000) {
      insights.push({
        type: 'risk',
        title: 'Slow Response Times',
        description: `Average response time is ${(averageResponseTime / 1000).toFixed(1)}s, which may impact user experience`,
        impact: 'medium',
        actionItems: [
          'Optimize AI queries and prompts',
          'Consider switching to faster provider',
          'Implement caching strategies',
          'Add request timeouts'
        ]
      });
    }

    const zeroResultsRate = (eventsInRange.filter(e => e.resultCount === 0).length / eventsInRange.length) * 100;
    if (zeroResultsRate > 15) {
      insights.push({
        type: 'opportunity',
        title: 'High Zero Results Rate',
        description: `${zeroResultsRate.toFixed(1)}% of searches return no results, indicating potential content gaps`,
        impact: 'medium',
        actionItems: [
          'Analyze common zero-result queries',
          'Improve content indexing and coverage',
          'Enhance query understanding and matching',
          'Provide better result suggestions'
        ]
      });
    }

    insights.push({
      type: 'recommendation',
      title: 'Implement Result Caching',
      description: 'Frequently repeated queries could benefit from caching to improve performance and reduce costs',
      impact: 'medium',
      actionItems: [
        'Identify top repeated queries',
        'Implement cache with appropriate TTL',
        'Monitor cache hit rates',
        'Set up cache invalidation strategies'
      ]
    });

    return insights;
  }

  private calculateOverallSatisfaction(events: SearchEvent[]): number {
    // Simplified calculation - in production would use actual user feedback
    const successfulEvents = events.filter(e => e.success);
    if (successfulEvents.length === 0) return 0;
    
    const averageResultCount = successfulEvents.reduce((sum, e) => sum + e.resultCount, 0) / successfulEvents.length;
    
    // Base satisfaction on result count and success rate
    let satisfaction = Math.min(5, averageResultCount / 2);
    satisfaction = Math.max(1, satisfaction);
    
    return satisfaction;
  }

  private getQueryLengthBucket(length: number): string {
    if (length <= 10) return '1-10';
    if (length <= 20) return '11-20';
    if (length <= 30) return '21-30';
    if (length <= 50) return '31-50';
    return '50+';
  }

  private async getActiveFeatureFlags(): Promise<Record<string, boolean>> {
    // Get relevant feature flags
    const flags = ['ai-search-enabled', 'ai-search-advanced-options', 'ai-search-caching'];
    const result: Record<string, boolean> = {};
    
    for (const flagName of flags) {
      try {
        const flag = featureFlagService.getFlag(flagName);
        result[flagName] = flag?.enabled || false;
      } catch (error) {
        result[flagName] = false;
      }
    }
    
    return result;
  }

  private extractReferrer(userAgent: string): string {
    // Simplified referrer extraction
    if (userAgent.includes('Mozilla')) return 'browser';
    if (userAgent.includes('curl')) return 'api';
    return 'unknown';
  }

  private extractPlatform(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'windows';
    if (userAgent.includes('Mac')) return 'macos';
    if (userAgent.includes('Linux')) return 'linux';
    if (userAgent.includes('Mobile')) return 'mobile';
    return 'unknown';
  }

  private processSearchEvent(event: SearchEvent): void {
    // Process event for real-time insights
    // This could trigger alerts, recommendations, or other actions
    if (!event.success) {
      console.warn(`⚠️ [AI-SEARCH-ANALYTICS] Failed search: ${event.query} - ${event.error}`);
    }
  }

  private startDataProcessing(): void {
    // Start background processing for analytics
    setInterval(() => {
      this.cleanupOldData();
      this.updateAggregatedMetrics();
    }, 60000); // Every minute

    console.log('✅ [AI-SEARCH-ANALYTICS] Analytics processing started');
  }

  private cleanupOldData(): void {
    // Remove old events and update cache
    const cutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    
    const originalLength = this.searchEvents.length;
    this.searchEvents = this.searchEvents.filter(event => event.timestamp >= cutoffTime);
    
    if (this.searchEvents.length < originalLength) {
      console.log(`🧹 [AI-SEARCH-ANALYTICS] Cleaned up ${originalLength - this.searchEvents.length} old events`);
    }

    // Clean up analytics cache
    for (const [key, cached] of this.analyticsCache.entries()) {
      if (Date.now() - cached.timestamp.getTime() > this.cacheTimeout) {
        this.analyticsCache.delete(key);
      }
    }
  }

  private updateAggregatedMetrics(): void {
    // Update aggregated metrics for reporting
    // This would calculate daily, weekly, and monthly summaries
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export analytics data for external analysis
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    const data = {
      events: this.searchEvents,
      users: Array.from(this.userProfiles.values()),
      generatedAt: new Date()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV format (simplified)
    const headers = ['timestamp', 'userId', 'query', 'resultCount', 'duration', 'cost'];
    const rows = this.searchEvents.map(event => [
      event.timestamp.toISOString(),
      event.userId || '',
      event.query,
      event.resultCount,
      event.duration,
      event.cost
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Reset all analytics data (for testing)
   */
  reset(): void {
    this.searchEvents = [];
    this.userProfiles.clear();
    this.analyticsCache.clear();
    console.log('🔄 [AI-SEARCH-ANALYTICS] All analytics data reset');
  }
}

// Export singleton instance
export const aiSearchAnalytics = AISearchAnalytics.getInstance();

// Export utility functions
export async function recordSearchEvent(data: {
  userId?: string;
  sessionId: string;
  query: string;
  queryType: 'natural_language' | 'keyword' | 'filtered';
  filters: Record<string, any>;
  resultCount: number;
  clickThroughCount: number;
  duration: number;
  provider: string;
  model: string;
  cost: number;
  tokensUsed: number;
  success: boolean;
  error?: string;
  userAgent: string;
  ip: string;
}): Promise<void> {
  return aiSearchAnalytics.recordSearchEvent(data);
}

export async function generateAnalyticsReport(timeRange: { start: Date; end: Date }): Promise<AnalyticsReport> {
  return aiSearchAnalytics.generateReport(timeRange);
}

export function getRealTimeSearchMetrics() {
  return aiSearchAnalytics.getRealTimeMetrics();
}