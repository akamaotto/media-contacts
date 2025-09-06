/**
 * Database Query Optimization Service
 * Advanced techniques for improving database performance
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/database/prisma';

export class QueryOptimizationService {
  private static instance: QueryOptimizationService;
  private queryStats = new Map<string, { count: number; totalTime: number; avgTime: number }>();
  private slowQueryThreshold = 1000; // 1 second

  private constructor() {}

  static getInstance(): QueryOptimizationService {
    if (!QueryOptimizationService.instance) {
      QueryOptimizationService.instance = new QueryOptimizationService();
    }
    return QueryOptimizationService.instance;
  }

  /**
   * Execute query with performance monitoring
   */
  async executeWithMonitoring<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.trackQueryPerformance(queryName, duration);
      
      if (duration > this.slowQueryThreshold) {
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error(`Query failed: ${queryName} after ${duration}ms`, error);
      throw error;
    }
  }

  /**
   * Optimize SELECT queries by reducing returned columns
   */
  optimizeSelect<T extends Record<string, any>>(
    baseSelect: T,
    requestedFields?: string[]
  ): T {
    if (!requestedFields || requestedFields.length === 0) {
      return baseSelect;
    }

    const optimized: any = {};
    
    for (const field of requestedFields) {
      if (field in baseSelect) {
        optimized[field] = baseSelect[field];
      }
    }

    // Always include id for consistency
    if ('id' in baseSelect) {
      optimized.id = baseSelect.id;
    }

    return optimized;
  }

  /**
   * Build optimized WHERE clause with proper indexing hints
   */
  buildOptimizedWhere(
    conditions: Array<Prisma.beatsWhereInput | Prisma.media_contactsWhereInput>,
    indexHints?: string[]
  ): any {
    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0];

    // Optimize condition ordering for better index usage
    const optimizedConditions = this.optimizeConditionOrder(conditions);
    
    return { AND: optimizedConditions };
  }

  /**
   * Optimize pagination for large datasets
   */
  optimizePagination(
    page: number,
    pageSize: number,
    totalCount?: number
  ): { skip: number; take: number; useCursor: boolean; optimizedPageSize: number } {
    const maxPageSize = 100;
    const optimizedPageSize = Math.min(pageSize, maxPageSize);
    const skip = (page - 1) * optimizedPageSize;
    
    // Use cursor-based pagination for large offsets
    const useCursor = totalCount ? (skip > 10000 || totalCount > 50000) : skip > 1000;
    
    return {
      skip: useCursor ? 0 : skip,
      take: optimizedPageSize,
      useCursor,
      optimizedPageSize
    };
  }

  /**
   * Generate cursor for cursor-based pagination
   */
  generateCursor(id: string, sortField?: string, sortValue?: any): string {
    const cursor = { id };
    if (sortField && sortValue !== undefined) {
      (cursor as any)[sortField] = sortValue;
    }
    return Buffer.from(JSON.stringify(cursor)).toString('base64');
  }

  /**
   * Parse cursor for cursor-based pagination
   */
  parseCursor(cursor: string): any {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch {
      return null;
    }
  }

  /**
   * Batch multiple queries for better performance
   */
  async batchQueries<T>(
    queries: Array<() => Promise<T>>,
    batchSize = 5
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(query => query()));
      results.push(...batchResults);
      
      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < queries.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }

  /**
   * Suggest database indexes based on query patterns
   */
  suggestIndexes(): string[] {
    const suggestions: string[] = [];
    
    // Analyze query patterns
    for (const [queryName, stats] of this.queryStats) {
      if (stats.avgTime > this.slowQueryThreshold) {
        if (queryName.includes('search')) {
          suggestions.push("CREATE INDEX IF NOT EXISTS idx_beats_name_gin ON beats USING gin(to_tsvector('english', name));");
          suggestions.push("CREATE INDEX IF NOT EXISTS idx_beats_description_gin ON beats USING gin(to_tsvector('english', description));");
        }
        
        if (queryName.includes('filter')) {
          suggestions.push('CREATE INDEX IF NOT EXISTS idx_beats_updated_at ON beats(updated_at);');
          suggestions.push('CREATE INDEX IF NOT EXISTS idx_media_contacts_beats ON media_contacts_beats(beat_id, media_contact_id);');
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const stats = Array.from(this.queryStats.entries()).map(([name, data]) => ({
      queryName: name,
      executionCount: data.count,
      totalTime: data.totalTime,
      averageTime: data.avgTime,
      isSlowQuery: data.avgTime > this.slowQueryThreshold
    }));
    
    return {
      queries: stats,
      slowQueries: stats.filter(s => s.isSlowQuery),
      totalQueries: stats.reduce((sum, s) => sum + s.executionCount, 0),
      averageQueryTime: stats.length > 0 
        ? stats.reduce((sum, s) => sum + s.averageTime, 0) / stats.length 
        : 0
    };
  }

  /**
   * Track query performance
   */
  private trackQueryPerformance(queryName: string, duration: number): void {
    const existing = this.queryStats.get(queryName) || { count: 0, totalTime: 0, avgTime: 0 };
    
    existing.count += 1;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    
    this.queryStats.set(queryName, existing);
  }

  /**
   * Optimize condition ordering for better index usage
   */
  private optimizeConditionOrder(conditions: any[]): any[] {
    // Sort conditions to put most selective ones first
    return conditions.sort((a, b) => {
      // Exact matches first
      const aHasEquals = this.hasExactMatch(a);
      const bHasEquals = this.hasExactMatch(b);
      
      if (aHasEquals && !bHasEquals) return -1;
      if (!aHasEquals && bHasEquals) return 1;
      
      // Range queries next
      const aHasRange = this.hasRangeQuery(a);
      const bHasRange = this.hasRangeQuery(b);
      
      if (aHasRange && !bHasRange) return -1;
      if (!aHasRange && bHasRange) return 1;
      
      return 0;
    });
  }

  private hasExactMatch(condition: any): boolean {
    return JSON.stringify(condition).includes('\"equals\"') || 
           JSON.stringify(condition).includes('\"in\"');
  }

  private hasRangeQuery(condition: any): boolean {
    return JSON.stringify(condition).includes('\"gt\"') ||
           JSON.stringify(condition).includes('\"gte\"') ||
           JSON.stringify(condition).includes('\"lt\"') ||
           JSON.stringify(condition).includes('\"lte\"');
  }
}

// Export singleton
export const queryOptimizer = QueryOptimizationService.getInstance();
