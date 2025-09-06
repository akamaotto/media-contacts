/**
 * Error Types and Classifications
 * Defines all error types and their handling strategies
 */

export enum ErrorCategory {
  AI_SERVICE = 'ai_service',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  RATE_LIMIT = 'rate_limit',
  QUOTA_EXCEEDED = 'quota_exceeded',
  CONFIGURATION = 'configuration',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  USER_ACTION_REQUIRED = 'user_action_required',
  FAIL_FAST = 'fail_fast'
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  operationType?: string;
  endpoint?: string;
  requestId?: string;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoveryStrategy: RecoveryStrategy;
  userMessage: string;
  technicalMessage: string;
  context: ErrorContext;
  originalError?: Error;
  retryable: boolean;
  maxRetries?: number;
  retryDelay?: number;
  fallbackOptions?: string[];
  helpUrl?: string;
  contactSupport?: boolean;
}

/**
 * Base Application Error Class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly recoveryStrategy: RecoveryStrategy;
  public readonly userMessage: string;
  public readonly technicalMessage: string;
  public readonly context: ErrorContext;
  public readonly retryable: boolean;
  public readonly maxRetries?: number;
  public readonly retryDelay?: number;
  public readonly fallbackOptions?: string[];
  public readonly helpUrl?: string;
  public readonly contactSupport?: boolean;
  public readonly originalError?: Error;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = 'AppError';
    this.code = details.code;
    this.category = details.category;
    this.severity = details.severity;
    this.recoveryStrategy = details.recoveryStrategy;
    this.userMessage = details.userMessage;
    this.technicalMessage = details.technicalMessage;
    this.context = details.context;
    this.retryable = details.retryable;
    this.maxRetries = details.maxRetries;
    this.retryDelay = details.retryDelay;
    this.fallbackOptions = details.fallbackOptions;
    this.helpUrl = details.helpUrl;
    this.contactSupport = details.contactSupport;
    this.originalError = details.originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      category: this.category,
      severity: this.severity,
      recoveryStrategy: this.recoveryStrategy,
      userMessage: this.userMessage,
      technicalMessage: this.technicalMessage,
      context: this.context,
      retryable: this.retryable,
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
      fallbackOptions: this.fallbackOptions,
      helpUrl: this.helpUrl,
      contactSupport: this.contactSupport,
      stack: this.stack
    };
  }
}

/**
 * AI Service Specific Errors
 */
export class AIServiceError extends AppError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext,
    originalError?: Error,
    options: Partial<ErrorDetails> = {}
  ) {
    super({
      code,
      message,
      category: ErrorCategory.AI_SERVICE,
      severity: ErrorSeverity.HIGH,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: 'AI service is temporarily unavailable. Please try again.',
      technicalMessage: message,
      context,
      originalError,
      retryable: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...options
    });
  }
}

/**
 * Network Related Errors
 */
export class NetworkError extends AppError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext,
    originalError?: Error,
    options: Partial<ErrorDetails> = {}
  ) {
    super({
      code,
      message,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: 'Network connection issue. Please check your connection and try again.',
      technicalMessage: message,
      context,
      originalError,
      retryable: true,
      maxRetries: 3,
      retryDelay: 2000,
      ...options
    });
  }
}

/**
 * Authentication Errors
 */
export class AuthenticationError extends AppError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext,
    originalError?: Error,
    options: Partial<ErrorDetails> = {}
  ) {
    super({
      code,
      message,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      recoveryStrategy: RecoveryStrategy.USER_ACTION_REQUIRED,
      userMessage: 'Authentication required. Please log in to continue.',
      technicalMessage: message,
      context,
      originalError,
      retryable: false,
      helpUrl: '/login',
      ...options
    });
  }
}

/**
 * Authorization Errors
 */
export class AuthorizationError extends AppError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext,
    originalError?: Error,
    options: Partial<ErrorDetails> = {}
  ) {
    super({
      code,
      message,
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.USER_ACTION_REQUIRED,
      userMessage: 'You do not have permission to perform this action.',
      technicalMessage: message,
      context,
      originalError,
      retryable: false,
      contactSupport: true,
      ...options
    });
  }
}

/**
 * Validation Errors
 */
export class ValidationError extends AppError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext,
    validationErrors?: Record<string, string[]>,
    options: Partial<ErrorDetails> = {}
  ) {
    super({
      code,
      message,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      recoveryStrategy: RecoveryStrategy.USER_ACTION_REQUIRED,
      userMessage: 'Please check your input and try again.',
      technicalMessage: message,
      context: {
        ...context,
        metadata: {
          ...context.metadata,
          validationErrors
        }
      },
      retryable: false,
      ...options
    });
  }
}

/**
 * Rate Limit Errors
 */
export class RateLimitError extends AppError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext,
    retryAfter?: number,
    options: Partial<ErrorDetails> = {}
  ) {
    super({
      code,
      message,
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: `Too many requests. Please wait ${retryAfter ? Math.ceil(retryAfter / 1000) : 60} seconds and try again.`,
      technicalMessage: message,
      context: {
        ...context,
        metadata: {
          ...context.metadata,
          retryAfter
        }
      },
      retryable: true,
      maxRetries: 1,
      retryDelay: retryAfter || 60000,
      ...options
    });
  }
}

/**
 * Quota Exceeded Errors
 */
export class QuotaExceededError extends AppError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext,
    quotaType?: string,
    resetTime?: Date,
    options: Partial<ErrorDetails> = {}
  ) {
    super({
      code,
      message,
      category: ErrorCategory.QUOTA_EXCEEDED,
      severity: ErrorSeverity.HIGH,
      recoveryStrategy: RecoveryStrategy.USER_ACTION_REQUIRED,
      userMessage: `${quotaType || 'Usage'} quota exceeded. ${resetTime ? `Resets at ${resetTime.toLocaleString()}` : 'Please contact support to increase your quota.'}`,
      technicalMessage: message,
      context: {
        ...context,
        metadata: {
          ...context.metadata,
          quotaType,
          resetTime: resetTime?.toISOString()
        }
      },
      retryable: false,
      contactSupport: true,
      ...options
    });
  }
}

/**
 * Configuration Errors
 */
export class ConfigurationError extends AppError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext,
    configKey?: string,
    options: Partial<ErrorDetails> = {}
  ) {
    super({
      code,
      message,
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      recoveryStrategy: RecoveryStrategy.FAIL_FAST,
      userMessage: 'Service is temporarily unavailable due to configuration issues. Please contact support.',
      technicalMessage: message,
      context: {
        ...context,
        metadata: {
          ...context.metadata,
          configKey
        }
      },
      retryable: false,
      contactSupport: true,
      ...options
    });
  }
}

/**
 * Database Errors
 */
export class DatabaseError extends AppError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext,
    originalError?: Error,
    options: Partial<ErrorDetails> = {}
  ) {
    super({
      code,
      message,
      category: ErrorCategory.DATABASE,
      severity: ErrorSeverity.HIGH,
      recoveryStrategy: RecoveryStrategy.RETRY,
      userMessage: 'Database temporarily unavailable. Please try again in a moment.',
      technicalMessage: message,
      context,
      originalError,
      retryable: true,
      maxRetries: 2,
      retryDelay: 5000,
      ...options
    });
  }
}

/**
 * External API Errors
 */
export class ExternalAPIError extends AppError {
  constructor(
    code: string,
    message: string,
    context: ErrorContext,
    apiName?: string,
    statusCode?: number,
    originalError?: Error,
    options: Partial<ErrorDetails> = {}
  ) {
    super({
      code,
      message,
      category: ErrorCategory.EXTERNAL_API,
      severity: ErrorSeverity.MEDIUM,
      recoveryStrategy: RecoveryStrategy.FALLBACK,
      userMessage: `External service (${apiName || 'API'}) is temporarily unavailable. Using fallback options.`,
      technicalMessage: message,
      context: {
        ...context,
        metadata: {
          ...context.metadata,
          apiName,
          statusCode
        }
      },
      originalError,
      retryable: statusCode ? statusCode >= 500 : true,
      maxRetries: 2,
      retryDelay: 3000,
      fallbackOptions: ['cached_data', 'simplified_response'],
      ...options
    });
  }
}

/**
 * Error Code Constants
 */
export const ERROR_CODES = {
  // AI Service Errors
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
  AI_MODEL_OVERLOADED: 'AI_MODEL_OVERLOADED',
  AI_RESPONSE_INVALID: 'AI_RESPONSE_INVALID',
  AI_TIMEOUT: 'AI_TIMEOUT',
  AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',

  // Network Errors
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',
  NETWORK_DNS_FAILED: 'NETWORK_DNS_FAILED',

  // Authentication Errors
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_REQUIRED: 'AUTH_REQUIRED',

  // Authorization Errors
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',

  // Validation Errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Rate Limit Errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // Quota Errors
  DAILY_QUOTA_EXCEEDED: 'DAILY_QUOTA_EXCEEDED',
  MONTHLY_QUOTA_EXCEEDED: 'MONTHLY_QUOTA_EXCEEDED',
  BUDGET_EXCEEDED: 'BUDGET_EXCEEDED',

  // Configuration Errors
  MISSING_CONFIG: 'MISSING_CONFIG',
  INVALID_CONFIG: 'INVALID_CONFIG',
  SERVICE_MISCONFIGURED: 'SERVICE_MISCONFIGURED',

  // Database Errors
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  DATABASE_TIMEOUT: 'DATABASE_TIMEOUT',

  // External API Errors
  EXTERNAL_API_UNAVAILABLE: 'EXTERNAL_API_UNAVAILABLE',
  EXTERNAL_API_TIMEOUT: 'EXTERNAL_API_TIMEOUT',
  EXTERNAL_API_RATE_LIMITED: 'EXTERNAL_API_RATE_LIMITED',

  // Unknown Errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
} as const;