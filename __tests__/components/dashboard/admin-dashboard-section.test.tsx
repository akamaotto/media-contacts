import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AdminDashboardSection } from '@/components/dashboard/admin-dashboard-section';

// Mock fetch globally
global.fetch = jest.fn();

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'admin-123', role: 'ADMIN' } }
  })
}));

const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('AdminDashboardSection', () => {
  const mockAdminMetrics = {
    systemHealth: {
      uptime: 86400,
      memoryUsage: {
        used: '512MB',
        total: '1GB',
        percentage: 75
      },
      databaseConnections: {
        active: 8,
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
          lastActive: new Date('2024-01-15')
        },
        {
          id: 'user2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          activityCount: 32,
          lastActive: new Date('2024-01-14')
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
          { name: 'publishers', size: '150MB', rowCount: 85 },
          { name: 'outlets', size: '800MB', rowCount: 340 }
        ]
      },
      recentImports: [
        {
          type: 'media_contacts',
          count: 50,
          timestamp: new Date('2024-01-15'),
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
          query: 'SELECT * FROM media_contacts WHERE created_at > ?',
          duration: 1500,
          timestamp: new Date('2024-01-15')
        }
      ],
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
          errorCount: 0
        }
      ]
    }
  };

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('Admin Access Control', () => {
    it('should not render for non-admin users', () => {
      render(
        <AdminDashboardSection 
          userId="user-123" 
          userRole="USER" 
        />
      );

      expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
    });

    it('should render for admin users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAdminMetrics })
      } as Response);

      render(
        <AdminDashboardSection 
          userId="admin-123" 
          userRole="ADMIN" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner initially', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <AdminDashboardSection 
          userId="admin-123" 
          userRole="ADMIN" 
        />
      );

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    });

    it('should hide loading spinner after data loads', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAdminMetrics })
      } as Response);

      render(
        <AdminDashboardSection 
          userId="admin-123" 
          userRole="ADMIN" 
        />
      );

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API call fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      } as Response);

      render(
        <AdminDashboardSection 
          userId="admin-123" 
          userRole="ADMIN" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard Error')).toBeInTheDocument();
        expect(screen.getByText(/Failed to fetch admin metrics/)).toBeInTheDocument();
      });
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <AdminDashboardSection 
          userId="admin-123" 
          userRole="ADMIN" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard Error')).toBeInTheDocument();
      });
    });
  });

  describe('System Health Tab', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAdminMetrics })
      } as Response);

      render(
        <AdminDashboardSection 
          userId="admin-123" 
          userRole="ADMIN" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });

    it('should display system uptime', async () => {
      expect(screen.getByText('System Uptime')).toBeInTheDocument();
      expect(screen.getByText('1d 0h 0m')).toBeInTheDocument();
    });

    it('should display memory usage with progress bar', async () => {
      expect(screen.getByText('Memory Usage')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      
      // Check for progress bar
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should display database connections', async () => {
      expect(screen.getByText('DB Connections')).toBeInTheDocument();
      expect(screen.getByText('8/10')).toBeInTheDocument();
    });

    it('should display cache status', async () => {
      expect(screen.getByText('Cache Status')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('85% hit rate')).toBeInTheDocument();
    });
  });

  describe('User Activity Tab', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAdminMetrics })
      } as Response);

      render(
        <AdminDashboardSection 
          userId="admin-123" 
          userRole="ADMIN" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Click on User Activity tab
      fireEvent.click(screen.getByText('User Activity'));
    });

    it('should display user statistics', async () => {
      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Active Today')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
      });
    });

    it('should display most active users list', async () => {
      await waitFor(() => {
        expect(screen.getByText('Most Active Users')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
        expect(screen.getByText('45 actions')).toBeInTheDocument();
      });
    });
  });

  describe('Database Tab', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAdminMetrics })
      } as Response);

      render(
        <AdminDashboardSection 
          userId="admin-123" 
          userRole="ADMIN" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Click on Database tab
      fireEvent.click(screen.getByText('Database'));
    });

    it('should display database record counts', async () => {
      await waitFor(() => {
        expect(screen.getByText('Media Contacts')).toBeInTheDocument();
        expect(screen.getByText('1,250')).toBeInTheDocument();
        expect(screen.getByText('Publishers')).toBeInTheDocument();
        expect(screen.getByText('85')).toBeInTheDocument();
      });
    });

    it('should display database size information', async () => {
      await waitFor(() => {
        expect(screen.getByText('Database Size')).toBeInTheDocument();
        expect(screen.getByText('2.5GB')).toBeInTheDocument();
        expect(screen.getByText('media_contacts')).toBeInTheDocument();
        expect(screen.getByText('1.2GB')).toBeInTheDocument();
      });
    });

    it('should display recent imports', async () => {
      await waitFor(() => {
        expect(screen.getByText('Recent Imports')).toBeInTheDocument();
        expect(screen.getByText('Media_contacts')).toBeInTheDocument();
        expect(screen.getByText('50 records')).toBeInTheDocument();
        expect(screen.getByText('by John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tab', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAdminMetrics })
      } as Response);

      render(
        <AdminDashboardSection 
          userId="admin-123" 
          userRole="ADMIN" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });

      // Click on Performance tab
      fireEvent.click(screen.getByText('Performance'));
    });

    it('should display performance metrics', async () => {
      await waitFor(() => {
        expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
        expect(screen.getByText('245ms')).toBeInTheDocument();
        expect(screen.getByText('Error Rate')).toBeInTheDocument();
        expect(screen.getByText('0.5%')).toBeInTheDocument();
      });
    });

    it('should display API endpoint statistics', async () => {
      await waitFor(() => {
        expect(screen.getByText('API Endpoint Performance')).toBeInTheDocument();
        expect(screen.getByText('/api/media-contacts')).toBeInTheDocument();
        expect(screen.getByText('1,250')).toBeInTheDocument(); // Request count
        expect(screen.getByText('180ms')).toBeInTheDocument(); // Avg response time
      });
    });

    it('should display slow queries', async () => {
      await waitFor(() => {
        expect(screen.getByText('Slow Queries')).toBeInTheDocument();
        expect(screen.getByText('1500ms')).toBeInTheDocument();
        expect(screen.getByText(/SELECT \* FROM media_contacts/)).toBeInTheDocument();
      });
    });
  });

  describe('Auto-refresh Functionality', () => {
    it('should set up auto-refresh interval', async () => {
      jest.useFakeTimers();
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockAdminMetrics })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: mockAdminMetrics })
        } as Response);

      render(
        <AdminDashboardSection 
          userId="admin-123" 
          userRole="ADMIN" 
        />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 2 minutes
      jest.advanceTimersByTime(2 * 60 * 1000);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      jest.useRealTimers();
    });

    it('should clear interval on unmount', () => {
      jest.useFakeTimers();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAdminMetrics })
      } as Response);

      const { unmount } = render(
        <AdminDashboardSection 
          userId="admin-123" 
          userRole="ADMIN" 
        />
      );

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      
      jest.useRealTimers();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAdminMetrics })
      } as Response);

      render(
        <AdminDashboardSection 
          userId="admin-123" 
          userRole="ADMIN" 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });

    it('should have proper heading structure', async () => {
      const mainHeading = screen.getByRole('heading', { level: 2 });
      expect(mainHeading).toHaveTextContent('Admin Dashboard');
    });

    it('should have accessible tab navigation', async () => {
      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(4);
      expect(tabs[0]).toHaveTextContent('System Health');
      expect(tabs[1]).toHaveTextContent('User Activity');
      expect(tabs[2]).toHaveTextContent('Database');
      expect(tabs[3]).toHaveTextContent('Performance');
    });

    it('should have proper ARIA labels for progress bars', async () => {
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });
  });
});
