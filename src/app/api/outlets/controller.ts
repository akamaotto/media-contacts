/**
 * Outlets Controller Implementation
 */

import { NextRequest } from 'next/server';
import { BaseController } from '../shared/base-controller';
import { Outlet, CreateOutletData, UpdateOutletData, OutletsFilters } from './types';
import { OutletsService } from './service';

export class OutletsController extends BaseController<Outlet, CreateOutletData, UpdateOutletData, OutletsFilters> {
  
  constructor(private outletsService: OutletsService) {
    super(outletsService);
  }

  protected parseFilters(request: NextRequest): OutletsFilters {
    const { searchParams } = new URL(request.url);
    
    const filters: OutletsFilters = {};

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

    // Publisher filter
    const publisherId = searchParams.get('publisherId');
    if (publisherId) {
      filters.publisherId = publisherId;
    }

    // Category filter
    const categoryIds = searchParams.get('categoryIds');
    if (categoryIds) {
      filters.categoryIds = categoryIds.split(',').filter(Boolean);
    }
    
    // Country filter
    const countryIds = searchParams.get('countryIds');
    if (countryIds) {
      filters.countryIds = countryIds.split(',').filter(Boolean);
    }

    // Has publisher filter
    const hasPublisher = searchParams.get('hasPublisher');
    if (hasPublisher !== null) {
      filters.hasPublisher = hasPublisher === 'true';
    }

    // Has contacts filter
    const hasContacts = searchParams.get('hasContacts');
    if (hasContacts !== null) {
      filters.hasContacts = hasContacts === 'true';
    }

    return filters;
  }

  protected parseCreateData(body: any): CreateOutletData {
    return {
      name: body.name?.trim(),
      description: body.description?.trim() || undefined,
      website: body.website?.trim() || undefined,
      publisherId: body.publisherId || null,
      categoryIds: Array.isArray(body.categoryIds) ? body.categoryIds : undefined,
      countryIds: Array.isArray(body.countryIds) ? body.countryIds : undefined
    };
  }

  protected parseUpdateData(body: any): UpdateOutletData {
    const data: UpdateOutletData = {};

    if (body.name !== undefined) {
      data.name = body.name?.trim();
    }

    if (body.description !== undefined) {
      data.description = body.description?.trim() || undefined;
    }

    if (body.website !== undefined) {
      data.website = body.website?.trim() || undefined;
    }

    if (body.publisherId !== undefined) {
      data.publisherId = body.publisherId || null;
    }

    if (body.categoryIds !== undefined) {
      data.categoryIds = Array.isArray(body.categoryIds) ? body.categoryIds : [];
    }
    
    if (body.countryIds !== undefined) {
      data.countryIds = Array.isArray(body.countryIds) ? body.countryIds : [];
    }

    return data;
  }

  /**
   * Handle search requests
   * GET /api/outlets/search?q=query&limit=10
   */
  async handleSearch(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const { searchParams } = new URL(request.url);
      
      const query = searchParams.get('q') || '';
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

      const outlets = await this.outletsService.searchOutlets(query, limit, context);

      return this.successResponse({
        data: outlets,
        total: outlets.length,
        query,
        limit
      });
    });
  }

  /**
   * Handle stats requests
   * GET /api/outlets/stats
   */
  async handleGetStats(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      
      const outlets = await this.outletsService.getOutletsWithStats(context);

      return this.successResponse({
        data: outlets,
        total: outlets.length
      });
    });
  }

  /**
   * Handle available outlets requests
   * GET /api/outlets/available
   */
  async handleGetAvailable(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      
      const outlets = await this.outletsService.getAvailableOutlets(context);

      return this.successResponse({
        data: outlets,
        total: outlets.length
      });
    });
  }

  /**
   * Handle outlets by publisher requests
   * GET /api/outlets/publisher/[publisherId]
   */
  async handleGetByPublisher(
    request: NextRequest,
    { params }: { params: Promise<{ publisherId: string }> }
  ) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const { publisherId } = await params;
      
      const outlets = await this.outletsService.getOutletsByPublisher(publisherId, context);

      return this.successResponse({
        data: outlets,
        total: outlets.length
      });
    });
  }

  /**
   * Handle name availability check
   * GET /api/outlets/check-name?name=OutletName&excludeId=123
   */
  async handleCheckName(request: NextRequest) {
    return this.handleRequest(async () => {
      const { searchParams } = new URL(request.url);
      
      const name = searchParams.get('name');
      if (!name) {
        return this.errorResponse('Name parameter is required', 400);
      }

      const excludeId = searchParams.get('excludeId') || undefined;
      
      const isAvailable = await this.outletsService.isNameAvailable(name, excludeId);

      return this.successResponse({
        available: isAvailable,
        name,
        message: isAvailable ? 'Name is available' : 'Name is already taken'
      });
    });
  }
}