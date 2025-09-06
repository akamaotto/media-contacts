/**
 * Beats Controller Implementation
 */

import { NextRequest } from 'next/server';
import { BaseController } from '../shared/base-controller';
import { Beat, CreateBeatData, UpdateBeatData, BeatsFilters } from './types';
import { BeatsService } from './service';

export class BeatsController extends BaseController<Beat, CreateBeatData, UpdateBeatData, BeatsFilters> {
  
  constructor(private beatsService: BeatsService) {
    super(beatsService);
  }

  protected parseFilters(request: NextRequest): BeatsFilters {
    const { searchParams } = new URL(request.url);
    
    const filters: BeatsFilters = {};

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

    // Has contacts filter
    const hasContacts = searchParams.get('hasContacts');
    if (hasContacts !== null) {
      filters.hasContacts = hasContacts === 'true';
    }

    return filters;
  }

  protected parseCreateData(body: any): CreateBeatData {
    return {
      name: body.name?.trim(),
      description: body.description?.trim() || undefined,
      categoryIds: Array.isArray(body.categoryIds) ? body.categoryIds : undefined,
      countryIds: Array.isArray(body.countryIds) ? body.countryIds : undefined
    };
  }

  protected parseUpdateData(body: any): UpdateBeatData {
    const data: UpdateBeatData = {};

    if (body.name !== undefined) {
      data.name = body.name?.trim();
    }

    if (body.description !== undefined) {
      data.description = body.description?.trim() || undefined;
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
   * GET /api/features/beats/search?q=query&limit=10
   */
  async handleSearch(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const { searchParams } = new URL(request.url);
      
      const query = searchParams.get('q') || '';
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

      const beats = await this.beatsService.searchBeats(query, limit, context);

      return this.successResponse({
        data: beats,
        total: beats.length,
        query,
        limit
      });
    });
  }

  /**
   * Handle stats requests
   * GET /api/features/beats/stats
   */
  async handleGetStats(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      
      const beats = await this.beatsService.getBeatsWithStats(context);

      return this.successResponse({
        data: beats,
        total: beats.length
      });
    });
  }

  /**
   * Handle name availability check
   * GET /api/features/beats/check-name?name=BeatName&excludeId=123
   */
  async handleCheckName(request: NextRequest) {
    return this.handleRequest(async () => {
      const { searchParams } = new URL(request.url);
      
      const name = searchParams.get('name');
      if (!name) {
        return this.errorResponse('Name parameter is required', 400);
      }

      const excludeId = searchParams.get('excludeId') || undefined;
      
      const isAvailable = await this.beatsService.isNameAvailable(name, excludeId);

      return this.successResponse({
        available: isAvailable,
        name,
        message: isAvailable ? 'Name is available' : 'Name is already taken'
      });
    });
  }
}