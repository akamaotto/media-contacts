/**
 * Integration tests for complete API error flow
 * Tests the entire error handling pipeline from API failure to client recovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { APIErrorInterceptor } from '../../error-interceptor';
import { withErrorInterception } from '../../middleware/error-interceptor';
import { withRequestContext } from '../../middleware/request-context';
import { RequestTracker } from '../../request-tracker';
import { CircuitBreaker } from '../../circuit-breaker';
import { RetryManager } from '../../retry-manager';

// Mock external dependencies
jest.mock('../../prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    user: { count: jest.fn() },
    country: { findMany: jest.fn() }
  }
}));

jest.mock('../../prisma-monitoring', () => ({
  performHealthCheck: jest.fn(),
  getConnectionMetrics: jest.fn()
}));

describe('API Error Flow Integration Tests', () => {
  let mockRequest: NextRequest;
  let interceptor: APIErrorInterceptor;
  let circuitBreaker: CircuitBreaker;
  let retryManager: RetryManager;

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost:3000/api/test');
    interceptor = APIErrorInterceptor.getInstance();
    circuitBreaker = new CircuitBreaker('test-integration', {
      failureThreshold: 2,
      recoveryTimeout: 1000,
      successThreshold: 1,
      timeout: 5000
    });
    retryManager = RetryManager.getInstance();

    // Clear any existing error history
    interceptor.clearErrorHistory();
    circuitBreaker.reset();

    jest.clearAllMocks();
  });

  describe('Database Connection Failure Flow', () => {
    it('should handle complete database connection failure with retry and fallback', async () => {
      // Simulate database connection failure
      const dbError = new Error('ECONNREFUSED');
      
      // Create a handler that fails with database error
      const failingHandler = jest.fn().mockRejectedValue(dbError);
      
      // Wrap with error interception
      const errorInterceptedHandler = withErrorInterception(
        async (request: NextRequest, { tracker }: { tracker: RequestTracker }) => {
          return await failingHandler();
        },
        {
          enableAutoRecovery: true,
          logErrors: true
        }
      );

      // Execute the handler
      const response = await errorInterceptedHandler(mockRequest, {
        tracker: new RequestTracker({
          traceId: 'test-trace',
          endpoint: '/api/test',
          method: 'GET',
          timestamp: new Date(),
          metadata: {},
          operations: []
        })
      });

      // Verify error response structure
      expect(response).toBeInstanceOf(NextResponse);
      const responseData = await response.json();
      
      expect(responseData.success).toBe(false);
      expect(responseData.error.category).toBe('database_connection');
      expect(responseData.error.severity).toBe('critical');
      expect(responseData.error.isRetryable).toBe(true);
      expect(responseData.error.recoveryStrategy).toBe('retry_with_backoff');
      expect(responseData.context.traceId).toBeDefined();
      expect(response.status).toBe(503);
    });

    it('should handle database timeout with circuit breaker protection', async () => {
      const timeoutError = new Error('Query timeout');
      
      // Execute multiple failures to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        const result = await circuitBreaker.execute(
          () => Promise.reject(timeoutError),
          {
            traceId: `test-trace-${i}`,
            operationName: 'database-query'
          }
        );
        
        expect(result.success).toBe(false);
      }

      // Circuit should now be open
      expect(circuitBreaker.getState()).toBe('OPEN');

      // Next request should be rejected immediately
      const result = await circuitBreaker.execute(
        () => Promise.resolve('should not execute'),
        {
          traceId: 'test-trace-blocked',
          operationName: 'database-query'
        }
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Circuit breaker is OPEN');
    });
  });

  describe('Network Error Flow', () => {
    it('should handle network errors with exponential backoff retry', async () => {
      const networkError = new Error('fetch failed');
      let attemptCount = 0;
      
      const result = await retryManager.executeWithRetry(
        async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw networkError;
          }
          return 'success';
        },
        {
          traceId: 'test-trace',
          operationName: 'network-request',
          policy: {
            maxRetries: 3,
            baseDelayMs: 100,
            backoffMultiplier: 2,
            retryableErrors: ['fetch'],
            retryableStatusCodes: [500, 502, 503]
          }
        }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(3);
      expect(attemptCount).toBe(3);
    });

    it('should handle rate limiting with proper backoff', async () => {
      const rateLimitError = new Error('rate limit exceeded') as any;
      rateLimitError.status = 429;
      
      const result = await retryManager.executeWithRetry(
        () => Promise.reject(rateLimitError),
        {
          traceId: 'test-trace',
          operationName: 'rate-limited-request',
          policy: {
            maxRetries: 2,
            baseDelayMs: 1000,
            retryableStatusCodes: [429]
          }
        }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(3); // Initial + 2 retries
    });
  });

  describe('Validation Error Flow', () => {
    it('should handle validation errors without retry', async () => {
      const validationError = new Error('validation failed');
      
      const result = await retryManager.executeWithRetry(
        () => Promise.reject(validationError),
        {
          traceId: 'test-trace',
          operationName: 'validation-request',
          policy: {
            maxRetries: 3,
            retryableErrors: ['network', 'timeout'] // validation not included
          }
        }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1); // Should not retry
      expect(result.error).toBe(validationError);
    });
  });

  describe('Complete Error Handling Pipeline', () => {
    it('should handle error through complete middleware stack', async () => {
      const dbError = new Error('P1001: Database connection failed');
      
      // Create a complete handler with all middleware
      const completeHandler = withRequestContext(
        withErrorInterception(
          async (request: NextRequest, { tracker }: { tracker: RequestTracker }) => {
            // Simulate database operation failure
            throw dbError;
          },
          {
            enableAutoRecovery: true,
            logErrors: true
          }
        ),
        {
          enableLogging: true,
          additionalMetadata: () => ({
            endpoint: '/api/test',
            feature: 'integration-test'
          })
        }
      );

      const response = await completeHandler(mockRequest);
      const responseData = await response.json();

      // Verify complete error response structure
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBeDefined();
      expect(responseData.error.category).toBe('database_connection');
      expect(responseData.error.isRetryable).toBe(true);
      expect(responseData.context).toBeDefined();
      expect(responseData.context.traceId).toBeDefined();
      expect(responseData.context.endpoint).toBe('/api/test');
      
      // Verify headers
      expect(response.headers.get('X-Trace-ID')).toBeDefined();
      expect(response.status).toBe(503);
    });

    it('should handle successful recovery after failures', async () => {
      let attemptCount = 0;
      
      const recoveringHandler = withErrorInterception(
        async (request: NextRequest, { tracker }: { tracker: RequestTracker }) => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('ECONNREFUSED');
          }
          return NextResponse.json({ success: true, data: 'recovered' });
        },
        {
          enableAutoRecovery: true,
          logErrors: true
        }
      );

      // First two attempts should fail
      let response = await recoveringHandler(mockRequest, {
        tracker: new RequestTracker({
          traceId: 'test-trace-1',
          endpoint: '/api/test',
          method: 'GET',
          timestamp: new Date(),
          metadata: {},
          operations: []
        })
      });
      
      expect(response.status).toBe(503);

      response = await recoveringHandler(mockRequest, {
        tracker: new RequestTracker({
          traceId: 'test-trace-2',
          endpoint: '/api/test',
          method: 'GET',
          timestamp: new Date(),
          metadata: {},
          operations: []
        })
      });
      
      expect(response.status).toBe(503);

      // Third attempt should succeed
      response = await recoveringHandler(mockRequest, {
        tracker: new RequestTracker({
          traceId: 'test-trace-3',
          endpoint: '/api/test',
          method: 'GET',
          timestamp: new Date(),
          metadata: {},
          operations: []
        })
      });
      
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBe('recovered');
      expect(response.status).toBe(200);
    });
  });

  describe('Error Statistics and Monitoring', () => {
    it('should track error statistics across multiple requests', async () => {
      const endpoint = '/api/test-stats';
      
      // Generate various types of errors
      const errors = [
        new Error('ECONNREFUSED'),
        new Error('validation failed'),
        new Error('ETIMEDOUT'),
        new Error('rate limit exceeded'),
        new Error('ECONNREFUSED') // Duplicate to test counting
      ];

      for (const error of errors) {
        interceptor.interceptError(error, mockRequest, new RequestTracker({
          traceId: `trace-${Date.now()}`,
          endpoint,
          method: 'GET',
          timestamp: new Date(),
          metadata: {},
          operations: []
        }));
      }

      const stats = interceptor.getErrorStats(endpoint);
      
      expect(stats.totalErrors).toBe(5);
      expect(stats.retryableErrors).toBe(3); // ECONNREFUSED (2) + ETIMEDOUT (1)
      expect(stats.errorsByCategory.database_connection).toBe(2);
      expect(stats.errorsByCategory.validation).toBe(1);
      expect(stats.errorsByCategory.database_timeout).toBe(1);
      expect(stats.errorsByCategory.rate_limit).toBe(1);
    });

    it('should track circuit breaker state changes', async () => {
      const stateChanges: Array<{ from: string; to: string }> = [];
      
      circuitBreaker.onStateChange((oldState, newState) => {
        stateChanges.push({ from: oldState, to: newState });
      });

      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.execute(
          () => Promise.reject(new Error('failure')),
          { traceId: `trace-${i}`, operationName: 'test' }
        );
      }

      expect(stateChanges).toContainEqual({ from: 'CLOSED', to: 'OPEN' });
      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('Fallback and Graceful Degradation', () => {
    it('should use fallback when circuit breaker is open', async () => {
      // Force circuit to open state
      circuitBreaker.forceState('OPEN');

      const result = await circuitBreaker.execute(
        () => Promise.resolve('primary-result'),
        {
          traceId: 'test-trace',
          operationName: 'test-with-fallback',
          fallback: async () => 'fallback-result'
        }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('fallback-result');
      expect(result.fromCache).toBe(true);
    });

    it('should handle partial failures with graceful degradation', async () => {
      const partialFailureHandler = async () => {
        // Simulate partial success - some data available, some failed
        const results = await Promise.allSettled([
          Promise.resolve({ type: 'countries', data: ['US', 'UK'] }),
          Promise.reject(new Error('beats service unavailable')),
          Promise.resolve({ type: 'languages', data: ['en', 'es'] }),
          Promise.reject(new Error('outlets service timeout'))
        ]);

        const successful = results
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
          .map(result => result.value);

        const failed = results
          .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
          .map(result => result.reason.message);

        return {
          success: true,
          data: successful,
          metadata: {
            partialFailure: true,
            failedServices: failed,
            availableServices: successful.map(s => s.type)
          }
        };
      };

      const result = await partialFailureHandler();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.metadata.partialFailure).toBe(true);
      expect(result.metadata.failedServices).toContain('beats service unavailable');
      expect(result.metadata.availableServices).toContain('countries');
    });
  });
});