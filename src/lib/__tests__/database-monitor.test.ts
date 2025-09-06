/**
 * Unit tests for DatabaseMonitor
 */

import { DatabaseMonitor, getDatabaseStatus, type DatabaseStatus } from '../database-monitor';
import { RequestTracker } from '../request-tracker';
import { prisma } from '../prisma';

// Mock dependencies
jest.mock('../prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    $disconnect: jest.fn(),
    $connect: jest.fn(),
    users: { count: jest.fn() },
    countries: { count: jest.fn() },
    beats: { count: jest.fn() },
    regions: { count: jest.fn() },
    languages: { count: jest.fn() },
    outlets: { count: jest.fn() },
    media_contacts: { count: jest.fn() }
  }
}));

jest.mock('../prisma-monitoring', () => ({
  performHealthCheck: jest.fn(),
  getConnectionMetrics: jest.fn()
}));

jest.mock('../request-tracker');

import { performHealthCheck, getConnectionMetrics } from '../prisma-monitoring';

describe('DatabaseMonitor', () => {
  let monitor: DatabaseMonitor;
  let mockTracker: jest.Mocked<RequestTracker>;

  beforeEach(() => {
    monitor = new DatabaseMonitor({
      connectionTimeoutMs: 1000,
      queryTimeoutMs: 2000,
      maxRetries: 2
    });

    mockTracker = {
      getTraceId: jest.fn().mockReturnValue('test-trace')
    } as any;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('checkConnection', () => {
    it('should return successful connection status', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ connection_test: 1 }]);

      const result = await monitor.checkConnection();

      expect(result.isConnected).toBe(true);
      expect(result.connectionTime).toBeGreaterThan(0);
      expect(result.retryCount).toBe(0);
      expect(result.error).toBeUndefined();
    });

    it('should retry on connection failure', async () => {
      (prisma.$queryRaw as jest.Mock)
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue([{ connection_test: 1 }]);

      const result = await monitor.checkConnection();

      expect(result.isConnected).toBe(true);
      expect(result.retryCount).toBe(1);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const error = new Error('ECONNREFUSED');
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(error);

      const result = await monitor.checkConnection();

      expect(result.isConnected).toBe(false);
      expect(result.error).toBe('ECONNREFUSED');
      expect(result.retryCount).toBe(2);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should handle timeout', async () => {
      (prisma.$queryRaw as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );

      const result = await monitor.checkConnection();

      expect(result.isConnected).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('validateQueries', () => {
    beforeEach(() => {
      // Mock all table count queries
      (prisma.users.count as jest.Mock).mockResolvedValue(10);
      (prisma.countries.count as jest.Mock).mockResolvedValue(5);
      (prisma.beats.count as jest.Mock).mockResolvedValue(8);
      (prisma.regions.count as jest.Mock).mockResolvedValue(3);
      (prisma.languages.count as jest.Mock).mockResolvedValue(4);
      (prisma.outlets.count as jest.Mock).mockResolvedValue(6);
      (prisma.media_contacts.count as jest.Mock).mockResolvedValue(100);
    });

    it('should validate all queries successfully', async () => {
      const result = await monitor.validateQueries();

      expect(result.isValid).toBe(true);
      expect(result.queriesExecuted).toBe(7);
      expect(result.errors).toHaveLength(0);
      expect(result.validationTime).toBeGreaterThan(0);
    });

    it('should handle query failures', async () => {
      (prisma.users.count as jest.Mock).mockRejectedValue(new Error('Table not found'));
      (prisma.countries.count as jest.Mock).mockRejectedValue(new Error('Connection lost'));

      const result = await monitor.validateQueries();

      expect(result.isValid).toBe(false);
      expect(result.queriesExecuted).toBe(5); // 7 total - 2 failed
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('users: Table not found');
      expect(result.errors[1]).toContain('countries: Connection lost');
    });

    it('should handle query timeout', async () => {
      (prisma.users.count as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 3000))
      );

      const result = await monitor.validateQueries();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('timeout'))).toBe(true);
    });

    it('should detect slow queries', async () => {
      // Mock a slow query
      (prisma.users.count as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(10), 1500))
      );

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await monitor.validateQueries();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow query detected')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      // Mock successful connection and queries
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ connection_test: 1 }]);
      (prisma.users.count as jest.Mock).mockResolvedValue(10);
      (prisma.countries.count as jest.Mock).mockResolvedValue(5);
      (prisma.beats.count as jest.Mock).mockResolvedValue(8);
      (prisma.regions.count as jest.Mock).mockResolvedValue(3);
      (prisma.languages.count as jest.Mock).mockResolvedValue(4);
      (prisma.outlets.count as jest.Mock).mockResolvedValue(6);
      (prisma.media_contacts.count as jest.Mock).mockResolvedValue(100);

      // Mock monitoring functions
      (performHealthCheck as jest.Mock).mockResolvedValue({
        status: 'healthy',
        message: 'All checks passed',
        timestamp: new Date(),
        responseTime: 100,
        connectionTest: true,
        queryTest: true
      });

      (getConnectionMetrics as jest.Mock).mockResolvedValue({
        totalConnections: 2,
        activeConnections: 1,
        idleConnections: 1,
        waitingConnections: 0,
        connectionPoolSize: 5,
        timestamp: new Date(),
        databaseUrl: 'postgresql://test',
        status: 'healthy'
      });
    });

    it('should return healthy status when all checks pass', async () => {
      const status = await monitor.getStatus();

      expect(status.overall).toBe('healthy');
      expect(status.connection.isConnected).toBe(true);
      expect(status.queries.isValid).toBe(true);
      expect(status.health.status).toBe('healthy');
      expect(status.metrics.status).toBe('healthy');
    });

    it('should return offline status when connection fails', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

      const status = await monitor.getStatus();

      expect(status.overall).toBe('offline');
      expect(status.connection.isConnected).toBe(false);
    });

    it('should return critical status when queries fail', async () => {
      (prisma.users.count as jest.Mock).mockRejectedValue(new Error('Query failed'));
      (prisma.countries.count as jest.Mock).mockRejectedValue(new Error('Query failed'));

      const status = await monitor.getStatus();

      expect(status.overall).toBe('critical');
      expect(status.queries.isValid).toBe(false);
    });

    it('should return degraded status when health check fails but connection works', async () => {
      (performHealthCheck as jest.Mock).mockResolvedValue({
        status: 'unhealthy',
        message: 'Some checks failed',
        timestamp: new Date(),
        responseTime: 5000,
        connectionTest: true,
        queryTest: false
      });

      const status = await monitor.getStatus();

      expect(status.overall).toBe('critical');
      expect(status.health.status).toBe('unhealthy');
    });

    it('should return degraded status when connection pool is stressed', async () => {
      (getConnectionMetrics as jest.Mock).mockResolvedValue({
        totalConnections: 4,
        activeConnections: 4,
        idleConnections: 0,
        waitingConnections: 2,
        connectionPoolSize: 5,
        timestamp: new Date(),
        databaseUrl: 'postgresql://test',
        status: 'critical'
      });

      const status = await monitor.getStatus();

      expect(status.overall).toBe('degraded');
      expect(status.metrics.status).toBe('critical');
    });

    it('should handle complete failure gracefully', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Complete failure'));
      (performHealthCheck as jest.Mock).mockRejectedValue(new Error('Health check failed'));
      (getConnectionMetrics as jest.Mock).mockRejectedValue(new Error('Metrics failed'));

      const status = await monitor.getStatus();

      expect(status.overall).toBe('critical');
      expect(status.connection.isConnected).toBe(false);
      expect(status.health.status).toBe('unhealthy');
    });
  });

  describe('handleConnectionFailure', () => {
    it('should attempt reconnection successfully', async () => {
      (prisma.$disconnect as jest.Mock).mockResolvedValue(undefined);
      (prisma.$connect as jest.Mock).mockResolvedValue(undefined);
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ recovery_test: 1 }]);

      const result = await monitor.handleConnectionFailure();

      expect(result.success).toBe(true);
      expect(result.action).toBe('reconnection');
      expect(result.duration).toBeGreaterThan(0);
      expect(prisma.$disconnect).toHaveBeenCalled();
      expect(prisma.$connect).toHaveBeenCalled();
    });

    it('should handle reconnection failure', async () => {
      const error = new Error('Reconnection failed');
      (prisma.$disconnect as jest.Mock).mockResolvedValue(undefined);
      (prisma.$connect as jest.Mock).mockRejectedValue(error);

      const result = await monitor.handleConnectionFailure();

      expect(result.success).toBe(false);
      expect(result.action).toBe('reconnection');
      expect(result.error).toBe('Reconnection failed');
    });
  });

  describe('utility methods', () => {
    it('should return last status', async () => {
      await monitor.getStatus();
      const lastStatus = monitor.getLastStatus();

      expect(lastStatus).toBeDefined();
      expect(lastStatus?.overall).toBeDefined();
    });

    it('should check if healthy', async () => {
      await monitor.getStatus();
      const isHealthy = monitor.isHealthy();

      expect(typeof isHealthy).toBe('boolean');
    });

    it('should get connection utilization', async () => {
      await monitor.getStatus();
      const utilization = monitor.getConnectionUtilization();

      expect(typeof utilization).toBe('number');
      expect(utilization).toBeGreaterThanOrEqual(0);
      expect(utilization).toBeLessThanOrEqual(100);
    });
  });

  describe('periodic monitoring', () => {
    it('should start periodic monitoring', () => {
      const timer = monitor.startPeriodicMonitoring(1000);

      expect(timer).toBeDefined();
      clearInterval(timer);
    });

    it('should handle errors in periodic monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock a failure
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Periodic check failed'));

      const timer = monitor.startPeriodicMonitoring(100);
      
      // Wait for periodic check to run
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(consoleSpy).toHaveBeenCalled();
      
      clearInterval(timer);
      consoleSpy.mockRestore();
    });
  });
});

describe('utility functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDatabaseStatus', () => {
    it('should return database status', async () => {
      // Mock the default monitor instance
      const mockStatus: DatabaseStatus = {
        overall: 'healthy',
        connection: {
          isConnected: true,
          connectionTime: 100,
          timestamp: new Date(),
          retryCount: 0
        },
        queries: {
          isValid: true,
          validationTime: 200,
          queriesExecuted: 7,
          errors: [],
          timestamp: new Date()
        },
        metrics: {
          totalConnections: 2,
          activeConnections: 1,
          idleConnections: 1,
          waitingConnections: 0,
          connectionPoolSize: 5,
          timestamp: new Date(),
          databaseUrl: 'test',
          status: 'healthy'
        },
        health: {
          status: 'healthy',
          message: 'All good',
          timestamp: new Date(),
          responseTime: 100,
          connectionTest: true,
          queryTest: true
        },
        lastCheck: new Date()
      };

      // Mock the monitor's getStatus method
      jest.spyOn(DatabaseMonitor.prototype, 'getStatus').mockResolvedValue(mockStatus);

      const status = await getDatabaseStatus();

      expect(status).toEqual(mockStatus);
    });
  });
});