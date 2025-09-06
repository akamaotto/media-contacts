/**
 * API Error Interceptor
 * Analyzes errors and determines recovery strategies before client response
 */

import { NextRequest, NextResponse } from 'next/server';
import { RequestTracker } from '@/lib/monitoring/request-tracker';
import { Prisma } from '@prisma/client';

export type ErrorCategory = 
  | 'database_connection'
  | 'database_query'
  | 'database_timeout'
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'rate_limit'
  | 'application'
  | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export type RecoveryStrategy = 
  | 'retry_immediately'
  | 'retry_with_backoff'
  | 'fallback_to_cache'
  | 'partial_response'
  | 'user_action_required'
  | 'system_maintenance'
  | 'no_recovery';

export interface ErrorAnalysis {
  category: ErrorCategory;
  severity: ErrorSeverity;
  isTransient: boolean;
  isRetryable: boolean;
  recoveryStrategy: RecoveryStrategy;
  userMessage: string;
  technicalMessage: string;
  suggestedActions: string[];
  retryAfterMs?: number;
  maxRetries?: number;
}

export interface InterceptedError {
  originalError: Error;
  analysis: ErrorAnalysis;
  context: {
    traceId: string;
    endpoint: string;
    method: string;
    timestamp: Date;
    userId?: string;
    requestData?: any;
  };
  metadata: {
    errorId: string;
    stackTrace?: string;
    additionalData?: Record<string, any>;
  };
}

/**
 * APIErrorInterceptor class for analyzing and handling API errors
 */
export class APIErrorInterceptor {
  private static instance: APIErrorInterceptor;
  private errorHistory: Map<string, InterceptedError[]> = new Map();
  private readonly maxHistoryPerEndpoint = 100;

  private constructor() {}

  static getInstance(): APIErrorInterceptor {
    if (!APIErrorInterceptor.instance) {
      APIErrorInterceptor.instance = new APIErrorInterceptor();
    }
    return APIErrorInterceptor.instance;
  }

  /**
   * Intercept and analyze an error
   */
  interceptError(
    error: Error,
    request: NextRequest,
    tracker: RequestTracker,
    additionalContext?: Record<string, any>
  ): InterceptedError {
    const errorId = this.generateErrorId();
    const analysis = this.analyzeError(error);
    const context = tracker.getContext();

    const interceptedError: InterceptedError = {
      originalError: error,
      analysis,
      context: {
        traceId: tracker.getTraceId(),
        endpoint: context.endpoint,
        method: context.method,
        timestamp: new Date(),
        userId: context.userId,
        requestData: additionalContext
      },
      metadata: {
        errorId,
        stackTrace: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        additionalData: additionalContext
      }
    };

    // Store error in history
    this.storeErrorInHistory(interceptedError);

    // Log the intercepted error
    this.logInterceptedError(interceptedError);

    // Track the error with the request tracker
    tracker.logError(error, 'error_intercepted', {
      errorId,
      category: analysis.category,
      severity: analysis.severity,
      recoveryStrategy: analysis.recoveryStrategy
    });

    return interceptedError;
  }

  /**
   * Analyze an error and determine recovery strategy
   */
  private analyzeError(error: Error): ErrorAnalysis {
    // Database-related errors
    if (this.isDatabaseError(error)) {
      return this.analyzeDatabaseError(error);
    }

    // Network-related errors
    if (this.isNetworkError(error)) {
      return this.analyzeNetworkError(error);
    }

    // Authentication/Authorization errors
    if (this.isAuthError(error)) {
      return this.analyzeAuthError(error);
    }

    // Validation errors
    if (this.isValidationError(error)) {
      return this.analyzeValidationError(error);
    }

    // Rate limiting errors
    if (this.isRateLimitError(error)) {
      return this.analyzeRateLimitError(error);
    }

    // Default to application error
    return this.analyzeApplicationError(error);
  }

  /**
   * Check if error is database-related
   */
  private isDatabaseError(error: Error): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError ||
           error instanceof Prisma.PrismaClientUnknownRequestError ||
           error instanceof Prisma.PrismaClientRustPanicError ||
           error instanceof Prisma.PrismaClientInitializationError ||
           error instanceof Prisma.PrismaClientValidationError ||
           error.message.includes('database') ||
           error.message.includes('connection') ||
           error.message.includes('timeout') ||
           error.message.includes('ECONNREFUSED') ||
           error.message.includes('ETIMEDOUT');
  }

  /**
   * Analyze database errors
   */
  private analyzeDatabaseError(error: Error): ErrorAnalysis {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        category: 'database_connection',
        severity: 'critical',
        isTransient: true,
        isRetryable: true,
        recoveryStrategy: 'retry_with_backoff',
        userMessage: 'We\'re experiencing database connectivity issues. Please try again in a moment.',
        technicalMessage: 'Database initialization failed',
        suggestedActions: [
          'Wait a few seconds and try again',
          'Check your internet connection',
          'Contact support if the issue persists'
        ],
        retryAfterMs: 2000,
        maxRetries: 3
      };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle specific Prisma error codes
      switch (error.code) {
        case 'P2002': // Unique constraint violation
          return {
            category: 'validation',
            severity: 'medium',
            isTransient: false,
            isRetryable: false,
            recoveryStrategy: 'user_action_required',
            userMessage: 'This record already exists. Please check your data and try again.',
            technicalMessage: 'Unique constraint violation',
            suggestedActions: [
              'Verify the data you\'re trying to save',
              'Check for duplicate entries',
              'Modify your input and try again'
            ]
          };
        
        case 'P2025': // Record not found
          return {
            category: 'validation',
            severity: 'medium',
            isTransient: false,
            isRetryable: false,
            recoveryStrategy: 'user_action_required',
            userMessage: 'The requested record was not found.',
            technicalMessage: 'Record not found',
            suggestedActions: [
              'Verify the record exists',
              'Check your search criteria',
              'Refresh the page and try again'
            ]
          };

        default:
          return {
            category: 'database_query',
            severity: 'high',
            isTransient: false,
            isRetryable: false,
            recoveryStrategy: 'user_action_required',
            userMessage: 'There was an issue processing your request. Please try again.',
            technicalMessage: `Database query error: ${error.code}`,
            suggestedActions: [
              'Try again in a moment',
              'Contact support if the issue persists'
            ]
          };
      }
    }

    // Connection/timeout errors
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return {
        category: 'database_timeout',
        severity: 'high',
        isTransient: true,
        isRetryable: true,
        recoveryStrategy: 'retry_with_backoff',
        userMessage: 'The request timed out. Please try again.',
        technicalMessage: 'Database query timeout',
        suggestedActions: [
          'Wait a moment and try again',
          'Check your internet connection',
          'Contact support if timeouts persist'
        ],
        retryAfterMs: 3000,
        maxRetries: 2
      };
    }

    // Connection refused errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('connection')) {
      return {
        category: 'database_connection',
        severity: 'critical',
        isTransient: true,
        isRetryable: true,
        recoveryStrategy: 'retry_with_backoff',
        userMessage: 'We\'re having trouble connecting to our database. Please try again shortly.',
        technicalMessage: 'Database connection refused',
        suggestedActions: [
          'Wait a few seconds and try again',
          'Check system status',
          'Contact support if the issue persists'
        ],
        retryAfterMs: 5000,
        maxRetries: 3
      };
    }

    // Generic database error
    return {
      category: 'database_query',
      severity: 'high',
      isTransient: false,
      isRetryable: false,
      recoveryStrategy: 'user_action_required',
      userMessage: 'There was a database error. Please try again.',
      technicalMessage: 'Database operation failed',
      suggestedActions: [
        'Try again in a moment',
        'Contact support if the issue persists'
      ]
    };
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: Error): boolean {
    return error.message.includes('fetch') ||
           error.message.includes('network') ||
           error.message.includes('ENOTFOUND') ||
           error.message.includes('ECONNRESET');
  }

  /**
   * Analyze network errors
   */
  private analyzeNetworkError(error: Error): ErrorAnalysis {
    return {
      category: 'network',
      severity: 'medium',
      isTransient: true,
      isRetryable: true,
      recoveryStrategy: 'retry_with_backoff',
      userMessage: 'Network connection issue. Please check your connection and try again.',
      technicalMessage: 'Network request failed',
      suggestedActions: [
        'Check your internet connection',
        'Try again in a moment',
        'Contact support if the issue persists'
      ],
      retryAfterMs: 1000,
      maxRetries: 3
    };
  }

  /**
   * Check if error is authentication/authorization related
   */
  private isAuthError(error: Error): boolean {
    return error.message.includes('Unauthorized') ||
           error.message.includes('Forbidden') ||
           error.message.includes('authentication') ||
           error.message.includes('authorization');
  }

  /**
   * Analyze authentication/authorization errors
   */
  private analyzeAuthError(error: Error): ErrorAnalysis {
    if (error.message.includes('Unauthorized')) {
      return {
        category: 'authentication',
        severity: 'high',
        isTransient: false,
        isRetryable: false,
        recoveryStrategy: 'user_action_required',
        userMessage: 'Please log in to access this resource.',
        technicalMessage: 'Authentication required',
        suggestedActions: [
          'Log in to your account',
          'Check your session hasn\'t expired',
          'Contact support if you continue having issues'
        ]
      };
    }

    return {
      category: 'authorization',
      severity: 'high',
      isTransient: false,
      isRetryable: false,
      recoveryStrategy: 'user_action_required',
      userMessage: 'You don\'t have permission to access this resource.',
      technicalMessage: 'Insufficient permissions',
      suggestedActions: [
        'Contact your administrator for access',
        'Verify you have the correct permissions',
        'Log out and log back in'
      ]
    };
  }

  /**
   * Check if error is validation-related
   */
  private isValidationError(error: Error): boolean {
    return error.message.includes('validation') ||
           error.message.includes('invalid') ||
           error.message.includes('required') ||
           error instanceof Prisma.PrismaClientValidationError;
  }

  /**
   * Analyze validation errors
   */
  private analyzeValidationError(error: Error): ErrorAnalysis {
    return {
      category: 'validation',
      severity: 'medium',
      isTransient: false,
      isRetryable: false,
      recoveryStrategy: 'user_action_required',
      userMessage: 'Please check your input and try again.',
      technicalMessage: 'Input validation failed',
      suggestedActions: [
        'Review the data you entered',
        'Ensure all required fields are filled',
        'Check for any formatting requirements'
      ]
    };
  }

  /**
   * Check if error is rate limiting related
   */
  private isRateLimitError(error: Error): boolean {
    return error.message.includes('rate limit') ||
           error.message.includes('too many requests') ||
           error.message.includes('429');
  }

  /**
   * Analyze rate limiting errors
   */
  private analyzeRateLimitError(error: Error): ErrorAnalysis {
    return {
      category: 'rate_limit',
      severity: 'medium',
      isTransient: true,
      isRetryable: true,
      recoveryStrategy: 'retry_with_backoff',
      userMessage: 'You\'re making requests too quickly. Please wait a moment and try again.',
      technicalMessage: 'Rate limit exceeded',
      suggestedActions: [
        'Wait a few seconds before trying again',
        'Reduce the frequency of your requests',
        'Contact support if you need higher limits'
      ],
      retryAfterMs: 10000,
      maxRetries: 2
    };
  }

  /**
   * Analyze generic application errors
   */
  private analyzeApplicationError(error: Error): ErrorAnalysis {
    return {
      category: 'application',
      severity: 'medium',
      isTransient: false,
      isRetryable: false,
      recoveryStrategy: 'user_action_required',
      userMessage: 'An unexpected error occurred. Please try again.',
      technicalMessage: 'Application error',
      suggestedActions: [
        'Try again in a moment',
        'Refresh the page',
        'Contact support if the issue persists'
      ]
    };
  }

  /**
   * Generate a unique error ID
   */
  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `err-${timestamp}-${random}`;
  }

  /**
   * Store error in history for analysis
   */
  private storeErrorInHistory(interceptedError: InterceptedError): void {
    const endpoint = interceptedError.context.endpoint;
    
    if (!this.errorHistory.has(endpoint)) {
      this.errorHistory.set(endpoint, []);
    }

    const history = this.errorHistory.get(endpoint)!;
    history.push(interceptedError);

    // Limit history size to prevent memory leaks
    if (history.length > this.maxHistoryPerEndpoint) {
      history.shift();
    }
  }

  /**
   * Log intercepted error with context
   */
  private logInterceptedError(interceptedError: InterceptedError): void {
    const { analysis, context, metadata } = interceptedError;
    
    console.error(`🚨 [ERROR-INTERCEPTOR] [${context.traceId}] Error intercepted:`, {
      errorId: metadata.errorId,
      category: analysis.category,
      severity: analysis.severity,
      endpoint: context.endpoint,
      method: context.method,
      userId: context.userId,
      isRetryable: analysis.isRetryable,
      recoveryStrategy: analysis.recoveryStrategy,
      technicalMessage: analysis.technicalMessage,
      timestamp: context.timestamp.toISOString()
    });

    // Log stack trace in development
    if (process.env.NODE_ENV === 'development' && metadata.stackTrace) {
      console.error(`📚 [ERROR-INTERCEPTOR] [${context.traceId}] Stack trace:`, metadata.stackTrace);
    }
  }

  /**
   * Get error history for an endpoint
   */
  getErrorHistory(endpoint: string): InterceptedError[] {
    return this.errorHistory.get(endpoint) || [];
  }

  /**
   * Get error statistics for an endpoint
   */
  getErrorStats(endpoint: string): {
    totalErrors: number;
    errorsByCategory: Record<ErrorCategory, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    retryableErrors: number;
    recentErrors: number; // Last hour
  } {
    const history = this.getErrorHistory(endpoint);
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    const stats = {
      totalErrors: history.length,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      retryableErrors: 0,
      recentErrors: 0
    };

    history.forEach(error => {
      // Count by category
      stats.errorsByCategory[error.analysis.category] = 
        (stats.errorsByCategory[error.analysis.category] || 0) + 1;

      // Count by severity
      stats.errorsBySeverity[error.analysis.severity] = 
        (stats.errorsBySeverity[error.analysis.severity] || 0) + 1;

      // Count retryable errors
      if (error.analysis.isRetryable) {
        stats.retryableErrors++;
      }

      // Count recent errors
      if (error.context.timestamp.getTime() > oneHourAgo) {
        stats.recentErrors++;
      }
    });

    return stats;
  }

  /**
   * Clear error history for an endpoint
   */
  clearErrorHistory(endpoint?: string): void {
    if (endpoint) {
      this.errorHistory.delete(endpoint);
    } else {
      this.errorHistory.clear();
    }
  }
}

// Export singleton instance
export const apiErrorInterceptor = APIErrorInterceptor.getInstance();

/**
 * Utility function to intercept and analyze errors
 */
export function interceptError(
  error: Error,
  request: NextRequest,
  tracker: RequestTracker,
  additionalContext?: Record<string, any>
): InterceptedError {
  return apiErrorInterceptor.interceptError(error, request, tracker, additionalContext);
}

/**
 * Create a structured error response from an intercepted error
 */
export function createErrorResponse(interceptedError: InterceptedError): NextResponse {
  const { analysis, context, metadata } = interceptedError;
  
  // Determine HTTP status code based on error category
  let status = 500;
  switch (analysis.category) {
    case 'authentication':
      status = 401;
      break;
    case 'authorization':
      status = 403;
      break;
    case 'validation':
      status = 400;
      break;
    case 'rate_limit':
      status = 429;
      break;
    case 'database_connection':
    case 'database_timeout':
      status = 503;
      break;
    case 'network':
      status = 502;
      break;
    default:
      status = 500;
  }

  const response = {
    success: false,
    error: {
      id: metadata.errorId,
      message: analysis.userMessage,
      category: analysis.category,
      severity: analysis.severity,
      isRetryable: analysis.isRetryable,
      recoveryStrategy: analysis.recoveryStrategy,
      suggestedActions: analysis.suggestedActions,
      ...(analysis.retryAfterMs && { retryAfterMs: analysis.retryAfterMs }),
      ...(analysis.maxRetries && { maxRetries: analysis.maxRetries })
    },
    context: {
      traceId: context.traceId,
      timestamp: context.timestamp.toISOString(),
      endpoint: context.endpoint,
      method: context.method
    },
    // Include technical details in development
    ...(process.env.NODE_ENV === 'development' && {
      debug: {
        technicalMessage: analysis.technicalMessage,
        originalError: interceptedError.originalError.message,
        ...(metadata.stackTrace && { stackTrace: metadata.stackTrace })
      }
    })
  };

  const nextResponse = NextResponse.json(response, { status });
  
  // Add retry-after header for retryable errors
  if (analysis.isRetryable && analysis.retryAfterMs) {
    nextResponse.headers.set('Retry-After', Math.ceil(analysis.retryAfterMs / 1000).toString());
  }

  return nextResponse;
}