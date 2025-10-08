/**
 * AI API Rate Limiter
 * Implements distributed rate limiting using Redis
 */

import Redis from 'ioredis';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { RateLimitInfo } from './types';
import { RateLimitError } from './errors';

/**
 * Redis-backed rate limiter for AI endpoints
 */
export class AIRateLimiter {
  private static instance: AIRateLimiter;
  private redis: Redis | null = null;
  private limiters: Map<string, RateLimiterRedis | RateLimiterMemory> = new Map();
  private isRedisAvailable = false;

  private constructor() {
    this.initializeRedis();
  }

  static getInstance(): AIRateLimiter {
    if (!AIRateLimiter.instance) {
      AIRateLimiter.instance = new AIRateLimiter();
    }
    return AIRateLimiter.instance;
  }

  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

      if (redisUrl) {
        this.redis = new Redis(redisUrl, {
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });

        this.redis.on('connect', () => {
          console.log('AI Rate Limiter: Connected to Redis');
          this.isRedisAvailable = true;
        });

        this.redis.on('error', (error) => {
          console.error('AI Rate Limiter: Redis error:', error);
          this.isRedisAvailable = false;
          this.fallbackToMemoryLimiter();
        });

        this.redis.on('close', () => {
          console.warn('AI Rate Limiter: Redis connection closed');
          this.isRedisAvailable = false;
          this.fallbackToMemoryLimiter();
        });

        // Test connection
        await this.redis.connect();
      } else {
        console.warn('AI Rate Limiter: No Redis URL configured, using memory limiter');
        this.fallbackToMemoryLimiter();
      }
    } catch (error) {
      console.error('AI Rate Limiter: Failed to initialize Redis:', error);
      this.fallbackToMemoryLimiter();
    }

    this.initializeLimiters();
  }

  private fallbackToMemoryLimiter(): void {
    console.log('AI Rate Limiter: Falling back to memory-based rate limiting');
    this.isRedisAvailable = false;
    this.redis = null;
  }

  private initializeLimiters(): void {
    const limiterConfigs = [
      {
        key: 'search',
        points: 5, // 5 requests per minute
        duration: 60,
        blockDuration: 60
      },
      {
        key: 'progress',
        points: 10, // 10 requests per minute
        duration: 60,
        blockDuration: 30
      },
      {
        key: 'import',
        points: 10, // 10 requests per minute
        duration: 60,
        blockDuration: 30
      },
      {
        key: 'health',
        points: 20, // 20 requests per minute
        duration: 60,
        blockDuration: 60
      }
    ];

    for (const config of limiterConfigs) {
      if (this.isRedisAvailable && this.redis) {
        this.limiters.set(config.key, new RateLimiterRedis({
          store: this.redis,
          keyPrefix: `ai_rate_limit:${config.key}:`,
          points: config.points,
          duration: config.duration,
          blockDuration: config.blockDuration,
        }));
      } else {
        // Fallback to memory-based limiter
        this.limiters.set(config.key, new RateLimiterMemory({
          keyPrefix: `ai_rate_limit_memory:${config.key}:`,
          points: config.points,
          duration: config.duration,
          blockDuration: config.blockDuration,
        }));
      }
    }
  }

  /**
   * Check rate limit for a user and endpoint type
   */
  async checkLimit(
    userId: string,
    endpointType: 'search' | 'progress' | 'import' | 'health',
    points: number = 1
  ): Promise<RateLimitInfo> {
    const limiter = this.limiters.get(endpointType);
    if (!limiter) {
      throw new Error(`Unknown rate limiter: ${endpointType}`);
    }

    const key = `user:${userId}`;

    try {
      const result = await limiter.consume(key, points);

      return {
        limit: limiter.points,
        remaining: result.remainingPoints || 0,
        resetTime: new Date(Date.now() + (result.msBeforeNext || 0)).getTime(),
        retryAfter: undefined
      };

    } catch (rejRes: any) {
      // Rate limit exceeded
      const resetTime = new Date(Date.now() + (rejRes.msBeforeNext || 60000)).getTime();
      const retryAfter = Math.ceil((rejRes.msBeforeNext || 60000) / 1000);

      throw new RateLimitError(
        limiter.points,
        0,
        resetTime,
        retryAfter
      );
    }
  }

  /**
   * Get current rate limit status without consuming points
   */
  async getStatus(
    userId: string,
    endpointType: 'search' | 'progress' | 'import' | 'health'
  ): Promise<RateLimitInfo> {
    const limiter = this.limiters.get(endpointType);
    if (!limiter) {
      throw new Error(`Unknown rate limiter: ${endpointType}`);
    }

    const key = `user:${userId}`;

    try {
      const result = await limiter.get(key);

      return {
        limit: limiter.points,
        remaining: result ? result.remainingPoints || limiter.points : limiter.points,
        resetTime: result ? new Date(Date.now() + (result.msBeforeNext || 0)).getTime() : Date.now(),
        retryAfter: undefined
      };

    } catch (error) {
      // If we can't get status, return full limits
      return {
        limit: limiter.points,
        remaining: limiter.points,
        resetTime: Date.now() + (limiter.duration * 1000),
        retryAfter: undefined
      };
    }
  }

  /**
   * Reset rate limit for a specific user
   */
  async resetUser(userId: string, endpointType?: string): Promise<void> {
    const limiterKeys = endpointType ? [endpointType] : ['search', 'progress', 'import', 'health'];

    for (const key of limiterKeys) {
      const limiter = this.limiters.get(key);
      if (limiter && 'block' in limiter) {
        const userKey = `user:${userId}`;
        await limiter.block(userKey, 0); // Unblock immediately
      }
    }
  }

  /**
   * Get rate limit statistics
   */
  async getStats(): Promise<{
    totalUsers: number;
    endpointStats: Array<{
      endpoint: string;
      activeRequests: number;
      averageUsage: number;
    }>;
    redisStatus: 'connected' | 'disconnected';
  }> {
    const stats = {
      totalUsers: 0,
      endpointStats: [] as Array<{
        endpoint: string;
        activeRequests: number;
        averageUsage: number;
      }>,
      redisStatus: this.isRedisAvailable ? 'connected' as const : 'disconnected' as const
    };

    // For Redis, we could scan keys to get accurate stats
    // For memory limiter, we can track internally
    // This is a simplified implementation

    for (const [endpoint, limiter] of this.limiters.entries()) {
      stats.endpointStats.push({
        endpoint,
        activeRequests: 0, // Would need to track this
        averageUsage: 0   // Would need to calculate this
      });
    }

    return stats;
  }

  /**
   * Health check for rate limiter
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    redis: boolean;
    memoryLimiters: number;
    responseTime: number;
  }> {
    const startTime = Date.now();

    try {
      // Test with a simple rate limit check
      await this.checkLimit('health_check_test', 'health', 1);

      return {
        status: this.isRedisAvailable ? 'healthy' : 'degraded',
        redis: this.isRedisAvailable,
        memoryLimiters: this.limiters.size,
        responseTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        redis: false,
        memoryLimiters: this.limiters.size,
        responseTime: Date.now() - startTime
      };
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

/**
 * Export singleton instance
 */
export const rateLimiter = AIRateLimiter.getInstance();

/**
 * Middleware helper function for rate limiting
 */
export async function applyRateLimit(
  userId: string,
  endpointType: 'search' | 'progress' | 'import' | 'health',
  points: number = 1
): Promise<RateLimitInfo> {
  return await rateLimiter.checkLimit(userId, endpointType, points);
}

/**
 * Check if user is currently rate limited
 */
export async function isRateLimited(
  userId: string,
  endpointType: 'search' | 'progress' | 'import' | 'health'
): Promise<boolean> {
  try {
    await rateLimiter.checkLimit(userId, endpointType, 0);
    return false;
  } catch (error) {
    return error instanceof RateLimitError;
  }
}