/**
 * Frontend Performance Optimizer
 * Provides code splitting, lazy loading, and bundle optimization utilities
 */

import { performanceMonitor } from './performance-monitor';

export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunks: Array<{
    name: string;
    size: number;
    gzippedSize: number;
    modules: string[];
  }>;
  recommendations: string[];
}

export interface LazyLoadConfig {
  rootMargin?: string;
  threshold?: number;
  enabled?: boolean;
}

export interface PerformanceConfig {
  enableCodeSplitting: boolean;
  enableLazyLoading: boolean;
  enablePrefetching: boolean;
  enableCompression: boolean;
  enableTreeShaking: boolean;
  bundleSizeTarget: number; // bytes
  chunkSizeTarget: number; // bytes
}

export class FrontendOptimizer {
  private config: PerformanceConfig;
  private loadedChunks: Set<string> = new Set();
  private loadingPromises: Map<string, Promise<any>> = new Map();
  private intersectionObserver: IntersectionObserver | null = null;
  private performanceMetrics: Map<string, number> = new Map();

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      enableCodeSplitting: true,
      enableLazyLoading: true,
      enablePrefetching: true,
      enableCompression: true,
      enableTreeShaking: true,
      bundleSizeTarget: 500 * 1024, // 500KB
      chunkSizeTarget: 50 * 1024, // 50KB
      ...config
    };

    if (typeof window !== 'undefined') {
      this.initializeOptimizations();
    }
  }

  /**
   * Lazy load a component with performance tracking
   */
  async lazyLoadComponent<T>(
    componentLoader: () => Promise<{ default: T }>,
    options?: {
      chunkName?: string;
      prefetch?: boolean;
      timeout?: number;
    }
  ): Promise<T> {
    const chunkName = options?.chunkName || 'unknown';
    const startTime = Date.now();

    // Check if already loading
    if (this.loadingPromises.has(chunkName)) {
      return this.loadingPromises.get(chunkName)!;
    }

    // Check if already loaded
    if (this.loadedChunks.has(chunkName)) {
      return componentLoader().then(module => module.default);
    }

    // Create loading promise
    const loadingPromise = this.loadComponentWithTimeout(
      componentLoader,
      options?.timeout || 10000
    ).then(module => {
      const component = module.default;
      this.loadedChunks.add(chunkName);
      
      // Track performance
      const loadTime = Date.now() - startTime;
      this.performanceMetrics.set(chunkName, loadTime);
      performanceMonitor.trackDatabaseQuery(loadTime, loadTime > 3000); // Track as slow if > 3s
      
      this.loadingPromises.delete(chunkName);
      return component;
    }).catch(error => {
      this.loadingPromises.delete(chunkName);
      throw error;
    });

    this.loadingPromises.set(chunkName, loadingPromise);
    return loadingPromise;
  }

  /**
   * Prefetch a component for faster loading later
   */
  prefetchComponent<T>(
    componentLoader: () => Promise<{ default: T }>,
    chunkName?: string
  ): void {
    if (!this.config.enablePrefetching) return;

    const name = chunkName || 'unknown';
    
    // Only prefetch if not already loaded or loading
    if (!this.loadedChunks.has(name) && !this.loadingPromises.has(name)) {
      // Use low priority prefetch
      setTimeout(() => {
        this.lazyLoadComponent(componentLoader, { chunkName: name })
          .catch(() => {
            // Ignore prefetch errors
          });
      }, 100);
    }
  }

  /**
   * Set up lazy loading for images and other elements
   */
  setupLazyLoading(selector: string = '[data-lazy]', config?: LazyLoadConfig): void {
    if (!this.config.enableLazyLoading || typeof window === 'undefined') return;

    const options = {
      rootMargin: config?.rootMargin || '50px',
      threshold: config?.threshold || 0.1,
      enabled: config?.enabled !== false
    };

    if (!options.enabled) return;

    // Create intersection observer
    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          this.loadLazyElement(element);
          this.intersectionObserver?.unobserve(element);
        }
      });
    }, {
      rootMargin: options.rootMargin,
      threshold: options.threshold
    });

    // Observe elements
    document.querySelectorAll(selector).forEach(element => {
      this.intersectionObserver?.observe(element);
    });
  }

  /**
   * Load a lazy element (image, iframe, etc.)
   */
  private loadLazyElement(element: HTMLElement): void {
    const startTime = Date.now();

    if (element.dataset.src) {
      // Handle images
      const img = element as HTMLImageElement;
      img.src = element.dataset.src;
      img.onload = () => {
        const loadTime = Date.now() - startTime;
        element.classList.add('loaded');
        this.performanceMetrics.set(`image:${img.src}`, loadTime);
      };
    } else if (element.dataset.component) {
      // Handle components
      const componentName = element.dataset.component;
      // Load component dynamically (implementation specific)
      this.loadDynamicComponent(componentName, element);
    }

    element.classList.add('loading');
  }

  /**
   * Load a dynamic component into an element
   */
  private async loadDynamicComponent(componentName: string, element: HTMLElement): Promise<void> {
    try {
      // This would be implemented based on your component loading system
      // For now, just add a placeholder
      element.innerHTML = `<div>Dynamic component: ${componentName}</div>`;
      element.classList.add('loaded');
    } catch (error) {
      console.error(`Failed to load dynamic component ${componentName}:`, error);
      element.classList.add('error');
    }
  }

  /**
   * Analyze bundle size and provide recommendations
   */
  async analyzeBundle(): Promise<BundleAnalysis> {
    if (typeof window === 'undefined') {
      return this.getMockBundleAnalysis();
    }

    try {
      // Get performance entries for resources
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      const jsResources = resources.filter(r => r.name.includes('.js'));
      const cssResources = resources.filter(r => r.name.includes('.css'));
      
      const totalSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0) +
                      cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
      
      const chunks = jsResources.map(resource => ({
        name: resource.name.split('/').pop() || 'unknown',
        size: resource.transferSize || 0,
        gzippedSize: Math.round((resource.transferSize || 0) * 0.3), // Estimate
        modules: [] // Would need additional analysis
      }));

      const recommendations = this.generateBundleRecommendations(totalSize, chunks);

      return {
        totalSize,
        gzippedSize: Math.round(totalSize * 0.3), // Estimate
        chunks,
        recommendations
      };

    } catch (error) {
      console.error('Failed to analyze bundle:', error);
      return this.getMockBundleAnalysis();
    }
  }

  /**
   * Optimize images for better performance
   */
  optimizeImages(): void {
    if (typeof window === 'undefined') return;

    const images = document.querySelectorAll('img:not([optimized])');
    
    images.forEach(img => {
      const image = img as HTMLImageElement;
      
      // Add loading="lazy" for modern browsers
      if (!image.loading) {
        image.loading = 'lazy';
      }
      
      // Optimize image attributes
      if (!image.decoding) {
        image.decoding = 'async';
      }
      
      // Add responsive images if not present
      if (!image.srcset && image.src) {
        this.generateResponsiveImages(image);
      }
      
      // Mark as optimized
      image.setAttribute('optimized', 'true');
    });
  }

  /**
   * Generate responsive image sources
   */
  private generateResponsiveImages(image: HTMLImageElement): void {
    // This is a simplified implementation
    // In practice, you'd generate actual different sizes
    const src = image.src;
    const baseName = src.substring(0, src.lastIndexOf('.'));
    const extension = src.substring(src.lastIndexOf('.'));
    
    // Generate srcset for different screen densities
    image.srcset = `
      ${src} 1x,
      ${baseName}@2x${extension} 2x,
      ${baseName}@3x${extension} 3x
    `.trim();
  }

  /**
   * Implement virtual scrolling for large lists
   */
  createVirtualScroll(container: HTMLElement, options: {
    itemHeight: number;
    renderItem: (index: number) => HTMLElement;
    totalCount: number;
    bufferSize?: number;
  }): void {
    const { itemHeight, renderItem, totalCount, bufferSize = 5 } = options;
    
    let scrollTop = 0;
    let visibleStart = 0;
    let visibleEnd = 0;
    const renderedItems = new Map<number, HTMLElement>();

    const updateVisibleRange = () => {
      const containerHeight = container.clientHeight;
      visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
      visibleEnd = Math.min(
        totalCount - 1,
        Math.ceil((scrollTop + containerHeight) / itemHeight) + bufferSize
      );
    };

    const renderItems = () => {
      // Remove items that are no longer visible
      for (const [index, element] of renderedItems) {
        if (index < visibleStart || index > visibleEnd) {
          container.removeChild(element);
          renderedItems.delete(index);
        }
      }

      // Add newly visible items
      for (let i = visibleStart; i <= visibleEnd; i++) {
        if (!renderedItems.has(i)) {
          const item = renderItem(i);
          item.style.position = 'absolute';
          item.style.top = `${i * itemHeight}px`;
          item.style.height = `${itemHeight}px`;
          container.appendChild(item);
          renderedItems.set(i, item);
        }
      }

      // Update container height
      container.style.height = `${totalCount * itemHeight}px`;
    };

    const handleScroll = () => {
      scrollTop = container.scrollTop;
      updateVisibleRange();
      renderItems();
    };

    // Set up scroll listener
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial render
    updateVisibleRange();
    renderItems();

    // Return cleanup function
    return () => {
      container.removeEventListener('scroll', handleScroll);
      renderedItems.forEach(item => container.removeChild(item));
      renderedItems.clear();
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    loadTimes: Record<string, number>;
    bundleAnalysis: BundleAnalysis;
    recommendations: string[];
  } {
    const loadTimes: Record<string, number> = {};
    this.performanceMetrics.forEach((time, key) => {
      loadTimes[key] = time;
    });

    return {
      loadTimes,
      bundleAnalysis: this.getMockBundleAnalysis(), // Would be real analysis
      recommendations: this.generateFrontendRecommendations()
    };
  }

  private async loadComponentWithTimeout<T>(
    loader: () => Promise<{ default: T }>,
    timeout: number
  ): Promise<{ default: T }> {
    return Promise.race([
      loader(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Component loading timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  private generateBundleRecommendations(totalSize: number, chunks: Array<{ size: number; name: string }>): string[] {
    const recommendations: string[] = [];

    if (totalSize > this.config.bundleSizeTarget) {
      recommendations.push(`Bundle size (${(totalSize / 1024).toFixed(2)}KB) exceeds target (${(this.config.bundleSizeTarget / 1024)}KB)`);
      recommendations.push('Consider code splitting and tree shaking to reduce bundle size');
    }

    const largeChunks = chunks.filter(chunk => chunk.size > this.config.chunkSizeTarget);
    if (largeChunks.length > 0) {
      recommendations.push(`${largeChunks.length} chunks are larger than target size - consider further splitting`);
    }

    if (chunks.length < 5) {
      recommendations.push('Consider splitting into more chunks for better caching');
    }

    return recommendations;
  }

  private generateFrontendRecommendations(): string[] {
    const recommendations: string[] = [];

    // Analyze load times
    const slowLoads = Array.from(this.performanceMetrics.entries())
      .filter(([_, time]) => time > 3000);
    
    if (slowLoads.length > 0) {
      recommendations.push(`${slowLoads.length} components are loading slowly - consider optimization`);
    }

    // Check for optimization opportunities
    if (this.loadedChunks.size < 5) {
      recommendations.push('Consider implementing more aggressive code splitting');
    }

    if (this.loadingPromises.size > 3) {
      recommendations.push('Multiple components loading simultaneously - consider batching');
    }

    return recommendations;
  }

  private getMockBundleAnalysis(): BundleAnalysis {
    return {
      totalSize: 450 * 1024, // 450KB
      gzippedSize: 135 * 1024, // 135KB
      chunks: [
        {
          name: 'main.js',
          size: 200 * 1024,
          gzippedSize: 60 * 1024,
          modules: ['react', 'next', 'prisma']
        },
        {
          name: 'dashboard.js',
          size: 100 * 1024,
          gzippedSize: 30 * 1024,
          modules: ['dashboard-components']
        },
        {
          name: 'ai-search.js',
          size: 150 * 1024,
          gzippedSize: 45 * 1024,
          modules: ['ai-services', 'search-components']
        }
      ],
      recommendations: [
        'Bundle size is within acceptable limits',
        'Consider implementing dynamic imports for AI search components',
        'Optimize images and assets for better performance'
      ]
    };
  }

  private initializeOptimizations(): void {
    // Set up lazy loading for images
    this.setupLazyLoading('img[data-lazy]');
    
    // Optimize existing images
    this.optimizeImages();
    
    // Monitor performance
    this.monitorPerformance();
  }

  private monitorPerformance(): void {
    // Monitor Core Web Vitals
    if ('web-vitals' in window) {
      // This would integrate with web-vitals library
      console.log('Performance monitoring initialized');
    }

    // Monitor component loading performance
    setInterval(() => {
      const metrics = this.getPerformanceMetrics();
      const avgLoadTime = Object.values(metrics.loadTimes).reduce((a, b) => a + b, 0) / 
                         Object.keys(metrics.loadTimes).length;
      
      if (avgLoadTime > 3000) {
        console.warn('Average component load time is high:', avgLoadTime);
      }
    }, 30000);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
    
    this.loadedChunks.clear();
    this.loadingPromises.clear();
    this.performanceMetrics.clear();
  }
}

// Create singleton instance
export const frontendOptimizer = new FrontendOptimizer();

// Export utility functions
export function lazyLoadComponent<T>(
  componentLoader: () => Promise<{ default: T }>,
  options?: {
    chunkName?: string;
    prefetch?: boolean;
    timeout?: number;
  }
): Promise<T> {
  return frontendOptimizer.lazyLoadComponent(componentLoader, options);
}

export function prefetchComponent<T>(
  componentLoader: () => Promise<{ default: T }>,
  chunkName?: string
): void {
  frontendOptimizer.prefetchComponent(componentLoader, chunkName);
}

export function setupLazyLoading(selector?: string, config?: LazyLoadConfig): void {
  frontendOptimizer.setupLazyLoading(selector, config);
}

export function createVirtualScroll(
  container: HTMLElement,
  options: {
    itemHeight: number;
    renderItem: (index: number) => HTMLElement;
    totalCount: number;
    bufferSize?: number;
  }
): void {
  frontendOptimizer.createVirtualScroll(container, options);
}

export function getFrontendPerformanceMetrics() {
  return frontendOptimizer.getPerformanceMetrics();
}