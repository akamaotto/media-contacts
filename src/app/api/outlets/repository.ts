/**
 * Outlets Repository Implementation with Performance Optimizations
 * Following the established pattern from beats and categories
 */

import { Prisma } from '@prisma/client';
import { BasePrismaRepository } from '../shared/base-repository';
import { NamedRepository } from '../shared/repository.interface';
import { Outlet, CreateOutletData, UpdateOutletData, OutletsFilters } from './types';
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
  publisherId: true,
  updated_at: true
} satisfies Prisma.outletsSelect;

// Full select clause for detailed queries
const FULL_SELECT = {
  id: true,
  name: true,
  description: true,
  website: true,
  publisherId: true,
  updated_at: true,
  publishers: {
    select: {
      id: true,
      name: true,
      description: true,
      website: true
    }
  },
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
} satisfies Prisma.outletsSelect;

export class OutletsRepository extends BasePrismaRepository<Outlet, CreateOutletData, UpdateOutletData, OutletsFilters, any> 
  implements NamedRepository<Outlet, CreateOutletData, UpdateOutletData, OutletsFilters> {

  protected get model() {
    return this.prisma.outlets;
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

  protected mapToEntity(data: any): Outlet {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      website: data.website,
      publisherId: data.publisherId,
      publisher: data.publishers || null,
      categories: data.categories || [],
      countries: data.countries || [],
      contactCount: data._count?.media_contacts || 0,
      updatedAt: data.updated_at
    };
  }

  protected mapCreateData(data: CreateOutletData): any {
    // Create a new object with explicit typing to ensure all properties are recognized
    const createData: {
      name: string;
      description?: string;
      website?: string;
      publisherId?: string | null;
      categoryIds?: string[];
      countryIds?: string[];
    } = data;
    
    const baseData = {
      name: createData.name,
      description: createData.description || null,
      website: createData.website || null,
      publisherId: createData.publisherId || null
    };

    // Handle relationships
    const connections: any = {};
    
    if (createData.categoryIds && createData.categoryIds.length > 0) {
      connections.categories = { connect: createData.categoryIds.map((id: string) => ({ id })) };
    }
    
    if (createData.countryIds && createData.countryIds.length > 0) {
      connections.countries = { connect: createData.countryIds.map((id: string) => ({ id })) };
    }

    return {
      ...baseData,
      ...connections
    };
  }

  protected mapUpdateData(data: UpdateOutletData): any {
    // Create a new object with explicit typing to ensure all properties are recognized
    const updateData: {
      name?: string;
      description?: string | null;
      website?: string | null;
      publisherId?: string | null;
      categoryIds?: string[];
      countryIds?: string[];
    } = data;
    
    const baseData: any = {};
    
    if (updateData.name !== undefined) baseData.name = updateData.name;
    if (updateData.description !== undefined) baseData.description = updateData.description || null;
    if (updateData.website !== undefined) baseData.website = updateData.website || null;
    if (updateData.publisherId !== undefined) baseData.publisherId = updateData.publisherId;

    // Handle category relationships if provided
    if (updateData.categoryIds !== undefined) {
      baseData.categories = {
        set: updateData.categoryIds.map((id: string) => ({ id }))
      };
    }
    
    // Handle country relationships if provided
    if (updateData.countryIds !== undefined) {
      baseData.countries = {
        set: updateData.countryIds.map((id: string) => ({ id }))
      };
    }

    return baseData;
  }

  protected buildWhereClause(filters?: OutletsFilters): Prisma.outletsWhereInput {
    if (!filters) return {};

    const where: Prisma.outletsWhereInput = {};
    const conditions: Prisma.outletsWhereInput[] = [];

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

    // Publisher filter
    if (filters.publisherId) {
      conditions.push({
        publisherId: filters.publisherId
      });
    }

    // Has publisher filter
    if (filters.hasPublisher !== undefined) {
      if (filters.hasPublisher) {
        conditions.push({
          publisherId: { not: null }
        });
      } else {
        conditions.push({
          publisherId: null
        });
      }
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

  protected getDefaultOrderBy(): Prisma.outletsOrderByWithRelationInput {
    return { name: 'asc' };
  }

  // Implement NamedRepository interface
  async findByName(name: string): Promise<Outlet | null> {
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
   * Get outlets with usage statistics
   */
  async findWithStats(): Promise<Outlet[]> {
    const cached = cacheService.get<Outlet[]>(CacheKeys.outlets.stats());
    if (cached) {
      return cached;
    }

    const data = await this.model.findMany({
      select: {
        ...FULL_SELECT,
        _count: {
          select: {
            media_contacts: true,
            categories: true,
            countries: true
          }
        }
      },
      orderBy: [{ name: 'asc' }]
    });

    const result = data.map(item => this.mapToEntity(item));
    
    // Cache stats for 10 minutes
    cacheService.set(CacheKeys.outlets.stats(), result, 600);
    return result;
  }

  /**
   * Search outlets by name, description, or website
   */
  async search(query: string, limit = 10): Promise<Outlet[]> {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = CacheKeys.outlets.search(query.toLowerCase(), limit);
    const cached = cacheService.get<Outlet[]>(cacheKey);
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
   * Get outlets by publisher
   */
  async findByPublisher(publisherId: string): Promise<Outlet[]> {
    const cacheKey = CacheKeys.outlets.byPublisher(publisherId);
    const cached = cacheService.get<Outlet[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const data = await this.model.findMany({
      where: { publisherId },
      select: this.selectClause,
      orderBy: { name: 'asc' }
    });

    const result = data.map(item => this.mapToEntity(item));
    
    // Cache publisher outlets for 5 minutes
    cacheService.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Get outlets without publishers (available for assignment)
   */
  async findAvailable(): Promise<Outlet[]> {
    const cacheKey = CacheKeys.outlets.available();
    const cached = cacheService.get<Outlet[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const data = await this.model.findMany({
      where: { publisherId: null },
      select: this.minimalSelectClause,
      orderBy: { name: 'asc' }
    });

    const result = data.map(item => this.mapToEntity(item));
    
    // Cache available outlets for 5 minutes
    cacheService.set(cacheKey, result, 300);
    return result;
  }

  /**
   * Override create to clear cache
   */
  async create(data: CreateOutletData): Promise<Outlet> {
    const result = await super.create(data);
    this.clearCache();
    return result;
  }

  /**
   * Override update to clear cache
   */
  async update(id: string, data: UpdateOutletData): Promise<Outlet> {
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
    cacheService.clearByPrefix('outlets_');
    // Also clear publishers cache since they reference outlets
    cacheService.clearByPrefix('publishers_');
    // Clear dashboard cache that might include outlet metrics
    cacheService.clearByPrefix('dashboard_');
  }
}