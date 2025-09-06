/**
 * Categories Events - Activity tracking and cache invalidation
 */

import { BaseEventHandler } from '../shared/events';
import { Category } from './types';
import { RequestContext } from '../shared/types';
import { cacheService } from '../shared/cache-service';

export class CategoriesEvents extends BaseEventHandler<Category> {
  
  protected getEntityName(): string {
    return 'category';
  }

  protected getEntityId(entity: Category): string {
    return entity.id;
  }

  protected getEntityDisplayName(entity: Category): string {
    return entity.name;
  }

  protected async handleCustomCreatedEvent(entity: Category, context: RequestContext): Promise<void> {
    // Clear related caches
    this.clearRelatedCaches();

    console.log(`Category created: ${entity.name} by user ${context.userId}`);
  }

  protected async handleCustomUpdatedEvent(entity: Category, previous: Category, context: RequestContext): Promise<void> {
    // Determine what changed
    const changes: string[] = [];
    if (entity.name !== previous.name) changes.push('name');
    if (entity.description !== previous.description) changes.push('description');
    if (entity.color !== previous.color) changes.push('color');

    // Clear related caches
    this.clearRelatedCaches();

    console.log(`Category updated: ${entity.name} by user ${context.userId}, changed: ${changes.join(', ')}`);
  }

  protected async handleCustomDeletedEvent(entityId: string, context: RequestContext): Promise<void> {
    // Clear related caches
    this.clearRelatedCaches();

    console.log(`Category deleted: ${entityId} by user ${context.userId}`);
  }

  /**
   * Clear related caches when categories change
   */
  private clearRelatedCaches(): void {
    // Clear categories caches
    cacheService.clearByPrefix('categories_');
    
    // Clear related beats cache since beats display categories
    cacheService.clearByPrefix('beats_');
    
    // Clear outlets cache if outlets also use categories
    cacheService.clearByPrefix('outlets_');
  }
}