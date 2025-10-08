/**
 * Test Setup for Contact Extraction Tests
 */

// Extend Jest matchers
import 'jest-extended';

// Mock console methods to reduce noise in tests
const originalConsole = global.console;

beforeAll(() => {
  global.console = {
    ...originalConsole,
    // Keep error and warn logs for debugging
    log: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    // Keep error and warn
    error: originalConsole.error,
    warn: originalConsole.warn
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

// Global test utilities
global.testUtils = {
  createMockContact: (overrides = {}) => ({
    id: 'test-contact-' + Math.random().toString(36).substr(2, 9),
    extractionId: 'test-extraction-' + Math.random().toString(36).substr(2, 9),
    searchId: 'test-search-' + Math.random().toString(36).substr(2, 9),
    sourceUrl: 'https://example.com/test',
    name: 'Test Contact',
    title: 'Test Title',
    bio: 'Test bio content',
    email: 'test@example.com',
    confidenceScore: 0.8,
    relevanceScore: 0.7,
    qualityScore: 0.75,
    extractionMethod: 'AI_BASED',
    verificationStatus: 'PENDING',
    isDuplicate: false,
    metadata: {
      extractionMethod: 'AI_BASED',
      processingSteps: [],
      confidenceFactors: {
        nameConfidence: 0.9,
        emailConfidence: 0.8,
        titleConfidence: 0.7,
        bioConfidence: 0.6,
        socialConfidence: 0.5,
        overallConfidence: 0.8
      },
      qualityFactors: {
        sourceCredibility: 0.8,
        contentFreshness: 0.7,
        contactCompleteness: 0.75,
        informationConsistency: 0.8,
        overallQuality: 0.75
      }
    },
    createdAt: new Date(),
    ...overrides
  }),

  createMockParsedContent: (overrides = {}) => ({
    url: 'https://example.com/test',
    title: 'Test Article',
    content: 'This is a test article content.',
    metadata: {
      title: 'Test Article',
      description: 'Test description',
      wordCount: 100,
      readingTime: 1
    },
    links: [],
    images: [],
    language: 'en',
    ...overrides
  }),

  createMockExtractionRequest: (overrides = {}) => ({
    searchId: 'test-search-' + Math.random().toString(36).substr(2, 9),
    sources: [
      {
        url: 'https://example.com/test',
        type: 'web_content',
        priority: 'medium'
      }
    ],
    options: {
      enableAIEnhancement: true,
      enableEmailValidation: true,
      enableSocialDetection: true,
      enableDuplicateDetection: true,
      enableQualityAssessment: true,
      enableCaching: true,
      confidenceThreshold: 0.5,
      maxContactsPerSource: 10,
      processingTimeout: 30000,
      batchSize: 5,
      includeBio: true,
      includeSocialProfiles: true,
      strictValidation: false
    },
    userId: 'test-user-' + Math.random().toString(36).substr(2, 9),
    ...overrides
  }),

  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  createMockDate: (daysOffset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date;
  }
};

// Type declarations for global test utils
declare global {
  namespace jest {
    interface Matchers<R> {
      // Add custom matchers here if needed
    }
  }

  var testUtils: {
    createMockContact: (overrides?: any) => any;
    createMockParsedContent: (overrides?: any) => any;
    createMockExtractionRequest: (overrides?: any) => any;
    waitFor: (ms: number) => Promise<void>;
    createMockDate: (daysOffset?: number) => Date;
  };
}