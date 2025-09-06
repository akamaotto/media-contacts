/**
 * Outlets Feature Factory
 * Simple factory pattern to create and wire dependencies
 */

import { OutletsRepository, OutletsService, OutletsEvents, OutletsController } from '.';

// Singleton instances
let outletsRepository: OutletsRepository | null = null;
let outletsEvents: OutletsEvents | null = null;
let outletsService: OutletsService | null = null;
let outletsController: OutletsController | null = null;

export function getOutletsRepository(): OutletsRepository {
  if (!outletsRepository) {
    outletsRepository = new OutletsRepository();
  }
  return outletsRepository;
}

export function getOutletsEvents(): OutletsEvents {
  if (!outletsEvents) {
    outletsEvents = new OutletsEvents();
  }
  return outletsEvents;
}

export function getOutletsService(): OutletsService {
  if (!outletsService) {
    outletsService = new OutletsService(
      getOutletsRepository(),
      getOutletsEvents()
    );
  }
  return outletsService;
}

export function getOutletsController(): OutletsController {
  if (!outletsController) {
    outletsController = new OutletsController(getOutletsService());
  }
  return outletsController;
}