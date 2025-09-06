/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascade failures by tracking failure rates and opening circuits
 */

import { RequestTracker } from '@/lib/monitoring/request-tracker';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;        // Number of failures before opening
  recoveryTimeout: number;         // Time to wait before trying half-open (ms)
  successThreshold: number;        // Number of successes needed to close from half-open
  timeout: number;                 // Request timeout (ms)
  monitoringPeriod: number;        // Time window for failure counting (ms)
  volumeThreshold: number;         // Minimum requests before circuit can open
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  stateChangedAt: Date;
  failureRate: number;
  uptime: number;
  requestsInCurrentPeriod: number;
}

export interface CircuitBreakerResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  circuitState: CircuitState;
  stats: CircuitBreakerStats;
  executionTime: number;
  fromCache?: boolean;
}

export type CircuitBreakerCallback<T> = () => Promise<T>;
export type CircuitBreakerFallback<T> = (error: Error, stats: CircuitBreakerStats) => Promise<T>;
export type CircuitBreakerStateChangeHandler = (oldState: CircuitState, newState: CircuitState, stats: CircuitBreakerStats) => void;

/**
 * CircuitBreaker class implementing the circuit breaker pattern
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private totalRequests = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private stateChangedAt = new Date();
  private requestHistory: Array<{ timestamp: Date; success: boolean }> = [];
  private stateChangeHandlers: CircuitBreakerStateChangeHandler[] = [];
  private name: string;

  constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
    this.name = name;
    this.config = {
      failureThreshold: 5,
      recoveryTimeout: 60000,      // 1 minute
      successThreshold: 3,
      timeout: 30000,              // 30 seconds
      monitoringPeriod: 300000,    // 5 minutes
      volumeThreshold: 10,
      ...config
    };

    console.log(`🔌 [CIRCUIT-BREAKER] [${this.name}] Circuit breaker initialized:`, {
      failureThreshold: this.config.failureThreshold,
      recoveryTimeout: this.config.recoveryTimeout,
      successThreshold: this.config.successThreshold,
      timeout: this.config.timeout
    });
  }

  /**
   * Execute an operation through the circuit breaker
   */
  async execute<T>(
    operation: CircuitBreakerCallback<T>,
    options: {
      traceId: string;
      operationName: string;
      tracker?: RequestTracker;
      fallback?: CircuitBreakerFallback<T>;
      metadata?: Record<string, any>;
    }
  ): Promise<CircuitBreakerResult<T>> {
    const startTime = Date.now();
    const { traceId, operationName, tracker, fallback, metadata } = options;

    console.log(`🔌 [CIRCUIT-BREAKER] [${this.name}] [${traceId}] Executing ${operationName} (state: ${this.state})`);

    if (tracker) {
      tracker.trackOperationStart(`circuit_breaker_${operationName}`);
    }

    // Check circuit state
    this.updateState();
    
    if (this.state === 'OPEN') {
      const error = new Error(`Circuit breaker is OPEN for ${this.name}`);
      error.name = 'CircuitBreakerOpenError';
      
      console.warn(`🚫 [CIRCUIT-BREAKER] [${this.name}] [${traceId}] Circuit is OPEN, rejecting ${operationName}`);
      
      if (tracker) {
        tracker.trackOperationFailed(`circuit_breaker_${operationName}`, error, { circuitState: this.state });
      }

      // Try fallback if available
      if (fallback) {
        try {
          console.log(`🔄 [CIRCUIT-BREAKER] [${this.name}] [${traceId}] Executing fallback for ${operationName}`);
          const fallbackResult = await fallback(error, this.getStats());
          
          return {
            success: true,
            result: fallbackResult,
            circuitState: this.state,
            stats: this.getStats(),
            executionTime: Date.now() - startTime,
            fromCache: true
          };
        } catch (fallbackError) {
          console.error(`❌ [CIRCUIT-BREAKER] [${this.name}] [${traceId}] Fallback failed:`, fallbackError);
          return {
            success: false,
            error: fallbackError instanceof Error ? fallbackError : new Error('Fallback failed'),
            circuitState: this.state,
            stats: this.getStats(),
            executionTime: Date.now() - startTime
          };
        }
      }

      return {
        success: false,
        error,
        circuitState: this.state,
        stats: this.getStats(),
        executionTime: Date.now() - startTime
      };
    }

    // Execute the operation
    try {
      console.log(`⚡ [CIRCUIT-BREAKER] [${this.name}] [${traceId}] Executing ${operationName}...`);
      
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
        }, this.config.timeout);
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      
      // Record success
      this.recordSuccess();
      
      const executionTime = Date.now() - startTime;
      console.log(`✅ [CIRCUIT-BREAKER] [${this.name}] [${traceId}] ${operationName} succeeded in ${executionTime}ms`);
      
      if (tracker) {
        tracker.trackOperationComplete(`circuit_breaker_${operationName}`, { 
          circuitState: this.state,
          executionTime
        });
      }

      return {
        success: true,
        result,
        circuitState: this.state,
        stats: this.getStats(),
        executionTime
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      // Record failure
      this.recordFailure();
      
      const executionTime = Date.now() - startTime;
      console.error(`❌ [CIRCUIT-BREAKER] [${this.name}] [${traceId}] ${operationName} failed in ${executionTime}ms:`, err.message);
      
      if (tracker) {
        tracker.trackOperationFailed(`circuit_breaker_${operationName}`, err, { 
          circuitState: this.state,
          executionTime
        });
      }

      // Try fallback if available
      if (fallback) {
        try {
          console.log(`🔄 [CIRCUIT-BREAKER] [${this.name}] [${traceId}] Executing fallback for ${operationName} after failure`);
          const fallbackResult = await fallback(err, this.getStats());
          
          return {
            success: true,
            result: fallbackResult,
            error: err, // Keep original error for reference
            circuitState: this.state,
            stats: this.getStats(),
            executionTime: Date.now() - startTime,
            fromCache: true
          };
        } catch (fallbackError) {
          console.error(`❌ [CIRCUIT-BREAKER] [${this.name}] [${traceId}] Fallback failed:`, fallbackError);
          return {
            success: false,
            error: fallbackError instanceof Error ? fallbackError : new Error('Fallback failed'),
            circuitState: this.state,
            stats: this.getStats(),
            executionTime: Date.now() - startTime
          };
        }
      }

      return {
        success: false,
        error: err,
        circuitState: this.state,
        stats: this.getStats(),
        executionTime
      };
    }
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(): void {
    this.successCount++;
    this.totalRequests++;
    this.lastSuccessTime = new Date();
    
    this.requestHistory.push({
      timestamp: new Date(),
      success: true
    });

    this.cleanupHistory();
    this.updateState();

    console.log(`📈 [CIRCUIT-BREAKER] [${this.name}] Success recorded (${this.successCount} successes, state: ${this.state})`);
  }

  /**
   * Record a failed operation
   */
  private recordFailure(): void {
    this.failureCount++;
    this.totalRequests++;
    this.lastFailureTime = new Date();
    
    this.requestHistory.push({
      timestamp: new Date(),
      success: false
    });

    this.cleanupHistory();
    this.updateState();

    console.log(`📉 [CIRCUIT-BREAKER] [${this.name}] Failure recorded (${this.failureCount} failures, state: ${this.state})`);
  }

  /**
   * Update circuit state based on current conditions
   */
  private updateState(): void {
    const oldState = this.state;
    const now = new Date();
    const timeSinceStateChange = now.getTime() - this.stateChangedAt.getTime();
    const recentRequests = this.getRecentRequests();
    const recentFailures = recentRequests.filter(r => !r.success).length;

    switch (this.state) {
      case 'CLOSED':
        // Check if we should open the circuit
        if (recentRequests.length >= this.config.volumeThreshold && 
            recentFailures >= this.config.failureThreshold) {
          this.setState('OPEN');
        }
        break;

      case 'OPEN':
        // Check if we should try half-open
        if (timeSinceStateChange >= this.config.recoveryTimeout) {
          this.setState('HALF_OPEN');
        }
        break;

      case 'HALF_OPEN':
        // Check if we should close (enough successes) or open (any failure)
        const recentSuccesses = recentRequests.filter(r => r.success).length;
        
        if (recentSuccesses >= this.config.successThreshold) {
          this.setState('CLOSED');
        } else if (recentFailures > 0) {
          this.setState('OPEN');
        }
        break;
    }

    if (oldState !== this.state) {
      console.log(`🔄 [CIRCUIT-BREAKER] [${this.name}] State changed: ${oldState} → ${this.state}`);
      this.notifyStateChange(oldState, this.state);
    }
  }

  /**
   * Set circuit state and update timestamp
   */
  private setState(newState: CircuitState): void {
    this.state = newState;
    this.stateChangedAt = new Date();
    
    // Reset counters when transitioning to half-open
    if (newState === 'HALF_OPEN') {
      this.successCount = 0;
      this.failureCount = 0;
    }
    
    // Reset all counters when closing
    if (newState === 'CLOSED') {
      this.successCount = 0;
      this.failureCount = 0;
    }
  }

  /**
   * Get recent requests within the monitoring period
   */
  private getRecentRequests(): Array<{ timestamp: Date; success: boolean }> {
    const cutoffTime = new Date(Date.now() - this.config.monitoringPeriod);
    return this.requestHistory.filter(request => request.timestamp >= cutoffTime);
  }

  /**
   * Clean up old request history
   */
  private cleanupHistory(): void {
    const cutoffTime = new Date(Date.now() - this.config.monitoringPeriod);
    this.requestHistory = this.requestHistory.filter(request => request.timestamp >= cutoffTime);
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const recentRequests = this.getRecentRequests();
    const recentFailures = recentRequests.filter(r => !r.success).length;
    const failureRate = recentRequests.length > 0 ? (recentFailures / recentRequests.length) * 100 : 0;
    const uptime = Date.now() - this.stateChangedAt.getTime();

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangedAt: this.stateChangedAt,
      failureRate,
      uptime,
      requestsInCurrentPeriod: recentRequests.length
    };
  }

  /**
   * Get circuit name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  /**
   * Check if circuit is healthy (closed or half-open with recent successes)
   */
  isHealthy(): boolean {
    this.updateState();
    return this.state === 'CLOSED' || 
           (this.state === 'HALF_OPEN' && this.successCount > 0);
  }

  /**
   * Force circuit to a specific state (for testing/manual intervention)
   */
  forceState(state: CircuitState): void {
    const oldState = this.state;
    this.setState(state);
    console.log(`🔧 [CIRCUIT-BREAKER] [${this.name}] State forced: ${oldState} → ${state}`);
    this.notifyStateChange(oldState, state);
  }

  /**
   * Reset circuit breaker to initial state
   */
  reset(): void {
    const oldState = this.state;
    this.setState('CLOSED');
    this.failureCount = 0;
    this.successCount = 0;
    this.totalRequests = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.requestHistory = [];
    
    console.log(`🔄 [CIRCUIT-BREAKER] [${this.name}] Circuit breaker reset`);
    this.notifyStateChange(oldState, this.state);
  }

  /**
   * Add state change handler
   */
  onStateChange(handler: CircuitBreakerStateChangeHandler): void {
    this.stateChangeHandlers.push(handler);
  }

  /**
   * Remove state change handler
   */
  removeStateChangeHandler(handler: CircuitBreakerStateChangeHandler): void {
    const index = this.stateChangeHandlers.indexOf(handler);
    if (index > -1) {
      this.stateChangeHandlers.splice(index, 1);
    }
  }

  /**
   * Notify all state change handlers
   */
  private notifyStateChange(oldState: CircuitState, newState: CircuitState): void {
    const stats = this.getStats();
    
    this.stateChangeHandlers.forEach(handler => {
      try {
        handler(oldState, newState, stats);
      } catch (error) {
        console.error(`⚠️ [CIRCUIT-BREAKER] [${this.name}] State change handler error:`, error);
      }
    });
  }
}

/**
 * CircuitBreakerManager for managing multiple circuit breakers
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private circuits = new Map<string, CircuitBreaker>();
  private defaultConfig: Partial<CircuitBreakerConfig> = {};

  private constructor() {}

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Get or create a circuit breaker
   */
  getCircuit(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuits.has(name)) {
      const circuitConfig = { ...this.defaultConfig, ...config };
      const circuit = new CircuitBreaker(name, circuitConfig);
      
      // Add default state change handler for logging
      circuit.onStateChange((oldState, newState, stats) => {
        console.log(`🔌 [CIRCUIT-MANAGER] Circuit ${name} state changed: ${oldState} → ${newState}`, {
          failureRate: `${stats.failureRate.toFixed(1)}%`,
          totalRequests: stats.totalRequests,
          uptime: `${Math.round(stats.uptime / 1000)}s`
        });
      });
      
      this.circuits.set(name, circuit);
      console.log(`🔌 [CIRCUIT-MANAGER] Created new circuit breaker: ${name}`);
    }
    
    return this.circuits.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  getAllCircuits(): Map<string, CircuitBreaker> {
    return new Map(this.circuits);
  }

  /**
   * Get circuit breaker statistics for all circuits
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    
    this.circuits.forEach((circuit, name) => {
      stats[name] = circuit.getStats();
    });
    
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.circuits.forEach((circuit, name) => {
      circuit.reset();
      console.log(`🔄 [CIRCUIT-MANAGER] Reset circuit: ${name}`);
    });
  }

  /**
   * Set default configuration for new circuits
   */
  setDefaultConfig(config: Partial<CircuitBreakerConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Remove a circuit breaker
   */
  removeCircuit(name: string): boolean {
    return this.circuits.delete(name);
  }
}

// Export singleton instance
export const circuitBreakerManager = CircuitBreakerManager.getInstance();

/**
 * Utility function to execute operations with circuit breaker
 */
export async function executeWithCircuitBreaker<T>(
  operation: CircuitBreakerCallback<T>,
  circuitName: string,
  traceId: string,
  operationName: string,
  options?: {
    config?: Partial<CircuitBreakerConfig>;
    tracker?: RequestTracker;
    fallback?: CircuitBreakerFallback<T>;
    metadata?: Record<string, any>;
  }
): Promise<CircuitBreakerResult<T>> {
  const circuit = circuitBreakerManager.getCircuit(circuitName, options?.config);
  
  return circuit.execute(operation, {
    traceId,
    operationName,
    tracker: options?.tracker,
    fallback: options?.fallback,
    metadata: options?.metadata
  });
}

/**
 * Utility function to get circuit breaker statistics
 */
export function getCircuitBreakerStats(circuitName?: string): CircuitBreakerStats | Record<string, CircuitBreakerStats> {
  if (circuitName) {
    const circuit = circuitBreakerManager.getAllCircuits().get(circuitName);
    if (!circuit) {
      throw new Error(`Circuit breaker '${circuitName}' not found`);
    }
    return circuit.getStats();
  }
  
  return circuitBreakerManager.getAllStats();
}