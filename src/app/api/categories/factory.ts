/**
 * Categories Factory - Dependency injection setup
 */

import { CategoriesRepository } from './repository';
import { CategoriesService } from './service';
import { CategoriesController } from './controller';
import { CategoriesEvents } from './events';

// Singleton instances
let categoriesController: CategoriesController | null = null;
let categoriesService: CategoriesService | null = null;
let categoriesRepository: CategoriesRepository | null = null;
let categoriesEvents: CategoriesEvents | null = null;

/**
 * Get Categories Controller instance
 */
export function getCategoriesController(): CategoriesController {
  if (!categoriesController) {
    categoriesController = new CategoriesController(getCategoriesService());
  }
  return categoriesController;
}

/**
 * Get Categories Service instance
 */
export function getCategoriesService(): CategoriesService {
  if (!categoriesService) {
    categoriesService = new CategoriesService(
      getCategoriesRepository(),
      getCategoriesEvents()
    );
  }
  return categoriesService;
}

/**
 * Get Categories Repository instance
 */
export function getCategoriesRepository(): CategoriesRepository {
  if (!categoriesRepository) {
    categoriesRepository = new CategoriesRepository();
  }
  return categoriesRepository;
}

/**
 * Get Categories Events instance
 */
export function getCategoriesEvents(): CategoriesEvents {
  if (!categoriesEvents) {
    categoriesEvents = new CategoriesEvents();
  }
  return categoriesEvents;
}