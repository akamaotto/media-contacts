/**
 * Retry Manager
 * Configurable retry policies with exponential backoff and jitter
 */

import { RequestTracker } from '@/lib/monitoring/request-tracker';

export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  retryableErrors: string[];
  retryableStatusCodes: number[];
  timeoutMs?: number;
}

export interface RetryContext {
  operation: string;
  attempt: number;
  maxAttempts: number;
  lastError?: Error;
  totalDuration: number;
  nextRetryDelay?: number;
  traceId: string;
  metadata?: Record<string, any>;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
  policy: RetryPolicy;
  context: RetryContext;
}

export type RetryCondition = (error: Error, attempt: number, context: RetryContext) => boolean;
export type RetryCallback<T> = (context: RetryContext) => Promise<T>;
export type RetryHook = (context: RetryContext) => void | Promise<void>;

/**
 * Pre-defined retry policies for common scenarios
 */
export const RETRY_POLICIES = {
  // Conservative policy for critical operations
  CONSERVATIVE: {
    maxRetries: 2,
    baseDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    jitterMs: 100,
    retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET'],
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    timeoutMs: 30000
  } as RetryPolicy,

  // Aggressive policy for non-critical operations
  AGGRESSIVE: {
    maxRetries: 5,
    baseDelayMs: 500,
    maxDelayMs: 30000,
    backoffMultiplier: 2.5,
    jitterMs: 200,
    retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'timeout'],
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    timeoutMs: 60000
  } as RetryPolicy,

  // Database-specific policy
  DATABASE: {
    maxRetries: 3,
    baseDelayMs: 800,
    maxDelayMs: 15000,
    backoffMultiplier: 2,
    jitterMs: 150,
    retryableErrors: [
      'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET',
      'connection', 'timeout', 'database', 'P1001', 'P1002', 'P1008', 'P1017'
    ],
    retryableStatusCodes: [503, 504],
    timeoutMs: 45000
  } as RetryPolicy,

  // Network request policy
  NETWORK: {
    maxRetries: 4,
    baseDelayMs: 600,
    maxDelayMs: 20000,
    backoffMultiplier: 2.2,
    jitterMs: 120,
    retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNRESET', 'fetch'],
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    timeoutMs: 40000
  } as RetryPolicy,

  // Quick retry for fast operations
  QUICK: {
    maxRetries: 2,
    baseDelayMs: 200,
    maxDelayMs: 2000,
    backoffMultiplier: 1.5,
    jitterMs: 50,
    retryableErrors: ['ECONNREFUSED', 'ETIMEDOUT'],
    retryableStatusCodes: [429, 502, 503],
    timeoutMs: 10000
  } as RetryPolicy
};

/**
 * RetryManager class for handling retry logic with exponential backoff
 */
export class RetryManager {
  private static instance: RetryManager;
  private defaultPolicy: RetryPolicy = RETRY_POLICIES.CONSERVATIVE;
  private hooks: {
    beforeRetry: RetryHook[];
    afterRetry: RetryHook[];
    onSuccess: RetryHook[];
    onFailure: RetryHook[];
  } = {
    beforeRetry: [],
    afterRetry: [],
    onSuccess: [],
    onFailure: []
  };

  private constructor() {}

  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager();
    }
    return RetryManager.instance;
  }

  /**
   * Execute an operation with retry logic
   */
  async executeWithRetry<T>(
    operation: RetryCallback<T>,
    options: {
      policy?: Partial<RetryPolicy>;
      traceId: string;
      operationName: string;
      tracker?: RequestTracker;
      customCondition?: RetryCondition;
      metadata?: Record<string, any>;
    }
  ): Promise<RetryResult<T>> {
    const policy: RetryPolicy = { ...this.defaultPolicy, ...options.policy };
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attempts = 0;

    const context: RetryContext = {
      operation: options.operationName,
      attempt: 0,
      maxAttempts: policy.maxRetries + 1,
      totalDuration: 0,
      traceId: options.traceId,
      metadata: options.metadata
    };

    console.log(`🔄 [RETRY-MANAGER] [${options.traceId}] Starting retry operation: ${options.operationName}`, {
      policy: {
        maxRetries: policy.maxRetries,
        baseDelayMs: policy.baseDelayMs,
        maxDelayMs: policy.maxDelayMs,
        backoffMultiplier: policy.backoffMultiplier
      }
    });

    if (options.tracker) {
      options.tracker.trackOperationStart(`retry_${options.operationName}`);
    }

    for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
      attempts = attempt + 1;
      context.attempt = attempt;
      context.totalDuration = Date.now() - startTime;

      try {
        // Check for timeout
        if (policy.timeoutMs && context.totalDuration > policy.timeoutMs) {
          const timeoutError = new Error(`Operation timeout after ${context.totalDuration}ms`);
          timeoutError.name = 'TimeoutError';
          throw timeoutError;
        }

        if (attempt > 0) {
          const delay = this.calculateBackoffDelay(attempt, policy);
          context.nextRetryDelay = delay;
          
          console.log(`⏳ [RETRY-MANAGER] [${options.traceId}] Retrying ${options.operationName} (attempt ${attempt + 1}/${policy.maxRetries + 1}) after ${delay}ms delay`);
          
          // Execute before retry hooks
          await this.executeHooks(this.hooks.beforeRetry, context);
          
          if (options.tracker) {
            options.tracker.trackOperationStart(`retry_${options.operationName}_attempt_${attempt}`);
          }
          
          await this.delay(delay);
        }

        console.log(`🎯 [RETRY-MANAGER] [${options.traceId}] Executing ${options.operationName} (attempt ${attempt + 1})`);
        
        const result = await operation(context);
        
        if (options.tracker) {
          if (attempt > 0) {
            options.tracker.trackOperationComplete(`retry_${options.operationName}_attempt_${attempt}`, { success: true });
          }
          options.tracker.trackOperationComplete(`retry_${options.operationName}`, { 
            success: true, 
            attempts,
            totalDuration: Date.now() - startTime
          });
        }

        const totalDuration = Date.now() - startTime;
        context.totalDuration = totalDuration;

        console.log(`✅ [RETRY-MANAGER] [${options.traceId}] ${options.operationName} succeeded on attempt ${attempt + 1} in ${totalDuration}ms`);

        // Execute success hooks
        await this.executeHooks(this.hooks.onSuccess, context);

        return {
          success: true,
          result,
          attempts,
          totalDuration,
          policy,
          context
        };

      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        lastError = err;
        context.lastError = err;

        if (options.tracker && attempt > 0) {
          options.tracker.trackOperationFailed(`retry_${options.operationName}_attempt_${attempt}`, err);
        }

        console.error(`❌ [RETRY-MANAGER] [${options.traceId}] ${options.operationName} failed on attempt ${attempt + 1}:`, {
          error: err.message,
          errorType: err.constructor.name,
          willRetry: attempt < policy.maxRetries && this.shouldRetry(err, attempt, context, policy, options.customCondition)
        });

        // Check if we should retry
        if (attempt >= policy.maxRetries || !this.shouldRetry(err, attempt, context, policy, options.customCondition)) {
          if (attempt >= policy.maxRetries) {
            console.log(`🛑 [RETRY-MANAGER] [${options.traceId}] Max retries (${policy.maxRetries}) reached for ${options.operationName}`);
          } else {
            console.log(`🚫 [RETRY-MANAGER] [${options.traceId}] Error is not retryable, stopping attempts for ${options.operationName}`);
          }
          break;
        }

        // Execute after retry hooks
        await this.executeHooks(this.hooks.afterRetry, context);
      }
    }

    const totalDuration = Date.now() - startTime;
    context.totalDuration = totalDuration;

    if (options.tracker) {
      options.tracker.trackOperationFailed(`retry_${options.operationName}`, lastError || new Error('Unknown error'), {
        attempts,
        totalDuration
      });
    }

    console.error(`💥 [RETRY-MANAGER] [${options.traceId}] ${options.operationName} failed after ${attempts} attempts in ${totalDuration}ms`);

    // Execute failure hooks
    await this.executeHooks(this.hooks.onFailure, context);

    return {
      success: false,
      error: lastError,
      attempts,
      totalDuration,
      policy,
      context
    };
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(
    error: Error,
    attempt: number,
    context: RetryContext,
    policy: RetryPolicy,
    customCondition?: RetryCondition
  ): boolean {
    // Check custom condition first
    if (customCondition) {
      try {
        return customCondition(error, attempt, context);
      } catch (conditionError) {
        console.warn(`⚠️ [RETRY-MANAGER] [${context.traceId}] Custom retry condition failed:`, conditionError);
        // Fall through to default logic
      }
    }

    // Check error message against retryable errors
    const errorMessage = error.message.toLowerCase();
    const isRetryableError = policy.retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError.toLowerCase()) ||
      error.name.toLowerCase().includes(retryableError.toLowerCase())
    );

    if (isRetryableError) {
      return true;
    }

    // Check if error has a status code property (for HTTP errors)
    const statusCode = (error as any).status || (error as any).statusCode;
    if (statusCode && policy.retryableStatusCodes.includes(statusCode)) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number, policy: RetryPolicy): number {
    const exponentialDelay = Math.min(
      policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt),
      policy.maxDelayMs
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * policy.jitterMs;
    
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Execute hooks with error handling
   */
  private async executeHooks(hooks: RetryHook[], context: RetryContext): Promise<void> {
    for (const hook of hooks) {
      try {
        await hook(context);
      } catch (hookError) {
        console.warn(`⚠️ [RETRY-MANAGER] [${context.traceId}] Hook execution failed:`, hookError);
        // Continue with other hooks
      }
    }
  }

  /**
   * Add a hook for before retry events
   */
  addBeforeRetryHook(hook: RetryHook): void {
    this.hooks.beforeRetry.push(hook);
  }

  /**
   * Add a hook for after retry events
   */
  addAfterRetryHook(hook: RetryHook): void {
    this.hooks.afterRetry.push(hook);
  }

  /**
   * Add a hook for success events
   */
  addSuccessHook(hook: RetryHook): void {
    this.hooks.onSuccess.push(hook);
  }

  /**
   * Add a hook for failure events
   */
  addFailureHook(hook: RetryHook): void {
    this.hooks.onFailure.push(hook);
  }

  /**
   * Set the default retry policy
   */
  setDefaultPolicy(policy: Partial<RetryPolicy>): void {
    this.defaultPolicy = { ...this.defaultPolicy, ...policy };
  }

  /**
   * Get the current default policy
   */
  getDefaultPolicy(): RetryPolicy {
    return { ...this.defaultPolicy };
  }

  /**
   * Create a retry condition for database connection failures
   */
  static createDatabaseRetryCondition(): RetryCondition {
    return (error: Error, attempt: number, context: RetryContext) => {
      // Database-specific retry logic
      const errorMessage = error.message.toLowerCase();
      const errorName = error.name.toLowerCase();

      // Always retry connection errors
      if (errorMessage.includes('connection') || 
          errorMessage.includes('econnrefused') ||
          errorMessage.includes('etimedout') ||
          errorMessage.includes('enotfound')) {
        return true;
      }

      // Retry Prisma-specific errors
      if (errorName.includes('prisma') && (
          errorMessage.includes('p1001') || // Can't reach database
          errorMessage.includes('p1002') || // Database timeout
          errorMessage.includes('p1008') || // Operations timed out
          errorMessage.includes('p1017')    // Server closed connection
      )) {
        return true;
      }

      // Don't retry validation errors or constraint violations
      if (errorMessage.includes('p2002') || // Unique constraint
          errorMessage.includes('p2025') || // Record not found
          errorMessage.includes('validation')) {
        return false;
      }

      return false;
    };
  }

  /**
   * Create a retry condition for network requests
   */
  static createNetworkRetryCondition(): RetryCondition {
    return (error: Error, attempt: number, context: RetryContext) => {
      const errorMessage = error.message.toLowerCase();
      const statusCode = (error as any).status || (error as any).statusCode;

      // Retry network errors
      if (errorMessage.includes('fetch') ||
          errorMessage.includes('network') ||
          errorMessage.includes('econnrefused') ||
          errorMessage.includes('etimedout')) {
        return true;
      }

      // Retry specific HTTP status codes
      if (statusCode && [408, 429, 500, 502, 503, 504].includes(statusCode)) {
        return true;
      }

      return false;
    };
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const retryManager = RetryManager.getInstance();

/**
 * Utility function to execute operations with retry
 */
export async function executeWithRetry<T>(
  operation: RetryCallback<T>,
  operationName: string,
  traceId: string,
  options?: {
    policy?: Partial<RetryPolicy>;
    tracker?: RequestTracker;
    customCondition?: RetryCondition;
    metadata?: Record<string, any>;
  }
): Promise<RetryResult<T>> {
  return retryManager.executeWithRetry(operation, {
    operationName,
    traceId,
    ...options
  });
}

/**
 * Utility function to create a database retry operation
 */
export async function executeWithDatabaseRetry<T>(
  operation: RetryCallback<T>,
  operationName: string,
  traceId: string,
  tracker?: RequestTracker,
  metadata?: Record<string, any>
): Promise<RetryResult<T>> {
  return retryManager.executeWithRetry(operation, {
    policy: RETRY_POLICIES.DATABASE,
    traceId,
    operationName,
    tracker,
    customCondition: RetryManager.createDatabaseRetryCondition(),
    metadata
  });
}

/**
 * Utility function to create a network retry operation
 */
export async function executeWithNetworkRetry<T>(
  operation: RetryCallback<T>,
  operationName: string,
  traceId: string,
  tracker?: RequestTracker,
  metadata?: Record<string, any>
): Promise<RetryResult<T>> {
  return retryManager.executeWithRetry(operation, {
    policy: RETRY_POLICIES.NETWORK,
    traceId,
    operationName,
    tracker,
    customCondition: RetryManager.createNetworkRetryCondition(),
    metadata
  });
}