/**
 * Retry Mechanism with Exponential Backoff
 * Provides configurable retry logic for various operations
 */

import { AppError, ErrorCategory, RecoveryStrategy } from './error-types';

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
  abortSignal?: AbortSignal;
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTime: number;
}

/**
 * Default retry configurations for different operation types
 */
export const RETRY_CONFIGS = {
  ai_service: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true
  },
  network: {
    maxAttempts: 3,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffMultiplier: 2,
    jitter: true
  },
  database: {
    maxAttempts: 2,
    baseDelay: 5000,
    maxDelay: 20000,
    backoffMultiplier: 1.5,
    jitter: false
  },
  external_api: {
    maxAttempts: 2,
    baseDelay: 3000,
    maxDelay: 12000,
    backoffMultiplier: 2,
    jitter: true
  },
  default: {
    maxAttempts: 2,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    jitter: true
  }
} as const;

/**
 * Retry mechanism class
 */
export class RetryMechanism {
  /**
   * Execute operation with retry logic
   */
  static async execute<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const config: RetryOptions = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryCondition: (error) => this.isRetryableError(error),
      ...options
    };

    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        // Check if operation was aborted
        if (config.abortSignal?.aborted) {
          throw new Error('Operation aborted');
        }

        const result = await operation();
        
        return {
          success: true,
          result,
          attempts: attempt,
          totalTime: Date.now() - startTime
        };
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry this error
        if (!config.retryCondition!(lastError)) {
          break;
        }

        // Don't wait after the last attempt
        if (attempt < config.maxAttempts) {
          const delay = this.calculateDelay(
            config.baseDelay,
            attempt,
            config.maxDelay,
            config.backoffMultiplier,
            config.jitter
          );

          // Call retry callback if provided
          config.onRetry?.(lastError, attempt);

          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError,
      attempts: config.maxAttempts,
      totalTime: Date.now() - startTime
    };
  }

  /**
   * Execute with predefined configuration
   */
  static async executeWithConfig<T>(
    operation: () => Promise<T>,
    configType: keyof typeof RETRY_CONFIGS,
    additionalOptions: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const config = RETRY_CONFIGS[configType];
    return this.execute(operation, { ...config, ...additionalOptions });
  }

  /**
   * Create a retryable version of a function
   */
  static createRetryable<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: Partial<RetryOptions> = {}
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const result = await this.execute(() => fn(...args), options);
      
      if (result.success) {
        return result.result!;
      } else {
        throw result.error;
      }
    };
  }

  /**
   * Batch retry operations with concurrency control
   */
  static async executeBatch<T>(
    operations: Array<() => Promise<T>>,
    options: Partial<RetryOptions> & { concurrency?: number } = {}
  ): Promise<Array<RetryResult<T>>> {
    const { concurrency = 3, ...retryOptions } = options;
    const results: Array<RetryResult<T>> = [];
    
    // Process operations in batches
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      const batchPromises = batch.map(operation => 
        this.execute(operation, retryOptions)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Calculate delay with exponential backoff and optional jitter
   */
  private static calculateDelay(
    baseDelay: number,
    attempt: number,
    maxDelay: number,
    backoffMultiplier: number,
    jitter: boolean
  ): number {
    // Calculate exponential backoff
    const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    let delay = Math.min(exponentialDelay, maxDelay);
    
    // Add jitter if enabled (±25% of the delay)
    if (jitter) {
      const jitterAmount = delay * 0.25;
      const randomJitter = (Math.random() * 2 - 1) * jitterAmount;
      delay = Math.max(0, delay + randomJitter);
    }
    
    return Math.round(delay);
  }

  /**
   * Sleep utility
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Determine if an error is retryable
   */
  private static isRetryableError(error: Error): boolean {
    if (error instanceof AppError) {
      return error.retryable;
    }

    const errorMessage = error.message.toLowerCase();
    
    // Network errors are generally retryable
    if (errorMessage.includes('network') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch')) {
      return true;
    }

    // Server errors (5xx) are retryable
    if (errorMessage.includes('500') || 
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504')) {
      return true;
    }

    // Rate limit errors are retryable with delay
    if (errorMessage.includes('rate limit') || 
        errorMessage.includes('429')) {
      return true;
    }

    // AI service temporary errors
    if (errorMessage.includes('overloaded') ||
        errorMessage.includes('temporarily unavailable') ||
        errorMessage.includes('service unavailable')) {
      return true;
    }

    // Client errors (4xx except 429) are generally not retryable
    if (errorMessage.includes('400') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('404')) {
      return false;
    }

    // Default to retryable for unknown errors
    return true;
  }
}

/**
 * Decorator for automatic retry
 */
export function Retryable(options: Partial<RetryOptions> = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await RetryMechanism.execute(
        () => originalMethod.apply(this, args),
        options
      );

      if (result.success) {
        return result.result;
      } else {
        throw result.error;
      }
    };

    return descriptor;
  };
}

/**
 * Utility functions for common retry patterns
 */
export const retryUtils = {
  /**
   * Retry AI service calls
   */
  aiService: <T>(operation: () => Promise<T>, options: Partial<RetryOptions> = {}) =>
    RetryMechanism.executeWithConfig(operation, 'ai_service', options),

  /**
   * Retry network requests
   */
  network: <T>(operation: () => Promise<T>, options: Partial<RetryOptions> = {}) =>
    RetryMechanism.executeWithConfig(operation, 'network', options),

  /**
   * Retry database operations
   */
  database: <T>(operation: () => Promise<T>, options: Partial<RetryOptions> = {}) =>
    RetryMechanism.executeWithConfig(operation, 'database', options),

  /**
   * Retry external API calls
   */
  externalAPI: <T>(operation: () => Promise<T>, options: Partial<RetryOptions> = {}) =>
    RetryMechanism.executeWithConfig(operation, 'external_api', options),

  /**
   * Create a retryable fetch function
   */
  createRetryableFetch: (options: Partial<RetryOptions> = {}) => {
    return RetryMechanism.createRetryable(
      async (url: string, init?: RequestInit) => {
        const response = await fetch(url, init);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      },
      {
        ...RETRY_CONFIGS.network,
        ...options,
        retryCondition: (error) => {
          const message = error.message.toLowerCase();
          // Retry on network errors and 5xx status codes
          return message.includes('network') || 
                 message.includes('timeout') ||
                 message.includes('50') || // 500, 502, 503, 504
                 message.includes('429'); // Rate limit
        }
      }
    );
  },

  /**
   * Exponential backoff calculator
   */
  calculateBackoff: (attempt: number, baseDelay: number = 1000, maxDelay: number = 30000) => {
    return RetryMechanism['calculateDelay'](baseDelay, attempt, maxDelay, 2, true);
  }
};