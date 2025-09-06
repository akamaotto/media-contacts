/**
 * Regions Feature Factory
 * Simple factory pattern to create and wire dependencies
 */

import { RegionsRepository } from './repository';
import { RegionsService } from './service';
import { RegionsEvents } from './events';
import { RegionsController } from './controller';

// Singleton instances
let regionsRepository: RegionsRepository | null = null;
let regionsEvents: RegionsEvents | null = null;
let regionsService: RegionsService | null = null;
let regionsController: RegionsController | null = null;

export function getRegionsRepository(): RegionsRepository {
  if (!regionsRepository) {
    regionsRepository = new RegionsRepository();
  }
  return regionsRepository;
}

export function getRegionsEvents(): RegionsEvents {
  if (!regionsEvents) {
    regionsEvents = new RegionsEvents();
  }
  return regionsEvents;
}

export function getRegionsService(): RegionsService {
  if (!regionsService) {
    regionsService = new RegionsService(
      getRegionsRepository(),
      getRegionsEvents()
    );
  }
  return regionsService;
}

export function getRegionsController(): RegionsController {
  if (!regionsController) {
    regionsController = new RegionsController(getRegionsService());
  }
  return regionsController;
}