/**
 * Categories Controller - HTTP request handling
 */

import { NextRequest } from 'next/server';
import { BaseController } from '../shared/base-controller';
import { Category, CreateCategoryData, UpdateCategoryData, CategoriesFilters } from './types';
import { CategoriesService } from './service';

export class CategoriesController extends BaseController<Category, CreateCategoryData, UpdateCategoryData, CategoriesFilters> {
  
  constructor(private categoriesService: CategoriesService) {
    super(categoriesService);
  }

  protected parseFilters(request: NextRequest): CategoriesFilters {
    const { searchParams } = new URL(request.url);
    
    const filters: CategoriesFilters = {};

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

    // Has beats filter
    const hasBeats = searchParams.get('hasBeats');
    if (hasBeats !== null) {
      filters.hasBeats = hasBeats === 'true';
    }

    // Has outlets filter
    const hasOutlets = searchParams.get('hasOutlets');
    if (hasOutlets !== null) {
      filters.hasOutlets = hasOutlets === 'true';
    }

    return filters;
  }

  protected parseCreateData(body: any): CreateCategoryData {
    return {
      name: body.name?.trim(),
      description: body.description?.trim() || undefined,
      color: body.color?.trim() || undefined
    };
  }

  protected parseUpdateData(body: any): UpdateCategoryData {
    const data: UpdateCategoryData = {};

    if (body.name !== undefined) {
      data.name = body.name?.trim();
    }

    if (body.description !== undefined) {
      data.description = body.description?.trim() || undefined;
    }

    if (body.color !== undefined) {
      data.color = body.color?.trim() || undefined;
    }

    return data;
  }

  /**
   * Handle search requests
   * GET /api/categories/search?q=query&limit=10
   */
  async handleSearch(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const { searchParams } = new URL(request.url);
      
      const query = searchParams.get('q') || '';
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

      const categories = await this.categoriesService.searchCategories(query, limit, context);

      return this.successResponse({
        data: categories,
        total: categories.length,
        query,
        limit
      });
    });
  }

  /**
   * Handle stats requests
   * GET /api/categories/stats
   */
  async handleGetStats(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      
      const categories = await this.categoriesService.getCategoriesWithStats(context);

      return this.successResponse({
        data: categories,
        total: categories.length
      });
    });
  }

  /**
   * Handle name availability check
   * GET /api/categories/check-name?name=CategoryName&excludeId=123
   */
  async handleCheckName(request: NextRequest) {
    return this.handleRequest(async () => {
      const { searchParams } = new URL(request.url);
      
      const name = searchParams.get('name');
      if (!name) {
        return this.errorResponse('Name parameter is required', 400);
      }

      const excludeId = searchParams.get('excludeId') || undefined;
      
      const isAvailable = await this.categoriesService.isNameAvailable(name, excludeId);

      return this.successResponse({
        available: isAvailable,
        name,
        message: isAvailable ? 'Name is available' : 'Name is already taken'
      });
    });
  }
}