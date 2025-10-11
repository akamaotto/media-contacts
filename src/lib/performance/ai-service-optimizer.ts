/**
 * AI Service Performance Optimizer
 * Provides request batching, caching, and optimization for AI service integrations
 */

import { performanceMonitor } from './performance-monitor';

export interface AIServiceRequest {
  id: string;
  type: 'search' | 'extraction' | 'query-generation';
  payload: any;
  priority: 'low' | 'normal' | 'high';
  timestamp: number;
  timeout?: number;
  retries?: number;
}

export interface AIServiceResponse {
  id: string;
  type: string;
  data: any;
  success: boolean;
  error?: string;
  duration: number;
  cost: number;
  cached: boolean;
}

export interface BatchConfig {
  maxBatchSize: number;
  batchTimeout: number; // milliseconds
  enableBatching: boolean;
  batchableTypes: string[];
}

export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  defaultTTL: number; // seconds
  keyGenerator: (request: AIServiceRequest) => string;
}

export interface AIServiceOptimizationConfig {
  enableCaching: boolean;
  enableBatching: boolean;
  enableRequestDeduplication: boolean;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
  cache: CacheConfig;
  batch: BatchConfig;
}

export class AIServiceOptimizer {
  private config: AIServiceOptimizationConfig;
  private cache: Map<string, { data: any; timestamp: number; ttl: number; cost: number }> = new Map();
  private requestQueue: Map<string, AIServiceRequest[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingRequests: Map<string, Promise<AIServiceResponse>> = new Map();
  private requestStats: Map<string, { count: number; totalTime: number; errorCount: number; cost: number }> = new Map();
  private activeRequests: Set<string> = new Set();

  constructor(config?: Partial<AIServiceOptimizationConfig>) {
    this.config = {
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
        defaultTTL: 1800, // 30 minutes
        keyGenerator: (request) => this.generateCacheKey(request)
      },
      batch: {
        maxBatchSize: 10,
        batchTimeout: 5000,
        enableBatching: true,
        batchableTypes: ['search', 'query-generation']
      },
      ...config
    };
  }

  /**
   * Execute an AI service request with optimization
   */
  async executeRequest(request: AIServiceRequest): Promise<AIServiceResponse> {
    const startTime = Date.now();
    const requestId = request.id;

    try {
      // Check for duplicate requests
      if (this.config.enableRequestDeduplication) {
        const existingRequest = this.pendingRequests.get(requestId);
        if (existingRequest) {
          return existingRequest;
        }
      }

      // Check cache first
      if (this.config.enableCaching && this.config.cache.enabled) {
        const cached = this.getCachedResponse(request);
        if (cached) {
          const duration = Date.now() - startTime;
          performanceMonitor.trackAISearchPerformance(duration, 0, true);
          
          return {
            id: requestId,
            type: request.type,
            data: cached.data,
            success: true,
            duration,
            cost: 0,
            cached: true
          };
        }
      }

      // Create request promise
      const requestPromise = this.processRequest(request);
      this.pendingRequests.set(requestId, requestPromise);

      // Execute request
      const response = await requestPromise;
      
      // Cache successful response
      if (response.success && this.config.enableCaching && this.config.cache.enabled) {
        this.setCachedResponse(request, response.data, response.cost);
      }

      // Track performance
      performanceMonitor.trackAISearchPerformance(response.duration, response.cost, response.success);
      this.trackRequestStats(request.type, response.duration, !response.success, response.cost);

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      performanceMonitor.trackAISearchPerformance(duration, 0, false);
      this.trackRequestStats(request.type, duration, true, 0);
      
      return {
        id: requestId,
        type: request.type,
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        cost: 0,
        cached: false
      };
    } finally {
      this.pendingRequests.delete(requestId);
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Batch multiple AI service requests
   */
  async batchRequests(requests: AIServiceRequest[]): Promise<AIServiceResponse[]> {
    if (!this.config.enableBatching) {
      // Execute requests individually
      const promises = requests.map(request => this.executeRequest(request));
      return Promise.all(promises);
    }

    // Group requests by type
    const groupedRequests = new Map<string, AIServiceRequest[]>();
    
    requests.forEach(request => {
      if (this.config.batch.batchableTypes.includes(request.type)) {
        if (!groupedRequests.has(request.type)) {
          groupedRequests.set(request.type, []);
        }
        groupedRequests.get(request.type)!.push(request);
      }
    });

    // Process batched and non-batched requests
    const results: AIServiceResponse[] = [];
    
    for (const [type, typeRequests] of groupedRequests) {
      const batchResults = await this.processBatch(typeRequests);
      results.push(...batchResults);
    }

    // Process non-batchable requests individually
    const nonBatchableRequests = requests.filter(req => 
      !this.config.batch.batchableTypes.includes(req.type)
    );
    
    if (nonBatchableRequests.length > 0) {
      const individualResults = await Promise.all(
        nonBatchableRequests.map(request => this.executeRequest(request))
      );
      results.push(...individualResults);
    }

    return results;
  }

  /**
   * Get AI service performance statistics
   */
  getPerformanceStats(): {
    requestStats: Record<string, { 
      count: number; 
      avgTime: number; 
      errorRate: number; 
      avgCost: number;
      successRate: number;
    }>;
    cacheStats: { size: number; hitRate: number; costSavings: number };
    batchStats: { batchesProcessed: number; avgBatchSize: number; efficiency: number };
    activeRequests: number;
    recommendations: string[];
  } {
    // Calculate request statistics
    const requestStats: Record<string, { 
      count: number; 
      avgTime: number; 
      errorRate: number; 
      avgCost: number;
      successRate: number;
    }> = {};
    
    this.requestStats.forEach((stats, type) => {
      requestStats[type] = {
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
        errorRate: (stats.errorCount / stats.count) * 100,
        avgCost: stats.cost / stats.count,
        successRate: ((stats.count - stats.errorCount) / stats.count) * 100
      };
    });

    // Calculate cache statistics
    const cacheStats = {
      size: this.cache.size,
      hitRate: this.calculateCacheHitRate(),
      costSavings: this.calculateCostSavings()
    };

    // Calculate batch statistics
    const batchStats = {
      batchesProcessed: this.requestQueue.size,
      avgBatchSize: this.calculateAverageBatchSize(),
      efficiency: this.calculateBatchEfficiency()
    };

    // Generate recommendations
    const recommendations = this.generateAIRecommendations(requestStats, cacheStats, batchStats);

    return {
      requestStats,
      cacheStats,
      batchStats,
      activeRequests: this.activeRequests.size,
      recommendations
    };
  }

  /**
   * Clear cache and statistics
   */
  clearCache(): void {
    this.cache.clear();
    this.requestStats.clear();
  }

  /**
   * Preload cache with common requests
   */
  async preloadCache(entries: Array<{
    request: AIServiceRequest;
    response: any;
    ttl?: number;
  }>): Promise<void> {
    for (const entry of entries) {
      this.setCachedResponse(entry.request, entry.response, 0, entry.ttl);
    }
  }

  private async processRequest(request: AIServiceRequest): Promise<AIServiceResponse> {
    const startTime = Date.now();
    this.activeRequests.add(request.id);

    try {
      // Check if request should be batched
      if (this.config.enableBatching && this.config.batch.batchableTypes.includes(request.type)) {
        return await this.addToBatch(request);
      }

      // Execute request immediately
      return await this.executeImmediateRequest(request);

    } catch (error) {
      // Retry logic
      if (this.config.enableRetry && (request.retries || 0) < this.config.maxRetries) {
        const retryRequest = {
          ...request,
          retries: (request.retries || 0) + 1
        };

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        
        return this.processRequest(retryRequest);
      }

      throw error;
    }
  }

  private async executeImmediateRequest(request: AIServiceRequest): Promise<AIServiceResponse> {
    const startTime = Date.now();
    
    // This would integrate with the actual AI service
    // For now, simulate the request
    const response = await this.simulateAIServiceRequest(request);
    
    return {
      id: request.id,
      type: request.type,
      data: response,
      success: true,
      duration: Date.now() - startTime,
      cost: this.calculateRequestCost(request),
      cached: false
    };
  }

  private async addToBatch(request: AIServiceRequest): Promise<AIServiceResponse> {
    const requestType = request.type;
    
    // Initialize batch queue if needed
    if (!this.requestQueue.has(requestType)) {
      this.requestQueue.set(requestType, []);
    }

    const batch = this.requestQueue.get(requestType)!;
    batch.push(request);

    // Set up batch timer if needed
    if (!this.batchTimers.has(requestType)) {
      const timer = setTimeout(() => {
        this.processBatchQueue(requestType);
      }, this.config.batch.batchTimeout);
      
      this.batchTimers.set(requestType, timer);
    }

    // Process batch immediately if it's full
    if (batch.length >= this.config.batch.maxBatchSize) {
      clearTimeout(this.batchTimers.get(requestType)!);
      this.batchTimers.delete(requestType);
      
      const results = await this.processBatchQueue(requestType);
      return results.find(r => r.id === request.id) || this.createErrorResponse(request);
    }

    // Wait for batch to complete
    return new Promise((resolve) => {
      const checkBatch = () => {
        const result = this.findBatchResult(request.id);
        if (result) {
          resolve(result);
        } else {
          setTimeout(checkBatch, 100);
        }
      };
      checkBatch();
    });
  }

  private async processBatchQueue(requestType: string): Promise<AIServiceResponse[]> {
    const batch = this.requestQueue.get(requestType) || [];
    this.requestQueue.delete(requestType);
    
    if (batch.length === 0) {
      return [];
    }

    const startTime = Date.now();
    
    try {
      // Process batch request
      const batchResults = await this.simulateBatchRequest(batch);
      
      const responses = batch.map((request, index) => ({
        id: request.id,
        type: request.type,
        data: batchResults[index] || null,
        success: true,
        duration: Date.now() - startTime,
        cost: this.calculateRequestCost(request) / batch.length, // Distribute cost
        cached: false
      }));

      // Store batch results for pending requests
      this.storeBatchResults(responses);
      
      return responses;

    } catch (error) {
      // Create error responses for all requests in batch
      const errorResponses = batch.map(request => this.createErrorResponse(request));
      this.storeBatchResults(errorResponses);
      return errorResponses;
    }
  }

  private async processBatch(requests: AIServiceRequest[]): Promise<AIServiceResponse[]> {
    const startTime = Date.now();
    
    try {
      // Simulate batch processing
      const batchResults = await this.simulateBatchRequest(requests);
      
      return requests.map((request, index) => ({
        id: request.id,
        type: request.type,
        data: batchResults[index] || null,
        success: true,
        duration: Date.now() - startTime,
        cost: this.calculateRequestCost(request) / requests.length,
        cached: false
      }));

    } catch (error) {
      return requests.map(request => this.createErrorResponse(request));
    }
  }

  private generateCacheKey(request: AIServiceRequest): string {
    const key = `${request.type}:${JSON.stringify(request.payload)}`;
    return Buffer.from(key).toString('base64').substring(0, 64);
  }

  private getCachedResponse(request: AIServiceRequest): { data: any; cost: number } | null {
    const cacheKey = this.config.cache.keyGenerator(request);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return null;
    
    // Check if expired
    if (Date.now() > cached.timestamp + cached.ttl * 1000) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return { data: cached.data, cost: cached.cost };
  }

  private setCachedResponse(request: AIServiceRequest, data: any, cost: number, ttl?: number): void {
    // Limit cache size
    if (this.cache.size >= this.config.cache.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const cacheKey = this.config.cache.keyGenerator(request);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cache.defaultTTL,
      cost
    });
  }

  private calculateRequestCost(request: AIServiceRequest): number {
    // Simplified cost calculation based on request type
    const baseCosts = {
      search: 0.05,
      extraction: 0.03,
      'query-generation': 0.02
    };
    
    return baseCosts[request.type] || 0.01;
  }

  private trackRequestStats(type: string, duration: number, isError: boolean, cost: number): void {
    const stats = this.requestStats.get(type) || { 
      count: 0, 
      totalTime: 0, 
      errorCount: 0, 
      cost: 0 
    };
    
    stats.count++;
    stats.totalTime += duration;
    if (isError) {
      stats.errorCount++;
    }
    stats.cost += cost;
    
    this.requestStats.set(type, stats);
  }

  private calculateCacheHitRate(): number {
    // Simplified calculation
    return this.cache.size > 0 ? 45 : 0; // Placeholder
  }

  private calculateCostSavings(): number {
    // Calculate cost savings from cached requests
    let totalSavings = 0;
    this.cache.forEach(cached => {
      totalSavings += cached.cost;
    });
    return totalSavings;
  }

  private calculateAverageBatchSize(): number {
    if (this.requestQueue.size === 0) return 0;
    
    let totalSize = 0;
    this.requestQueue.forEach(batch => {
      totalSize += batch.length;
    });
    
    return totalSize / this.requestQueue.size;
  }

  private calculateBatchEfficiency(): number {
    // Calculate how effective batching is
    const avgBatchSize = this.calculateAverageBatchSize();
    return Math.min((avgBatchSize / this.config.batch.maxBatchSize) * 100, 100);
  }

  private generateAIRecommendations(
    requestStats: Record<string, { count: number; avgTime: number; errorRate: number; avgCost: number; successRate: number }>,
    cacheStats: { size: number; hitRate: number; costSavings: number },
    batchStats: { batchesProcessed: number; avgBatchSize: number; efficiency: number }
  ): string[] {
    const recommendations: string[] = [];

    // Analyze request performance
    const slowServices = Object.entries(requestStats).filter(([_, stats]) => stats.avgTime > 10000);
    if (slowServices.length > 0) {
      recommendations.push(`${slowServices.length} AI services are responding slowly - consider optimization`);
    }

    // Analyze error rates
    const highErrorServices = Object.entries(requestStats).filter(([_, stats]) => stats.errorRate > 10);
    if (highErrorServices.length > 0) {
      recommendations.push(`${highErrorServices.length} AI services have high error rates - investigate and fix`);
    }

    // Analyze costs
    const expensiveServices = Object.entries(requestStats).filter(([_, stats]) => stats.avgCost > 0.10);
    if (expensiveServices.length > 0) {
      recommendations.push(`${expensiveServices.length} AI services are costly - consider optimization or caching`);
    }

    // Analyze cache effectiveness
    if (cacheStats.hitRate < 30) {
      recommendations.push('AI service cache hit rate is low - consider adjusting cache strategy');
    }

    // Analyze batch efficiency
    if (batchStats.efficiency < 50) {
      recommendations.push('Batch processing efficiency is low - consider adjusting batch size or timeout');
    }

    return recommendations;
  }

  // Simulation methods (would be replaced with actual AI service calls)
  private async simulateAIServiceRequest(request: AIServiceRequest): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
    
    // Simulate response based on request type
    switch (request.type) {
      case 'search':
        return { results: [], totalCount: 0 };
      case 'extraction':
        return { contacts: [], extracted: 0 };
      case 'query-generation':
        return { queries: [], generated: 0 };
      default:
        return {};
    }
  }

  private async simulateBatchRequest(requests: AIServiceRequest[]): Promise<any[]> {
    // Simulate batch processing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));
    
    return requests.map(() => ({}));
  }

  private createErrorResponse(request: AIServiceRequest): AIServiceResponse {
    return {
      id: request.id,
      type: request.type,
      data: null,
      success: false,
      error: 'Request failed',
      duration: 0,
      cost: 0,
      cached: false
    };
  }

  private findBatchResult(requestId: string): AIServiceResponse | null {
    // This would be implemented with proper result storage
    return null;
  }

  private storeBatchResults(results: AIServiceResponse[]): void {
    // Store results for pending requests
    // Implementation would depend on your specific needs
  }
}

// Create singleton instance
export const aiServiceOptimizer = new AIServiceOptimizer();

// Export utility functions
export function executeOptimizedAIRequest(request: AIServiceRequest): Promise<AIServiceResponse> {
  return aiServiceOptimizer.executeRequest(request);
}

export function batchAIRequests(requests: AIServiceRequest[]): Promise<AIServiceResponse[]> {
  return aiServiceOptimizer.batchRequests(requests);
}

export function getAIServicePerformanceStats() {
  return aiServiceOptimizer.getPerformanceStats();
}