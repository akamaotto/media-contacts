/**
 * User Factory Implementation
 * Dependency injection container for user feature
 */

import { UserRepository } from './repository';
import { UserService } from './service';
import { UserEvents } from './events';
import { UserController } from './controller';

// Singleton instances
let userRepository: UserRepository | null = null;
let userEvents: UserEvents | null = null;
let userService: UserService | null = null;
let userController: UserController | null = null;

/**
 * Get or create user repository instance
 */
export function getUserRepository(): UserRepository {
  if (!userRepository) {
    userRepository = new UserRepository();
  }
  return userRepository;
}

/**
 * Get or create user events instance
 */
export function getUserEvents(): UserEvents {
  if (!userEvents) {
    userEvents = new UserEvents();
  }
  return userEvents;
}

/**
 * Get or create user service instance
 */
export function getUserService(): UserService {
  if (!userService) {
    const repository = getUserRepository();
    const events = getUserEvents();
    userService = new UserService(repository, events);
  }
  return userService;
}

/**
 * Get or create user controller instance
 */
export function getUserController(): UserController {
  if (!userController) {
    const service = getUserService();
    userController = new UserController(service);
  }
  return userController;
}

/**
 * Reset all instances (for testing)
 */
export function resetUserInstances(): void {
  userRepository = null;
  userEvents = null;
  userService = null;
  userController = null;
}