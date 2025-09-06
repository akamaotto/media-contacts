/**
 * Publishers Events - Activity tracking and cache management
 * Following the established pattern from beats and categories
 */

import { BaseEventHandler } from '../shared/events';
import { Publisher } from './types';
import { RequestContext } from '../shared/types';
import { cacheService } from '../shared/cache-service';

export class PublishersEvents extends BaseEventHandler<Publisher> {
  
  protected getEntityName(): string {
    return 'publisher';
  }

  protected getEntityId(entity: Publisher): string {
    return entity.id;
  }

  protected getEntityDisplayName(entity: Publisher): string {
    return entity.name;
  }

  protected async handleCustomCreatedEvent(entity: Publisher, context: RequestContext): Promise<void> {
    // Clear related caches
    this.clearRelatedCaches();

    console.log(`Publisher created: ${entity.name} by user ${context.userId}`);
  }

  protected async handleCustomUpdatedEvent(entity: Publisher, previous: Publisher, context: RequestContext): Promise<void> {
    // Determine what changed
    const changes: string[] = [];
    if (entity.name !== previous.name) changes.push('name');
    if (entity.description !== previous.description) changes.push('description');
    if (entity.website !== previous.website) changes.push('website');

    // Clear related caches
    this.clearRelatedCaches();

    console.log(`Publisher updated: ${entity.name} by user ${context.userId}, changed: ${changes.join(', ')}`);
  }

  protected async handleCustomDeletedEvent(entityId: string, context: RequestContext): Promise<void> {
    // Clear related caches
    this.clearRelatedCaches();

    console.log(`Publisher deleted: ${entityId} by user ${context.userId}`);
  }

  /**
   * Clear related caches when publishers change
   */
  private clearRelatedCaches(): void {
    // Clear publishers caches
    cacheService.clearByPrefix('publishers_');
    
    // Clear outlets cache since outlets reference publishers
    cacheService.clearByPrefix('outlets_');
    
    // Clear dashboard cache that might include publisher metrics
    cacheService.clearByPrefix('dashboard_');
  }
}