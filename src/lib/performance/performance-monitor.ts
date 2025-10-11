/**
 * Performance Monitoring Service
 * Comprehensive performance tracking and optimization recommendations
 */

export interface PerformanceMetrics {
  // Database metrics
  database: {
    queryTimes: number[];
    slowQueries: number;
    connectionPoolUsage: number;
    cacheHitRate: number;
  };
  
  // API metrics
  api: {
    responseTimes: number[];
    requestRate: number;
    errorRate: number;
    cacheHitRate: number;
  };
  
  // Frontend metrics
  frontend: {
    bundleSize: number;
    loadTime: number;
    interactionTime: number;
    coreWebVitals: {
      lcp: number; // Largest Contentful Paint
      fid: number; // First Input Delay
      cls: number; // Cumulative Layout Shift
    };
  };
  
  // AI service metrics
  ai: {
    searchLatency: number;
    extractionTime: number;
    costPerSearch: number;
    successRate: number;
  };
}

export interface PerformanceThresholds {
  database: {
    maxQueryTime: number;
    maxSlowQueryRate: number;
    maxConnectionUsage: number;
    minCacheHitRate: number;
  };
  api: {
    maxResponseTime: number;
    maxErrorRate: number;
    minCacheHitRate: number;
  };
  frontend: {
    maxBundleSize: number;
    maxLoadTime: number;
    maxInteractionTime: number;
    coreWebVitals: {
      maxLcp: number;
      maxFid: number;
      maxCls: number;
    };
  };
  ai: {
    maxSearchLatency: number;
    maxExtractionTime: number;
    maxCostPerSearch: number;
    minSuccessRate: number;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private thresholds: PerformanceThresholds;
  private observers: PerformanceObserver[];
  private measurementCallbacks: Set<(metrics: PerformanceMetrics) => void> = new Set();

  constructor() {
    this.metrics = this.initializeMetrics();
    this.thresholds = this.initializeThresholds();
    this.observers = [];
    
    if (typeof window !== 'undefined') {
      this.initializeFrontendMonitoring();
    }
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      database: {
        queryTimes: [],
        slowQueries: 0,
        connectionPoolUsage: 0,
        cacheHitRate: 0
      },
      api: {
        responseTimes: [],
        requestRate: 0,
        errorRate: 0,
        cacheHitRate: 0
      },
      frontend: {
        bundleSize: 0,
        loadTime: 0,
        interactionTime: 0,
        coreWebVitals: {
          lcp: 0,
          fid: 0,
          cls: 0
        }
      },
      ai: {
        searchLatency: 0,
        extractionTime: 0,
        costPerSearch: 0,
        successRate: 0
      }
    };
  }

  private initializeThresholds(): PerformanceThresholds {
    return {
      database: {
        maxQueryTime: 100, // 100ms
        maxSlowQueryRate: 5, // 5%
        maxConnectionUsage: 80, // 80%
        minCacheHitRate: 70 // 70%
      },
      api: {
        maxResponseTime: 200, // 200ms
        maxErrorRate: 1, // 1%
        minCacheHitRate: 60 // 60%
      },
      frontend: {
        maxBundleSize: 500 * 1024, // 500KB
        maxLoadTime: 2000, // 2 seconds
        maxInteractionTime: 100, // 100ms
        coreWebVitals: {
          maxLcp: 2500, // 2.5 seconds
          maxFid: 100, // 100ms
          maxCls: 0.1 // 0.1
        }
      },
      ai: {
        maxSearchLatency: 30000, // 30 seconds
        maxExtractionTime: 10000, // 10 seconds
        maxCostPerSearch: 0.10, // $0.10
        minSuccessRate: 90 // 90%
      }
    };
  }

  private initializeFrontendMonitoring(): void {
    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor resource loading
    this.observeResourceTiming();
    
    // Monitor user interactions
    this.observeInteractions();
  }

  private observeWebVitals(): void {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.frontend.coreWebVitals.lcp = lastEntry.startTime;
      this.checkThresholds();
    });
    
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(lcpObserver);

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.processingStart) {
          this.metrics.frontend.coreWebVitals.fid = entry.processingStart - entry.startTime;
          this.checkThresholds();
        }
      });
    });
    
    fidObserver.observe({ entryTypes: ['first-input'] });
    this.observers.push(fidObserver);

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          this.metrics.frontend.coreWebVitals.cls = clsValue;
          this.checkThresholds();
        }
      });
    });
    
    clsObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(clsObserver);
  }

  private observeResourceTiming(): void {
    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.name.includes('.js') || entry.name.includes('.css')) {
          // Track bundle sizes and load times
          const resource = entry as PerformanceResourceTiming;
          if (resource.transferSize) {
            this.metrics.frontend.bundleSize += resource.transferSize;
          }
        }
      });
      this.checkThresholds();
    });
    
    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.push(resourceObserver);
  }

  private observeInteractions(): void {
    // Monitor interaction time using Event Timing API
    if ('PerformanceEventTiming' in window) {
      const interactionObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if ((entry as any).processingStart) {
            const interactionTime = (entry as any).processingStart - entry.startTime;
            this.metrics.frontend.interactionTime = Math.max(
              this.metrics.frontend.interactionTime,
              interactionTime
            );
            this.checkThresholds();
          }
        });
      });
      
      interactionObserver.observe({ entryTypes: ['event'] });
      this.observers.push(interactionObserver);
    }
  }

  // Database performance tracking
  trackDatabaseQuery(queryTime: number, isSlow: boolean = false): void {
    this.metrics.database.queryTimes.push(queryTime);
    if (isSlow) {
      this.metrics.database.slowQueries++;
    }
    
    // Keep only last 100 queries
    if (this.metrics.database.queryTimes.length > 100) {
      this.metrics.database.queryTimes.shift();
    }
    
    this.checkThresholds();
  }

  trackConnectionPoolUsage(usage: number): void {
    this.metrics.database.connectionPoolUsage = usage;
    this.checkThresholds();
  }

  trackDatabaseCacheHitRate(hitRate: number): void {
    this.metrics.database.cacheHitRate = hitRate;
    this.checkThresholds();
  }

  // API performance tracking
  trackApiResponse(responseTime: number, isError: boolean = false): void {
    this.metrics.api.responseTimes.push(responseTime);
    
    // Keep only last 100 responses
    if (this.metrics.api.responseTimes.length > 100) {
      this.metrics.api.responseTimes.shift();
    }
    
    // Update error rate
    const recentResponses = this.metrics.api.responseTimes.slice(-20);
    const errorCount = recentResponses.filter(() => isError).length;
    this.metrics.api.errorRate = (errorCount / recentResponses.length) * 100;
    
    this.checkThresholds();
  }

  trackApiCacheHitRate(hitRate: number): void {
    this.metrics.api.cacheHitRate = hitRate;
    this.checkThresholds();
  }

  // AI service performance tracking
  trackAISearchPerformance(latency: number, cost: number, success: boolean): void {
    this.metrics.ai.searchLatency = latency;
    this.metrics.ai.costPerSearch = cost;
    
    // Update success rate (simple moving average)
    this.metrics.ai.successRate = this.metrics.ai.successRate * 0.9 + (success ? 100 : 0) * 0.1;
    
    this.checkThresholds();
  }

  trackAIExtractionTime(extractionTime: number): void {
    this.metrics.ai.extractionTime = extractionTime;
    this.checkThresholds();
  }

  // Performance analysis
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  getPerformanceReport(): {
    metrics: PerformanceMetrics;
    thresholds: PerformanceThresholds;
    violations: string[];
    recommendations: string[];
  } {
    const violations = this.getThresholdViolations();
    const recommendations = this.generateRecommendations(violations);
    
    return {
      metrics: this.metrics,
      thresholds: this.thresholds,
      violations,
      recommendations
    };
  }

  private getThresholdViolations(): string[] {
    const violations: string[] = [];
    
    // Database violations
    const avgQueryTime = this.metrics.database.queryTimes.length > 0
      ? this.metrics.database.queryTimes.reduce((a, b) => a + b, 0) / this.metrics.database.queryTimes.length
      : 0;
    
    if (avgQueryTime > this.thresholds.database.maxQueryTime) {
      violations.push(`Database query time (${avgQueryTime.toFixed(2)}ms) exceeds threshold (${this.thresholds.database.maxQueryTime}ms)`);
    }
    
    if (this.metrics.database.connectionPoolUsage > this.thresholds.database.maxConnectionUsage) {
      violations.push(`Database connection pool usage (${this.metrics.database.connectionPoolUsage}%) exceeds threshold (${this.thresholds.database.maxConnectionUsage}%)`);
    }
    
    if (this.metrics.database.cacheHitRate < this.thresholds.database.minCacheHitRate) {
      violations.push(`Database cache hit rate (${this.metrics.database.cacheHitRate}%) below threshold (${this.thresholds.database.minCacheHitRate}%)`);
    }
    
    // API violations
    const avgResponseTime = this.metrics.api.responseTimes.length > 0
      ? this.metrics.api.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.api.responseTimes.length
      : 0;
    
    if (avgResponseTime > this.thresholds.api.maxResponseTime) {
      violations.push(`API response time (${avgResponseTime.toFixed(2)}ms) exceeds threshold (${this.thresholds.api.maxResponseTime}ms)`);
    }
    
    if (this.metrics.api.errorRate > this.thresholds.api.maxErrorRate) {
      violations.push(`API error rate (${this.metrics.api.errorRate.toFixed(2)}%) exceeds threshold (${this.thresholds.api.maxErrorRate}%)`);
    }
    
    // Frontend violations
    if (this.metrics.frontend.bundleSize > this.thresholds.frontend.maxBundleSize) {
      violations.push(`Frontend bundle size (${(this.metrics.frontend.bundleSize / 1024).toFixed(2)}KB) exceeds threshold (${(this.thresholds.frontend.maxBundleSize / 1024)}KB)`);
    }
    
    if (this.metrics.frontend.coreWebVitals.lcp > this.thresholds.frontend.coreWebVitals.maxLcp) {
      violations.push(`Largest Contentful Paint (${this.metrics.frontend.coreWebVitals.lcp.toFixed(2)}ms) exceeds threshold (${this.thresholds.frontend.coreWebVitals.maxLcp}ms)`);
    }
    
    if (this.metrics.frontend.coreWebVitals.fid > this.thresholds.frontend.coreWebVitals.maxFid) {
      violations.push(`First Input Delay (${this.metrics.frontend.coreWebVitals.fid.toFixed(2)}ms) exceeds threshold (${this.thresholds.frontend.coreWebVitals.maxFid}ms)`);
    }
    
    if (this.metrics.frontend.coreWebVitals.cls > this.thresholds.frontend.coreWebVitals.maxCls) {
      violations.push(`Cumulative Layout Shift (${this.metrics.frontend.coreWebVitals.cls.toFixed(3)}) exceeds threshold (${this.thresholds.frontend.coreWebVitals.maxCls})`);
    }
    
    // AI service violations
    if (this.metrics.ai.searchLatency > this.thresholds.ai.maxSearchLatency) {
      violations.push(`AI search latency (${this.metrics.ai.searchLatency}ms) exceeds threshold (${this.thresholds.ai.maxSearchLatency}ms)`);
    }
    
    if (this.metrics.ai.extractionTime > this.thresholds.ai.maxExtractionTime) {
      violations.push(`AI extraction time (${this.metrics.ai.extractionTime}ms) exceeds threshold (${this.thresholds.ai.maxExtractionTime}ms)`);
    }
    
    if (this.metrics.ai.successRate < this.thresholds.ai.minSuccessRate) {
      violations.push(`AI service success rate (${this.metrics.ai.successRate.toFixed(2)}%) below threshold (${this.thresholds.ai.minSuccessRate}%)`);
    }
    
    return violations;
  }

  private generateRecommendations(violations: string[]): string[] {
    const recommendations: string[] = [];
    
    violations.forEach(violation => {
      if (violation.includes('Database query time')) {
        recommendations.push('Optimize database queries by adding proper indexes and using query optimization techniques');
      }
      
      if (violation.includes('connection pool usage')) {
        recommendations.push('Increase database connection pool size or implement connection pooling optimization');
      }
      
      if (violation.includes('cache hit rate')) {
        recommendations.push('Implement or improve caching strategies for frequently accessed data');
      }
      
      if (violation.includes('API response time')) {
        recommendations.push('Implement API response caching, compression, and optimize database queries');
      }
      
      if (violation.includes('bundle size')) {
        recommendations.push('Implement code splitting, tree shaking, and lazy loading to reduce bundle size');
      }
      
      if (violation.includes('Largest Contentful Paint')) {
        recommendations.push('Optimize image loading, implement lazy loading, and reduce server response time');
      }
      
      if (violation.includes('First Input Delay')) {
        recommendations.push('Reduce JavaScript execution time and break up long tasks');
      }
      
      if (violation.includes('Cumulative Layout Shift')) {
        recommendations.push('Specify dimensions for images and media elements to prevent layout shifts');
      }
      
      if (violation.includes('AI search latency')) {
        recommendations.push('Implement AI service caching, request batching, and optimize search algorithms');
      }
      
      if (violation.includes('AI extraction time')) {
        recommendations.push('Optimize AI extraction algorithms and implement parallel processing');
      }
      
      if (violation.includes('success rate')) {
        recommendations.push('Implement better error handling, retry mechanisms, and fallback strategies');
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('All performance metrics are within acceptable thresholds');
    }
    
    return recommendations;
  }

  private checkThresholds(): void {
    const violations = this.getThresholdViolations();
    if (violations.length > 0) {
      console.warn('Performance threshold violations detected:', violations);
    }
    
    // Notify subscribers
    this.measurementCallbacks.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.error('Error in performance measurement callback:', error);
      }
    });
  }

  // Subscribe to metric updates
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.measurementCallbacks.add(callback);
    
    return () => {
      this.measurementCallbacks.delete(callback);
    };
  }

  // Clean up observers
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.measurementCallbacks.clear();
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export utility functions
export function trackDatabaseQuery(queryTime: number, isSlow: boolean = false): void {
  performanceMonitor.trackDatabaseQuery(queryTime, isSlow);
}

export function trackApiResponse(responseTime: number, isError: boolean = false): void {
  performanceMonitor.trackApiResponse(responseTime, isError);
}

export function trackAISearchPerformance(latency: number, cost: number, success: boolean): void {
  performanceMonitor.trackAISearchPerformance(latency, cost, success);
}

export function getPerformanceReport() {
  return performanceMonitor.getPerformanceReport();
}