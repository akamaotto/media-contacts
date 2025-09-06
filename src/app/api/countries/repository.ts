/**
 * Countries Repository Implementation with Performance Optimizations
 */

import { Prisma } from '@prisma/client';
import { BasePrismaRepository } from '../shared/base-repository';
import { NamedRepository } from '../shared/repository.interface';
import { Country, CreateCountryData, UpdateCountryData, CountriesFilters } from './types';
import { cacheService, CacheKeys } from '../shared/cache-service';
import { PaginationParams, PaginatedResult } from '../shared/types';

// Performance optimizations
const BATCH_SIZE = 100;
const CACHE_TTL = 300; // 5 minutes

// Optimized select clause with minimal data
const MINIMAL_SELECT = {
  id: true,
  name: true,
  code: true,
  capital: true,
  flag_emoji: true,
  updated_at: true
} satisfies Prisma.countriesSelect;

// Full select clause for detailed queries
const FULL_SELECT = {
  id: true,
  name: true,
  code: true,
  capital: true,
  flag_emoji: true,
  latitude: true,
  longitude: true,
  phone_code: true,
  updated_at: true,
  regions: {
    select: {
      id: true,
      name: true,
      code: true,
      category: true
    }
  },
  languages: {
    select: {
      id: true,
      name: true,
      code: true
    }
  },
  beats: {
    select: {
      id: true,
      name: true,
      description: true
    }
  },
  _count: {
    select: {
      media_contacts: true,
      outlets: true
    }
  }
} satisfies Prisma.countriesSelect;

export class CountriesRepository extends BasePrismaRepository<Country, CreateCountryData, UpdateCountryData, CountriesFilters> 
  implements NamedRepository<Country, CreateCountryData, UpdateCountryData, CountriesFilters> {

  protected get model() {
    return this.prisma.countries;
  }

  protected get selectClause() {
    return FULL_SELECT;
  }

  /**
   * Get minimal select clause for list operations
   */
  private get minimalSelectClause() {
    return MINIMAL_SELECT;
  }

  protected mapToEntity(data: any): Country {
    return {
      id: data.id,
      name: data.name,
      code: data.code,
      capital: data.capital,
      flag_emoji: data.flag_emoji,
      latitude: data.latitude,
      longitude: data.longitude,
      phone_code: data.phone_code,
      regions: data.regions || [],
      languages: data.languages || [],
      beats: data.beats || [],
      contactCount: data._count?.media_contacts || 0,
      outletCount: data._count?.outlets || 0,
      updatedAt: data.updated_at
    };
  }

  protected mapCreateData(data: CreateCountryData): any {
    const baseData = {
      name: data.name,
      code: data.code || null,
      capital: data.capital || null,
      flag_emoji: data.flag_emoji || null,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      phone_code: data.phone_code || null
    };

    // Handle relationship connections
    const connections: any = {};
    
    if (data.regionIds && data.regionIds.length > 0) {
      connections.regions = { connect: data.regionIds.map(id => ({ id })) };
    }

    if (data.languageIds && data.languageIds.length > 0) {
      connections.languages = { connect: data.languageIds.map(id => ({ id })) };
    }

    if (data.beatIds && data.beatIds.length > 0) {
      connections.beats = { connect: data.beatIds.map(id => ({ id })) };
    }

    return {
      ...baseData,
      ...connections
    };
  }

  protected mapUpdateData(data: UpdateCountryData): any {
    const baseData: any = {};
    
    if (data.name !== undefined) baseData.name = data.name;
    if (data.code !== undefined) baseData.code = data.code || null;
    if (data.capital !== undefined) baseData.capital = data.capital || null;
    if (data.flag_emoji !== undefined) baseData.flag_emoji = data.flag_emoji || null;
    if (data.latitude !== undefined) baseData.latitude = data.latitude || null;
    if (data.longitude !== undefined) baseData.longitude = data.longitude || null;
    if (data.phone_code !== undefined) baseData.phone_code = data.phone_code || null;

    // Handle relationship updates
    if (data.regionIds !== undefined) {
      baseData.regions = {
        set: data.regionIds.map(id => ({ id }))
      };
    }

    if (data.languageIds !== undefined) {
      baseData.languages = {
        set: data.languageIds.map(id => ({ id }))
      };
    }

    if (data.beatIds !== undefined) {
      baseData.beats = {
        set: data.beatIds.map(id => ({ id }))
      };
    }

    return baseData;
  }

  protected buildWhereClause(filters?: CountriesFilters): Prisma.countriesWhereInput {
    if (!filters) return {};

    const where: Prisma.countriesWhereInput = {};
    const conditions: Prisma.countriesWhereInput[] = [];

    // Search filter
    if (filters.search) {
      conditions.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { code: { contains: filters.search, mode: 'insensitive' } },
          { capital: { contains: filters.search, mode: 'insensitive' } }
        ]
      });
    }

    // Region filter
    if (filters.regionIds && filters.regionIds.length > 0) {
      conditions.push({
        regions: {
          some: {
            id: { in: filters.regionIds }
          }
        }
      });
    }

    // Language filter
    if (filters.languageIds && filters.languageIds.length > 0) {
      conditions.push({
        languages: {
          some: {
            id: { in: filters.languageIds }
          }
        }
      });
    }

    // Beat filter
    if (filters.beatIds && filters.beatIds.length > 0) {
      conditions.push({
        beats: {
          some: {
            id: { in: filters.beatIds }
          }
        }
      });
    }

    // Has contacts filter
    if (filters.hasContacts !== undefined) {
      if (filters.hasContacts) {
        conditions.push({
          media_contacts: {
            some: {}
          }
        });
      } else {
        conditions.push({
          media_contacts: {
            none: {}
          }
        });
      }
    }

    // Has outlets filter
    if (filters.hasOutlets !== undefined) {
      if (filters.hasOutlets) {
        conditions.push({
          outlets: {
            some: {}
          }
        });
      } else {
        conditions.push({
          outlets: {
            none: {}
          }
        });
      }
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    return where;
  }

  protected getDefaultOrderBy(): Prisma.countriesOrderByWithRelationInput {
    return { name: 'asc' };
  }

  // Implement NamedRepository interface
  async findByName(name: string): Promise<Country | null> {
    const data = await this.model.findUnique({
      where: { name },
      select: this.selectClause
    });

    return data ? this.mapToEntity(data) : null;
  }

  async existsByName(name: string): Promise<boolean> {
    const result = await this.model.findUnique({
      where: { name },
      select: { id: true }
    });

    return !!result;
  }

  /**
   * Find country by code
   */
  async findByCode(code: string): Promise<Country | null> {
    const data = await this.model.findUnique({
      where: { code },
      select: this.selectClause
    });

    return data ? this.mapToEntity(data) : null;
  }

  /**
   * Get countries with usage statistics
   */
  async findWithStats(): Promise<Country[]> {
    const cached = cacheService.get<Country[]>(CacheKeys.countries.stats());
    if (cached) {
      return cached;
    }

    const data = await this.model.findMany({
      select: {
        ...FULL_SELECT,
        _count: {
          select: {
            media_contacts: true,
            outlets: true,
            regions: true,
            languages: true,
            beats: true
          }
        }
      },
      orderBy: [{ name: 'asc' }]
    });

    const result = data.map(item => ({
      ...this.mapToEntity(item),
      contactCount: item._count.media_contacts,
      outletCount: item._count.outlets,
      regionCount: item._count.regions,
      languageCount: item._count.languages,
      beatCount: item._count.beats
    }));

    // Cache for 5 minutes
    cacheService.set(CacheKeys.countries.stats(), result, 300);
    return result;
  }

  /**
   * Optimized findAll with performance enhancements
   */
  async findAll(filters?: CountriesFilters, pagination?: PaginationParams): Promise<PaginatedResult<Country>> {
    const { page, pageSize, skip, take } = this.calculatePagination(pagination);
    const whereClause = this.buildWhereClause(filters);
    
    const cacheKey = CacheKeys.countries.all(filters, page, pageSize);
    const cached = cacheService.get<PaginatedResult<Country>>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Use full select to include relationships for UI display
    const selectClause = this.selectClause;

    // Parallel execution for better performance
    const [data, totalCount] = await Promise.all([
      this.model.findMany({
        where: whereClause,
        select: selectClause,
        skip,
        take,
        orderBy: this.getDefaultOrderBy()
      }),
      this.model.count({ where: whereClause })
    ]);

    const entities = data.map((item: any) => this.mapToEntity(item));
    const result = this.createPaginatedResult(entities, totalCount, { page, pageSize });
    
    // Cache for 2 minutes (shorter TTL for list views)
    cacheService.set(cacheKey, result, 120);
    return result;
  }

  /**
   * Optimized search with caching
   */
  async search(query: string, limit = 10): Promise<Country[]> {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = CacheKeys.countries.search(query.toLowerCase(), limit);
    const cached = cacheService.get<Country[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use database search for better performance
    const data = await this.model.findMany({
      where: {
        OR: [
          { name: { contains: query.trim(), mode: 'insensitive' } },
          { code: { contains: query.trim(), mode: 'insensitive' } },
          { capital: { contains: query.trim(), mode: 'insensitive' } }
        ]
      },
      select: this.minimalSelectClause, // Use minimal select for search
      orderBy: { name: 'asc' },
      take: limit
    });

    const result = data.map(item => this.mapToEntity(item));
    
    // Cache search results for 10 minutes
    cacheService.set(cacheKey, result, 600);
    return result;
  }

  /**
   * Batch operations for improved performance
   */
  async createMany(countries: CreateCountryData[]): Promise<Country[]> {
    const results: Country[] = [];
    
    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < countries.length; i += BATCH_SIZE) {
      const batch = countries.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(country => this.create(country))
      );
      
      results.push(...batchResults);
    }
    
    // Clear cache after bulk operations
    this.clearCache();
    
    return results;
  }

  /**
   * Clear cache when data is modified
   */
  private clearCache(): void {
    cacheService.clearByPrefix('countries_');
  }

  /**
   * Override create to clear cache
   */
  async create(data: CreateCountryData): Promise<Country> {
    const result = await super.create(data);
    this.clearCache();
    return result;
  }

  /**
   * Override update to clear cache
   */
  async update(id: string, data: UpdateCountryData): Promise<Country> {
    const result = await super.update(id, data);
    this.clearCache();
    return result;
  }

  /**
   * Override delete to clear cache
   */
  async delete(id: string): Promise<void> {
    await super.delete(id);
    this.clearCache();
  }
}