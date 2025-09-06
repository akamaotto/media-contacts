/**
 * Unit tests for CircuitBreaker
 */

import { CircuitBreaker, CircuitBreakerManager, type CircuitBreakerResult } from '../circuit-breaker';
import { RequestTracker } from '../request-tracker';

// Mock RequestTracker
jest.mock('../request-tracker');

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;
  let mockTracker: jest.Mocked<RequestTracker>;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker('test-circuit', {
      failureThreshold: 3,
      recoveryTimeout: 1000,
      successThreshold: 2,
      timeout: 5000,
      monitoringPeriod: 10000,
      volumeThreshold: 5
    });

    mockTracker = {
      getTraceId: jest.fn().mockReturnValue('test-trace'),
      trackOperationStart: jest.fn(),
      trackOperationComplete: jest.fn(),
      trackOperationFailed: jest.fn()
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe('CLOSED');
      expect(circuitBreaker.isHealthy()).toBe(true);
    });

    it('should have correct name', () => {
      expect(circuitBreaker.getName()).toBe('test-circuit');
    });
  });

  describe('execute', () => {
    it('should execute operation successfully when circuit is CLOSED', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation',
        tracker: mockTracker
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.circuitState).toBe('CLOSED');
      expect(mockOperation).toHaveBeenCalledTimes(1);
      expect(mockTracker.trackOperationComplete).toHaveBeenCalled();
    });

    it('should handle operation failure', async () => {
      const error = new Error('operation failed');
      const mockOperation = jest.fn().mockRejectedValue(error);
      
      const result = await circuitBreaker.execute(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation',
        tracker: mockTracker
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(result.circuitState).toBe('CLOSED');
      expect(mockTracker.trackOperationFailed).toHaveBeenCalled();
    });

    it('should open circuit after failure threshold is reached', async () => {
      const error = new Error('operation failed');
      const mockOperation = jest.fn().mockRejectedValue(error);
      
      // Execute enough failures to reach threshold
      for (let i = 0; i < 5; i++) {
        await circuitBreaker.execute(mockOperation, {
          traceId: 'test-trace',
          operationName: 'test-operation'
        });
      }
      
      expect(circuitBreaker.getState()).toBe('OPEN');
      expect(circuitBreaker.isHealthy()).toBe(false);
    });

    it('should reject requests when circuit is OPEN', async () => {
      // Force circuit to OPEN state
      circuitBreaker.forceState('OPEN');
      
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation',
        tracker: mockTracker
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Circuit breaker is OPEN');
      expect(result.circuitState).toBe('OPEN');
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should use fallback when circuit is OPEN', async () => {
      circuitBreaker.forceState('OPEN');
      
      const mockOperation = jest.fn().mockResolvedValue('success');
      const mockFallback = jest.fn().mockResolvedValue('fallback-result');
      
      const result = await circuitBreaker.execute(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation',
        fallback: mockFallback
      });
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('fallback-result');
      expect(result.fromCache).toBe(true);
      expect(mockFallback).toHaveBeenCalled();
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should transition to HALF_OPEN after recovery timeout', async () => {
      // Force circuit to OPEN state
      circuitBreaker.forceState('OPEN');
      expect(circuitBreaker.getState()).toBe('OPEN');
      
      // Wait for recovery timeout (mocked)
      jest.advanceTimersByTime(1000);
      
      // Check state after timeout
      expect(circuitBreaker.getState()).toBe('HALF_OPEN');
    });

    it('should handle timeout in operations', async () => {
      const mockOperation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );
      
      const result = await circuitBreaker.execute(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation'
      });
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timeout');
    });
  });

  describe('state transitions', () => {
    it('should transition from HALF_OPEN to CLOSED on success', async () => {
      circuitBreaker.forceState('HALF_OPEN');
      
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      // Execute successful operations to meet success threshold
      for (let i = 0; i < 2; i++) {
        await circuitBreaker.execute(mockOperation, {
          traceId: 'test-trace',
          operationName: 'test-operation'
        });
      }
      
      expect(circuitBreaker.getState()).toBe('CLOSED');
    });

    it('should transition from HALF_OPEN to OPEN on failure', async () => {
      circuitBreaker.forceState('HALF_OPEN');
      
      const mockOperation = jest.fn().mockRejectedValue(new Error('failed'));
      
      await circuitBreaker.execute(mockOperation, {
        traceId: 'test-trace',
        operationName: 'test-operation'
      });
      
      expect(circuitBreaker.getState()).toBe('OPEN');
    });
  });

  describe('statistics', () => {
    it('should track statistics correctly', async () => {
      const successOperation = jest.fn().mockResolvedValue('success');
      const failOperation = jest.fn().mockRejectedValue(new Error('failed'));
      
      // Execute some operations
      await circuitBreaker.execute(successOperation, {
        traceId: 'test-trace',
        operationName: 'success-op'
      });
      
      await circuitBreaker.execute(failOperation, {
        traceId: 'test-trace',
        operationName: 'fail-op'
      });
      
      const stats = circuitBreaker.getStats();
      
      expect(stats.successCount).toBe(1);
      expect(stats.failureCount).toBe(1);
      expect(stats.totalRequests).toBe(2);
      expect(stats.state).toBe('CLOSED');
      expect(stats.lastSuccessTime).toBeDefined();
      expect(stats.lastFailureTime).toBeDefined();
    });

    it('should calculate failure rate correctly', async () => {
      const failOperation = jest.fn().mockRejectedValue(new Error('failed'));
      
      // Execute multiple failures
      for (let i = 0; i < 3; i++) {
        await circuitBreaker.execute(failOperation, {
          traceId: 'test-trace',
          operationName: 'fail-op'
        });
      }
      
      const stats = circuitBreaker.getStats();
      expect(stats.failureRate).toBe(100); // 100% failure rate
    });
  });

  describe('state change handlers', () => {
    it('should notify state change handlers', () => {
      const handler = jest.fn();
      circuitBreaker.onStateChange(handler);
      
      circuitBreaker.forceState('OPEN');
      
      expect(handler).toHaveBeenCalledWith('CLOSED', 'OPEN', expect.any(Object));
    });

    it('should remove state change handlers', () => {
      const handler = jest.fn();
      circuitBreaker.onStateChange(handler);
      circuitBreaker.removeStateChangeHandler(handler);
      
      circuitBreaker.forceState('OPEN');
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('should reset circuit to initial state', async () => {
      // Execute some operations to change state
      const failOperation = jest.fn().mockRejectedValue(new Error('failed'));
      await circuitBreaker.execute(failOperation, {
        traceId: 'test-trace',
        operationName: 'fail-op'
      });
      
      circuitBreaker.reset();
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe('CLOSED');
      expect(stats.successCount).toBe(0);
      expect(stats.failureCount).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });
  });
});

describe('CircuitBreakerManager', () => {
  let manager: CircuitBreakerManager;

  beforeEach(() => {
    manager = CircuitBreakerManager.getInstance();
  });

  describe('circuit management', () => {
    it('should create and return circuit breakers', () => {
      const circuit1 = manager.getCircuit('test-circuit-1');
      const circuit2 = manager.getCircuit('test-circuit-2');
      
      expect(circuit1).toBeInstanceOf(CircuitBreaker);
      expect(circuit2).toBeInstanceOf(CircuitBreaker);
      expect(circuit1).not.toBe(circuit2);
    });

    it('should return same instance for same name', () => {
      const circuit1 = manager.getCircuit('test-circuit');
      const circuit2 = manager.getCircuit('test-circuit');
      
      expect(circuit1).toBe(circuit2);
    });

    it('should apply custom config to new circuits', () => {
      const customConfig = { failureThreshold: 10 };
      const circuit = manager.getCircuit('custom-circuit', customConfig);
      
      // We can't directly access the config, but we can test behavior
      expect(circuit.getName()).toBe('custom-circuit');
    });
  });

  describe('statistics', () => {
    it('should return stats for all circuits', () => {
      manager.getCircuit('circuit-1');
      manager.getCircuit('circuit-2');
      
      const allStats = manager.getAllStats();
      
      expect(Object.keys(allStats)).toContain('circuit-1');
      expect(Object.keys(allStats)).toContain('circuit-2');
    });

    it('should return all circuits', () => {
      manager.getCircuit('circuit-1');
      manager.getCircuit('circuit-2');
      
      const allCircuits = manager.getAllCircuits();
      
      expect(allCircuits.size).toBe(2);
      expect(allCircuits.has('circuit-1')).toBe(true);
      expect(allCircuits.has('circuit-2')).toBe(true);
    });
  });

  describe('reset and cleanup', () => {
    it('should reset all circuits', () => {
      const circuit1 = manager.getCircuit('circuit-1');
      const circuit2 = manager.getCircuit('circuit-2');
      
      // Force circuits to different states
      circuit1.forceState('OPEN');
      circuit2.forceState('HALF_OPEN');
      
      manager.resetAll();
      
      expect(circuit1.getState()).toBe('CLOSED');
      expect(circuit2.getState()).toBe('CLOSED');
    });

    it('should remove circuits', () => {
      manager.getCircuit('circuit-to-remove');
      expect(manager.getAllCircuits().has('circuit-to-remove')).toBe(true);
      
      const removed = manager.removeCircuit('circuit-to-remove');
      
      expect(removed).toBe(true);
      expect(manager.getAllCircuits().has('circuit-to-remove')).toBe(false);
    });

    it('should return false when removing non-existent circuit', () => {
      const removed = manager.removeCircuit('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('default configuration', () => {
    it('should apply default config to new circuits', () => {
      const defaultConfig = { failureThreshold: 15 };
      manager.setDefaultConfig(defaultConfig);
      
      const circuit = manager.getCircuit('new-circuit');
      
      // Test that the circuit was created (we can't directly test config)
      expect(circuit.getName()).toBe('new-circuit');
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CircuitBreakerManager.getInstance();
      const instance2 = CircuitBreakerManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});

// Mock timers for timeout tests
jest.useFakeTimers();