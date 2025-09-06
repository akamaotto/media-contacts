/**
 * Base Events Interface and Implementation
 * Provides common event handling patterns for all entities
 */

import { RequestContext } from './types';

export interface BaseEvents<TEntity, TCreateData, TUpdateData, TFilters> {
  beforeGetAll(params: { filters: TFilters; pagination: any; context: RequestContext }): Promise<void>;
  afterGetAll(params: { filters: TFilters; pagination: any; context: RequestContext; result: TEntity[] }): Promise<void>;
  beforeGetById(params: { id: string; context: RequestContext }): Promise<void>;
  afterGetById(params: { id: string; context: RequestContext; result: TEntity }): Promise<void>;
  beforeCreate(params: { data: TCreateData; context: RequestContext }): Promise<void>;
  afterCreate(params: { data: TCreateData; context: RequestContext; result: TEntity }): Promise<void>;
  beforeUpdate(params: { id: string; data: TUpdateData; context: RequestContext }): Promise<void>;
  afterUpdate(params: { id: string; data: TUpdateData; context: RequestContext; result: TEntity }): Promise<void>;
  beforeDelete(params: { id: string; context: RequestContext }): Promise<void>;
  afterDelete(params: { id: string; context: RequestContext }): Promise<void>;
}

/**
 * Abstract base events implementation
 */
export abstract class BaseEvents<TEntity, TCreateData, TUpdateData, TFilters> implements BaseEvents<TEntity, TCreateData, TUpdateData, TFilters> {
  
  constructor(protected entityName: string) {}

  /**
   * Default implementations - can be overridden by subclasses
   */
  async beforeGetAll(params: { filters: TFilters; pagination: any; context: RequestContext }): Promise<void> {
    // Default implementation - can be overridden
  }

  async afterGetAll(params: { filters: TFilters; pagination: any; context: RequestContext; result: TEntity[] }): Promise<void> {
    // Default implementation - can be overridden
  }

  async beforeGetById(params: { id: string; context: RequestContext }): Promise<void> {
    // Default implementation - can be overridden
  }

  async afterGetById(params: { id: string; context: RequestContext; result: TEntity }): Promise<void> {
    // Default implementation - can be overridden
  }

  async beforeCreate(params: { data: TCreateData; context: RequestContext }): Promise<void> {
    // Default implementation - can be overridden
  }

  async afterCreate(params: { data: TCreateData; context: RequestContext; result: TEntity }): Promise<void> {
    // Default implementation - can be overridden
  }

  async beforeUpdate(params: { id: string; data: TUpdateData; context: RequestContext }): Promise<void> {
    // Default implementation - can be overridden
  }

  async afterUpdate(params: { id: string; data: TUpdateData; context: RequestContext; result: TEntity }): Promise<void> {
    // Default implementation - can be overridden
  }

  async beforeDelete(params: { id: string; context: RequestContext }): Promise<void> {
    // Default implementation - can be overridden
  }

  async afterDelete(params: { id: string; context: RequestContext }): Promise<void> {
    // Default implementation - can be overridden
  }
}