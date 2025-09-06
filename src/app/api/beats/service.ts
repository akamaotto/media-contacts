/**
 * Beats Service Implementation
 */

import { BaseServiceImpl } from '../shared/base-service';
import { RequestContext } from '../shared/types';
import { APIError } from '../shared/errors';
import { Beat, CreateBeatData, UpdateBeatData, BeatsFilters } from './types';
import { BeatsRepository } from './repository';
import { BeatsEvents } from './events';

export class BeatsService extends BaseServiceImpl<Beat, CreateBeatData, UpdateBeatData, BeatsFilters> {
  
  constructor(
    repository: BeatsRepository,
    private events: BeatsEvents
  ) {
    super(repository);
  }

  protected async validatePermissions(operation: 'read' | 'create' | 'update' | 'delete', context?: RequestContext): Promise<void> {
    // Allow unauthenticated read access for beats
    if (operation === 'read') {
      return;
    }
    
    if (!context) {
      throw APIError.unauthorized();
    }

    // Create, update, delete require authentication
    if (!context.userId) {
      throw APIError.unauthorized();
    }

    // Add role-based permissions later if needed
    // For now, all authenticated users can manage beats
  }

  protected async validateData(data: CreateBeatData | UpdateBeatData, operation: 'create' | 'update'): Promise<void> {
    if (operation === 'create') {
      const createData = data as CreateBeatData;
      
      if (!createData.name || createData.name.trim().length === 0) {
        throw APIError.validation('Beat name is required');
      }

      if (createData.name.trim().length > 100) {
        throw APIError.validation('Beat name must be less than 100 characters');
      }

      // Check for duplicate names
      const repository = this.repository as BeatsRepository;
      const existing = await repository.findByName(createData.name.trim());
      if (existing) {
        throw APIError.conflict(`Beat with name "${createData.name}" already exists`);
      }
    } else {
      const updateData = data as UpdateBeatData;
      
      if (updateData.name !== undefined) {
        if (!updateData.name || updateData.name.trim().length === 0) {
          throw APIError.validation('Beat name cannot be empty');
        }

        if (updateData.name.trim().length > 100) {
          throw APIError.validation('Beat name must be less than 100 characters');
        }
      }
    }

    if (data.description && data.description.length > 250) {
      throw APIError.validation('Beat description must be less than 250 characters');
    }
  }

  protected async onCreated(entity: Beat, context: RequestContext): Promise<void> {
    await this.events.onCreated(entity, context);
  }

  protected async onUpdated(entity: Beat, originalData: Beat, context: RequestContext): Promise<void> {
    await this.events.onUpdated(entity, originalData, context);
  }

  protected async onDeleted(id: string, context: RequestContext): Promise<void> {
    await this.events.onDeleted(id, context);
  }

  /**
   * Search beats by name
   */
  async searchBeats(query: string, limit = 10, context?: RequestContext): Promise<Beat[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as BeatsRepository;
    return repository.search(query, limit);
  }

  /**
   * Get beats with usage statistics
   */
  async getBeatsWithStats(context?: RequestContext): Promise<Beat[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as BeatsRepository;
    return repository.findWithStats();
  }

  /**
   * Check if beat name is available
   */
  async isNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    const repository = this.repository as BeatsRepository;
    const existing = await repository.findByName(name.trim());
    
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    
    return false;
  }

  /**
   * Verify that country IDs exist before updating
   */
  private async verifyCountriesExist(countryIds: string[]): Promise<void> {
    if (!countryIds || countryIds.length === 0) return;
    
    try {
      const { prisma } = await import('@/lib/database/prisma');
      
      const existingCountries = await prisma.countries.findMany({
        where: {
          id: { in: countryIds }
        },
        select: {
          id: true,
          name: true
        }
      });
      
      const missingIds = countryIds.filter(id => !existingCountries.some(country => country.id === id));
      if (missingIds.length > 0) {
        throw new Error(`Countries not found: ${missingIds.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`Country verification failed:`, error);
      throw error;
    }
  }
  private async verifyCategoriesExist(categoryIds: string[]): Promise<void> {
    if (!categoryIds || categoryIds.length === 0) return;
    
    // Check if categories exist using the categories API
    try {
      const { prisma } = await import('@/lib/database/prisma');
      
      const existingCategories = await prisma.categories.findMany({
        where: {
          id: { in: categoryIds }
        },
        select: {
          id: true,
          name: true
        }
      });
      
      const missingIds = categoryIds.filter(id => !existingCategories.some(cat => cat.id === id));
      if (missingIds.length > 0) {
        throw new Error(`Categories not found: ${missingIds.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`Category verification failed:`, error);
      throw error;
    }
  }
  /**
   * Override create to handle relationship verification
   */
  async create(data: CreateBeatData, context: RequestContext): Promise<Beat> {
    // Verify related entities exist before creating
    if (data.categoryIds) {
      await this.verifyCategoriesExist(data.categoryIds);
    }
    
    if (data.countryIds) {
      await this.verifyCountriesExist(data.countryIds);
    }

    return super.create(data, context);
  }
  async update(id: string, data: UpdateBeatData, context: RequestContext): Promise<Beat> {
    // Verify categories exist before updating
    if (data.categoryIds) {
      await this.verifyCategoriesExist(data.categoryIds);
    }
    
    // Verify countries exist before updating
    if (data.countryIds) {
      await this.verifyCountriesExist(data.countryIds);
    }
    
    // Additional validation for updates with name changes
    if (data.name) {
      const isAvailable = await this.isNameAvailable(data.name, id);
      if (!isAvailable) {
        throw APIError.conflict(`Beat with name "${data.name}" already exists`);
      }
    }

    return super.update(id, data, context);
  }
}