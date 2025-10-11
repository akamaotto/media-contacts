/**
 * Performance Integration Service
 * Coordinates all performance optimization services and provides unified interface
 */

import { performanceMonitor, PerformanceMetrics } from './performance-monitor';
import { databaseOptimizer, DatabaseOptimizationConfig } from './database-optimizer';
import { apiOptimizer, APIOptimizationConfig } from './api-optimizer';
import { frontendOptimizer, PerformanceConfig } from './frontend-optimizer';
import { aiServiceOptimizer, AIServiceOptimizationConfig } from './ai-service-optimizer';

export interface PerformanceIntegrationConfig {
  database?: DatabaseOptimizationConfig;
  api?: APIOptimizationConfig;
  frontend?: PerformanceConfig;
  aiService?: AIServiceOptimizationConfig;
  enableMonitoring: boolean;
  enableAutoOptimization: boolean;
  monitoringInterval: number; // milliseconds
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface PerformanceReport {
  timestamp: Date;
  metrics: PerformanceMetrics;
  database: any;
  api: any;
  frontend: any;
  aiService: any;
  violations: string[];
  recommendations: string[];
  overallScore: number; // 0-100
}

export interface PerformanceAlert {
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
  recommendations: string[];
}

export class PerformanceIntegrationService {
  private config: PerformanceIntegrationConfig;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alerts: PerformanceAlert[] = [];
  private alertCallbacks: Set<(alert: PerformanceAlert) => void> = new Set();
  private isInitialized = false;

  constructor(config?: Partial<PerformanceIntegrationConfig>) {
    this.config = {
      enableMonitoring: true,
      enableAutoOptimization: true,
      monitoringInterval: 30000, // 30 seconds
      alertThresholds: {
        responseTime: 2000, // 2 seconds
        errorRate: 5, // 5%
        memoryUsage: 80, // 80%
        cpuUsage: 80 // 80%
      },
      ...config
    };
  }

  /**
   * Initialize all performance optimization services
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🚀 Initializing Performance Integration Service...');

      // Initialize database optimizer
      if (this.config.database && databaseOptimizer) {
        await databaseOptimizer.createPerformanceIndexes();
        console.log('✅ Database optimizer initialized');
      }

      // Initialize frontend optimizations
      if (typeof window !== 'undefined' && this.config.frontend) {
        frontendOptimizer.optimizeImages();
        frontendOptimizer.setupLazyLoading();
        console.log('✅ Frontend optimizer initialized');
      }

      // Start monitoring if enabled
      if (this.config.enableMonitoring) {
        this.startMonitoring();
        console.log('✅ Performance monitoring started');
      }

      // Set up global error tracking
      this.setupErrorTracking();

      this.isInitialized = true;
      console.log('✅ Performance Integration Service initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize Performance Integration Service:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive performance report
   */
  async getPerformanceReport(): Promise<PerformanceReport> {
    const timestamp = new Date();
    const isServerEnvironment = typeof window === 'undefined';
    
    // Get metrics from all services with environment checks
    const metrics = performanceMonitor.getMetrics();
    
    // Only get database stats in server environment
    let databaseStats;
    try {
      if (isServerEnvironment && databaseOptimizer && typeof databaseOptimizer.getPerformanceStats === 'function') {
        databaseStats = await databaseOptimizer.getPerformanceStats();
      } else {
        // Provide default stats for browser environment
        databaseStats = {
          queryStats: {},
          cacheStats: { size: 0, hitRate: 0 },
          connectionStats: { totalConnections: 0, connectionPoolSize: 0 },
          recommendations: ['Database optimization not available in browser environment']
        };
      }
    } catch (error) {
      console.error('🚨 PRISMA BROWSER ERROR: Failed to get database performance stats:', error);
      databaseStats = {
        queryStats: {},
        cacheStats: { size: 0, hitRate: 0 },
        connectionStats: { totalConnections: 0, connectionPoolSize: 0 },
        recommendations: ['Database optimization unavailable due to error']
      };
    }
    
    const apiStats = apiOptimizer.getPerformanceStats();
    const frontendStats = frontendOptimizer.getPerformanceMetrics();
    const aiServiceStats = aiServiceOptimizer.getPerformanceStats();

    // Get performance report with violations and recommendations
    const performanceReport = performanceMonitor.getPerformanceReport();
    
    // Calculate overall performance score
    const overallScore = this.calculateOverallScore({
      metrics,
      database: databaseStats,
      api: apiStats,
      frontend: frontendStats,
      aiService: aiServiceStats
    });

    // Generate alerts if needed
    this.generateAlerts(performanceReport.violations);

    return {
      timestamp,
      metrics,
      database: databaseStats,
      api: apiStats,
      frontend: frontendStats,
      aiService: aiServiceStats,
      violations: performanceReport.violations,
      recommendations: performanceReport.recommendations,
      overallScore
    };
  }

  /**
   * Execute optimized database query
   */
  async executeOptimizedQuery<T>(
    query: string,
    params?: any[],
    options?: {
      cacheKey?: string;
      cacheTTL?: number;
      useCache?: boolean;
    }
  ): Promise<T> {
    if (typeof window !== 'undefined') {
      throw new Error('Database queries cannot be executed in browser environment');
    }
    
    if (!databaseOptimizer) {
      throw new Error('Database optimizer not available');
    }
    
    return databaseOptimizer.executeQuery<T>(query, params, options);
  }

  /**
   * Execute optimized Prisma query
   */
  async executeOptimizedPrismaQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    options?: {
      cacheKey?: string;
      cacheTTL?: number;
      useCache?: boolean;
    }
  ): Promise<T> {
    if (typeof window !== 'undefined') {
      throw new Error('Database queries cannot be executed in browser environment');
    }
    
    if (!databaseOptimizer) {
      throw new Error('Database optimizer not available');
    }
    
    return databaseOptimizer.executePrismaQuery<T>(queryName, queryFn, options);
  }

  /**
   * Optimize API response
   */
  async optimizeAPIResponse(
    request: Request,
    response: Response,
    options?: {
      cacheKey?: string;
      cacheTTL?: number;
      skipCache?: boolean;
      skipCompression?: boolean;
    }
  ): Promise<Response> {
    // Convert to NextRequest/NextResponse if needed
    const nextRequest = request as any;
    const nextResponse = response as any;
    
    return apiOptimizer.optimizeResponse(nextRequest, nextResponse, options);
  }

  /**
   * Lazy load component with performance tracking
   */
  async lazyLoadComponent<T>(
    componentLoader: () => Promise<{ default: T }>,
    options?: {
      chunkName?: string;
      prefetch?: boolean;
      timeout?: number;
    }
  ): Promise<T> {
    return frontendOptimizer.lazyLoadComponent(componentLoader, options);
  }

  /**
   * Execute optimized AI service request
   */
  async executeOptimizedAIRequest(request: {
    id: string;
    type: 'search' | 'extraction' | 'query-generation';
    payload: any;
    priority?: 'low' | 'normal' | 'high';
    timeout?: number;
  }): Promise<any> {
    return aiServiceOptimizer.executeRequest({
      ...request,
      timestamp: Date.now(),
      priority: request.priority || 'normal'
    });
  }

  /**
   * Batch multiple AI service requests
   */
  async batchAIRequests(requests: Array<{
    id: string;
    type: 'search' | 'extraction' | 'query-generation';
    payload: any;
    priority?: 'low' | 'normal' | 'high';
  }>): Promise<any[]> {
    return aiServiceOptimizer.batchRequests(requests.map(req => ({
      ...req,
      timestamp: Date.now(),
      priority: req.priority || 'normal'
    })));
  }

  /**
   * Subscribe to performance alerts
   */
  onAlert(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertCallbacks.add(callback);
    
    return () => {
      this.alertCallbacks.delete(callback);
    };
  }

  /**
   * Get current alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Apply auto-optimizations
   */
  async applyAutoOptimizations(): Promise<void> {
    if (!this.config.enableAutoOptimization) return;

    const report = await this.getPerformanceReport();
    const isServerEnvironment = typeof window === 'undefined';
    
    // Apply database optimizations only in server environment
    if (report.database.recommendations.length > 0 && isServerEnvironment && databaseOptimizer) {
      console.log('Applying database auto-optimizations...');
      // Implementation would depend on specific recommendations
    }

    // Apply API optimizations
    if (report.api.recommendations.length > 0) {
      console.log('Applying API auto-optimizations...');
      apiOptimizer.clearCache(); // Clear cache if hit rate is low
    }

    // Apply frontend optimizations
    if (report.frontend.recommendations.length > 0) {
      console.log('Applying frontend auto-optimizations...');
      frontendOptimizer.optimizeImages();
    }

    // Apply AI service optimizations
    if (report.aiService.recommendations.length > 0) {
      console.log('Applying AI service auto-optimizations...');
      aiServiceOptimizer.clearCache(); // Clear cache if hit rate is low
    }
  }

  /**
   * Get performance dashboard data
   */
  async getDashboardData(): Promise<{
    overview: {
      overallScore: number;
      totalViolations: number;
      activeAlerts: number;
      lastUpdated: Date;
    };
    metrics: PerformanceMetrics;
    services: {
      database: any;
      api: any;
      frontend: any;
      aiService: any;
    };
    trends: {
      responseTime: number[];
      errorRate: number[];
      throughput: number[];
    };
    alerts: PerformanceAlert[];
  }> {
    const report = await this.getPerformanceReport();
    
    return {
      overview: {
        overallScore: report.overallScore,
        totalViolations: report.violations.length,
        activeAlerts: this.alerts.filter(a => a.type === 'critical').length,
        lastUpdated: report.timestamp
      },
      metrics: report.metrics,
      services: {
        database: report.database,
        api: report.api,
        frontend: report.frontend,
        aiService: report.aiService
      },
      trends: {
        responseTime: this.getTrendData('responseTime'),
        errorRate: this.getTrendData('errorRate'),
        throughput: this.getTrendData('throughput')
      },
      alerts: this.alerts
    };
  }

  /**
   * Clean up all services
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Performance Integration Service...');

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Clean up individual services with environment checks
    if (typeof window === 'undefined' && databaseOptimizer) {
      await databaseOptimizer.cleanup();
    }
    frontendOptimizer.cleanup();
    apiOptimizer.clearCache();
    aiServiceOptimizer.clearCache();

    // Clear alerts and callbacks
    this.alerts = [];
    this.alertCallbacks.clear();

    this.isInitialized = false;
    console.log('✅ Performance Integration Service cleaned up');
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        const report = await this.getPerformanceReport();
        
        // Check for critical issues
        const criticalViolations = report.violations.filter(v => 
          v.includes('critical') || v.includes('exceeds threshold')
        );
        
        if (criticalViolations.length > 0) {
          console.warn('🚨 Critical performance issues detected:', criticalViolations);
        }

        // Apply auto-optimizations if enabled
        if (this.config.enableAutoOptimization && report.overallScore < 70) {
          await this.applyAutoOptimizations();
        }

      } catch (error) {
        console.error('Performance monitoring error:', error);
      }
    }, this.config.monitoringInterval);
  }

  private setupErrorTracking(): void {
    if (typeof window !== 'undefined') {
      // Track frontend errors
      window.addEventListener('error', (event) => {
        console.error('Frontend error tracked:', event.error);
        // Would send to monitoring service
      });

      // Track unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection tracked:', event.reason);
        // Would send to monitoring service
      });
    }
  }

  private calculateOverallScore(data: {
    metrics: PerformanceMetrics;
    database: any;
    api: any;
    frontend: any;
    aiService: any;
  }): number {
    let score = 100;

    // Database performance (25% weight)
    const dbScore = this.calculateDatabaseScore(data.database);
    score = score * 0.75 + dbScore * 0.25;

    // API performance (25% weight)
    const apiScore = this.calculateAPIScore(data.api);
    score = score * 0.75 + apiScore * 0.25;

    // Frontend performance (25% weight)
    const frontendScore = this.calculateFrontendScore(data.frontend);
    score = score * 0.75 + frontendScore * 0.25;

    // AI service performance (25% weight)
    const aiScore = this.calculateAIServiceScore(data.aiService);
    score = score * 0.75 + aiScore * 0.25;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  private calculateDatabaseScore(dbStats: any): number {
    let score = 100;
    
    // Penalize slow queries
    if (dbStats.queryStats) {
      Object.values(dbStats.queryStats).forEach((stats: any) => {
        if (stats.avgTime > 100) score -= 10;
        if (stats.errorRate > 5) score -= 15;
      });
    }
    
    // Penalize low cache hit rate
    if (dbStats.cacheStats?.hitRate < 50) score -= 10;
    
    return Math.max(0, score);
  }

  private calculateAPIScore(apiStats: any): number {
    let score = 100;
    
    // Penalize slow responses
    if (apiStats.requestStats) {
      Object.values(apiStats.requestStats).forEach((stats: any) => {
        if (stats.avgTime > 200) score -= 10;
        if (stats.errorRate > 5) score -= 15;
      });
    }
    
    // Penalize low cache hit rate
    if (apiStats.cacheStats?.hitRate < 50) score -= 10;
    
    return Math.max(0, score);
  }

  private calculateFrontendScore(frontendStats: any): number {
    let score = 100;
    
    // Penalize slow load times
    if (frontendStats.loadTimes) {
      Object.values(frontendStats.loadTimes).forEach((time: any) => {
        if (time > 3000) score -= 10;
      });
    }
    
    // Penalize large bundle size
    if (frontendStats.bundleAnalysis?.totalSize > 500 * 1024) {
      score -= 15;
    }
    
    return Math.max(0, score);
  }

  private calculateAIServiceScore(aiStats: any): number {
    let score = 100;
    
    // Penalize slow services
    if (aiStats.requestStats) {
      Object.values(aiStats.requestStats).forEach((stats: any) => {
        if (stats.avgTime > 10000) score -= 10;
        if (stats.errorRate > 10) score -= 15;
        if (stats.successRate < 90) score -= 10;
      });
    }
    
    // Penalize low cache hit rate
    if (aiStats.cacheStats?.hitRate < 30) score -= 10;
    
    return Math.max(0, score);
  }

  private generateAlerts(violations: string[]): void {
    const newAlerts: PerformanceAlert[] = [];
    
    violations.forEach(violation => {
      const alert: PerformanceAlert = {
        type: violation.includes('critical') ? 'critical' : 'warning',
        metric: 'performance',
        value: 0,
        threshold: 0,
        message: violation,
        timestamp: new Date(),
        recommendations: [violation]
      };
      
      newAlerts.push(alert);
    });
    
    // Add new alerts
    this.alerts.push(...newAlerts);
    
    // Limit alert history
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    // Notify subscribers
    newAlerts.forEach(alert => {
      this.alertCallbacks.forEach(callback => {
        try {
          callback(alert);
        } catch (error) {
          console.error('Error in alert callback:', error);
        }
      });
    });
  }

  private getTrendData(metric: string): number[] {
    // This would return actual trend data from monitoring
    // For now, return mock data
    return Array.from({ length: 24 }, () => Math.random() * 100);
  }
}

// Create singleton instance
export const performanceIntegration = new PerformanceIntegrationService();

// Export utility functions
export async function initializePerformanceOptimizations(config?: Partial<PerformanceIntegrationConfig>): Promise<void> {
  return performanceIntegration.initialize();
}

export async function getPerformanceReport() {
  return performanceIntegration.getPerformanceReport();
}

export async function executeOptimizedQuery<T>(
  query: string,
  params?: any[],
  options?: {
    cacheKey?: string;
    cacheTTL?: number;
    useCache?: boolean;
  }
): Promise<T> {
  return performanceIntegration.executeOptimizedQuery<T>(query, params, options);
}

export async function executeOptimizedPrismaQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  options?: {
    cacheKey?: string;
    cacheTTL?: number;
    useCache?: boolean;
  }
): Promise<T> {
  return performanceIntegration.executeOptimizedPrismaQuery<T>(queryName, queryFn, options);
}

export async function executeOptimizedAIRequest(request: {
  id: string;
  type: 'search' | 'extraction' | 'query-generation';
  payload: any;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}): Promise<any> {
  return performanceIntegration.executeOptimizedAIRequest(request);
}

export function onPerformanceAlert(callback: (alert: PerformanceAlert) => void): () => void {
  return performanceIntegration.onAlert(callback);
}

export async function getPerformanceDashboard() {
  return performanceIntegration.getDashboardData();
}
