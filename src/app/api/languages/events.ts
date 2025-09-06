/**
 * Languages Events - Activity tracking and cache invalidation
 */

import { BaseEventHandler } from '../shared/events';
import { Language } from './types';
import { RequestContext } from '../shared/types';

export class LanguagesEvents extends BaseEventHandler<Language> {
  protected getEntityName(): string {
    return 'language';
  }

  protected getEntityId(entity: Language): string {
    return entity.id;
  }

  protected getEntityDisplayName(entity: Language): string {
    return entity.name;
  }

  protected async handleCustomCreatedEvent(entity: Language, context: RequestContext): Promise<void> {
    // Custom logic for language creation
  }

  protected async handleCustomUpdatedEvent(entity: Language, previous: Language, context: RequestContext): Promise<void> {
    // Custom logic for language update
  }

  protected async handleCustomDeletedEvent(entityId: string, context: RequestContext): Promise<void> {
    // Custom logic for language deletion
  }
}