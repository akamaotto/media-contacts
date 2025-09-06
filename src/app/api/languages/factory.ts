/**
 * Languages Feature Factory
 * Simple factory pattern to create and wire dependencies
 */

import { LanguagesRepository } from './repository';
import { LanguagesService } from './service';
import { LanguagesEvents } from './events';
import { LanguagesController } from './controller';

// Singleton instances
let languagesRepository: LanguagesRepository | null = null;
let languagesEvents: LanguagesEvents | null = null;
let languagesService: LanguagesService | null = null;
let languagesController: LanguagesController | null = null;

export function getLanguagesRepository(): LanguagesRepository {
  if (!languagesRepository) {
    languagesRepository = new LanguagesRepository();
  }
  return languagesRepository;
}

export function getLanguagesEvents(): LanguagesEvents {
  if (!languagesEvents) {
    languagesEvents = new LanguagesEvents();
  }
  return languagesEvents;
}

export function getLanguagesService(): LanguagesService {
  if (!languagesService) {
    languagesService = new LanguagesService(
      getLanguagesRepository(),
      getLanguagesEvents()
    );
  }
  return languagesService;
}

export function getLanguagesController(): LanguagesController {
  if (!languagesController) {
    languagesController = new LanguagesController(getLanguagesService());
  }
  return languagesController;
}