/**
 * Application Initialization Service
 * Handles application startup tasks including cache warming and database listener setup
 */

import { CacheWarmer } from '@/app/api/shared/cache-warmer';
import { dbListener } from '@/lib/database/db-listener';

export class AppInitializer {
  static async initialize() {
    console.log('Initializing application services...');
    
    try {
      // Warm up the cache with frequently accessed data
      await CacheWarmer.warmAll();
      
      // Connect database listener for cache invalidation
      await dbListener.connect();
      
      console.log('Application initialization completed successfully');
    } catch (error) {
      console.error('Error during application initialization:', error);
    }
  }
  
  static async shutdown() {
    console.log('Shutting down application services...');
    
    try {
      // Disconnect database listener
      await dbListener.disconnect();
      
      console.log('Application shutdown completed');
    } catch (error) {
      console.error('Error during application shutdown:', error);
    }
  }
}

// Initialize the application when the module is loaded
if (typeof window === 'undefined') {
  // Only run initialization on the server side
  AppInitializer.initialize().catch(console.error);
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await AppInitializer.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await AppInitializer.shutdown();
  process.exit(0);
});