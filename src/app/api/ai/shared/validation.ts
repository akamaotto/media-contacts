/**
 * AI API Validation Middleware
 * Validates request bodies, query parameters, and path parameters
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AIAPIError, AIValidator } from './errors';

// Validation schemas for different endpoint types
export const AISearchSchema = z.object({
  query: z.string().min(1, 'Search query is required').max(1000, 'Query too long'),
  filters: z.object({
    beats: z.array(z.string()).optional(),
    regions: z.array(z.string()).optional(),
    countries: z.array(z.string()).optional(),
    languages: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    outletTypes: z.array(z.string()).optional(),
    dateRange: z.object({
      from: z.string().datetime().optional(),
      to: z.string().datetime().optional()
    }).optional()
  }).optional(),
  maxResults: z.number().int().min(1).max(1000).optional().default(50),
  priority: z.enum(['low', 'normal', 'high']).optional().default('normal')
});

export const AIProgressSchema = z.object({
  searchId: z.string().uuid('Invalid search ID format')
});

export const AIImportSchema = z.object({
  searchId: z.string().uuid('Invalid search ID format'),
  contactIds: z.array(z.string().uuid()).min(1, 'At least one contact ID required').max(100, 'Too many contacts'),
  targetLists: z.array(z.string().uuid()).optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).max(20, 'Too many tags').optional()
});

export const AIHealthSchema = z.object({});

// Query parameter schemas
export const AISearchQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1, 'Page must be >= 1').optional().default('1'),
  pageSize: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 100, 'Page size must be between 1 and 100').optional().default('10'),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export const AIContactQuerySchema = z.object({
  searchId: z.string().uuid().optional(),
  imported: z.string().transform(val => val === 'true').optional(),
  page: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1).optional().default('1'),
  pageSize: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 100).optional().default('10')
});

export class AIValidationMiddleware {
  /**
   * Validate request based on endpoint type
   */
  static async validate(
    request: NextRequest,
    endpointType: 'search' | 'progress' | 'import' | 'health'
  ): Promise<NextRequest> {
    const validator = new AIValidator();

    try {
      // Validate body if present
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        await this.validateBody(request, endpointType, validator);
      }

      // Validate query parameters
      await this.validateQuery(request, endpointType, validator);

      // Validate path parameters
      await this.validateParams(request, endpointType, validator);

      // Validate headers
      await this.validateHeaders(request, validator);

      // If validation fails, throw ValidationError
      validator.throwIfInvalid();

      // Add validated data to request for downstream use
      (request as any).__validatedData = {
        body: (request as any).__validatedBody,
        query: (request as any).__validatedQuery,
        params: (request as any).__validatedParams
      };

      return request;

    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') {
        throw error; // Re-throw validation errors
      }
      throw AIAPIError.validation('Request validation failed', { originalError: error });
    }
  }

  /**
   * Validate request body
   */
  private static async validateBody(
    request: NextRequest,
    endpointType: string,
    validator: AIValidator
  ): Promise<void> {
    const contentType = request.headers.get('content-type');

    if (!contentType || !contentType.includes('application/json')) {
      validator.addError('body', 'Content-Type must be application/json', 'INVALID_CONTENT_TYPE');
      return;
    }

    try {
      const body = await request.json();
      let schema;
      let bodyData;

      switch (endpointType) {
        case 'search':
          schema = AISearchSchema;
          break;
        case 'import':
          schema = AIImportSchema;
          break;
        case 'health':
          schema = AIHealthSchema;
          break;
        default:
          validator.addError('body', `Unknown endpoint type: ${endpointType}`, 'UNKNOWN_ENDPOINT');
          return;
      }

      if (schema) {
        bodyData = await schema.parseAsync(body);
        (request as any).__validatedBody = bodyData;
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach(err => {
          const field = err.path.join('.');
          const message = err.message;
          const code = err.code;
          validator.addError(field, message, code);
        });
      } else {
        validator.addError('body', 'Invalid JSON in request body', 'INVALID_JSON');
      }
    }
  }

  /**
   * Validate query parameters
   */
  private static async validateQuery(
    request: NextRequest,
    endpointType: string,
    validator: AIValidator
  ): Promise<void> {
    const { searchParams } = new URL(request.url);
    const queryObject = Object.fromEntries(searchParams.entries());

    let schema;
    let queryData;

    switch (endpointType) {
      case 'search':
      case 'progress':
        schema = AISearchQuerySchema;
        break;
      case 'import':
        schema = AIContactQuerySchema;
        break;
      case 'health':
        // Health endpoints typically don't need query validation
        (request as any).__validatedQuery = {};
        return;
      default:
        validator.addError('query', `Unknown endpoint type: ${endpointType}`, 'UNKNOWN_ENDPOINT');
        return;
    }

    if (schema) {
      try {
        queryData = await schema.parseAsync(queryObject);
        (request as any).__validatedQuery = queryData;
      } catch (error) {
        if (error instanceof z.ZodError) {
          error.errors.forEach(err => {
            const field = `query.${err.path.join('.')}`;
            const message = err.message;
            const code = err.code;
            validator.addError(field, message, code);
          });
        } else {
          validator.addError('query', 'Invalid query parameters', 'INVALID_QUERY');
        }
      }
    }
  }

  /**
   * Validate path parameters
   */
  private static async validateParams(
    request: NextRequest,
    endpointType: string,
    validator: AIValidator
  ): Promise<void> {
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);

    // Extract params based on URL pattern
    let params: Record<string, string> = {};

    // /api/ai/search/[searchId]/...
    if (pathSegments.length >= 4 && pathSegments[3] !== 'route') {
      params.searchId = pathSegments[3];
    }

    // /api/ai/contacts/[contactId]/...
    if (endpointType === 'import' && pathSegments.length >= 4) {
      params.contactId = pathSegments[3];
    }

    // Validate searchId if present
    if (params.searchId) {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(params.searchId)) {
          validator.addError('searchId', 'Invalid search ID format', 'INVALID_UUID');
        }
      } catch (error) {
        validator.addError('searchId', 'Invalid search ID format', 'INVALID_UUID');
      }
    }

    // Validate contactId if present
    if (params.contactId) {
      try {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(params.contactId)) {
          validator.addError('contactId', 'Invalid contact ID format', 'INVALID_UUID');
        }
      } catch (error) {
        validator.addError('contactId', 'Invalid contact ID format', 'INVALID_UUID');
      }
    }

    (request as any).__validatedParams = params;
  }

  /**
   * Validate headers
   */
  private static async validateHeaders(
    request: NextRequest,
    validator: AIValidator
  ): Promise<void> {
    const correlationId = request.headers.get('x-correlation-id');

    if (correlationId) {
      // Validate correlation ID format (optional, but good practice)
      if (typeof correlationId !== 'string' || correlationId.length > 100) {
        validator.addError('headers.x-correlation-id', 'Invalid correlation ID format', 'INVALID_FORMAT');
      }
    }

    // Validate content-length for POST/PUT requests
    if (['POST', 'PUT'].includes(request.method)) {
      const contentLength = request.headers.get('content-length');
      if (contentLength) {
        const length = parseInt(contentLength, 10);
        const maxSize = 1024 * 1024; // 1MB max

        if (isNaN(length) || length < 0) {
          validator.addError('headers.content-length', 'Invalid content-length', 'INVALID_FORMAT');
        } else if (length > maxSize) {
          validator.addError('headers.content-length', 'Request too large', 'SIZE_EXCEEDED');
        }
      }
    }

    // Validate user-agent (optional)
    const userAgent = request.headers.get('user-agent');
    if (userAgent && userAgent.length > 500) {
      validator.addError('headers.user-agent', 'User-Agent too long', 'SIZE_EXCEEDED');
    }
  }

  /**
   * Custom validation for specific fields
   */
  static validateSearchQuery(query: string): void {
    const validator = new AIValidator();

    // Basic query validation
    validator.validateString(query, 'query', 1, 1000);

    // Check for potentially dangerous content
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, // Script tags
      /javascript:/gi, // JavaScript protocol
      /on\w+\s*=/gi, // Event handlers
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        validator.addError('query', 'Query contains potentially dangerous content', 'DANGEROUS_CONTENT');
        break;
      }
    }

    validator.throwIfInvalid();
  }

  /**
   * Validate file upload (for future use)
   */
  static validateFileUpload(file: File, maxSize: number = 10 * 1024 * 1024): void {
    const validator = new AIValidator();

    // File size validation
    if (file.size > maxSize) {
      validator.addError('file', `File size exceeds ${maxSize} bytes`, 'SIZE_EXCEEDED');
    }

    // File type validation
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      validator.addError('file', `File type ${file.type} not allowed`, 'INVALID_TYPE');
    }

    // File name validation
    if (file.name.length > 255) {
      validator.addError('file.name', 'File name too long', 'SIZE_EXCEEDED');
    }

    // Check for dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.jsp', '.asp'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (dangerousExtensions.includes(fileExtension)) {
      validator.addError('file.name', 'Dangerous file extension not allowed', 'DANGEROUS_EXTENSION');
    }

    validator.throwIfInvalid();
  }

  /**
   * Sanitize input values
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove JavaScript protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate batch operations
   */
  static validateBatchOperation(items: any[], maxItems: number = 100): void {
    const validator = new AIValidator();

    validator.validateArray(items, 'items', maxItems);

    if (items.length === 0) {
      validator.addError('items', 'Batch operation requires at least one item', 'REQUIRED');
    }

    // Validate each item (basic validation - can be extended)
    items.forEach((item, index) => {
      if (item === null || item === undefined) {
        validator.addError(`items[${index}]`, 'Item cannot be null or undefined', 'REQUIRED');
      }
    });

    validator.throwIfInvalid();
  }
}

/**
 * Middleware wrapper for validation
 */
export function withValidation(
  endpointType: 'search' | 'progress' | 'import' | 'health',
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const validatedRequest = await AIValidationMiddleware.validate(request, endpointType);
      return await handler(validatedRequest);
    } catch (error) {
      if (error instanceof Error && error.name === 'ValidationError') {
        const validationError = error as any;
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            type: 'VALIDATION',
            details: validationError.details?.validationErrors || [],
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }

      throw error;
    }
  };
}