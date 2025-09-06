/**
 * Cache Warming Script
 * Run this script to pre-populate the cache with frequently accessed data
 */

import { CacheWarmer } from '@/app/api/shared/cache-warmer';

async function warmCache() {
  console.log('Starting cache warming process...');
  
  try {
    await CacheWarmer.warmAll();
    console.log('Cache warming completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Cache warming failed:', error);
    process.exit(1);
  }
}

// Run the cache warming process
if (require.main === module) {
  warmCache();
}