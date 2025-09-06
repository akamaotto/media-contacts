/**
 * Beats Repository Implementation with Performance Optimizations
 */

import { Prisma } from '@prisma/client';
import { BasePrismaRepository } from '../shared/base-repository';
import { NamedRepository } from '../shared/repository.interface';
import { Beat, CreateBeatData, UpdateBeatData, BeatsFilters } from './types';
import { cacheService, CacheKeys, getDynamicTTL } from '../shared/cache-service';
import { PaginationParams, PaginatedResult } from '../shared/types';

// Performance optimizations
const BATCH_SIZE = 100;

// Select clauses for different view types
const LIST_VIEW_SELECT = {
  id: true,
  name: true,
  description: true,
  updated_at: true,
  _count: {
    select: {
      media_contacts: true
    }
  }
} satisfies Prisma.beatsSelect;

const SEARCH_VIEW_SELECT = {
  id: true,
  name: true,
  description: true,
  updated_at: true
} satisfies Prisma.beatsSelect;

// Full select clause for detailed queries
const FULL_SELECT = {
  id: true,
  name: true,
  description: true,
  updated_at: true,
  categories: {
    select: {
      id: true,
      name: true,
      color: true,
      description: true
    }
  },
  countries: {
    select: {
      id: true,
      name: true,
      code: true,
      flag_emoji: true
    }
  },
  _count: {
    select: {
      media_contacts: true
    }
  }
} satisfies Prisma.beatsSelect;

export class BeatsRepository extends BasePrismaRepository<Beat, CreateBeatData, UpdateBeatData, BeatsFilters> 
  implements NamedRepository<Beat, CreateBeatData, UpdateBeatData, BeatsFilters> {

  protected get model() {
    return this.prisma.beats;
  }

  protected get selectClause() {
    return FULL_SELECT;
  }

  protected mapToEntity(data: any): Beat {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      categories: data.categories || [],
      countries: data.countries || [],
      contactCount: data._count?.media_contacts || 0,
      updatedAt: data.updated_at
    };
  }

  protected mapCreateData(data: CreateBeatData): any {
    const baseData = {
      name: data.name,
      description: data.description || null
    };

    // Handle relationships
    const connections: any = {};
    
    if (data.categoryIds && data.categoryIds.length > 0) {
      connections.categories = { connect: data.categoryIds.map(id => ({ id })) };
    }
    
    if (data.countryIds && data.countryIds.length > 0) {
      connections.countries = { connect: data.countryIds.map(id => ({ id })) };
    }

    return {
      ...baseData,
      ...connections
    };
  }

  protected mapUpdateData(data: UpdateBeatData): any {
    const baseData: any = {};
    
    if (data.name !== undefined) baseData.name = data.name;
    if (data.description !== undefined) baseData.description = data.description || null;

    // Handle category relationships if provided
    if (data.categoryIds !== undefined) {
      baseData.categories = {
        set: data.categoryIds.map(id => ({ id }))
      };
    }
    
    // Handle country relationships if provided
    if (data.countryIds !== undefined) {
      baseData.countries = {
        set: data.countryIds.map(id => ({ id }))
      };
    }

    return baseData;
  }

  protected buildWhereClause(filters?: BeatsFilters): Prisma.beatsWhereInput {
    if (!filters) return {};

    const where: Prisma.beatsWhereInput = {};
    const conditions: Prisma.beatsWhereInput[] = [];

    // Search filter
    if (filters.search) {
      conditions.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } }
        ]
      });
    }

    // Category filter
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      conditions.push({
        categories: {
          some: {
            id: { in: filters.categoryIds }
          }
        }
      });
    }
    
    // Country filter
    if (filters.countryIds && filters.countryIds.length > 0) {
      conditions.push({
        countries: {
          some: {
            id: { in: filters.countryIds }
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

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    return where;
  }

  protected getDefaultOrderBy(): Prisma.beatsOrderByWithRelationInput {
    return { name: 'asc' };
  }

  // Implement NamedRepository interface
  async findByName(name: string): Promise<Beat | null> {
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
   * Get beats with usage statistics
   */
  async findWithStats(): Promise<Beat[]> {
    const cacheKey = CacheKeys.beats.stats();
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const data = await this.model.findMany({
          select: {
            ...FULL_SELECT,
            _count: {
              select: {
                media_contacts: true,
                categories: true
              }
            }
          },
          orderBy: [{ name: 'asc' }]
        });

        return data.map(item => ({
          ...this.mapToEntity(item),
          contactCount: item._count.media_contacts,
          categoryCount: item._count.categories
        }));
      },
      getDynamicTTL('stats')
    );
  }

  /**
   * Optimized findAll with performance enhancements
   */
  async findAll(filters?: BeatsFilters, pagination?: PaginationParams): Promise<PaginatedResult<Beat>> {
    const { page, pageSize, skip, take } = this.calculatePagination(pagination);
    const whereClause = this.buildWhereClause(filters);
    
    const cacheKey = CacheKeys.beats.all(filters, page, pageSize);
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        // Parallel execution for better performance
        const [data, totalCount] = await Promise.all([
          this.model.findMany({
            where: whereClause,
            select: this.selectClause,
            skip,
            take,
            orderBy: this.getDefaultOrderBy()
          }),
          this.model.count({ where: whereClause })
        ]);

        const entities = data.map((item: any) => this.mapToEntity(item));
        return this.createPaginatedResult(entities, totalCount, { page, pageSize });
      },
      getDynamicTTL('default')
    );
  }

  /**
   * Optimized search with caching
   */
  async search(query: string, limit = 10): Promise<Beat[]> {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = CacheKeys.beats.search(query.toLowerCase(), limit);
    return cacheService.getOrSet(
      cacheKey,
      async () => {
        // Use database search for better performance
        const data = await this.model.findMany({
          where: {
            OR: [
              { name: { contains: query.trim(), mode: 'insensitive' } },
              { description: { contains: query.trim(), mode: 'insensitive' } }
            ]
          },
          select: SEARCH_VIEW_SELECT,
          orderBy: { name: 'asc' },
          take: limit
        });

        return data.map(item => this.mapToEntity(item));
      },
      getDynamicTTL('search')
    );
  }

  /**
   * Batch operations for improved performance
   */
  async createMany(beats: CreateBeatData[]): Promise<Beat[]> {
    const results: Beat[] = [];
    
    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < beats.length; i += BATCH_SIZE) {
      const batch = beats.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(beat => this.create(beat))
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
    cacheService.clearByPrefix('beats_');
  }

  /**
   * Override create to clear cache
   */
  async create(data: CreateBeatData): Promise<Beat> {
    const result = await super.create(data);
    this.clearCache();
    return result;
  }

  /**
   * Override update to clear cache
   */
  async update(id: string, data: UpdateBeatData): Promise<Beat> {
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