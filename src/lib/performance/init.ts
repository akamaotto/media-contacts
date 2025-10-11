/**
 * Performance Initialization
 * Initializes all performance optimization services
 */

import { initializePerformanceOptimizations } from './performance-integration';
import { databaseOptimizer } from './database-optimizer';
import { frontendOptimizer } from './frontend-optimizer';
import { performanceMonitor } from './performance-monitor';

export async function initializePerformance(): Promise<void> {
  try {
    console.log('🚀 Initializing performance optimizations...');
    
    // Check if we're in a server environment before initializing server-side optimizations
    const isServerEnvironment = typeof window === 'undefined';
    
    if (isServerEnvironment) {
      console.log('🔍 PRISMA DEBUG: Initializing performance in server environment');
      
      // Initialize the performance integration service
      await initializePerformanceOptimizations({
        enableMonitoring: true,
        enableAutoOptimization: true,
        monitoringInterval: 30000, // 30 seconds
        alertThresholds: {
          responseTime: 2000,
          errorRate: 5,
          memoryUsage: 80,
          cpuUsage: 80
        },
        database: {
          enableQueryCache: true,
          enableConnectionPooling: true,
          maxConnections: 10,
          queryTimeout: 30000,
          slowQueryThreshold: 1000,
          enableQueryOptimization: true
        },
        api: {
          enableCaching: true,
          enableCompression: true,
          defaultCacheTTL: 300,
          maxCacheSize: 1000,
          compressionThreshold: 1024,
          enableRateLimiting: true,
          rateLimitWindow: 60,
          rateLimitMax: 100
        },
        frontend: {
          enableCodeSplitting: true,
          enableLazyLoading: true,
          enablePrefetching: true,
          enableCompression: true,
          enableTreeShaking: true,
          bundleSizeTarget: 500 * 1024,
          chunkSizeTarget: 50 * 1024
        },
        aiService: {
          enableCaching: true,
          enableBatching: true,
          enableRequestDeduplication: true,
          enableRetry: true,
          maxRetries: 3,
          retryDelay: 1000,
          timeout: 30000,
          cache: {
            enabled: true,
            maxSize: 1000,
            defaultTTL: 1800,
            keyGenerator: (request) => `${request.type}:${JSON.stringify(request.payload)}`
          },
          batch: {
            maxBatchSize: 10,
            batchTimeout: 5000,
            enableBatching: true,
            batchableTypes: ['search', 'query-generation']
          }
        }
      });
      
      // Create database performance indexes only in server environment
      if (databaseOptimizer && typeof databaseOptimizer.createPerformanceIndexes === 'function') {
        console.log('🔍 PRISMA DEBUG: Creating database performance indexes');
        await databaseOptimizer.createPerformanceIndexes();
      } else {
        console.warn('⚠️ Database optimizer not available - skipping database index creation');
      }
    } else {
      console.log('🔍 PRISMA DEBUG: Skipping server-side performance initialization in browser environment');
    }
    
    // Initialize frontend optimizations if in browser
    if (typeof window !== 'undefined') {
      frontendOptimizer.setupLazyLoading('img[data-lazy]');
      frontendOptimizer.optimizeImages();
      
      // Monitor Core Web Vitals
      if ('web-vitals' in window) {
        console.log('Core Web Vitals monitoring available');
      }
    }
    
    // Set up global error tracking
    setupGlobalErrorTracking();
    
    console.log('✅ Performance optimizations initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize performance optimizations:', error);
    throw error;
  }
}

function setupGlobalErrorTracking(): void {
  if (typeof window !== 'undefined') {
    // Track unhandled errors
    window.addEventListener('error', (event) => {
      console.error('Global error tracked:', event.error);
      performanceMonitor.trackApiResponse(0, true);
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection tracked:', event.reason);
      performanceMonitor.trackApiResponse(0, true);
    });
  }
}

// Auto-initialize in development
if (process.env.NODE_ENV === 'development') {
  // Initialize performance optimizations after a short delay
  setTimeout(() => {
    initializePerformance().catch(error => {
      console.error('Failed to auto-initialize performance:', error);
    });
  }, 1000);
}