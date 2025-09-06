/**
 * Cache Warmer Service
 * Pre-populates cache with frequently accessed data on application startup
 */

import { getBeatsRepository } from '@/app/api/beats/factory';
import { getCategoriesRepository } from '@/app/api/categories/factory';
import { cacheService } from './cache-service';

export class CacheWarmer {
  /**
   * Warm up popular beats cache
   */
  static async warmPopularBeats(): Promise<void> {
    try {
      console.log('Warming up beats cache...');
      
      // Get beats repository
      const beatsRepository = getBeatsRepository();
      
      // Warm cache for beats with stats (used in dashboard)
      await beatsRepository.findWithStats();
      
      // Warm cache for common search terms
      const commonSearches = ['technology', 'business', 'politics', 'sports', 'entertainment'];
      await Promise.all(
        commonSearches.map(term => beatsRepository.search(term, 5))
      );
      
      console.log('Beats cache warming completed');
    } catch (error) {
      console.error('Error warming beats cache:', error);
    }
  }

  /**
   * Warm up popular categories cache
   */
  static async warmPopularCategories(): Promise<void> {
    try {
      console.log('Warming up categories cache...');
      
      // Get categories repository
      const categoriesRepository = getCategoriesRepository();
      
      // Warm cache for categories with stats
      // Note: This would need to be implemented in the categories repository
      // await categoriesRepository.findWithStats();
      
      console.log('Categories cache warming completed');
    } catch (error) {
      console.error('Error warming categories cache:', error);
    }
  }

  /**
   * Warm all caches
   */
  static async warmAll(): Promise<void> {
    console.log('Starting cache warming process...');
    
    await Promise.all([
      this.warmPopularBeats(),
      this.warmPopularCategories()
    ]);
    
    console.log('Cache warming process completed');
  }
}

// Export singleton instance
export const cacheWarmer = new CacheWarmer();