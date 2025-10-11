/**
 * User Segmentation and Targeting Service for A/B Testing
 * Manages user segments, targeting rules, and assignment to experiments
 */

import { featureFlagService, type User } from '@/lib/feature-flags/feature-flag-service';
import { experimentConfigService, type ExperimentConfig, type TargetingRule, type TargetingCondition } from './experiment-config-service';

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria[];
  userCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  metadata: Record<string, any>;
}

export interface SegmentCriteria {
  id: string;
  attribute: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between' | 'exists';
  value: any;
  weight?: number;
  logicalOperator?: 'and' | 'or';
}

export interface UserProfile {
  userId: string;
  attributes: Record<string, any>;
  segments: string[];
  behavior: UserBehavior;
  demographics: UserDemographics;
  preferences: UserPreferences;
  activity: UserActivity;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserBehavior {
  searchCount: number;
  lastSearchAt?: Date;
  averageQueriesPerSearch: number;
  successfulSearches: number;
  failedSearches: number;
  averageResponseTime: number;
  featuresUsed: string[];
  conversionEvents: string[];
  lastConversionAt?: Date;
  totalValue: number;
  sessionCount: number;
  averageSessionDuration: number;
  lastSessionAt?: Date;
}

export interface UserDemographics {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  language?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  browser?: string;
  operatingSystem?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  company?: string;
  industry?: string;
  role?: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  notifications: boolean;
  language?: string;
  timezone?: string;
  customSettings: Record<string, any>;
}

export interface UserActivity {
  lastLoginAt: Date;
  loginCount: number;
  daysActive: number;
  currentStreak: number;
  longestStreak: number;
  firstVisitAt: Date;
  lastPageView?: {
    page: string;
    timestamp: Date;
  };
  actions: UserAction[];
}

export interface UserAction {
  type: string;
  timestamp: Date;
  properties: Record<string, any>;
  sessionId?: string;
}

export interface TargetingResult {
  userId: string;
  eligible: boolean;
  matchedSegments: string[];
  matchedRules: TargetingRule[];
  excludedBy: string[];
  score: number;
  metadata: Record<string, any>;
}

export interface SegmentMetrics {
  segmentId: string;
  segmentName: string;
  userCount: number;
  activeUsers: number;
  averageEngagement: number;
  conversionRate: number;
  revenuePerUser: number;
  retentionRate: number;
  experimentParticipation: {
    totalExperiments: number;
    completedExperiments: number;
    ongoingExperiments: number;
  };
}

export interface CohortAnalysis {
  cohortId: string;
  cohortName: string;
  dateRange: { start: Date; end: Date };
  metrics: {
    size: number;
    retentionRate: number[];
    conversionRate: number;
    averageValue: number;
    lifetimeValue: number;
  };
  breakdown: Record<string, any>;
}

export class UserSegmentationService {
  private segments: Map<string, UserSegment> = new Map();
  private userProfiles: Map<string, UserProfile> = new Map();
  private segmentCache: Map<string, string[]> = new Map(); // segmentId -> userIds
  private userSegmentCache: Map<string, string[]> = new Map(); // userId -> segmentIds
  private cacheTimeout = 300000; // 5 minutes

  constructor() {
    this.initializeDefaultSegments();
  }

  /**
   * Create a new user segment
   */
  async createSegment(
    segmentData: Omit<UserSegment, 'id' | 'createdAt' | 'updatedAt'>,
    createdBy: string
  ): Promise<UserSegment> {
    const segment: UserSegment = {
      ...segmentData,
      id: this.generateSegmentId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      updatedBy: createdBy
    };

    // Store the segment
    this.segments.set(segment.id, segment);

    // Clear cache
    this.clearCache();

    console.log(`👥 [SEGMENTATION] Created segment: ${segment.name}`);
    return segment;
  }

  /**
   * Update an existing user segment
   */
  async updateSegment(
    id: string,
    updates: Partial<UserSegment>,
    updatedBy: string
  ): Promise<UserSegment> {
    const segment = this.segments.get(id);
    if (!segment) {
      throw new Error(`Segment with ID ${id} not found`);
    }

    const updatedSegment: UserSegment = {
      ...segment,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
      updatedBy
    };

    // Store the updated segment
    this.segments.set(id, updatedSegment);

    // Clear cache
    this.clearCache();

    console.log(`👥 [SEGMENTATION] Updated segment: ${updatedSegment.name}`);
    return updatedSegment;
  }

  /**
   * Get a user segment by ID
   */
  getSegment(id: string): UserSegment | null {
    return this.segments.get(id) || null;
  }

  /**
   * Get all user segments
   */
  getAllSegments(): UserSegment[] {
    return Array.from(this.segments.values());
  }

  /**
   * Get active user segments
   */
  getActiveSegments(): UserSegment[] {
    return Array.from(this.segments.values()).filter(segment => segment.isActive);
  }

  /**
   * Delete a user segment
   */
  async deleteSegment(id: string, deletedBy: string): Promise<void> {
    const segment = this.segments.get(id);
    if (!segment) {
      throw new Error(`Segment with ID ${id} not found`);
    }

    // Remove the segment
    this.segments.delete(id);

    // Clear cache
    this.clearCache();

    console.log(`👥 [SEGMENTATION] Deleted segment: ${segment.name}`);
  }

  /**
   * Get or create user profile
   */
  async getOrCreateUserProfile(userId: string): Promise<UserProfile> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      profile = await this.createUserProfile(userId);
    }
    
    return profile;
  }

  /**
   * Create a new user profile
   */
  private async createUserProfile(userId: string): Promise<UserProfile> {
    const now = new Date();
    
    // Get user data from feature flag service
    const user = await this.getUserFromFeatureFlagService(userId);
    
    const profile: UserProfile = {
      userId,
      attributes: user?.attributes || {},
      segments: [],
      behavior: {
        searchCount: 0,
        averageQueriesPerSearch: 0,
        successfulSearches: 0,
        failedSearches: 0,
        averageResponseTime: 0,
        featuresUsed: [],
        conversionEvents: [],
        totalValue: 0,
        sessionCount: 0,
        averageSessionDuration: 0
      },
      demographics: {
        country: user?.attributes?.country,
        language: user?.attributes?.language,
        deviceType: user?.attributes?.deviceType,
        browser: user?.attributes?.browser,
        operatingSystem: user?.attributes?.operatingSystem
      },
      preferences: {
        notifications: true,
        customSettings: {}
      },
      activity: {
        lastLoginAt: now,
        loginCount: 1,
        daysActive: 1,
        currentStreak: 1,
        longestStreak: 1,
        firstVisitAt: now,
        actions: []
      },
      createdAt: now,
      updatedAt: now
    };

    this.userProfiles.set(userId, profile);
    return profile;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile> {
    const profile = await this.getOrCreateUserProfile(userId);
    
    const updatedProfile: UserProfile = {
      ...profile,
      ...updates,
      userId, // Ensure userId doesn't change
      updatedAt: new Date()
    };

    this.userProfiles.set(userId, updatedProfile);
    
    // Update segment assignments
    await this.updateUserSegments(userId);
    
    return updatedProfile;
  }

  /**
   * Track user action
   */
  async trackUserAction(
    userId: string,
    action: Omit<UserAction, 'timestamp'>
  ): Promise<void> {
    const profile = await this.getOrCreateUserProfile(userId);
    
    const userAction: UserAction = {
      ...action,
      timestamp: new Date()
    };

    // Add to actions history
    profile.activity.actions.push(userAction);
    
    // Keep only last 1000 actions
    if (profile.activity.actions.length > 1000) {
      profile.activity.actions = profile.activity.actions.slice(-1000);
    }

    // Update behavior based on action type
    this.updateUserBehavior(profile, userAction);
    
    // Update activity
    this.updateUserActivity(profile, userAction);
    
    // Save updated profile
    profile.updatedAt = new Date();
    this.userProfiles.set(userId, profile);
  }

  /**
   * Check if user belongs to a segment
   */
  async isUserInSegment(userId: string, segmentId: string): Promise<boolean> {
    // Check cache first
    const userSegmentsCache = this.userSegmentCache.get(userId);
    if (userSegmentsCache) {
      return userSegmentsCache.includes(segmentId);
    }

    const profile = await this.getOrCreateUserProfile(userId);
    const segment = this.segments.get(segmentId);
    
    if (!segment || !segment.isActive) {
      return false;
    }

    const isInSegment = this.evaluateSegmentCriteria(profile, segment.criteria);
    
    // Update cache
    this.updateUserSegmentCache(userId, segmentId, isInSegment);
    
    return isInSegment;
  }

  /**
   * Get all segments for a user
   */
  async getUserSegments(userId: string): Promise<string[]> {
    // Check cache first
    const userSegmentsCache = this.userSegmentCache.get(userId);
    if (userSegmentsCache) {
      return userSegmentsCache;
    }

    const profile = await this.getOrCreateUserProfile(userId);
    const userSegmentIds: string[] = [];

    // Check against all active segments
    for (const [segmentId, segment] of this.segments) {
      if (segment.isActive && this.evaluateSegmentCriteria(profile, segment.criteria)) {
        userSegmentIds.push(segmentId);
      }
    }

    // Update cache
    this.userSegmentCache.set(userId, userSegmentIds);
    
    return userSegmentIds;
  }

  /**
   * Get users in a segment
   */
  async getUsersInSegment(segmentId: string): Promise<string[]> {
    // Check cache first
    const segmentCache = this.segmentCache.get(segmentId);
    if (segmentCache) {
      return segmentCache;
    }

    const segment = this.segments.get(segmentId);
    if (!segment || !segment.isActive) {
      return [];
    }

    const userIds: string[] = [];
    
    // Check all user profiles
    for (const [userId, profile] of this.userProfiles) {
      if (this.evaluateSegmentCriteria(profile, segment.criteria)) {
        userIds.push(userId);
      }
    }

    // Update cache
    this.segmentCache.set(segmentId, userIds);
    
    return userIds;
  }

  /**
   * Evaluate targeting rules for an experiment
   */
  async evaluateTargeting(
    userId: string,
    experiment: ExperimentConfig
  ): Promise<TargetingResult> {
    const userSegments = await this.getUserSegments(userId);
    const matchedRules: TargetingRule[] = [];
    const excludedBy: string[] = [];
    let eligible = true;
    let score = 0;

    // Evaluate each targeting rule
    for (const rule of experiment.targetingRules) {
      const ruleResult = await this.evaluateTargetingRule(userId, rule, userSegments);
      
      if (ruleResult.matched) {
        matchedRules.push(rule);
        score += ruleResult.score || 0;
        
        if (rule.type === 'exclude') {
          eligible = false;
          excludedBy.push(rule.name);
        }
      }
    }

    return {
      userId,
      eligible,
      matchedSegments: userSegments,
      matchedRules,
      excludedBy,
      score,
      metadata: {
        experimentId: experiment.id,
        timestamp: new Date()
      }
    };
  }

  /**
   * Get segment metrics
   */
  async getSegmentMetrics(segmentId: string): Promise<SegmentMetrics | null> {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      return null;
    }

    const userIds = await this.getUsersInSegment(segmentId);
    const userCount = userIds.length;
    
    if (userCount === 0) {
      return {
        segmentId,
        segmentName: segment.name,
        userCount: 0,
        activeUsers: 0,
        averageEngagement: 0,
        conversionRate: 0,
        revenuePerUser: 0,
        retentionRate: 0,
        experimentParticipation: {
          totalExperiments: 0,
          completedExperiments: 0,
          ongoingExperiments: 0
        }
      };
    }

    // Calculate metrics
    let totalEngagement = 0;
    let totalConversions = 0;
    let totalRevenue = 0;
    let activeUsers = 0;
    let experimentParticipation = {
      totalExperiments: 0,
      completedExperiments: 0,
      ongoingExperiments: 0
    };

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const userId of userIds) {
      const profile = this.userProfiles.get(userId);
      if (!profile) continue;

      // Check if user is active (last 30 days)
      if (profile.activity.lastLoginAt > thirtyDaysAgo) {
        activeUsers++;
      }

      // Calculate engagement score
      const engagement = this.calculateEngagementScore(profile);
      totalEngagement += engagement;

      // Count conversions
      totalConversions += profile.behavior.conversionEvents.length;

      // Sum revenue
      totalRevenue += profile.behavior.totalValue;

      // Sum experiment participation (simplified)
      experimentParticipation.totalExperiments += 1; // Would be calculated from actual experiment data
    }

    const averageEngagement = totalEngagement / userCount;
    const conversionRate = totalConversions / userCount;
    const revenuePerUser = totalRevenue / userCount;
    const retentionRate = activeUsers / userCount;

    return {
      segmentId,
      segmentName: segment.name,
      userCount,
      activeUsers,
      averageEngagement,
      conversionRate,
      revenuePerUser,
      retentionRate,
      experimentParticipation
    };
  }

  /**
   * Create cohort analysis
   */
  async createCohortAnalysis(
    cohortDefinition: Partial<UserSegment>,
    dateRange: { start: Date; end: Date }
  ): Promise<CohortAnalysis> {
    const cohortId = this.generateSegmentId();
    const cohortName = cohortDefinition.name || `Cohort ${cohortId}`;
    
    // Create temporary segment for cohort
    const tempSegment: UserSegment = {
      id: cohortId,
      name: cohortName,
      description: cohortDefinition.description || 'Temporary cohort for analysis',
      criteria: cohortDefinition.criteria || [],
      userCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      updatedBy: 'system',
      metadata: { isTemporary: true, dateRange }
    };

    // Find users in cohort
    const userIds: string[] = [];
    for (const [userId, profile] of this.userProfiles) {
      if (this.evaluateSegmentCriteria(profile, tempSegment.criteria)) {
        // Check if user was created within date range
        if (profile.createdAt >= dateRange.start && profile.createdAt <= dateRange.end) {
          userIds.push(userId);
        }
      }
    }

    const cohortSize = userIds.length;
    
    // Calculate cohort metrics
    let retentionRate: number[] = [];
    let totalConversions = 0;
    let totalValue = 0;
    let totalLifetimeValue = 0;

    // Simplified cohort analysis - in production would be more sophisticated
    for (let day = 1; day <= 30; day++) {
      const dayStart = new Date(dateRange.start.getTime() + day * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      let activeUsers = 0;
      for (const userId of userIds) {
        const profile = this.userProfiles.get(userId);
        if (profile && profile.activity.lastLoginAt >= dayStart && profile.activity.lastLoginAt < dayEnd) {
          activeUsers++;
        }
      }
      
      retentionRate.push(activeUsers / cohortSize);
    }

    // Calculate other metrics
    for (const userId of userIds) {
      const profile = this.userProfiles.get(userId);
      if (!profile) continue;
      
      totalConversions += profile.behavior.conversionEvents.length;
      totalValue += profile.behavior.totalValue;
      totalLifetimeValue += this.calculateLifetimeValue(profile);
    }

    return {
      cohortId,
      cohortName,
      dateRange,
      metrics: {
        size: cohortSize,
        retentionRate,
        conversionRate: totalConversions / cohortSize,
        averageValue: totalValue / cohortSize,
        lifetimeValue: totalLifetimeValue / cohortSize
      },
      breakdown: {
        // Additional breakdown data would be added here
      }
    };
  }

  /**
   * Evaluate segment criteria against user profile
   */
  private evaluateSegmentCriteria(profile: UserProfile, criteria: SegmentCriteria[]): boolean {
    if (criteria.length === 0) {
      return true;
    }

    // Group criteria by logical operator
    const andGroups: SegmentCriteria[][] = [];
    let currentGroup: SegmentCriteria[] = [];

    for (const criterion of criteria) {
      if (criterion.logicalOperator === 'or' && currentGroup.length > 0) {
        andGroups.push([...currentGroup]);
        currentGroup = [criterion];
      } else {
        currentGroup.push(criterion);
      }
    }

    if (currentGroup.length > 0) {
      andGroups.push(currentGroup);
    }

    // Evaluate each AND group (OR between groups)
    for (const group of andGroups) {
      if (this.evaluateAndGroup(profile, group)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Evaluate a group of criteria with AND logic
   */
  private evaluateAndGroup(profile: UserProfile, criteria: SegmentCriteria[]): boolean {
    return criteria.every(criterion => this.evaluateCriterion(profile, criterion));
  }

  /**
   * Evaluate a single criterion
   */
  private evaluateCriterion(profile: UserProfile, criterion: SegmentCriteria): boolean {
    const value = this.getAttributeValue(profile, criterion.attribute);
    
    switch (criterion.operator) {
      case 'equals':
        return value === criterion.value;
      case 'not_equals':
        return value !== criterion.value;
      case 'contains':
        return String(value).includes(String(criterion.value));
      case 'greater_than':
        return Number(value) > Number(criterion.value);
      case 'less_than':
        return Number(value) < Number(criterion.value);
      case 'in':
        return Array.isArray(criterion.value) && criterion.value.includes(value);
      case 'not_in':
        return Array.isArray(criterion.value) && !criterion.value.includes(value);
      case 'between':
        return Array.isArray(criterion.value) && 
               criterion.value.length === 2 && 
               Number(value) >= criterion.value[0] && 
               Number(value) <= criterion.value[1];
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  /**
   * Get attribute value from user profile
   */
  private getAttributeValue(profile: UserProfile, attribute: string): any {
    // Check direct attributes
    if (profile.attributes[attribute] !== undefined) {
      return profile.attributes[attribute];
    }

    // Check nested properties
    const parts = attribute.split('.');
    let current: any = profile;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && current[part] !== undefined) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Evaluate targeting rule
   */
  private async evaluateTargetingRule(
    userId: string,
    rule: TargetingRule,
    userSegments: string[]
  ): Promise<{ matched: boolean; score?: number }> {
    // Check if rule applies to user segments
    const segmentMatched = rule.conditions.some(condition => 
      this.evaluateTargetingCondition(userId, condition, userSegments)
    );

    if (!segmentMatched) {
      return { matched: false };
    }

    // Check percentage if specified
    if (rule.percentage && rule.percentage < 100) {
      const hash = this.hashUserId(userId);
      const bucket = hash % 100;
      
      if (bucket >= rule.percentage) {
        return { matched: false };
      }
    }

    // Calculate score based on rule importance
    const score = rule.conditions.reduce((sum, condition) => {
      return sum + (condition.weight || 1);
    }, 0);

    return { matched: true, score };
  }

  /**
   * Evaluate targeting condition
   */
  private evaluateTargetingCondition(
    userId: string,
    condition: TargetingCondition,
    userSegments: string[]
  ): boolean {
    // Check if condition is about segments
    if (condition.attribute === 'segments') {
      if (condition.operator === 'in') {
        return Array.isArray(condition.value) && 
               condition.value.some(segment => userSegments.includes(segment));
      } else if (condition.operator === 'contains') {
        return userSegments.includes(condition.value);
      }
    }

    // Get user profile and evaluate attribute
    return this.getOrCreateUserProfile(userId).then(profile => {
      const value = this.getAttributeValue(profile, condition.attribute);
      
      switch (condition.operator) {
        case 'equals':
          return value === condition.value;
        case 'not_equals':
          return value !== condition.value;
        case 'contains':
          return String(value).includes(String(condition.value));
        case 'greater_than':
          return Number(value) > Number(condition.value);
        case 'less_than':
          return Number(value) < Number(condition.value);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(value);
        case 'not_in':
          return Array.isArray(condition.value) && !condition.value.includes(value);
        default:
          return false;
      }
    });
  }

  /**
   * Update user behavior based on action
   */
  private updateUserBehavior(profile: UserProfile, action: UserAction): void {
    switch (action.type) {
      case 'search':
        profile.behavior.searchCount++;
        profile.behavior.lastSearchAt = action.timestamp;
        break;
      case 'search_success':
        profile.behavior.successfulSearches++;
        break;
      case 'search_failed':
        profile.behavior.failedSearches++;
        break;
      case 'conversion':
        profile.behavior.conversionEvents.push(action.type);
        profile.behavior.lastConversionAt = action.timestamp;
        if (action.properties?.value) {
          profile.behavior.totalValue += action.properties.value;
        }
        break;
      case 'feature_used':
        if (action.properties?.feature) {
          if (!profile.behavior.featuresUsed.includes(action.properties.feature)) {
            profile.behavior.featuresUsed.push(action.properties.feature);
          }
        }
        break;
      case 'session_start':
        profile.behavior.sessionCount++;
        break;
      case 'session_end':
        if (action.properties?.duration) {
          const totalDuration = profile.behavior.averageSessionDuration * (profile.behavior.sessionCount - 1) + action.properties.duration;
          profile.behavior.averageSessionDuration = totalDuration / profile.behavior.sessionCount;
        }
        break;
    }
  }

  /**
   * Update user activity based on action
   */
  private updateUserActivity(profile: UserProfile, action: UserAction): void {
    const now = action.timestamp;
    
    // Update last login
    if (action.type === 'login' || action.type === 'session_start') {
      profile.activity.lastLoginAt = now;
      profile.activity.loginCount++;
      
      // Update streak
      const lastLogin = profile.activity.lastLoginAt;
      const daysSinceLastLogin = lastLogin ? 
        Math.floor((now.getTime() - lastLogin.getTime()) / (24 * 60 * 60 * 1000)) : 0;
      
      if (daysSinceLastLogin <= 1) {
        profile.activity.currentStreak++;
        profile.activity.longestStreak = Math.max(profile.activity.longestStreak, profile.activity.currentStreak);
      } else {
        profile.activity.currentStreak = 1;
      }
      
      // Update days active
      const lastActiveDate = profile.activity.lastLoginAt.toDateString();
      const currentDate = now.toDateString();
      if (lastActiveDate !== currentDate) {
        profile.activity.daysActive++;
      }
    }

    // Update last page view
    if (action.type === 'page_view' && action.properties?.page) {
      profile.activity.lastPageView = {
        page: action.properties.page,
        timestamp: now
      };
    }
  }

  /**
   * Update user segments
   */
  private async updateUserSegments(userId: string): Promise<void> {
    const userSegments = await this.getUserSegments(userId);
    const profile = this.userProfiles.get(userId);
    
    if (profile) {
      profile.segments = userSegments;
      profile.updatedAt = new Date();
      this.userProfiles.set(userId, profile);
    }
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(profile: UserProfile): number {
    let score = 0;
    
    // Search activity (0-30 points)
    score += Math.min(profile.behavior.searchCount * 2, 30);
    
    // Session activity (0-25 points)
    score += Math.min(profile.behavior.sessionCount * 3, 25);
    
    // Feature usage (0-20 points)
    score += Math.min(profile.behavior.featuresUsed.length * 5, 20);
    
    // Conversions (0-15 points)
    score += Math.min(profile.behavior.conversionEvents.length * 3, 15);
    
    // Recency (0-10 points)
    const daysSinceLastLogin = Math.floor(
      (Date.now() - profile.activity.lastLoginAt.getTime()) / (24 * 60 * 60 * 1000)
    );
    score += Math.max(0, 10 - daysSinceLastLogin);
    
    return Math.min(100, score);
  }

  /**
   * Calculate lifetime value
   */
  private calculateLifetimeValue(profile: UserProfile): number {
    // Simplified LTV calculation
    const monthlyValue = profile.behavior.totalValue;
    const monthsActive = Math.max(1, Math.floor(
      (Date.now() - profile.activity.firstVisitAt.getTime()) / (30 * 24 * 60 * 60 * 1000)
    ));
    
    return monthlyValue * monthsActive;
  }

  /**
   * Initialize default segments
   */
  private initializeDefaultSegments(): void {
    const defaultSegments: Omit<UserSegment, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'New Users',
        description: 'Users who joined in the last 30 days',
        criteria: [
          {
            id: 'new_users_criteria',
            attribute: 'createdAt',
            operator: 'greater_than',
            value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            weight: 1
          }
        ],
        userCount: 0,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
        metadata: { category: 'user_lifecycle' }
      },
      {
        name: 'Power Users',
        description: 'Users with high engagement and activity',
        criteria: [
          {
            id: 'power_users_criteria_1',
            attribute: 'behavior.searchCount',
            operator: 'greater_than',
            value: 50,
            weight: 1,
            logicalOperator: 'or'
          },
          {
            id: 'power_users_criteria_2',
            attribute: 'behavior.sessionCount',
            operator: 'greater_than',
            value: 20,
            weight: 1,
            logicalOperator: 'or'
          },
          {
            id: 'power_users_criteria_3',
            attribute: 'behavior.featuresUsed.length',
            operator: 'greater_than',
            value: 5,
            weight: 1,
            logicalOperator: 'or'
          }
        ],
        userCount: 0,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
        metadata: { category: 'engagement' }
      },
      {
        name: 'AI Search Users',
        description: 'Users who have used AI search functionality',
        criteria: [
          {
            id: 'ai_search_users_criteria',
            attribute: 'behavior.featuresUsed',
            operator: 'contains',
            value: 'ai_search',
            weight: 1
          }
        ],
        userCount: 0,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
        metadata: { category: 'feature_usage' }
      },
      {
        name: 'High Value Users',
        description: 'Users with high conversion value',
        criteria: [
          {
            id: 'high_value_users_criteria',
            attribute: 'behavior.totalValue',
            operator: 'greater_than',
            value: 500,
            weight: 1
          }
        ],
        userCount: 0,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
        metadata: { category: 'value' }
      },
      {
        name: 'Mobile Users',
        description: 'Users who primarily use mobile devices',
        criteria: [
          {
            id: 'mobile_users_criteria',
            attribute: 'demographics.deviceType',
            operator: 'equals',
            value: 'mobile',
            weight: 1
          }
        ],
        userCount: 0,
        isActive: true,
        createdBy: 'system',
        updatedBy: 'system',
        metadata: { category: 'device' }
      }
    ];

    defaultSegments.forEach(segmentData => {
      const segment: UserSegment = {
        ...segmentData,
        id: this.generateSegmentId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      this.segments.set(segment.id, segment);
    });
  }

  /**
   * Update user segment cache
   */
  private updateUserSegmentCache(userId: string, segmentId: string, isInSegment: boolean): void {
    const userSegments = this.userSegmentCache.get(userId) || [];
    
    if (isInSegment && !userSegments.includes(segmentId)) {
      userSegments.push(segmentId);
      this.userSegmentCache.set(userId, userSegments);
    } else if (!isInSegment && userSegments.includes(segmentId)) {
      const index = userSegments.indexOf(segmentId);
      userSegments.splice(index, 1);
      this.userSegmentCache.set(userId, userSegments);
    }
  }

  /**
   * Clear all caches
   */
  private clearCache(): void {
    this.segmentCache.clear();
    this.userSegmentCache.clear();
  }

  /**
   * Get user from feature flag service
   */
  private async getUserFromFeatureFlagService(userId: string): Promise<User | null> {
    try {
      // This would integrate with the actual feature flag service
      // For now, return a mock user
      return {
        id: userId,
        email: `${userId}@example.com`,
        role: 'user',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        attributes: {
          country: 'US',
          language: 'en',
          deviceType: 'desktop'
        }
      };
    } catch (error) {
      console.error('Failed to get user from feature flag service:', error);
      return null;
    }
  }

  /**
   * Hash user ID for consistent bucketing
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate unique IDs
   */
  private generateSegmentId(): string {
    return `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const userSegmentationService = new UserSegmentationService();

// Export utility functions
export async function createSegment(
  segmentData: Omit<UserSegment, 'id' | 'createdAt' | 'updatedAt'>,
  createdBy: string
): Promise<UserSegment> {
  return userSegmentationService.createSegment(segmentData, createdBy);
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  return userSegmentationService.getOrCreateUserProfile(userId);
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> {
  return userSegmentationService.updateUserProfile(userId, updates);
}

export async function trackUserAction(
  userId: string,
  action: Omit<UserAction, 'timestamp'>
): Promise<void> {
  return userSegmentationService.trackUserAction(userId, action);
}

export async function isUserInSegment(userId: string, segmentId: string): Promise<boolean> {
  return userSegmentationService.isUserInSegment(userId, segmentId);
}

export async function getUserSegments(userId: string): Promise<string[]> {
  return userSegmentationService.getUserSegments(userId);
}

export async function evaluateTargeting(
  userId: string,
  experiment: ExperimentConfig
): Promise<TargetingResult> {
  return userSegmentationService.evaluateTargeting(userId, experiment);
}

export async function getSegmentMetrics(segmentId: string): Promise<SegmentMetrics | null> {
  return userSegmentationService.getSegmentMetrics(segmentId);
}

export async function createCohortAnalysis(
  cohortDefinition: Partial<UserSegment>,
  dateRange: { start: Date; end: Date }
): Promise<CohortAnalysis> {
  return userSegmentationService.createCohortAnalysis(cohortDefinition, dateRange);
}