/**
 * Rate Limiting Service
 * Implements user-based and IP-based rate limiting for AI operations
 */

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (identifier: string) => string; // Custom key generation
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
}

export interface RateLimitStore {
  get(key: string): Promise<{ count: number; resetTime: number } | null>;
  set(key: string, value: { count: number; resetTime: number }, ttl: number): Promise<void>;
  increment(key: string, ttl: number): Promise<{ count: number; resetTime: number }>;
}

/**
 * In-memory rate limit store (for development/testing)
 */
class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // Clean up expired entries
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return null;
    }
    
    return entry;
  }

  async set(key: string, value: { count: number; resetTime: number }, ttl: number): Promise<void> {
    this.store.set(key, value);
    
    // Set cleanup timer
    setTimeout(() => {
      this.store.delete(key);
    }, ttl);
  }

  async increment(key: string, ttl: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const existing = await this.get(key);
    
    if (!existing) {
      const entry = { count: 1, resetTime: now + ttl };
      await this.set(key, entry, ttl);
      return entry;
    }
    
    const updated = { ...existing, count: existing.count + 1 };
    await this.set(key, updated, existing.resetTime - now);
    return updated;
  }
}

/**
 * Redis-based rate limit store (for production)
 */
class RedisRateLimitStore implements RateLimitStore {
  private redis: any; // Redis client would be injected

  constructor(redisClient?: any) {
    this.redis = redisClient;
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    if (!this.redis) return null;
    
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis rate limit get error:', error);
      return null;
    }
  }

  async set(key: string, value: { count: number; resetTime: number }, ttl: number): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.setex(key, Math.ceil(ttl / 1000), JSON.stringify(value));
    } catch (error) {
      console.error('Redis rate limit set error:', error);
    }
  }

  async increment(key: string, ttl: number): Promise<{ count: number; resetTime: number }> {
    if (!this.redis) {
      // Fallback to memory store
      const memoryStore = new MemoryRateLimitStore();
      return memoryStore.increment(key, ttl);
    }
    
    try {
      const now = Date.now();
      const resetTime = now + ttl;
      
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, Math.ceil(ttl / 1000));
      
      const results = await pipeline.exec();
      const count = results[0][1];
      
      return { count, resetTime };
    } catch (error) {
      console.error('Redis rate limit increment error:', error);
      // Fallback to memory store
      const memoryStore = new MemoryRateLimitStore();
      return memoryStore.increment(key, ttl);
    }
  }
}

/**
 * Rate Limiter Class
 */
export class RateLimiter {
  private store: RateLimitStore;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig, store?: RateLimitStore) {
    this.config = config;
    this.store = store || new MemoryRateLimitStore();
  }

  /**
   * Check if a request is allowed
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(identifier)
      : `rate_limit:${identifier}`;

    const current = await this.store.get(key);
    const now = Date.now();
    
    if (!current) {
      // First request in window
      const resetTime = now + this.config.windowMs;
      await this.store.set(key, { count: 1, resetTime }, this.config.windowMs);
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime,
        totalHits: 1
      };
    }

    // Check if window has expired
    if (now > current.resetTime) {
      const resetTime = now + this.config.windowMs;
      await this.store.set(key, { count: 1, resetTime }, this.config.windowMs);
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime,
        totalHits: 1
      };
    }

    // Check if limit exceeded
    if (current.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime,
        totalHits: current.count
      };
    }

    // Increment counter
    const updated = await this.store.increment(key, current.resetTime - now);
    
    return {
      allowed: true,
      remaining: this.config.maxRequests - updated.count,
      resetTime: updated.resetTime,
      totalHits: updated.count
    };
  }

  /**
   * Record a request (for post-processing rate limiting)
   */
  async recordRequest(identifier: string, success: boolean = true): Promise<void> {
    // Skip recording based on configuration
    if (success && this.config.skipSuccessfulRequests) return;
    if (!success && this.config.skipFailedRequests) return;

    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(identifier)
      : `rate_limit:${identifier}`;

    await this.store.increment(key, this.config.windowMs);
  }

  /**
   * Reset rate limit for an identifier
   */
  async resetLimit(identifier: string): Promise<void> {
    const key = this.config.keyGenerator 
      ? this.config.keyGenerator(identifier)
      : `rate_limit:${identifier}`;

    await this.store.set(key, { count: 0, resetTime: Date.now() + this.config.windowMs }, 0);
  }
}

/**
 * Pre-configured rate limiters for different AI operations
 */
export const rateLimiters = {
  // General AI operations - 100 requests per hour per user
  aiOperations: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
    keyGenerator: (userId: string) => `ai_ops:${userId}`
  }),

  // Research operations - 20 requests per hour per user (more expensive)
  research: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    keyGenerator: (userId: string) => `research:${userId}`
  }),

  // Enrichment operations - 50 requests per hour per user
  enrichment: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    keyGenerator: (userId: string) => `enrichment:${userId}`
  }),

  // Duplicate detection - 30 requests per hour per user
  duplicateDetection: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 30,
    keyGenerator: (userId: string) => `duplicate:${userId}`
  }),

  // IP-based rate limiting for anonymous requests
  ipBased: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyGenerator: (ip: string) => `ip:${ip}`
  }),

  // Admin operations - higher limits
  admin: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 500,
    keyGenerator: (userId: string) => `admin:${userId}`
  })
};

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(limiter: RateLimiter) {
  return async (identifier: string) => {
    const result = await limiter.checkLimit(identifier);
    
    if (!result.allowed) {
      const error = new Error('Rate limit exceeded');
      (error as any).status = 429;
      (error as any).rateLimitInfo = {
        remaining: result.remaining,
        resetTime: result.resetTime,
        totalHits: result.totalHits
      };
      throw error;
    }
    
    return result;
  };
}

/**
 * Utility functions
 */
export const rateLimitUtils = {
  /**
   * Get client IP from request headers
   */
  getClientIP(headers: Headers): string {
    const forwarded = headers.get('x-forwarded-for');
    const realIP = headers.get('x-real-ip');
    const cfConnectingIP = headers.get('cf-connecting-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIP || cfConnectingIP || 'unknown';
  },

  /**
   * Format rate limit headers for HTTP response
   */
  formatRateLimitHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': String(result.totalHits + result.remaining),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
      'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000))
    };
  },

  /**
   * Create rate limit error response
   */
  createRateLimitError(result: RateLimitResult): {
    error: string;
    message: string;
    retryAfter: number;
    resetTime: number;
  } {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    
    return {
      error: 'Rate limit exceeded',
      message: `Too many requests. Try again in ${retryAfter} seconds.`,
      retryAfter,
      resetTime: result.resetTime
    };
  }
};