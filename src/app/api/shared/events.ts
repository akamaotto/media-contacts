/**
 * Event handling interfaces and base implementation
 */

import { RequestContext } from './types';

export interface EntityEvent<TEntity = any> {
  entity: TEntity;
  context: RequestContext;
  timestamp: Date;
  eventType: 'created' | 'updated' | 'deleted';
}

export interface EventHandler<TEntity = any> {
  onCreated?(entity: TEntity, context: RequestContext): Promise<void>;
  onUpdated?(entity: TEntity, previous: TEntity, context: RequestContext): Promise<void>;
  onDeleted?(entityId: string, context: RequestContext): Promise<void>;
}

/**
 * Base event handler implementation with common functionality
 */
export abstract class BaseEventHandler<TEntity = any> implements EventHandler<TEntity> {
  
  /**
   * Get entity name for logging
   */
  protected abstract getEntityName(): string;

  /**
   * Get entity ID from entity
   */
  protected abstract getEntityId(entity: TEntity): string;

  /**
   * Get entity display name from entity
   */
  protected abstract getEntityDisplayName(entity: TEntity): string;

  async onCreated(entity: TEntity, context: RequestContext): Promise<void> {
    await Promise.all([
      this.logActivity('create', entity, context),
      this.invalidateCache(),
      this.handleCustomCreatedEvent(entity, context)
    ]);
  }

  async onUpdated(entity: TEntity, previous: TEntity, context: RequestContext): Promise<void> {
    await Promise.all([
      this.logActivity('update', entity, context),
      this.invalidateCache(),
      this.handleCustomUpdatedEvent(entity, previous, context)
    ]);
  }

  async onDeleted(entityId: string, context: RequestContext): Promise<void> {
    await Promise.all([
      this.logDeleteActivity(entityId, context),
      this.invalidateCache(),
      this.handleCustomDeletedEvent(entityId, context)
    ]);
  }

  /**
   * Log activity for create/update operations
   */
  protected async logActivity(
    type: 'create' | 'update',
    entity: TEntity,
    context: RequestContext
  ): Promise<void> {
    try {
      // Skip activity logging if no user ID is available
      if (!context.userId) {
        return;
      }

      const { activityTrackingService } = await import('@/services/activity');
      
      await activityTrackingService.logActivity({
        type,
        entity: this.getEntityName() as any,
        entityId: this.getEntityId(entity),
        entityName: this.getEntityDisplayName(entity),
        userId: context.userId
      });
    } catch (error) {
      console.error(`Failed to log ${type} activity:`, error);
      // Don't throw - activity logging is not critical
    }
  }

  /**
   * Log activity for delete operations
   */
  protected async logDeleteActivity(entityId: string, context: RequestContext): Promise<void> {
    try {
      // Skip activity logging if no user ID is available
      if (!context.userId) {
        return;
      }

      const { activityTrackingService } = await import('@/services/activity');
      
      await activityTrackingService.logActivity({
        type: 'delete',
        entity: this.getEntityName() as any,
        entityId,
        entityName: `Deleted ${this.getEntityName()}`,
        userId: context.userId
      });
    } catch (error) {
      console.error('Failed to log delete activity:', error);
      // Don't throw - activity logging is not critical
    }
  }

  /**
   * Invalidate cache after entity changes
   */
  protected async invalidateCache(): Promise<void> {
    try {
      const { cacheInvalidationService } = await import('@/lib/caching/cache-invalidation');
      
      await cacheInvalidationService.invalidateOnCrudOperation(this.getEntityName() as any);
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
      // Don't throw - cache invalidation is not critical
    }
  }

  /**
   * Override these methods for custom event handling
   */
  protected async handleCustomCreatedEvent(entity: TEntity, context: RequestContext): Promise<void> {
    // Override in subclasses for custom logic
  }

  protected async handleCustomUpdatedEvent(entity: TEntity, previous: TEntity, context: RequestContext): Promise<void> {
    // Override in subclasses for custom logic
  }

  protected async handleCustomDeletedEvent(entityId: string, context: RequestContext): Promise<void> {
    // Override in subclasses for custom logic
  }
}