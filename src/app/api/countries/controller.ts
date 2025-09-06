/**
 * Countries Controller Implementation
 */

import { NextRequest } from 'next/server';
import { BaseController } from '../shared/base-controller';
import { Country, CreateCountryData, UpdateCountryData, CountriesFilters } from './types';
import { CountriesService } from './service';

export class CountriesController extends BaseController<Country, CreateCountryData, UpdateCountryData, CountriesFilters> {
  
  constructor(private countriesService: CountriesService) {
    super(countriesService);
  }

  protected parseFilters(request: NextRequest): CountriesFilters {
    const { searchParams } = new URL(request.url);
    
    const filters: CountriesFilters = {};

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

    // Region filter
    const regionIds = searchParams.get('regionIds');
    if (regionIds) {
      filters.regionIds = regionIds.split(',').filter(Boolean);
    }

    // Language filter
    const languageIds = searchParams.get('languageIds');
    if (languageIds) {
      filters.languageIds = languageIds.split(',').filter(Boolean);
    }

    // Beat filter
    const beatIds = searchParams.get('beatIds');
    if (beatIds) {
      filters.beatIds = beatIds.split(',').filter(Boolean);
    }

    // Has contacts filter
    const hasContacts = searchParams.get('hasContacts');
    if (hasContacts !== null) {
      filters.hasContacts = hasContacts === 'true';
    }

    // Has outlets filter
    const hasOutlets = searchParams.get('hasOutlets');
    if (hasOutlets !== null) {
      filters.hasOutlets = hasOutlets === 'true';
    }

    return filters;
  }

  protected parseCreateData(body: any): CreateCountryData {
    return {
      name: body.name?.trim(),
      code: body.code?.trim() || undefined,
      capital: body.capital?.trim() || undefined,
      flag_emoji: body.flag_emoji?.trim() || undefined,
      latitude: typeof body.latitude === 'number' ? body.latitude : undefined,
      longitude: typeof body.longitude === 'number' ? body.longitude : undefined,
      phone_code: body.phone_code?.trim() || undefined,
      regionIds: Array.isArray(body.regionIds) ? body.regionIds : undefined,
      languageIds: Array.isArray(body.languageIds) ? body.languageIds : undefined,
      beatIds: Array.isArray(body.beatIds) ? body.beatIds : undefined
    };
  }

  protected parseUpdateData(body: any): UpdateCountryData {
    const data: UpdateCountryData = {};

    if (body.name !== undefined) {
      data.name = body.name?.trim();
    }

    if (body.code !== undefined) {
      data.code = body.code?.trim() || undefined;
    }

    if (body.capital !== undefined) {
      data.capital = body.capital?.trim() || undefined;
    }

    if (body.flag_emoji !== undefined) {
      data.flag_emoji = body.flag_emoji?.trim() || undefined;
    }

    if (body.latitude !== undefined) {
      data.latitude = typeof body.latitude === 'number' ? body.latitude : undefined;
    }

    if (body.longitude !== undefined) {
      data.longitude = typeof body.longitude === 'number' ? body.longitude : undefined;
    }

    if (body.phone_code !== undefined) {
      data.phone_code = body.phone_code?.trim() || undefined;
    }

    if (body.regionIds !== undefined) {
      data.regionIds = Array.isArray(body.regionIds) ? body.regionIds : [];
    }

    if (body.languageIds !== undefined) {
      data.languageIds = Array.isArray(body.languageIds) ? body.languageIds : [];
    }

    if (body.beatIds !== undefined) {
      data.beatIds = Array.isArray(body.beatIds) ? body.beatIds : [];
    }

    return data;
  }

  /**
   * Handle search requests
   * GET /api/countries/search?q=query&limit=10
   */
  async handleSearch(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const { searchParams } = new URL(request.url);
      
      const query = searchParams.get('q') || '';
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

      const countries = await this.countriesService.searchCountries(query, limit, context);

      return this.successResponse({
        data: countries,
        total: countries.length,
        query,
        limit
      });
    });
  }

  /**
   * Handle stats requests
   * GET /api/countries/stats
   */
  async handleGetStats(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      
      const countries = await this.countriesService.getCountriesWithStats(context);

      return this.successResponse({
        data: countries,
        total: countries.length
      });
    });
  }

  /**
   * Handle country lookup by code
   * GET /api/countries/by-code?code=US
   */
  async handleGetByCode(request: NextRequest) {
    return this.handleRequest(async () => {
      const context = await this.getRequestContext(request);
      const { searchParams } = new URL(request.url);
      
      const code = searchParams.get('code');
      if (!code) {
        return this.errorResponse('Code parameter is required', 400);
      }

      const country = await this.countriesService.findByCode(code, context);

      if (!country) {
        return this.errorResponse(`Country with code "${code}" not found`, 404);
      }

      return this.successResponse({ data: country });
    });
  }

  /**
   * Handle name availability check
   * GET /api/countries/check-name?name=CountryName&excludeId=123
   */
  async handleCheckName(request: NextRequest) {
    return this.handleRequest(async () => {
      const { searchParams } = new URL(request.url);
      
      const name = searchParams.get('name');
      if (!name) {
        return this.errorResponse('Name parameter is required', 400);
      }

      const excludeId = searchParams.get('excludeId') || undefined;
      
      const isAvailable = await this.countriesService.isNameAvailable(name, excludeId);

      return this.successResponse({
        available: isAvailable,
        name,
        message: isAvailable ? 'Name is available' : 'Name is already taken'
      });
    });
  }

  /**
   * Handle code availability check
   * GET /api/countries/check-code?code=US&excludeId=123
   */
  async handleCheckCode(request: NextRequest) {
    return this.handleRequest(async () => {
      const { searchParams } = new URL(request.url);
      
      const code = searchParams.get('code');
      if (!code) {
        return this.errorResponse('Code parameter is required', 400);
      }

      const excludeId = searchParams.get('excludeId') || undefined;
      
      const isAvailable = await this.countriesService.isCodeAvailable(code, excludeId);

      return this.successResponse({
        available: isAvailable,
        code: code.toUpperCase(),
        message: isAvailable ? 'Code is available' : 'Code is already taken'
      });
    });
  }
}