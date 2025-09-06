/**
 * Dependency Injection Container
 * Simple IoC container for managing service dependencies
 */

type ServiceFactory<T = any> = () => T;
type ServiceConstructor<T = any> = new (...args: any[]) => T;

export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, ServiceFactory>();
  private singletons = new Map<string, any>();

  private constructor() {}

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Register a service with a factory function
   */
  register<T>(token: string, factory: ServiceFactory<T>, singleton = false): void {
    if (singleton) {
      this.services.set(token, () => {
        if (!this.singletons.has(token)) {
          this.singletons.set(token, factory());
        }
        return this.singletons.get(token);
      });
    } else {
      this.services.set(token, factory);
    }
  }

  /**
   * Register a service class that will be instantiated with dependencies
   */
  registerClass<T>(
    token: string, 
    constructor: ServiceConstructor<T>, 
    dependencies: string[] = [],
    singleton = false
  ): void {
    const factory = () => {
      const deps = dependencies.map(dep => this.resolve(dep));
      return new constructor(...deps);
    };

    this.register(token, factory, singleton);
  }

  /**
   * Resolve a service by token
   */
  resolve<T>(token: string): T {
    const factory = this.services.get(token);
    if (!factory) {
      throw new Error(`Service '${token}' not registered`);
    }
    return factory();
  }

  /**
   * Check if a service is registered
   */
  has(token: string): boolean {
    return this.services.has(token);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  /**
   * List all registered service tokens
   */
  getRegisteredTokens(): string[] {
    return Array.from(this.services.keys());
  }
}

// Service tokens - centralized token definitions
export const ServiceTokens = {
  // Repositories
  BEATS_REPOSITORY: 'BeatsRepository',
  CATEGORIES_REPOSITORY: 'CategoriesRepository',
  COUNTRIES_REPOSITORY: 'CountriesRepository',
  OUTLETS_REPOSITORY: 'OutletsRepository',
  MEDIA_CONTACTS_REPOSITORY: 'MediaContactsRepository',
  USERS_REPOSITORY: 'UsersRepository',

  // Services
  BEATS_SERVICE: 'BeatsService',
  CATEGORIES_SERVICE: 'CategoriesService',
  COUNTRIES_SERVICE: 'CountriesService',
  OUTLETS_SERVICE: 'OutletsService',
  MEDIA_CONTACTS_SERVICE: 'MediaContactsService',
  USERS_SERVICE: 'UsersService',

  // Events
  BEATS_EVENTS: 'BeatsEvents',
  CATEGORIES_EVENTS: 'CategoriesEvents',
  COUNTRIES_EVENTS: 'CountriesEvents',
  OUTLETS_EVENTS: 'OutletsEvents',
  MEDIA_CONTACTS_EVENTS: 'MediaContactsEvents',
  USERS_EVENTS: 'UsersEvents',

  // Controllers
  BEATS_CONTROLLER: 'BeatsController',
  CATEGORIES_CONTROLLER: 'CategoriesController',
  COUNTRIES_CONTROLLER: 'CountriesController',
  OUTLETS_CONTROLLER: 'OutletsController',
  MEDIA_CONTACTS_CONTROLLER: 'MediaContactsController',
  USERS_CONTROLLER: 'UsersController',

  // External Services
  ACTIVITY_SERVICE: 'ActivityService',
  CACHE_INVALIDATION_SERVICE: 'CacheInvalidationService',
} as const;

// Export singleton instance
export const container = DIContainer.getInstance();