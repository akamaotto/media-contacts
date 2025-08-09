import { prisma } from '@/lib/prisma';

export interface ActivityItem {
  id: string;
  type: 'create' | 'update' | 'delete' | 'import' | 'export';
  entity: 'media_contact' | 'outlet' | 'publisher' | 'beat' | 'category' | 'country' | 'language' | 'region';
  entityName: string;
  user: {
    name: string;
    email: string;
  };
  timestamp: Date;
  details?: Record<string, any>;
}

export interface ActivityFilters {
  type?: ActivityItem['type'];
  entity?: ActivityItem['entity'];
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginatedActivities {
  activities: ActivityItem[];
  totalCount: number;
  hasMore: boolean;
}

export class ActivityTrackingService {
  /**
   * Log a new activity
   */
  async logActivity(activity: {
    type: ActivityItem['type'];
    entity: ActivityItem['entity'];
    entityId: string;
    entityName: string;
    userId: string;
    details?: Record<string, any>;
  }): Promise<void> {
    await prisma.activityLog.create({
      data: {
        type: activity.type,
        entity: activity.entity,
        entityId: activity.entityId,
        entityName: activity.entityName,
        userId: activity.userId,
        details: activity.details || undefined
      }
    });
  }

  /**
   * Get recent activities with pagination
   */
  async getRecentActivities(
    limit: number = 20,
    offset: number = 0,
    filters?: ActivityFilters
  ): Promise<PaginatedActivities> {
    const whereClause = this.buildWhereClause(filters);

    const [activities, totalCount] = await Promise.all([
      prisma.activityLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.activityLog.count({
        where: whereClause
      })
    ]);

    const mappedActivities: ActivityItem[] = activities.map(activity => ({
      id: activity.id,
      type: activity.type as ActivityItem['type'],
      entity: activity.entity as ActivityItem['entity'],
      entityName: activity.entityName,
      user: {
        name: activity.user.name || 'Unknown User',
        email: activity.user.email
      },
      timestamp: activity.timestamp,
      details: activity.details as Record<string, any> || undefined
    }));

    return {
      activities: mappedActivities,
      totalCount,
      hasMore: offset + limit < totalCount
    };
  }

  /**
   * Get activities by type
   */
  async getActivitiesByType(
    type: ActivityItem['type'],
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedActivities> {
    return this.getRecentActivities(limit, offset, { type });
  }

  /**
   * Get activities by entity
   */
  async getActivitiesByEntity(
    entity: ActivityItem['entity'],
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedActivities> {
    return this.getRecentActivities(limit, offset, { entity });
  }

  /**
   * Get activities by user
   */
  async getActivitiesByUser(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedActivities> {
    return this.getRecentActivities(limit, offset, { userId });
  }

  /**
   * Get activities within date range
   */
  async getActivitiesByDateRange(
    startDate: Date,
    endDate: Date,
    limit: number = 20,
    offset: number = 0
  ): Promise<PaginatedActivities> {
    return this.getRecentActivities(limit, offset, { startDate, endDate });
  }

  /**
   * Get activity statistics
   */
  async getActivityStats(timeRange: '7d' | '30d' | '3m' = '30d'): Promise<{
    totalActivities: number;
    activitiesByType: Record<string, number>;
    activitiesByEntity: Record<string, number>;
    mostActiveUsers: Array<{
      userId: string;
      userName: string;
      activityCount: number;
    }>;
  }> {
    const dateFilter = this.getDateFilter(timeRange);
    const whereClause = dateFilter ? { timestamp: { gte: dateFilter } } : {};

    const [
      totalActivities,
      activitiesByType,
      activitiesByEntity,
      userActivities
    ] = await Promise.all([
      // Total activities count
      prisma.activityLog.count({ where: whereClause }),
      
      // Activities grouped by type
      prisma.activityLog.groupBy({
        by: ['type'],
        where: whereClause,
        _count: {
          id: true
        }
      }),
      
      // Activities grouped by entity
      prisma.activityLog.groupBy({
        by: ['entity'],
        where: whereClause,
        _count: {
          id: true
        }
      }),
      
      // Most active users
      prisma.activityLog.groupBy({
        by: ['userId'],
        where: whereClause,
        _count: {
          id: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: 5
      })
    ]);

    // Get user details for most active users
    const userIds = userActivities.map(ua => ua.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });

    const userMap = new Map(users.map(user => [user.id, user]));

    return {
      totalActivities,
      activitiesByType: Object.fromEntries(
        activitiesByType.map(item => [item.type, item._count.id])
      ),
      activitiesByEntity: Object.fromEntries(
        activitiesByEntity.map(item => [item.entity, item._count.id])
      ),
      mostActiveUsers: userActivities.map(ua => ({
        userId: ua.userId,
        userName: userMap.get(ua.userId)?.name || 'Unknown User',
        activityCount: ua._count.id
      }))
    };
  }

  /**
   * Delete old activities (cleanup)
   */
  async cleanupOldActivities(olderThanDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.activityLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }

  /**
   * Get activity summary for dashboard
   */
  async getActivitySummary(): Promise<{
    todayCount: number;
    weekCount: number;
    monthCount: number;
    recentActivities: ActivityItem[];
  }> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [todayCount, weekCount, monthCount, recentActivitiesResult] = await Promise.all([
      prisma.activityLog.count({
        where: { timestamp: { gte: today } }
      }),
      prisma.activityLog.count({
        where: { timestamp: { gte: weekAgo } }
      }),
      prisma.activityLog.count({
        where: { timestamp: { gte: monthAgo } }
      }),
      this.getRecentActivities(5) // Get 5 most recent activities
    ]);

    return {
      todayCount,
      weekCount,
      monthCount,
      recentActivities: recentActivitiesResult.activities
    };
  }

  /**
   * Build where clause for filtering
   */
  private buildWhereClause(filters?: ActivityFilters) {
    if (!filters) return {};

    const where: any = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.entity) {
      where.entity = filters.entity;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    return where;
  }

  /**
   * Get date filter based on time range
   */
  private getDateFilter(timeRange: string): Date | null {
    const now = new Date();
    
    switch (timeRange) {
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3m':
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return threeMonthsAgo;
      default:
        return null;
    }
  }
}

// Export singleton instance
export const activityTrackingService = new ActivityTrackingService();