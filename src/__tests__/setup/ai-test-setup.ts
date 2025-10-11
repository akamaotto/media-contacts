/**
 * AI Test Setup
 * Global setup for AI search testing
 */

import { jest } from '@jest/globals';

// Mock external AI services
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'Mock AI response'
            }
          }]
        })
      }
    }
  }))
}));

jest.mock('@anthropic-ai/sdk', () => ({
  Anthropic: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{
          type: 'text',
          text: 'Mock Anthropic response'
        }]
      })
    }
  }))
}));

// Mock axios for HTTP requests
jest.mock('axios');

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1)
  }))
}));

// Mock fetch for external API calls
global.fetch = jest.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data: 'mock response' }),
    text: () => Promise.resolve('mock text response')
  } as Response)
);

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  Object.assign(console, originalConsole);
});

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.EXA_API_KEY = 'test-exa-key';
process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Set up global test utilities
global.testUtils = {
  createMockRequest: (overrides = {}) => ({
    id: 'test-request-id',
    searchId: 'test-search-id',
    batchId: 'test-batch-id',
    userId: 'test-user-id',
    originalQuery: 'test query',
    criteria: {
      categories: ['Technology'],
      countries: ['US'],
      languages: ['English']
    },
    options: {
      maxQueries: 10,
      enableAIEnhancement: true,
      cacheEnabled: true,
      priority: 'medium'
    },
    ...overrides
  }),

  createMockContact: (overrides = {}) => ({
    id: 'test-contact-id',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    outlet: 'Test Outlet',
    beat: 'Technology',
    country: 'US',
    confidence: 0.85,
    source: 'test',
    ...overrides
  }),

  createMockQuery: (overrides = {}) => ({
    id: 'test-query-id',
    query: 'test query journalist',
    type: 'BASE',
    templateId: 'test-template-id',
    scores: {
      relevance: 0.8,
      diversity: 0.7,
      coverage: 0.9,
      overall: 0.8
    },
    metadata: {
      enhanced: false,
      processingTime: 100
    },
    ...overrides
  }),

  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  createMockPrismaClient: () => ({
    ai_query_templates: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },
    ai_generated_queries: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    },
    ai_query_performance_logs: {
      create: jest.fn(),
      findMany: jest.fn()
    },
    media_contacts: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn()
  })
};

declare global {
  namespace globalThis {
    var testUtils: {
      createMockRequest: (overrides?: any) => any;
      createMockContact: (overrides?: any) => any;
      createMockQuery: (overrides?: any) => any;
      waitFor: (ms: number) => Promise<void>;
      createMockPrismaClient: () => any;
    };
  }
}