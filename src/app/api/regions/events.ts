/**
 * Regions Events - Activity tracking and cache invalidation
 */

import { BaseEventHandler } from '../shared/events';
import { Region } from './types';
import { RequestContext } from '../shared/types';

export class RegionsEvents extends BaseEventHandler<Region> {
  protected getEntityName(): string {
    return 'region';
  }

  protected getEntityId(entity: Region): string {
    return entity.id;
  }

  protected getEntityDisplayName(entity: Region): string {
    return entity.name;
  }

  protected async handleCustomCreatedEvent(entity: Region, context: RequestContext): Promise<void> {
    // Custom logic for region creation
  }

  protected async handleCustomUpdatedEvent(entity: Region, previous: Region, context: RequestContext): Promise<void> {
    // Custom logic for region update
  }

  protected async handleCustomDeletedEvent(entityId: string, context: RequestContext): Promise<void> {
    // Custom logic for region deletion
  }
}