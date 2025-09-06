/**
 * Database Error Handler
 * Specialized error handling for Prisma connection failures, query timeouts, and database-specific errors
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/prisma';
import { RequestTracker } from '@/lib/monitoring/request-tracker';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
}

export interface DatabaseErrorContext {
  operation: string;
  query?: string;
  params?: any;
  traceId: string;
  timestamp: Date;
  retryAttempt: number;
}

export interface DatabaseRecoveryResult {
  success: boolean;
  result?: any;
  error?: Error;
  attemptsUsed: number;
  totalDuration: number;
  recoveryStrategy: 'retry' | 'fallback' | 'circuit_breaker' | 'none';
}

/**
 * DatabaseErrorHandler class for handling Prisma-specific errors
 */
export class DatabaseErrorHandler {
  private static instance: DatabaseErrorHandler;
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterMs: 100
  };

  private constructor() {}

  static getInstance(): DatabaseErrorHandler {
    if (!DatabaseErrorHandler.instance) {
      DatabaseErrorHandler.instance = new DatabaseErrorHandler();
    }
    return DatabaseErrorHandler.instance;
  }

  /**
   * Execute a database operation with retry logic and error handling
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: Omit<DatabaseErrorContext, 'retryAttempt' | 'timestamp'>,
    config: Partial<RetryConfig> = {},
    tracker?: RequestTracker
  ): Promise<DatabaseRecoveryResult> {
    const retryConfig = { ...this.defaultRetryConfig, ...config };
    const startTime = Date.now();
    let lastError: Error | undefined;
    let attemptsUsed = 0;

    console.log(`🔄 [DB-ERROR-HANDLER] [${context.traceId}] Starting database operation: ${context.operation}`);

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      attemptsUsed = attempt + 1;
      const attemptContext: DatabaseErrorContext = {
        ...context,
        retryAttempt: attempt,
        timestamp: new Date()
      };

      try {
        if (attempt > 0) {
          const delay = this.calculateBackoffDelay(attempt, retryConfig);
          console.log(`⏳ [DB-ERROR-HANDLER] [${context.traceId}] Retrying ${context.operation} (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}) after ${delay}ms delay`);
          
          if (tracker) {
            tracker.trackOperationStart(`${context.operation}_retry_${attempt}`);
          }
          
          await this.delay(delay);
        }

        console.log(`🔍 [DB-ERROR-HANDLER] [${context.traceId}] Executing ${context.operation} (attempt ${attempt + 1})`);
        const result = await operation();
        
        if (tracker && attempt > 0) {
          tracker.trackOperationComplete(`${context.operation}_retry_${attempt}`, { success: true });
        }

        const totalDuration = Date.now() - startTime;
        console.log(`✅ [DB-ERROR-HANDLER] [${context.traceId}] ${context.operation} succeeded on attempt ${attempt + 1} in ${totalDuration}ms`);

        return {
          success: true,
          result,
          attemptsUsed,
          totalDuration,
          recoveryStrategy: attempt > 0 ? 'retry' : 'none'
        };

      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown database error');
        lastError = err;

        if (tracker && attempt > 0) {
          tracker.trackOperationFailed(`${context.operation}_retry_${attempt}`, err);
        }

        console.error(`❌ [DB-ERROR-HANDLER] [${context.traceId}] ${context.operation} failed on attempt ${attempt + 1}:`, {
          error: err.message,
          errorType: err.constructor.name,
          isRetryable: this.isRetryableError(err),
          willRetry: attempt < retryConfig.maxRetries && this.isRetryableError(err)
        });

        // Check if error is retryable
        if (!this.isRetryableError(err)) {
          console.log(`🚫 [DB-ERROR-HANDLER] [${context.traceId}] Error is not retryable, stopping attempts`);
          break;
        }

        // If this was the last attempt, don't continue
        if (attempt >= retryConfig.maxRetries) {
          console.log(`🛑 [DB-ERROR-HANDLER] [${context.traceId}] Max retries (${retryConfig.maxRetries}) reached for ${context.operation}`);
          break;
        }

        // Log retry decision
        this.logRetryDecision(attemptContext, err, attempt < retryConfig.maxRetries);
      }
    }

    const totalDuration = Date.now() - startTime;
    console.error(`💥 [DB-ERROR-HANDLER] [${context.traceId}] ${context.operation} failed after ${attemptsUsed} attempts in ${totalDuration}ms`);

    return {
      success: false,
      error: lastError,
      attemptsUsed,
      totalDuration,
      recoveryStrategy: 'retry'
    };
  }

  /**
   * Check if an error is retryable
   */
  isRetryableError(error: Error): boolean {
    // Connection errors - always retryable
    if (error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('connection') ||
        error.message.includes('timeout')) {
      return true;
    }

    // Prisma-specific errors
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return true; // Database initialization issues are usually temporary
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      return true; // Rust panics might be temporary
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Some specific Prisma error codes that are retryable
      const retryableCodes = [
        'P1001', // Can't reach database server
        'P1002', // Database server timeout
        'P1008', // Operations timed out
        'P1017', // Server has closed the connection
      ];
      return retryableCodes.includes(error.code);
    }

    // Database-specific error messages that indicate temporary issues
    const retryableMessages = [
      'server closed the connection unexpectedly',
      'connection terminated unexpectedly',
      'could not connect to server',
      'connection refused',
      'network error',
      'temporary failure',
      'service unavailable',
      'too many connections'
    ];

    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  /**
   * Get specific error category for database errors
   */
  getDatabaseErrorCategory(error: Error): string {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return 'database_initialization';
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P1001':
        case 'P1002':
        case 'P1017':
          return 'database_connection';
        case 'P1008':
          return 'database_timeout';
        case 'P2002':
          return 'constraint_violation';
        case 'P2025':
          return 'record_not_found';
        default:
          return 'database_query';
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return 'validation';
    }

    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return 'database_timeout';
    }

    if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
      return 'database_connection';
    }

    return 'database_unknown';
  }

  /**
   * Get user-friendly error message for database errors
   */
  getUserFriendlyMessage(error: Error): string {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return 'We\'re having trouble connecting to our database. Please try again in a moment.';
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P1001':
        case 'P1002':
          return 'Database connection issue. Please try again shortly.';
        case 'P1008':
          return 'The request timed out. Please try again.';
        case 'P2002':
          return 'This record already exists. Please check your data.';
        case 'P2025':
          return 'The requested record was not found.';
        default:
          return 'There was an issue with your request. Please try again.';
      }
    }

    if (error.message.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }

    if (error.message.includes('connection')) {
      return 'Database connection issue. Please try again shortly.';
    }

    return 'A database error occurred. Please try again.';
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = Math.min(
      config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
      config.maxDelayMs
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * config.jitterMs;
    
    return Math.floor(exponentialDelay + jitter);
  }

  /**
   * Log retry decision
   */
  private logRetryDecision(
    context: DatabaseErrorContext,
    error: Error,
    willRetry: boolean
  ): void {
    const errorCategory = this.getDatabaseErrorCategory(error);
    
    console.log(`🔄 [DB-ERROR-HANDLER] [${context.traceId}] Retry decision for ${context.operation}:`, {
      attempt: context.retryAttempt + 1,
      errorCategory,
      errorMessage: error.message,
      isRetryable: this.isRetryableError(error),
      willRetry,
      timestamp: context.timestamp.toISOString()
    });
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a fallback mechanism for when database is unavailable
   */
  async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context: Omit<DatabaseErrorContext, 'retryAttempt' | 'timestamp'>,
    tracker?: RequestTracker
  ): Promise<DatabaseRecoveryResult> {
    const startTime = Date.now();

    try {
      console.log(`🎯 [DB-ERROR-HANDLER] [${context.traceId}] Attempting primary operation: ${context.operation}`);
      
      if (tracker) {
        tracker.trackOperationStart(`${context.operation}_primary`);
      }

      const result = await primaryOperation();
      
      if (tracker) {
        tracker.trackOperationComplete(`${context.operation}_primary`, { success: true });
      }

      const totalDuration = Date.now() - startTime;
      console.log(`✅ [DB-ERROR-HANDLER] [${context.traceId}] Primary operation succeeded in ${totalDuration}ms`);

      return {
        success: true,
        result,
        attemptsUsed: 1,
        totalDuration,
        recoveryStrategy: 'none'
      };

    } catch (primaryError) {
      const err = primaryError instanceof Error ? primaryError : new Error('Primary operation failed');
      
      if (tracker) {
        tracker.trackOperationFailed(`${context.operation}_primary`, err);
      }

      console.warn(`⚠️ [DB-ERROR-HANDLER] [${context.traceId}] Primary operation failed, attempting fallback:`, err.message);

      try {
        if (tracker) {
          tracker.trackOperationStart(`${context.operation}_fallback`);
        }

        const fallbackResult = await fallbackOperation();
        
        if (tracker) {
          tracker.trackOperationComplete(`${context.operation}_fallback`, { success: true });
        }

        const totalDuration = Date.now() - startTime;
        console.log(`🔄 [DB-ERROR-HANDLER] [${context.traceId}] Fallback operation succeeded in ${totalDuration}ms`);

        return {
          success: true,
          result: fallbackResult,
          attemptsUsed: 2,
          totalDuration,
          recoveryStrategy: 'fallback'
        };

      } catch (fallbackError) {
        const fallbackErr = fallbackError instanceof Error ? fallbackError : new Error('Fallback operation failed');
        
        if (tracker) {
          tracker.trackOperationFailed(`${context.operation}_fallback`, fallbackErr);
        }

        const totalDuration = Date.now() - startTime;
        console.error(`💥 [DB-ERROR-HANDLER] [${context.traceId}] Both primary and fallback operations failed in ${totalDuration}ms`);

        return {
          success: false,
          error: err, // Return the original error, not the fallback error
          attemptsUsed: 2,
          totalDuration,
          recoveryStrategy: 'fallback'
        };
      }
    }
  }

  /**
   * Test database connection with retry
   */
  async testConnection(traceId: string, tracker?: RequestTracker): Promise<DatabaseRecoveryResult> {
    return this.executeWithRetry(
      async () => {
        await prisma.$queryRaw`SELECT 1 as connection_test`;
        return true;
      },
      {
        operation: 'connection_test',
        traceId
      },
      {
        maxRetries: 2,
        baseDelayMs: 500,
        maxDelayMs: 5000
      },
      tracker
    );
  }

  /**
   * Execute a query with comprehensive error handling
   */
  async executeQuery<T>(
    queryFn: () => Promise<T>,
    queryName: string,
    traceId: string,
    tracker?: RequestTracker,
    retryConfig?: Partial<RetryConfig>
  ): Promise<DatabaseRecoveryResult> {
    return this.executeWithRetry(
      queryFn,
      {
        operation: queryName,
        traceId
      },
      retryConfig,
      tracker
    );
  }
}

// Export singleton instance
export const databaseErrorHandler = DatabaseErrorHandler.getInstance();

/**
 * Utility function to execute database operations with retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  traceId: string,
  tracker?: RequestTracker,
  config?: Partial<RetryConfig>
): Promise<DatabaseRecoveryResult> {
  return databaseErrorHandler.executeWithRetry(
    operation,
    { operation: operationName, traceId },
    config,
    tracker
  );
}

/**
 * Utility function to execute with fallback
 */
export async function executeWithFallback<T>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<T>,
  operationName: string,
  traceId: string,
  tracker?: RequestTracker
): Promise<DatabaseRecoveryResult> {
  return databaseErrorHandler.executeWithFallback(
    primaryOperation,
    fallbackOperation,
    { operation: operationName, traceId },
    tracker
  );
}

/**
 * Utility to check if an error is database-related and retryable
 */
export function isDatabaseRetryableError(error: Error): boolean {
  return databaseErrorHandler.isRetryableError(error);
}

/**
 * Utility to get database error category
 */
export function getDatabaseErrorCategory(error: Error): string {
  return databaseErrorHandler.getDatabaseErrorCategory(error);
}

/**
 * Utility to get user-friendly database error message
 */
export function getDatabaseErrorMessage(error: Error): string {
  return databaseErrorHandler.getUserFriendlyMessage(error);
}