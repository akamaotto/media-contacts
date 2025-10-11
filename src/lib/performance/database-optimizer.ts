/**
 * Database Performance Optimizer
 * Provides query optimization, connection pooling, and performance monitoring
 */

import { prisma } from '@/lib/database/prisma';
import { logSlowQuery, getConnectionMetrics } from '@/lib/database/prisma-monitoring';
import { performanceMonitor } from './performance-monitor';

export interface QueryOptimization {
  query: string;
  optimizedQuery: string;
  improvement: number; // percentage improvement
  recommendations: string[];
}

export interface DatabaseOptimizationConfig {
  enableQueryCache: boolean;
  enableConnectionPooling: boolean;
  maxConnections: number;
  queryTimeout: number;
  slowQueryThreshold: number;
  enableQueryOptimization: boolean;
}

export class DatabaseOptimizer {
  private config: DatabaseOptimizationConfig;
  private queryCache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private connectionPool: any[] = [];
  private queryStats: Map<string, { count: number; totalTime: number; slowCount: number }> = new Map();

  constructor(config?: Partial<DatabaseOptimizationConfig>) {
    // Add environment check to prevent browser execution
    if (typeof window !== 'undefined') {
      console.error('🚨 PRISMA BROWSER ERROR: DatabaseOptimizer constructor called in browser environment');
      console.error('🚨 PRISMA BROWSER ERROR: typeof window:', typeof window);
      console.error('🚨 PRISMA BROWSER ERROR: process.env.NODE_ENV:', process.env?.NODE_ENV);
      console.error('🚨 PRISMA BROWSER ERROR: navigator.userAgent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'undefined');
      console.error('🚨 PRISMA BROWSER ERROR: Stack trace:', new Error().stack);
      throw new Error('DatabaseOptimizer cannot be used in browser environment');
    }
    
    console.log('🔍 PRISMA DEBUG: DatabaseOptimizer constructor called in server environment');
    
    this.config = {
      enableQueryCache: true,
      enableConnectionPooling: true,
      maxConnections: 10,
      queryTimeout: 30000, // 30 seconds
      slowQueryThreshold: 1000, // 1 second
      enableQueryOptimization: true,
      ...config
    };

    this.startPerformanceMonitoring();
  }

  /**
   * Execute a query with performance tracking and optimization
   */
  async executeQuery<T = any>(
    query: string,
    params?: any[],
    options?: {
      cacheKey?: string;
      cacheTTL?: number;
      useCache?: boolean;
    }
  ): Promise<T> {
    const startTime = Date.now();
    const cacheKey = options?.cacheKey || this.generateCacheKey(query, params);
    const useCache = options?.useCache ?? this.config.enableQueryCache;

    try {
      // Check cache first
      if (useCache) {
        const cached = this.getFromCache<T>(cacheKey);
        if (cached !== null) {
          const duration = Date.now() - startTime;
          this.trackQueryPerformance(query, duration, false, true);
          return cached;
        }
      }

      // Execute query with timeout
      const result = await this.executeQueryWithTimeout<T>(query, params);
      
      const duration = Date.now() - startTime;
      const isSlow = duration > this.config.slowQueryThreshold;
      
      // Track performance
      this.trackQueryPerformance(query, duration, isSlow, false);
      
      // Cache result if enabled
      if (useCache && result !== null) {
        this.setCache(cacheKey, result, options?.cacheTTL || 300); // 5 minutes default
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.trackQueryPerformance(query, duration, true, false);
      throw error;
    }
  }

  /**
   * Execute a Prisma query with performance tracking
   */
  async executePrismaQuery<T = any>(
    queryName: string,
    queryFn: () => Promise<T>,
    options?: {
      cacheKey?: string;
      cacheTTL?: number;
      useCache?: boolean;
    }
  ): Promise<T> {
    const startTime = Date.now();
    const cacheKey = options?.cacheKey || `prisma:${queryName}`;
    const useCache = options?.useCache ?? this.config.enableQueryCache;

    try {
      // Check cache first
      if (useCache) {
        const cached = this.getFromCache<T>(cacheKey);
        if (cached !== null) {
          const duration = Date.now() - startTime;
          this.trackQueryPerformance(queryName, duration, false, true);
          return cached;
        }
      }

      // Execute Prisma query
      const result = await queryFn();
      
      const duration = Date.now() - startTime;
      const isSlow = duration > this.config.slowQueryThreshold;
      
      // Track performance
      this.trackQueryPerformance(queryName, duration, isSlow, false);
      
      // Cache result if enabled
      if (useCache && result !== null) {
        this.setCache(cacheKey, result, options?.cacheTTL || 300);
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.trackQueryPerformance(queryName, duration, true, false);
      throw error;
    }
  }

  /**
   * Optimize a database query
   */
  optimizeQuery(query: string): QueryOptimization {
    const recommendations: string[] = [];
    let optimizedQuery = query;

    // Add LIMIT if missing
    if (!query.toLowerCase().includes('limit') && query.toLowerCase().startsWith('select')) {
      optimizedQuery += ' LIMIT 100';
      recommendations.push('Added LIMIT clause to prevent large result sets');
    }

    // Suggest indexes for WHERE clauses
    if (query.toLowerCase().includes('where')) {
      recommendations.push('Consider adding indexes on columns used in WHERE clauses');
    }

    // Suggest optimization for JOIN operations
    if (query.toLowerCase().includes('join')) {
      recommendations.push('Ensure JOIN columns are properly indexed');
      recommendations.push('Consider using INNER JOIN instead of LEFT JOIN when possible');
    }

    // Suggest optimization for ORDER BY
    if (query.toLowerCase().includes('order by')) {
      recommendations.push('Add composite indexes for columns used in ORDER BY');
    }

    // Calculate estimated improvement (simplified)
    const improvement = recommendations.length * 15; // 15% improvement per recommendation

    return {
      query,
      optimizedQuery,
      improvement: Math.min(improvement, 75), // Cap at 75%
      recommendations
    };
  }

  /**
   * Create database indexes for performance optimization
   */
  async createPerformanceIndexes(): Promise<void> {
    const indexes = [
      // Media contacts indexes (use existing columns only)
      'CREATE INDEX IF NOT EXISTS idx_media_contacts_email_verified ON media_contacts(email_verified_status) WHERE email_verified_status = true;',
      'CREATE INDEX IF NOT EXISTS idx_media_contacts_name_search ON media_contacts USING gin(to_tsvector(\'english\', name));',
      'CREATE INDEX IF NOT EXISTS idx_media_contacts_created_at ON media_contacts(created_at DESC);',

      // AI searches indexes (Prisma uses camelCase column names)
      'CREATE INDEX IF NOT EXISTS idx_ai_searches_user_status ON ai_searches("userId", status);',
      'CREATE INDEX IF NOT EXISTS idx_ai_searches_created_at ON ai_searches(created_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_ai_searches_status_created ON ai_searches(status, created_at);',

      // AI search sources indexes
      'CREATE INDEX IF NOT EXISTS idx_ai_search_sources_search_domain ON ai_search_sources("searchId", domain);',
      'CREATE INDEX IF NOT EXISTS idx_ai_search_sources_confidence ON ai_search_sources("confidenceScore" DESC);',

      // Activity logs indexes
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_user_timestamp ON activity_logs("userId", timestamp DESC);',
      'CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity, type);',

      // Dashboard metrics indexes
      'CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_type_date ON dashboard_metrics("metricType", date DESC);'
    ];

    for (const indexSql of indexes) {
      try {
        await prisma.$executeRawUnsafe(indexSql);
        console.log(`✅ Created performance index: ${indexSql.split('idx_')[1]?.split(' ')[0] || 'unknown'}`);
      } catch (error) {
        console.warn(`⚠️ Failed to create index: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Analyze query performance and provide recommendations
   */
  async analyzeQueryPerformance(query: string): Promise<{
    executionPlan: any;
    recommendations: string[];
    estimatedCost: number;
  }> {
    try {
      // Get query execution plan
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const result = await prisma.$queryRawUnsafe(explainQuery) as any[];
      
      const plan = result[0];
      const recommendations: string[] = [];
      
      // Analyze the execution plan
      if (plan['QUERY PLAN']) {
        const planData = plan['QUERY PLAN'][0];
        
        // Check for sequential scans
        if (planData['Node Type'] === 'Seq Scan') {
          recommendations.push('Consider adding an index to avoid sequential scan');
        }
        
        // Check for high cost
        if (planData['Total Cost'] > 1000) {
          recommendations.push('Query has high cost - consider optimization');
        }
        
        // Check for slow execution time
        if (planData['Execution Time'] > this.config.slowQueryThreshold) {
          recommendations.push('Query execution time is slow - consider optimization');
        }
        
        // Check for missing indexes
        if (planData['Node Type'] === 'Hash Join' && !planData['Hash Cond']) {
          recommendations.push('Consider adding indexes for hash join columns');
        }
      }
      
      return {
        executionPlan: plan,
        recommendations,
        estimatedCost: plan['QUERY PLAN']?.[0]?.['Total Cost'] || 0
      };
      
    } catch (error) {
      console.error('Failed to analyze query performance:', error);
      return {
        executionPlan: null,
        recommendations: ['Unable to analyze query - check syntax and permissions'],
        estimatedCost: 0
      };
    }
  }

  /**
   * Get database performance statistics
   */
  async getPerformanceStats(): Promise<{
    queryStats: Record<string, { count: number; avgTime: number; slowCount: number }>;
    cacheStats: { size: number; hitRate: number };
    connectionStats: any;
    recommendations: string[];
  }> {
    // Get connection metrics
    const connectionStats = await getConnectionMetrics();
    
    // Calculate query statistics
    const queryStats: Record<string, { count: number; avgTime: number; slowCount: number }> = {};
    this.queryStats.forEach((stats, query) => {
      queryStats[query] = {
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
        slowCount: stats.slowCount
      };
    });
    
    // Calculate cache statistics
    const cacheStats = {
      size: this.queryCache.size,
      hitRate: this.calculateCacheHitRate()
    };
    
    // Generate recommendations
    const recommendations = this.generateDatabaseRecommendations(queryStats, connectionStats, cacheStats);
    
    return {
      queryStats,
      cacheStats,
      connectionStats,
      recommendations
    };
  }

  private async executeQueryWithTimeout<T>(query: string, params?: any[]): Promise<T> {
    // Add environment check to prevent browser execution
    if (typeof window !== 'undefined') {
      console.error('🚨 PRISMA BROWSER ERROR: executeQueryWithTimeout called in browser environment');
      console.error('🚨 PRISMA BROWSER ERROR: typeof window:', typeof window);
      console.error('🚨 PRISMA BROWSER ERROR: Stack trace:', new Error().stack);
      throw new Error('Database queries cannot be executed in browser environment');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Query timeout after ${this.config.queryTimeout}ms`));
      }, this.config.queryTimeout);

      prisma.$queryRawUnsafe(query, ...(params || []))
        .then((result) => {
          clearTimeout(timeout);
          resolve(result as T);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private generateCacheKey(query: string, params?: any[]): string {
    const key = `${query}:${JSON.stringify(params || [])}`;
    return Buffer.from(key).toString('base64').substring(0, 64);
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp + cached.ttl * 1000) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private setCache(key: string, data: any, ttlSeconds: number): void {
    // Limit cache size
    if (this.queryCache.size > 1000) {
      const oldestKey = this.queryCache.keys().next().value;
      if (oldestKey) {
        this.queryCache.delete(oldestKey);
      }
    }
    
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds
    });
  }

  private calculateCacheHitRate(): number {
    // This is a simplified calculation
    // In a real implementation, you'd track hits and misses separately
    return this.queryCache.size > 0 ? 70 : 0; // Placeholder
  }

  private trackQueryPerformance(query: string, duration: number, isError: boolean, isCacheHit: boolean): void {
    if (!isCacheHit) {
      // Update query statistics
      const stats = this.queryStats.get(query) || { count: 0, totalTime: 0, slowCount: 0 };
      stats.count++;
      stats.totalTime += duration;
      if (duration > this.config.slowQueryThreshold) {
        stats.slowCount++;
      }
      this.queryStats.set(query, stats);
      
      // Log slow queries
      if (duration > this.config.slowQueryThreshold) {
        logSlowQuery(query, duration, this.config.slowQueryThreshold);
      }
      
      // Track in performance monitor
      performanceMonitor.trackDatabaseQuery(duration, duration > this.config.slowQueryThreshold);
    }
  }

  private generateDatabaseRecommendations(
    queryStats: Record<string, { count: number; avgTime: number; slowCount: number }>,
    connectionStats: any,
    cacheStats: { size: number; hitRate: number }
  ): string[] {
    const recommendations: string[] = [];
    
    // Analyze slow queries
    const slowQueries = Object.entries(queryStats).filter(([_, stats]) => stats.avgTime > this.config.slowQueryThreshold);
    if (slowQueries.length > 0) {
      recommendations.push(`${slowQueries.length} queries are running slowly - consider optimization`);
    }
    
    // Analyze connection usage
    if (connectionStats.totalConnections > connectionStats.connectionPoolSize * 0.8) {
      recommendations.push('Database connection pool usage is high - consider increasing pool size');
    }
    
    // Analyze cache effectiveness
    if (cacheStats.hitRate < 50) {
      recommendations.push('Cache hit rate is low - consider adjusting cache strategy');
    }
    
    // Analyze frequently executed queries
    const frequentQueries = Object.entries(queryStats).filter(([_, stats]) => stats.count > 100);
    if (frequentQueries.length > 0) {
      recommendations.push('Consider adding indexes for frequently executed queries');
    }
    
    return recommendations;
  }

  private startPerformanceMonitoring(): void {
    // Add environment check to prevent browser execution
    if (typeof window !== 'undefined') {
      console.error('🚨 PRISMA BROWSER ERROR: DatabaseOptimizer.startPerformanceMonitoring() called in browser environment');
      console.error('🚨 PRISMA BROWSER ERROR: typeof window:', typeof window);
      console.error('🚨 PRISMA BROWSER ERROR: process.env.NODE_ENV:', process.env?.NODE_ENV);
      console.error('🚨 PRISMA BROWSER ERROR: navigator.userAgent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'undefined');
      return;
    }
    
    console.log('🔍 PRISMA DEBUG: Starting performance monitoring in server environment');
    
    // Monitor connection pool every 30 seconds
    setInterval(async () => {
      try {
        const metrics = await getConnectionMetrics();
        performanceMonitor.trackConnectionPoolUsage(
          (metrics.totalConnections / metrics.connectionPoolSize) * 100
        );
      } catch (error) {
        console.error('Failed to monitor connection pool:', error);
      }
    }, 30000);
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.queryCache.clear();
    this.queryStats.clear();
  }
}

// Create singleton instance with environment check
let databaseOptimizer: DatabaseOptimizer | undefined;

try {
  if (typeof window === 'undefined') {
    console.log('🔍 PRISMA DEBUG: Creating databaseOptimizer singleton in server environment');
    databaseOptimizer = new DatabaseOptimizer();
  } else {
    console.error('🚨 PRISMA BROWSER ERROR: Attempting to create databaseOptimizer singleton in browser environment');
    console.error('🚨 PRISMA BROWSER ERROR: typeof window:', typeof window);
    console.error('🚨 PRISMA BROWSER ERROR: process.env.NODE_ENV:', process.env?.NODE_ENV);
    console.error('🚨 PRISMA BROWSER ERROR: Stack trace:', new Error().stack);
  }
} catch (error) {
  console.error('🚨 PRISMA BROWSER ERROR: Failed to create databaseOptimizer:', error);
}

// Export the databaseOptimizer instance
export { databaseOptimizer };

// Export utility functions with environment checks
export function executeOptimizedQuery<T>(
  query: string,
  params?: any[],
  options?: {
    cacheKey?: string;
    cacheTTL?: number;
    useCache?: boolean;
  }
): Promise<T> {
  if (typeof window !== 'undefined') {
    console.error('🚨 PRISMA BROWSER ERROR: executeOptimizedQuery called in browser environment');
    throw new Error('Database queries cannot be executed in browser environment');
  }
  
  if (!databaseOptimizer) {
    console.error('🚨 PRISMA BROWSER ERROR: databaseOptimizer is not available');
    throw new Error('Database optimizer not available');
  }
  
  return databaseOptimizer.executeQuery<T>(query, params, options);
}

export function executeOptimizedPrismaQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  options?: {
    cacheKey?: string;
    cacheTTL?: number;
    useCache?: boolean;
  }
): Promise<T> {
  if (typeof window !== 'undefined') {
    console.error('🚨 PRISMA BROWSER ERROR: executeOptimizedPrismaQuery called in browser environment');
    throw new Error('Database queries cannot be executed in browser environment');
  }
  
  if (!databaseOptimizer) {
    console.error('🚨 PRISMA BROWSER ERROR: databaseOptimizer is not available');
    throw new Error('Database optimizer not available');
  }
  
  return databaseOptimizer.executePrismaQuery<T>(queryName, queryFn, options);
}

export function optimizeDatabaseQuery(query: string): QueryOptimization {
  if (typeof window !== 'undefined') {
    console.error('🚨 PRISMA BROWSER ERROR: optimizeDatabaseQuery called in browser environment');
    throw new Error('Database queries cannot be optimized in browser environment');
  }
  
  if (!databaseOptimizer) {
    console.error('🚨 PRISMA BROWSER ERROR: databaseOptimizer is not available');
    throw new Error('Database optimizer not available');
  }
  
  return databaseOptimizer.optimizeQuery(query);
}
