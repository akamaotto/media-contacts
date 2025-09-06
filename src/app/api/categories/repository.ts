/**
 * Categories Repository Implementation with Performance Optimizations
 */

import { Prisma } from '@prisma/client';
import { BasePrismaRepository } from '../shared/base-repository';
import { NamedRepository } from '../shared/repository.interface';
import { Category, CreateCategoryData, UpdateCategoryData, CategoriesFilters } from './types';
import { cacheService, CacheKeys } from '../shared/cache-service';
import { PaginationParams, PaginatedResult } from '../shared/types';

// Performance optimizations
const BATCH_SIZE = 100;
const CACHE_TTL = 300; // 5 minutes

// Optimized select clause with minimal data
const MINIMAL_SELECT = {
  id: true,
  name: true,
  description: true,
  color: true,
  updated_at: true
} satisfies Prisma.categoriesSelect;

// Full select clause for detailed queries
const FULL_SELECT = {
  id: true,
  name: true,
  description: true,
  color: true,
  updated_at: true,
  _count: {
    select: {
      beats: true,
      outlets: true
    }
  }
} satisfies Prisma.categoriesSelect;

export class CategoriesRepository extends BasePrismaRepository<Category, CreateCategoryData, UpdateCategoryData, CategoriesFilters> 
  implements NamedRepository<Category, CreateCategoryData, UpdateCategoryData, CategoriesFilters> {

  protected get model() {
    return this.prisma.categories;
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

  protected mapToEntity(data: any): Category {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      color: data.color,
      beatCount: data._count?.beats || 0,
      outletCount: data._count?.outlets || 0,
      updatedAt: data.updated_at
    };
  }

  protected mapCreateData(data: CreateCategoryData): any {
    return {
      name: data.name,
      description: data.description || null,
      color: data.color || null
    };
  }

  protected mapUpdateData(data: UpdateCategoryData): any {
    const baseData: any = {};
    
    if (data.name !== undefined) baseData.name = data.name;
    if (data.description !== undefined) baseData.description = data.description || null;
    if (data.color !== undefined) baseData.color = data.color || null;

    return baseData;
  }

  protected buildWhereClause(filters?: CategoriesFilters): Prisma.categoriesWhereInput {
    if (!filters) return {};

    const where: Prisma.categoriesWhereInput = {};
    const conditions: Prisma.categoriesWhereInput[] = [];

    // Search filter
    if (filters.search) {
      conditions.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ]
      });
    }

    // Has beats filter
    if (filters.hasBeats !== undefined) {
      if (filters.hasBeats) {
        conditions.push({
          beats: {
            some: {}
          }
        });
      } else {
        conditions.push({
          beats: {
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

  protected getDefaultOrderBy(): Prisma.categoriesOrderByWithRelationInput {
    return { name: 'asc' };
  }

  // Implement NamedRepository interface
  async findByName(name: string): Promise<Category | null> {
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
   * Get categories with usage statistics
   */
  async findWithStats(): Promise<Category[]> {
    const cached = cacheService.get<Category[]>(CacheKeys.categories.stats());
    if (cached) {
      return cached;
    }

    const data = await this.model.findMany({
      select: FULL_SELECT,
      orderBy: [{ name: 'asc' }]
    });

    const result = data.map(item => this.mapToEntity(item));

    // Cache for 5 minutes
    cacheService.set(CacheKeys.categories.stats(), result, 300);
    return result;
  }

  /**
   * Optimized findAll with performance enhancements
   */
  async findAll(filters?: CategoriesFilters, pagination?: PaginationParams): Promise<PaginatedResult<Category>> {
    const { page, pageSize, skip, take } = this.calculatePagination(pagination);
    const whereClause = this.buildWhereClause(filters);
    
    const cacheKey = CacheKeys.categories.all(filters, page, pageSize);
    const cached = cacheService.get<PaginatedResult<Category>>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Use minimal select for list views to reduce data transfer
    const useMinimalSelect = !filters?.search && take <= 20;
    const selectClause = useMinimalSelect ? this.minimalSelectClause : this.selectClause;

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
  async search(query: string, limit = 10): Promise<Category[]> {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = CacheKeys.categories.search(query.toLowerCase(), limit);
    const cached = cacheService.get<Category[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use database search for better performance
    const data = await this.model.findMany({
      where: {
        OR: [
          { name: { contains: query.trim(), mode: 'insensitive' } },
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
  async createMany(categories: CreateCategoryData[]): Promise<Category[]> {
    const results: Category[] = [];
    
    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < categories.length; i += BATCH_SIZE) {
      const batch = categories.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(category => this.create(category))
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
    cacheService.clearByPrefix('categories_');
  }

  /**
   * Override create to clear cache
   */
  async create(data: CreateCategoryData): Promise<Category> {
    const result = await super.create(data);
    this.clearCache();
    return result;
  }

  /**
   * Override update to clear cache
   */
  async update(id: string, data: UpdateCategoryData): Promise<Category> {
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