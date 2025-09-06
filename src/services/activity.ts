
import { prisma } from '@/lib/database/prisma';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

// Interfaces remain the same as they define the data structure
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
  details?: Record<string, unknown>;
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

// The service is now a standalone export, promoting dependency injection if needed.
class ActivityTrackingService {
  async logActivity(activity: {
    type: ActivityItem['type'];
    entity: ActivityItem['entity'];
    entityId: string;
    entityName: string;
    userId: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    await prisma.activity_logs.create({
      data: {
        id: randomUUID(),
        type: activity.type,
        entity: activity.entity,
        entityId: activity.entityId,
        entityName: activity.entityName,
        userId: activity.userId,
        details: (activity.details as Prisma.InputJsonValue) || undefined
      }
    });
  }

  async getRecentActivities(
    limit: number = 20,
    offset: number = 0,
    filters?: ActivityFilters
  ): Promise<PaginatedActivities> {
    const whereClause = this.buildWhereClause(filters);
    const [activities, totalCount] = await prisma.$transaction([
        prisma.activity_logs.findMany({
            where: whereClause,
            include: { users: { select: { name: true, email: true } } },
            orderBy: { timestamp: 'desc' },
            take: limit,
            skip: offset
        }),
        prisma.activity_logs.count({ where: whereClause })
    ]);

    const mappedActivities: ActivityItem[] = activities.map(act => ({
      id: act.id,
      type: act.type as ActivityItem['type'],
      entity: act.entity as ActivityItem['entity'],
      entityName: act.entityName,
      user: { name: act.users.name || 'Unknown', email: act.users.email },
      timestamp: act.timestamp,
      details: (act.details as unknown as Record<string, unknown>) || undefined
    }));

    return { activities: mappedActivities, totalCount, hasMore: offset + limit < totalCount };
  }

  // Basic statistics for activity dashboard based on time range
  async getActivityStats(timeRange: '7d' | '30d' | '3m') {
    const since = this.getSinceDate(timeRange);
    const where: Prisma.activity_logsWhereInput = { timestamp: { gte: since } };

    const [total, byTypeRaw, topUsersRaw] = await Promise.all([
      prisma.activity_logs.count({ where }),
      prisma.activity_logs.groupBy({
        by: ['type'],
        _count: { id: true },
        where
      }),
      prisma.activity_logs.groupBy({
        by: ['userId'],
        _count: { id: true },
        where,
        orderBy: { _count: { id: 'desc' } },
        take: 5
      })
    ]);

    const byType = {
      create: 0,
      update: 0,
      delete: 0,
      import: 0,
      export: 0
    } as Record<ActivityItem['type'], number>;

    for (const row of byTypeRaw) {
      const t = row.type as ActivityItem['type'];
      byType[t] = (row._count as any).id ?? 0;
    }

    const topUsers = await Promise.all(
      topUsersRaw.map(async (u) => {
        const user = await prisma.users.findUnique({
          where: { id: u.userId as string },
          select: { id: true, name: true, email: true, updatedAt: true }
        });
        return {
          id: user?.id || (u.userId as string),
          name: user?.name || 'Unknown',
          email: user?.email || 'unknown@example.com',
          activityCount: (u._count as any).id ?? 0,
          lastActive: user?.updatedAt || new Date()
        };
      })
    );

    return { total, byType, topUsers };
  }

  // High-level summary used by the dashboard
  async getActivitySummary() {
    const [totalActivities, uniqueUsersRaw, lastActivity] = await Promise.all([
      prisma.activity_logs.count(),
      prisma.activity_logs.groupBy({ by: ['userId'] }),
      prisma.activity_logs.findFirst({ orderBy: { timestamp: 'desc' }, select: { timestamp: true } })
    ]);

    return {
      totalActivities,
      uniqueUsers: uniqueUsersRaw.length,
      lastActivityAt: lastActivity?.timestamp || null
    };
  }

  private getSinceDate(timeRange: '7d' | '30d' | '3m') {
    const now = new Date();
    const since = new Date(now);
    if (timeRange === '7d') since.setDate(now.getDate() - 7);
    else if (timeRange === '30d') since.setDate(now.getDate() - 30);
    else since.setMonth(now.getMonth() - 3);
    return since;
  }

  private buildWhereClause(filters?: ActivityFilters): Prisma.activity_logsWhereInput {
    if (!filters) return {};
    const where: Prisma.activity_logsWhereInput = {};
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
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }
    return where;
  }
}

// Export a singleton instance for easy use across the application.
export const activityTrackingService = new ActivityTrackingService();
