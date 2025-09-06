/**
 * Regions Repository Implementation with Performance Optimizations
 */

import { Prisma } from '@prisma/client';
import { BasePrismaRepository } from '../shared/base-repository';
import { NamedRepository } from '../shared/repository.interface';
import { Region, CreateRegionData, UpdateRegionData, RegionsFilters } from './types';
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
  category: true,
  parent_code: true,
  updated_at: true
} satisfies Prisma.regionsSelect;

// Full select clause for detailed queries
const FULL_SELECT = {
  id: true,
  name: true,
  code: true,
  category: true,
  parent_code: true,
  description: true,
  updated_at: true,
  _count: {
    select: {
      countries: true
    }
  }
} satisfies Prisma.regionsSelect;

export class RegionsRepository extends BasePrismaRepository<Region, CreateRegionData, UpdateRegionData, RegionsFilters> 
  implements NamedRepository<Region, CreateRegionData, UpdateRegionData, RegionsFilters> {

  protected get model() {
    return this.prisma.regions;
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

  protected mapToEntity(data: any): Region {
    return {
      id: data.id,
      name: data.name,
      code: data.code,
      category: data.category,
      parentCode: data.parent_code || null,
      description: data.description || null,
      updatedAt: data.updated_at,
      ...(data._count && { countryCount: data._count.countries })
    };
  }

  protected mapCreateData(data: CreateRegionData): any {
    return {
      name: data.name,
      code: data.code,
      category: data.category,
      parent_code: data.parentCode,
      description: data.description || null
    };
  }

  protected mapUpdateData(data: UpdateRegionData): any {
    const baseData: any = {};
    
    if (data.name !== undefined) baseData.name = data.name;
    if (data.category !== undefined) baseData.category = data.category;
    if (data.parentCode !== undefined) baseData.parent_code = data.parentCode;
    if (data.description !== undefined) baseData.description = data.description || null;

    return baseData;
  }

  protected buildWhereClause(filters?: RegionsFilters): Prisma.regionsWhereInput {
    if (!filters) return {};

    const where: Prisma.regionsWhereInput = {};
    const conditions: Prisma.regionsWhereInput[] = [];

    // Search filter
    if (filters.search) {
      conditions.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { code: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ]
      });
    }

    // Category filter
    if (filters.category) {
      conditions.push({ category: filters.category });
    }

    // Has countries filter
    if (filters.hasCountries !== undefined) {
      if (filters.hasCountries) {
        conditions.push({
          countries: {
            some: {}
          }
        });
      } else {
        conditions.push({
          countries: {
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

  protected getDefaultOrderBy(): Prisma.regionsOrderByWithRelationInput {
    return { name: 'asc' };
  }

  // Implement NamedRepository interface
  async findByName(name: string): Promise<Region | null> {
    const data = await this.model.findUnique({
      where: { name },
      select: this.selectClause
    });

    return data ? this.mapToEntity(data) : null;
  }

  async findByCode(code: string): Promise<Region | null> {
    const data = await this.model.findUnique({
      where: { code },
      select: this.selectClause
    });

    return data ? this.mapToEntity(data) : null;
  }

  async findByCategory(category: string): Promise<Region[]> {
    const data = await this.model.findMany({
      where: { category },
      select: this.selectClause,
      orderBy: { name: 'asc' }
    });

    return data.map(item => this.mapToEntity(item));
  }

  async existsByName(name: string): Promise<boolean> {
    const result = await this.model.findUnique({
      where: { name },
      select: { id: true }
    });

    return !!result;
  }

  async existsByCode(code: string): Promise<boolean> {
    const result = await this.model.findUnique({
      where: { code },
      select: { id: true }
    });

    return !!result;
  }

  async search(query: string, limit = 10): Promise<Region[]> {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = CacheKeys.regions.search(query.toLowerCase(), limit);
    const cached = cacheService.get<Region[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use database search for better performance
    const data = await this.model.findMany({
      where: {
        OR: [
          { name: { contains: query.trim(), mode: 'insensitive' } },
          { code: { contains: query.trim(), mode: 'insensitive' } },
          { description: { contains: query.trim(), mode: 'insensitive' } }
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
  async createMany(regions: CreateRegionData[]): Promise<Region[]> {
    const results: Region[] = [];
    
    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < regions.length; i += BATCH_SIZE) {
      const batch = regions.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(region => this.create(region))
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
    cacheService.clearByPrefix('regions_');
  }

  /**
   * Override create to clear cache
   */
  async create(data: CreateRegionData): Promise<Region> {
    const result = await super.create(data);
    this.clearCache();
    return result;
  }

  /**
   * Override update to clear cache
   */
  async update(id: string, data: UpdateRegionData): Promise<Region> {
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