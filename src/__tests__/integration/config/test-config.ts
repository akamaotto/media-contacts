/**
 * Integration Test Configuration for AI Search API
 * Configures test environment, database, and external service mocks
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

// Test database configuration
export const testDbConfig = {
  url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/media_contacts_test',
  name: `media_contacts_test_${randomBytes(8).toString('hex')}`
};

// Test user configuration
export const testUsers = {
  admin: {
    id: 'test-admin-id',
    email: 'admin@test.com',
    name: 'Test Admin',
    role: 'ADMIN'
  },
  user: {
    id: 'test-user-id',
    email: 'user@test.com',
    name: 'Test User',
    role: 'USER'
  }
};

// External API mock configuration
export const mockServiceConfig = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultResponses: {
      chatCompletion: {
        choices: [{
          message: {
            content: JSON.stringify({
              contacts: [
                {
                  name: 'John Doe',
                  email: 'john.doe@example.com',
                  role: 'Technology Journalist',
                  organization: 'Tech News Outlet',
                  confidence: 0.85,
                  location: 'San Francisco, CA',
                  beats: ['technology', 'AI'],
                  languages: ['English'],
                  phone: '+1-555-0123',
                  socialMedia: {
                    twitter: '@johndoetech',
                    linkedin: 'linkedin.com/in/johndoe'
                  }
                }
              ],
              confidence: 0.85,
              processingTime: 1200,
              sourceAnalysis: {
                type: 'article',
                quality: 'high',
                relevance: 0.9,
                contactDensity: 'medium'
              }
            })
          }
        }],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 200,
          total_tokens: 350
        }
      }
    }
  },
  exa: {
    baseUrl: 'https://api.exa.ai',
    defaultResponses: {
      search: {
        results: [
          {
            url: 'https://techcrunch.com/2024/01/15/ai-journalists',
            title: 'The Rise of AI Journalism: Meet the Key Players',
            summary: 'An in-depth look at the journalists covering the artificial intelligence beat, including their backgrounds and specialties.',
            publishedDate: '2024-01-15',
            domain: 'techcrunch.com',
            authority: 0.92,
            relevanceScore: 0.95,
            metadata: {
              language: 'en',
              contentLength: 2500,
              wordCount: 1200,
              author: 'Sarah Chen',
              topics: ['AI', 'Journalism', 'Technology']
            }
          },
          {
            url: 'https://wired.com/2024/01/10/tech-media-landscape',
            title: 'How Technology is Reshaping the Media Landscape',
            summary: 'Analysis of technology journalists and outlets that are leading coverage of innovation and digital transformation.',
            publishedDate: '2024-01-10',
            domain: 'wired.com',
            authority: 0.89,
            relevanceScore: 0.88,
            metadata: {
              language: 'en',
              contentLength: 1800,
              wordCount: 850,
              author: 'Michael Roberts',
              topics: ['Technology', 'Media', 'Digital Transformation']
            }
          }
        ],
        totalResults: 2,
        queryTime: 450,
        searchId: 'exa-search-123',
        metadata: {
          searchEngine: 'exa',
          queryProcessed: 'AI technology journalists',
          filtersApplied: ['date', 'domain']
        }
      }
    }
  },
  firecrawl: {
    baseUrl: 'https://api.firecrawl.dev',
    defaultResponses: {
      scrape: {
        url: 'https://techcrunch.com/2024/01/15/ai-journalists',
        title: 'The Rise of AI Journalism: Meet the Key Players',
        content: `
          The Rise of AI Journalism: Meet the Key Players

          By Sarah Chen
          January 15, 2024

          In the rapidly evolving world of technology journalism, a new breed of reporters has emerged to cover one of the most transformative beats: artificial intelligence. These journalists bring a unique blend of technical understanding and storytelling ability to make complex AI concepts accessible to mainstream audiences.

          Leading this movement is John Doe, a veteran technology journalist at Tech News Outlet. With over a decade of experience covering Silicon Valley, John has established himself as a go-to source for insights on AI development and its impact on society. His work has been featured in numerous publications, and he's known for his ability to break down complex technical topics for general audiences.

          "The key to good AI journalism is maintaining technical accuracy while telling compelling human stories," John explains. "We're not just reporting on algorithms and datasets; we're covering how this technology is changing real people's lives."

          Contact: john.doe@technewsoutlet.com
          Twitter: @johndoetech
          Phone: +1-555-0123

          Another notable voice in the space is Jane Smith, who covers AI for Wired Magazine. Jane's background in computer science gives her a unique perspective on the technical implications of AI development.

          Contact: jane.smith@wired.com
          LinkedIn: linkedin.com/in/janesmith

          These journalists represent the new face of technology reporting, combining deep technical knowledge with the storytelling skills necessary to engage and inform the public about one of the most important technological shifts of our time.
        `,
        metadata: {
          contentType: 'article',
          contentLength: 3200,
          language: 'en',
          wordCount: 1500,
          author: 'Sarah Chen',
          publishedDate: '2024-01-15',
          extractionSuccessful: true,
          contactInfoFound: true,
          socialMediaLinks: 2,
          emailAddresses: 2,
          phoneNumbers: 1
        }
      }
    }
  }
};

// Test data fixtures
export const testFixtures = {
  searchQueries: [
    {
      query: 'AI technology journalists',
      filters: {
        beats: ['technology', 'AI'],
        regions: ['US'],
        languages: ['English'],
        categories: ['technology']
      },
      options: {
        maxResults: 10,
        includeSummaries: true,
        extractContacts: true,
        scrapeContent: true,
        priority: 'normal'
      }
    },
    {
      query: 'healthcare medical reporters',
      filters: {
        beats: ['healthcare', 'medical'],
        countries: ['US', 'UK'],
        categories: ['healthcare']
      },
      options: {
        maxResults: 5,
        includeSummaries: true,
        extractContacts: true,
        scrapeContent: false,
        priority: 'high'
      }
    }
  ],

  expectedContacts: [
    {
      name: 'John Doe',
      email: 'john.doe@technewsoutlet.com',
      role: 'Technology Journalist',
      organization: 'Tech News Outlet',
      confidence: 0.85,
      location: 'San Francisco, CA',
      beats: ['technology', 'AI'],
      languages: ['English'],
      phone: '+1-555-0123',
      socialMedia: {
        twitter: '@johndoetech',
        linkedin: 'linkedin.com/in/johndoe'
      },
      source: {
        url: 'https://techcrunch.com/2024/01/15/ai-journalists',
        title: 'The Rise of AI Journalism: Meet the Key Players',
        extractedAt: '2024-01-15T10:00:00Z'
      }
    }
  ],

  mockAuthSession: {
    user: {
      id: testUsers.user.id,
      email: testUsers.user.email,
      name: testUsers.user.name,
      role: testUsers.user.role
    },
    expires: '2024-12-31T23:59:59.999Z'
  },

  mockAdminSession: {
    user: {
      id: testUsers.admin.id,
      email: testUsers.admin.email,
      name: testUsers.admin.name,
      role: testUsers.admin.role
    },
    expires: '2024-12-31T23:59:59.999Z'
  }
};

// Test environment setup utilities
export class IntegrationTestSetup {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDbConfig.url
        }
      }
    });
  }

  async setupDatabase(): Promise<void> {
    try {
      // Connect to test database
      await this.prisma.$connect();

      // Run migrations if needed
      execSync('npx prisma db push --skip-generate', {
        env: { ...process.env, DATABASE_URL: testDbConfig.url },
        stdio: 'inherit'
      });

      // Clean up any existing test data
      await this.cleanupDatabase();

      // Seed test data
      await this.seedTestData();

      console.log('✅ Test database setup completed');
    } catch (error) {
      console.error('❌ Test database setup failed:', error);
      throw error;
    }
  }

  async cleanupDatabase(): Promise<void> {
    // Clean up in order of dependencies
    const tablenames = await this.prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        try {
          await this.prisma.$executeRawUnsafe(
            `TRUNCATE TABLE "public"."${tablename}" CASCADE;`
          );
        } catch (error) {
          console.log(`Note: ${tablename} table doesn't exist or is already empty`);
        }
      }
    }

    console.log('✅ Database cleanup completed');
  }

  async seedTestData(): Promise<void> {
    // Create test users
    await this.prisma.user.createMany({
      data: [
        {
          id: testUsers.admin.id,
          email: testUsers.admin.email,
          name: testUsers.admin.name,
          role: testUsers.admin.role,
          emailVerified: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: testUsers.user.id,
          email: testUsers.user.email,
          name: testUsers.user.name,
          role: testUsers.user.role,
          emailVerified: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]
    });

    // Seed some basic geographic data
    await this.prisma.country.createMany({
      data: [
        { code: 'US', name: 'United States', region: 'North America' },
        { code: 'UK', name: 'United Kingdom', region: 'Europe' },
        { code: 'CA', name: 'Canada', region: 'North America' }
      ],
      skipDuplicates: true
    });

    await this.prisma.language.createMany({
      data: [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' }
      ],
      skipDuplicates: true
    });

    await this.prisma.beat.createMany({
      data: [
        { name: 'technology', slug: 'technology', description: 'Technology news and innovations' },
        { name: 'healthcare', slug: 'healthcare', description: 'Healthcare and medical news' },
        { name: 'business', slug: 'business', description: 'Business and finance' }
      ],
      skipDuplicates: true
    });

    console.log('✅ Test data seeding completed');
  }

  async teardownDatabase(): Promise<void> {
    try {
      await this.cleanupDatabase();
      await this.prisma.$disconnect();
      console.log('✅ Test database teardown completed');
    } catch (error) {
      console.error('❌ Test database teardown failed:', error);
      throw error;
    }
  }

  getPrismaClient(): PrismaClient {
    return this.prisma;
  }
}

// External API mocking utilities
export class MockAPIHandler {
  private mockResponses: Map<string, any> = new Map();

  constructor() {
    this.setupDefaultMocks();
  }

  private setupDefaultMocks(): void {
    // Setup OpenAI mocks
    this.mockResponses.set('openai:chat/completions', mockServiceConfig.openai.defaultResponses.chatCompletion);

    // Setup Exa mocks
    this.mockResponses.set('exa:search', mockServiceConfig.exa.defaultResponses.search);

    // Setup Firecrawl mocks
    this.mockResponses.set('firecrawl:scrape', mockServiceConfig.firecrawl.defaultResponses.scrape);
  }

  getMockResponse(service: string, endpoint: string): any {
    const key = `${service}:${endpoint}`;
    return this.mockResponses.get(key);
  }

  setMockResponse(service: string, endpoint: string, response: any): void {
    const key = `${service}:${endpoint}`;
    this.mockResponses.set(key, response);
  }

  clearMocks(): void {
    this.mockResponses.clear();
    this.setupDefaultMocks();
  }

  // Helper method to create mock fetch responses
  createMockResponse(data: any, status = 200, ok = true): Response {
    return {
      ok,
      status,
      json: async () => data,
      text: async () => JSON.stringify(data),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    } as Response;
  }

  // Helper method to create mock error responses
  createErrorResponse(message: string, status = 500): Response {
    return {
      ok: false,
      status,
      json: async () => ({ error: message }),
      text: async () => JSON.stringify({ error: message }),
      headers: new Headers({
        'Content-Type': 'application/json'
      })
    } as Response;
  }
}

// Test utilities
export const testUtils = {
  // Create mock NextRequest
  createMockRequest: (url: string, method: string = 'POST', body?: any, headers?: Record<string, string>): NextRequest => {
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (body) {
      requestInit.body = JSON.stringify(body);
    }

    return new NextRequest(url, requestInit);
  },

  // Wait for async operations
  waitFor: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Generate random test data
  generateRandomId: (): string => {
    return randomBytes(16).toString('hex');
  },

  // Generate random email
  generateRandomEmail: (): string => {
    return `test-${randomBytes(8).toString('hex')}@example.com`;
  },

  // Create mock search request
  createMockSearchRequest: (overrides: Partial<any> = {}) => ({
    query: 'test query',
    filters: {
      beats: ['technology'],
      regions: ['US'],
      languages: ['English'],
      ...overrides.filters
    },
    options: {
      maxResults: 10,
      includeSummaries: true,
      extractContacts: true,
      ...overrides.options
    },
    ...overrides
  }),

  // Validate API response structure
  validateAPIResponse: (response: any): boolean => {
    return (
      response &&
      typeof response.success === 'boolean' &&
      response.timestamp &&
      response.correlationId &&
      (response.success ? response.data !== undefined : response.error !== undefined)
    );
  },

  // Validate search response structure
  validateSearchResponse: (response: any): boolean => {
    return (
      response &&
      response.searchId &&
      response.status &&
      typeof response.progress === 'number' &&
      Array.isArray(response.results) &&
      response.createdAt &&
      response.updatedAt
    );
  }
};

export default {
  IntegrationTestSetup,
  MockAPIHandler,
  testDbConfig,
  testUsers,
  testFixtures,
  mockServiceConfig,
  testUtils
};