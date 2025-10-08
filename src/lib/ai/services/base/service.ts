/**
 * Base AI Service Implementation
 * Provides common functionality for all AI service implementations
 */

import { randomUUID } from 'crypto';
import {
  IAIService,
  AIServiceRequest,
  AIServiceResponse,
  AIServiceError,
  RetryConfig,
  CircuitBreakerConfig,
  CircuitBreakerState,
  CacheConfig,
  ServiceMetrics,
  ServiceHealth,
  RateLimitInfo,
  QuotaInfo
} from './types';

export abstract class BaseAIService implements IAIService {
  public readonly serviceName: string;
  public readonly version: string;

  protected circuitBreakerState: CircuitBreakerState;
  protected metrics: ServiceMetrics[] = [];
  protected readonly maxMetricsToKeep = 10000;

  protected constructor(
    serviceName: string,
    version: string,
    protected readonly retryConfig: RetryConfig,
    protected readonly circuitBreakerConfig: CircuitBreakerConfig,
    protected readonly cacheConfig: CacheConfig
  ) {
    this.serviceName = serviceName;
    this.version = version;
    this.circuitBreakerState = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      state: 'CLOSED'
    };
  }

  /**
   * Abstract method to be implemented by each service
   */
  abstract initialize(): Promise<void>;
  abstract healthCheck(): Promise<ServiceHealth>;
  abstract getRateLimitStatus(): Promise<RateLimitInfo | null>;
  abstract getQuotaStatus(): Promise<QuotaInfo | null>;

  /**
   * Execute an operation with retry logic, circuit breaker, and metrics
   */
  protected async executeOperation<T>(
    request: AIServiceRequest,
    operation: () => Promise<T>,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<AIServiceResponse<T>> {
    const startTime = Date.now();
    const correlationId = request.correlationId || randomUUID();
    let retryCount = 0;
    let lastError: Error | null = null;

    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      return this.createErrorResponse<T>(
        'CIRCUIT_BREAKER_OPEN',
        `Service ${this.serviceName} circuit breaker is open`,
        'INTERNAL',
        correlationId,
        request.operation,
        startTime
      );
    }

    const retryCfg = { ...this.retryConfig, ...customRetryConfig };

    while (retryCount < retryCfg.maxAttempts) {
      try {
        // Execute the operation
        const result = await operation();

        // Record success metrics
        this.recordMetrics({
          service: this.serviceName,
          operation: request.operation,
          duration: Date.now() - startTime,
          success: true,
          timestamp: Date.now(),
          correlationId,
          userId: request.userId,
          cached: false,
          retryCount
        });

        // Reset circuit breaker on success
        this.resetCircuitBreaker();

        return {
          success: true,
          data: result,
          metadata: {
            correlationId,
            operation: request.operation,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
            service: this.serviceName,
            retryCount
          }
        };

      } catch (error) {
        lastError = error as Error;
        const serviceError = this.normalizeError(lastError, correlationId, request.operation);

        // Check if error is retryable
        if (!this.isRetryableError(serviceError, retryCfg) || retryCount >= retryCfg.maxAttempts - 1) {
          // Record failure metrics
          this.recordMetrics({
            service: this.serviceName,
            operation: request.operation,
            duration: Date.now() - startTime,
            success: false,
            timestamp: Date.now(),
            correlationId,
            userId: request.userId,
            cached: false,
            retryCount,
            errorCode: serviceError.code
          });

          // Trigger circuit breaker if needed
          this.handleFailure();

          return {
            success: false,
            error: serviceError,
            metadata: {
              correlationId,
              operation: request.operation,
              duration: Date.now() - startTime,
              timestamp: Date.now(),
              service: this.serviceName,
              retryCount
            }
          };
        }

        // Wait before retry
        const delay = this.calculateRetryDelay(retryCount, retryCfg);
        await this.sleep(delay);
        retryCount++;
      }
    }

    // This should not be reached, but just in case
    return this.createErrorResponse<T>(
      'MAX_RETRIES_EXCEEDED',
      `Max retries exceeded for operation ${request.operation}`,
      'INTERNAL',
      correlationId,
      request.operation,
      startTime
    );
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown(): Promise<void> {
    // Clear metrics
    this.metrics = [];

    // Reset circuit breaker
    this.circuitBreakerState = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      state: 'CLOSED'
    };

    console.info(`Service ${this.serviceName} shut down successfully`);
  }

  /**
   * Get service metrics
   */
  public getMetrics(): ServiceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get recent metrics for monitoring
   */
  public getRecentMetrics(minutes: number = 15): ServiceMetrics[] {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Calculate service health based on recent metrics
   */
  protected calculateHealthFromMetrics(): ServiceHealth {
    const recentMetrics = this.getRecentMetrics(15);

    if (recentMetrics.length === 0) {
      return {
        service: this.serviceName,
        status: 'healthy',
        lastCheck: Date.now(),
        responseTime: 0,
        errorRate: 0,
        uptime: 100,
        requestCount: 0,
        errorCount: 0
      };
    }

    const successfulRequests = recentMetrics.filter(m => m.success);
    const failedRequests = recentMetrics.filter(m => !m.success);
    const avgResponseTime = successfulRequests.reduce((sum, m) => sum + m.duration, 0) / (successfulRequests.length || 1);
    const errorRate = (failedRequests.length / recentMetrics.length) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (errorRate > 50 || avgResponseTime > 30000) {
      status = 'unhealthy';
    } else if (errorRate > 10 || avgResponseTime > 10000) {
      status = 'degraded';
    }

    return {
      service: this.serviceName,
      status,
      lastCheck: Date.now(),
      responseTime: avgResponseTime,
      errorRate,
      uptime: 100 - errorRate,
      requestCount: recentMetrics.length,
      errorCount: failedRequests.length,
      lastError: failedRequests[failedRequests.length - 1]?.errorCode
    };
  }

  /**
   * Normalize different error types to AIServiceError
   */
  protected normalizeError(error: Error, correlationId: string, operation: string): AIServiceError {
    const message = error.message;

    // API key/authentication errors
    if (message.includes('401') || message.includes('unauthorized') || message.includes('authentication')) {
      return {
        code: 'AUTHENTICATION_ERROR',
        message,
        type: 'AUTHENTICATION',
        retryable: false
      };
    }

    // Rate limit errors
    if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
      const retryAfter = this.extractRetryAfter(message);
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        type: 'RATE_LIMIT',
        retryable: true,
        retryAfter
      };
    }

    // Quota exceeded
    if (message.includes('quota') || message.includes('credit') || message.includes('usage limit')) {
      return {
        code: 'QUOTA_EXCEEDED',
        message,
        type: 'QUOTA',
        retryable: false
      };
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return {
        code: 'NETWORK_ERROR',
        message,
        type: 'NETWORK',
        retryable: true
      };
    }

    // Validation errors
    if (message.includes('400') || message.includes('invalid') || message.includes('validation')) {
      return {
        code: 'VALIDATION_ERROR',
        message,
        type: 'VALIDATION',
        retryable: false
      };
    }

    // Default to API error
    return {
      code: 'API_ERROR',
      message,
      type: 'API',
      retryable: true
    };
  }

  /**
   * Extract retry-after duration from error message
   */
  private extractRetryAfter(message: string): number | undefined {
    const match = message.match(/retry after (\d+)/i) || message.match(/(\d+) seconds/);
    return match ? parseInt(match[1]) * 1000 : undefined;
  }

  /**
   * Check if error is retryable based on configuration
   */
  private isRetryableError(error: AIServiceError, retryConfig: RetryConfig): boolean {
    return error.retryable && retryConfig.retryableErrorTypes.includes(error.type);
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    let delay = Math.min(
      config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt),
      config.maxDelayMs
    );

    if (config.jitter) {
      // Add jitter: ±25% of the delay
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      delay += jitter;
    }

    return Math.max(0, delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(): boolean {
    const now = Date.now();

    if (this.circuitBreakerState.state === 'OPEN') {
      if (now >= this.circuitBreakerState.nextAttemptTime) {
        // Transition to half-open
        this.circuitBreakerState.state = 'HALF_OPEN';
        this.circuitBreakerState.isOpen = false;
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Handle failure by updating circuit breaker state
   */
  private handleFailure(): void {
    const now = Date.now();

    this.circuitBreakerState.failureCount++;
    this.circuitBreakerState.lastFailureTime = now;

    if (this.circuitBreakerState.failureCount >= this.circuitBreakerConfig.failureThreshold) {
      // Open the circuit breaker
      this.circuitBreakerState.isOpen = true;
      this.circuitBreakerState.state = 'OPEN';
      this.circuitBreakerState.nextAttemptTime = now + this.circuitBreakerConfig.recoveryTimeoutMs;

      console.warn(`Circuit breaker opened for service ${this.serviceName}`, {
        failureCount: this.circuitBreakerState.failureCount,
        threshold: this.circuitBreakerConfig.failureThreshold,
        nextAttempt: new Date(this.circuitBreakerState.nextAttemptTime).toISOString()
      });
    }
  }

  /**
   * Reset circuit breaker on successful operation
   */
  private resetCircuitBreaker(): void {
    if (this.circuitBreakerState.state !== 'CLOSED') {
      console.info(`Circuit breaker reset for service ${this.serviceName}`, {
        previousState: this.circuitBreakerState.state,
        failureCount: this.circuitBreakerState.failureCount
      });
    }

    this.circuitBreakerState = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      state: 'CLOSED'
    };
  }

  /**
   * Record service metrics
   */
  private recordMetrics(metrics: ServiceMetrics): void {
    this.metrics.push(metrics);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsToKeep) {
      this.metrics = this.metrics.slice(-this.maxMetricsToKeep);
    }
  }

  /**
   * Create error response
   */
  private createErrorResponse<T>(
    code: string,
    message: string,
    type: AIServiceError['type'],
    correlationId: string,
    operation: string,
    startTime: number
  ): AIServiceResponse<T> {
    return {
      success: false,
      error: {
        code,
        message,
        type,
        retryable: type === 'NETWORK' || type === 'RATE_LIMIT'
      },
      metadata: {
        correlationId,
        operation,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        service: this.serviceName,
        retryCount: 0
      }
    };
  }
}