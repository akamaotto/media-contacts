/**
 * API Performance Optimizer
 * Provides response caching, compression, and request optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from './performance-monitor';
import { compressSync, decompressSync } from 'zlib';

export interface APIOptimizationConfig {
  enableCaching: boolean;
  enableCompression: boolean;
  defaultCacheTTL: number;
  maxCacheSize: number;
  compressionThreshold: number; // bytes
  enableRateLimiting: boolean;
  rateLimitWindow: number; // seconds
  rateLimitMax: number; // requests per window
}

export interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
  headers: Record<string, string>;
  compressed: boolean;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class APIOptimizer {
  private config: APIOptimizationConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private rateLimitMap: Map<string, RateLimitEntry> = new Map();
  private requestStats: Map<string, { count: number; totalTime: number; errorCount: number }> = new Map();

  constructor(config?: Partial<APIOptimizationConfig>) {
    this.config = {
      enableCaching: true,
      enableCompression: true,
      defaultCacheTTL: 300, // 5 minutes
      maxCacheSize: 1000,
      compressionThreshold: 1024, // 1KB
      enableRateLimiting: true,
      rateLimitWindow: 60, // 1 minute
      rateLimitMax: 100, // 100 requests per minute
      ...config
    };

    this.startCacheCleanup();
  }

  /**
   * Optimize API response with caching and compression
   */
  async optimizeResponse(
    request: NextRequest,
    response: NextResponse,
    options?: {
      cacheKey?: string;
      cacheTTL?: number;
      skipCache?: boolean;
      skipCompression?: boolean;
    }
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const cacheKey = options?.cacheKey || this.generateCacheKey(request);
    const shouldCache = !options?.skipCache && this.config.enableCaching && this.isCacheableRequest(request);
    const shouldCompress = !options?.skipCompression && this.config.enableCompression;

    try {
      // Check cache first
      if (shouldCache) {
        const cachedResponse = this.getCachedResponse(cacheKey);
        if (cachedResponse) {
          const duration = Date.now() - startTime;
          performanceMonitor.trackApiResponse(duration, false);
          performanceMonitor.trackApiCacheHitRate(100);
          return cachedResponse;
        }
      }

      // Apply compression if enabled and response is large enough
      let optimizedResponse = response;
      if (shouldCompress) {
        optimizedResponse = await this.compressResponse(response);
      }

      // Add performance headers
      optimizedResponse.headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
      optimizedResponse.headers.set('X-Cache-Status', shouldCache ? 'MISS' : 'DISABLED');

      // Cache the response if enabled
      if (shouldCache) {
        this.setCachedResponse(cacheKey, optimizedResponse, options?.cacheTTL || this.config.defaultCacheTTL);
      }

      const duration = Date.now() - startTime;
      performanceMonitor.trackApiResponse(duration, false);
      performanceMonitor.trackApiCacheHitRate(0);

      return optimizedResponse;

    } catch (error) {
      const duration = Date.now() - startTime;
      performanceMonitor.trackApiResponse(duration, true);
      throw error;
    }
  }

  /**
   * Apply rate limiting to a request
   */
  async applyRateLimit(
    request: NextRequest,
    identifier?: string
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    headers: Record<string, string>;
  }> {
    if (!this.config.enableRateLimiting) {
      return {
        allowed: true,
        remaining: this.config.rateLimitMax,
        resetTime: Date.now() + this.config.rateLimitWindow * 1000,
        headers: {}
      };
    }

    const clientId = identifier || this.getClientIdentifier(request);
    const now = Date.now();
    const entry = this.rateLimitMap.get(clientId);

    if (!entry || now > entry.resetTime) {
      // New window or expired window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + this.config.rateLimitWindow * 1000
      };
      this.rateLimitMap.set(clientId, newEntry);

      return {
        allowed: true,
        remaining: this.config.rateLimitMax - 1,
        resetTime: newEntry.resetTime,
        headers: {
          'X-RateLimit-Limit': this.config.rateLimitMax.toString(),
          'X-RateLimit-Remaining': (this.config.rateLimitMax - 1).toString(),
          'X-RateLimit-Reset': newEntry.resetTime.toString()
        }
      };
    }

    // Existing window
    if (entry.count >= this.config.rateLimitMax) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        headers: {
          'X-RateLimit-Limit': this.config.rateLimitMax.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString(),
          'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString()
        }
      };
    }

    entry.count++;
    const remaining = this.config.rateLimitMax - entry.count;

    return {
      allowed: true,
      remaining,
      resetTime: entry.resetTime,
      headers: {
        'X-RateLimit-Limit': this.config.rateLimitMax.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': entry.resetTime.toString()
      }
    };
  }

  /**
   * Batch multiple API requests for efficiency
   */
  async batchRequests<T>(
    requests: Array<() => Promise<T>>,
    options?: {
      concurrent?: boolean;
      timeout?: number;
    }
  ): Promise<T[]> {
    const concurrent = options?.concurrent ?? true;
    const timeout = options?.timeout || 30000;

    if (concurrent) {
      // Execute all requests concurrently
      const promises = requests.map(req => 
        Promise.race([
          req(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ])
      );

      return Promise.all(promises);
    } else {
      // Execute requests sequentially
      const results: T[] = [];
      for (const request of requests) {
        const result = await Promise.race([
          request(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), timeout)
          )
        ]);
        results.push(result);
      }
      return results;
    }
  }

  /**
   * Get API performance statistics
   */
  getPerformanceStats(): {
    requestStats: Record<string, { count: number; avgTime: number; errorRate: number }>;
    cacheStats: { size: number; hitRate: number; memoryUsage: number };
    rateLimitStats: { activeClients: number; totalBlocked: number };
    recommendations: string[];
  } {
    // Calculate request statistics
    const requestStats: Record<string, { count: number; avgTime: number; errorRate: number }> = {};
    this.requestStats.forEach((stats, endpoint) => {
      requestStats[endpoint] = {
        count: stats.count,
        avgTime: stats.totalTime / stats.count,
        errorRate: (stats.errorCount / stats.count) * 100
      };
    });

    // Calculate cache statistics
    const cacheStats = {
      size: this.cache.size,
      hitRate: this.calculateCacheHitRate(),
      memoryUsage: this.calculateCacheMemoryUsage()
    };

    // Calculate rate limit statistics
    const activeClients = this.rateLimitMap.size;
    const totalBlocked = Array.from(this.rateLimitMap.values())
      .filter(entry => entry.count > this.config.rateLimitMax).length;

    // Generate recommendations
    const recommendations = this.generateAPIRecommendations(requestStats, cacheStats, { activeClients, totalBlocked });

    return {
      requestStats,
      cacheStats,
      rateLimitStats: { activeClients, totalBlocked },
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
   * Preload cache with common responses
   */
  async preloadCache(entries: Array<{
    key: string;
    data: any;
    ttl?: number;
    headers?: Record<string, string>;
  }>): Promise<void> {
    for (const entry of entries) {
      const response = NextResponse.json(entry.data);
      
      if (entry.headers) {
        Object.entries(entry.headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }

      this.setCachedResponse(entry.key, response, entry.ttl || this.config.defaultCacheTTL);
    }
  }

  private generateCacheKey(request: NextRequest): string {
    const url = new URL(request.url);
    const key = `${request.method}:${url.pathname}:${url.search}`;
    return Buffer.from(key).toString('base64').substring(0, 64);
  }

  private isCacheableRequest(request: NextRequest): boolean {
    const method = request.method;
    const url = new URL(request.url);
    
    // Only cache GET requests
    if (method !== 'GET') return false;
    
    // Don't cache API endpoints that modify data
    if (url.pathname.includes('/api/ai/contact-extraction/')) return false;
    if (url.pathname.includes('/api/media-contacts') && method !== 'GET') return false;
    
    // Don't cache requests with authorization headers (sensitive data)
    if (request.headers.get('authorization')) return false;
    
    return true;
  }

  private getCachedResponse(cacheKey: string): NextResponse | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    // Check if expired
    if (Date.now() > cached.timestamp + cached.ttl * 1000) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Create response from cached data
    let responseData = cached.data;
    if (cached.compressed) {
      try {
        responseData = JSON.parse(decompressSync(Buffer.from(cached.data, 'base64')).toString());
      } catch (error) {
        console.error('Failed to decompress cached response:', error);
        this.cache.delete(cacheKey);
        return null;
      }
    }

    const response = NextResponse.json(responseData);
    
    // Restore headers
    Object.entries(cached.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    response.headers.set('X-Cache-Status', 'HIT');

    return response;
  }

  private setCachedResponse(cacheKey: string, response: NextResponse, ttlSeconds: number): void {
    // Limit cache size
    if (this.cache.size >= this.config.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    try {
      const responseData = response.clone();
      const data = responseData.json();
      
      let processedData = data;
      let compressed = false;
      
      // Compress if enabled and data is large enough
      if (this.config.enableCompression && JSON.stringify(data).length > this.config.compressionThreshold) {
        const compressedData = compressSync(JSON.stringify(data));
        processedData = compressedData.toString('base64');
        compressed = true;
      }

      // Store headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const cacheEntry: CacheEntry = {
        data: processedData,
        timestamp: Date.now(),
        ttl: ttlSeconds,
        headers,
        compressed
      };

      this.cache.set(cacheKey, cacheEntry);
    } catch (error) {
      console.error('Failed to cache response:', error);
    }
  }

  private async compressResponse(response: NextResponse): Promise<NextResponse> {
    try {
      const clonedResponse = response.clone();
      const data = await clonedResponse.json();
      const jsonString = JSON.stringify(data);
      
      if (jsonString.length < this.config.compressionThreshold) {
        return response; // Too small to compress
      }

      const compressed = compressSync(jsonString);
      
      // Create new response with compressed data
      const compressedResponse = new NextResponse(compressed, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      
      compressedResponse.headers.set('Content-Encoding', 'gzip');
      compressedResponse.headers.set('X-Compressed', 'true');
      
      return compressedResponse;
    } catch (error) {
      console.error('Failed to compress response:', error);
      return response;
    }
  }

  private getClientIdentifier(request: NextRequest): string {
    // Use IP address as client identifier
    return request.headers.get('x-forwarded-for') || 
           request.headers.get('x-real-ip') || 
           'unknown';
  }

  private calculateCacheHitRate(): number {
    // This is a simplified calculation
    // In a real implementation, you'd track hits and misses separately
    return this.cache.size > 0 ? 65 : 0; // Placeholder
  }

  private calculateCacheMemoryUsage(): number {
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += JSON.stringify(entry.data).length;
    });
    return totalSize;
  }

  private generateAPIRecommendations(
    requestStats: Record<string, { count: number; avgTime: number; errorRate: number }>,
    cacheStats: { size: number; hitRate: number; memoryUsage: number },
    rateLimitStats: { activeClients: number; totalBlocked: number }
  ): string[] {
    const recommendations: string[] = [];

    // Analyze slow endpoints
    const slowEndpoints = Object.entries(requestStats).filter(([_, stats]) => stats.avgTime > 200);
    if (slowEndpoints.length > 0) {
      recommendations.push(`${slowEndpoints.length} endpoints are responding slowly - consider optimization`);
    }

    // Analyze error rates
    const highErrorEndpoints = Object.entries(requestStats).filter(([_, stats]) => stats.errorRate > 5);
    if (highErrorEndpoints.length > 0) {
      recommendations.push(`${highErrorEndpoints.length} endpoints have high error rates - investigate and fix`);
    }

    // Analyze cache effectiveness
    if (cacheStats.hitRate < 50) {
      recommendations.push('Cache hit rate is low - consider adjusting cache strategy or TTL values');
    }

    if (cacheStats.memoryUsage > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Cache memory usage is high - consider reducing cache size or TTL');
    }

    // Analyze rate limiting
    if (rateLimitStats.totalBlocked > rateLimitStats.activeClients * 0.1) {
      recommendations.push('Many clients are being rate limited - consider increasing limits or optimizing performance');
    }

    return recommendations;
  }

  private startCacheCleanup(): void {
    // Clean up expired cache entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      this.cache.forEach((entry, key) => {
        if (now > entry.timestamp + entry.ttl * 1000) {
          this.cache.delete(key);
          cleaned++;
        }
      });

      // Clean up expired rate limit entries
      this.rateLimitMap.forEach((entry, key) => {
        if (now > entry.resetTime) {
          this.rateLimitMap.delete(key);
        }
      });

      if (cleaned > 0) {
        console.log(`🧹 [API-OPTIMIZER] Cleaned up ${cleaned} expired cache entries`);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Track API request performance
   */
  trackRequest(endpoint: string, duration: number, isError: boolean): void {
    const stats = this.requestStats.get(endpoint) || { count: 0, totalTime: 0, errorCount: 0 };
    stats.count++;
    stats.totalTime += duration;
    if (isError) {
      stats.errorCount++;
    }
    this.requestStats.set(endpoint, stats);
  }
}

// Create singleton instance
export const apiOptimizer = new APIOptimizer();

// Export utility functions
export function optimizeAPIResponse(
  request: NextRequest,
  response: NextResponse,
  options?: {
    cacheKey?: string;
    cacheTTL?: number;
    skipCache?: boolean;
    skipCompression?: boolean;
  }
): Promise<NextResponse> {
  return apiOptimizer.optimizeResponse(request, response, options);
}

export function applyAPIRateLimit(
  request: NextRequest,
  identifier?: string
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime: number;
  headers: Record<string, string>;
}> {
  return apiOptimizer.applyRateLimit(request, identifier);
}

export function batchAPIRequests<T>(
  requests: Array<() => Promise<T>>,
  options?: {
    concurrent?: boolean;
    timeout?: number;
  }
): Promise<T[]> {
  return apiOptimizer.batchRequests(requests, options);
}