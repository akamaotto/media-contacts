/**
 * Unit tests for APIErrorInterceptor
 */

import { APIErrorInterceptor, type InterceptedError } from '../error-interceptor';
import { RequestTracker } from '../request-tracker';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

// Mock RequestTracker
jest.mock('../request-tracker');

describe('APIErrorInterceptor', () => {
  let interceptor: APIErrorInterceptor;
  let mockTracker: jest.Mocked<RequestTracker>;
  let mockRequest: NextRequest;

  beforeEach(() => {
    interceptor = APIErrorInterceptor.getInstance();
    
    // Create mock tracker
    mockTracker = {
      getTraceId: jest.fn().mockReturnValue('test-trace-id'),
      getContext: jest.fn().mockReturnValue({
        traceId: 'test-trace-id',
        endpoint: '/api/test',
        method: 'GET',
        timestamp: new Date(),
        userId: 'test-user',
        metadata: {}
      }),
      logError: jest.fn(),
      trackOperationStart: jest.fn(),
      trackOperationComplete: jest.fn(),
      trackOperationFailed: jest.fn()
    } as any;

    // Create mock request
    mockRequest = new NextRequest('http://localhost:3000/api/test');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('interceptError', () => {
    it('should intercept and analyze database connection errors', () => {
      const error = new Error('ECONNREFUSED');
      
      const result = interceptor.interceptError(error, mockRequest, mockTracker);
      
      expect(result.analysis.category).toBe('database_connection');
      expect(result.analysis.severity).toBe('critical');
      expect(result.analysis.isRetryable).toBe(true);
      expect(result.analysis.recoveryStrategy).toBe('retry_with_backoff');
      expect(result.context.traceId).toBe('test-trace-id');
      expect(result.metadata.errorId).toBeDefined();
    });

    it('should intercept and analyze Prisma initialization errors', () => {
      const error = new Prisma.PrismaClientInitializationError('Database connection failed', '1.0.0', 'P1001');
      
      const result = interceptor.interceptError(error, mockRequest, mockTracker);
      
      expect(result.analysis.category).toBe('database_connection');
      expect(result.analysis.severity).toBe('critical');
      expect(result.analysis.isRetryable).toBe(true);
      expect(result.analysis.userMessage).toContain('database connectivity issues');
      expect(result.analysis.maxRetries).toBe(3);
    });

    it('should intercept and analyze Prisma unique constraint violations', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint violation', {
        code: 'P2002',
        clientVersion: '1.0.0'
      });
      
      const result = interceptor.interceptError(error, mockRequest, mockTracker);
      
      expect(result.analysis.category).toBe('validation');
      expect(result.analysis.severity).toBe('medium');
      expect(result.analysis.isRetryable).toBe(false);
      expect(result.analysis.recoveryStrategy).toBe('user_action_required');
      expect(result.analysis.userMessage).toContain('already exists');
    });

    it('should intercept and analyze network errors', () => {
      const error = new Error('fetch failed');
      
      const result = interceptor.interceptError(error, mockRequest, mockTracker);
      
      expect(result.analysis.category).toBe('network');
      expect(result.analysis.severity).toBe('medium');
      expect(result.analysis.isRetryable).toBe(true);
      expect(result.analysis.recoveryStrategy).toBe('retry_with_backoff');
    });

    it('should intercept and analyze authentication errors', () => {
      const error = new Error('Unauthorized');
      
      const result = interceptor.interceptError(error, mockRequest, mockTracker);
      
      expect(result.analysis.category).toBe('authentication');
      expect(result.analysis.severity).toBe('high');
      expect(result.analysis.isRetryable).toBe(false);
      expect(result.analysis.recoveryStrategy).toBe('user_action_required');
      expect(result.analysis.userMessage).toContain('log in');
    });

    it('should intercept and analyze rate limit errors', () => {
      const error = new Error('rate limit exceeded');
      
      const result = interceptor.interceptError(error, mockRequest, mockTracker);
      
      expect(result.analysis.category).toBe('rate_limit');
      expect(result.analysis.severity).toBe('medium');
      expect(result.analysis.isRetryable).toBe(true);
      expect(result.analysis.recoveryStrategy).toBe('retry_with_backoff');
      expect(result.analysis.retryAfterMs).toBe(10000);
    });

    it('should intercept and analyze validation errors', () => {
      const error = new Error('validation failed');
      
      const result = interceptor.interceptError(error, mockRequest, mockTracker);
      
      expect(result.analysis.category).toBe('validation');
      expect(result.analysis.severity).toBe('medium');
      expect(result.analysis.isRetryable).toBe(false);
      expect(result.analysis.recoveryStrategy).toBe('user_action_required');
    });

    it('should store error in history', () => {
      const error = new Error('test error');
      
      interceptor.interceptError(error, mockRequest, mockTracker);
      
      const history = interceptor.getErrorHistory('/api/test');
      expect(history).toHaveLength(1);
      expect(history[0].originalError.message).toBe('test error');
    });

    it('should call tracker methods', () => {
      const error = new Error('test error');
      
      interceptor.interceptError(error, mockRequest, mockTracker);
      
      expect(mockTracker.logError).toHaveBeenCalledWith(
        error,
        'error_intercepted',
        expect.objectContaining({
          errorId: expect.any(String),
          category: expect.any(String),
          severity: expect.any(String)
        })
      );
    });
  });

  describe('getErrorStats', () => {
    beforeEach(() => {
      // Clear any existing history
      interceptor.clearErrorHistory();
    });

    it('should return empty stats for endpoint with no errors', () => {
      const stats = interceptor.getErrorStats('/api/empty');
      
      expect(stats.totalErrors).toBe(0);
      expect(stats.retryableErrors).toBe(0);
      expect(stats.recentErrors).toBe(0);
    });

    it('should calculate error statistics correctly', () => {
      const endpoint = '/api/test';
      
      // Add some errors
      const error1 = new Error('ECONNREFUSED');
      const error2 = new Error('validation failed');
      const error3 = new Error('timeout');
      
      interceptor.interceptError(error1, mockRequest, mockTracker);
      interceptor.interceptError(error2, mockRequest, mockTracker);
      interceptor.interceptError(error3, mockRequest, mockTracker);
      
      const stats = interceptor.getErrorStats(endpoint);
      
      expect(stats.totalErrors).toBe(3);
      expect(stats.retryableErrors).toBe(2); // ECONNREFUSED and timeout are retryable
      expect(stats.errorsByCategory.database_connection).toBe(1);
      expect(stats.errorsByCategory.validation).toBe(1);
      expect(stats.errorsByCategory.database_timeout).toBe(1);
    });
  });

  describe('clearErrorHistory', () => {
    it('should clear history for specific endpoint', () => {
      const error = new Error('test error');
      interceptor.interceptError(error, mockRequest, mockTracker);
      
      expect(interceptor.getErrorHistory('/api/test')).toHaveLength(1);
      
      interceptor.clearErrorHistory('/api/test');
      
      expect(interceptor.getErrorHistory('/api/test')).toHaveLength(0);
    });

    it('should clear all history when no endpoint specified', () => {
      const error = new Error('test error');
      interceptor.interceptError(error, mockRequest, mockTracker);
      
      expect(interceptor.getErrorHistory('/api/test')).toHaveLength(1);
      
      interceptor.clearErrorHistory();
      
      expect(interceptor.getErrorHistory('/api/test')).toHaveLength(0);
    });
  });

  describe('error categorization', () => {
    const testCases = [
      { error: new Error('ECONNREFUSED'), expectedCategory: 'database_connection' },
      { error: new Error('ETIMEDOUT'), expectedCategory: 'database_timeout' },
      { error: new Error('fetch failed'), expectedCategory: 'network' },
      { error: new Error('Unauthorized'), expectedCategory: 'authentication' },
      { error: new Error('Forbidden'), expectedCategory: 'authorization' },
      { error: new Error('validation error'), expectedCategory: 'validation' },
      { error: new Error('rate limit'), expectedCategory: 'rate_limit' },
      { error: new Error('unknown error'), expectedCategory: 'application' }
    ];

    testCases.forEach(({ error, expectedCategory }) => {
      it(`should categorize "${error.message}" as ${expectedCategory}`, () => {
        const result = interceptor.interceptError(error, mockRequest, mockTracker);
        expect(result.analysis.category).toBe(expectedCategory);
      });
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = APIErrorInterceptor.getInstance();
      const instance2 = APIErrorInterceptor.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});