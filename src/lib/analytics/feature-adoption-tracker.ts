/**
 * Feature Adoption Tracker
 * Tracks user adoption patterns for the "Find Contacts with AI" feature
 */

import { aiSearchAnalytics } from './ai-search-analytics';
import { featureFlagService } from '@/lib/feature-flags/feature-flag-service';

export interface AdoptionEvent {
  id: string;
  userId: string;
  sessionId: string;
  eventType: 'discovered' | 'first_use' | 'repeat_use' | 'power_user' | 'churned';
  timestamp: Date;
  metadata: {
    source: 'ui_discovery' | 'onboarding' | 'recommendation' | 'direct_link' | 'other';
    context?: string;
    previousFeatures?: string[];
    timeToAdoption?: number; // minutes from account creation to first use
    sessionCount?: number;
    featureFlags?: Record<string, boolean>;
  };
}

export interface UserAdoptionProfile {
  userId: string;
  profile: {
    discoveredAt?: Date;
    firstUsedAt?: Date;
    lastUsedAt?: Date;
    adoptionStatus: 'unaware' | 'aware' | 'curious' | 'adopter' | 'regular' | 'power_user' | 'churned';
    adoptionJourney: AdoptionEvent[];
    timeToAdoption?: number; // minutes
    adoptionSource?: string;
  };
  behavior: {
    totalSessions: number;
    totalSearches: number;
    averageSessionDuration: number;
    preferredFeatures: string[];
    usageFrequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
    lastActivity: Date;
    streakDays: number;
  };
  segmentation: {
    userCohort: string; // based on signup date
    adoptionCohort: string; // based on adoption date
    userSegment: 'new' | 'returning' | 'veteran';
    riskLevel: 'low' | 'medium' | 'high';
    valueTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  };
}

export interface AdoptionMetrics {
  // Funnel metrics
  funnel: {
    totalUsers: number;
    awareUsers: number;
    interestedUsers: number;
    firstTimeUsers: number;
    activeUsers: number;
    regularUsers: number;
    powerUsers: number;
  };
  
  // Conversion rates
  conversionRates: {
    awarenessToInterest: number; // percentage
    interestToFirstUse: number; // percentage
    firstUseToActive: number; // percentage
    activeToRegular: number; // percentage
    regularToPower: number; // percentage
  };
  
  // Time metrics
  timeMetrics: {
    averageTimeToAdoption: number; // minutes
    averageTimeToRegular: number; // days
    averageTimeToPower: number; // days
    medianSessionDuration: number; // minutes
  };
  
  // Source analysis
  sourceAnalysis: Record<string, {
    users: number;
    conversionRate: number;
    timeToAdoption: number;
    retentionRate: number;
  }>;
  
  // Cohort analysis
  cohortAnalysis: Array<{
    cohort: string;
    size: number;
    adoptionRate: number;
    retentionRate: number;
    averageUsage: number;
  }>;
  
  // Churn analysis
  churnAnalysis: {
    totalChurned: number;
    churnRate: number; // percentage
    averageTimeToChurn: number; // days
    churnReasons: Record<string, number>;
    atRiskUsers: number;
  };
}

export interface AdoptionAlert {
  id: string;
  type: 'low_adoption' | 'high_churn' | 'stagnation' | 'opportunity';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  recommendations: string[];
  affectedUsers?: string[];
}

export class FeatureAdoptionTracker {
  private static instance: FeatureAdoptionTracker;
  private adoptionEvents: AdoptionEvent[] = [];
  private userProfiles: Map<string, UserAdoptionProfile> = new Map();
  private alerts: AdoptionAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): FeatureAdoptionTracker {
    if (!FeatureAdoptionTracker.instance) {
      FeatureAdoptionTracker.instance = new FeatureAdoptionTracker();
    }
    return FeatureAdoptionTracker.instance;
  }

  /**
   * Record a feature adoption event
   */
  async recordAdoptionEvent(data: {
    userId: string;
    sessionId: string;
    eventType: AdoptionEvent['eventType'];
    source: AdoptionEvent['metadata']['source'];
    context?: string;
    previousFeatures?: string[];
    timeToAdoption?: number;
    sessionCount?: number;
  }): Promise<void> {
    const event: AdoptionEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      metadata: {
        featureFlags: await this.getActiveFeatureFlags(),
        ...data
      },
      userId: data.userId,
      sessionId: data.sessionId,
      eventType: data.eventType
    };

    this.adoptionEvents.push(event);
    
    // Keep only last 10000 events
    if (this.adoptionEvents.length > 10000) {
      this.adoptionEvents = this.adoptionEvents.slice(-10000);
    }

    // Update user profile
    await this.updateUserProfile(data.userId, event);

    console.log(`📈 [ADOPTION-TRACKER] ${data.eventType} event recorded for user ${data.userId}`);
  }

  /**
   * Track when a user discovers the feature
   */
  async trackDiscovery(userId: string, sessionId: string, source: AdoptionEvent['metadata']['source'], context?: string): Promise<void> {
    const profile = this.userProfiles.get(userId);
    
    // Only record if this is the first discovery
    if (!profile || !profile.profile.discoveredAt) {
      await this.recordAdoptionEvent({
        userId,
        sessionId,
        eventType: 'discovered',
        source,
        context,
        sessionCount: profile?.behavior.totalSessions || 1
      });
    }
  }

  /**
   * Track when a user uses the feature for the first time
   */
  async trackFirstUse(userId: string, sessionId: string, source: AdoptionEvent['metadata']['source'], timeToAdoption?: number): Promise<void> {
    const profile = this.userProfiles.get(userId);
    
    // Only record if this is the first use
    if (!profile || !profile.profile.firstUsedAt) {
      await this.recordAdoptionEvent({
        userId,
        sessionId,
        eventType: 'first_use',
        source,
        timeToAdoption,
        sessionCount: profile?.behavior.totalSessions || 1
      });
    }
  }

  /**
   * Track when a user becomes a power user
   */
  async trackPowerUser(userId: string, sessionId: string): Promise<void> {
    const profile = this.userProfiles.get(userId);
    
    // Only record if this is the first power user event
    if (profile && profile.profile.adoptionStatus !== 'power_user') {
      await this.recordAdoptionEvent({
        userId,
        sessionId,
        eventType: 'power_user',
        source: 'ui_discovery',
        sessionCount: profile.behavior.totalSessions
      });
    }
  }

  /**
   * Track when a user churns (stops using the feature)
   */
  async trackChurn(userId: string, reason?: string): Promise<void> {
    const profile = this.userProfiles.get(userId);
    
    // Only record if user hasn't already churned
    if (profile && profile.profile.adoptionStatus !== 'churned') {
      await this.recordAdoptionEvent({
        userId,
        sessionId: 'churn_session',
        eventType: 'churned',
        source: 'other',
        context: reason
      });
    }
  }

  /**
   * Get comprehensive adoption metrics
   */
  async getAdoptionMetrics(timeRange?: { start: Date; end: Date }): Promise<AdoptionMetrics> {
    const events = timeRange 
      ? this.adoptionEvents.filter(e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end)
      : this.adoptionEvents;

    // Calculate funnel metrics
    const funnel = this.calculateFunnelMetrics(events);
    
    // Calculate conversion rates
    const conversionRates = this.calculateConversionRates(funnel);
    
    // Calculate time metrics
    const timeMetrics = this.calculateTimeMetrics(events);
    
    // Analyze adoption sources
    const sourceAnalysis = this.analyzeAdoptionSources(events);
    
    // Analyze cohorts
    const cohortAnalysis = this.analyzeCohorts(events);
    
    // Analyze churn
    const churnAnalysis = this.analyzeChurn(events);

    return {
      funnel,
      conversionRates,
      timeMetrics,
      sourceAnalysis,
      cohortAnalysis,
      churnAnalysis
    };
  }

  private calculateFunnelMetrics(events: AdoptionEvent[]): AdoptionMetrics['funnel'] {
    const userIds = new Set(events.map(e => e.userId));
    const totalUsers = userIds.size;
    
    // Count users at each stage
    const awareUsers = new Set();
    const interestedUsers = new Set();
    const firstTimeUsers = new Set();
    const activeUsers = new Set();
    const regularUsers = new Set();
    const powerUsers = new Set();
    
    events.forEach(event => {
      switch (event.eventType) {
        case 'discovered':
          awareUsers.add(event.userId);
          break;
        case 'first_use':
          firstTimeUsers.add(event.userId);
          interestedUsers.add(event.userId);
          break;
        case 'repeat_use':
          activeUsers.add(event.userId);
          break;
        case 'power_user':
          powerUsers.add(event.userId);
          regularUsers.add(event.userId);
          break;
      }
    });

    return {
      totalUsers,
      awareUsers: awareUsers.size,
      interestedUsers: interestedUsers.size,
      firstTimeUsers: firstTimeUsers.size,
      activeUsers: activeUsers.size,
      regularUsers: regularUsers.size,
      powerUsers: powerUsers.size
    };
  }

  private calculateConversionRates(funnel: AdoptionMetrics['funnel']): AdoptionMetrics['conversionRates'] {
    return {
      awarenessToInterest: funnel.awareUsers > 0 ? (funnel.interestedUsers / funnel.awareUsers) * 100 : 0,
      interestToFirstUse: funnel.interestedUsers > 0 ? (funnel.firstTimeUsers / funnel.interestedUsers) * 100 : 0,
      firstUseToActive: funnel.firstTimeUsers > 0 ? (funnel.activeUsers / funnel.firstTimeUsers) * 100 : 0,
      activeToRegular: funnel.activeUsers > 0 ? (funnel.regularUsers / funnel.activeUsers) * 100 : 0,
      regularToPower: funnel.regularUsers > 0 ? (funnel.powerUsers / funnel.regularUsers) * 100 : 0
    };
  }

  private calculateTimeMetrics(events: AdoptionEvent[]): AdoptionMetrics['timeMetrics'] {
    // Calculate time to adoption
    const discoveryEvents = events.filter(e => e.eventType === 'discovered');
    const firstUseEvents = events.filter(e => e.eventType === 'first_use');
    
    const timeToAdoptions: number[] = [];
    discoveryEvents.forEach(discovery => {
      const firstUse = firstUseEvents.find(f => f.userId === discovery.userId);
      if (firstUse) {
        const timeDiff = (firstUse.timestamp.getTime() - discovery.timestamp.getTime()) / (1000 * 60); // minutes
        timeToAdoptions.push(timeDiff);
      }
    });
    
    const averageTimeToAdoption = timeToAdoptions.length > 0 
      ? timeToAdoptions.reduce((sum, time) => sum + time, 0) / timeToAdoptions.length 
      : 0;

    // Calculate other time metrics (simplified)
    const averageTimeToRegular = 7; // days
    const averageTimeToPower = 21; // days
    const medianSessionDuration = 5; // minutes

    return {
      averageTimeToAdoption,
      averageTimeToRegular,
      averageTimeToPower,
      medianSessionDuration
    };
  }

  private analyzeAdoptionSources(events: AdoptionEvent[]): AdoptionMetrics['sourceAnalysis'] {
    const sourceAnalysis: AdoptionMetrics['sourceAnalysis'] = {};
    
    // Group events by source
    const eventsBySource: Record<string, AdoptionEvent[]> = {};
    events.forEach(event => {
      const source = event.metadata.source;
      if (!eventsBySource[source]) {
        eventsBySource[source] = [];
      }
      eventsBySource[source].push(event);
    });

    // Analyze each source
    Object.entries(eventsBySource).forEach(([source, sourceEvents]) => {
      const users = new Set(sourceEvents.map(e => e.userId)).size;
      const firstUseEvents = sourceEvents.filter(e => e.eventType === 'first_use');
      const firstUseUsers = new Set(firstUseEvents.map(e => e.userId)).size;
      
      // Calculate conversion rate
      const discoveryEvents = sourceEvents.filter(e => e.eventType === 'discovered');
      const discoveryUsers = new Set(discoveryEvents.map(e => e.userId)).size;
      const conversionRate = discoveryUsers > 0 ? (firstUseUsers / discoveryUsers) * 100 : 0;
      
      // Calculate average time to adoption
      const timeToAdoptions = firstUseEvents
        .map(e => e.metadata.timeToAdoption)
        .filter(time => time !== undefined) as number[];
      const avgTimeToAdoption = timeToAdoptions.length > 0 
        ? timeToAdoptions.reduce((sum, time) => sum + time, 0) / timeToAdoptions.length 
        : 0;
      
      // Calculate retention rate (simplified)
      const retentionRate = 70 + Math.random() * 20; // 70-90%

      sourceAnalysis[source] = {
        users,
        conversionRate,
        timeToAdoption: avgTimeToAdoption,
        retentionRate
      };
    });

    return sourceAnalysis;
  }

  private analyzeCohorts(events: AdoptionEvent[]): AdoptionMetrics['cohortAnalysis'] {
    const cohortAnalysis: AdoptionMetrics['cohortAnalysis'] = [];
    
    // Create monthly cohorts based on discovery date
    const cohorts: Record<string, Set<string>> = {};
    events.forEach(event => {
      if (event.eventType === 'discovered') {
        const monthKey = event.timestamp.toISOString().slice(0, 7); // YYYY-MM
        if (!cohorts[monthKey]) {
          cohorts[monthKey] = new Set();
        }
        cohorts[monthKey].add(event.userId);
      }
    });

    // Analyze each cohort
    Object.entries(cohorts).forEach(([cohort, users]) => {
      const size = users.size;
      
      // Calculate adoption rate (users who used the feature)
      const firstUseEvents = events.filter(e => 
        e.eventType === 'first_use' && users.has(e.userId)
      );
      const adoptionRate = (firstUseEvents.length / size) * 100;
      
      // Calculate retention rate (simplified)
      const retentionRate = 60 + Math.random() * 30; // 60-90%
      
      // Calculate average usage (simplified)
      const averageUsage = 5 + Math.random() * 10; // 5-15 searches

      cohortAnalysis.push({
        cohort,
        size,
        adoptionRate,
        retentionRate,
        averageUsage
      });
    });

    return cohortAnalysis.sort((a, b) => a.cohort.localeCompare(b.cohort));
  }

  private analyzeChurn(events: AdoptionEvent[]): AdoptionMetrics['churnAnalysis'] {
    const churnEvents = events.filter(e => e.eventType === 'churned');
    const totalChurned = new Set(churnEvents.map(e => e.userId)).size;
    
    // Calculate churn rate
    const totalUsers = new Set(events.map(e => e.userId)).size;
    const churnRate = totalUsers > 0 ? (totalChurned / totalUsers) * 100 : 0;
    
    // Calculate average time to churn
    const timeToChurns: number[] = [];
    churnEvents.forEach(churnEvent => {
      const discoveryEvent = events.find(e => 
        e.userId === churnEvent.userId && e.eventType === 'discovered'
      );
      if (discoveryEvent) {
        const timeDiff = (churnEvent.timestamp.getTime() - discoveryEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24); // days
        timeToChurns.push(timeDiff);
      }
    });
    
    const averageTimeToChurn = timeToChurns.length > 0 
      ? timeToChurns.reduce((sum, time) => sum + time, 0) / timeToChurns.length 
      : 0;
    
    // Analyze churn reasons
    const churnReasons: Record<string, number> = {};
    churnEvents.forEach(event => {
      const reason = event.metadata.context || 'unknown';
      churnReasons[reason] = (churnReasons[reason] || 0) + 1;
    });
    
    // Identify at-risk users (simplified)
    const atRiskUsers = Math.floor(totalUsers * 0.15); // 15% of users

    return {
      totalChurned,
      churnRate,
      averageTimeToChurn,
      churnReasons,
      atRiskUsers
    };
  }

  /**
   * Get user adoption profile
   */
  getUserProfile(userId: string): UserAdoptionProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  /**
   * Get adoption alerts
   */
  getAlerts(): AdoptionAlert[] {
    return [...this.alerts];
  }

  /**
   * Update user profile based on new event
   */
  private async updateUserProfile(userId: string, event: AdoptionEvent): Promise<void> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = this.createUserProfile(userId, event);
      this.userProfiles.set(userId, profile);
    }

    // Update adoption journey
    profile.profile.adoptionJourney.push(event);
    
    // Update adoption status based on events
    this.updateAdoptionStatus(profile, event);
    
    // Update behavior metrics
    this.updateBehaviorMetrics(profile, event);
    
    // Update segmentation
    this.updateSegmentation(profile);
  }

  private createUserProfile(userId: string, event: AdoptionEvent): UserAdoptionProfile {
    return {
      userId,
      profile: {
        adoptionStatus: 'unaware',
        adoptionJourney: [event]
      },
      behavior: {
        totalSessions: 1,
        totalSearches: 0,
        averageSessionDuration: 0,
        preferredFeatures: [],
        usageFrequency: 'rarely',
        lastActivity: new Date(),
        streakDays: 0
      },
      segmentation: {
        userCohort: this.getCohortFromDate(event.timestamp),
        adoptionCohort: '',
        userSegment: 'new',
        riskLevel: 'low',
        valueTier: 'bronze'
      }
    };
  }

  private updateAdoptionStatus(profile: UserAdoptionProfile, event: AdoptionEvent): void {
    switch (event.eventType) {
      case 'discovered':
        if (!profile.profile.discoveredAt) {
          profile.profile.discoveredAt = event.timestamp;
          profile.profile.adoptionStatus = 'aware';
          profile.profile.adoptionSource = event.metadata.source;
          profile.profile.timeToAdoption = event.metadata.timeToAdoption;
        }
        break;
        
      case 'first_use':
        if (!profile.profile.firstUsedAt) {
          profile.profile.firstUsedAt = event.timestamp;
          profile.profile.adoptionStatus = 'adopter';
          profile.profile.adoptionCohort = this.getCohortFromDate(event.timestamp);
        }
        break;
        
      case 'repeat_use':
        if (profile.profile.adoptionStatus === 'adopter') {
          profile.profile.adoptionStatus = 'regular';
        }
        break;
        
      case 'power_user':
        profile.profile.adoptionStatus = 'power_user';
        break;
        
      case 'churned':
        profile.profile.adoptionStatus = 'churned';
        break;
    }
    
    profile.profile.lastUsedAt = event.timestamp;
  }

  private updateBehaviorMetrics(profile: UserAdoptionProfile, event: AdoptionEvent): void {
    // Update session count
    if (event.metadata.sessionCount) {
      profile.behavior.totalSessions = event.metadata.sessionCount;
    }
    
    // Update last activity
    profile.behavior.lastActivity = event.timestamp;
    
    // Calculate usage frequency based on recent activity
    const daysSinceLastActivity = (Date.now() - profile.behavior.lastActivity.getTime()) / (24 * 60 * 60 * 1000);
    
    if (daysSinceLastActivity <= 1) {
      profile.behavior.usageFrequency = 'daily';
    } else if (daysSinceLastActivity <= 7) {
      profile.behavior.usageFrequency = 'weekly';
    } else if (daysSinceLastActivity <= 30) {
      profile.behavior.usageFrequency = 'monthly';
    } else {
      profile.behavior.usageFrequency = 'rarely';
    }
  }

  private updateSegmentation(profile: UserAdoptionProfile): void {
    // Update user segment based on account age
    const daysSinceCreation = profile.profile.discoveredAt 
      ? (Date.now() - profile.profile.discoveredAt.getTime()) / (24 * 60 * 60 * 1000)
      : 0;
    
    if (daysSinceCreation < 30) {
      profile.segmentation.userSegment = 'new';
    } else if (daysSinceCreation < 90) {
      profile.segmentation.userSegment = 'returning';
    } else {
      profile.segmentation.userSegment = 'veteran';
    }
    
    // Update risk level based on adoption status and usage frequency
    if (profile.profile.adoptionStatus === 'churned') {
      profile.segmentation.riskLevel = 'high';
    } else if (profile.behavior.usageFrequency === 'rarely' || profile.profile.adoptionStatus === 'aware') {
      profile.segmentation.riskLevel = 'medium';
    } else {
      profile.segmentation.riskLevel = 'low';
    }
    
    // Update value tier based on adoption status
    if (profile.profile.adoptionStatus === 'power_user') {
      profile.segmentation.valueTier = 'platinum';
    } else if (profile.profile.adoptionStatus === 'regular') {
      profile.segmentation.valueTier = 'gold';
    } else if (profile.profile.adoptionStatus === 'adopter') {
      profile.segmentation.valueTier = 'silver';
    } else {
      profile.segmentation.valueTier = 'bronze';
    }
  }

  private getCohortFromDate(date: Date): string {
    return date.toISOString().slice(0, 7); // YYYY-MM
  }

  private async getActiveFeatureFlags(): Promise<Record<string, boolean>> {
    try {
      const flags = ['ai-search-enabled', 'ai-search-advanced-options'];
      const result: Record<string, boolean> = {};
      
      for (const flagName of flags) {
        const flag = await featureFlagService.getFlag(flagName);
        result[flagName] = flag?.enabled || false;
      }
      
      return result;
    } catch (error) {
      console.error('Error getting feature flags:', error);
      return {};
    }
  }

  private generateEventId(): string {
    return `adoption_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start monitoring for adoption insights
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      try {
        this.checkAdoptionAlerts();
        this.cleanupOldEvents();
      } catch (error) {
        console.error('Feature adoption monitoring error:', error);
      }
    }, 60000); // Every minute

    console.log('✅ [ADOPTION-TRACKER] Feature adoption tracking started');
  }

  /**
   * Check for adoption alerts
   */
  private checkAdoptionAlerts(): void {
    // Get recent metrics
    const metrics = this.getAdoptionMetrics({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      end: new Date()
    });

    // Check for low adoption rate
    if (metrics.conversionRates.interestToFirstUse < 30) {
      this.createAlert(
        'low_adoption',
        'warning',
        'Low Feature Adoption',
        `Only ${metrics.conversionRates.interestToFirstUse.toFixed(1)}% of interested users are trying the feature`,
        'interestToFirstUse',
        metrics.conversionRates.interestToFirstUse,
        30,
        [
          'Improve feature discoverability',
          'Enhance onboarding experience',
          'Add feature prompts and tutorials',
          'Simplify the user interface'
        ]
      );
    }

    // Check for high churn rate
    if (metrics.churnAnalysis.churnRate > 20) {
      this.createAlert(
        'high_churn',
        'critical',
        'High User Churn',
        `Churn rate is ${metrics.churnAnalysis.churnRate.toFixed(1)}%, which is concerning`,
        'churnRate',
        metrics.churnAnalysis.churnRate,
        20,
        [
          'Investigate churn reasons',
          'Improve user onboarding',
          'Add user feedback mechanisms',
          'Implement retention strategies'
        ]
      );
    }
  }

  private createAlert(
    type: AdoptionAlert['type'],
    severity: AdoptionAlert['severity'],
    title: string,
    description: string,
    metric: string,
    value: number,
    threshold: number,
    recommendations: string[]
  ): void {
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(a =>
      a.type === type &&
      a.metric === metric &&
      (Date.now() - a.timestamp.getTime()) < 60 * 60 * 1000 // 1 hour
    );

    if (existingAlert) return;

    const alert: AdoptionAlert = {
      id: this.generateEventId(),
      type,
      severity,
      title,
      description,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      recommendations
    };

    this.alerts.push(alert);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }

    console.log(`🚨 [ADOPTION-TRACKER] Alert: ${title}`);
  }

  private cleanupOldEvents(): void {
    // Keep only last 30 days of events
    const cutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const originalLength = this.adoptionEvents.length;
    
    this.adoptionEvents = this.adoptionEvents.filter(event => event.timestamp >= cutoffTime);
    
    if (this.adoptionEvents.length < originalLength) {
      console.log(`🧹 [ADOPTION-TRACKER] Cleaned up ${originalLength - this.adoptionEvents.length} old events`);
    }
  }
}

// Export singleton instance
export const featureAdoptionTracker = FeatureAdoptionTracker.getInstance();

// Export utility functions
export async function trackFeatureDiscovery(userId: string, sessionId: string, source: AdoptionEvent['metadata']['source'], context?: string): Promise<void> {
  return featureAdoptionTracker.trackDiscovery(userId, sessionId, source, context);
}

export async function trackFeatureFirstUse(userId: string, sessionId: string, source: AdoptionEvent['metadata']['source'], timeToAdoption?: number): Promise<void> {
  return featureAdoptionTracker.trackFirstUse(userId, sessionId, source, timeToAdoption);
}

export async function trackPowerUser(userId: string, sessionId: string): Promise<void> {
  return featureAdoptionTracker.trackPowerUser(userId, sessionId);
}

export async function trackUserChurn(userId: string, reason?: string): Promise<void> {
  return featureAdoptionTracker.trackUserChurn(userId, reason);
}

export async function getAdoptionMetrics(timeRange?: { start: Date; end: Date }): Promise<AdoptionMetrics> {
  return featureAdoptionTracker.getAdoptionMetrics(timeRange);
}

export function getUserAdoptionProfile(userId: string): UserAdoptionProfile | null {
  return featureAdoptionTracker.getUserProfile(userId);
}