/**
 * User Behavior Tracker
 * Tracks and analyzes user behavior patterns for the "Find Contacts with AI" feature
 */

import { featureAdoptionTracker } from './feature-adoption-tracker';
import { usagePatternAnalyzer } from './usage-pattern-analyzer';

export interface BehaviorEvent {
  id: string;
  userId: string;
  sessionId: string;
  timestamp: Date;
  eventType: 'page_view' | 'click' | 'search' | 'filter' | 'export' | 'save' | 'share' | 'feedback' | 'error' | 'abandon';
  element?: string; // UI element identifier
  properties: Record<string, any>;
  context: {
    page: string;
    userAgent: string;
    ip: string;
    referrer?: string;
    screenResolution?: string;
    viewportSize?: string;
  };
}

export interface UserBehaviorProfile {
  userId: string;
  demographics: {
    joinDate: Date;
    lastActive: Date;
    accountAge: number; // days
    userSegment: 'new' | 'returning' | 'veteran' | 'power' | 'at_risk' | 'churned';
    role?: string;
    location?: string;
  };
  behavior: {
    totalSessions: number;
    totalEvents: number;
    averageSessionDuration: number; // minutes
    averageEventsPerSession: number;
    preferredTimeOfDay: number[]; // hours when user is most active
    preferredDayOfWeek: number[]; // days when user is most active
    deviceUsage: Record<string, number>; // device type -> percentage
    browserUsage: Record<string, number>; // browser -> percentage
  };
  featureInteraction: {
    mostUsedFeatures: string[];
    leastUsedFeatures: string[];
    featureAdoptionOrder: string[]; // order in which features were adopted
    featureMastery: Record<string, number>; // feature -> mastery score (0-1)
    featureEfficiency: Record<string, number>; // feature -> efficiency score (0-1)
  };
  searchBehavior: {
    totalSearches: number;
    averageQueriesPerSession: number;
    averageQueryLength: number;
    queryComplexity: 'simple' | 'medium' | 'complex';
    refinementRate: number; // percentage of searches that are refined
    filterUsageRate: number; // percentage of searches that use filters
    averageFiltersPerSearch: number;
    averageResultsViewed: number;
    clickThroughRate: number; // percentage
    zeroResultsRate: number; // percentage
    timeToFirstResult: number; // seconds
    timeToExport: number; // seconds
  };
  navigation: {
    entryPoints: string[]; // pages where user typically starts
    exitPoints: string[]; // pages where user typically ends
    commonPaths: Array<{
      path: string[];
      frequency: number;
      conversionRate: number;
    }>;
    abandonmentPoints: string[]; // pages where user typically abandons
    navigationEfficiency: number; // percentage
  };
  satisfaction: {
    implicitSatisfaction: number; // 0-1 scale based on behavior
    engagementScore: number; // 0-1 scale
    frustrationSignals: number; // count of frustration signals
    delightSignals: number; // count of delight signals
    netPromoterScore?: number; // if explicitly provided
  };
}

export interface BehaviorInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'opportunity' | 'risk';
  category: 'engagement' | 'navigation' | 'feature_usage' | 'search_behavior' | 'satisfaction';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number; // 0-1 scale
  data: {
    affectedUsers: number;
    userSegment: string;
    metrics: Record<string, number>;
    examples: string[];
  };
  recommendations: string[];
  generatedAt: Date;
}

export interface BehaviorAnalysis {
  timeRange: { start: Date; end: Date };
  totalUsers: number;
  totalSessions: number;
  totalEvents: number;
  userSegments: Record<string, number>;
  behaviorProfiles: UserBehaviorProfile[];
  insights: BehaviorInsight[];
  funnels: Array<{
    name: string;
    steps: Array<{
      step: string;
      users: number;
      conversionRate: number;
      averageTime: number;
    }>;
    overallConversionRate: number;
  }>;
  cohorts: Array<{
    name: string;
    size: number;
    metrics: Record<string, number>;
    retention: Record<string, number>;
  }>;
}

export interface BehaviorReport {
  generatedAt: Date;
  timeRange: { start: Date; end: Date };
  analysis: BehaviorAnalysis;
  trends: {
    engagement: Array<{ date: string; score: number; users: number }>;
    featureAdoption: Array<{ date: string; feature: string; users: number }>;
    satisfaction: Array<{ date: string; score: number; users: number }>;
    searchEfficiency: Array<{ date: string; efficiency: number; users: number }>;
  };
  predictions: {
    churnRisk: Array<{ userId: string; risk: number; reasons: string[] }>;
    featureAdoption: Array<{ feature: string; likelihood: number; timeline: string }>;
    engagementTrend: 'increasing' | 'stable' | 'decreasing';
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export class UserBehaviorTracker {
  private static instance: UserBehaviorTracker;
  private events: BehaviorEvent[] = [];
  private userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private insights: BehaviorInsight[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startProcessing();
  }

  static getInstance(): UserBehaviorTracker {
    if (!UserBehaviorTracker.instance) {
      UserBehaviorTracker.instance = new UserBehaviorTracker();
    }
    return UserBehaviorTracker.instance;
  }

  /**
   * Track a user behavior event
   */
  async trackEvent(data: {
    userId: string;
    sessionId: string;
    eventType: BehaviorEvent['eventType'];
    element?: string;
    properties: Record<string, any>;
    context: BehaviorEvent['context'];
  }): Promise<void> {
    const event: BehaviorEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...data
    };

    this.events.push(event);
    
    // Keep only last 10000 events
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }

    // Update user profile
    await this.updateUserProfile(data.userId, event);

    console.log(`👤 [BEHAVIOR-TRACKER] Event tracked: ${data.eventType} for user ${data.userId}`);
  }

  /**
   * Track page view
   */
  async trackPageView(
    userId: string,
    sessionId: string,
    page: string,
    context: Partial<BehaviorEvent['context']> = {}
  ): Promise<void> {
    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'page_view',
      element: page,
      properties: { page },
      context: {
        page,
        userAgent: context.userAgent || '',
        ip: context.ip || '',
        referrer: context.referrer,
        screenResolution: context.screenResolution,
        viewportSize: context.viewportSize
      }
    });
  }

  /**
   * Track click event
   */
  async trackClick(
    userId: string,
    sessionId: string,
    element: string,
    properties: Record<string, any> = {},
    context: Partial<BehaviorEvent['context']> = {}
  ): Promise<void> {
    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'click',
      element,
      properties,
      context: {
        page: context.page || '',
        userAgent: context.userAgent || '',
        ip: context.ip || ''
      }
    });
  }

  /**
   * Track search event
   */
  async trackSearch(
    userId: string,
    sessionId: string,
    query: string,
    resultCount: number,
    timeToFirstResult: number,
    properties: Record<string, any> = {},
    context: Partial<BehaviorEvent['context']> = {}
  ): Promise<void> {
    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'search',
      element: 'search_bar',
      properties: {
        query,
        queryLength: query.length,
        resultCount,
        timeToFirstResult,
        ...properties
      },
      context: {
        page: context.page || 'search',
        userAgent: context.userAgent || '',
        ip: context.ip || ''
      }
    });
  }

  /**
   * Track filter usage
   */
  async trackFilter(
    userId: string,
    sessionId: string,
    filterType: string,
    filterValue: string,
    context: Partial<BehaviorEvent['context']> = {}
  ): Promise<void> {
    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'filter',
      element: `filter_${filterType}`,
      properties: {
        filterType,
        filterValue
      },
      context: {
        page: context.page || 'search',
        userAgent: context.userAgent || '',
        ip: context.ip || ''
      }
    });
  }

  /**
   * Track export event
   */
  async trackExport(
    userId: string,
    sessionId: string,
    exportType: string,
    recordCount: number,
    context: Partial<BehaviorEvent['context']> = {}
  ): Promise<void> {
    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'export',
      element: `export_${exportType}`,
      properties: {
        exportType,
        recordCount
      },
      context: {
        page: context.page || 'search',
        userAgent: context.userAgent || '',
        ip: context.ip || ''
      }
    });
  }

  /**
   * Track abandonment event
   */
  async trackAbandonment(
    userId: string,
    sessionId: string,
    abandonmentPoint: string,
    reason?: string,
    context: Partial<BehaviorEvent['context']> = {}
  ): Promise<void> {
    return this.trackEvent({
      userId,
      sessionId,
      eventType: 'abandon',
      element: abandonmentPoint,
      properties: {
        abandonmentPoint,
        reason
      },
      context: {
        page: context.page || '',
        userAgent: context.userAgent || '',
        ip: context.ip || ''
      }
    });
  }

  /**
   * Get user behavior profile
   */
  getUserProfile(userId: string): UserBehaviorProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Analyze user behavior
   */
  async analyzeBehavior(timeRange: { start: Date; end: Date }): Promise<BehaviorAnalysis> {
    // Filter events within time range
    const eventsInRange = this.events.filter(event => 
      event.timestamp >= timeRange.start && event.timestamp <= timeRange.end
    );

    // Get unique users
    const userIds = new Set(eventsInRange.filter(e => e.userId).map(e => e.userId));
    const totalUsers = userIds.size;

    // Get unique sessions
    const sessionIds = new Set(eventsInRange.filter(e => e.sessionId).map(e => e.sessionId));
    const totalSessions = sessionIds.size;

    // Get user behavior profiles
    const behaviorProfiles = Array.from(userIds).map(userId => 
      this.userProfiles.get(userId) || this.createDefaultProfile(userId)
    );

    // Analyze user segments
    const userSegments = this.analyzeUserSegments(behaviorProfiles);

    // Generate insights
    const insights = await this.generateBehaviorInsights(eventsInRange, behaviorProfiles);

    // Analyze funnels
    const funnels = this.analyzeFunnels(eventsInRange);

    // Analyze cohorts
    const cohorts = this.analyzeCohorts(eventsInRange, behaviorProfiles);

    return {
      timeRange,
      totalUsers,
      totalSessions,
      totalEvents: eventsInRange.length,
      userSegments,
      behaviorProfiles,
      insights,
      funnels,
      cohorts
    };
  }

  /**
   * Generate comprehensive behavior report
   */
  async generateBehaviorReport(timeRange: { start: Date; end: Date }): Promise<BehaviorReport> {
    const analysis = await this.analyzeBehavior(timeRange);
    
    // Generate trends
    const trends = this.generateTrends(timeRange);
    
    // Generate predictions
    const predictions = this.generatePredictions(analysis);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(analysis);

    return {
      generatedAt: new Date(),
      timeRange,
      analysis,
      trends,
      predictions,
      recommendations
    };
  }

  private async updateUserProfile(userId: string, event: BehaviorEvent): Promise<void> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = this.createDefaultProfile(userId);
      this.userProfiles.set(userId, profile);
    }

    // Update demographics
    this.updateDemographics(profile, event);
    
    // Update behavior metrics
    this.updateBehaviorMetrics(profile, event);
    
    // Update feature interaction
    this.updateFeatureInteraction(profile, event);
    
    // Update search behavior
    this.updateSearchBehavior(profile, event);
    
    // Update navigation
    this.updateNavigation(profile, event);
    
    // Update satisfaction
    this.updateSatisfaction(profile, event);
  }

  private createDefaultProfile(userId: string): UserBehaviorProfile {
    return {
      userId,
      demographics: {
        joinDate: new Date(),
        lastActive: new Date(),
        accountAge: 0,
        userSegment: 'new'
      },
      behavior: {
        totalSessions: 0,
        totalEvents: 0,
        averageSessionDuration: 0,
        averageEventsPerSession: 0,
        preferredTimeOfDay: [],
        preferredDayOfWeek: [],
        deviceUsage: {},
        browserUsage: {}
      },
      featureInteraction: {
        mostUsedFeatures: [],
        leastUsedFeatures: [],
        featureAdoptionOrder: [],
        featureMastery: {},
        featureEfficiency: {}
      },
      searchBehavior: {
        totalSearches: 0,
        averageQueriesPerSession: 0,
        averageQueryLength: 0,
        queryComplexity: 'simple',
        refinementRate: 0,
        filterUsageRate: 0,
        averageFiltersPerSearch: 0,
        averageResultsViewed: 0,
        clickThroughRate: 0,
        zeroResultsRate: 0,
        timeToFirstResult: 0,
        timeToExport: 0
      },
      navigation: {
        entryPoints: [],
        exitPoints: [],
        commonPaths: [],
        abandonmentPoints: [],
        navigationEfficiency: 0
      },
      satisfaction: {
        implicitSatisfaction: 0.5,
        engagementScore: 0.5,
        frustrationSignals: 0,
        delightSignals: 0
      }
    };
  }

  private updateDemographics(profile: UserBehaviorProfile, event: BehaviorEvent): void {
    profile.demographics.lastActive = event.timestamp;
    profile.demographics.accountAge = (event.timestamp.getTime() - profile.demographics.joinDate.getTime()) / (24 * 60 * 60 * 1000);
    
    // Update user segment based on account age and activity
    if (profile.demographics.accountAge < 30) {
      profile.demographics.userSegment = 'new';
    } else if (profile.demographics.accountAge < 90) {
      profile.demographics.userSegment = 'returning';
    } else if (profile.behavior.totalSessions > 50) {
      profile.demographics.userSegment = 'power';
    } else if (profile.demographics.accountAge < 7) {
      profile.demographics.userSegment = 'new';
    } else {
      profile.demographics.userSegment = 'veteran';
    }
    
    // Check for at_risk or churned status based on recent activity
    const daysSinceLastActive = (new Date().getTime() - profile.demographics.lastActive.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceLastActive > 30) {
      profile.demographics.userSegment = 'churned';
    } else if (daysSinceLastActive > 14) {
      profile.demographics.userSegment = 'at_risk';
    }
  }

  private updateBehaviorMetrics(profile: UserBehaviorProfile, event: BehaviorEvent): void {
    profile.behavior.totalEvents++;
    
    // Update device usage
    if (event.context.userAgent) {
      const device = this.extractDeviceFromUserAgent(event.context.userAgent);
      profile.behavior.deviceUsage[device] = (profile.behavior.deviceUsage[device] || 0) + 1;
    }
    
    // Update browser usage
    if (event.context.userAgent) {
      const browser = this.extractBrowserFromUserAgent(event.context.userAgent);
      profile.behavior.browserUsage[browser] = (profile.behavior.browserUsage[browser] || 0) + 1;
    }
    
    // Update preferred time of day
    const hour = event.timestamp.getHours();
    if (!profile.behavior.preferredTimeOfDay.includes(hour)) {
      profile.behavior.preferredTimeOfDay.push(hour);
      // Keep only top 3 hours
      if (profile.behavior.preferredTimeOfDay.length > 3) {
        profile.behavior.preferredTimeOfDay.sort((a, b) => {
          const countA = this.events.filter(e => 
            e.userId === profile.userId && e.timestamp.getHours() === a
          ).length;
          const countB = this.events.filter(e => 
            e.userId === profile.userId && e.timestamp.getHours() === b
          ).length;
          return countB - countA;
        }).slice(0, 3);
      }
    }
    
    // Update preferred day of week
    const day = event.timestamp.getDay();
    if (!profile.behavior.preferredDayOfWeek.includes(day)) {
      profile.behavior.preferredDayOfWeek.push(day);
      // Keep only top 3 days
      if (profile.behavior.preferredDayOfWeek.length > 3) {
        profile.behavior.preferredDayOfWeek.sort((a, b) => {
          const countA = this.events.filter(e => 
            e.userId === profile.userId && e.timestamp.getDay() === a
          ).length;
          const countB = this.events.filter(e => 
            e.userId === profile.userId && e.timestamp.getDay() === b
          ).length;
          return countB - countA;
        }).slice(0, 3);
      }
    }
  }

  private updateFeatureInteraction(profile: UserBehaviorProfile, event: BehaviorEvent): void {
    if (event.element) {
      // Update feature adoption order if this is a new feature
      if (!profile.featureInteraction.featureAdoptionOrder.includes(event.element)) {
        profile.featureInteraction.featureAdoptionOrder.push(event.element);
      }
      
      // Update feature mastery (simplified - based on usage frequency)
      const usageCount = this.events.filter(e => 
        e.userId === profile.userId && e.element === event.element
      ).length;
      profile.featureInteraction.featureMastery[event.element] = Math.min(1, usageCount / 10);
      
      // Update feature efficiency (simplified - based on success rate)
      let successCount = 0;
      let totalCount = 0;
      this.events.forEach(e => {
        if (e.userId === profile.userId && e.element === event.element) {
          totalCount++;
          if (e.eventType !== 'error' && e.eventType !== 'abandon') {
            successCount++;
          }
        }
      });
      profile.featureInteraction.featureEfficiency[event.element] = totalCount > 0 ? successCount / totalCount : 0;
    }
  }

  private updateSearchBehavior(profile: UserBehaviorProfile, event: BehaviorEvent): void {
    if (event.eventType === 'search') {
      profile.searchBehavior.totalSearches++;
      
      // Update query metrics
      if (event.properties.query) {
        const queryLength = event.properties.query.length;
        profile.searchBehavior.averageQueryLength = 
          (profile.searchBehavior.averageQueryLength * (profile.searchBehavior.totalSearches - 1) + queryLength) / 
          profile.searchBehavior.totalSearches;
        
        // Determine query complexity
        if (queryLength < 15) {
          profile.searchBehavior.queryComplexity = 'simple';
        } else if (queryLength < 30) {
          profile.searchBehavior.queryComplexity = 'medium';
        } else {
          profile.searchBehavior.queryComplexity = 'complex';
        }
      }
      
      // Update time to first result
      if (event.properties.timeToFirstResult) {
        profile.searchBehavior.timeToFirstResult = 
          (profile.searchBehavior.timeToFirstResult * (profile.searchBehavior.totalSearches - 1) + event.properties.timeToFirstResult) / 
          profile.searchBehavior.totalSearches;
      }
      
      // Update average results viewed
      if (event.properties.resultCount) {
        profile.searchBehavior.averageResultsViewed = 
          (profile.searchBehavior.averageResultsViewed * (profile.searchBehavior.totalSearches - 1) + event.properties.resultCount) / 
          profile.searchBehavior.totalSearches;
      }
    }
    
    // Update filter usage
    if (event.eventType === 'filter') {
      profile.searchBehavior.averageFiltersPerSearch = 
        (profile.searchBehavior.averageFiltersPerSearch * (profile.searchBehavior.totalSearches - 1) + 1) / 
        profile.searchBehavior.totalSearches;
    }
    
    // Update export metrics
    if (event.eventType === 'export') {
      profile.searchBehavior.timeToExport = 
        (profile.searchBehavior.timeToExport * (profile.searchBehavior.totalSearches - 1) + 30) / 
        profile.searchBehavior.totalSearches; // Assuming 30 seconds for export
    }
    
    // Calculate derived metrics
    this.calculateDerivedSearchMetrics(profile);
  }

  private calculateDerivedSearchMetrics(profile: UserBehaviorProfile): void {
    // Calculate average queries per session
    const userSessions = new Set(this.events.filter(e => e.userId === profile.userId).map(e => e.sessionId));
    profile.searchBehavior.averageQueriesPerSession = userSessions.size > 0 ? profile.searchBehavior.totalSearches / userSessions.size : 0;
    
    // Calculate refinement rate
    const searchEvents = this.events.filter(e => e.userId === profile.userId && e.eventType === 'search');
    const filterEvents = this.events.filter(e => e.userId === profile.userId && e.eventType === 'filter');
    profile.searchBehavior.refinementRate = searchEvents.length > 0 ? (filterEvents.length / searchEvents.length) * 100 : 0;
    
    // Calculate filter usage rate
    profile.searchBehavior.filterUsageRate = searchEvents.length > 0 ? (filterEvents.length / searchEvents.length) * 100 : 0;
    
    // Calculate click-through rate
    const clickEvents = this.events.filter(e => e.userId === profile.userId && e.eventType === 'click');
    profile.searchBehavior.clickThroughRate = searchEvents.length > 0 ? (clickEvents.length / searchEvents.length) * 100 : 0;
    
    // Calculate zero results rate
    const zeroResultEvents = searchEvents.filter(e => e.properties.resultCount === 0);
    profile.searchBehavior.zeroResultsRate = searchEvents.length > 0 ? (zeroResultEvents.length / searchEvents.length) * 100 : 0;
  }

  private updateNavigation(profile: UserBehaviorProfile, event: BehaviorEvent): void {
    if (event.eventType === 'page_view') {
      // Update entry points
      if (!profile.navigation.entryPoints.includes(event.properties.page)) {
        profile.navigation.entryPoints.push(event.properties.page);
      }
      
      // Update exit points
      profile.navigation.exitPoints = [event.properties.page];
    }
    
    if (event.eventType === 'abandon') {
      // Update abandonment points
      if (!profile.navigation.abandonmentPoints.includes(event.properties.abandonmentPoint)) {
        profile.navigation.abandonmentPoints.push(event.properties.abandonmentPoint);
      }
      
      // Track frustration signals
      profile.satisfaction.frustrationSignals++;
    }
    
    // Calculate navigation efficiency (simplified)
    const successfulEvents = this.events.filter(e => 
      e.userId === profile.userId && e.eventType !== 'error' && e.eventType !== 'abandon'
    );
    const totalEvents = this.events.filter(e => e.userId === profile.userId);
    profile.navigation.navigationEfficiency = totalEvents.length > 0 ? (successfulEvents.length / totalEvents.length) * 100 : 0;
  }

  private updateSatisfaction(profile: UserBehaviorProfile, event: BehaviorEvent): void {
    // Update engagement score based on session duration and events
    const userSessions = new Set(this.events.filter(e => e.userId === profile.userId).map(e => e.sessionId));
    const avgEventsPerSession = userSessions.size > 0 ? profile.behavior.totalEvents / userSessions.size : 0;
    profile.satisfaction.engagementScore = Math.min(1, avgEventsPerSession / 10);
    
    // Track delight signals for successful exports or saves
    if (event.eventType === 'export' || event.eventType === 'save') {
      profile.satisfaction.delightSignals++;
    }
    
    // Calculate implicit satisfaction based on behavior patterns
    const successSignals = profile.satisfaction.delightSignals;
    const frustrationSignals = profile.satisfaction.frustrationSignals;
    const totalSignals = successSignals + frustrationSignals;
    
    if (totalSignals > 0) {
      profile.satisfaction.implicitSatisfaction = successSignals / totalSignals;
    }
  }

  private analyzeUserSegments(profiles: UserBehaviorProfile[]): Record<string, number> {
    const segments: Record<string, number> = {};
    
    profiles.forEach(profile => {
      const segment = profile.demographics.userSegment;
      segments[segment] = (segments[segment] || 0) + 1;
    });
    
    return segments;
  }

  private async generateBehaviorInsights(events: BehaviorEvent[], profiles: UserBehaviorProfile[]): Promise<BehaviorInsight[]> {
    const insights: BehaviorInsight[] = [];
    
    // Analyze high abandonment rate
    const abandonEvents = events.filter(e => e.eventType === 'abandon');
    if (abandonEvents.length > events.length * 0.2) {
      insights.push({
        id: this.generateInsightId(),
        type: 'risk',
        category: 'navigation',
        title: 'High Abandonment Rate',
        description: `${((abandonEvents.length / events.length) * 100).toFixed(1)}% of sessions end with abandonment`,
        impact: 'high',
        confidence: 0.8,
        data: {
          affectedUsers: new Set(abandonEvents.map(e => e.userId)).size,
          userSegment: 'all',
          metrics: {
            abandonmentRate: (abandonEvents.length / events.length) * 100
          },
          examples: abandonEvents.slice(0, 3).map(e => e.properties.abandonmentPoint)
        },
        recommendations: [
          'Investigate abandonment points',
          'Improve user experience at key drop-off points',
          'Add progress indicators',
          'Simplify complex workflows'
        ]
      });
    }
    
    // Analyze low search success rate
    const searchEvents = events.filter(e => e.eventType === 'search');
    const zeroResultEvents = searchEvents.filter(e => e.properties.resultCount === 0);
    if (zeroResultEvents.length > searchEvents.length * 0.15) {
      insights.push({
        id: this.generateInsightId(),
        type: 'risk',
        category: 'search_behavior',
        title: 'High Zero Results Rate',
        description: `${((zeroResultEvents.length / searchEvents.length) * 100).toFixed(1)}% of searches return no results`,
        impact: 'high',
        confidence: 0.9,
        data: {
          affectedUsers: new Set(zeroResultEvents.map(e => e.userId)).size,
          userSegment: 'all',
          metrics: {
            zeroResultsRate: (zeroResultEvents.length / searchEvents.length) * 100
          },
          examples: []
        },
        recommendations: [
          'Improve search algorithms',
          'Expand content coverage',
          'Provide better query suggestions',
          'Implement result refinement options'
        ]
      });
    }
    
    // Analyze low feature adoption
    const featureEvents = events.filter(e => e.element);
    const uniqueFeatures = new Set(featureEvents.map(e => e.element));
    if (uniqueFeatures.size < 5) {
      insights.push({
        id: this.generateInsightId(),
        type: 'opportunity',
        category: 'feature_usage',
        title: 'Low Feature Diversity',
        description: `Users only interact with ${uniqueFeatures.size} different features`,
        impact: 'medium',
        confidence: 0.7,
        data: {
          affectedUsers: profiles.length,
          userSegment: 'all',
          metrics: {
            uniqueFeaturesCount: uniqueFeatures.size
          },
          examples: Array.from(uniqueFeatures).slice(0, 3)
        },
        recommendations: [
          'Improve feature discoverability',
          'Add feature tutorials',
          'Implement feature prompts',
          'Simplify feature access'
        ]
      });
    }
    
    return insights;
  }

  private analyzeFunnels(events: BehaviorEvent[]): BehaviorAnalysis['funnels'] {
    // Define common funnels
    const funnels = [
      {
        name: 'Search Funnel',
        steps: ['search_initiated', 'search_completed', 'result_viewed', 'result_exported']
      },
      {
        name: 'Feature Adoption Funnel',
        steps: ['feature_discovered', 'feature_tried', 'feature_used_regularly']
      }
    ];
    
    return funnels.map(funnel => {
      const stepMetrics = funnel.steps.map(step => {
        const stepEvents = events.filter(e => 
          e.element === step || e.eventType === step
        );
        const users = new Set(stepEvents.map(e => e.userId)).size;
        
        return {
          step,
          users,
          conversionRate: 0, // Will be calculated below
          averageTime: 0 // Simplified
        };
      });
      
      // Calculate conversion rates
      for (let i = 1; i < stepMetrics.length; i++) {
        const previousUsers = stepMetrics[i - 1].users;
        const currentUsers = stepMetrics[i].users;
        stepMetrics[i].conversionRate = previousUsers > 0 ? (currentUsers / previousUsers) * 100 : 0;
      }
      
      return {
        name: funnel.name,
        steps: stepMetrics,
        overallConversionRate: stepMetrics.length > 1 
          ? (stepMetrics[stepMetrics.length - 1].users / stepMetrics[0].users) * 100 
          : 0
      };
    });
  }

  private analyzeCohorts(events: BehaviorEvent[], profiles: UserBehaviorProfile[]): BehaviorAnalysis['cohorts'] {
    // Create monthly cohorts based on join date
    const cohorts: Record<string, UserBehaviorProfile[]> = {};
    
    profiles.forEach(profile => {
      const monthKey = profile.demographics.joinDate.toISOString().slice(0, 7); // YYYY-MM
      if (!cohorts[monthKey]) {
        cohorts[monthKey] = [];
      }
      cohorts[monthKey].push(profile);
    });
    
    return Object.entries(cohorts).map(([name, cohortProfiles]) => ({
      name,
      size: cohortProfiles.length,
      metrics: {
        averageSessionDuration: cohortProfiles.reduce((sum, p) => sum + p.behavior.averageSessionDuration, 0) / cohortProfiles.length,
        averageSearches: cohortProfiles.reduce((sum, p) => sum + p.searchBehavior.totalSearches, 0) / cohortProfiles.length,
        averageSatisfaction: cohortProfiles.reduce((sum, p) => sum + p.satisfaction.implicitSatisfaction, 0) / cohortProfiles.length
      },
      retention: {
        'day_1': 85, // Simplified
        'day_7': 70,
        'day_30': 50
      }
    }));
  }

  private generateTrends(timeRange: { start: Date; end: Date }): BehaviorReport['trends'] {
    // Generate mock trend data
    const days = Math.ceil((timeRange.end.getTime() - timeRange.start.getTime()) / (24 * 60 * 60 * 1000));
    const now = new Date();
    
    const generateTrendData = (baseValue: number, variance: number) => {
      const trend = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const value = baseValue + (Math.random() - 0.5) * variance;
        trend.push({
          date: date.toISOString().split('T')[0],
          score: Math.max(0, Math.min(1, value)),
          users: Math.floor(Math.random() * 100) + 20
        });
      }
      return trend;
    };
    
    return {
      engagement: generateTrendData(0.6, 0.2),
      featureAdoption: generateTrendData(0.4, 0.15),
      satisfaction: generateTrendData(0.7, 0.1),
      searchEfficiency: generateTrendData(0.65, 0.15)
    };
  }

  private generatePredictions(analysis: BehaviorAnalysis): BehaviorReport['predictions'] {
    // Predict churn risk
    const churnRisk = analysis.behaviorProfiles
      .filter(profile => profile.demographics.userSegment === 'at_risk')
      .map(profile => ({
        userId: profile.userId,
        risk: 0.7 + Math.random() * 0.3,
        reasons: ['Low activity', 'Decreased engagement', 'High abandonment rate']
      }))
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 10);
    
    // Predict feature adoption
    const featureAdoption = [
      { feature: 'advanced_filters', likelihood: 0.75, timeline: '2-3 months' },
      { feature: 'search_history', likelihood: 0.85, timeline: '1-2 months' },
      { feature: 'result_exporting', likelihood: 0.65, timeline: '3-4 months' }
    ];
    
    // Predict engagement trend
    const engagementTrend: 'increasing' | 'stable' | 'decreasing' = 
      analysis.insights.filter(i => i.type === 'risk').length > 3 ? 'decreasing' : 'increasing';
    
    return {
      churnRisk,
      featureAdoption,
      engagementTrend
    };
  }

  private generateRecommendations(analysis: BehaviorAnalysis): BehaviorReport['recommendations'] {
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];
    
    // Generate recommendations based on insights
    analysis.insights.forEach(insight => {
      if (insight.impact === 'high') {
        immediate.push(...insight.recommendations.slice(0, 2));
        shortTerm.push(...insight.recommendations.slice(2));
      } else if (insight.impact === 'medium') {
        shortTerm.push(...insight.recommendations.slice(0, 2));
        longTerm.push(...insight.recommendations.slice(2));
      } else {
        longTerm.push(...insight.recommendations);
      }
    });
    
    // Add standard recommendations
    immediate.push('Investigate high abandonment rate');
    shortTerm.push('Improve search result quality');
    longTerm.push('Enhance feature discoverability');
    
    return {
      immediate: [...new Set(immediate)].slice(0, 5),
      shortTerm: [...new Set(shortTerm)].slice(0, 8),
      longTerm: [...new Set(longTerm)].slice(0, 10)
    };
  }

  private extractDeviceFromUserAgent(userAgent: string): string {
    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Tablet')) return 'tablet';
    return 'desktop';
  }

  private extractBrowserFromUserAgent(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari')) return 'safari';
    if (userAgent.includes('Edge')) return 'edge';
    return 'other';
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(() => {
      try {
        this.cleanupOldEvents();
        this.updateUserSegments();
      } catch (error) {
        console.error('User behavior tracking error:', error);
      }
    }, 60000); // Every minute

    console.log('✅ [BEHAVIOR-TRACKER] User behavior tracking started');
  }

  private cleanupOldEvents(): void {
    // Keep only last 90 days of events
    const cutoffTime = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const originalLength = this.events.length;
    
    this.events = this.events.filter(event => event.timestamp >= cutoffTime);
    
    if (this.events.length < originalLength) {
      console.log(`🧹 [BEHAVIOR-TRACKER] Cleaned up ${originalLength - this.events.length} old events`);
    }
  }

  private updateUserSegments(): void {
    // Update user segments based on recent activity
    this.userProfiles.forEach(profile => {
      const daysSinceLastActive = (new Date().getTime() - profile.demographics.lastActive.getTime()) / (24 * 60 * 60 * 1000);
      
      if (daysSinceLastActive > 30) {
        profile.demographics.userSegment = 'churned';
      } else if (daysSinceLastActive > 14) {
        profile.demographics.userSegment = 'at_risk';
      }
    });
  }

  /**
   * Stop the behavior tracking service
   */
  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('🛑 [BEHAVIOR-TRACKER] User behavior tracking stopped');
    }
  }
}

// Export singleton instance
export const userBehaviorTracker = UserBehaviorTracker.getInstance();

// Export utility functions
export async function trackUserEvent(data: {
  userId: string;
  sessionId: string;
  eventType: BehaviorEvent['eventType'];
  element?: string;
  properties: Record<string, any>;
  context: BehaviorEvent['context'];
}): Promise<void> {
  return userBehaviorTracker.trackEvent(data);
}

export async function trackUserPageView(
  userId: string,
  sessionId: string,
  page: string,
  context?: Partial<BehaviorEvent['context']>
): Promise<void> {
  return userBehaviorTracker.trackPageView(userId, sessionId, page, context);
}

export async function trackUserSearch(
  userId: string,
  sessionId: string,
  query: string,
  resultCount: number,
  timeToFirstResult: number,
  context?: Partial<BehaviorEvent['context']>
): Promise<void> {
  return userBehaviorTracker.trackSearch(userId, sessionId, query, resultCount, timeToFirstResult, context);
}

export async function trackUserExport(
  userId: string,
  sessionId: string,
  exportType: string,
  recordCount: number,
  context?: Partial<BehaviorEvent['context']>
): Promise<void> {
  return userBehaviorTracker.trackExport(userId, sessionId, exportType, recordCount, context);
}

export async function trackUserAbandonment(
  userId: string,
  sessionId: string,
  abandonmentPoint: string,
  reason?: string,
  context?: Partial<BehaviorEvent['context']>
): Promise<void> {
  return userBehaviorTracker.trackAbandonment(userId, sessionId, abandonmentPoint, reason, context);
}

export function getUserBehaviorProfile(userId: string): UserBehaviorProfile | null {
  return userBehaviorTracker.getUserProfile(userId);
}

export async function analyzeUserBehavior(timeRange: { start: Date; end: Date }): Promise<BehaviorAnalysis> {
  return userBehaviorTracker.analyzeBehavior(timeRange);
}

export async function generateBehaviorReport(timeRange: { start: Date; end: Date }): Promise<BehaviorReport> {
  return userBehaviorTracker.generateBehaviorReport(timeRange);
}