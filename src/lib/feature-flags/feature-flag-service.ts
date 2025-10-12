/**
 * Feature Flag Service
 * Manages feature flags for gradual rollout and A/B testing
 */

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  type: 'release' | 'experiment' | 'ops' | 'permission';
  enabled: boolean;
  rolloutPercentage: number;
  userSegments: string[];
  conditions: FlagCondition[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface FlagCondition {
  type: 'user_attribute' | 'environment' | 'time' | 'custom';
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  attribute: string;
  value: any;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: FlagCondition[];
  userCount: number;
  isActive: boolean;
}

export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
  lastLoginAt: Date;
  attributes: Record<string, any>;
}

export interface FlagEvaluationContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  attributes?: Record<string, any>;
}

import { featureFlagDb } from './feature-flag-db';
import { featureFlagAuditLog, type AuditAction } from './audit-log-service';

export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flags: Map<string, FeatureFlag> = new Map();
  private userSegments: Map<string, UserSegment> = new Map();
  private evaluationCache: Map<string, { result: boolean; timestamp: Date }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache
  private db = featureFlagDb;
  private initialized = false;

  private constructor() {
    // Don't initialize in constructor - use async initialization
  }

  static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  /**
   * Initialize the service with data from the database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load flags from database
      const dbFlags = await this.db.getAllFlags();
      this.flags.clear();
      dbFlags.forEach(flag => {
        this.flags.set(flag.id, flag);
      });

      // Load segments from database
      const dbSegments = await this.db.getAllSegments();
      this.userSegments.clear();
      dbSegments.forEach(segment => {
        this.userSegments.set(segment.id, segment);
      });

      // If no flags exist, initialize with defaults
      if (this.flags.size === 0) {
        await this.initializeDefaultFlags();
      }

      // If no segments exist, initialize with defaults
      if (this.userSegments.size === 0) {
        await this.initializeDefaultSegments();
      }

      this.initialized = true;
      console.log('🚩 [FEATURE-FLAG] Service initialized with database data');
    } catch (error) {
      console.error('🚩 [FEATURE-FLAG] Failed to initialize from database, using defaults:', error);
      await this.initializeDefaultFlags();
      await this.initializeDefaultSegments();
      this.initialized = true;
    }
  }

  /**
   * Ensure the service is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private initializeDefaultFlags(): void {
    const defaultFlags: FeatureFlag[] = [
      {
        id: 'ai-search-enabled',
        name: 'AI Search Enabled',
        description: 'Enable AI-powered contact search functionality',
        type: 'release',
        enabled: false,
        rolloutPercentage: 0,
        userSegments: ['internal-users'],
        conditions: [
          {
            type: 'user_attribute',
            operator: 'contains',
            attribute: 'email',
            value: '@company.com'
          }
        ],
        metadata: {
          category: 'ai-search',
          owner: 'product-team',
          launchDate: null
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        id: 'ai-search-advanced-options',
        name: 'AI Search Advanced Options',
        description: 'Enable advanced AI search options and filters',
        type: 'release',
        enabled: false,
        rolloutPercentage: 0,
        userSegments: ['beta-users'],
        conditions: [],
        metadata: {
          category: 'ai-search',
          owner: 'product-team',
          launchDate: null
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        id: 'ai-search-provider-openai',
        name: 'Use OpenAI for AI Search',
        description: 'Use OpenAI as the AI service provider',
        type: 'ops',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: ['all'],
        conditions: [],
        metadata: {
          category: 'ai-search',
          owner: 'engineering-team',
          provider: 'openai'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        updatedBy: 'system'
      },
      {
        id: 'ai-search-caching',
        name: 'AI Search Caching',
        description: 'Enable caching for AI search results',
        type: 'ops',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: ['all'],
        conditions: [],
        metadata: {
          category: 'ai-search',
          owner: 'engineering-team',
          ttl: 3600
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
        updatedBy: 'system'
      }
    ];

    defaultFlags.forEach(flag => {
      this.flags.set(flag.id, flag);
    });
  }

  private initializeDefaultSegments(): void {
    const defaultSegments: UserSegment[] = [
      {
        id: 'internal-users',
        name: 'Internal Users',
        description: 'Company employees and contractors',
        criteria: [
          {
            type: 'user_attribute',
            operator: 'contains',
            attribute: 'email',
            value: '@company.com'
          }
        ],
        userCount: 0,
        isActive: true
      },
      {
        id: 'beta-users',
        name: 'Beta Users',
        description: 'Early adopters and beta testers',
        criteria: [
          {
            type: 'user_attribute',
            operator: 'equals',
            attribute: 'beta_participant',
            value: true
          }
        ],
        userCount: 0,
        isActive: true
      },
      {
        id: 'power-users',
        name: 'Power Users',
        description: 'Users with high usage patterns',
        criteria: [
          {
            type: 'user_attribute',
            operator: 'greater_than',
            attribute: 'search_count_last_30d',
            value: 50
          }
        ],
        userCount: 0,
        isActive: true
      },
      {
        id: 'all',
        name: 'All Users',
        description: 'All registered users',
        criteria: [],
        userCount: 0,
        isActive: true
      }
    ];

    defaultSegments.forEach(segment => {
      this.userSegments.set(segment.id, segment);
    });
  }

  /**
   * Check if a feature flag is enabled for a given context
   */
  async isFlagEnabled(
    flagName: string,
    context: FlagEvaluationContext
  ): Promise<boolean> {
    await this.ensureInitialized();

    const cacheKey = this.getCacheKey(flagName, context);
    const cached = this.evaluationCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.cacheTimeout) {
      return cached.result;
    }

    const flag = this.flags.get(flagName);
    if (!flag || !flag.enabled) {
      this.cacheResult(cacheKey, false);
      
      // Log evaluation
      await this.logEvaluation(flagName, context, false, 'Flag disabled or not found');
      return false;
    }

    let result = false;
    let reason = '';

    try {
      // Check user segment eligibility
      if (context.userId) {
        const user = await this.getUser(context.userId);
        if (user && this.isUserInSegment(user, flag.userSegments)) {
          // Check rollout percentage
          if (this.isInRolloutPercentage(user, flag.rolloutPercentage)) {
            // Check custom conditions
            result = this.evaluateConditions(flag.conditions, user, context);
            reason = result ? 'All conditions met' : 'Conditions not met';
          } else {
            reason = 'User not in rollout percentage';
          }
        } else {
          reason = 'User not in eligible segments';
        }
      } else {
        // For anonymous users, use IP-based rollout
        result = this.isInRolloutPercentageAnonymous(context, flag.rolloutPercentage);
        reason = result ? 'Anonymous user in rollout' : 'Anonymous user not in rollout';
      }
    } catch (error) {
      console.error(`Error evaluating flag ${flagName}:`, error);
      result = false;
      reason = 'Error during evaluation';
    }

    this.cacheResult(cacheKey, result);
    
    // Log evaluation to database
    await this.logEvaluation(flagName, context, result, reason);
    
    return result;
  }

  /**
   * Get a feature flag by ID
   */
  async getFlag(flagId: string): Promise<FeatureFlag | null> {
    await this.ensureInitialized();
    return this.flags.get(flagId) || null;
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    await this.ensureInitialized();
    return Array.from(this.flags.values());
  }

  /**
   * Update a feature flag
   */
  async updateFlag(
    flagId: string,
    updates: Partial<FeatureFlag>,
    updatedBy: string,
    reason?: string
  ): Promise<void> {
    await this.ensureInitialized();
    
    const flag = this.flags.get(flagId);
    if (!flag) {
      throw new Error(`Flag ${flagId} not found`);
    }

    try {
      // Get current flag for audit
      const currentFlag = this.flags.get(flagId);
      
      // Update in database
      const updatedFlag = await this.db.updateFlag(flagId, updates, updatedBy, reason);
      
      // Update in memory
      this.flags.set(flagId, updatedFlag);
      
      // Clear cache when flag is updated
      this.clearCache();
      
      // Log to audit service
      if (currentFlag) {
        let action: AuditAction = 'UPDATED';
        if (updates.enabled !== undefined) {
          action = updates.enabled ? 'ENABLED' : 'DISABLED';
        } else if (updates.rolloutPercentage !== undefined) {
          action = 'ROLLOUT_UPDATED';
        }
        
        await featureFlagAuditLog.logFlagChange({
          flagId,
          flagKey: currentFlag.id,
          action,
          oldValue: currentFlag,
          newValue: updatedFlag,
          performedBy: updatedBy,
          reason
        });
      }
      
      console.log(`🚩 [FEATURE-FLAG] Flag ${flagId} updated by ${updatedBy}:`, updates);
    } catch (error) {
      console.error(`🚩 [FEATURE-FLAG] Failed to update flag ${flagId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new feature flag
   */
  async createFlag(flagData: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>, createdBy: string): Promise<string> {
    await this.ensureInitialized();
    
    try {
      // Create in database
      const flag = await this.db.createFlag(flagData, createdBy);
      
      // Update in memory
      this.flags.set(flag.id, flag);
      
      // Log to audit service
      await featureFlagAuditLog.logFlagChange({
        flagId: flag.id,
        flagKey: flag.id,
        action: 'CREATED',
        oldValue: null,
        newValue: flag,
        performedBy: createdBy,
        reason: 'Initial flag creation'
      });
      
      console.log(`🚩 [FEATURE-FLAG] Flag ${flag.id} created by ${createdBy}`);
      return flag.id;
    } catch (error) {
      console.error(`🚩 [FEATURE-FLAG] Failed to create flag:`, error);
      throw error;
    }
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(flagId: string, deletedBy: string, reason?: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // Get current flag for audit
      const currentFlag = this.flags.get(flagId);
      
      // Delete from database
      await this.db.deleteFlag(flagId, deletedBy, reason);
      
      // Log to audit service
      if (currentFlag) {
        await featureFlagAuditLog.logFlagChange({
          flagId,
          flagKey: currentFlag.id,
          action: 'DELETED',
          oldValue: currentFlag,
          newValue: null,
          performedBy: deletedBy,
          reason
        });
      }
      
      // Remove from memory
      this.flags.delete(flagId);
      
      // Clear cache
      this.clearCache();
      
      console.log(`🚩 [FEATURE-FLAG] Flag ${flagId} deleted by ${deletedBy}`);
    } catch (error) {
      console.error(`🚩 [FEATURE-FLAG] Failed to delete flag ${flagId}:`, error);
      throw error;
    }
  }

  /**
   * Get user segments
   */
  async getUserSegments(): Promise<UserSegment[]> {
    await this.ensureInitialized();
    return Array.from(this.userSegments.values());
  }

  /**
   * Get flag usage statistics
   */
  async getFlagStats(flagId: string, timeRange: { start: Date; end: Date }): Promise<{
    totalEvaluations: number;
    enabledEvaluations: number;
    enabledPercentage: number;
    userSegmentStats: Record<string, { total: number; enabled: number; percentage: number }>;
  }> {
    await this.ensureInitialized();
    
    try {
      return await this.db.getFlagStats(flagId, timeRange);
    } catch (error) {
      console.error(`🚩 [FEATURE-FLAG] Failed to get flag stats for ${flagId}:`, error);
      
      // Return fallback data
      return {
        totalEvaluations: 0,
        enabledEvaluations: 0,
        enabledPercentage: 0,
        userSegmentStats: {}
      };
    }
  }

  /**
   * Get audit log for a flag
   */
  async getFlagAuditLog(flagId: string, limit: number = 50): Promise<any[]> {
    await this.ensureInitialized();
    
    try {
      return await this.db.getFlagAuditLog(flagId, limit);
    } catch (error) {
      console.error(`🚩 [FEATURE-FLAG] Failed to get audit log for ${flagId}:`, error);
      return [];
    }
  }

  /**
   * Get all audit logs
   */
  async getAllAuditLogs(limit: number = 100): Promise<any[]> {
    await this.ensureInitialized();
    
    try {
      return await this.db.getAllAuditLogs(limit);
    } catch (error) {
      console.error('🚩 [FEATURE-FLAG] Failed to get all audit logs:', error);
      return [];
    }
  }

  private async getUser(userId: string): Promise<User | null> {
    // In production, this would query the database
    // For now, return mock user data
    return {
      id: userId,
      email: `${userId}@example.com`,
      role: 'user',
      createdAt: new Date(),
      lastLoginAt: new Date(),
      attributes: {
        beta_participant: Math.random() > 0.8,
        search_count_last_30d: Math.floor(Math.random() * 100)
      }
    };
  }

  private isUserInSegment(user: User, segments: string[]): boolean {
    return segments.some(segmentName => {
      const segment = this.userSegments.get(segmentName);
      if (!segment || !segment.isActive) return false;
      
      if (segmentName === 'all') return true;
      
      return segment.criteria.every(criteria => 
        this.evaluateCondition(criteria, user)
      );
    });
  }

  private isInRolloutPercentage(user: User, percentage: number): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;
    
    // Use consistent hash based on user ID
    const hash = this.hashUserId(user.id);
    const bucket = hash % 100;
    
    return bucket < percentage;
  }

  private isInRolloutPercentageAnonymous(context: FlagEvaluationContext, percentage: number): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;
    
    // Use IP address for anonymous users
    const hash = this.hashString(context.ip || 'unknown');
    const bucket = hash % 100;
    
    return bucket < percentage;
  }

  private evaluateConditions(
    conditions: FlagCondition[], 
    user: User, 
    context?: FlagEvaluationContext
  ): boolean {
    return conditions.every(condition => 
      this.evaluateCondition(condition, user, context)
    );
  }

  private evaluateCondition(
    condition: FlagCondition, 
    user: User, 
    context?: FlagEvaluationContext
  ): boolean {
    const value = this.getAttributeValue(condition.attribute, user, context);
    
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
      default:
        return false;
    }
  }

  private getAttributeValue(
    attribute: string, 
    user: User, 
    context?: FlagEvaluationContext
  ): any {
    // Check user attributes first
    if (user.attributes[attribute] !== undefined) {
      return user.attributes[attribute];
    }

    // Check direct user properties
    if ((user as any)[attribute] !== undefined) {
      return (user as any)[attribute];
    }

    // Check context attributes
    if (context && context.attributes && context.attributes[attribute] !== undefined) {
      return context.attributes[attribute];
    }

    // Check context properties
    if (context && (context as any)[attribute] !== undefined) {
      return (context as any)[attribute];
    }

    return undefined;
  }

  private getCacheKey(flagName: string, context: FlagEvaluationContext): string {
    return `${flagName}_${context.userId || 'anonymous'}_${context.ip || 'unknown'}`;
  }

  private cacheResult(key: string, result: boolean): void {
    this.evaluationCache.set(key, {
      result,
      timestamp: new Date()
    });

    // Clean up old cache entries
    if (this.evaluationCache.size > 10000) {
      const cutoff = new Date(Date.now() - this.cacheTimeout);
      for (const [cacheKey, cached] of this.evaluationCache.entries()) {
        if (cached.timestamp < cutoff) {
          this.evaluationCache.delete(cacheKey);
        }
      }
    }
  }

  private clearCache(): void {
    this.evaluationCache.clear();
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private generateFlagId(): string {
    return `flag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emergency rollback - disable a flag immediately
   */
  async emergencyRollback(flagId: string, reason: string, performedBy: string): Promise<void> {
    await this.ensureInitialized();
    
    try {
      // Get current flag for audit
      const currentFlag = this.flags.get(flagId);
      
      await this.updateFlag(flagId, {
        enabled: false,
        rolloutPercentage: 0
      }, performedBy, `Emergency rollback: ${reason}`);

      // Log to audit service
      if (currentFlag) {
        await featureFlagAuditLog.logFlagChange({
          flagId,
          flagKey: currentFlag.id,
          action: 'EMERGENCY_ROLLBACK',
          oldValue: currentFlag,
          newValue: { ...currentFlag, enabled: false, rolloutPercentage: 0 },
          performedBy,
          reason
        });
      }

      console.log(`🚨 [FEATURE-FLAG] Emergency rollback for flag ${flagId}: ${reason}`);
      
      // In production, this would also:
      // - Send notifications to stakeholders
      // - Create incident record
    } catch (error) {
      console.error(`🚩 [FEATURE-FLAG] Emergency rollback failed for ${flagId}:`, error);
      throw error;
    }
  }

  /**
   * Gradual rollout - increase rollout percentage step by step
   */
  async gradualRollout(
    flagId: string,
    steps: number[],
    intervalMs: number = 15 * 60 * 1000 // 15 minutes default
  ): Promise<void> {
    await this.ensureInitialized();
    
    for (const percentage of steps) {
      try {
        const currentFlag = this.flags.get(flagId);
        const previousPercentage = currentFlag?.rolloutPercentage || 0;
        
        await this.updateFlag(flagId, { rolloutPercentage: percentage }, 'gradual_rollout', `Gradual rollout to ${percentage}%`);
        
        // Log rollout step to audit
        if (currentFlag) {
          await featureFlagAuditLog.logFlagChange({
            flagId,
            flagKey: currentFlag.id,
            action: percentage === steps[0] ? 'GRADUAL_ROLLOUT_STARTED' : 'ROLLOUT_UPDATED',
            oldValue: { ...currentFlag, rolloutPercentage: previousPercentage },
            newValue: { ...currentFlag, rolloutPercentage: percentage },
            performedBy: 'gradual_rollout',
            reason: `Gradual rollout step: ${previousPercentage}% → ${percentage}%`
          });
        }
        
        console.log(`📈 [FEATURE-FLAG] Gradual rollout: ${flagId} now at ${percentage}%`);
        
        // Wait for next step
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        
        // Check if rollout should continue (in production, would check metrics)
        const shouldContinue = await this.evaluateRolloutHealth(flagId);
        if (!shouldContinue) {
          console.log(`⚠️ [FEATURE-FLAG] Rollout paused at ${percentage}% due to health concerns`);
          
          // Log rollout pause to audit
          if (currentFlag) {
            await featureFlagAuditLog.logFlagChange({
              flagId,
              flagKey: currentFlag.id,
              action: 'GRADUAL_ROLLOUT_PAUSED',
              oldValue: { ...currentFlag, rolloutPercentage: percentage },
              newValue: { ...currentFlag, rolloutPercentage: percentage },
              performedBy: 'gradual_rollout',
              reason: `Rollout paused at ${percentage}% due to health concerns`
            });
          }
          break;
        }
      } catch (error) {
        console.error(`❌ [FEATURE-FLAG] Rollout step failed for ${percentage}%:`, error);
        break;
      }
    }
    
    // Log rollout completion
    try {
      const finalFlag = this.flags.get(flagId);
      if (finalFlag) {
        await featureFlagAuditLog.logFlagChange({
          flagId,
          flagKey: finalFlag.id,
          action: 'GRADUAL_ROLLOUT_COMPLETED',
          oldValue: null,
          newValue: finalFlag,
          performedBy: 'gradual_rollout',
          reason: `Gradual rollout completed to ${finalFlag.rolloutPercentage}%`
        });
      }
    } catch (error) {
      console.error(`🚩 [FEATURE-FLAG] Failed to log rollout completion:`, error);
    }
  }

  private async evaluateRolloutHealth(flagId: string): Promise<boolean> {
    // In production, this would evaluate:
    // - Error rates
    // - Response times
    // - User feedback
    // - System health metrics
    
    // For now, always return true
    return true;
  }

  /**
   * Log flag evaluation to database
   */
  private async logEvaluation(
    flagName: string,
    context: FlagEvaluationContext,
    result: boolean,
    reason: string
  ): Promise<void> {
    try {
      const flag = this.flags.get(flagName);
      if (!flag) return;
      
      await this.db.logFlagEvaluation(
        flag.id,
        flagName,
        context.userId,
        context,
        result,
        reason,
        context.ip,
        context.userAgent
      );
    } catch (error) {
      // Don't let logging errors break the main flow
      console.error(`🚩 [FEATURE-FLAG] Failed to log evaluation for ${flagName}:`, error);
    }
  }

  /**
   * Initialize default flags in database
   */
  private async initializeDefaultFlags(): Promise<void> {
    const defaultFlags: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>[] = [
      {
        name: 'AI Search Enabled',
        description: 'Enable AI-powered contact search functionality',
        type: 'release',
        enabled: false,
        rolloutPercentage: 0,
        userSegments: ['internal-users'],
        conditions: [
          {
            type: 'user_attribute',
            operator: 'contains',
            attribute: 'email',
            value: '@company.com'
          }
        ],
        metadata: {
          category: 'ai-search',
          owner: 'product-team',
          launchDate: null
        }
      },
      {
        name: 'AI Search Advanced Options',
        description: 'Enable advanced AI search options and filters',
        type: 'release',
        enabled: false,
        rolloutPercentage: 0,
        userSegments: ['beta-users'],
        conditions: [],
        metadata: {
          category: 'ai-search',
          owner: 'product-team',
          launchDate: null
        }
      },
      {
        name: 'Use OpenAI for AI Search',
        description: 'Use OpenAI as the AI service provider',
        type: 'ops',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: ['all'],
        conditions: [],
        metadata: {
          category: 'ai-search',
          owner: 'engineering-team',
          provider: 'openai'
        }
      },
      {
        name: 'AI Search Caching',
        description: 'Enable caching for AI search results',
        type: 'ops',
        enabled: true,
        rolloutPercentage: 100,
        userSegments: ['all'],
        conditions: [],
        metadata: {
          category: 'ai-search',
          owner: 'engineering-team',
          ttl: 3600
        }
      }
    ];

    for (const flagData of defaultFlags) {
      try {
        const flag = await this.db.createFlag(flagData, 'system');
        this.flags.set(flag.id, flag);
      } catch (error) {
        console.error(`🚩 [FEATURE-FLAG] Failed to create default flag ${flagData.name}:`, error);
      }
    }
  }

  /**
   * Initialize default segments in database
   */
  private async initializeDefaultSegments(): Promise<void> {
    const defaultSegments: Omit<UserSegment, 'id'>[] = [
      {
        name: 'Internal Users',
        description: 'Company employees and contractors',
        criteria: [
          {
            type: 'user_attribute',
            operator: 'contains',
            attribute: 'email',
            value: '@company.com'
          }
        ],
        userCount: 0,
        isActive: true
      },
      {
        name: 'Beta Users',
        description: 'Early adopters and beta testers',
        criteria: [
          {
            type: 'user_attribute',
            operator: 'equals',
            attribute: 'beta_participant',
            value: true
          }
        ],
        userCount: 0,
        isActive: true
      },
      {
        name: 'Power Users',
        description: 'Users with high usage patterns',
        criteria: [
          {
            type: 'user_attribute',
            operator: 'greater_than',
            attribute: 'search_count_last_30d',
            value: 50
          }
        ],
        userCount: 0,
        isActive: true
      },
      {
        name: 'All Users',
        description: 'All registered users',
        criteria: [],
        userCount: 0,
        isActive: true
      }
    ];

    for (const segmentData of defaultSegments) {
      try {
        const segment = await this.db.createSegment(segmentData, 'system');
        this.userSegments.set(segment.id, segment);
      } catch (error) {
        console.error(`🚩 [FEATURE-FLAG] Failed to create default segment ${segmentData.name}:`, error);
      }
    }
  }
}

// Export singleton instance
export const featureFlagService = FeatureFlagService.getInstance();

// Export utility functions
export async function isFeatureEnabled(
  flagName: string,
  context: FlagEvaluationContext
): Promise<boolean> {
  return featureFlagService.isFlagEnabled(flagName, context);
}

export function getFeatureFlagSync(flagId: string): FeatureFlag | undefined {
  return featureFlagService.getFlag(flagId);
}

export async function updateFeatureFlag(
  flagId: string,
  updates: Partial<FeatureFlag>,
  updatedBy: string
): Promise<void> {
  return featureFlagService.updateFlag(flagId, updates, updatedBy);
}

// Export utility functions
export async function isFeatureEnabledServer(
  flagName: string,
  context: FlagEvaluationContext
): Promise<boolean> {
  return featureFlagService.isFlagEnabled(flagName, context);
}

export async function getFeatureFlag(flagId: string): Promise<FeatureFlag | null> {
  return featureFlagService.getFlag(flagId);
}

export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  return featureFlagService.getAllFlags();
}

export async function updateFeatureFlagWithAudit(
  flagId: string,
  updates: Partial<FeatureFlag>,
  updatedBy: string,
  reason?: string
): Promise<void> {
  return featureFlagService.updateFlag(flagId, updates, updatedBy, reason);
}

export async function createFeatureFlag(
  flagData: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
  createdBy: string
): Promise<string> {
  return featureFlagService.createFlag(flagData, createdBy);
}

export async function deleteFeatureFlag(
  flagId: string,
  deletedBy: string,
  reason?: string
): Promise<void> {
  return featureFlagService.deleteFlag(flagId, deletedBy, reason);
}

export async function getFeatureFlagStats(
  flagId: string,
  timeRange: { start: Date; end: Date }
): Promise<{
  totalEvaluations: number;
  enabledEvaluations: number;
  enabledPercentage: number;
  userSegmentStats: Record<string, { total: number; enabled: number; percentage: number }>;
}> {
  return featureFlagService.getFlagStats(flagId, timeRange);
}

export async function getFeatureFlagAuditLog(flagId: string, limit?: number): Promise<any[]> {
  return featureFlagService.getFlagAuditLog(flagId, limit);
}

export async function getAllFeatureFlagAuditLogs(limit?: number): Promise<any[]> {
  return featureFlagService.getAllAuditLogs(limit);
}

export async function emergencyRollbackFeatureFlag(
  flagId: string,
  reason: string,
  performedBy: string
): Promise<void> {
  return featureFlagService.emergencyRollback(flagId, reason, performedBy);
}

export async function gradualRolloutFeatureFlag(
  flagId: string,
  steps: number[],
  intervalMs?: number
): Promise<void> {
  return featureFlagService.gradualRollout(flagId, steps, intervalMs);
}

// Initialize the feature flag service
export async function initializeFeatureFlags(): Promise<void> {
  return featureFlagService.initialize();
}