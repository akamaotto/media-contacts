import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('AI Database Performance Tests', () => {
  let testUser: any;
  let testData: any[] = [];

  beforeAll(async () => {
    // Find a test user
    testUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!testUser) {
      console.warn('No test user found for performance tests');
      return;
    }

    // Create test data for performance testing
    await createTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await prisma.$disconnect();
  });

  async function createTestData() {
    if (!testUser) return;

    console.log('Creating test data for performance tests...');

    // Create test searches
    const searches = [];
    for (let i = 0; i < 100; i++) {
      searches.push({
        userId: testUser.id,
        status: i % 5 === 0 ? 'FAILED' : 'COMPLETED',
        configuration: {
          query: `test query ${i}`,
          filters: { country: ['US', 'UK', 'CA'][i % 3] },
          maxContacts: 10 + (i % 20)
        },
        contacts_found: Math.floor(Math.random() * 50),
        contacts_imported: Math.floor(Math.random() * 40),
        duration_seconds: Math.floor(Math.random() * 300),
        started_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        completed_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      });
    }

    testData.searches = await Promise.all(
      searches.map(search => prisma.ai_searches.create({ data: search }))
    );

    // Create test sources
    const sources = [];
    testData.searches.forEach((search, searchIndex) => {
      const sourceCount = 2 + Math.floor(Math.random() * 5);
      for (let i = 0; i < sourceCount; i++) {
        sources.push({
          searchId: search.id,
          sourceUrl: `https://test${searchIndex}-source${i}.com`,
          sourceType: ['media_outlet', 'linkedin', 'twitter', 'website'][i % 4],
          domain: `test${searchIndex}-source${i}.com`,
          title: `Test Source ${searchIndex}-${i}`,
          confidenceScore: 0.5 + Math.random() * 0.5,
          contactCount: Math.floor(Math.random() * 20),
          processingTimeMs: Math.floor(Math.random() * 2000)
        });
      }
    });

    testData.sources = await Promise.all(
      sources.map(source => prisma.ai_search_sources.create({ data: source }))
    );

    // Create test performance logs
    const logs = [];
    testData.searches.forEach((search, searchIndex) => {
      const logCount = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < logCount; i++) {
        logs.push({
          searchId: search.id,
          operation: ['query_generation', 'web_scraping', 'contact_extraction', 'validation'][i % 4],
          startTime: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          durationMs: Math.floor(Math.random() * 5000),
          status: Math.random() > 0.1 ? 'success' : 'failed',
          metadata: {
            attempt: i + 1,
            tokens_used: Math.floor(Math.random() * 1000),
            pages_processed: Math.floor(Math.random() * 50)
          }
        });
      }
    });

    testData.logs = await Promise.all(
      logs.map(log => prisma.ai_performance_logs.create({ data: log }))
    );

    console.log(`Created ${testData.searches.length} searches, ${testData.sources.length} sources, ${testData.logs.length} logs`);
  }

  async function cleanupTestData() {
    if (!testData.searches) return;

    console.log('Cleaning up test data...');

    // Delete in reverse order of dependencies
    if (testData.logs) {
      await prisma.ai_performance_logs.deleteMany({
        where: {
          searchId: {
            in: testData.searches.map((s: any) => s.id)
          }
        }
      });
    }

    if (testData.sources) {
      await prisma.ai_search_sources.deleteMany({
        where: {
          searchId: {
            in: testData.searches.map((s: any) => s.id)
          }
        }
      });
    }

    if (testData.searches) {
      await prisma.ai_searches.deleteMany({
        where: {
          id: {
            in: testData.searches.map((s: any) => s.id)
          }
        }
      });
    }

    console.log('Test data cleaned up');
  }

  describe('Query Performance', () => {
    it('should handle large search queries efficiently', async () => {
      const startTime = performance.now();

      const results = await prisma.ai_searches.findMany({
        where: {
          status: 'COMPLETED',
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          ai_search_sources: {
            select: {
              id: true,
              sourceType: true,
              confidenceScore: true,
              contactCount: true
            }
          },
          ai_performance_logs: {
            select: {
              operation: true,
              durationMs: true,
              status: true
            },
            orderBy: {
              startTime: 'desc'
            },
            take: 5
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 50
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      console.log(`Large query with relations completed in ${duration.toFixed(2)}ms for ${results.length} results`);
    });

    it('should perform efficient aggregations', async () => {
      const startTime = performance.now();

      const aggregations = await prisma.ai_searches.aggregate({
        where: {
          status: 'COMPLETED',
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        _count: {
          id: true
        },
        _sum: {
          contacts_found: true,
          contacts_imported: true,
          duration_seconds: true
        },
        _avg: {
          contacts_found: true,
          contacts_imported: true,
          duration_seconds: true
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(aggregations._count.id).toBeGreaterThan(0);
      expect(duration).toBeLessThan(500); // Should complete within 500ms

      console.log(`Aggregation query completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle complex filtering efficiently', async () => {
      const startTime = performance.now();

      const filteredResults = await prisma.ai_searches.findMany({
        where: {
          AND: [
            {
              status: {
                in: ['COMPLETED', 'PROCESSING']
              }
            },
            {
              contacts_found: {
                gte: 5
              }
            },
            {
              configuration: {
                path: ['filters', 'country'],
                in: ['US', 'UK']
              }
            },
            {
              created_at: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              }
            }
          ]
        },
        select: {
          id: true,
          status: true,
          contacts_found: true,
          configuration: true,
          created_at: true,
          ai_search_sources: {
            select: {
              sourceType: true,
              confidenceScore: true
            }
          }
        },
        orderBy: {
          contacts_found: 'desc'
        },
        take: 20
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(800); // Should complete within 800ms

      console.log(`Complex filtering query completed in ${duration.toFixed(2)}ms for ${filteredResults.length} results`);
    });

    it('should efficiently query source quality metrics', async () => {
      const startTime = performance.now();

      const sourceMetrics = await prisma.ai_search_sources.groupBy({
        by: ['sourceType'],
        where: {
          created_at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        _count: {
          id: true
        },
        _avg: {
          confidenceScore: true,
          contactCount: true,
          processingTimeMs: true
        },
        _sum: {
          contactCount: true
        },
        orderBy: {
          _avg: {
            confidenceScore: 'desc'
          }
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(sourceMetrics.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(600); // Should complete within 600ms

      console.log(`Source metrics query completed in ${duration.toFixed(2)}ms for ${sourceMetrics.length} source types`);
    });
  });

  describe('Index Performance', () => {
    it('should use indexes effectively for status queries', async () => {
      // Test query that should use status index
      const startTime = performance.now();

      await prisma.ai_searches.findMany({
        where: {
          status: 'COMPLETED'
        },
        select: {
          id: true,
          status: true,
          created_at: true
        },
        take: 100
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should be very fast with index

      console.log(`Status indexed query completed in ${duration.toFixed(2)}ms`);
    });

    it('should use indexes effectively for userId queries', async () => {
      if (!testUser) return;

      // Test query that should use userId index
      const startTime = performance.now();

      await prisma.ai_searches.findMany({
        where: {
          userId: testUser.id
        },
        include: {
          ai_search_sources: {
            select: {
              sourceType: true,
              contactCount: true
            },
            take: 10
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        take: 50
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(300); // Should be fast with index

      console.log(`UserId indexed query completed in ${duration.toFixed(2)}ms`);
    });

    it('should use composite indexes effectively', async () => {
      if (!testUser) return;

      // Test query that should benefit from composite indexes
      const startTime = performance.now();

      await prisma.ai_searches.findFirst({
        where: {
          userId: testUser.id,
          status: 'PENDING'
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should be very fast with unique constraint

      console.log(`Composite indexed query completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent read operations', async () => {
      const concurrentQueries = 10;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentQueries }, async (_, i) => {
        return prisma.ai_searches.findMany({
          where: {
            status: 'COMPLETED'
          },
          select: {
            id: true,
            contacts_found: true,
            created_at: true
          },
          orderBy: {
            created_at: 'desc'
          },
          take: 20,
          skip: i * 5
        });
      });

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(concurrentQueries);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      const totalResults = results.reduce((sum, result) => sum + result.length, 0);
      console.log(`Concurrent queries (${concurrentQueries}) completed in ${duration.toFixed(2)}ms for ${totalResults} total results`);
    });

    it('should handle concurrent write operations', async () => {
      if (!testUser) return;

      const concurrentWrites = 5;
      const startTime = performance.now();

      const promises = Array.from({ length: concurrentWrites }, async (_, i) => {
        return prisma.ai_performance_logs.create({
          data: {
            searchId: testData.searches[i % testData.searches.length].id,
            operation: 'concurrent_test',
            startTime: new Date(),
            endTime: new Date(),
            durationMs: 100 + i * 10,
            status: 'success',
            metadata: { concurrent_index: i }
          }
        });
      });

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(concurrentWrites);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

      console.log(`Concurrent writes (${concurrentWrites}) completed in ${duration.toFixed(2)}ms`);

      // Clean up
      await prisma.ai_performance_logs.deleteMany({
        where: {
          operation: 'concurrent_test'
        }
      });
    });
  });

  describe('JSONB Performance', () => {
    it('should handle JSONB queries efficiently', async () => {
      const startTime = performance.now();

      // Query configuration field with JSONB operators
      const results = await prisma.$queryRaw`
        SELECT id, configuration, contacts_found
        FROM ai_searches
        WHERE configuration->>'maxContacts'::integer > 15
        AND configuration->'filters'->>'country' = 'US'
        ORDER BY created_at DESC
        LIMIT 20
      `;

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(Array.isArray(results)).toBe(true);
      expect(duration).toBeLessThan(500); // Should be reasonably fast

      console.log(`JSONB query completed in ${duration.toFixed(2)}ms for ${results.length} results`);
    });

    it('should handle JSONB aggregations efficiently', async () => {
      const startTime = performance.now();

      const results = await prisma.$queryRaw`
        SELECT
          configuration->>'maxContacts' as max_contacts,
          COUNT(*) as search_count,
          AVG(contacts_found) as avg_contacts_found
        FROM ai_searches
        WHERE configuration->>'maxContacts' IS NOT NULL
        GROUP BY configuration->>'maxContacts'
        ORDER BY max_contacts
      `;

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(Array.isArray(results)).toBe(true);
      expect(duration).toBeLessThan(600); // Should be reasonably fast

      console.log(`JSONB aggregation completed in ${duration.toFixed(2)}ms for ${results.length} groups`);
    });
  });

  describe('View Performance', () => {
    it('should query views efficiently', async () => {
      const views = [
        'ai_search_metrics',
        'user_search_patterns',
        'source_quality_metrics',
        'cost_tracking'
      ];

      for (const view of views) {
        const startTime = performance.now();

        try {
          const results = await prisma.$queryRawUnsafe(`
            SELECT * FROM ${view}
            LIMIT 10
          `);

          const endTime = performance.now();
          const duration = endTime - startTime;

          expect(Array.isArray(results)).toBe(true);
          expect(duration).toBeLessThan(1000); // Views should be reasonably fast

          console.log(`${view} view query completed in ${duration.toFixed(2)}ms`);
        } catch (error) {
          console.warn(`Could not test ${view} view:`, error);
        }
      }
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for key operations', async () => {
      const benchmarks = [
        {
          name: 'Simple SELECT by ID',
          operation: async () => {
            if (testData.searches.length > 0) {
              return prisma.ai_searches.findUnique({
                where: { id: testData.searches[0].id }
              });
            }
            return null;
          },
          maxDuration: 50
        },
        {
          name: 'SELECT with basic filtering',
          operation: async () => {
            return prisma.ai_searches.findMany({
              where: { status: 'COMPLETED' },
              take: 10
            });
          },
          maxDuration: 100
        },
        {
          name: 'SELECT with relations',
          operation: async () => {
            return prisma.ai_searches.findMany({
              where: { userId: testUser.id },
              include: {
                ai_search_sources: { take: 5 },
                ai_performance_logs: { take: 5 }
              },
              take: 5
            });
          },
          maxDuration: 500
        },
        {
          name: 'Aggregation query',
          operation: async () => {
            return prisma.ai_searches.aggregate({
              _count: { id: true },
              _avg: { contacts_found: true },
              where: { status: 'COMPLETED' }
            });
          },
          maxDuration: 200
        }
      ];

      const results = [];

      for (const benchmark of benchmarks) {
        const startTime = performance.now();
        await benchmark.operation();
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          name: benchmark.name,
          duration,
          passed: duration <= benchmark.maxDuration
        });

        expect(duration).toBeLessThan(benchmark.maxDuration);
      }

      console.table(results);
      const failedBenchmarks = results.filter(r => !r.passed);
      expect(failedBenchmarks).toHaveLength(0);
    });
  });
});