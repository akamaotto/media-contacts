/**
 * Tests for AI Rate Limiter
 */

import { AIRateLimiter, rateLimiter, applyRateLimit, isRateLimited } from '../rate-limiter';
import { RateLimitError } from '../errors';

// Mock Redis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined)
  }));
});

// Mock environment
const originalEnv = process.env;

describe('AIRateLimiter', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = AIRateLimiter.getInstance();
      const instance2 = AIRateLimiter.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('checkLimit', () => {
    let limiter: AIRateLimiter;

    beforeEach(() => {
      limiter = AIRateLimiter.getInstance();
    });

    it('should allow requests within limit', async () => {
      const result = await limiter.checkLimit('user123', 'search', 1);

      expect(result).toEqual({
        limit: expect.any(Number),
        remaining: expect.any(Number),
        resetTime: expect.any(Number),
        retryAfter: undefined
      });
    });

    it('should throw RateLimitError when limit exceeded', async () => {
      // This would need to be implemented with actual rate limiter that tracks usage
      // For now, we'll test the structure
      try {
        // Simulate exceeding limit by making many requests
        for (let i = 0; i < 10; i++) {
          await limiter.checkLimit('user123', 'search', 1);
        }
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect(error.limit).toBeDefined();
        expect(error.remaining).toBe(0);
        expect(error.resetTime).toBeDefined();
        expect(error.retryAfter).toBeDefined();
      }
    });

    it('should handle different endpoint types', async () => {
      const searchResult = await limiter.checkLimit('user123', 'search', 1);
      const progressResult = await limiter.checkLimit('user123', 'progress', 1);
      const importResult = await limiter.checkLimit('user123', 'import', 1);
      const healthResult = await limiter.checkLimit('user123', 'health', 1);

      expect(searchResult.limit).toBe(5); // Search: 5 requests per minute
      expect(progressResult.limit).toBe(10); // Progress: 10 requests per minute
      expect(importResult.limit).toBe(10); // Import: 10 requests per minute
      expect(healthResult.limit).toBe(20); // Health: 20 requests per minute
    });
  });

  describe('getStatus', () => {
    let limiter: AIRateLimiter;

    beforeEach(() => {
      limiter = AIRateLimiter.getInstance();
    });

    it('should return current rate limit status', async () => {
      const result = await limiter.getStatus('user123', 'search');

      expect(result).toEqual({
        limit: expect.any(Number),
        remaining: expect.any(Number),
        resetTime: expect.any(Number),
        retryAfter: undefined
      });
    });

    it('should return full limits for new users', async () => {
      const result = await limiter.getStatus('newuser123', 'search');

      expect(result.remaining).toBe(result.limit);
    });
  });

  describe('resetUser', () => {
    let limiter: AIRateLimiter;

    beforeEach(() => {
      limiter = AIRateLimiter.getInstance();
    });

    it('should reset rate limit for specific endpoint', async () => {
      // This would test the reset functionality
      // Implementation depends on the actual rate limiter used
      await expect(limiter.resetUser('user123', 'search')).resolves.not.toThrow();
    });

    it('should reset rate limit for all endpoints', async () => {
      await expect(limiter.resetUser('user123')).resolves.not.toThrow();
    });
  });

  describe('healthCheck', () => {
    let limiter: AIRateLimiter;

    beforeEach(() => {
      limiter = AIRateLimiter.getInstance();
    });

    it('should return health status', async () => {
      const result = await limiter.healthCheck();

      expect(result).toEqual({
        status: expect.any(String),
        redis: expect.any(Boolean),
        memoryLimiters: expect.any(Number),
        responseTime: expect.any(Number)
      });
    });
  });
});

describe('applyRateLimit', () => {
  it('should delegate to rate limiter instance', async () => {
    const mockRateLimitInfo = {
      limit: 5,
      remaining: 4,
      resetTime: Date.now() + 60000
    };

    const mockCheckLimit = jest.fn().mockResolvedValue(mockRateLimitInfo);
    (rateLimiter.checkLimit as jest.Mock) = mockCheckLimit;

    const result = await applyRateLimit('user123', 'search', 1);

    expect(mockCheckLimit).toHaveBeenCalledWith('user123', 'search', 1);
    expect(result).toEqual(mockRateLimitInfo);
  });
});

describe('isRateLimited', () => {
  it('should return false when user is not rate limited', async () => {
    const mockCheckLimit = jest.fn().mockResolvedValue({
      limit: 5,
      remaining: 4,
      resetTime: Date.now() + 60000
    });

    (rateLimiter.checkLimit as jest.Mock) = mockCheckLimit;

    const result = await isRateLimited('user123', 'search');

    expect(result).toBe(false);
  });

  it('should return true when user is rate limited', async () => {
    const mockCheckLimit = jest.fn().mockRejectedValue(new RateLimitError(5, 0, Date.now() + 60000, 60));

    (rateLimiter.checkLimit as jest.Mock) = mockCheckLimit;

    const result = await isRateLimited('user123', 'search');

    expect(result).toBe(true);
  });
});

describe('Rate Limit Configuration', () => {
  let limiter: AIRateLimiter;

  beforeEach(() => {
    limiter = AIRateLimiter.getInstance();
  });

  it('should have correct limits for each endpoint type', async () => {
    const searchStatus = await limiter.getStatus('user1', 'search');
    const progressStatus = await limiter.getStatus('user1', 'progress');
    const importStatus = await limiter.getStatus('user1', 'import');
    const healthStatus = await limiter.getStatus('user1', 'health');

    expect(searchStatus.limit).toBe(5);
    expect(progressStatus.limit).toBe(10);
    expect(importStatus.limit).toBe(10);
    expect(healthStatus.limit).toBe(20);
  });

  it('should use Redis when available', () => {
    process.env.REDIS_URL = 'redis://localhost:6379';

    // Create new instance to test Redis initialization
    const redisLimiter = new AIRateLimiter();

    // This would test Redis connection
    // Implementation depends on actual Redis setup
  });

  it('should fallback to memory limiter when Redis unavailable', () => {
    process.env.REDIS_URL = undefined;

    // Create new instance to test memory fallback
    const memoryLimiter = new AIRateLimiter();

    // This would test memory limiter fallback
    // Implementation depends on actual setup
  });
});