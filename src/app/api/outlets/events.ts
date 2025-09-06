/**
 * Outlets Events - Activity tracking and cache management
 * Following the established pattern from beats and categories
 */

import { BaseEventHandler } from '../shared/events';
import { Outlet } from './types';
import { RequestContext } from '../shared/types';
import { cacheService } from '../shared/cache-service';

export class OutletsEvents extends BaseEventHandler<Outlet> {
  
  protected getEntityName(): string {
    return 'outlet';
  }

  protected getEntityId(entity: Outlet): string {
    return entity.id;
  }

  protected getEntityDisplayName(entity: Outlet): string {
    return entity.name;
  }

  protected async handleCustomCreatedEvent(entity: Outlet, context: RequestContext): Promise<void> {
    // Clear related caches
    this.clearRelatedCaches();

    console.log(`Outlet created: ${entity.name} by user ${context.userId}`);
  }

  protected async handleCustomUpdatedEvent(entity: Outlet, previous: Outlet, context: RequestContext): Promise<void> {
    // Determine what changed
    const changes: string[] = [];
    if (entity.name !== previous.name) changes.push('name');
    if (entity.description !== previous.description) changes.push('description');
    if (entity.website !== previous.website) changes.push('website');
    if (entity.publisherId !== previous.publisherId) changes.push('publisher');

    // Clear related caches
    this.clearRelatedCaches();

    console.log(`Outlet updated: ${entity.name} by user ${context.userId}, changed: ${changes.join(', ')}`);
  }

  protected async handleCustomDeletedEvent(entityId: string, context: RequestContext): Promise<void> {
    // Clear related caches
    this.clearRelatedCaches();

    console.log(`Outlet deleted: ${entityId} by user ${context.userId}`);
  }

  /**
   * Clear related caches when outlets change
   */
  private clearRelatedCaches(): void {
    // Clear outlets caches
    cacheService.clearByPrefix('outlets_');
    
    // Clear publishers cache since publishers reference outlets
    cacheService.clearByPrefix('publishers_');
    
    // Clear media contacts cache since they reference outlets
    cacheService.clearByPrefix('media_contacts_');
    
    // Clear dashboard cache that might include outlet metrics
    cacheService.clearByPrefix('dashboard_');
  }
}