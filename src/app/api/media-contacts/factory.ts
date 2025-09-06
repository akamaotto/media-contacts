/**
 * Media Contacts Factory for Dependency Injection
 */

import { MediaContactsRepository } from './repository';
import { MediaContactsService } from './service';
import { MediaContactsEvents } from './events';

// Singleton instances
let mediaContactsRepository: MediaContactsRepository | null = null;
let mediaContactsEvents: MediaContactsEvents | null = null;
let mediaContactsService: MediaContactsService | null = null;

/**
 * Factory function to get MediaContactsRepository instance
 */
export function getMediaContactsRepository(): MediaContactsRepository {
  if (!mediaContactsRepository) {
    mediaContactsRepository = new MediaContactsRepository();
  }
  return mediaContactsRepository;
}

/**
 * Factory function to get MediaContactsEvents instance
 */
export function getMediaContactsEvents(): MediaContactsEvents {
  if (!mediaContactsEvents) {
    mediaContactsEvents = new MediaContactsEvents();
  }
  return mediaContactsEvents;
}

/**
 * Factory function to get MediaContactsService instance
 */
export function getMediaContactsService(): MediaContactsService {
  if (!mediaContactsService) {
    const repository = getMediaContactsRepository();
    const events = getMediaContactsEvents();
    mediaContactsService = new MediaContactsService(repository, events);
  }
  return mediaContactsService;
}