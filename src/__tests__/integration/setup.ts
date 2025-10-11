/**
 * Integration Tests Setup
 * Configures the global test environment for integration tests
 */

import { PrismaClient } from '@prisma/client';
import { testSetup } from './config/test-config';

// Global test configuration
global.testConfig = {
  timeout: 300000, // 5 minutes
  retries: 2,
  verbose: true
};

// Set up global test utilities
global.testUtils = {
  // Wait for async operations
  waitFor: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Generate random test data
  generateRandomId: (): string => {
    return Math.random().toString(36).substring(2, 15);
  },

  // Generate random test email
  generateRandomEmail: (): string => {
    return `test-${global.testUtils.generateRandomId()}@example.com`;
  },

  // Create a mock correlation ID
  createCorrelationId: (): string => {
    return `test-${Date.now()}-${global.testUtils.generateRandomId()}`;
  }
};

// Set up global test matchers
expect.extend({
  // Check if response is a valid API response
  toBeValidAPIResponse(received: any) {
    const pass = received && 
                typeof received === 'object' && 
                typeof received.success === 'boolean' && 
                received.timestamp && 
                received.correlationId;

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid API response`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid API response with success, timestamp, and correlationId`,
        pass: false
      };
    }
  },

  // Check if response is a valid error response
  toBeValidErrorResponse(received: any) {
    const pass = received && 
                typeof received === 'object' && 
                received.success === false && 
                received.error && 
                received.timestamp && 
                received.correlationId;

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid error response`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid error response with success=false, error, timestamp, and correlationId`,
        pass: false
      };
    }
  },

  // Check if response has a correlation ID
  toHaveCorrelationId(received: any) {
    const pass = received && 
                typeof received === 'object' && 
                received.correlationId && 
                typeof received.correlationId === 'string';

    if (pass) {
      return {
        message: () => `expected ${received} not to have a correlation ID`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to have a correlation ID`,
        pass: false
      };
    }
  },

  // Check if timestamp is recent (within last 5 seconds)
  toBeRecent(received: any) {
    if (!received || typeof received !== 'string') {
      return {
        message: () => `expected ${received} to be a string timestamp`,
        pass: false
      };
    }

    const timestamp = new Date(received).getTime();
    const now = new Date().getTime();
    const fiveSecondsAgo = now - 5000;

    const pass = timestamp >= fiveSecondsAgo && timestamp <= now;

    if (pass) {
      return {
        message: () => `expected ${received} not to be a recent timestamp`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be a recent timestamp (within last 5 seconds)`,
        pass: false
      };
    }
  },

  // Check if contact data is valid
  toContainValidContacts(received: any) {
    if (!received || !Array.isArray(received)) {
      return {
        message: () => `expected ${received} to be an array of contacts`,
        pass: false
      };
    }

    const pass = received.length === 0 || received.every(contact => 
      contact.name && 
      contact.email && 
      typeof contact.confidence === 'number' && 
      contact.confidence > 0 && 
      contact.confidence <= 1
    );

    if (pass) {
      return {
        message: () => `expected ${received} not to contain valid contacts`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to contain valid contacts with name, email, and confidence between 0 and 1`,
        pass: false
      };
    }
  }
});

// Set up global test environment
beforeAll(async () => {
  // Initialize test database
  await testSetup.setupDatabase();
  
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.AI_LOG_LEVEL = 'error';
  
  // Disable console logs for cleaner test output
  if (!global.testConfig.verbose) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
  }
});

// Clean up after all tests
afterAll(async () => {
  // Clean up test database
  await testSetup.teardownDatabase();
  
  // Close database connection
  const prisma = testSetup.getPrismaClient();
  await prisma.$disconnect();
});

// Set up mock implementations for external services
jest.mock('@/lib/ai/services/openai', () => ({
  OpenAIService: jest.fn().mockImplementation(() => ({
    generateQueryEnhancements: jest.fn().mockResolvedValue({
      enhancedQueries: [
        {
          query: 'Enhanced test query',
          relevance: 0.9,
          confidence: 0.85
        }
      ]
    }),
    extractContacts: jest.fn().mockResolvedValue({
      contacts: [
        {
          name: 'Test Contact',
          email: 'test@example.com',
          confidence: 0.9
        }
      ]
    }),
    analyzeContent: jest.fn().mockResolvedValue({
      summary: 'Test summary',
      keywords: ['test', 'keyword'],
      relevance: 0.8
    })
  }))
}));

jest.mock('@/lib/ai/services/anthropic', () => ({
  AnthropicService: jest.fn().mockImplementation(() => ({
    generateQueryEnhancements: jest.fn().mockResolvedValue({
      enhancedQueries: [
        {
          query: 'Enhanced test query',
          relevance: 0.9,
          confidence: 0.85
        }
      ]
    }),
    extractContacts: jest.fn().mockResolvedValue({
      contacts: [
        {
          name: 'Test Contact',
          email: 'test@example.com',
          confidence: 0.9
        }
      ]
    }),
    analyzeContent: jest.fn().mockResolvedValue({
      summary: 'Test summary',
      keywords: ['test', 'keyword'],
      relevance: 0.8
    })
  }))
}));

jest.mock('@/lib/ai/services/exa', () => ({
  ExaService: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue({
      results: [
        {
          url: 'https://example.com/test-article',
          title: 'Test Article',
          summary: 'Test summary',
          relevanceScore: 0.9
        }
      ],
      totalResults: 1
    }),
    getSimilarResults: jest.fn().mockResolvedValue({
      results: [],
      totalResults: 0
    })
  }))
}));

jest.mock('@/lib/ai/services/firecrawl', () => ({
  FirecrawlService: jest.fn().mockImplementation(() => ({
    scrape: jest.fn().mockResolvedValue({
      url: 'https://example.com/test-article',
      title: 'Test Article',
      content: 'Test content',
      metadata: {
        wordCount: 100,
        author: 'Test Author'
      }
    }),
    batchScrape: jest.fn().mockResolvedValue({
      results: [
        {
          url: 'https://example.com/test-article',
          title: 'Test Article',
          content: 'Test content',
          metadata: {
            wordCount: 100,
            author: 'Test Author'
          },
          success: true
        }
      ],
      total: 1,
      success: 1,
      failed: 0
    })
  }))
}));

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user'
    },
    expires: '2024-12-31T23:59:59.999Z'
  }))
}));

// Mock AI logger
jest.mock('@/app/api/ai/shared/logger', () => ({
  AILogger: {
    logBusiness: jest.fn().mockResolvedValue(undefined),
    logPerformance: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

// Export global utilities for use in tests
export { testSetup, global };