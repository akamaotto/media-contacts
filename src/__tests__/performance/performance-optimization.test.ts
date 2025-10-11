/**
 * Performance Optimization Tests
 * Tests to validate the performance optimization implementation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { performanceMonitor } from '@/lib/performance/performance-monitor';
import { databaseOptimizer } from '@/lib/performance/database-optimizer';
import { apiOptimizer } from '@/lib/performance/api-optimizer';
import { frontendOptimizer } from '@/lib/performance/frontend-optimizer';
import { aiServiceOptimizer } from '@/lib/performance/ai-service-optimizer';
import { performanceIntegration } from '@/lib/performance/performance-integration';

// Mock fetch for API tests
global.fetch = jest.fn();

describe('Performance Optimization Tests', () => {
  beforeEach(() => {
    // Reset all performance services before each test
    performanceMonitor['metrics'] = performanceMonitor['initializeMetrics']();
    databaseOptimizer['queryCache'].clear();
    databaseOptimizer['queryStats'].clear();
    apiOptimizer['cache'].clear();
    apiOptimizer['requestStats'].clear();
    frontendOptimizer['loadedChunks'].clear();
    aiServiceOptimizer['cache'].clear();
    aiServiceOptimizer['requestStats'].clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Performance Monitor', () => {
    it('should track database query performance', () => {
      const queryTime = 150;
      const isSlow = queryTime > 100;

      performanceMonitor.trackDatabaseQuery(queryTime, isSlow);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.database.queryTimes).toContain(queryTime);
      expect(metrics.database.slowQueries).toBe(1);
    });

    it('should track API response performance', () => {
      const responseTime = 180;
      const isError = false;

      performanceMonitor.trackApiResponse(responseTime, isError);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.api.responseTimes).toContain(responseTime);
      expect(metrics.api.errorRate).toBe(0);
    });

    it('should track AI service performance', () => {
      const latency = 15000;
      const cost = 0.05;
      const success = true;

      performanceMonitor.trackAISearchPerformance(latency, cost, success);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.ai.searchLatency).toBe(latency);
      expect(metrics.ai.costPerSearch).toBe(cost);
      expect(metrics.ai.successRate).toBe(100);
    });

    it('should generate performance report with violations', () => {
      // Track some metrics that will violate thresholds
      performanceMonitor.trackDatabaseQuery(500, true); // Slow query
      performanceMonitor.trackApiResponse(1000, false); // Slow response
      performanceMonitor.trackAISearchPerformance(50000, 0.15, false); // Slow and expensive

      const report = performanceMonitor.getPerformanceReport();
      
      expect(report.violations.length).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.metrics.database.slowQueries).toBe(1);
    });
  });

  describe('Database Optimizer', () => {
    it('should cache query results', async () => {
      const query = 'SELECT * FROM users LIMIT 10';
      const params = [];
      const mockResult = [{ id: 1, name: 'Test User' }];

      // Mock the database query execution
      jest.spyOn(databaseOptimizer as any, 'executeQueryWithTimeout')
        .mockResolvedValue(mockResult);

      const result1 = await databaseOptimizer.executeQuery(query, params, {
        cacheKey: 'test-query',
        useCache: true
      });

      const result2 = await databaseOptimizer.executeQuery(query, params, {
        cacheKey: 'test-query',
        useCache: true
      });

      expect(result1).toEqual(mockResult);
      expect(result2).toEqual(mockResult);
      
      // The second call should hit the cache
      expect(databaseOptimizer['executeQueryWithTimeout']).toHaveBeenCalledTimes(1);
    });

    it('should optimize queries', () => {
      const query = 'SELECT * FROM media_contacts';
      const optimized = databaseOptimizer.optimizeQuery(query);

      expect(optimized.optimizedQuery).toContain('LIMIT');
      expect(optimized.recommendations.length).toBeGreaterThan(0);
      expect(optimized.improvement).toBeGreaterThan(0);
    });

    it('should track query statistics', async () => {
      const query = 'SELECT COUNT(*) FROM users';
      const mockResult = [{ count: 100 }];

      jest.spyOn(databaseOptimizer as any, 'executeQueryWithTimeout')
        .mockResolvedValue(mockResult);

      await databaseOptimizer.executeQuery(query);

      const stats = databaseOptimizer.getPerformanceStats();
      expect(stats.queryStats[query]).toBeDefined();
      expect(stats.queryStats[query].count).toBe(1);
      expect(stats.queryStats[query].avgTime).toBeGreaterThan(0);
    });
  });

  describe('API Optimizer', () => {
    it('should cache API responses', async () => {
      const mockRequest = new Request('https://example.com/api/test');
      const mockResponse = new Response(JSON.stringify({ data: 'test' }), {
        headers: { 'content-type': 'application/json' }
      });

      const cachedResponse = await apiOptimizer.optimizeResponse(
        mockRequest as any,
        mockResponse as any,
        {
          cacheKey: 'test-api',
          useCache: true
        }
      );

      expect(cachedResponse).toBeDefined();
      expect(apiOptimizer['cache'].size).toBe(1);
    });

    it('should apply rate limiting', async () => {
      const mockRequest = new Request('https://example.com/api/test');
      
      const result1 = await apiOptimizer.applyRateLimit(mockRequest as any);
      const result2 = await apiOptimizer.applyRateLimit(mockRequest as any);

      expect(result1.allowed).toBe(true);
      expect(result2.remaining).toBe(result1.remaining - 1);
    });

    it('should batch API requests', async () => {
      const requests = [
        () => Promise.resolve({ id: 1, data: 'test1' }),
        () => Promise.resolve({ id: 2, data: 'test2' })
      ];

      const results = await apiOptimizer.batchRequests(requests, {
        concurrent: true
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ id: 1, data: 'test1' });
      expect(results[1]).toEqual({ id: 2, data: 'test2' });
    });
  });

  describe('Frontend Optimizer', () => {
    it('should lazy load components', async () => {
      const mockComponentLoader = jest.fn().mockResolvedValue({
        default: () => 'Test Component'
      });

      const component = await frontendOptimizer.lazyLoadComponent(mockComponentLoader, {
        chunkName: 'test-component'
      });

      expect(mockComponentLoader).toHaveBeenCalled();
      expect(frontendOptimizer['loadedChunks'].has('test-component')).toBe(true);
    });

    it('should prefetch components', () => {
      const mockComponentLoader = jest.fn().mockResolvedValue({
        default: () => 'Test Component'
      });

      frontendOptimizer.prefetchComponent(mockComponentLoader, 'test-prefetch');

      // Prefetch should be called asynchronously
      setTimeout(() => {
        expect(mockComponentLoader).toHaveBeenCalled();
      }, 150);
    });

    it('should generate bundle analysis', async () => {
      const analysis = await frontendOptimizer.analyzeBundle();

      expect(analysis.totalSize).toBeGreaterThan(0);
      expect(analysis.chunks.length).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('AI Service Optimizer', () => {
    it('should cache AI service responses', async () => {
      const mockRequest = {
        id: 'test-ai-request',
        type: 'search' as const,
        payload: { query: 'test query' },
        priority: 'normal' as const
      };

      // Mock the AI service execution
      jest.spyOn(aiServiceOptimizer as any, 'executeImmediateRequest')
        .mockResolvedValue({
          id: mockRequest.id,
          type: mockRequest.type,
          data: { results: [] },
          success: true,
          duration: 1000,
          cost: 0.05,
          cached: false
        });

      const result1 = await aiServiceOptimizer.executeRequest(mockRequest);
      const result2 = await aiServiceOptimizer.executeRequest(mockRequest);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // The second call should hit the cache
      expect(aiServiceOptimizer['executeImmediateRequest']).toHaveBeenCalledTimes(1);
    });

    it('should batch AI service requests', async () => {
      const requests = [
        {
          id: 'batch-request-1',
          type: 'search' as const,
          payload: { query: 'test query 1' },
          priority: 'normal' as const
        },
        {
          id: 'batch-request-2',
          type: 'search' as const,
          payload: { query: 'test query 2' },
          priority: 'normal' as const
        }
      ];

      // Mock batch processing
      jest.spyOn(aiServiceOptimizer as any, 'simulateBatchRequest')
        .mockResolvedValue([{}, {}]);

      const results = await aiServiceOptimizer.batchRequests(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    it('should track AI service statistics', async () => {
      const mockRequest = {
        id: 'stats-request',
        type: 'search' as const,
        payload: { query: 'test query' },
        priority: 'normal' as const
      };

      jest.spyOn(aiServiceOptimizer as any, 'executeImmediateRequest')
        .mockResolvedValue({
          id: mockRequest.id,
          type: mockRequest.type,
          data: { results: [] },
          success: true,
          duration: 2000,
          cost: 0.08,
          cached: false
        });

      await aiServiceOptimizer.executeRequest(mockRequest);

      const stats = aiServiceOptimizer.getPerformanceStats();
      expect(stats.requestStats[mockRequest.type]).toBeDefined();
      expect(stats.requestStats[mockRequest.type].count).toBe(1);
      expect(stats.requestStats[mockRequest.type].avgTime).toBe(2000);
    });
  });

  describe('Performance Integration', () => {
    it('should initialize all performance services', async () => {
      const mockConfig = {
        enableMonitoring: true,
        enableAutoOptimization: true,
        monitoringInterval: 1000
      };

      await expect(performanceIntegration.initialize()).resolves.not.toThrow();
    });

    it('should generate comprehensive performance report', async () => {
      // Track some metrics
      performanceMonitor.trackDatabaseQuery(150, false);
      performanceMonitor.trackApiResponse(180, false);
      performanceMonitor.trackAISearchPerformance(15000, 0.05, true);

      const report = await performanceIntegration.getPerformanceReport();

      expect(report.timestamp).toBeInstanceOf(Date);
      expect(report.metrics).toBeDefined();
      expect(report.violations).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.overallScore).toBeGreaterThanOrEqual(0);
      expect(report.overallScore).toBeLessThanOrEqual(100);
    });

    it('should execute optimized database queries', async () => {
      const query = 'SELECT * FROM users LIMIT 5';
      const mockResult = [{ id: 1, name: 'Test User' }];

      jest.spyOn(databaseOptimizer as any, 'executeQuery')
        .mockResolvedValue(mockResult);

      const result = await performanceIntegration.executeOptimizedQuery(query);

      expect(result).toEqual(mockResult);
    });

    it('should execute optimized AI service requests', async () => {
      const request = {
        id: 'integration-test-request',
        type: 'search' as const,
        payload: { query: 'test query' },
        priority: 'normal' as const
      };

      jest.spyOn(aiServiceOptimizer as any, 'executeRequest')
        .mockResolvedValue({
          id: request.id,
          type: request.type,
          data: { results: [] },
          success: true,
          duration: 1000,
          cost: 0.05,
          cached: false
        });

      const result = await performanceIntegration.executeOptimizedAIRequest(request);

      expect(result.success).toBe(true);
    });
  });

  describe('Performance Thresholds', () => {
    it('should alert on slow database queries', () => {
      const slowQueryTime = 200; // Above threshold of 100ms
      performanceMonitor.trackDatabaseQuery(slowQueryTime, true);

      const report = performanceMonitor.getPerformanceReport();
      const dbViolations = report.violations.filter(v => v.includes('Database'));
      
      expect(dbViolations.length).toBeGreaterThan(0);
    });

    it('should alert on slow API responses', () => {
      const slowResponseTime = 500; // Above threshold of 200ms
      performanceMonitor.trackApiResponse(slowResponseTime, false);

      const report = performanceMonitor.getPerformanceReport();
      const apiViolations = report.violations.filter(v => v.includes('API'));
      
      expect(apiViolations.length).toBeGreaterThan(0);
    });

    it('should alert on slow AI service responses', () => {
      const slowAILatency = 40000; // Above threshold of 30 seconds
      performanceMonitor.trackAISearchPerformance(slowAILatency, 0.10, true);

      const report = performanceMonitor.getPerformanceReport();
      const aiViolations = report.violations.filter(v => v.includes('AI'));
      
      expect(aiViolations.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Recommendations', () => {
    it('should provide database optimization recommendations', () => {
      // Track slow queries to trigger recommendations
      performanceMonitor.trackDatabaseQuery(500, true);
      performanceMonitor.trackDatabaseQuery(600, true);

      const report = performanceMonitor.getPerformanceReport();
      const dbRecommendations = report.recommendations.filter(r => 
        r.includes('database') || r.includes('query') || r.includes('index')
      );
      
      expect(dbRecommendations.length).toBeGreaterThan(0);
    });

    it('should provide API optimization recommendations', () => {
      // Track slow API responses to trigger recommendations
      performanceMonitor.trackApiResponse(500, false);
      performanceMonitor.trackApiResponse(600, false);

      const report = performanceMonitor.getPerformanceReport();
      const apiRecommendations = report.recommendations.filter(r => 
        r.includes('API') || r.includes('cache') || r.includes('response')
      );
      
      expect(apiRecommendations.length).toBeGreaterThan(0);
    });

    it('should provide frontend optimization recommendations', () => {
      const mockReport = {
        metrics: {
          frontend: {
            bundleSize: 600 * 1024, // Above threshold of 500KB
            coreWebVitals: {
              lcp: 3000, // Above threshold of 2.5s
              fid: 150, // Above threshold of 100ms
              cls: 0.2 // Above threshold of 0.1
            }
          }
        },
        violations: [],
        recommendations: []
      };

      // Simulate frontend performance issues
      performanceMonitor['metrics'].frontend.bundleSize = 600 * 1024;
      performanceMonitor['metrics'].frontend.coreWebVitals.lcp = 3000;
      performanceMonitor['metrics'].frontend.coreWebVitals.fid = 150;
      performanceMonitor['metrics'].frontend.coreWebVitals.cls = 0.2;

      const report = performanceMonitor.getPerformanceReport();
      const frontendRecommendations = report.recommendations.filter(r => 
        r.includes('bundle') || r.includes('image') || r.includes('loading')
      );
      
      expect(frontendRecommendations.length).toBeGreaterThan(0);
    });
  });
});