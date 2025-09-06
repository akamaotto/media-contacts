/**
 * Publishers Service - Business logic and validation
 * Following the established pattern from beats and categories
 */

import { BaseServiceImpl } from '../shared/base-service';
import { Publisher, CreatePublisherData, UpdatePublisherData, PublishersFilters } from './types';
import { PublishersRepository } from './repository';
import { PublishersEvents } from './events';
import { RequestContext } from '../shared/types';
import { APIError } from '../shared/errors';

export class PublishersService extends BaseServiceImpl<Publisher, CreatePublisherData, UpdatePublisherData, PublishersFilters> {
  
  constructor(
    repository: PublishersRepository,
    private events: PublishersEvents
  ) {
    super(repository);
  }

  protected async validatePermissions(operation: 'read' | 'create' | 'update' | 'delete', context?: RequestContext): Promise<void> {
    if (!context) {
      throw APIError.unauthorized();
    }

    // For now, all authenticated users can read publishers
    if (operation === 'read') {
      return;
    }

    // Create, update, delete require authentication
    if (!context.userId) {
      throw APIError.unauthorized();
    }

    // Add role-based permissions later if needed
    // For now, all authenticated users can manage publishers
  }

  protected async validateData(data: CreatePublisherData | UpdatePublisherData, operation: 'create' | 'update'): Promise<void> {
    if (operation === 'create') {
      const createData = data as CreatePublisherData;
      
      // Check for duplicate names
      const repository = this.repository as PublishersRepository;
      const existing = await repository.findByName(createData.name);
      if (existing) {
        throw APIError.validation(`A publisher with the name "${createData.name}" already exists`);
      }
    }

    if (operation === 'update') {
      const updateData = data as UpdatePublisherData;
      
      if (updateData.name) {
        // Validate name length and uniqueness for updates
        if (updateData.name.trim().length === 0) {
          throw APIError.validation('Publisher name cannot be empty');
        }

        if (updateData.name.trim().length > 100) {
          throw APIError.validation('Publisher name must be less than 100 characters');
        }
      }
    }

    if (data.description && data.description.length > 500) {
      throw APIError.validation('Publisher description must be less than 500 characters');
    }

    if (data.website && data.website.trim() !== '') {
      // Basic URL validation
      try {
        new URL(data.website);
      } catch {
        throw APIError.validation('Publisher website must be a valid URL');
      }
    }
  }

  protected async onCreated(entity: Publisher, context: RequestContext): Promise<void> {
    await this.events.onCreated(entity, context);
  }

  protected async onUpdated(entity: Publisher, originalData: Publisher, context: RequestContext): Promise<void> {
    await this.events.onUpdated(entity, originalData, context);
  }

  protected async onDeleted(id: string, context: RequestContext): Promise<void> {
    await this.events.onDeleted(id, context);
  }

  /**
   * Search publishers by name, description, or website
   */
  async searchPublishers(query: string, limit = 10, context?: RequestContext): Promise<Publisher[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as PublishersRepository;
    return repository.search(query, limit);
  }

  /**
   * Get publishers with usage statistics
   */
  async getPublishersWithStats(context?: RequestContext): Promise<Publisher[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as PublishersRepository;
    return repository.findWithStats();
  }

  /**
   * Get publishers available for outlet assignment (without outlets)
   */
  async getAvailablePublishers(context?: RequestContext): Promise<Publisher[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as PublishersRepository;
    return repository.findAvailable();
  }

  /**
   * Check if publisher name is available
   */
  async isNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    const repository = this.repository as PublishersRepository;
    const existing = await repository.findByName(name.trim());
    
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    
    return false;
  }

  /**
   * Bulk operations for data migration or import
   */
  async createMany(publishers: CreatePublisherData[], context: RequestContext): Promise<Publisher[]> {
    await this.validatePermissions('create', context);
    
    const results: Publisher[] = [];
    
    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;
    for (let i = 0; i < publishers.length; i += BATCH_SIZE) {
      const batch = publishers.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(publisher => this.create(publisher, context))
      );
      
      results.push(...batchResults);
    }
    
    return results;
  }
}