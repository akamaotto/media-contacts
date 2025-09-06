/**
 * Countries Feature Factory
 * Simple factory pattern to create and wire dependencies
 */

import { CountriesRepository } from './repository';
import { CountriesService } from './service';
import { CountriesEvents } from './events';
import { CountriesController } from './controller';

// Singleton instances
let countriesRepository: CountriesRepository | null = null;
let countriesEvents: CountriesEvents | null = null;
let countriesService: CountriesService | null = null;
let countriesController: CountriesController | null = null;

export function getCountriesRepository(): CountriesRepository {
  if (!countriesRepository) {
    countriesRepository = new CountriesRepository();
  }
  return countriesRepository;
}

export function getCountriesEvents(): CountriesEvents {
  if (!countriesEvents) {
    countriesEvents = new CountriesEvents();
  }
  return countriesEvents;
}

export function getCountriesService(): CountriesService {
  if (!countriesService) {
    countriesService = new CountriesService(
      getCountriesRepository(),
      getCountriesEvents()
    );
  }
  return countriesService;
}

export function getCountriesController(): CountriesController {
  if (!countriesController) {
    countriesController = new CountriesController(getCountriesService());
  }
  return countriesController;
}