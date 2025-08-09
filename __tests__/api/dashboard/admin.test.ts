import { GET } from '@/app/api/dashboard/admin/route';
import { auth } from '@/lib/auth';
import { adminDashboardService } from '@/backend/dashboard/admin';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/backend/dashboard/admin');

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockAdminDashboardService = adminDashboardService as jest.Mocked<typeof adminDashboardService>;

describe('/api/dashboard/admin', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost:3000/api/dashboard/admin');
    jest.clearAllMocks();
  });

  describe('GET /api/dashboard/admin', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user is not admin', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', role: 'USER' }
      } as any);

      mockAdminDashboardService.isUserAdmin.mockResolvedValue(false);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });

    it('should return admin metrics for authenticated admin users', async () => {
      const mockSession = {
        user: { id: 'admin-123', role: 'ADMIN' }
      };

      const mockMetrics = {
        systemHealth: {
          uptime: 86400,
          memoryUsage: {
            used: '512MB',
            total: '1GB',
            percentage: 50
          },
          databaseConnections: {
            active: 5,
            total: 10
          },
          cacheStatus: {
            isAvailable: true,
            hitRate: 85
          }
        },
        userActivity: {
          totalUsers: 150,
          activeUsers: {
            today: 25,
            thisWeek: 120
          },
          newUsersThisMonth: 15,
          mostActiveUsers: [
            {
              id: 'user1',
              name: 'John Doe',
              email: 'john@example.com',
              activityCount: 45,
              lastActive: new Date()
            }
          ]
        },
        databaseMetrics: {
          totalRecords: {
            mediaContacts: 1250,
            publishers: 85,
            outlets: 340
          },
          databaseSize: {
            total: '2.5GB',
            tables: [
              { name: 'media_contacts', size: '1.2GB', rowCount: 1250 },
              { name: 'publishers', size: '150MB', rowCount: 85 }
            ]
          },
          recentImports: [
            {
              type: 'media_contacts',
              count: 50,
              timestamp: new Date(),
              userId: 'user1',
              userName: 'John Doe'
            }
          ]
        },
        performanceMetrics: {
          averageResponseTime: 245,
          errorRate: {
            percentage: 0.5,
            count: 12,
            period: '24h'
          },
          slowQueries: [
            {
              query: 'SELECT * FROM media_contacts WHERE...',
              duration: 1500,
              timestamp: new Date()
            }
          ],
          apiEndpointStats: [
            {
              endpoint: '/api/media-contacts',
              requestCount: 1250,
              averageResponseTime: 180,
              errorCount: 3
            }
          ]
        }
      };

      mockAuth.mockResolvedValue(mockSession as any);
      mockAdminDashboardService.isUserAdmin.mockResolvedValue(true);
      mockAdminDashboardService.getAdminMetrics.mockResolvedValue(mockMetrics as any);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockMetrics);
      expect(data.timestamp).toBeDefined();

      // Verify service calls
      expect(mockAdminDashboardService.isUserAdmin).toHaveBeenCalledWith('admin-123');
      expect(mockAdminDashboardService.getAdminMetrics).toHaveBeenCalled();
    });

    it('should return 500 when service throws an error', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-123', role: 'ADMIN' }
      } as any);

      mockAdminDashboardService.isUserAdmin.mockResolvedValue(true);
      mockAdminDashboardService.getAdminMetrics.mockRejectedValue(new Error('Database connection failed'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch admin metrics');
    });

    it('should handle auth service errors gracefully', async () => {
      mockAuth.mockRejectedValue(new Error('Auth service unavailable'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch admin metrics');
    });

    it('should handle admin check service errors gracefully', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', role: 'USER' }
      } as any);

      mockAdminDashboardService.isUserAdmin.mockRejectedValue(new Error('Admin check failed'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch admin metrics');
    });
  });

  describe('Response format validation', () => {
    it('should return properly formatted success response', async () => {
      const mockSession = {
        user: { id: 'admin-123', role: 'ADMIN' }
      };

      const mockMetrics = {
        systemHealth: { uptime: 86400 },
        userActivity: { totalUsers: 100 },
        databaseMetrics: { totalRecords: { mediaContacts: 500 } },
        performanceMetrics: { averageResponseTime: 200 }
      };

      mockAuth.mockResolvedValue(mockSession as any);
      mockAdminDashboardService.isUserAdmin.mockResolvedValue(true);
      mockAdminDashboardService.getAdminMetrics.mockResolvedValue(mockMetrics as any);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data).toHaveProperty('success', true);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('timestamp');
      expect(new Date(data.timestamp)).toBeInstanceOf(Date);
    });

    it('should return properly formatted error response', async () => {
      mockAuth.mockResolvedValue(null);

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(data).toHaveProperty('error');
      expect(data).not.toHaveProperty('success');
      expect(data).not.toHaveProperty('data');
    });
  });

  describe('Security tests', () => {
    it('should not expose sensitive information in error responses', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'admin-123', role: 'ADMIN' }
      } as any);

      mockAdminDashboardService.isUserAdmin.mockResolvedValue(true);
      mockAdminDashboardService.getAdminMetrics.mockRejectedValue(new Error('Database password is invalid'));

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to fetch admin metrics');
      expect(data.error).not.toContain('password');
      expect(data.error).not.toContain('Database password is invalid');
    });

    it('should validate admin role correctly', async () => {
      const testCases = [
        { role: 'USER', shouldAllow: false },
        { role: 'ADMIN', shouldAllow: true },
        { role: 'admin', shouldAllow: false }, // case sensitive
        { role: null, shouldAllow: false },
        { role: undefined, shouldAllow: false }
      ];

      for (const testCase of testCases) {
        mockAuth.mockResolvedValue({
          user: { id: 'user-123', role: testCase.role }
        } as any);

        mockAdminDashboardService.isUserAdmin.mockResolvedValue(testCase.shouldAllow);

        const response = await GET(mockRequest);
        
        if (testCase.shouldAllow) {
          mockAdminDashboardService.getAdminMetrics.mockResolvedValue({} as any);
          expect(response.status).not.toBe(403);
        } else {
          expect(response.status).toBe(403);
        }
      }
    });
  });
});
