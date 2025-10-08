/**
 * Tests for AI API Middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { AIMiddlewareStack } from '../middleware';
import { AIAPIError } from '../errors';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn()
}));

jest.mock('../logger', () => ({
  AILogger: {
    logRequest: jest.fn(),
    logAuthentication: jest.fn(),
    logRateLimit: jest.fn(),
    logResponse: jest.fn()
  }
}));

jest.mock('../rate-limiter', () => ({
  rateLimiter: {
    checkLimit: jest.fn()
  }
}));

jest.mock('../cors', () => ({
  AICorsMiddleware: {
    handle: jest.fn()
  }
}));

jest.mock('../validation', () => ({
  AIValidationMiddleware: {
    validate: jest.fn()
  }
}));

describe('AIMiddlewareStack', () => {
  let mockRequest: NextRequest;
  let mockContext: any;

  beforeEach(() => {
    mockRequest = new NextRequest('http://localhost:3000/api/ai/search', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'test-agent'
      },
      body: JSON.stringify({
        query: 'test query',
        maxResults: 10
      })
    });

    mockContext = {
      correlationId: 'test-correlation-id',
      userId: 'test-user-id',
      userRole: 'USER'
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should execute all middleware successfully', async () => {
      // Mock successful middleware execution
      const { AICorsMiddleware } = require('../cors');
      AICorsMiddleware.handle.mockResolvedValue(mockRequest);

      const { AIValidationMiddleware } = require('../validation');
      AIValidationMiddleware.validate.mockResolvedValue(mockRequest);

      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue({
        user: {
          id: 'test-user-id',
          role: 'USER'
        }
      });

      const { rateLimiter } = require('../rate-limiter');
      rateLimiter.checkLimit.mockResolvedValue({
        limit: 5,
        remaining: 4,
        resetTime: Date.now() + 60000
      });

      const result = await AIMiddlewareStack.execute(mockRequest, mockContext);

      expect(result.request).toBeDefined();
      expect(result.context).toBeDefined();
      expect(result.context.userId).toBe('test-user-id');
      expect(result.context.userRole).toBe('USER');
      expect(result.context.correlationId).toBeDefined();
    });

    it('should handle authentication failures', async () => {
      const { AICorsMiddleware } = require('../cors');
      AICorsMiddleware.handle.mockResolvedValue(mockRequest);

      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue(null); // No session

      await expect(AIMiddlewareStack.execute(mockRequest, mockContext))
        .rejects.toThrow(AIAPIError);

      const { AILogger } = require('../logger');
      expect(AILogger.logAuthentication).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('should handle rate limit violations', async () => {
      const { AICorsMiddleware } = require('../cors');
      AICorsMiddleware.handle.mockResolvedValue(mockRequest);

      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue({
        user: {
          id: 'test-user-id',
          role: 'USER'
        }
      });

      const { rateLimiter } = require('../rate-limiter');
      const { RateLimitError } = require('../errors');
      rateLimiter.checkLimit.mockRejectedValue(new RateLimitError(5, 0, Date.now() + 60000, 60));

      await expect(AIMiddlewareStack.execute(mockRequest, mockContext))
        .rejects.toThrow(RateLimitError);
    });

    it('should handle validation errors', async () => {
      const { AICorsMiddleware } = require('../cors');
      AICorsMiddleware.handle.mockResolvedValue(mockRequest);

      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue({
        user: {
          id: 'test-user-id',
          role: 'USER'
        }
      });

      const { rateLimiter } = require('../rate-limiter');
      rateLimiter.checkLimit.mockResolvedValue({
        limit: 5,
        remaining: 4,
        resetTime: Date.now() + 60000
      });

      const { AIValidationMiddleware } = require('../validation');
      const { ValidationError } = require('../errors');
      AIValidationMiddleware.validate.mockRejectedValue(new ValidationError('Invalid data'));

      await expect(AIMiddlewareStack.execute(mockRequest, mockContext))
        .rejects.toThrow(ValidationError);
    });
  });

  describe('executeForEndpoint', () => {
    it('should set endpoint type correctly', async () => {
      const { AICorsMiddleware } = require('../cors');
      AICorsMiddleware.handle.mockResolvedValue(mockRequest);

      const { AIValidationMiddleware } = require('../validation');
      AIValidationMiddleware.validate.mockResolvedValue(mockRequest);

      const { auth } = require('@/lib/auth');
      auth.mockResolvedValue({
        user: {
          id: 'test-user-id',
          role: 'USER'
        }
      });

      const { rateLimiter } = require('../rate-limiter');
      rateLimiter.checkLimit.mockResolvedValue({
        limit: 5,
        remaining: 4,
        resetTime: Date.now() + 60000
      });

      const result = await AIMiddlewareStack.executeForEndpoint(mockRequest, 'search', mockContext);

      expect((result.request as any).__endpointType).toBe('search');
    });
  });
});

describe('withAIMiddleware', () => {
  let mockHandler: jest.Mock;
  let mockRequest: NextRequest;

  beforeEach(() => {
    mockHandler = jest.fn();
    mockRequest = new NextRequest('http://localhost:3000/api/ai/search', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      }
    });

    jest.clearAllMocks();
  });

  it('should wrap handler with middleware', async () => {
    const { withAIMiddleware } = require('../middleware');
    const wrappedHandler = withAIMiddleware(mockHandler);

    // Mock successful middleware execution
    const { AICorsMiddleware } = require('../cors');
    AICorsMiddleware.handle.mockResolvedValue(mockRequest);

    const { AIValidationMiddleware } = require('../validation');
    AIValidationMiddleware.validate.mockResolvedValue(mockRequest);

    const { auth } = require('@/lib/auth');
    auth.mockResolvedValue({
      user: {
        id: 'test-user-id',
        role: 'USER'
      }
    });

    const { rateLimiter } = require('../rate-limiter');
    rateLimiter.checkLimit.mockResolvedValue({
      limit: 5,
      remaining: 4,
      resetTime: Date.now() + 60000
    });

    const mockResponse = NextResponse.json({ success: true });
    mockHandler.mockResolvedValue(mockResponse);

    const result = await wrappedHandler(mockRequest);

    expect(mockHandler).toHaveBeenCalledWith(
      expect.any(NextRequest),
      expect.objectContaining({
        userId: 'test-user-id',
        userRole: 'USER',
        correlationId: expect.any(String)
      })
    );

    expect(result).toBeDefined();
  });

  it('should skip authentication when configured', async () => {
    const { withAIMiddleware } = require('../middleware');
    const wrappedHandler = withAIMiddleware(mockHandler, { skipAuth: true });

    const { AICorsMiddleware } = require('../cors');
    AICorsMiddleware.handle.mockResolvedValue(mockRequest);

    const { AIValidationMiddleware } = require('../validation');
    AIValidationMiddleware.validate.mockResolvedValue(mockRequest);

    const { rateLimiter } = require('../rate-limiter');
    rateLimiter.checkLimit.mockResolvedValue({
      limit: 5,
      remaining: 4,
      resetTime: Date.now() + 60000
    });

    const mockResponse = NextResponse.json({ success: true });
    mockHandler.mockResolvedValue(mockResponse);

    await wrappedHandler(mockRequest);

    // Should not call auth when skipAuth is true
    const { auth } = require('@/lib/auth');
    expect(auth).not.toHaveBeenCalled();
  });

  it('should skip rate limiting when configured', async () => {
    const { withAIMiddleware } = require('../middleware');
    const wrappedHandler = withAIMiddleware(mockHandler, { skipRateLimit: true });

    const { AICorsMiddleware } = require('../cors');
    AICorsMiddleware.handle.mockResolvedValue(mockRequest);

    const { auth } = require('@/lib/auth');
    auth.mockResolvedValue({
      user: {
        id: 'test-user-id',
        role: 'USER'
      }
    });

    const { AIValidationMiddleware } = require('../validation');
    AIValidationMiddleware.validate.mockResolvedValue(mockRequest);

    const mockResponse = NextResponse.json({ success: true });
    mockHandler.mockResolvedValue(mockResponse);

    await wrappedHandler(mockRequest);

    // Should not call rateLimiter when skipRateLimit is true
    const { rateLimiter } = require('../rate-limiter');
    expect(rateLimiter.checkLimit).not.toHaveBeenCalled();
  });

  it('should handle middleware errors correctly', async () => {
    const { withAIMiddleware } = require('../middleware');
    const wrappedHandler = withAIMiddleware(mockHandler);

    // Mock authentication failure
    const { AICorsMiddleware } = require('../cors');
    AICorsMiddleware.handle.mockResolvedValue(mockRequest);

    const { auth } = require('@/lib/auth');
    auth.mockResolvedValue(null);

    const result = await wrappedHandler(mockRequest);

    expect(result).toBeInstanceOf(NextResponse);
    expect(result.status).toBe(401);

    const responseData = await result.json();
    expect(responseData.success).toBe(false);
    expect(responseData.type).toBe('AUTHENTICATION');
  });

  it('should add correlation ID to response headers', async () => {
    const { withAIMiddleware } = require('../middleware');
    const wrappedHandler = withAIMiddleware(mockHandler);

    const { AICorsMiddleware } = require('../cors');
    AICorsMiddleware.handle.mockResolvedValue(mockRequest);

    const { AIValidationMiddleware } = require('../validation');
    AIValidationMiddleware.validate.mockResolvedValue(mockRequest);

    const { auth } = require('@/lib/auth');
    auth.mockResolvedValue({
      user: {
        id: 'test-user-id',
        role: 'USER'
      }
    });

    const { rateLimiter } = require('../rate-limiter');
    rateLimiter.checkLimit.mockResolvedValue({
      limit: 5,
      remaining: 4,
      resetTime: Date.now() + 60000
    });

    const mockResponse = NextResponse.json({ success: true });
    mockHandler.mockResolvedValue(mockResponse);

    const result = await wrappedHandler(mockRequest);

    expect(result.headers.get('X-Correlation-ID')).toBeDefined();
  });

  it('should add rate limit headers to response', async () => {
    const { withAIMiddleware } = require('../middleware');
    const wrappedHandler = withAIMiddleware(mockHandler);

    const { AICorsMiddleware } = require('../cors');
    AICorsMiddleware.handle.mockResolvedValue(mockRequest);

    const { AIValidationMiddleware } = require('../validation');
    AIValidationMiddleware.validate.mockResolvedValue(mockRequest);

    const { auth } = require('@/lib/auth');
    auth.mockResolvedValue({
      user: {
        id: 'test-user-id',
        role: 'USER'
      }
    });

    const { rateLimiter } = require('../rate-limiter');
    const rateLimitInfo = {
      limit: 5,
      remaining: 4,
      resetTime: Date.now() + 60000
    };
    rateLimiter.checkLimit.mockResolvedValue(rateLimitInfo);

    const mockResponse = NextResponse.json({ success: true });
    mockHandler.mockResolvedValue(mockResponse);

    const result = await wrappedHandler(mockRequest);

    expect(result.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(result.headers.get('X-RateLimit-Remaining')).toBe('4');
    expect(result.headers.get('X-RateLimit-Reset')).toBe(rateLimitInfo.resetTime.toString());
  });
});