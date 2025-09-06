/**
 * Regions Service - Business logic and validation
 */

import { BaseServiceImpl } from '../shared/base-service';
import { Region, CreateRegionData, UpdateRegionData, RegionsFilters } from './types';
import { RegionsRepository } from './repository';
import { RegionsEvents } from './events';
import { RequestContext } from '../shared/types';
import { APIError } from '../shared/errors';


export class RegionsService extends BaseServiceImpl<Region, CreateRegionData, UpdateRegionData, RegionsFilters> {
  
  constructor(
    repository: RegionsRepository,
    private events: RegionsEvents
  ) {
    super(repository);
  }

  protected async validatePermissions(operation: 'read' | 'create' | 'update' | 'delete', context?: RequestContext): Promise<void> {
    if (!context) {
      throw APIError.unauthorized();
    }

    // For now, all authenticated users can read regions
    if (operation === 'read') {
      return;
    }

    // Create, update, delete require authentication
    if (!context.userId) {
      throw APIError.unauthorized();
    }

    // Add role-based permissions later if needed
    // For now, all authenticated users can manage regions
  }

  protected async validateData(data: CreateRegionData | UpdateRegionData, operation: 'create' | 'update'): Promise<void> {
    // For create operations, check if region with same name or code already exists
    if (operation === 'create') {
      const createData = data as CreateRegionData;
      
      const existingByName = await (this.repository as RegionsRepository).findByName(createData.name);
      if (existingByName) {
        throw APIError.conflict(`Region with name '${createData.name}' already exists`);
      }

      const existingByCode = await (this.repository as RegionsRepository).findByCode(createData.code);
      if (existingByCode) {
        throw APIError.conflict(`Region with code '${createData.code}' already exists`);
      }
    }

    // For update operations, check if updating to a name or code that already exists
    if (operation === 'update') {
      const updateData = data as UpdateRegionData;
      
      // We need the ID for update operations
      if (!('id' in updateData)) {
        throw APIError.validation('ID is required for update operations');
      }
      
      const id = (updateData as any).id;
      const existing = await this.repository.findById(id);
      if (!existing) {
        throw APIError.notFound('Region not found');
      }

      if (updateData.name !== undefined && updateData.name !== existing.name) {
        const existingByName = await (this.repository as RegionsRepository).findByName(updateData.name);
        if (existingByName) {
          throw APIError.conflict(`Region with name '${updateData.name}' already exists`);
        }
      }

      if (updateData.category !== undefined && updateData.category !== existing.category) {
        // Additional validation for category changes if needed
      }
    }

    // Validate code format for create operations
    if (operation === 'create') {
      const createData = data as CreateRegionData;
      if (!/^[A-Z0-9_]+$/.test(createData.code)) {
        throw APIError.validation('Code must contain only uppercase letters, numbers, and underscores');
      }
    }

    // Validate code format for update operations when code is being updated
    if (operation === 'update' && 'code' in data && data.code) {
      if (!/^[A-Z0-9_]+$/.test(data.code)) {
        throw APIError.validation('Code must contain only uppercase letters, numbers, and underscores');
      }
    }
  }

  async create(data: CreateRegionData, context: RequestContext): Promise<Region> {
    await this.validatePermissions('create', context);
    await this.validateData(data, 'create');

    const region = await this.repository.create(data);
    await this.onCreated(region, context);

    return region;
  }

  async update(id: string, data: UpdateRegionData, context: RequestContext): Promise<Region> {
    await this.validatePermissions('update', context);
    // Pass the ID separately for validation rather than adding it to the data object
    await this.validateData({ ...data, id: id } as any, 'update');

    // Get original data for comparison
    const originalRegion = await this.repository.findById(id);
    if (!originalRegion) {
      throw APIError.notFound('Region not found');
    }

    const updatedRegion = await this.repository.update(id, data);
    await this.onUpdated(updatedRegion, originalRegion, context);

    return updatedRegion;
  }

  async delete(id: string, context: RequestContext): Promise<void> {
    await this.validatePermissions('delete', context);

    const exists = await this.repository.exists(id);
    if (!exists) {
      throw APIError.notFound('Region not found');
    }

    // Check if region is in use by countries
    const region = await this.repository.findById(id);
    if (region && 'countryCount' in region && region.countryCount && region.countryCount > 0) {
      throw APIError.conflict('Cannot delete region that is in use by countries');
    }

    await this.repository.delete(id);
    await this.onDeleted(id, context);
  }

  async getRegionsByCategory(category: string, context?: RequestContext): Promise<Region[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as RegionsRepository;
    return await repository.findByCategory(category);
  }

  /**
   * Handle post-creation events
   */
  protected async onCreated(entity: Region, context: RequestContext): Promise<void> {
    await this.events.onCreated(entity, context);
  }

  /**
   * Handle post-update events
   */
  protected async onUpdated(entity: Region, originalData: Region, context: RequestContext): Promise<void> {
    await this.events.onUpdated(entity, originalData, context);
  }

  /**
   * Handle post-deletion events
   */
  protected async onDeleted(id: string, context: RequestContext): Promise<void> {
    await this.events.onDeleted(id, context);
  }
}