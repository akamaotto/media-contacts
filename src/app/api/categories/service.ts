/**
 * Categories Service - Business logic and validation
 */

import { BaseServiceImpl } from '../shared/base-service';
import { Category, CreateCategoryData, UpdateCategoryData, CategoriesFilters } from './types';
import { CategoriesRepository } from './repository';
import { CategoriesEvents } from './events';
import { RequestContext } from '../shared/types';
import { APIError } from '../shared/errors';

export class CategoriesService extends BaseServiceImpl<Category, CreateCategoryData, UpdateCategoryData, CategoriesFilters> {
  
  constructor(
    repository: CategoriesRepository,
    private events: CategoriesEvents
  ) {
    super(repository);
  }

  protected async validatePermissions(operation: 'read' | 'create' | 'update' | 'delete', context?: RequestContext): Promise<void> {
    if (!context) {
      throw APIError.unauthorized();
    }

    // For now, all authenticated users can read categories
    if (operation === 'read') {
      return;
    }

    // Create, update, delete require authentication
    if (!context.userId) {
      throw APIError.unauthorized();
    }

    // Add role-based permissions later if needed
    // For now, all authenticated users can manage categories
  }

  protected async validateData(data: CreateCategoryData | UpdateCategoryData, operation: 'create' | 'update'): Promise<void> {
    if (operation === 'create') {
      const createData = data as CreateCategoryData;
      
      if (!createData.name || createData.name.trim().length === 0) {
        throw APIError.validation('Category name is required');
      }

      if (createData.name.trim().length > 100) {
        throw APIError.validation('Category name must be less than 100 characters');
      }

      // Check for duplicate names
      const repository = this.repository as CategoriesRepository;
      const existing = await repository.findByName(createData.name.trim());
      if (existing) {
        throw APIError.conflict(`Category with name "${createData.name}" already exists`);
      }
    } else {
      const updateData = data as UpdateCategoryData;
      
      if (updateData.name !== undefined) {
        if (!updateData.name || updateData.name.trim().length === 0) {
          throw APIError.validation('Category name cannot be empty');
        }

        if (updateData.name.trim().length > 100) {
          throw APIError.validation('Category name must be less than 100 characters');
        }
      }
    }

    if (data.description && data.description.length > 500) {
      throw APIError.validation('Category description must be less than 500 characters');
    }

    if (data.color && !/^#[0-9A-F]{6}$/i.test(data.color)) {
      throw APIError.validation('Color must be a valid hex color (e.g., #3B82F6)');
    }
  }

  protected async onCreated(entity: Category, context: RequestContext): Promise<void> {
    await this.events.onCreated(entity, context);
  }

  protected async onUpdated(entity: Category, originalData: Category, context: RequestContext): Promise<void> {
    await this.events.onUpdated(entity, originalData, context);
  }

  protected async onDeleted(id: string, context: RequestContext): Promise<void> {
    await this.events.onDeleted(id, context);
  }

  /**
   * Search categories by name
   */
  async searchCategories(query: string, limit = 10, context?: RequestContext): Promise<Category[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as CategoriesRepository;
    return repository.search(query, limit);
  }

  /**
   * Get categories with usage statistics
   */
  async getCategoriesWithStats(context?: RequestContext): Promise<Category[]> {
    await this.validatePermissions('read', context);
    
    const repository = this.repository as CategoriesRepository;
    return repository.findWithStats();
  }

  /**
   * Check if category name is available
   */
  async isNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    const repository = this.repository as CategoriesRepository;
    const existing = await repository.findByName(name.trim());
    
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    
    return false;
  }

  /**
   * Override update to handle name conflicts
   */
  async update(id: string, data: UpdateCategoryData, context: RequestContext): Promise<Category> {
    // Additional validation for updates with name changes
    if (data.name) {
      const isAvailable = await this.isNameAvailable(data.name, id);
      if (!isAvailable) {
        throw APIError.conflict(`Category with name "${data.name}" already exists`);
      }
    }

    return super.update(id, data, context);
  }
}