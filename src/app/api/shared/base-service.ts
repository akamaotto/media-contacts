/**
 * Base Service Interface and Implementation
 * Provides common business logic patterns for all services
 */

import { RequestContext, PaginationParams, PaginatedResult, CRUDFilters } from './types';
import { BaseRepository } from './repository.interface';

export interface BaseService<TEntity, TCreateData, TUpdateData, TFilters extends CRUDFilters = CRUDFilters> {
  /**
   * Get all entities with filtering and pagination
   */
  getAll(filters?: TFilters, pagination?: PaginationParams, context?: RequestContext): Promise<PaginatedResult<TEntity>>;

  /**
   * Get entity by ID
   */
  getById(id: string, context?: RequestContext): Promise<TEntity | null>;

  /**
   * Create new entity
   */
  create(data: TCreateData, context: RequestContext): Promise<TEntity>;

  /**
   * Update existing entity
   */
  update(id: string, data: TUpdateData, context: RequestContext): Promise<TEntity>;

  /**
   * Delete entity
   */
  delete(id: string, context: RequestContext): Promise<void>;
}

/**
 * Abstract base service implementation
 */
export abstract class BaseServiceImpl<
  TEntity, 
  TCreateData, 
  TUpdateData, 
  TFilters extends CRUDFilters = CRUDFilters
> implements BaseService<TEntity, TCreateData, TUpdateData, TFilters> {

  constructor(
    protected repository: BaseRepository<TEntity, TCreateData, TUpdateData, TFilters>
  ) {}

  /**
   * Validate permissions for the operation
   */
  protected abstract validatePermissions(operation: 'read' | 'create' | 'update' | 'delete', context?: RequestContext): Promise<void>;

  /**
   * Validate data before create/update operations
   */
  protected abstract validateData(data: TCreateData | TUpdateData, operation: 'create' | 'update'): Promise<void>;

  /**
   * Handle post-creation events
   */
  protected abstract onCreated(entity: TEntity, context: RequestContext): Promise<void>;

  /**
   * Handle post-update events
   */
  protected abstract onUpdated(entity: TEntity, originalData: TEntity, context: RequestContext): Promise<void>;

  /**
   * Handle post-deletion events
   */
  protected abstract onDeleted(id: string, context: RequestContext): Promise<void>;

  async getAll(filters?: TFilters, pagination?: PaginationParams, context?: RequestContext): Promise<PaginatedResult<TEntity>> {
    await this.validatePermissions('read', context);
    return this.repository.findAll(filters, pagination);
  }

  async getById(id: string, context?: RequestContext): Promise<TEntity | null> {
    await this.validatePermissions('read', context);
    
    if (!id) {
      throw new Error('ID is required');
    }

    return this.repository.findById(id);
  }

  async create(data: TCreateData, context: RequestContext): Promise<TEntity> {
    await this.validatePermissions('create', context);
    await this.validateData(data, 'create');

    const entity = await this.repository.create(data);
    await this.onCreated(entity, context);

    return entity;
  }

  async update(id: string, data: TUpdateData, context: RequestContext): Promise<TEntity> {
    await this.validatePermissions('update', context);
    await this.validateData(data, 'update');

    // Get original data for comparison
    const originalEntity = await this.repository.findById(id);
    if (!originalEntity) {
      throw new Error(`Entity with ID ${id} not found`);
    }

    const updatedEntity = await this.repository.update(id, data);
    await this.onUpdated(updatedEntity, originalEntity, context);

    return updatedEntity;
  }

  async delete(id: string, context: RequestContext): Promise<void> {
    await this.validatePermissions('delete', context);

    const exists = await this.repository.exists(id);
    if (!exists) {
      throw new Error(`Entity with ID ${id} not found`);
    }

    await this.repository.delete(id);
    await this.onDeleted(id, context);
  }
}