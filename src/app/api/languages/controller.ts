/**
 * Languages Controller - HTTP request/response handling
 */

import { BaseController } from '../shared/base-controller';
import { Language, CreateLanguageData, UpdateLanguageData, LanguagesFilters } from './types';
import { LanguagesService } from './service';
import { APIError } from '../shared/errors';
import { NextRequest } from 'next/server';

export class LanguagesController extends BaseController<Language, CreateLanguageData, UpdateLanguageData, LanguagesFilters> {
  constructor(service: LanguagesService) {
    super(service);
  }

  protected parseCreateData(body: any): CreateLanguageData {
    return {
      name: body.name,
      code: body.code
    };
  }

  protected parseUpdateData(body: any): UpdateLanguageData {
    const data: UpdateLanguageData = {};
    
    if (body.name !== undefined) data.name = body.name;
    if (body.code !== undefined) data.code = body.code;

    return data;
  }

  protected parseFilters(request: NextRequest): LanguagesFilters {
    const filters: LanguagesFilters = {};
    
    const searchParams = new URL(request.url).searchParams;
    const search = searchParams.get('search');
    if (search) filters.search = search;
    
    const sortBy = searchParams.get('sortBy');
    if (sortBy) filters.sortBy = sortBy;
    
    const sortOrder = searchParams.get('sortOrder');
    if (sortOrder && (sortOrder === 'asc' || sortOrder === 'desc')) filters.sortOrder = sortOrder;
    
    const hasCountries = searchParams.get('hasCountries');
    if (hasCountries !== null) filters.hasCountries = hasCountries === 'true';

    return filters;
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
      const service = this.service as LanguagesService;
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
      const service = this.service as LanguagesService;
      const results = await (service['repository'] as any).search(query, limit);
      
      return this.successResponse({ data: results });
    });
  }
}