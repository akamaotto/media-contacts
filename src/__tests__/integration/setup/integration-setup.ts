/**
 * Integration Test Setup
 * Global setup for all integration tests
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { IntegrationTestSetup, MockAPIHandler, testUtils } from '../config/test-config';

// Global test instances
let testSetup: IntegrationTestSetup;
let mockAPI: MockAPIHandler;

// Mock external services before all tests
beforeAll(async () => {
  // Initialize test environment
  console.log('🚀 Setting up integration test environment...');

  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.TEST_DATABASE_URL = 'postgresql://test:test@localhost:5432/media_contacts_test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.REDIS_URL = 'redis://localhost:6379/1';
  process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';

  // Mock API keys for external services
  process.env.OPENAI_API_KEY = 'sk-test-openai-key';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-anthropic-key';
  process.env.EXA_API_KEY = 'test-exa-key';
  process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';

  // Disable logging in tests to reduce noise
  process.env.LOG_LEVEL = 'error';
  process.env.AI_LOG_LEVEL = 'error';

  // Initialize test setup
  testSetup = new IntegrationTestSetup();
  mockAPI = new MockAPIHandler();

  // Setup test database
  await testSetup.setupDatabase();

  // Setup global fetch mocking
  global.fetch = jest.fn().mockImplementation((url, options) => {
    // Return different mocks based on URL
    if (url.includes('api.openai.com')) {
      const mockResponse = mockAPI.getMockResponse('openai', 'chat/completions');
      return Promise.resolve(mockAPI.createMockResponse(mockResponse));
    }

    if (url.includes('api.exa.ai')) {
      const mockResponse = mockAPI.getMockResponse('exa', 'search');
      return Promise.resolve(mockAPI.createMockResponse(mockResponse));
    }

    if (url.includes('api.firecrawl.dev')) {
      const mockResponse = mockAPI.getMockResponse('firecrawl', 'scrape');
      return Promise.resolve(mockAPI.createMockResponse(mockResponse));
    }

    // Default mock response
    return Promise.resolve(mockAPI.createMockResponse({ data: 'mock response' }));
  });

  // Setup global test utilities
  global.testSetup = testSetup;
  global.mockAPI = mockAPI;
  global.testUtils = testUtils;

  console.log('✅ Integration test environment setup completed');
}, 60000); // 60 second timeout for database setup

// Clean up after all tests
afterAll(async () => {
  console.log('🧹 Cleaning up integration test environment...');

  try {
    // Restore original fetch
    if (jest.isMockFunction(global.fetch)) {
      global.fetch.mockRestore();
    }

    // Cleanup database
    if (testSetup) {
      await testSetup.teardownDatabase();
    }

    // Clear all mocks
    jest.clearAllMocks();
    jest.restoreAllMocks();

    console.log('✅ Integration test environment cleanup completed');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}, 30000); // 30 second timeout for cleanup

// Setup before each test
beforeEach(async () => {
  // Reset all mocks before each test
  jest.clearAllMocks();

  // Reset mock API responses to defaults
  if (mockAPI) {
    mockAPI.clearMocks();
  }

  // Reset fetch mock implementation
  if (jest.isMockFunction(global.fetch)) {
    global.fetch.mockClear();
  }
});

// Cleanup after each test
afterEach(async () => {
  // Wait for any pending promises to resolve
  await new Promise(resolve => setTimeout(resolve, 100));

  // Clear any timers
  jest.clearAllTimers();
});

// Custom test matchers
expect.extend({
  // Check if response has proper API structure
  toBeValidAPIResponse(received) {
    const isValid = testUtils.validateAPIResponse(received);

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid API response with success, timestamp, and correlationId fields`,
        pass: false,
      };
    }
  },

  // Check if response has proper search structure
  toBeValidSearchResponse(received) {
    const isValid = testUtils.validateSearchResponse(received);

    if (isValid) {
      return {
        message: () => `expected ${received} not to be a valid search response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid search response with searchId, status, progress, and results fields`,
        pass: false,
      };
    }
  },

  // Check if array contains valid contacts
  toContainValidContacts(received) {
    if (!Array.isArray(received)) {
      return {
        message: () => `expected ${received} to be an array`,
        pass: false,
      };
    }

    const hasValidContacts = received.every(contact =>
      contact &&
      typeof contact.name === 'string' &&
      typeof contact.email === 'string' &&
      typeof contact.confidence === 'number' &&
      contact.confidence >= 0 && contact.confidence <= 1
    );

    if (hasValidContacts) {
      return {
        message: () => `expected ${received} not to contain only valid contacts`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to contain only valid contacts with name, email, and confidence fields`,
        pass: false,
      };
    }
  },

  // Check if response contains rate limiting information
  toHaveRateLimitInfo(received) {
    const hasRateLimit = received &&
      received.rateLimit &&
      typeof received.rateLimit.limit === 'number' &&
      typeof received.rateLimit.remaining === 'number' &&
      typeof received.rateLimit.resetTime === 'string';

    if (hasRateLimit) {
      return {
        message: () => `expected ${received} not to have rate limit information`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have rate limit information with limit, remaining, and resetTime fields`,
        pass: false,
      };
    }
  }
});

// Type declarations for global test utilities
declare global {
  namespace globalThis {
    var testSetup: import('../config/test-config').IntegrationTestSetup;
    var mockAPI: import('../config/test-config').MockAPIHandler;
    var testUtils: typeof import('../config/test-config').testUtils;
  }

  namespace jest {
    interface Matchers<R> {
      toBeValidAPIResponse(): R;
      toBeValidSearchResponse(): R;
      toContainValidContacts(): R;
      toHaveRateLimitInfo(): R;
    }
  }
}

export { testSetup, mockAPI };