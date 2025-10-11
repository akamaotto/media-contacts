/**
 * Test Helpers
 * Common utilities and helpers for AI search testing
 */

import { QueryGenerationRequest } from '@/lib/ai/query-generation/types';
import { ContactExtractionRequest } from '@/lib/ai/contact-extraction/types';
import { SearchConfiguration } from '@/lib/ai/search-orchestration/types';

/**
 * Creates a mock query generation request with sensible defaults
 */
export function createMockQueryGenerationRequest(
  overrides: Partial<QueryGenerationRequest> = {}
): QueryGenerationRequest {
  return {
    searchId: 'test-search-id',
    batchId: 'test-batch-id',
    originalQuery: 'artificial intelligence technology',
    criteria: {
      categories: ['Technology'],
      countries: ['US'],
      languages: ['English'],
      beats: ['AI'],
      topics: ['machine learning']
    },
    options: {
      maxQueries: 10,
      diversityThreshold: 0.7,
      minRelevanceScore: 0.3,
      enableAIEnhancement: true,
      fallbackStrategies: true,
      cacheEnabled: true,
      priority: 'medium'
    },
    userId: 'test-user-id',
    ...overrides
  };
}

/**
 * Creates a mock contact extraction request
 */
export function createMockContactExtractionRequest(
  overrides: Partial<ContactExtractionRequest> = {}
): ContactExtractionRequest {
  return {
    jobId: 'test-job-id',
    urls: [
      'https://techcrunch.com/2024/01/01/ai-breakthrough',
      'https://example.com/tech-journalist'
    ],
    content: [
      {
        url: 'https://techcrunch.com/2024/01/01/ai-breakthrough',
        title: 'AI Breakthrough Announcement',
        content: 'This article discusses the latest AI breakthrough and mentions John Doe, our technology correspondent.',
        author: 'Jane Smith',
        publishDate: '2024-01-01T00:00:00Z'
      }
    ],
    options: {
      extractEmails: true,
      extractSocialMedia: true,
      validateContacts: true,
      minConfidence: 0.7,
      maxContactsPerPage: 10,
      enableDeduplication: true,
      preserveOriginalData: true
    },
    userId: 'test-user-id',
    ...overrides
  };
}

/**
 * Creates a mock search configuration
 */
export function createMockSearchConfiguration(
  overrides: Partial<SearchConfiguration> = {}
): SearchConfiguration {
  return {
    searchId: 'test-search-id',
    userId: 'test-user-id',
    query: 'technology journalists',
    criteria: {
      categories: ['Technology'],
      countries: ['US', 'GB'],
      languages: ['English'],
      beats: ['AI', 'Startups']
    },
    sources: ['openai', 'exa', 'firecrawl'],
    options: {
      maxResults: 50,
      enableAIEnhancement: true,
      enableContactExtraction: true,
      enableCaching: true,
      priority: 'medium',
      timeout: 30000
    },
    ...overrides
  };
}

/**
 * Creates mock media contact data
 */
export function createMockMediaContact(overrides: any = {}) {
  return {
    id: 'test-contact-id',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    secondaryEmail: 'john.alt@technews.com',
    phone: '+1-555-0123',
    mobile: '+1-555-0124',
    outlet: 'Tech News Daily',
    outletId: 'test-outlet-id',
    beat: 'Technology',
    beatId: 'tech-beat-id',
    country: 'US',
    countryId: 'us-country-id',
    region: 'North America',
    regionId: 'na-region-id',
    languages: ['English'],
    topics: ['Artificial Intelligence', 'Machine Learning', 'Startups'],
    socialMedia: {
      twitter: '@johndoetech',
      linkedin: 'linkedin.com/in/johndoe',
      website: 'johndoe.tech'
    },
    confidence: 0.85,
    source: 'ai-extraction',
    sourceUrl: 'https://techcrunch.com/author/john-doe',
    lastVerified: new Date('2024-01-01'),
    isActive: true,
    notes: 'Senior technology correspondent with 10+ years experience',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  };
}

/**
 * Creates mock generated query data
 */
export function createMockGeneratedQuery(overrides: any = {}) {
  return {
    id: 'test-query-id',
    searchId: 'test-search-id',
    batchId: 'test-batch-id',
    query: 'AI technology journalist reporter',
    originalQuery: 'artificial intelligence',
    type: 'AI_ENHANCED',
    templateId: 'ai-template-1',
    scores: {
      relevance: 0.85,
      diversity: 0.75,
      coverage: 0.90,
      overall: 0.83
    },
    metadata: {
      aiEnhanced: true,
      processingTime: 250,
      modelUsed: 'gpt-4',
      promptTokens: 150,
      completionTokens: 50
    },
    status: 'ACTIVE',
    usageCount: 5,
    successCount: 4,
    averageConfidence: 0.82,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides
  };
}

/**
 * Creates a comprehensive mock Prisma client
 */
export function createMockPrismaClient() {
  return {
    // Query templates
    ai_query_templates: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn()
    },

    // Generated queries
    ai_generated_queries: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },

    // Performance logs
    ai_query_performance_logs: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },

    // Contact extraction jobs
    ai_contact_extraction_jobs: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },

    // Extracted contacts
    ai_extracted_contacts: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },

    // Search orchestrations
    ai_search_orchestrations: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },

    // Media contacts (for integration tests)
    media_contacts: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },

    // Transaction support
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $on: jest.fn(),
    $use: jest.fn()
  };
}

/**
 * Wait for a specified amount of time (useful for async testing)
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a mock HTTP response
 */
export function createMockResponse(data: any, status = 200, ok = true) {
  return {
    data,
    status,
    ok,
    headers: new Map([['content-type', 'application/json']]),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data))
  };
}

/**
 * Creates mock AI service responses
 */
export const mockAIResponses = {
  openai: {
    chatCompletion: {
      choices: [{
        message: {
          content: 'AI technology journalist reporter covering latest developments in artificial intelligence and machine learning.'
        }
      }]
    }
  },

  anthropic: {
    message: {
      content: [{
        type: 'text',
        text: 'Technology reporter specializing in AI and machine learning breakthroughs, startup funding, and industry analysis.'
      }]
    }
  },

  exa: {
    search: {
      results: [
        {
          title: 'Top AI Journalists to Follow in 2024',
          url: 'https://techjournal.com/ai-journalists-2024',
          score: 0.92,
          publishedDate: '2024-01-15'
        },
        {
          title: 'Best Technology Reporters Covering Artificial Intelligence',
          url: 'https://medialist.com/tech-reporters-ai',
          score: 0.88,
          publishedDate: '2024-01-10'
        }
      ]
    }
  },

  firecrawl: {
    scrape: {
      data: {
        content: 'John Doe is a senior technology correspondent at Tech News Daily, specializing in artificial intelligence and startup coverage. Contact: john.doe@technews.com',
        metadata: {
          title: 'About Our Tech Team',
          description: 'Meet the technology journalists covering AI and startups',
          author: 'Tech News Daily'
        }
      }
    },

    crawl: {
      data: [
        {
          url: 'https://technewsdaily.com/author/john-doe',
          content: 'John Doe - Senior Technology Correspondent Email: john.doe@technews.com Twitter: @johndoetech'
        }
      ]
    }
  }
};

/**
 * Performance testing utilities
 */
export class PerformanceTracker {
  private startTime: number = 0;
  private measurements: Array<{ name: string; duration: number }> = [];

  start(name: string): void {
    this.startTime = performance.now();
  }

  end(name: string): number {
    const duration = performance.now() - this.startTime;
    this.measurements.push({ name, duration });
    return duration;
  }

  getMeasurements(): Array<{ name: string; duration: number }> {
    return [...this.measurements];
  }

  reset(): void {
    this.measurements = [];
  }

  assertMaxDuration(name: string, maxMs: number): void {
    const measurement = this.measurements.find(m => m.name === name);
    if (measurement) {
      expect(measurement.duration).toBeLessThan(maxMs);
    } else {
      throw new Error(`No measurement found for ${name}`);
    }
  }
}

/**
 * Error testing utilities
 */
export function createMockError(message: string, code = 'TEST_ERROR', status = 500) {
  const error = new Error(message) as any;
  error.code = code;
  error.status = status;
  return error;
}

/**
 * Database testing utilities
 */
export function setupMockDatabaseData() {
  const mockTemplates = [
    createMockQueryTemplate({ id: 'template-1', name: 'Base Template' }),
    createMockQueryTemplate({ id: 'template-2', name: 'AI Template', type: 'AI_ENHANCED' })
  ];

  const mockContacts = [
    createMockMediaContact({ id: 'contact-1', firstName: 'John', lastName: 'Doe' }),
    createMockMediaContact({ id: 'contact-2', firstName: 'Jane', lastName: 'Smith' })
  ];

  return { mockTemplates, mockContacts };
}

function createMockQueryTemplate(overrides: any = {}) {
  return {
    id: 'test-template-id',
    name: 'Test Template',
    template: '{query} journalist reporter',
    type: 'BASE',
    country: null,
    category: null,
    beat: null,
    language: null,
    variables: {},
    priority: 100,
    isActive: true,
    usageCount: 10,
    successCount: 9,
    averageConfidence: 0.85,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    ...overrides
  };
}