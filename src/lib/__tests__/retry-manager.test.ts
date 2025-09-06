/**
 * Unit tests for RetryManager
 */

import { RetryManager, RETRY_POLICIES, type RetryResult, type RetryContext } from '../retry-manager';
import { RequestTracker } from '../request-tracker';

// Mock RequestTracker
jest.mock('../request-tracker');

describe('RetryManager', () => {
  let retryManager: RetryManager;
  let mockTracker: jest.Mocked<RequestTracker>;

  beforeEach(() => {
    retryManager = RetryManager.getInstance();
    
    mockTracker = {
      trackOperationStart: jest.fn(),
      trackOperationComplete: jest.fn(),
      trackOperationFailed: jest.fn()
    } as any;

    // Reset any hooks
    retryManager['hooks'] = {
      beforeRetry: [],
      afterRetry: [],
      onSuccess: [],
      onFailure: []
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await retryManager.executeWithRetry(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation',
        tracker: mockTracker
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(result.recoveryStrategy).toBe('none');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockTracker.trackOperationComplete).toHaveBeenCalled();
    });

    it('should retry on retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValue('success');
      
      const result = await retryManager.executeWithRetry(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation',
        tracker: mockTracker,
        policy: RETRY_POLICIES.DATABASE
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(result.recoveryStrategy).toBe('retry');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const error = new Error('ECONNREFUSED');
      const mockOperation = jest.fn().mockRejectedValue(error);
      
      const result = await retryManager.executeWithRetry(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation',
        tracker: mockTracker,
        policy: { maxRetries: 2 }
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(3); // Initial attempt + 2 retries
      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(mockTracker.trackOperationFailed).toHaveBeenCalled();
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('validation failed');
      const mockOperation = jest.fn().mockRejectedValue(error);
      
      const result = await retryManager.executeWithRetry(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation',
        tracker: mockTracker,
        policy: RETRY_POLICIES.DATABASE
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(1);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should respect timeout configuration', async () => {
      const mockOperation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );
      
      const startTime = Date.now();
      const result = await retryManager.executeWithRetry(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation',
        policy: { timeoutMs: 1000, maxRetries: 0 }
      });
      const endTime = Date.now();
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timeout');
      expect(endTime - startTime).toBeLessThan(1500); // Should timeout before 1.5s
    });

    it('should use custom retry condition', async () => {
      const error = new Error('custom error');
      const mockOperation = jest.fn().mockRejectedValue(error);
      const customCondition = jest.fn().mockReturnValue(true);
      
      const result = await retryManager.executeWithRetry(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation',
        policy: { maxRetries: 2 },
        customCondition
      });
      
      expect(customCondition).toHaveBeenCalledWith(error, 0, expect.any(Object));
      expect(mockOperation).toHaveBeenCalledTimes(3); // Should retry due to custom condition
    });

    it('should calculate exponential backoff correctly', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));
      const delays: number[] = [];
      
      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
        delays.push(delay);
        return originalSetTimeout(callback, 0); // Execute immediately for test
      });
      
      await retryManager.executeWithRetry(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation',
        policy: {
          maxRetries: 2,
          baseDelayMs: 1000,
          backoffMultiplier: 2,
          jitterMs: 0 // No jitter for predictable testing
        }
      });
      
      expect(delays).toHaveLength(2);
      expect(delays[0]).toBeGreaterThanOrEqual(1000); // First retry: base delay
      expect(delays[1]).toBeGreaterThanOrEqual(2000); // Second retry: base * multiplier
      
      global.setTimeout = originalSetTimeout;
    });
  });

  describe('hooks', () => {
    it('should execute before retry hooks', async () => {
      const beforeRetryHook = jest.fn();
      retryManager.addBeforeRetryHook(beforeRetryHook);
      
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue('success');
      
      await retryManager.executeWithRetry(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation'
      });
      
      expect(beforeRetryHook).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'test-operation',
          attempt: 0,
          traceId: 'test-trace'
        })
      );
    });

    it('should execute success hooks', async () => {
      const successHook = jest.fn();
      retryManager.addSuccessHook(successHook);
      
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      await retryManager.executeWithRetry(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation'
      });
      
      expect(successHook).toHaveBeenCalled();
    });

    it('should execute failure hooks', async () => {
      const failureHook = jest.fn();
      retryManager.addFailureHook(failureHook);
      
      const mockOperation = jest.fn().mockRejectedValue(new Error('validation failed'));
      
      await retryManager.executeWithRetry(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation'
      });
      
      expect(failureHook).toHaveBeenCalled();
    });

    it('should handle hook errors gracefully', async () => {
      const faultyHook = jest.fn().mockImplementation(() => {
        throw new Error('hook error');
      });
      retryManager.addBeforeRetryHook(faultyHook);
      
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValue('success');
      
      // Should not throw despite hook error
      const result = await retryManager.executeWithRetry(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation'
      });
      
      expect(result.success).toBe(true);
      expect(faultyHook).toHaveBeenCalled();
    });
  });

  describe('retry policies', () => {
    it('should have correct CONSERVATIVE policy', () => {
      const policy = RETRY_POLICIES.CONSERVATIVE;
      
      expect(policy.maxRetries).toBe(2);
      expect(policy.baseDelayMs).toBe(1000);
      expect(policy.backoffMultiplier).toBe(2);
      expect(policy.retryableErrors).toContain('ECONNREFUSED');
      expect(policy.retryableStatusCodes).toContain(500);
    });

    it('should have correct DATABASE policy', () => {
      const policy = RETRY_POLICIES.DATABASE;
      
      expect(policy.maxRetries).toBe(3);
      expect(policy.retryableErrors).toContain('P1001');
      expect(policy.retryableErrors).toContain('connection');
    });

    it('should have correct NETWORK policy', () => {
      const policy = RETRY_POLICIES.NETWORK;
      
      expect(policy.maxRetries).toBe(4);
      expect(policy.retryableErrors).toContain('fetch');
      expect(policy.retryableStatusCodes).toContain(429);
    });
  });

  describe('retry conditions', () => {
    describe('createDatabaseRetryCondition', () => {
      it('should retry on database connection errors', () => {
        const condition = RetryManager.createDatabaseRetryCondition();
        const error = new Error('ECONNREFUSED');
        const context: RetryContext = {
          operation: 'test',
          attempt: 0,
          maxAttempts: 3,
          totalDuration: 0,
          traceId: 'test'
        };
        
        expect(condition(error, 0, context)).toBe(true);
      });

      it('should retry on Prisma connection errors', () => {
        const condition = RetryManager.createDatabaseRetryCondition();
        const error = new Error('P1001: Database connection failed');
        error.name = 'PrismaClientInitializationError';
        const context: RetryContext = {
          operation: 'test',
          attempt: 0,
          maxAttempts: 3,
          totalDuration: 0,
          traceId: 'test'
        };
        
        expect(condition(error, 0, context)).toBe(true);
      });

      it('should not retry on validation errors', () => {
        const condition = RetryManager.createDatabaseRetryCondition();
        const error = new Error('P2002: Unique constraint violation');
        const context: RetryContext = {
          operation: 'test',
          attempt: 0,
          maxAttempts: 3,
          totalDuration: 0,
          traceId: 'test'
        };
        
        expect(condition(error, 0, context)).toBe(false);
      });
    });

    describe('createNetworkRetryCondition', () => {
      it('should retry on network errors', () => {
        const condition = RetryManager.createNetworkRetryCondition();
        const error = new Error('fetch failed');
        const context: RetryContext = {
          operation: 'test',
          attempt: 0,
          maxAttempts: 3,
          totalDuration: 0,
          traceId: 'test'
        };
        
        expect(condition(error, 0, context)).toBe(true);
      });

      it('should retry on retryable HTTP status codes', () => {
        const condition = RetryManager.createNetworkRetryCondition();
        const error = new Error('Server error') as any;
        error.status = 503;
        const context: RetryContext = {
          operation: 'test',
          attempt: 0,
          maxAttempts: 3,
          totalDuration: 0,
          traceId: 'test'
        };
        
        expect(condition(error, 0, context)).toBe(true);
      });
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RetryManager.getInstance();
      const instance2 = RetryManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('default policy', () => {
    it('should allow setting default policy', () => {
      const customPolicy = { maxRetries: 5, baseDelayMs: 2000 };
      retryManager.setDefaultPolicy(customPolicy);
      
      const currentPolicy = retryManager.getDefaultPolicy();
      expect(currentPolicy.maxRetries).toBe(5);
      expect(currentPolicy.baseDelayMs).toBe(2000);
    });
  });
});