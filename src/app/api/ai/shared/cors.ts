/**
 * AI API CORS Middleware
 * Handles Cross-Origin Resource Sharing for AI endpoints
 */

import { NextRequest, NextResponse } from 'next/server';

export interface CORSConfig {
  origins: string[];
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  credentials: boolean;
  maxAge?: number;
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

export class AICorsMiddleware {
  private static config: CORSConfig = {
    origins: this.getDefaultOrigins(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Correlation-ID',
      'X-Trace-ID',
      'Accept',
      'Origin',
      'User-Agent'
    ],
    exposedHeaders: [
      'X-Correlation-ID',
      'X-Trace-ID',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After'
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 204
  };

  /**
   * Get default origins from environment
   */
  private static getDefaultOrigins(): string[] {
    const envOrigins = process.env.AI_CORS_ORIGINS;
    if (envOrigins) {
      return envOrigins.split(',').map(origin => origin.trim());
    }

    // Development defaults
    if (process.env.NODE_ENV === 'development') {
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001'
      ];
    }

    // Production defaults - should be configured properly
    const deployedUrl = process.env.NEXT_PUBLIC_APP_URL;
    return deployedUrl ? [deployedUrl] : [];
  }

  /**
   * Update CORS configuration
   */
  static updateConfig(newConfig: Partial<CORSConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current CORS configuration
   */
  static getConfig(): CORSConfig {
    return { ...this.config };
  }

  /**
   * Check if origin is allowed
   */
  private static isOriginAllowed(origin: string): boolean {
    // Allow no origin (same-origin requests)
    if (!origin) return true;

    // Check against allowed origins
    return this.config.origins.includes(origin) ||
           this.config.origins.includes('*') ||
           this.config.origins.some(allowedOrigin => {
             // Support wildcard subdomains
             if (allowedOrigin.includes('*')) {
               const regex = new RegExp(allowedOrigin.replace('*', '.*'));
               return regex.test(origin);
             }
             return false;
           });
  }

  /**
   * Check if method is allowed
   */
  private static isMethodAllowed(method: string): boolean {
    return this.config.methods.includes(method.toUpperCase());
  }

  /**
   * Check if headers are allowed
   */
  private static areHeadersAllowed(headers: string[]): boolean {
    const requestedHeaders = headers.map(h => h.toLowerCase());
    const allowedHeaders = this.config.allowedHeaders.map(h => h.toLowerCase());

    // If wildcard is allowed, all headers are permitted
    if (allowedHeaders.includes('*')) {
      return true;
    }

    // Check if all requested headers are allowed
    return requestedHeaders.every(header =>
      allowedHeaders.includes(header) || header.startsWith('x-')
    );
  }

  /**
   * Create preflight response
   */
  private static createPreflightResponse(request: NextRequest): NextResponse {
    const origin = request.headers.get('origin');
    const requestMethod = request.headers.get('access-control-request-method');
    const requestHeaders = request.headers.get('access-control-request-headers');

    // Check if preflight is valid
    if (origin && !this.isOriginAllowed(origin)) {
      return new NextResponse(null, { status: 403 });
    }

    if (requestMethod && !this.isMethodAllowed(requestMethod)) {
      return new NextResponse(null, { status: 405 });
    }

    if (requestHeaders) {
      const headers = requestHeaders.split(',').map(h => h.trim());
      if (!this.areHeadersAllowed(headers)) {
        return new NextResponse(null, { status: 400 });
      }
    }

    // Create successful preflight response
    const response = new NextResponse(null, {
      status: this.config.optionsSuccessStatus || 204
    });

    // Set CORS headers
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }

    response.headers.set('Access-Control-Allow-Methods',
      this.config.methods.join(', ')
    );

    response.headers.set('Access-Control-Allow-Headers',
      this.config.allowedHeaders.join(', ')
    );

    if (this.config.exposedHeaders && this.config.exposedHeaders.length > 0) {
      response.headers.set('Access-Control-Expose-Headers',
        this.config.exposedHeaders.join(', ')
      );
    }

    if (this.config.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    if (this.config.maxAge) {
      response.headers.set('Access-Control-Max-Age', this.config.maxAge.toString());
    }

    response.headers.set('Vary', 'Origin');

    return response;
  }

  /**
   * Add CORS headers to response
   */
  private static addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
    const origin = request.headers.get('origin');

    // Only add CORS headers if origin is allowed
    if (origin && this.isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);

      if (this.config.credentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }

      if (this.config.exposedHeaders && this.config.exposedHeaders.length > 0) {
        response.headers.set('Access-Control-Expose-Headers',
          this.config.exposedHeaders.join(', ')
        );
      }
    }

    response.headers.set('Vary', 'Origin');

    return response;
  }

  /**
   * Main CORS handler
   */
  static async handle(request: NextRequest): Promise<NextRequest | Response> {
    const method = request.method.toUpperCase();
    const origin = request.headers.get('origin');

    // Skip CORS for same-origin requests
    if (!origin) {
      return request;
    }

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return this.createPreflightResponse(request);
    }

    // For actual requests, we'll add headers in the response
    // The request is returned unchanged, but we mark it for CORS processing
    (request as any).__needsCorsHeaders = true;

    return request;
  }

  /**
   * Add CORS headers to a response
   */
  static addToResponse(response: NextResponse, request: NextRequest): NextResponse {
    if ((request as any).__needsCorsHeaders) {
      return this.addCorsHeaders(response, request);
    }
    return response;
  }

  /**
   * Middleware wrapper for Next.js routes
   */
  static withCors(handler: (request: NextRequest) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const corsResult = await this.handle(request);

      // If CORS returned a Response (preflight), return it
      if (corsResult instanceof Response) {
        return corsResult as NextResponse;
      }

      // Process the request
      const response = await handler(corsResult as NextRequest);

      // Add CORS headers to the response
      return this.addToResponse(response, request);
    };
  }

  /**
   * Validate CORS configuration
   */
  static validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.origins.length) {
      errors.push('No origins configured');
    }

    if (!this.config.methods.length) {
      errors.push('No methods configured');
    }

    if (!this.config.allowedHeaders.length) {
      errors.push('No allowed headers configured');
    }

    // Validate origins format
    for (const origin of this.config.origins) {
      if (origin !== '*' && !origin.startsWith('http://') && !origin.startsWith('https://')) {
        errors.push(`Invalid origin format: ${origin}`);
      }
    }

    // Validate methods
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'];
    for (const method of this.config.methods) {
      if (!validMethods.includes(method.toUpperCase())) {
        errors.push(`Invalid method: ${method}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get CORS statistics
   */
  static getStats(): {
    totalOrigins: number;
    totalMethods: number;
    totalAllowedHeaders: number;
    credentialsEnabled: boolean;
  } {
    return {
      totalOrigins: this.config.origins.length,
      totalMethods: this.config.methods.length,
      totalAllowedHeaders: this.config.allowedHeaders.length,
      credentialsEnabled: this.config.credentials
    };
  }
}

/**
 * Initialize CORS with environment-based configuration
 */
export function initializeCors(): void {
  const customConfig: Partial<CORSConfig> = {};

  // Override with environment variables
  if (process.env.AI_CORS_ORIGINS) {
    customConfig.origins = process.env.AI_CORS_ORIGINS.split(',').map(o => o.trim());
  }

  if (process.env.AI_CORS_METHODS) {
    customConfig.methods = process.env.AI_CORS_METHODS.split(',').map(m => m.trim());
  }

  if (process.env.AI_CORS_HEADERS) {
    customConfig.allowedHeaders = process.env.AI_CORS_HEADERS.split(',').map(h => h.trim());
  }

  if (process.env.AI_CORS_CREDENTIALS) {
    customConfig.credentials = process.env.AI_CORS_CREDENTIALS === 'true';
  }

  if (process.env.AI_CORS_MAX_AGE) {
    customConfig.maxAge = parseInt(process.env.AI_CORS_MAX_AGE, 10);
  }

  AICorsMiddleware.updateConfig(customConfig);

  // Validate configuration
  const validation = AICorsMiddleware.validateConfig();
  if (!validation.valid) {
    console.error('CORS configuration validation failed:', validation.errors);
  }
}

// Initialize CORS on module load
initializeCors();