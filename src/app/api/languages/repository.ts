/**
 * Languages Repository Implementation with Performance Optimizations
 */

import { Prisma } from '@prisma/client';
import { BasePrismaRepository } from '../shared/base-repository';
import { NamedRepository } from '../shared/repository.interface';
import { Language, CreateLanguageData, UpdateLanguageData, LanguagesFilters } from './types';
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
  updated_at: true
} satisfies Prisma.languagesSelect;

// Full select clause for detailed queries
const FULL_SELECT = {
  id: true,
  name: true,
  code: true,
  updated_at: true,
  _count: {
    select: {
      countries: true
    }
  }
} satisfies Prisma.languagesSelect;

export class LanguagesRepository extends BasePrismaRepository<Language, CreateLanguageData, UpdateLanguageData, LanguagesFilters> 
  implements NamedRepository<Language, CreateLanguageData, UpdateLanguageData, LanguagesFilters> {

  protected get model() {
    return this.prisma.languages;
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

  protected mapToEntity(data: any): Language {
    return {
      id: data.id,
      name: data.name,
      code: data.code,
      updatedAt: data.updated_at,
      ...(data._count && { countryCount: data._count.countries })
    };
  }

  protected mapCreateData(data: CreateLanguageData): any {
    return {
      name: data.name,
      code: data.code
    };
  }

  protected mapUpdateData(data: UpdateLanguageData): any {
    const baseData: any = {};
    
    if (data.name !== undefined) baseData.name = data.name;
    if (data.code !== undefined) baseData.code = data.code;

    return baseData;
  }

  protected buildWhereClause(filters?: LanguagesFilters): Prisma.languagesWhereInput {
    if (!filters) return {};

    const where: Prisma.languagesWhereInput = {};
    const conditions: Prisma.languagesWhereInput[] = [];

    // Search filter
    if (filters.search) {
      conditions.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { code: { contains: filters.search, mode: 'insensitive' } }
        ]
      });
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

  protected getDefaultOrderBy(): Prisma.languagesOrderByWithRelationInput {
    return { name: 'asc' };
  }

  // Implement NamedRepository interface
  async findByName(name: string): Promise<Language | null> {
    const data = await this.model.findUnique({
      where: { name },
      select: this.selectClause
    });

    return data ? this.mapToEntity(data) : null;
  }

  async findByCode(code: string): Promise<Language | null> {
    const data = await this.model.findUnique({
      where: { code },
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

  async existsByCode(code: string): Promise<boolean> {
    const result = await this.model.findUnique({
      where: { code },
      select: { id: true }
    });

    return !!result;
  }

  async search(query: string, limit = 10): Promise<Language[]> {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = CacheKeys.languages.search(query.toLowerCase(), limit);
    const cached = cacheService.get<Language[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use database search for better performance
    const data = await this.model.findMany({
      where: {
        OR: [
          { name: { contains: query.trim(), mode: 'insensitive' } },
          { code: { contains: query.trim(), mode: 'insensitive' } }
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
  async createMany(languages: CreateLanguageData[]): Promise<Language[]> {
    const results: Language[] = [];
    
    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < languages.length; i += BATCH_SIZE) {
      const batch = languages.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(language => this.create(language))
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
    cacheService.clearByPrefix('languages_');
  }

  /**
   * Override create to clear cache
   */
  async create(data: CreateLanguageData): Promise<Language> {
    const result = await super.create(data);
    this.clearCache();
    return result;
  }

  /**
   * Override update to clear cache
   */
  async update(id: string, data: UpdateLanguageData): Promise<Language> {
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