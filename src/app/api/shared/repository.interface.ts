/**
 * Base Repository Interface
 * Defines the standard CRUD operations that all repositories must implement
 */

import { PaginationParams, PaginatedResult, CRUDFilters, EntityWithMetadata } from './types';

export interface BaseRepository<TEntity, TCreateData, TUpdateData, TFilters extends CRUDFilters = CRUDFilters> {
  /**
   * Find all entities with optional filtering and pagination
   */
  findAll(filters?: TFilters, pagination?: PaginationParams): Promise<PaginatedResult<TEntity>>;

  /**
   * Find a single entity by ID
   */
  findById(id: string): Promise<TEntity | null>;

  /**
   * Create a new entity
   */
  create(data: TCreateData): Promise<TEntity>;

  /**
   * Update an existing entity
   */
  update(id: string, data: TUpdateData): Promise<TEntity>;

  /**
   * Delete an entity by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if an entity exists by ID
   */
  exists(id: string): Promise<boolean>;

  /**
   * Get total count of entities matching filters
   */
  count(filters?: TFilters): Promise<number>;
}

/**
 * Extended repository interface for entities that support search
 */
export interface SearchableRepository<TEntity, TCreateData, TUpdateData, TFilters extends CRUDFilters = CRUDFilters> 
  extends BaseRepository<TEntity, TCreateData, TUpdateData, TFilters> {
  
  /**
   * Search entities by query string
   */
  search(query: string, limit?: number): Promise<TEntity[]>;
}

/**
 * Repository interface for entities with name-based operations
 */
export interface NamedRepository<TEntity, TCreateData, TUpdateData, TFilters extends CRUDFilters = CRUDFilters> 
  extends SearchableRepository<TEntity, TCreateData, TUpdateData, TFilters> {
  
  /**
   * Find entity by name
   */
  findByName(name: string): Promise<TEntity | null>;
  
  /**
   * Check if entity exists by name
   */
  existsByName(name: string): Promise<boolean>;
}