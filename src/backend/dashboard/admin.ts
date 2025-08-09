import { prisma } from '@/lib/prisma';
import { cacheService, CacheKeys, CacheExpiration } from '@/lib/cache';

export interface AdminMetrics {
  systemHealth: SystemHealthMetrics;
  userActivity: UserActivityMetrics;
  databaseMetrics: DatabaseMetrics;
  performanceMetrics: PerformanceMetrics;
}

export interface SystemHealthMetrics {
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  databaseConnections: {
    active: number;
    idle: number;
    total: number;
  };
  cacheStatus: {
    isAvailable: boolean;
    hitRate?: number;
  };
  lastBackup?: Date;
}

export interface UserActivityMetrics {
  activeUsers: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  totalUsers: number;
  newUsersThisMonth: number;
  mostActiveUsers: Array<{
    id: string;
    name: string;
    email: string;
    activityCount: number;
    lastActive: Date;
  }>;
}

export interface DatabaseMetrics {
  totalRecords: {
    mediaContacts: number;
    publishers: number;
    outlets: number;
    beats: number;
    countries: number;
    users: number;
  };
  databaseSize: {
    total: string;
    tables: Array<{
      name: string;
      size: string;
      rowCount: number;
    }>;
  };
  recentImports: Array<{
    type: string;
    count: number;
    timestamp: Date;
    userId: string;
    userName: string;
  }>;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }>;
  errorRate: {
    percentage: number;
    count: number;
    period: string;
  };
  apiEndpointStats: Array<{
    endpoint: string;
    requestCount: number;
    averageResponseTime: number;
    errorCount: number;
  }>;
}

export class AdminDashboardService {
  /**
   * Get comprehensive admin metrics
   */
  async getAdminMetrics(): Promise<AdminMetrics> {
    // Check cache first
    const cacheKey = 'dashboard:admin:metrics';
    const cached = await cacheService.get<AdminMetrics>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const [
      systemHealth,
      userActivity,
      databaseMetrics,
      performanceMetrics
    ] = await Promise.all([
      this.getSystemHealthMetrics(),
      this.getUserActivityMetrics(),
      this.getDatabaseMetrics(),
      this.getPerformanceMetrics()
    ]);

    const metrics: AdminMetrics = {
      systemHealth,
      userActivity,
      databaseMetrics,
      performanceMetrics
    };

    // Cache for 2 minutes (admin data changes more frequently)
    await cacheService.set(cacheKey, metrics, 120);
    
    return metrics;
  }

  /**
   * Get system health metrics
   */
  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;

    // Get database connection info (simplified - would need actual connection pool stats)
    const connectionStats = {
      active: 5, // Mock data - would get from actual connection pool
      idle: 3,
      total: 8
    };

    return {
      uptime: process.uptime(),
      memoryUsage: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100)
      },
      databaseConnections: connectionStats,
      cacheStatus: {
        isAvailable: cacheService.isAvailable(),
        hitRate: 85 // Mock data - would calculate from actual cache stats
      },
      lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000) // Mock: 24 hours ago
    };
  }

  /**
   * Get user activity metrics
   */
  async getUserActivityMetrics(): Promise<UserActivityMetrics> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      activeUsersToday,
      activeUsersThisWeek,
      activeUsersThisMonth,
      mostActiveUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      this.getActiveUsersCount(today),
      this.getActiveUsersCount(thisWeek),
      this.getActiveUsersCount(thisMonth),
      this.getMostActiveUsers()
    ]);

    return {
      activeUsers: {
        today: activeUsersToday,
        thisWeek: activeUsersThisWeek,
        thisMonth: activeUsersThisMonth
      },
      totalUsers,
      newUsersThisMonth,
      mostActiveUsers
    };
  }

  /**
   * Get database metrics
   */
  async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    const [
      mediaContactsCount,
      publishersCount,
      outletsCount,
      beatsCount,
      countriesCount,
      usersCount,
      recentImports
    ] = await Promise.all([
      prisma.mediaContact.count(),
      prisma.publisher.count(),
      prisma.outlet.count(),
      prisma.beat.count(),
      prisma.country.count(),
      prisma.user.count(),
      this.getRecentImports()
    ]);

    // Mock database size data (would need actual database queries)
    const databaseSize = {
      total: '2.4 GB',
      tables: [
        { name: 'media_contacts', size: '1.2 GB', rowCount: mediaContactsCount },
        { name: 'publishers', size: '45 MB', rowCount: publishersCount },
        { name: 'outlets', size: '128 MB', rowCount: outletsCount },
        { name: 'beats', size: '12 MB', rowCount: beatsCount },
        { name: 'countries', size: '2 MB', rowCount: countriesCount },
        { name: 'users', size: '8 MB', rowCount: usersCount }
      ]
    };

    return {
      totalRecords: {
        mediaContacts: mediaContactsCount,
        publishers: publishersCount,
        outlets: outletsCount,
        beats: beatsCount,
        countries: countriesCount,
        users: usersCount
      },
      databaseSize,
      recentImports
    };
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    // Mock performance data (would integrate with actual monitoring)
    return {
      averageResponseTime: 245, // ms
      slowQueries: [
        {
          query: 'SELECT * FROM media_contacts WHERE...',
          duration: 1250,
          timestamp: new Date(Date.now() - 30 * 60 * 1000)
        },
        {
          query: 'SELECT COUNT(*) FROM publishers...',
          duration: 890,
          timestamp: new Date(Date.now() - 45 * 60 * 1000)
        }
      ],
      errorRate: {
        percentage: 0.8,
        count: 12,
        period: 'last 24 hours'
      },
      apiEndpointStats: [
        {
          endpoint: '/api/media-contacts',
          requestCount: 1250,
          averageResponseTime: 180,
          errorCount: 3
        },
        {
          endpoint: '/api/dashboard/metrics',
          requestCount: 890,
          averageResponseTime: 120,
          errorCount: 1
        }
      ]
    };
  }

  /**
   * Get active users count for a given date
   */
  private async getActiveUsersCount(since: Date): Promise<number> {
    const activeUsers = await prisma.activityLog.findMany({
      where: {
        timestamp: {
          gte: since
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    });

    return activeUsers.length;
  }

  /**
   * Get most active users
   */
  private async getMostActiveUsers() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const userActivity = await prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        timestamp: {
          gte: thirtyDaysAgo
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 5
    });

    const userDetails = await Promise.all(
      userActivity.map(async (activity) => {
        const user = await prisma.user.findUnique({
          where: { id: activity.userId },
          select: {
            id: true,
            name: true,
            email: true,
            updatedAt: true
          }
        });

        return {
          id: activity.userId,
          name: user?.name || 'Unknown User',
          email: user?.email || 'unknown@example.com',
          activityCount: activity._count.id,
          lastActive: user?.updatedAt || new Date(),
        };
      })
    );

    return userDetails;
  }

  /**
   * Get recent imports
   */
  private async getRecentImports() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const imports = await prisma.activityLog.findMany({
      where: {
        type: 'import',
        timestamp: {
          gte: sevenDaysAgo
        }
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 10
    });

    return imports.map(importLog => ({
      type: importLog.entity,
      count: importLog.details ? (importLog.details as any).count || 1 : 1,
      timestamp: importLog.timestamp,
      userId: importLog.userId,
      userName: importLog.user.name || 'Unknown User'
    }));
  }

  /**
   * Check if user has admin privileges
   */
  async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      
      return user?.role === 'ADMIN';
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const adminDashboardService = new AdminDashboardService();
