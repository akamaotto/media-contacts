/**
 * Outlets Service - Business logic and validation
 * Following the established pattern from beats and categories
 */

import { BaseServiceImpl } from '../shared/base-service';
import { Outlet, CreateOutletData, UpdateOutletData, OutletsFilters } from './types';
import { OutletsRepository } from './repository';
import { OutletsEvents } from './events';
import { RequestContext } from '../shared/types';
import { APIError } from '../shared/errors';

export class OutletsService extends BaseServiceImpl<Outlet, CreateOutletData, UpdateOutletData, OutletsFilters> {
  
  constructor(
    repository: OutletsRepository,
    private events: OutletsEvents
  ) {
    super(repository);
  }

  protected async validatePermissions(operation: 'read' | 'create' | 'update' | 'delete', context?: RequestContext): Promise<void> {
    if (!context) {
      throw APIError.unauthorized();
    }

    // For now, all authenticated users can read outlets
    if (operation === 'read') {
      return;
    }

    // Create, update, delete require authentication
    if (!context.userId) {
      throw APIError.unauthorized();
    }

    // Add role-based permissions later if needed
    // For now, all authenticated users can manage outlets
  }

  protected async validateData(data: CreateOutletData | UpdateOutletData, operation: 'create' | 'update'): Promise<void> {
    if (operation === 'create') {
      const createData = data as CreateOutletData;
      
      // Check for duplicate names
      const repository = this.repository as OutletsRepository;
      const existing = await repository.findByName(createData.name);
      if (existing) {
        throw APIError.validation(`An outlet with the name \"${createData.name}\" already exists`);
      }
    }

    if (operation === 'update') {
      const updateData = data as UpdateOutletData;
      
      if (updateData.name) {
        // Validate name length and uniqueness for updates
        if (updateData.name.trim().length === 0) {
          throw APIError.validation('Outlet name cannot be empty');
        }

        if (updateData.name.trim().length > 100) {
          throw APIError.validation('Outlet name must be less than 100 characters');
        }
      }
    }

    // Validate common optional properties - use any to bypass TypeScript union issues
    const anyData = data as any;
    if (anyData.description && anyData.description.length > 1000) {
      throw APIError.validation('Outlet description must be less than 1000 characters');
    }

    if (anyData.website && anyData.website.trim() !== '') {
      // Basic URL validation
      try {
        new URL(anyData.website);
      } catch {
        throw APIError.validation('Outlet website must be a valid URL');
      }
    }
  }

  protected async onCreated(entity: Outlet, context: RequestContext): Promise<void> {
    await this.events.onCreated(entity, context);
  }

  protected async onUpdated(entity: Outlet, originalData: Outlet, context: RequestContext): Promise<void> {
    await this.events.onUpdated(entity, originalData, context);
  }

  protected async onDeleted(id: string, context: RequestContext): Promise<void> {
    await this.events.onDeleted(id, context);
  }

  /**
   * Search outlets by name, description, or website
   */
  async searchOutlets(query: string, limit = 10, context?: RequestContext): Promise<Outlet[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as OutletsRepository;
    return repository.search(query, limit);
  }

  /**
   * Get outlets with usage statistics
   */
  async getOutletsWithStats(context?: RequestContext): Promise<Outlet[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as OutletsRepository;
    return repository.findWithStats();
  }

  /**
   * Get outlets by publisher
   */
  async getOutletsByPublisher(publisherId: string, context?: RequestContext): Promise<Outlet[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as OutletsRepository;
    return repository.findByPublisher(publisherId);
  }

  /**
   * Get outlets available for publisher assignment (without publishers)
   */
  async getAvailableOutlets(context?: RequestContext): Promise<Outlet[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as OutletsRepository;
    return repository.findAvailable();
  }

  /**
   * Check if outlet name is available
   */
  async isNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    const repository = this.repository as OutletsRepository;
    const existing = await repository.findByName(name.trim());
    
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    
    return false;
  }

  /**
   * Bulk operations for data migration or import
   */
  async createMany(outlets: CreateOutletData[], context: RequestContext): Promise<Outlet[]> {
    await this.validatePermissions('create', context);
    
    const results: Outlet[] = [];
    
    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    for (let i = 0; i < outlets.length; i += BATCH_SIZE) {
      const batch = outlets.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(outlet => this.create(outlet, context))
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Assign publisher to multiple outlets
   */
  async assignPublisherToOutlets(publisherId: string, outletIds: string[], context: RequestContext): Promise<Outlet[]> {
    await this.validatePermissions('update', context);
    
    const results: Outlet[] = [];
    
    for (const outletId of outletIds) {
      const updated = await this.update(outletId, { publisherId } as any, context);
      results.push(updated);
    }
    
    return results;
  }

  /**
   * Remove publisher from multiple outlets
   */
  async removePublisherFromOutlets(outletIds: string[], context: RequestContext): Promise<Outlet[]> {
    await this.validatePermissions('update', context);
    
    const results: Outlet[] = [];
    
    for (const outletId of outletIds) {
      const updated = await this.update(outletId, { publisherId: null } as any, context);
      results.push(updated);
    }
    
    return results;
  }
}