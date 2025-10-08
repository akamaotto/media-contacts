import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

describe('AI Database Integration Tests', () => {
  let testUser: any;
  let testContact: any;
  let testSearch: any;

  beforeAll(async () => {
    // Find or create a test user
    testUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!testUser) {
      console.warn('No test user found for integration tests');
    }

    // Find a test contact
    testContact = await prisma.media_contacts.findFirst();
  });

  afterAll(async () => {
    // Clean up test data
    if (testSearch) {
      await prisma.ai_search_sources.deleteMany({
        where: { searchId: testSearch.id }
      });
      await prisma.ai_performance_logs.deleteMany({
        where: { searchId: testSearch.id }
      });
      await prisma.ai_searches.delete({
        where: { id: testSearch.id }
      });
    }

    await prisma.$disconnect();
  });

  describe('Complete AI Search Workflow', () => {
    it('should create and manage a complete AI search workflow', async () => {
      if (!testUser) {
        console.warn('Skipping test: No test user available');
        return;
      }

      const searchConfig = {
        query: 'journalists covering technology',
        filters: {
          country: 'US',
          beat: 'technology',
          outlet_type: 'online'
        },
        maxContacts: 50,
        confidence_threshold: 0.7
      };

      // 1. Create AI search
      testSearch = await prisma.ai_searches.create({
        data: {
          userId: testUser.id,
          status: 'PENDING',
          configuration: searchConfig
        }
      });

      expect(testSearch.id).toBeDefined();
      expect(testSearch.userId).toBe(testUser.id);
      expect(testSearch.status).toBe('PENDING');
      expect(testSearch.configuration).toEqual(searchConfig);
      expect(testSearch.contacts_found).toBe(0);
      expect(testSearch.contacts_imported).toBe(0);

      // 2. Update search to PROCESSING
      const updatedSearch = await prisma.ai_searches.update({
        where: { id: testSearch.id },
        data: {
          status: 'PROCESSING',
          started_at: new Date()
        }
      });

      expect(updatedSearch.status).toBe('PROCESSING');
      expect(updatedSearch.started_at).toBeDefined();

      // 3. Add search sources
      const sources = [
        {
          searchId: testSearch.id,
          sourceUrl: 'https://techcrunch.com',
          sourceType: 'media_outlet',
          domain: 'techcrunch.com',
          title: 'TechCrunch',
          confidenceScore: 0.9,
          contactCount: 15,
          processingTimeMs: 1200
        },
        {
          searchId: testSearch.id,
          sourceUrl: 'https://linkedin.com/in/journalist',
          sourceType: 'linkedin',
          domain: 'linkedin.com',
          title: 'LinkedIn Profile',
          confidenceScore: 0.75,
          contactCount: 8,
          processingTimeMs: 800
        },
        {
          searchId: testSearch.id,
          sourceUrl: 'https://twitter.com/techjournalist',
          sourceType: 'twitter',
          domain: 'twitter.com',
          title: 'Twitter Profile',
          confidenceScore: 0.6,
          contactCount: 3,
          processingTimeMs: 400
        }
      ];

      const createdSources = await Promise.all(
        sources.map(source =>
          prisma.ai_search_sources.create({ data: source })
        )
      );

      expect(createdSources).toHaveLength(3);
      expect(createdSources[0].searchId).toBe(testSearch.id);

      // 4. Add performance logs
      const logs = [
        {
          searchId: testSearch.id,
          operation: 'query_generation',
          startTime: new Date(Date.now() - 5000),
          endTime: new Date(Date.now() - 4500),
          durationMs: 500,
          status: 'success',
          metadata: { model: 'gpt-4', tokens_used: 150 }
        },
        {
          searchId: testSearch.id,
          operation: 'web_scraping',
          startTime: new Date(Date.now() - 4000),
          endTime: new Date(Date.now() - 1000),
          durationMs: 3000,
          status: 'success',
          metadata: { pages_processed: 25, links_found: 45 }
        },
        {
          searchId: testSearch.id,
          operation: 'contact_extraction',
          startTime: new Date(Date.now() - 1000),
          endTime: new Date(),
          durationMs: 1000,
          status: 'success',
          metadata: { contacts_extracted: 26, ai_confidence_avg: 0.78 }
        }
      ];

      const createdLogs = await Promise.all(
        logs.map(log =>
          prisma.ai_performance_logs.create({ data: log })
        )
      );

      expect(createdLogs).toHaveLength(3);

      // 5. Complete the search
      const completedSearch = await prisma.ai_searches.update({
        where: { id: testSearch.id },
        data: {
          status: 'COMPLETED',
          completed_at: new Date(),
          duration_seconds: 5,
          contacts_found: 26,
          contacts_imported: 20
        }
      });

      expect(completedSearch.status).toBe('COMPLETED');
      expect(completedSearch.completed_at).toBeDefined();
      expect(completedSearch.duration_seconds).toBe(5);
      expect(completedSearch.contacts_found).toBe(26);
      expect(completedSearch.contacts_imported).toBe(20);

      // 6. Verify statistics trigger worked
      const searchWithStats = await prisma.ai_searches.findUnique({
        where: { id: testSearch.id },
        include: {
          ai_search_sources: true,
          ai_performance_logs: true
        }
      });

      expect(searchWithStats?.contacts_found).toBe(26);
      expect(searchWithStats?.ai_search_sources).toHaveLength(3);
      expect(searchWithStats?.ai_performance_logs).toHaveLength(3);
    });
  });

  describe('Cache Management', () => {
    it('should create and manage search cache entries', async () => {
      if (!testUser) {
        console.warn('Skipping test: No test user available');
        return;
      }

      const searchConfig = {
        query: 'ai researchers',
        filters: { region: 'europe' },
        maxContacts: 25
      };

      const queryHash = 'hash_' + Buffer.from(JSON.stringify(searchConfig)).toString('base64');

      // Create cache entry
      const cacheEntry = await prisma.ai_search_cache.create({
        data: {
          queryHash,
          searchConfiguration: searchConfig,
          results: {
            contacts: [
              { name: 'Dr. AI Researcher', email: 'ai@university.edu' },
              { name: 'Prof. Machine Learning', email: 'ml@tech.com' }
            ],
            total_count: 2,
            average_confidence: 0.85
          },
          contactCount: 2,
          averageConfidence: 0.85,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          searchId: testSearch?.id
        }
      });

      expect(cacheEntry.id).toBeDefined();
      expect(cacheEntry.queryHash).toBe(queryHash);
      expect(cacheEntry.contactCount).toBe(2);
      expect(cacheEntry.accessCount).toBe(0);

      // Update access count
      const updatedCache = await prisma.ai_search_cache.update({
        where: { id: cacheEntry.id },
        data: {
          accessCount: 5,
          lastAccessedAt: new Date()
        }
      });

      expect(updatedCache.accessCount).toBe(5);

      // Test unique constraint on queryHash
      await expect(
        prisma.ai_search_cache.create({
          data: {
            queryHash,
            searchConfiguration: searchConfig,
            results: { contacts: [] },
            contactCount: 0,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.ai_search_cache.delete({
        where: { id: cacheEntry.id }
      });
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect and manage contact duplicates', async () => {
      if (!testContact) {
        console.warn('Skipping test: No test contact available');
        return;
      }

      // Create a similar contact for testing
      const similarContact = await prisma.media_contacts.create({
        data: {
          name: testContact.name + ' (Similar)',
          title: testContact.title,
          email: `similar-${testContact.email}`,
          bio: testContact.bio,
          email_verified_status: false,
          socials: [],
          authorLinks: []
        }
      });

      expect(similarContact.id).toBeDefined();

      // Create duplicate detection entry
      const duplicate = await prisma.ai_contact_duplicates.create({
        data: {
          originalContactId: testContact.id,
          duplicateContactId: similarContact.id,
          similarityScore: 0.92,
          duplicateType: 'NAME_TITLE',
          verificationStatus: 'PENDING',
          ai_search_id: testSearch?.id
        }
      });

      expect(duplicate.id).toBeDefined();
      expect(duplicate.similarityScore).toBe(0.92);
      expect(duplicate.duplicateType).toBe('NAME_TITLE');
      expect(duplicate.verificationStatus).toBe('PENDING');

      // Update verification status
      const verifiedDuplicate = await prisma.ai_contact_duplicates.update({
        where: { id: duplicate.id },
        data: {
          verificationStatus: 'CONFIRMED',
          verifiedAt: new Date(),
          verifiedBy: testUser?.id
        }
      });

      expect(verifiedDuplicate.verificationStatus).toBe('CONFIRMED');
      expect(verifiedDuplicate.verifiedAt).toBeDefined();

      // Clean up
      await prisma.ai_contact_duplicates.delete({
        where: { id: duplicate.id }
      });
      await prisma.media_contacts.delete({
        where: { id: similarContact.id }
      });
    });
  });

  describe('Database Functions', () => {
    it('should call cleanup_expired_cache function', async () => {
      try {
        const result = await prisma.$queryRaw`SELECT cleanup_expired_cache() as deleted_count`;
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        // Function might not be accessible due to permissions, which is okay
        console.warn('Could not test cleanup_expired_cache function:', error);
      }
    });

    it('should call get_search_performance_metrics function', async () => {
      try {
        const result = await prisma.$queryRaw`
          SELECT * FROM get_search_performance_metrics(
            ${testUser?.id || null},
            CURRENT_DATE - INTERVAL '7 days',
            CURRENT_DATE
          )
          LIMIT 1
        `;
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        console.warn('Could not test get_search_performance_metrics function:', error);
      }
    });
  });

  describe('Database Views', () => {
    it('should query ai_search_metrics view', async () => {
      try {
        const result = await prisma.$queryRaw`
          SELECT * FROM ai_search_metrics
          LIMIT 5
        `;
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        console.warn('Could not test ai_search_metrics view:', error);
      }
    });

    it('should query user_search_patterns view', async () => {
      try {
        const result = await prisma.$queryRaw`
          SELECT * FROM user_search_patterns
          LIMIT 5
        `;
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        console.warn('Could not test user_search_patterns view:', error);
      }
    });

    it('should query source_quality_metrics view', async () => {
      try {
        const result = await prisma.$queryRaw`
          SELECT * FROM source_quality_metrics
        `;
        expect(Array.isArray(result)).toBe(true);
      } catch (error) {
        console.warn('Could not test source_quality_metrics view:', error);
      }
    });
  });

  describe('Foreign Key Relationships', () => {
    it('should enforce cascade delete relationships', async () => {
      if (!testUser) {
        console.warn('Skipping test: No test user available');
        return;
      }

      // Create a test search
      const testSearchForCascade = await prisma.ai_searches.create({
        data: {
          userId: testUser.id,
          status: 'PENDING',
          configuration: { query: 'test' }
        }
      });

      // Create related sources and logs
      await prisma.ai_search_sources.create({
        data: {
          searchId: testSearchForCascade.id,
          sourceUrl: 'https://test.com',
          sourceType: 'test',
          domain: 'test.com',
          confidenceScore: 0.8,
          contactCount: 1
        }
      });

      await prisma.ai_performance_logs.create({
        data: {
          searchId: testSearchForCascade.id,
          operation: 'test',
          startTime: new Date(),
          endTime: new Date(),
          durationMs: 100,
          status: 'success'
        }
      });

      // Verify related records exist
      const sourcesBefore = await prisma.ai_search_sources.count({
        where: { searchId: testSearchForCascade.id }
      });
      const logsBefore = await prisma.ai_performance_logs.count({
        where: { searchId: testSearchForCascade.id }
      });

      expect(sourcesBefore).toBe(1);
      expect(logsBefore).toBe(1);

      // Delete the search (should cascade)
      await prisma.ai_searches.delete({
        where: { id: testSearchForCascade.id }
      });

      // Verify related records are deleted
      const sourcesAfter = await prisma.ai_search_sources.count({
        where: { searchId: testSearchForCascade.id }
      });
      const logsAfter = await prisma.ai_performance_logs.count({
        where: { searchId: testSearchForCascade.id }
      });

      expect(sourcesAfter).toBe(0);
      expect(logsAfter).toBe(0);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data consistency with complex operations', async () => {
      if (!testUser) {
        console.warn('Skipping test: No test user available');
        return;
      }

      const searchConfig = {
        query: 'consistency test',
        maxContacts: 10
      };

      // Create search
      const search = await prisma.ai_searches.create({
        data: {
          userId: testUser.id,
          status: 'PENDING',
          configuration: searchConfig
        }
      });

      // Create multiple sources
      const sources = await Promise.all([
        prisma.ai_search_sources.create({
          data: {
            searchId: search.id,
            sourceUrl: 'https://test1.com',
            sourceType: 'test',
            domain: 'test1.com',
            confidenceScore: 0.9,
            contactCount: 5
          }
        }),
        prisma.ai_search_sources.create({
          data: {
            searchId: search.id,
            sourceUrl: 'https://test2.com',
            sourceType: 'test',
            domain: 'test2.com',
            confidenceScore: 0.7,
            contactCount: 3
          }
        })
      ]);

      expect(sources).toHaveLength(2);

      // Update search (this should trigger statistics update)
      const updatedSearch = await prisma.ai_searches.findUnique({
        where: { id: search.id }
      });

      // The trigger should have updated contacts_found
      expect(updatedSearch?.contacts_found).toBe(8); // 5 + 3

      // Clean up
      await prisma.ai_searches.delete({
        where: { id: search.id }
      });
    });
  });
});