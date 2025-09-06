/**
 * Cache Management Actions
 * Server actions for cache management and monitoring
 */

'use server';

import { CacheWarmer } from '@/app/api/shared/cache-warmer';
import { cacheService } from '@/app/api/shared/cache-service';
import { CacheMetrics } from '@/lib/caching/cache-metrics';
import { auth } from '@/lib/auth';

/**
 * Warm up the application cache
 * This action can be called manually or scheduled
 */
export async function warmCache() {
  try {
    // Check if user is authenticated and has admin privileges
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // In a real implementation, you would check for admin role
    // For now, we'll allow any authenticated user to trigger cache warming
    
    console.log('Manually warming cache...');
    await CacheWarmer.warmAll();
    
    return { success: true, message: 'Cache warming completed successfully' };
  } catch (error) {
    console.error('Error warming cache:', error);
    return { success: false, error: 'Failed to warm cache' };
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  try {
    // Check if user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Get cache statistics
    const cacheStats = cacheService.getStats();
    const metrics = CacheMetrics.getMetrics();
    
    return { 
      success: true, 
      data: {
        cacheStats,
        metrics
      }
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return { success: false, error: 'Failed to get cache statistics' };
  }
}

/**
 * Clear the entire cache
 */
export async function clearCache() {
  try {
    // Check if user is authenticated and has admin privileges
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // In a real implementation, you would check for admin role
    // For now, we'll allow any authenticated user to clear cache
    
    cacheService.clear();
    CacheMetrics.reset();
    
    return { success: true, message: 'Cache cleared successfully' };
  } catch (error) {
    console.error('Error clearing cache:', error);
    return { success: false, error: 'Failed to clear cache' };
  }
}