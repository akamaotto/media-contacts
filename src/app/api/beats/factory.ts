/**
 * Beats Feature Factory
 * Simple factory pattern to create and wire dependencies
 */

import { BeatsRepository } from './repository';
import { BeatsService } from './service';
import { BeatsEvents } from './events';
import { BeatsController } from './controller';

// Singleton instances
let beatsRepository: BeatsRepository | null = null;
let beatsEvents: BeatsEvents | null = null;
let beatsService: BeatsService | null = null;
let beatsController: BeatsController | null = null;

export function getBeatsRepository(): BeatsRepository {
  if (!beatsRepository) {
    beatsRepository = new BeatsRepository();
  }
  return beatsRepository;
}

export function getBeatsEvents(): BeatsEvents {
  if (!beatsEvents) {
    beatsEvents = new BeatsEvents();
  }
  return beatsEvents;
}

export function getBeatsService(): BeatsService {
  if (!beatsService) {
    beatsService = new BeatsService(
      getBeatsRepository(),
      getBeatsEvents()
    );
  }
  return beatsService;
}

export function getBeatsController(): BeatsController {
  if (!beatsController) {
    beatsController = new BeatsController(getBeatsService());
  }
  return beatsController;
}