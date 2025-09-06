import { adminDashboardService } from '@/backend/dashboard/admin';
import { prisma } from '@/lib/prisma';
import { mockDeep, mockReset, type DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: mockDeep<PrismaClient>()
}));

// Mock Redis
jest.mock('@/lib/cache', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    isAvailable: jest.fn().mockReturnValue(true)
  },
  CacheKeys: {},
  CacheExpiration: {}
}));

const mockPrisma = prisma as unknown as DeepMockProxy<PrismaClient>;

describe('AdminDashboardService', () => {
  beforeEach(() => {
    mockReset(mockPrisma);
  });

  describe('getAdminMetrics', () => {
    it('should return comprehensive admin metrics', async () => {
      // Mock system health data
      mockPrisma.users.count.mockResolvedValueOnce(150); // total users
      mockPrisma.users.count.mockResolvedValueOnce(25); // new users this month
      mockPrisma.activity_logs.count.mockResolvedValueOnce(45); // today's activities
      mockPrisma.activity_logs.count.mockResolvedValueOnce(320); // this week's activities

      // Mock database metrics
      mockPrisma.media_contacts.count.mockResolvedValue(1250);
      mockPrisma.publishers.count.mockResolvedValue(85);
      mockPrisma.outlets.count.mockResolvedValue(340);

      // Mock most active users
      mockPrisma.activity_logs.groupBy.mockResolvedValue([
        { userId: 'user1', _count: { id: 45 } },
        { userId: 'user2', _count: { id: 32 } },
        { userId: 'user3', _count: { id: 28 } }
      ] as any);

      mockPrisma.users.findUnique
        .mockResolvedValueOnce({ id: 'user1', name: 'John Doe', email: 'john@example.com', updatedAt: new Date() } as any)
        .mockResolvedValueOnce({ id: 'user2', name: 'Jane Smith', email: 'jane@example.com', updatedAt: new Date() } as any)
        .mockResolvedValueOnce({ id: 'user3', name: 'Bob Johnson', email: 'bob@example.com', updatedAt: new Date() } as any);

      // Mock recent imports
      mockPrisma.activity_logs.findMany.mockResolvedValue([
        {
          id: '1',
          type: 'import',
          entity: 'media_contacts',
          timestamp: new Date(),
          userId: 'user1',
          details: { count: 50 },
          users: { name: 'John Doe' }
        }
      ] as any);

      const metrics = await adminDashboardService.getAdminMetrics();

      expect(metrics).toHaveProperty('systemHealth');
      expect(metrics).toHaveProperty('userActivity');
      expect(metrics).toHaveProperty('databaseMetrics');
      expect(metrics).toHaveProperty('performanceMetrics');

      // Verify system health structure
      expect(metrics.systemHealth).toHaveProperty('uptime');
      expect(metrics.systemHealth).toHaveProperty('memoryUsage');
      expect(metrics.systemHealth).toHaveProperty('databaseConnections');
      expect(metrics.systemHealth).toHaveProperty('cacheStatus');

      // Verify user activity structure
      expect(metrics.userActivity).toHaveProperty('totalUsers', 150);
      expect(metrics.userActivity).toHaveProperty('newUsersThisMonth', 25);
      expect(metrics.userActivity.activeUsers).toHaveProperty('today', 45);
      expect(metrics.userActivity.activeUsers).toHaveProperty('thisWeek', 320);
      expect(metrics.userActivity.mostActiveUsers).toHaveLength(3);

      // Verify database metrics structure
      expect(metrics.databaseMetrics.totalRecords).toHaveProperty('mediaContacts', 1250);
      expect(metrics.databaseMetrics.totalRecords).toHaveProperty('publishers', 85);
      expect(metrics.databaseMetrics.totalRecords).toHaveProperty('outlets', 340);
      expect(metrics.databaseMetrics.recentImports).toHaveLength(1);

      // Verify performance metrics structure
      expect(metrics.performanceMetrics).toHaveProperty('averageResponseTime');
      expect(metrics.performanceMetrics).toHaveProperty('errorRate');
      expect(metrics.performanceMetrics).toHaveProperty('slowQueries');
      expect(metrics.performanceMetrics).toHaveProperty('apiEndpointStats');
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.users.count.mockRejectedValue(new Error('Database connection failed'));

      await expect(adminDashboardService.getAdminMetrics()).rejects.toThrow('Database connection failed');
    });
  });

  describe('isUserAdmin', () => {
    it('should return true for admin users', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 'admin-user',
        role: 'ADMIN'
      } as any);

      const result = await adminDashboardService.isUserAdmin('admin-user');
      expect(result).toBe(true);
    });

    it('should return false for non-admin users', async () => {
      mockPrisma.users.findUnique.mockResolvedValue({
        id: 'regular-user',
        role: 'USER'
      } as any);

      const result = await adminDashboardService.isUserAdmin('regular-user');
      expect(result).toBe(false);
    });

    it('should return false for non-existent users', async () => {
      mockPrisma.users.findUnique.mockResolvedValue(null);

      const result = await adminDashboardService.isUserAdmin('non-existent');
      expect(result).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      mockPrisma.users.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await adminDashboardService.isUserAdmin('user-id');
      expect(result).toBe(false);
    });
  });

  describe('system health metrics', () => {
    it('should calculate memory usage percentage correctly', async () => {
      // Mock basic data for the full metrics call
      mockPrisma.users.count.mockResolvedValue(100);
      mockPrisma.activity_logs.count.mockResolvedValue(50);
      mockPrisma.media_contacts.count.mockResolvedValue(1000);
      mockPrisma.publishers.count.mockResolvedValue(50);
      mockPrisma.outlets.count.mockResolvedValue(200);
      mockPrisma.activity_logs.groupBy.mockResolvedValue([]);
      mockPrisma.activity_logs.findMany.mockResolvedValue([]);

      const metrics = await adminDashboardService.getAdminMetrics();
      
      expect(metrics.systemHealth.memoryUsage.percentage).toBeGreaterThanOrEqual(0);
      expect(metrics.systemHealth.memoryUsage.percentage).toBeLessThanOrEqual(100);
      expect(metrics.systemHealth.memoryUsage.used).toBeDefined();
      expect(metrics.systemHealth.memoryUsage.total).toBeDefined();
    });

    it('should provide database connection status', async () => {
      mockPrisma.users.count.mockResolvedValue(100);
      mockPrisma.activity_logs.count.mockResolvedValue(50);
      mockPrisma.media_contacts.count.mockResolvedValue(1000);
      mockPrisma.publishers.count.mockResolvedValue(50);
      mockPrisma.outlets.count.mockResolvedValue(200);
      mockPrisma.activity_logs.groupBy.mockResolvedValue([] as any);
      mockPrisma.activity_logs.findMany.mockResolvedValue([] as any);

      const metrics = await adminDashboardService.getAdminMetrics();
      
      expect(metrics.systemHealth.databaseConnections.active).toBeGreaterThanOrEqual(0);
      expect(metrics.systemHealth.databaseConnections.total).toBeGreaterThanOrEqual(metrics.systemHealth.databaseConnections.active);
    });

    it('should provide cache status information', async () => {
      mockPrisma.users.count.mockResolvedValue(100);
      mockPrisma.activity_logs.count.mockResolvedValue(50);
      mockPrisma.media_contacts.count.mockResolvedValue(1000);
      mockPrisma.publishers.count.mockResolvedValue(50);
      mockPrisma.outlets.count.mockResolvedValue(200);
      mockPrisma.activity_logs.groupBy.mockResolvedValue([] as any);
      mockPrisma.activity_logs.findMany.mockResolvedValue([] as any);

      const metrics = await adminDashboardService.getAdminMetrics();
      
      expect(metrics.systemHealth.cacheStatus).toHaveProperty('isAvailable');
      expect(typeof metrics.systemHealth.cacheStatus.isAvailable).toBe('boolean');
      
      if (metrics.systemHealth.cacheStatus.isAvailable) {
        expect(metrics.systemHealth.cacheStatus.hitRate).toBeGreaterThanOrEqual(0);
        expect(metrics.systemHealth.cacheStatus.hitRate).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('performance metrics', () => {
    it('should provide realistic performance data', async () => {
      mockPrisma.users.count.mockResolvedValue(100);
      mockPrisma.activity_logs.count.mockResolvedValue(50);
      mockPrisma.media_contacts.count.mockResolvedValue(1000);
      mockPrisma.publishers.count.mockResolvedValue(50);
      mockPrisma.outlets.count.mockResolvedValue(200);
      mockPrisma.activity_logs.groupBy.mockResolvedValue([] as any);
      mockPrisma.activity_logs.findMany.mockResolvedValue([] as any);

      const metrics = await adminDashboardService.getAdminMetrics();
      
      expect(metrics.performanceMetrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.performanceMetrics.errorRate.percentage).toBeGreaterThanOrEqual(0);
      expect(metrics.performanceMetrics.errorRate.percentage).toBeLessThanOrEqual(100);
      expect(Array.isArray(metrics.performanceMetrics.slowQueries)).toBe(true);
      expect(Array.isArray(metrics.performanceMetrics.apiEndpointStats)).toBe(true);
    });

    it('should include API endpoint statistics', async () => {
      mockPrisma.users.count.mockResolvedValue(100);
      mockPrisma.activity_logs.count.mockResolvedValue(50);
      mockPrisma.media_contacts.count.mockResolvedValue(1000);
      mockPrisma.publishers.count.mockResolvedValue(50);
      mockPrisma.outlets.count.mockResolvedValue(200);
      mockPrisma.activity_logs.groupBy.mockResolvedValue([] as any);
      mockPrisma.activity_logs.findMany.mockResolvedValue([] as any);

      const metrics = await adminDashboardService.getAdminMetrics();
      
      expect(metrics.performanceMetrics.apiEndpointStats.length).toBeGreaterThan(0);
      
      const endpointStat = metrics.performanceMetrics.apiEndpointStats[0];
      expect(endpointStat).toHaveProperty('endpoint');
      expect(endpointStat).toHaveProperty('requestCount');
      expect(endpointStat).toHaveProperty('averageResponseTime');
      expect(endpointStat).toHaveProperty('errorCount');
    });
  });
});
