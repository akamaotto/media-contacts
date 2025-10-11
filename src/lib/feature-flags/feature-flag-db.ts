/**
 * Database service for feature flags
 * Provides persistent storage and retrieval of feature flags using Prisma
 */

import { PrismaClient } from '@prisma/client';
import { 
  FeatureFlag, 
  UserSegment, 
  FlagCondition,
  FlagEvaluationContext,
  User,
  type AuditAction,
  type RolloutStatus,
  type RolloutStrategy
} from './feature-flag-service';

export interface DatabaseFeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: string;
  enabled: boolean;
  rolloutPercentage: number;
  userSegments: string[];
  conditions: any;
  metadata: any;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseFeatureFlagAudit {
  id: string;
  flagId: string;
  flagKey: string;
  action: string;
  oldValue: any;
  newValue: any;
  performedBy: string;
  reason: string | null;
  timestamp: Date;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
}

export interface DatabaseFeatureFlagEvaluation {
  id: string;
  flagId: string;
  flagKey: string;
  userId: string | null;
  context: any;
  result: boolean;
  reason: string | null;
  timestamp: Date;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface DatabaseFeatureFlagSegment {
  id: string;
  name: string;
  description: string | null;
  criteria: any;
  isActive: boolean;
  userCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseFeatureFlagRollout {
  id: string;
  flagId: string;
  flagKey: string;
  targetPercentage: number;
  currentPercentage: number;
  status: string;
  strategy: string;
  stepSize: number;
  intervalMinutes: number;
  autoAdjust: boolean;
  healthThresholds: any;
  startTime: Date | null;
  completedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FeatureFlagDatabaseService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Get all feature flags from the database
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    const flags = await this.prisma.feature_flags.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return flags.map(this.mapDatabaseFlagToFeatureFlag);
  }

  /**
   * Get a specific feature flag by key
   */
  async getFlagByKey(key: string): Promise<FeatureFlag | null> {
    const flag = await this.prisma.feature_flags.findUnique({
      where: { key }
    });

    return flag ? this.mapDatabaseFlagToFeatureFlag(flag) : null;
  }

  /**
   * Get a specific feature flag by ID
   */
  async getFlagById(id: string): Promise<FeatureFlag | null> {
    const flag = await this.prisma.feature_flags.findUnique({
      where: { id }
    });

    return flag ? this.mapDatabaseFlagToFeatureFlag(flag) : null;
  }

  /**
   * Create a new feature flag
   */
  async createFlag(
    flagData: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>,
    createdBy: string
  ): Promise<FeatureFlag> {
    const flag = await this.prisma.feature_flags.create({
      data: {
        key: flagData.id,
        name: flagData.name,
        description: flagData.description,
        type: flagData.type,
        enabled: flagData.enabled,
        rolloutPercentage: flagData.rolloutPercentage,
        userSegments: flagData.userSegments,
        conditions: flagData.conditions,
        metadata: flagData.metadata,
        createdBy,
        updatedBy: createdBy
      }
    });

    // Log the creation
    await this.logFlagChange({
      flagId: flag.id,
      flagKey: flag.key,
      action: 'CREATED',
      oldValue: null,
      newValue: flag,
      performedBy: createdBy,
      reason: 'Initial flag creation'
    });

    return this.mapDatabaseFlagToFeatureFlag(flag);
  }

  /**
   * Update an existing feature flag
   */
  async updateFlag(
    id: string,
    updates: Partial<FeatureFlag>,
    updatedBy: string,
    reason?: string
  ): Promise<FeatureFlag> {
    // Get the current flag for audit
    const currentFlag = await this.prisma.feature_flags.findUnique({
      where: { id }
    });

    if (!currentFlag) {
      throw new Error(`Feature flag with ID ${id} not found`);
    }

    // Update the flag
    const updatedFlag = await this.prisma.feature_flags.update({
      where: { id },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.type && { type: updates.type }),
        ...(updates.enabled !== undefined && { enabled: updates.enabled }),
        ...(updates.rolloutPercentage !== undefined && { rolloutPercentage: updates.rolloutPercentage }),
        ...(updates.userSegments && { userSegments: updates.userSegments }),
        ...(updates.conditions && { conditions: updates.conditions }),
        ...(updates.metadata && { metadata: updates.metadata }),
        updatedBy
      }
    });

    // Determine the action for audit
    let action: AuditAction = 'UPDATED';
    if (updates.enabled !== undefined) {
      action = updates.enabled ? 'ENABLED' : 'DISABLED';
    } else if (updates.rolloutPercentage !== undefined) {
      action = 'ROLLOUT_UPDATED';
    }

    // Log the change
    await this.logFlagChange({
      flagId: id,
      flagKey: currentFlag.key,
      action,
      oldValue: currentFlag,
      newValue: updatedFlag,
      performedBy: updatedBy,
      reason
    });

    return this.mapDatabaseFlagToFeatureFlag(updatedFlag);
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(id: string, deletedBy: string, reason?: string): Promise<void> {
    const flag = await this.prisma.feature_flags.findUnique({
      where: { id }
    });

    if (!flag) {
      throw new Error(`Feature flag with ID ${id} not found`);
    }

    // Log the deletion
    await this.logFlagChange({
      flagId: id,
      flagKey: flag.key,
      action: 'DELETED',
      oldValue: flag,
      newValue: null,
      performedBy: deletedBy,
      reason
    });

    // Delete the flag (cascade will handle related records)
    await this.prisma.feature_flags.delete({
      where: { id }
    });
  }

  /**
   * Get all user segments
   */
  async getAllSegments(): Promise<UserSegment[]> {
    const segments = await this.prisma.feature_flag_segments.findMany({
      orderBy: { name: 'asc' }
    });

    return segments.map(this.mapDatabaseSegmentToUserSegment);
  }

  /**
   * Get a specific user segment by name
   */
  async getSegmentByName(name: string): Promise<UserSegment | null> {
    const segment = await this.prisma.feature_flag_segments.findUnique({
      where: { name }
    });

    return segment ? this.mapDatabaseSegmentToUserSegment(segment) : null;
  }

  /**
   * Create a new user segment
   */
  async createSegment(
    segmentData: Omit<UserSegment, 'id'>,
    createdBy: string
  ): Promise<UserSegment> {
    const segment = await this.prisma.feature_flag_segments.create({
      data: {
        name: segmentData.name,
        description: segmentData.description,
        criteria: segmentData.criteria,
        isActive: segmentData.isActive,
        userCount: segmentData.userCount,
        createdBy
      }
    });

    return this.mapDatabaseSegmentToUserSegment(segment);
  }

  /**
   * Update a user segment
   */
  async updateSegment(
    id: string,
    updates: Partial<UserSegment>
  ): Promise<UserSegment> {
    const segment = await this.prisma.feature_flag_segments.update({
      where: { id },
      data: {
        ...(updates.name && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.criteria && { criteria: updates.criteria }),
        ...(updates.isActive !== undefined && { isActive: updates.isActive }),
        ...(updates.userCount !== undefined && { userCount: updates.userCount })
      }
    });

    return this.mapDatabaseSegmentToUserSegment(segment);
  }

  /**
   * Delete a user segment
   */
  async deleteSegment(id: string): Promise<void> {
    await this.prisma.feature_flag_segments.delete({
      where: { id }
    });
  }

  /**
   * Log a flag evaluation
   */
  async logFlagEvaluation(
    flagId: string,
    flagKey: string,
    userId: string | undefined,
    context: FlagEvaluationContext | undefined,
    result: boolean,
    reason: string | undefined,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.prisma.feature_flag_evaluations.create({
      data: {
        flagId,
        flagKey,
        userId,
        context,
        result,
        reason,
        ipAddress,
        userAgent
      }
    });
  }

  /**
   * Get flag evaluation statistics
   */
  async getFlagStats(
    flagId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    totalEvaluations: number;
    enabledEvaluations: number;
    enabledPercentage: number;
    userSegmentStats: Record<string, { total: number; enabled: number; percentage: number }>;
  }> {
    const evaluations = await this.prisma.feature_flag_evaluations.findMany({
      where: {
        flagId,
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      }
    });

    const totalEvaluations = evaluations.length;
    const enabledEvaluations = evaluations.filter(e => e.result).length;
    const enabledPercentage = totalEvaluations > 0 ? (enabledEvaluations / totalEvaluations) * 100 : 0;

    // Group by user segments
    const userSegmentStats: Record<string, { total: number; enabled: number; percentage: number }> = {};
    
    // This is a simplified version - in production, you'd join with user data to get segment info
    const anonymousEvaluations = evaluations.filter(e => !e.userId);
    const authenticatedEvaluations = evaluations.filter(e => e.userId);

    userSegmentStats['anonymous'] = {
      total: anonymousEvaluations.length,
      enabled: anonymousEvaluations.filter(e => e.result).length,
      percentage: anonymousEvaluations.length > 0 
        ? (anonymousEvaluations.filter(e => e.result).length / anonymousEvaluations.length) * 100 
        : 0
    };

    userSegmentStats['authenticated'] = {
      total: authenticatedEvaluations.length,
      enabled: authenticatedEvaluations.filter(e => e.result).length,
      percentage: authenticatedEvaluations.length > 0 
        ? (authenticatedEvaluations.filter(e => e.result).length / authenticatedEvaluations.length) * 100 
        : 0
    };

    return {
      totalEvaluations,
      enabledEvaluations,
      enabledPercentage,
      userSegmentStats
    };
  }

  /**
   * Get audit log for a flag
   */
  async getFlagAuditLog(
    flagId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DatabaseFeatureFlagAudit[]> {
    return await this.prisma.feature_flag_audits.findMany({
      where: { flagId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * Get all audit logs
   */
  async getAllAuditLogs(
    limit: number = 100,
    offset: number = 0
  ): Promise<DatabaseFeatureFlagAudit[]> {
    return await this.prisma.feature_flag_audits.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * Create a rollout plan
   */
  async createRollout(
    flagId: string,
    flagKey: string,
    targetPercentage: number,
    strategy: RolloutStrategy,
    stepSize: number,
    intervalMinutes: number,
    autoAdjust: boolean,
    healthThresholds: any,
    createdBy: string
  ): Promise<DatabaseFeatureFlagRollout> {
    return await this.prisma.feature_flag_rollouts.create({
      data: {
        flagId,
        flagKey,
        targetPercentage,
        currentPercentage: 0,
        status: 'PENDING',
        strategy,
        stepSize,
        intervalMinutes,
        autoAdjust,
        healthThresholds,
        createdBy
      }
    });
  }

  /**
   * Update a rollout
   */
  async updateRollout(
    id: string,
    updates: Partial<DatabaseFeatureFlagRollout>
  ): Promise<DatabaseFeatureFlagRollout> {
    return await this.prisma.feature_flag_rollouts.update({
      where: { id },
      data: updates
    });
  }

  /**
   * Get active rollouts
   */
  async getActiveRollouts(): Promise<DatabaseFeatureFlagRollout[]> {
    return await this.prisma.feature_flag_rollouts.findMany({
      where: {
        status: {
          in: ['PENDING', 'IN_PROGRESS', 'PAUSED']
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get rollout history for a flag
   */
  async getFlagRolloutHistory(flagId: string): Promise<DatabaseFeatureFlagRollout[]> {
    return await this.prisma.feature_flag_rollouts.findMany({
      where: { flagId },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Private method to log flag changes
   */
  private async logFlagChange(data: {
    flagId: string;
    flagKey: string;
    action: AuditAction;
    oldValue: any;
    newValue: any;
    performedBy: string;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.prisma.feature_flag_audits.create({
      data: {
        flagId: data.flagId,
        flagKey: data.flagKey,
        action: data.action,
        oldValue: data.oldValue,
        newValue: data.newValue,
        performedBy: data.performedBy,
        reason: data.reason,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: {
          timestamp: new Date().toISOString()
        }
      }
    });
  }

  /**
   * Map database flag to FeatureFlag interface
   */
  private mapDatabaseFlagToFeatureFlag(flag: DatabaseFeatureFlag): FeatureFlag {
    return {
      id: flag.key,
      name: flag.name,
      description: flag.description || '',
      type: flag.type as any,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
      userSegments: flag.userSegments,
      conditions: flag.conditions || [],
      metadata: flag.metadata || {},
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt,
      createdBy: flag.createdBy,
      updatedBy: flag.updatedBy
    };
  }

  /**
   * Map database segment to UserSegment interface
   */
  private mapDatabaseSegmentToUserSegment(segment: DatabaseFeatureFlagSegment): UserSegment {
    return {
      id: segment.name,
      name: segment.name,
      description: segment.description || '',
      criteria: segment.criteria || [],
      userCount: segment.userCount,
      isActive: segment.isActive
    };
  }
}

// Export singleton instance
export const featureFlagDb = new FeatureFlagDatabaseService();