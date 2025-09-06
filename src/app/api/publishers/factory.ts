/**
 * Publishers Feature Factory
 * Simple factory pattern to create and wire dependencies
 * Following the established pattern from beats and categories
 */

import { PublishersRepository } from './repository';
import { PublishersService } from './service';
import { PublishersEvents } from './events';
import { PublishersController } from './controller';

// Singleton instances
let publishersRepository: PublishersRepository | null = null;
let publishersEvents: PublishersEvents | null = null;
let publishersService: PublishersService | null = null;
let publishersController: PublishersController | null = null;

export function getPublishersRepository(): PublishersRepository {
  if (!publishersRepository) {
    publishersRepository = new PublishersRepository();
  }
  return publishersRepository;
}

export function getPublishersEvents(): PublishersEvents {
  if (!publishersEvents) {
    publishersEvents = new PublishersEvents();
  }
  return publishersEvents;
}

export function getPublishersService(): PublishersService {
  if (!publishersService) {
    publishersService = new PublishersService(
      getPublishersRepository(),
      getPublishersEvents()
    );
  }
  return publishersService;
}

export function getPublishersController(): PublishersController {
  if (!publishersController) {
    publishersController = new PublishersController(getPublishersService());
  }
  return publishersController;
}