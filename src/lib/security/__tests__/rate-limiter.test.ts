/**
 * Rate Limiter Tests
 */

import { RateLimiter, rateLimiters, rateLimitUtils } from '../rate-limiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 5
    });
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const result = await rateLimiter.checkLimit('user-123');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.totalHits).toBe(1);
    });

    it('should track multiple requests', async () => {
      // Make 3 requests
      await rateLimiter.checkLimit('user-123');
      await rateLimiter.checkLimit('user-123');
      const result = await rateLimiter.checkLimit('user-123');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
      expect(result.totalHits).toBe(3);
    });

    it('should block requests when limit exceeded', async () => {
      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit('user-123');
      }
      
      // 6th request should be blocked
      const result = await rateLimiter.checkLimit('user-123');
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.totalHits).toBe(5);
    });

    it('should isolate limits by identifier', async () => {
      // Max out user-123
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkLimit('user-123');
      }
      
      // user-456 should still be allowed
      const result = await rateLimiter.checkLimit('user-456');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it('should reset after window expires', async () => {
      // Create a limiter with very short window for testing
      const shortLimiter = new RateLimiter({
        windowMs: 100, // 100ms
        maxRequests: 2
      });

      // Use up the limit
      await shortLimiter.checkLimit('user-123');
      await shortLimiter.checkLimit('user-123');
      
      let result = await shortLimiter.checkLimit('user-123');
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be allowed again
      result = await shortLimiter.checkLimit('user-123');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('Custom Key Generation', () => {
    it('should use custom key generator', async () => {
      const customLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 3,
        keyGenerator: (id: string) => `custom:${id}`
      });

      const result = await customLimiter.checkLimit('user-123');
      expect(result.allowed).toBe(true);
    });
  });

  describe('Record Request', () => {
    it('should record successful requests', async () => {
      await rateLimiter.recordRequest('user-123', true);
      
      const result = await rateLimiter.checkLimit('user-123');
      expect(result.totalHits).toBe(2); // 1 from record + 1 from check
    });

    it('should skip recording based on configuration', async () => {
      const skipSuccessLimiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 5,
        skipSuccessfulRequests: true
      });

      await skipSuccessLimiter.recordRequest('user-123', true);
      
      const result = await skipSuccessLimiter.checkLimit('user-123');
      expect(result.totalHits).toBe(1); // Only the check, not the record
    });
  });

  describe('Reset Limit', () => {
    it('should reset limit for identifier', async () => {
      // Use up some requests
      await rateLimiter.checkLimit('user-123');
      await rateLimiter.checkLimit('user-123');
      
      // Reset
      await rateLimiter.resetLimit('user-123');
      
      // Should be back to full limit
      const result = await rateLimiter.checkLimit('user-123');
      expect(result.remaining).toBe(4); // Full limit minus this check
    });
  });
});

describe('Pre-configured Rate Limiters', () => {
  it('should have different limits for different operations', async () => {
    // Research should have lower limit than general AI operations
    const researchResult = await rateLimiters.research.checkLimit('user-123');
    const aiOpsResult = await rateLimiters.aiOperations.checkLimit('user-123');
    
    expect(researchResult.allowed).toBe(true);
    expect(aiOpsResult.allowed).toBe(true);
    
    // The limits should be different (research: 20, aiOperations: 100)
    expect(researchResult.remaining).toBeLessThan(aiOpsResult.remaining);
  });
});

describe('Rate Limit Utils', () => {
  describe('getClientIP', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const headers = new Headers({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1'
      });
      
      const ip = rateLimitUtils.getClientIP(headers);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const headers = new Headers({
        'x-real-ip': '192.168.1.2'
      });
      
      const ip = rateLimitUtils.getClientIP(headers);
      expect(ip).toBe('192.168.1.2');
    });

    it('should extract IP from cf-connecting-ip header', () => {
      const headers = new Headers({
        'cf-connecting-ip': '192.168.1.3'
      });
      
      const ip = rateLimitUtils.getClientIP(headers);
      expect(ip).toBe('192.168.1.3');
    });

    it('should return unknown if no IP headers found', () => {
      const headers = new Headers();
      
      const ip = rateLimitUtils.getClientIP(headers);
      expect(ip).toBe('unknown');
    });

    it('should prioritize x-forwarded-for over other headers', () => {
      const headers = new Headers({
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.2',
        'cf-connecting-ip': '192.168.1.3'
      });
      
      const ip = rateLimitUtils.getClientIP(headers);
      expect(ip).toBe('192.168.1.1');
    });
  });

  describe('formatRateLimitHeaders', () => {
    it('should format rate limit headers correctly', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalHits: 10
      };
      
      const headers = rateLimitUtils.formatRateLimitHeaders(result);
      
      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('0');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['Retry-After']).toBeDefined();
    });
  });

  describe('createRateLimitError', () => {
    it('should create rate limit error response', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
        totalHits: 5
      };
      
      const error = rateLimitUtils.createRateLimitError(result);
      
      expect(error.error).toBe('Rate limit exceeded');
      expect(error.message).toContain('Try again in');
      expect(error.retryAfter).toBeGreaterThan(0);
      expect(error.resetTime).toBe(result.resetTime);
    });
  });
});