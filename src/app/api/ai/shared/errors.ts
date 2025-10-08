/**
 * Enhanced error handling for AI API endpoints
 */

import { AIErrorResponse, AIErrorType } from './types';
import { randomUUID } from 'crypto';

export class AIAPIError extends Error {
  constructor(
    message: string,
    public type: AIErrorType,
    public statusCode: number,
    public details?: any,
    public retryable: boolean = false,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'AIAPIError';
  }

  static validation(message: string, details?: any): AIAPIError {
    return new AIAPIError(message, AIErrorType.VALIDATION, 400, details);
  }

  static authentication(message: string = 'Authentication required'): AIAPIError {
    return new AIAPIError(message, AIErrorType.AUTHENTICATION, 401);
  }

  static authorization(message: string = 'Access denied'): AIAPIError {
    return new AIAPIError(message, AIErrorType.AUTHORIZATION, 403);
  }

  static rateLimit(retryAfter: number): AIAPIError {
    return new AIAPIError(
      'Rate limit exceeded',
      AIErrorType.RATE_LIMIT,
      429,
      { retryAfter },
      true,
      retryAfter
    );
  }

  static externalService(message: string, retryable: boolean = true): AIAPIError {
    return new AIAPIError(message, AIErrorType.EXTERNAL_SERVICE, 502, undefined, retryable);
  }

  static database(message: string, retryable: boolean = false): AIAPIError {
    return new AIAPIError(message, AIErrorType.DATABASE, 500, undefined, retryable);
  }

  static timeout(message: string = 'Request timeout'): AIAPIError {
    return new AIAPIError(message, AIErrorType.TIMEOUT, 408, undefined, true);
  }

  static internal(message: string = 'Internal server error'): AIAPIError {
    return new AIAPIError(message, AIErrorType.INTERNAL, 500);
  }

  /**
   * Convert error to standardized error response
   */
  toErrorResponse(correlationId: string): AIErrorResponse {
    return {
      success: false,
      error: this.message,
      type: this.type,
      details: this.details,
      correlationId,
      timestamp: new Date().toISOString(),
      retryable: this.retryable,
      retryAfter: this.retryAfter
    };
  }
}

export class ValidationError extends AIAPIError {
  constructor(
    message: string,
    public validationErrors: Array<{
      field: string;
      message: string;
      code: string;
    }> = []
  ) {
    super(message, AIErrorType.VALIDATION, 400, { validationErrors });
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends AIAPIError {
  constructor(
    public limit: number,
    public remaining: number,
    public resetTime: number,
    retryAfter?: number
  ) {
    super(
      `Rate limit exceeded. ${remaining} of ${limit} requests remaining.`,
      AIErrorType.RATE_LIMIT,
      429,
      { limit, remaining, resetTime, retryAfter },
      true,
      retryAfter
    );
    this.name = 'RateLimitError';
  }
}

/**
 * Error handler utility for creating consistent error responses
 */
export class AIErrorHandler {
  /**
   * Handle any error and convert to appropriate response
   */
  static handleError(error: unknown, correlationId: string): AIAPIError {
    console.error(`AI API Error [${correlationId}]:`, error);

    if (error instanceof AIAPIError) {
      return error;
    }

    // Handle common Node.js errors
    if (error instanceof Error) {
      // Prisma errors
      if (error.name === 'PrismaClientKnownRequestError') {
        return AIAPIError.database('Database operation failed', false);
      }

      // Network errors
      if (error.name === 'NetworkError' || error.message.includes('ECONNREFUSED')) {
        return AIAPIError.externalService('External service unavailable', true);
      }

      // Timeout errors
      if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        return AIAPIError.timeout();
      }

      // Validation errors (Zod, etc.)
      if (error.message.includes('validation') || error.name === 'ZodError') {
        return AIAPIError.validation('Invalid request data', { originalError: error.message });
      }

      // Default to internal error
      return AIAPIError.internal('An unexpected error occurred');
    }

    return AIAPIError.internal('An unexpected error occurred');
  }

  /**
   * Create error response from any error
   */
  static createErrorResponse(error: unknown, correlationId: string): AIErrorResponse {
    const apiError = this.handleError(error, correlationId);
    return apiError.toErrorResponse(correlationId);
  }
}

/**
 * Validation helper with detailed field errors
 */
export class AIValidator {
  private errors: Array<{
    field: string;
    message: string;
    code: string;
  }> = [];

  addError(field: string, message: string, code: string = 'INVALID_VALUE'): void {
    this.errors.push({ field, message, code });
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): Array<{
    field: string;
    message: string;
    code: string;
  }> {
    return [...this.errors];
  }

  validateRequired(value: any, field: string): void {
    if (value === null || value === undefined || value === '') {
      this.addError(field, `${field} is required`, 'REQUIRED');
    }
  }

  validateString(value: any, field: string, minLength = 1, maxLength = 1000): void {
    if (value !== null && value !== undefined) {
      if (typeof value !== 'string') {
        this.addError(field, `${field} must be a string`, 'INVALID_TYPE');
      } else {
        if (value.length < minLength) {
          this.addError(field, `${field} must be at least ${minLength} characters`, 'MIN_LENGTH');
        }
        if (value.length > maxLength) {
          this.addError(field, `${field} must be no more than ${maxLength} characters`, 'MAX_LENGTH');
        }
      }
    }
  }

  validateArray(value: any, field: string, maxItems = 100): void {
    if (value !== null && value !== undefined) {
      if (!Array.isArray(value)) {
        this.addError(field, `${field} must be an array`, 'INVALID_TYPE');
      } else {
        if (value.length > maxItems) {
          this.addError(field, `${field} must contain no more than ${maxItems} items`, 'MAX_ITEMS');
        }
      }
    }
  }

  validateEnum(value: any, field: string, allowedValues: string[]): void {
    if (value !== null && value !== undefined) {
      if (!allowedValues.includes(value)) {
        this.addError(field, `${field} must be one of: ${allowedValues.join(', ')}`, 'INVALID_VALUE');
      }
    }
  }

  throwIfInvalid(): void {
    if (this.hasErrors()) {
      throw new ValidationError('Validation failed', this.getErrors());
    }
  }
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return `ai_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

/**
 * Create APIError from unknown error
 */
AIAPIError.fromUnknown = function(error: unknown): AIAPIError {
  if (error instanceof AIAPIError) {
    return error;
  }

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('validation') || error.name === 'ZodError') {
      return AIAPIError.validation(error.message);
    }

    if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
      return AIAPIError.authentication(error.message);
    }

    if (error.message.includes('Access denied') || error.message.includes('Forbidden')) {
      return AIAPIError.authorization(error.message);
    }

    if (error.message.includes('timeout')) {
      return AIAPIError.timeout(error.message);
    }

    if (error.message.includes('database') || error.name === 'PrismaClientKnownRequestError') {
      return AIAPIError.database(error.message);
    }

    return AIAPIError.internal(error.message);
  }

  return AIAPIError.internal('An unknown error occurred');
};