/**
 * Regions Controller - HTTP request/response handling
 */

import { BaseController } from '../shared/base-controller';
import { Region, CreateRegionData, UpdateRegionData, RegionsFilters } from './types';
import { RegionsService } from './service';
import { APIError } from '../shared/errors';
import { NextRequest } from 'next/server';

export class RegionsController extends BaseController<Region, CreateRegionData, UpdateRegionData, RegionsFilters> {
  constructor(service: RegionsService) {
    super(service);
  }

  protected parseCreateData(body: any): CreateRegionData {
    return {
      name: body.name,
      code: body.code,
      category: body.category,
      parentCode: body.parentCode,
      description: body.description
    };
  }

  protected parseUpdateData(body: any): UpdateRegionData {
    const data: UpdateRegionData = {};
    
    if (body.name !== undefined) data.name = body.name;
    if (body.category !== undefined) data.category = body.category;
    if (body.parentCode !== undefined) data.parentCode = body.parentCode;
    if (body.description !== undefined) data.description = body.description;

    return data;
  }

  protected parseFilters(request: NextRequest): RegionsFilters {
    const searchParams = new URL(request.url).searchParams;
    const filters: RegionsFilters = {};
    
    const search = searchParams.get('search');
    if (search) filters.search = search;
    
    const sortBy = searchParams.get('sortBy');
    if (sortBy) filters.sortBy = sortBy;
    
    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder && (sortOrder === 'asc' || sortOrder === 'desc')) filters.sortOrder = sortOrder;
    
    const category = searchParams.get('category');
    if (category) filters.category = category;
    
    const hasCountries = searchParams.get('hasCountries');
    if (hasCountries !== null) filters.hasCountries = hasCountries === 'true';

    return filters;
  }

  async handleGetByCategory(request: NextRequest): Promise<Response> {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const url = new URL(request.url);
      const category = url.searchParams.get('category');

      if (!category) {
        throw APIError.validation('Category parameter is required');
      }

      const service = this.service as RegionsService;
      const results = await service.getRegionsByCategory(category, context);
      
      return this.successResponse({ data: results });
    });
  }

  async handleCheckCode(request: NextRequest): Promise<Response> {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const url = new URL(request.url);
      const code = url.searchParams.get('code');

      if (!code) {
        throw APIError.validation('Code parameter is required');
      }

      // Get the repository directly to check code existence
      const service = this.service as RegionsService;
      const exists = await (service['repository'] as any).existsByCode(code);
      
      return this.successResponse({ exists });
    });
  }

  async handleSearch(request: NextRequest): Promise<Response> {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const url = new URL(request.url);
      const query = url.searchParams.get('q') || '';
      const limit = parseInt(url.searchParams.get('limit') || '10');

      if (!query) {
        return this.successResponse({ data: [] });
      }

      // Get the repository directly to perform search
      const service = this.service as RegionsService;
      const results = await (service['repository'] as any).search(query, limit);
      
      return this.successResponse({ data: results });
    });
  }
}