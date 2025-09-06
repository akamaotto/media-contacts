/**
 * Media Contacts Repository Implementation with Performance Optimizations
 */

import { Prisma } from '@prisma/client';
import { BasePrismaRepository } from '../shared/base-repository';
import { NamedRepository } from '../shared/repository.interface';
import { MediaContact, CreateMediaContactData, UpdateMediaContactData, MediaContactsFilters } from './types';
import { cacheService, CacheKeys } from '../shared/cache-service';
import { PaginationParams, PaginatedResult } from '../shared/types';

// Performance optimizations
const BATCH_SIZE = 100;
const CACHE_TTL = 300; // 5 minutes

// Optimized select clause with minimal data
const MINIMAL_SELECT = {
  id: true,
  name: true,
  email: true,
  title: true,
  email_verified_status: true,
  updated_at: true
} satisfies Prisma.media_contactsSelect;

// Full select clause for detailed queries
const FULL_SELECT = {
  id: true,
  name: true,
  email: true,
  title: true,
  bio: true,
  email_verified_status: true,
  socials: true,
  authorLinks: true,
  updated_at: true,
  created_at: true,
  outlets: {
    select: {
      id: true,
      name: true,
      description: true,
      website: true
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
  beats: {
    select: {
      id: true,
      name: true,
      description: true
    }
  },
  _count: {
    select: {
      outlets: true,
      countries: true,
      beats: true
    }
  }
} satisfies Prisma.media_contactsSelect;

export class MediaContactsRepository extends BasePrismaRepository<MediaContact, CreateMediaContactData, UpdateMediaContactData, MediaContactsFilters> 
  implements NamedRepository<MediaContact, CreateMediaContactData, UpdateMediaContactData, MediaContactsFilters> {

  protected get model() {
    return this.prisma.media_contacts;
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

  protected mapToEntity(data: any): MediaContact {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      title: data.title,
      bio: data.bio,
      email_verified_status: data.email_verified_status,
      socials: data.socials,
      authorLinks: data.authorLinks,
      outlets: data.outlets || [],
      countries: data.countries || [],
      beats: data.beats || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  protected mapCreateData(data: CreateMediaContactData): any {
    const baseData = {
      name: data.name,
      email: data.email,
      title: data.title,
      bio: data.bio || null,
      email_verified_status: data.email_verified_status || false,
      socials: data.socials || [],
      authorLinks: data.authorLinks || []
    };

    // Handle relationships
    const connections: any = {};
    
    if (data.outletIds && data.outletIds.length > 0) {
      connections.outlets = { connect: data.outletIds.map(id => ({ id })) };
    }
    
    if (data.countryIds && data.countryIds.length > 0) {
      connections.countries = { connect: data.countryIds.map(id => ({ id })) };
    }
    
    if (data.beatIds && data.beatIds.length > 0) {
      connections.beats = { connect: data.beatIds.map(id => ({ id })) };
    }

    return {
      ...baseData,
      ...connections
    };
  }

  protected mapUpdateData(data: UpdateMediaContactData): any {
    const baseData: any = {};
    
    if (data.name !== undefined) baseData.name = data.name;
    if (data.email !== undefined) baseData.email = data.email;
    if (data.title !== undefined) baseData.title = data.title;
    if (data.bio !== undefined) baseData.bio = data.bio;
    if (data.email_verified_status !== undefined) baseData.email_verified_status = data.email_verified_status;
    if (data.socials !== undefined) baseData.socials = { set: data.socials };
    if (data.authorLinks !== undefined) baseData.authorLinks = { set: data.authorLinks };

    // Handle outlet relationships if provided
    if (data.outletIds !== undefined) {
      baseData.outlets = {
        set: data.outletIds.map(id => ({ id }))
      };
    }
    
    // Handle country relationships if provided
    if (data.countryIds !== undefined) {
      baseData.countries = {
        set: data.countryIds.map(id => ({ id }))
      };
    }
    
    // Handle beat relationships if provided
    if (data.beatIds !== undefined) {
      baseData.beats = {
        set: data.beatIds.map(id => ({ id }))
      };
    }

    return baseData;
  }

  protected buildWhereClause(filters?: MediaContactsFilters): Prisma.media_contactsWhereInput {
    if (!filters) return {};

    const where: Prisma.media_contactsWhereInput = {};
    const conditions: Prisma.media_contactsWhereInput[] = [];

    // Search filter
    if (filters.search) {
      conditions.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { title: { contains: filters.search, mode: 'insensitive' } }
        ]
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

    // Outlet filter
    if (filters.outletIds && filters.outletIds.length > 0) {
      conditions.push({
        outlets: {
          some: {
            id: { in: filters.outletIds }
          }
        }
      });
    }

    // Region filter (through countries)
    if (filters.regionCodes && filters.regionCodes.length > 0) {
      conditions.push({
        countries: { 
          some: { 
            regions: { 
              some: { 
                code: { in: filters.regionCodes } 
              } 
            } 
          } 
        }
      });
    }

    // Language filter (through countries)
    if (filters.languageCodes && filters.languageCodes.length > 0) {
      conditions.push({
        countries: { 
          some: { 
            languages: { 
              some: { 
                code: { in: filters.languageCodes } 
              } 
            } 
          } 
        }
      });
    }

    // Email verification filter
    if (filters.emailVerified && filters.emailVerified !== 'all') {
      conditions.push({
        email_verified_status: filters.emailVerified === 'verified'
      });
    }

    // Apply all conditions with AND logic
    if (conditions.length > 0) {
      where.AND = conditions;
    }

    return where;
  }

  protected getDefaultOrderBy(): Prisma.media_contactsOrderByWithRelationInput {
    return { updated_at: 'desc' };
  }

  /**
   * Build order by clause from sort parameters
   */
  protected buildOrderByClause(sortBy?: string, sortOrder?: 'asc' | 'desc'): Prisma.media_contactsOrderByWithRelationInput[] {
    // If no sort specified, use default
    if (!sortBy) {
      return [this.getDefaultOrderBy()];
    }

    // Define allowed sort keys to prevent SQL injection
    const allowedSortKeys = [
      'name',
      'email',
      'updated_at',
      'title'
    ];

    // Validate sort key
    if (!allowedSortKeys.includes(sortBy)) {
      console.warn(`Invalid sort key: ${sortBy}`);
      return [this.getDefaultOrderBy()];
    }

    // Map sort keys to Prisma fields
    const sortMap: Record<string, Prisma.media_contactsOrderByWithRelationInput> = {
      name: { name: sortOrder || 'asc' },
      email: { email: sortOrder || 'asc' },
      updated_at: { updated_at: sortOrder || 'desc' },
      title: { title: sortOrder || 'asc' }
    };

    return [sortMap[sortBy] || this.getDefaultOrderBy()];
  }

  // Implement NamedRepository interface
  async findByName(name: string): Promise<MediaContact | null> {
    const data = await this.model.findFirst({
      where: { name },
      select: this.selectClause
    });

    return data ? this.mapToEntity(data) : null;
  }

  async findByEmail(email: string): Promise<MediaContact | null> {
    const data = await this.model.findUnique({
      where: { email },
      select: this.selectClause
    });

    return data ? this.mapToEntity(data) : null;
  }

  async existsByName(name: string): Promise<boolean> {
    const result = await this.model.findFirst({
      where: { name },
      select: { id: true }
    });

    return !!result;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const result = await this.model.findUnique({
      where: { email },
      select: { id: true }
    });

    return !!result;
  }

  /**
   * Optimized findAll with performance enhancements
   */
  async findAll(filters?: MediaContactsFilters, pagination?: PaginationParams): Promise<PaginatedResult<MediaContact>> {
    const { page, pageSize, skip, take } = this.calculatePagination(pagination);
    const whereClause = this.buildWhereClause(filters);
    
    const cacheKey = CacheKeys.mediaContacts.all(filters, page, pageSize);
    const cached = cacheService.get<PaginatedResult<MediaContact>>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Always use full select to include relationships for UI display
    const selectClause = this.selectClause;

    // Parallel execution for better performance
    const [data, totalCount] = await Promise.all([
      this.model.findMany({
        where: whereClause,
        select: selectClause,
        skip,
        take,
        orderBy: this.buildOrderByClause(filters?.sortBy, filters?.sortOrder)
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
  async search(query: string, limit = 10): Promise<MediaContact[]> {
    if (!query || query.trim().length < 2) return [];

    const cacheKey = CacheKeys.mediaContacts.search(query.toLowerCase(), limit);
    const cached = cacheService.get<MediaContact[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Use database search for better performance
    const data = await this.model.findMany({
      where: {
        OR: [
          { name: { contains: query.trim(), mode: 'insensitive' } },
          { email: { contains: query.trim(), mode: 'insensitive' } },
          { title: { contains: query.trim(), mode: 'insensitive' } }
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
  async createMany(contacts: CreateMediaContactData[]): Promise<MediaContact[]> {
    const results: MediaContact[] = [];
    
    // Process in batches to avoid overwhelming the database
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(contact => this.create(contact))
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
    cacheService.clearByPrefix('media_contacts_');
  }

  /**
   * Override create to clear cache
   */
  async create(data: CreateMediaContactData): Promise<MediaContact> {
    const result = await super.create(data);
    this.clearCache();
    return result;
  }

  /**
   * Override update to clear cache
   */
  async update(id: string, data: UpdateMediaContactData): Promise<MediaContact> {
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