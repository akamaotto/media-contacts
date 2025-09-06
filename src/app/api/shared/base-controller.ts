/**
 * Base Controller Implementation
 * Provides common request/response handling patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { RequestContext, PaginationParams, APIResponse, CRUDFilters } from './types';
import { BaseService } from './base-service';

export abstract class BaseController<TEntity, TCreateData, TUpdateData, TFilters extends CRUDFilters> {
  
  constructor(
    protected service: BaseService<TEntity, TCreateData, TUpdateData, TFilters>
  ) {}

  /**
   * Extract request context from the request
   */
  protected async getRequestContext(request: NextRequest): Promise<RequestContext> {
    const session = await auth();
    
    // Return context without throwing error if no session
    // Let individual services decide if authentication is required
    return {
      userId: session?.user?.id || null,
      userRole: session?.user?.role || null,
      ip: this.getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      traceId: request.headers.get('x-trace-id') || this.generateTraceId()
    };
  }

  /**
   * Parse pagination parameters from request
   */
  protected getPaginationParams(request: NextRequest): PaginationParams {
    const { searchParams } = new URL(request.url);
    
    return {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: Math.min(parseInt(searchParams.get('pageSize') || '10'), 100)
    };
  }

  /**
   * Parse filters from request - to be implemented by subclasses
   */
  protected abstract parseFilters(request: NextRequest): TFilters;

  /**
   * Parse create data from request body
   */
  protected abstract parseCreateData(body: any): TCreateData;

  /**
   * Parse update data from request body
   */
  protected abstract parseUpdateData(body: any): TUpdateData;

  /**
   * Handle GET requests (list all entities)
   */
  async handleGetAll(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const filters = this.parseFilters(request);
      const pagination = this.getPaginationParams(request);

      const result = await this.service.getAll(filters, pagination, context);
      
      return this.successResponse(result);
    });
  }

  /**
   * Handle GET requests for single entity
   */
  async handleGetById(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const { id } = await params;
      const entity = await this.service.getById(id, context);

      if (!entity) {
        return this.notFoundResponse(`Entity with ID ${id} not found`);
      }

      return this.successResponse({ data: entity });
    });
  }

  /**
   * Handle POST requests (create entity)
   */
  async handleCreate(request: NextRequest): Promise<NextResponse> {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const body = await request.json();
      const data = this.parseCreateData(body);

      const entity = await this.service.create(data, context);

      return this.successResponse(
        { data: entity, message: 'Created successfully' }, 
        201
      );
    });
  }

  /**
   * Handle PUT requests (update entity)
   */
  async handleUpdate(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const body = await request.json();
      const data = this.parseUpdateData(body);
      const { id } = await params;

      const entity = await this.service.update(id, data, context);

      return this.successResponse(
        { data: entity, message: 'Updated successfully' }
      );
    });
  }

  /**
   * Handle DELETE requests
   */
  async handleDelete(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const { id } = await params;
      await this.service.delete(id, context);

      return this.successResponse({ message: 'Deleted successfully' });
    });
  }

  /**
   * Common request handler with error handling
   */
  protected async handleRequest<T>(
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      return await handler();
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Create success response
   */
  protected successResponse(data: any, status = 200): NextResponse {
    const response: APIResponse = {
      success: true,
      ...data
    };
    
    return NextResponse.json(response, { status });
  }

  /**
   * Create error response
   */
  protected errorResponse(message: string, status = 500): NextResponse {
    const response: APIResponse = {
      success: false,
      error: message
    };
    
    return NextResponse.json(response, { status });
  }

  /**
   * Create not found response
   */
  protected notFoundResponse(message: string): NextResponse {
    return this.errorResponse(message, 404);
  }

  /**
   * Handle errors and return appropriate response
   */
  protected handleError(error: unknown): NextResponse {
    console.error('Controller error:', error);

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('Authentication required')) {
        return this.errorResponse('Authentication required', 401);
      }
      
      if (error.message.includes('not found')) {
        return this.errorResponse(error.message, 404);
      }
      
      if (error.message.includes('already exists')) {
        return this.errorResponse(error.message, 409);
      }
      
      if (error.message.includes('validation') || error.message.includes('required')) {
        return this.errorResponse(error.message, 400);
      }
      
      return this.errorResponse(error.message, 500);
    }

    return this.errorResponse('An unexpected error occurred', 500);
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return 'unknown';
  }

  /**
   * Generate trace ID for request tracking
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}