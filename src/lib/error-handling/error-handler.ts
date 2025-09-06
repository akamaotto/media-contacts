/**
 * Centralized Error Handler
 * Handles error processing, logging, recovery, and user notification
 */

import { 
  AppError, 
  ErrorCategory, 
  ErrorSeverity, 
  RecoveryStrategy,
  ErrorContext,
  AIServiceError,
  NetworkError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  RateLimitError,
  QuotaExceededError,
  ConfigurationError,
  DatabaseError,
  ExternalAPIError,
  ERROR_CODES
} from './error-types';
import { auditLogger } from '@/lib/security/audit-logger';

export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableRetry: boolean;
  enableFallback: boolean;
  enableUserNotification: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  maxRetryAttempts: number;
  baseRetryDelay: number;
  enableCircuitBreaker: boolean;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'closed' | 'open' | 'half-open';
  nextAttemptTime: number;
}

export interface ErrorHandlerResult {
  success: boolean;
  error?: AppError;
  result?: any;
  retryAttempts: number;
  fallbackUsed: boolean;
  circuitBreakerTripped: boolean;
}

/**
 * Main Error Handler Class
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private config: ErrorHandlerConfig;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private errorCounts: Map<string, number> = new Map();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableLogging: true,
      enableRetry: true,
      enableFallback: true,
      enableUserNotification: true,
      logLevel: 'error',
      maxRetryAttempts: 3,
      baseRetryDelay: 1000,
      enableCircuitBreaker: true,
      ...config
    };
  }

  static getInstance(config?: Partial<ErrorHandlerConfig>): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config);
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with full processing pipeline
   */
  async handleError(
    error: Error | AppError,
    context: ErrorContext,
    operation?: () => Promise<any>,
    fallbackOperation?: () => Promise<any>
  ): Promise<ErrorHandlerResult> {
    const appError = this.normalizeError(error, context);
    
    // Log the error
    if (this.config.enableLogging) {
      await this.logError(appError);
    }

    // Check circuit breaker
    if (this.config.enableCircuitBreaker && this.isCircuitBreakerOpen(appError)) {
      return {
        success: false,
        error: appError,
        retryAttempts: 0,
        fallbackUsed: false,
        circuitBreakerTripped: true
      };
    }

    let retryAttempts = 0;
    let fallbackUsed = false;

    // Attempt retry if applicable
    if (this.config.enableRetry && appError.retryable && operation) {
      const retryResult = await this.attemptRetry(appError, operation);
      retryAttempts = retryResult.attempts;
      
      if (retryResult.success) {
        this.recordSuccess(appError);
        return {
          success: true,
          result: retryResult.result,
          retryAttempts,
          fallbackUsed,
          circuitBreakerTripped: false
        };
      }
    }

    // Attempt fallback if retry failed or not applicable
    if (this.config.enableFallback && fallbackOperation && 
        (appError.recoveryStrategy === RecoveryStrategy.FALLBACK || 
         appError.recoveryStrategy === RecoveryStrategy.GRACEFUL_DEGRADATION)) {
      
      try {
        const fallbackResult = await fallbackOperation();
        fallbackUsed = true;
        this.recordSuccess(appError);
        
        return {
          success: true,
          result: fallbackResult,
          retryAttempts,
          fallbackUsed,
          circuitBreakerTripped: false
        };
      } catch (fallbackError) {
        // Fallback also failed, continue with original error
      }
    }

    // Record failure for circuit breaker
    this.recordFailure(appError);

    return {
      success: false,
      error: appError,
      retryAttempts,
      fallbackUsed,
      circuitBreakerTripped: false
    };
  }

  /**
   * Normalize any error to AppError
   */
  private normalizeError(error: Error | AppError, context: ErrorContext): AppError {
    if (error instanceof AppError) {
      return error;
    }

    // Try to classify the error based on message and type
    const errorMessage = error.message.toLowerCase();
    
    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('connection') || 
        errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
      return new NetworkError(
        ERROR_CODES.NETWORK_CONNECTION_FAILED,
        error.message,
        context,
        error
      );
    }

    // Authentication errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication') ||
        errorMessage.includes('token') || error.message.includes('401')) {
      return new AuthenticationError(
        ERROR_CODES.AUTH_REQUIRED,
        error.message,
        context,
        error
      );
    }

    // Authorization errors
    if (errorMessage.includes('forbidden') || errorMessage.includes('permission') ||
        error.message.includes('403')) {
      return new AuthorizationError(
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        error.message,
        context,
        error
      );
    }

    // Rate limit errors
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests') ||
        error.message.includes('429')) {
      return new RateLimitError(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        error.message,
        context,
        undefined,
        error
      );
    }

    // AI service errors
    if (errorMessage.includes('ai') || errorMessage.includes('model') ||
        errorMessage.includes('openai') || errorMessage.includes('anthropic')) {
      return new AIServiceError(
        ERROR_CODES.AI_SERVICE_UNAVAILABLE,
        error.message,
        context,
        error
      );
    }

    // Database errors
    if (errorMessage.includes('database') || errorMessage.includes('sql') ||
        errorMessage.includes('prisma') || errorMessage.includes('connection')) {
      return new DatabaseError(
        ERROR_CODES.DATABASE_CONNECTION_FAILED,
        error.message,
        context,
        error
      );
    }

    // Default to unknown error
    return new AppError({
      code: ERROR_CODES.UNKNOWN_ERROR,
      message: error.message,
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: 'An unexpected error occurred. Please try again.',
      technicalMessage: error.message,
      context,
      originalError: error,
      retryable: true,
      maxRetries: 1
    });
  }

  /**
   * Attempt retry with exponential backoff
   */
  private async attemptRetry(
    error: AppError,
    operation: () => Promise<any>
  ): Promise<{ success: boolean; result?: any; attempts: number }> {
    const maxAttempts = error.maxRetries || this.config.maxRetryAttempts;
    const baseDelay = error.retryDelay || this.config.baseRetryDelay;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateRetryDelay(baseDelay, attempt);
        
        if (attempt > 1) {
          await this.sleep(delay);
        }

        const result = await operation();
        return { success: true, result, attempts: attempt };
      } catch (retryError) {
        if (attempt === maxAttempts) {
          return { success: false, attempts: attempt };
        }
        
        // Check if the new error is non-retryable
        const normalizedRetryError = this.normalizeError(retryError as Error, error.context);
        if (!normalizedRetryError.retryable) {
          return { success: false, attempts: attempt };
        }
      }
    }

    return { success: false, attempts: maxAttempts };
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(baseDelay: number, attempt: number): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const maxDelay = 30000; // 30 seconds max
    const delay = Math.min(exponentialDelay, maxDelay);
    
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(0, delay + jitter);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Circuit breaker logic
   */
  private isCircuitBreakerOpen(error: AppError): boolean {
    if (!this.config.enableCircuitBreaker) return false;

    const key = this.getCircuitBreakerKey(error);
    const state = this.circuitBreakers.get(key);
    
    if (!state) return false;

    const now = Date.now();
    
    switch (state.state) {
      case 'open':
        if (now >= state.nextAttemptTime) {
          state.state = 'half-open';
          return false;
        }
        return true;
      
      case 'half-open':
        return false;
      
      case 'closed':
      default:
        return false;
    }
  }

  /**
   * Record successful operation for circuit breaker
   */
  private recordSuccess(error: AppError): void {
    if (!this.config.enableCircuitBreaker) return;

    const key = this.getCircuitBreakerKey(error);
    const state = this.circuitBreakers.get(key);
    
    if (state) {
      state.failures = 0;
      state.state = 'closed';
    }
  }

  /**
   * Record failed operation for circuit breaker
   */
  private recordFailure(error: AppError): void {
    if (!this.config.enableCircuitBreaker) return;

    const key = this.getCircuitBreakerKey(error);
    let state = this.circuitBreakers.get(key);
    
    if (!state) {
      state = {
        failures: 0,
        lastFailureTime: 0,
        state: 'closed',
        nextAttemptTime: 0
      };
      this.circuitBreakers.set(key, state);
    }

    state.failures++;
    state.lastFailureTime = Date.now();

    // Open circuit breaker after 5 failures
    if (state.failures >= 5) {
      state.state = 'open';
      state.nextAttemptTime = Date.now() + 60000; // 1 minute
    }
  }

  /**
   * Get circuit breaker key for error
   */
  private getCircuitBreakerKey(error: AppError): string {
    return `${error.category}:${error.code}`;
  }

  /**
   * Log error to audit system
   */
  private async logError(error: AppError): Promise<void> {
    try {
      await auditLogger.logSecurityViolation({
        userId: error.context.userId,
        ip: error.context.ip || 'unknown',
        userAgent: error.context.userAgent || 'unknown',
        violationType: 'application_error',
        severity: this.mapSeverityToAuditSeverity(error.severity),
        details: {
          code: error.code,
          category: error.category,
          message: error.technicalMessage,
          operationType: error.context.operationType,
          endpoint: error.context.endpoint,
          requestId: error.context.requestId,
          stack: error.stack,
          originalError: error.originalError?.message
        }
      });
    } catch (loggingError) {
      console.error('Failed to log error to audit system:', loggingError);
    }

    // Also log to console based on severity
    const logMethod = this.getLogMethod(error.severity);
    logMethod(`[${error.code}] ${error.technicalMessage}`, {
      category: error.category,
      severity: error.severity,
      context: error.context,
      stack: error.stack
    });
  }

  /**
   * Map error severity to audit severity
   */
  private mapSeverityToAuditSeverity(severity: ErrorSeverity): 'medium' | 'high' | 'critical' {
    switch (severity) {
      case ErrorSeverity.LOW:
      case ErrorSeverity.MEDIUM:
        return 'medium';
      case ErrorSeverity.HIGH:
        return 'high';
      case ErrorSeverity.CRITICAL:
        return 'critical';
      default:
        return 'medium';
    }
  }

  /**
   * Get appropriate console log method based on severity
   */
  private getLogMethod(severity: ErrorSeverity): (...args: any[]) => void {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return console.error;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.LOW:
      default:
        return console.info;
    }
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    circuitBreakerStates: Record<string, CircuitBreakerState>;
  } {
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};

    for (const [key, count] of this.errorCounts.entries()) {
      const [category, severity] = key.split(':');
      errorsByCategory[category] = (errorsByCategory[category] || 0) + count;
      errorsBySeverity[severity] = (errorsBySeverity[severity] || 0) + count;
    }

    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);

    const circuitBreakerStates: Record<string, CircuitBreakerState> = {};
    for (const [key, state] of this.circuitBreakers.entries()) {
      circuitBreakerStates[key] = { ...state };
    }

    return {
      totalErrors,
      errorsByCategory,
      errorsBySeverity,
      circuitBreakerStates
    };
  }

  /**
   * Reset circuit breaker for a specific key
   */
  resetCircuitBreaker(key: string): void {
    this.circuitBreakers.delete(key);
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();