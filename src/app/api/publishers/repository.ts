/**
 * Publishers Repository Implementation with Performance Optimizations
 * Following the established pattern from beats and categories
 */

import { Prisma } from '@prisma/client';
import { BasePrismaRepository } from '../shared/base-repository';
import { NamedRepository } from '../shared/repository.interface';
import { Publisher, CreatePublisherData, UpdatePublisherData, PublishersFilters } from './types';
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
  website: true,
  updated_at: true
} satisfies Prisma.publishersSelect;

// Full select clause for detailed queries
const FULL_SELECT = {
  id: true,
  name: true,
  description: true,
  website: true,
  updated_at: true,
  outlets: {
    select: {
      id: true,
      name: true,
      description: true,
      website: true
    }
  },
  _count: {
    select: {
      outlets: true
    }
  }
} satisfies Prisma.publishersSelect;

export class PublishersRepository extends BasePrismaRepository<Publisher, CreatePublisherData, UpdatePublisherData, PublishersFilters> 
  implements NamedRepository<Publisher, CreatePublisherData, UpdatePublisherData, PublishersFilters> {

  protected get model() {
    return this.prisma.publishers;
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

  protected mapToEntity(data: any): Publisher {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      website: data.website,
      outlets: data.outlets || [],
      outletCount: data._count?.outlets || 0,
      updatedAt: data.updated_at
    };
  }

  protected mapCreateData(data: CreatePublisherData): any {
    const baseData = {
      name: data.name,
      description: data.description || null,
      website: data.website || null
    };

    // Handle outlet relationships if provided
    const connections: any = {};
    
    if (data.outletIds && data.outletIds.length > 0) {
      connections.outlets = { connect: data.outletIds.map(id => ({ id })) };
    }

    return {
      ...baseData,
      ...connections
    };
  }

  protected mapUpdateData(data: UpdatePublisherData): any {
    const baseData: any = {};
    
    if (data.name !== undefined) baseData.name = data.name;
    if (data.description !== undefined) baseData.description = data.description || null;
    if (data.website !== undefined) baseData.website = data.website || null;

    // Handle outlet relationships if provided
    if (data.outletIds !== undefined) {
      baseData.outlets = {
        set: data.outletIds.map(id => ({ id }))
      };
    }

    return baseData;
  }

  protected buildWhereClause(filters?: PublishersFilters): Prisma.publishersWhereInput {
    if (!filters) return {};

    const where: Prisma.publishersWhereInput = {};
    const conditions: Prisma.publishersWhereInput[] = [];

    // Search filter
    if (filters.search) {
      conditions.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { website: { contains: filters.search, mode: 'insensitive' } }
        ]
      });
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

  protected getDefaultOrderBy(): Prisma.publishersOrderByWithRelationInput {
    return { name: 'asc' };
  }

  // Implement NamedRepository interface
  async findByName(name: string): Promise<Publisher | null> {
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
   * Get publishers with usage statistics
   */
  async findWithStats(): Promise<Publisher[]> {
    const cached = cacheService.get<Publisher[]>(CacheKeys.publishers.stats());
    if (cached) {
      return cached;
    }

    const data = await this.model.findMany({
      select: {
        ...FULL_SELECT,
        _count: {
          select: {
            outlets: true
          }
        }
      },
      orderBy: [{ name: 'asc' }]
    });

    const result = data.map(item => this.mapToEntity(item));
    
    // Cache stats for 10 minutes
    cacheService.set(CacheKeys.publishers.stats(), result, 600);
    return result;
  }

  /**
   * Search publishers by name, description, or website
   */
  async search(query: string, limit = 10): Promise<Publisher[]> {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = CacheKeys.publishers.search(query.toLowerCase(), limit);
    const cached = cacheService.get<Publisher[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use database search for better performance
    const data = await this.model.findMany({
      where: {
        OR: [
          { name: { contains: query.trim(), mode: 'insensitive' } },
          { description: { contains: query.trim(), mode: 'insensitive' } },
          { website: { contains: query.trim(), mode: 'insensitive' } }
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
   * Get publishers without any outlets (available for assignment)
   */
  async findAvailable(): Promise<Publisher[]> {
    const cacheKey = CacheKeys.publishers.available();
    const cached = cacheService.get<Publisher[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const data = await this.model.findMany({
      where: {
        outlets: {
          none: {}
        }
      },
      select: this.minimalSelectClause,
      orderBy: { name: 'asc' }
    });

    const result = data.map(item => this.mapToEntity(item));
    
    // Cache available publishers for 5 minutes
    cacheService.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Override create to clear cache
   */
  async create(data: CreatePublisherData): Promise<Publisher> {
    const result = await super.create(data);
    this.clearCache();
    return result;
  }

  /**
   * Override update to clear cache
   */
  async update(id: string, data: UpdatePublisherData): Promise<Publisher> {
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

  /**
   * Clear cache when data is modified
   */
  private clearCache(): void {
    cacheService.clearByPrefix('publishers_');
    // Also clear outlets cache since they reference publishers
    cacheService.clearByPrefix('outlets_');
  }
}