/**
 * Publishers Controller - HTTP request handling
 * Following the established pattern from beats and categories
 */

import { NextRequest } from 'next/server';
import { BaseController } from '../shared/base-controller';
import { Publisher, CreatePublisherData, UpdatePublisherData, PublishersFilters, CreatePublisherDataSchema, UpdatePublisherDataSchema } from './types';
import { PublishersService } from './service';

export class PublishersController extends BaseController<Publisher, CreatePublisherData, UpdatePublisherData, PublishersFilters> {
  
  constructor(private publishersService: PublishersService) {
    super(publishersService);
  }

  protected parseFilters(request: NextRequest): PublishersFilters {
    const { searchParams } = new URL(request.url);
    
    const filters: PublishersFilters = {};

    // Search parameter
    const search = searchParams.get('search');
    if (search) {
      filters.search = search.trim();
    }

    // Sort parameters
    const sortBy = searchParams.get('sortBy');
    if (sortBy) {
      filters.sortBy = sortBy;
    }

    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder === 'asc' || sortOrder === 'desc') {
      filters.sortOrder = sortOrder;
    }

    // Has outlets filter
    const hasOutlets = searchParams.get('hasOutlets');
    if (hasOutlets !== null) {
      filters.hasOutlets = hasOutlets === 'true';
    }

    return filters;
  }

  protected parseCreateData(body: any): CreatePublisherData {
    const result = CreatePublisherDataSchema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return result.data;
  }

  protected parseUpdateData(body: any): UpdatePublisherData {
    const result = UpdatePublisherDataSchema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return result.data;
  }

  /**
   * Handle search requests
   * GET /api/publishers/search?q=query&limit=10
   */
  async handleSearch(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const { searchParams } = new URL(request.url);
      
      const query = searchParams.get('q') || '';
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

      const publishers = await this.publishersService.searchPublishers(query, limit, context);

      return this.successResponse({
        data: publishers,
        total: publishers.length,
        query,
        limit
      });
    });
  }

  /**
   * Handle stats requests
   * GET /api/publishers/stats
   */
  async handleGetStats(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      
      const publishers = await this.publishersService.getPublishersWithStats(context);

      return this.successResponse({
        data: publishers,
        total: publishers.length
      });
    });
  }

  /**
   * Handle available publishers requests
   * GET /api/publishers/available
   */
  async handleGetAvailable(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      
      const publishers = await this.publishersService.getAvailablePublishers(context);

      return this.successResponse({
        data: publishers,
        total: publishers.length
      });
    });
  }

  /**
   * Handle name availability check
   * GET /api/publishers/check-name?name=publisherName&excludeId=id
   */
  async handleCheckName(request: NextRequest) {
    return this.handleRequest(async () => {
      const { searchParams } = new URL(request.url);
      
      const name = searchParams.get('name');
      if (!name) {
        return this.errorResponse('Name parameter is required', 400);
      }

      const excludeId = searchParams.get('excludeId') || undefined;
      const available = await this.publishersService.isNameAvailable(name, excludeId);

      return this.successResponse({
        available,
        name,
        excludeId
      });
    });
  }
}