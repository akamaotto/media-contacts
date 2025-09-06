/**
 * Error types and handling for the API layer
 */

export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  INTERNAL = 'INTERNAL'
}

export class APIError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }

  static validation(message: string, details?: any): APIError {
    return new APIError(message, ErrorType.VALIDATION, 400, details);
  }

  static notFound(message: string): APIError {
    return new APIError(message, ErrorType.NOT_FOUND, 404);
  }

  static unauthorized(message: string = 'Authentication required'): APIError {
    return new APIError(message, ErrorType.UNAUTHORIZED, 401);
  }

  static forbidden(message: string = 'Access denied'): APIError {
    return new APIError(message, ErrorType.FORBIDDEN, 403);
  }

  static conflict(message: string): APIError {
    return new APIError(message, ErrorType.CONFLICT, 409);
  }

  static database(message: string, details?: any): APIError {
    return new APIError(message, ErrorType.DATABASE, 500, details);
  }

  static internal(message: string = 'Internal server error'): APIError {
    return new APIError(message, ErrorType.INTERNAL, 500);
  }
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export class ValidationAPIError extends APIError {
  constructor(
    message: string,
    public validationErrors: ValidationError[]
  ) {
    super(message, ErrorType.VALIDATION, 400, { validationErrors });
  }
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  success: false;
  error: string;
  type: ErrorType;
  details?: any;
  timestamp: string;
  traceId?: string;
}