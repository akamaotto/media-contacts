/**
 * AI Search Database Operations Integration Tests
 * Tests the complete database operations for AI search functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { testSetup } from '../config/test-config';

describe('AI Search Database Operations Integration', () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = testSetup.getPrismaClient();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData();
  });

  afterEach(async () => {
    // Wait for any pending operations
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Disconnect from database
    await prisma.$disconnect();
  });

  async function cleanupTestData() {
    // Clean up in order of dependencies
    await prisma.aISearchResult.deleteMany();
    await prisma.aISearch.deleteMany();
    await prisma.contact.deleteMany();
    await prisma.searchQuery.deleteMany();
  }

  describe('Search Query Operations', () => {
    it('should create and retrieve search queries', async () => {
      // Arrange
      const searchQueryData = {
        query: 'AI technology journalists',
        filters: {
          beats: ['technology', 'AI'],
          regions: ['US'],
          countries: ['US'],
          languages: ['English'],
          categories: ['technology']
        },
        userId: testUsers.user.id,
        status: 'active'
      };

      // Act
      const createdQuery = await prisma.searchQuery.create({
        data: {
          ...searchQueryData,
          filters: searchQueryData.filters as any // JSON field
        }
      });

      const retrievedQuery = await prisma.searchQuery.findUnique({
        where: { id: createdQuery.id }
      });

      // Assert
      expect(createdQuery).toBeDefined();
      expect(createdQuery.id).toBeDefined();
      expect(createdQuery.query).toBe(searchQueryData.query);
      expect(createdQuery.userId).toBe(searchQueryData.userId);
      expect(createdQuery.status).toBe(searchQueryData.status);
      expect(createdQuery.createdAt).toBeInstanceOf(Date);
      expect(createdQuery.updatedAt).toBeInstanceOf(Date);

      expect(retrievedQuery).toBeDefined();
      expect(retrievedQuery.id).toBe(createdQuery.id);
      expect(retrievedQuery.query).toBe(searchQueryData.query);
      expect(retrievedQuery.filters).toEqual(searchQueryData.filters);
    });

    it('should update search queries', async () => {
      // Arrange
      const searchQueryData = {
        query: 'initial query',
        filters: { beats: ['technology'] },
        userId: testUsers.user.id,
        status: 'active'
      };

      const createdQuery = await prisma.searchQuery.create({
        data: {
          ...searchQueryData,
          filters: searchQueryData.filters as any
        }
      });

      // Act
      const updatedFilters = {
        beats: ['technology', 'AI'],
        regions: ['US', 'UK']
      };

      const updatedQuery = await prisma.searchQuery.update({
        where: { id: createdQuery.id },
        data: {
          query: 'updated query',
          filters: updatedFilters as any,
          status: 'inactive'
        }
      });

      // Assert
      expect(updatedQuery.id).toBe(createdQuery.id);
      expect(updatedQuery.query).toBe('updated query');
      expect(updatedQuery.filters).toEqual(updatedFilters);
      expect(updatedQuery.status).toBe('inactive');
      expect(updatedQuery.updatedAt.getTime()).toBeGreaterThan(createdQuery.updatedAt.getTime());
    });

    it('should delete search queries', async () => {
      // Arrange
      const searchQueryData = {
        query: 'query to delete',
        filters: {},
        userId: testUsers.user.id,
        status: 'active'
      };

      const createdQuery = await prisma.searchQuery.create({
        data: {
          ...searchQueryData,
          filters: searchQueryData.filters as any
        }
      });

      // Act
      await prisma.searchQuery.delete({
        where: { id: createdQuery.id }
      });

      const deletedQuery = await prisma.searchQuery.findUnique({
        where: { id: createdQuery.id }
      });

      // Assert
      expect(deletedQuery).toBeNull();
    });

    it('should handle complex filter queries', async () => {
      // Arrange
      const complexFilters = {
        beats: ['technology', 'AI', 'innovation'],
        regions: ['US', 'UK', 'Canada'],
        countries: ['US', 'UK', 'CA'],
        languages: ['English', 'Spanish'],
        categories: ['technology', 'science'],
        outletTypes: ['news', 'magazine'],
        domains: ['techcrunch.com', 'wired.com'],
        excludeDomains: ['spam.com'],
        dateRange: {
          from: '2024-01-01',
          to: '2024-12-31'
        },
        safeSearch: true
      };

      // Act
      const createdQuery = await prisma.searchQuery.create({
        data: {
          query: 'complex filter query',
          filters: complexFilters as any,
          userId: testUsers.user.id,
          status: 'active'
        }
      });

      const retrievedQuery = await prisma.searchQuery.findUnique({
        where: { id: createdQuery.id }
      });

      // Assert
      expect(retrievedQuery).toBeDefined();
      expect(retrievedQuery.filters).toEqual(complexFilters);
    });
  });

  describe('AI Search Operations', () => {
    it('should create and retrieve AI searches', async () => {
      // Arrange
      const searchQuery = await prisma.searchQuery.create({
        data: {
          query: 'AI technology journalists',
          filters: { beats: ['technology'] } as any,
          userId: testUsers.user.id,
          status: 'active'
        }
      });

      const aiSearchData = {
        searchId: 'test-search-id-123',
        queryId: searchQuery.id,
        userId: testUsers.user.id,
        status: 'processing',
        progress: 0,
        options: {
          maxResults: 10,
          priority: 'normal',
          includeSummaries: true,
          extractContacts: true,
          scrapeContent: true
        }
      };

      // Act
      const createdSearch = await prisma.aISearch.create({
        data: {
          ...aiSearchData,
          options: aiSearchData.options as any
        }
      });

      const retrievedSearch = await prisma.aISearch.findUnique({
        where: { id: createdSearch.id },
        include: { query: true }
      });

      // Assert
      expect(createdSearch).toBeDefined();
      expect(createdSearch.id).toBeDefined();
      expect(createdSearch.searchId).toBe(aiSearchData.searchId);
      expect(createdSearch.queryId).toBe(searchQuery.id);
      expect(createdSearch.userId).toBe(testUsers.user.id);
      expect(createdSearch.status).toBe(aiSearchData.status);
      expect(createdSearch.progress).toBe(aiSearchData.progress);
      expect(createdSearch.options).toEqual(aiSearchData.options);
      expect(createdSearch.createdAt).toBeInstanceOf(Date);
      expect(createdSearch.updatedAt).toBeInstanceOf(Date);

      expect(retrievedSearch).toBeDefined();
      expect(retrievedSearch.id).toBe(createdSearch.id);
      expect(retrievedSearch.query).toBeDefined();
      expect(retrievedSearch.query.id).toBe(searchQuery.id);
      expect(retrievedSearch.query.query).toBe('AI technology journalists');
    });

    it('should update AI search progress', async () => {
      // Arrange
      const searchQuery = await prisma.searchQuery.create({
        data: {
          query: 'progress test query',
          filters: {},
          userId: testUsers.user.id,
          status: 'active'
        }
      });

      const createdSearch = await prisma.aISearch.create({
        data: {
          searchId: 'progress-test-search',
          queryId: searchQuery.id,
          userId: testUsers.user.id,
          status: 'processing',
          progress: 0,
          options: {} as any
        }
      });

      // Act
      const updatedSearch = await prisma.aISearch.update({
        where: { id: createdSearch.id },
        data: {
          status: 'completed',
          progress: 100,
          completedAt: new Date()
        }
      });

      // Assert
      expect(updatedSearch.id).toBe(createdSearch.id);
      expect(updatedSearch.status).toBe('completed');
      expect(updatedSearch.progress).toBe(100);
      expect(updatedSearch.completedAt).toBeInstanceOf(Date);
      expect(updatedSearch.updatedAt.getTime()).toBeGreaterThan(createdSearch.updatedAt.getTime());
    });

    it('should handle search result associations', async () => {
      // Arrange
      const searchQuery = await prisma.searchQuery.create({
        data: {
          query: 'result association test',
          filters: {},
          userId: testUsers.user.id,
          status: 'active'
        }
      });

      const createdSearch = await prisma.aISearch.create({
        data: {
          searchId: 'result-association-test',
          queryId: searchQuery.id,
          userId: testUsers.user.id,
          status: 'processing',
          progress: 0,
          options: {} as any
        }
      });

      // Act
      const searchResultData = {
        searchId: createdSearch.id,
        url: 'https://example.com/article',
        title: 'Test Article',
        summary: 'Test summary',
        content: 'Test content',
        relevanceScore: 0.95,
        confidence: 0.9,
        metadata: {
          source: 'test',
          wordCount: 500,
          author: 'Test Author'
        }
      };

      const createdResult = await prisma.aISearchResult.create({
        data: {
          ...searchResultData,
          metadata: searchResultData.metadata as any
        }
      });

      const searchWithResults = await prisma.aISearch.findUnique({
        where: { id: createdSearch.id },
        include: { results: true }
      });

      // Assert
      expect(createdResult).toBeDefined();
      expect(createdResult.id).toBeDefined();
      expect(createdResult.searchId).toBe(createdSearch.id);
      expect(createdResult.url).toBe(searchResultData.url);
      expect(createdResult.title).toBe(searchResultData.title);
      expect(createdResult.relevanceScore).toBe(searchResultData.relevanceScore);
      expect(createdResult.confidence).toBe(searchResultData.confidence);
      expect(createdResult.metadata).toEqual(searchResultData.metadata);

      expect(searchWithResults).toBeDefined();
      expect(searchWithResults.results).toHaveLength(1);
      expect(searchWithResults.results[0].id).toBe(createdResult.id);
    });
  });

  describe('Contact Operations', () => {
    it('should create and retrieve contacts', async () => {
      // Arrange
      const contactData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'Technology Journalist',
        organization: 'Tech News Outlet',
        confidence: 0.92,
        location: 'San Francisco, CA',
        beats: ['technology', 'AI'],
        languages: ['English'],
        phone: '+1-555-0123',
        socialMedia: {
          twitter: '@johndoetech',
          linkedin: 'linkedin.com/in/johndoe'
        },
        source: {
          url: 'https://example.com/article',
          title: 'Test Article',
          extractedAt: new Date()
        },
        userId: testUsers.user.id
      };

      // Act
      const createdContact = await prisma.contact.create({
        data: {
          ...contactData,
          beats: contactData.beats as any,
          languages: contactData.languages as any,
          socialMedia: contactData.socialMedia as any,
          source: contactData.source as any
        }
      });

      const retrievedContact = await prisma.contact.findUnique({
        where: { id: createdContact.id }
      });

      // Assert
      expect(createdContact).toBeDefined();
      expect(createdContact.id).toBeDefined();
      expect(createdContact.name).toBe(contactData.name);
      expect(createdContact.email).toBe(contactData.email);
      expect(createdContact.role).toBe(contactData.role);
      expect(createdContact.organization).toBe(contactData.organization);
      expect(createdContact.confidence).toBe(contactData.confidence);
      expect(createdContact.location).toBe(contactData.location);
      expect(createdContact.phone).toBe(contactData.phone);
      expect(createdContact.userId).toBe(testUsers.user.id);
      expect(createdContact.createdAt).toBeInstanceOf(Date);
      expect(createdContact.updatedAt).toBeInstanceOf(Date);

      expect(retrievedContact).toBeDefined();
      expect(retrievedContact.id).toBe(createdContact.id);
      expect(retrievedContact.beats).toEqual(contactData.beats);
      expect(retrievedContact.languages).toEqual(contactData.languages);
      expect(retrievedContact.socialMedia).toEqual(contactData.socialMedia);
      expect(retrievedContact.source).toEqual(contactData.source);
    });

    it('should update contact information', async () => {
      // Arrange
      const contactData = {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'Reporter',
        organization: 'News Outlet',
        confidence: 0.8,
        userId: testUsers.user.id
      };

      const createdContact = await prisma.contact.create({
        data: contactData
      });

      // Act
      const updatedContact = await prisma.contact.update({
        where: { id: createdContact.id },
        data: {
          role: 'Senior Reporter',
          organization: 'Major News Network',
          confidence: 0.95,
          beats: ['technology', 'business'] as any,
          languages: ['English', 'Spanish'] as any
        }
      });

      // Assert
      expect(updatedContact.id).toBe(createdContact.id);
      expect(updatedContact.role).toBe('Senior Reporter');
      expect(updatedContact.organization).toBe('Major News Network');
      expect(updatedContact.confidence).toBe(0.95);
      expect(updatedContact.beats).toEqual(['technology', 'business']);
      expect(updatedContact.languages).toEqual(['English', 'Spanish']);
      expect(updatedContact.updatedAt.getTime()).toBeGreaterThan(createdContact.updatedAt.getTime());
    });

    it('should handle contact search and filtering', async () => {
      // Arrange
      const contacts = [
        {
          name: 'Tech Reporter 1',
          email: 'tech1@example.com',
          role: 'Technology Reporter',
          organization: 'Tech News',
          beats: ['technology'] as any,
          languages: ['English'] as any,
          confidence: 0.9,
          userId: testUsers.user.id
        },
        {
          name: 'Business Reporter 1',
          email: 'business1@example.com',
          role: 'Business Reporter',
          organization: 'Business News',
          beats: ['business'] as any,
          languages: ['English'] as any,
          confidence: 0.85,
          userId: testUsers.user.id
        },
        {
          name: 'Tech Reporter 2',
          email: 'tech2@example.com',
          role: 'Technology Reporter',
          organization: 'Tech Magazine',
          beats: ['technology', 'AI'] as any,
          languages: ['English', 'Spanish'] as any,
          confidence: 0.92,
          userId: testUsers.user.id
        }
      ];

      await prisma.contact.createMany({ data: contacts });

      // Act
      const techContacts = await prisma.contact.findMany({
        where: {
          userId: testUsers.user.id,
          beats: {
            has: 'technology'
          }
        }
      });

      const highConfidenceContacts = await prisma.contact.findMany({
        where: {
          userId: testUsers.user.id,
          confidence: {
            gte: 0.9
          }
        }
      });

      // Assert
      expect(techContacts).toHaveLength(2);
      expect(techContacts.map(c => c.name)).toEqual(
        expect.arrayContaining(['Tech Reporter 1', 'Tech Reporter 2'])
      );

      expect(highConfidenceContacts).toHaveLength(2);
      expect(highConfidenceContacts.map(c => c.name)).toEqual(
        expect.arrayContaining(['Tech Reporter 1', 'Tech Reporter 2'])
      );
    });
  });

  describe('Transaction Management', () => {
    it('should handle complex transactions with multiple operations', async () => {
      // Arrange
      const searchQueryData = {
        query: 'transaction test query',
        filters: { beats: ['technology'] } as any,
        userId: testUsers.user.id,
        status: 'active'
      };

      // Act
      const result = await prisma.$transaction(async (tx) => {
        // Create search query
        const searchQuery = await tx.searchQuery.create({
          data: searchQueryData
        });

        // Create AI search
        const aiSearch = await tx.aISearch.create({
          data: {
            searchId: 'transaction-test-search',
            queryId: searchQuery.id,
            userId: testUsers.user.id,
            status: 'processing',
            progress: 0,
            options: {} as any
          }
        });

        // Create search result
        const searchResult = await tx.aISearchResult.create({
          data: {
            searchId: aiSearch.id,
            url: 'https://example.com/article',
            title: 'Transaction Test Article',
            summary: 'Test summary',
            relevanceScore: 0.9,
            confidence: 0.85,
            metadata: {} as any
          }
        });

        // Create contact
        const contact = await tx.contact.create({
          data: {
            name: 'Transaction Test Contact',
            email: 'transaction@example.com',
            role: 'Test Reporter',
            organization: 'Test News',
            confidence: 0.88,
            userId: testUsers.user.id
          }
        });

        return {
          searchQuery,
          aiSearch,
          searchResult,
          contact
        };
      });

      // Assert
      expect(result.searchQuery).toBeDefined();
      expect(result.searchQuery.id).toBeDefined();
      expect(result.searchQuery.query).toBe(searchQueryData.query);

      expect(result.aiSearch).toBeDefined();
      expect(result.aiSearch.id).toBeDefined();
      expect(result.aiSearch.queryId).toBe(result.searchQuery.id);

      expect(result.searchResult).toBeDefined();
      expect(result.searchResult.id).toBeDefined();
      expect(result.searchResult.searchId).toBe(result.aiSearch.id);

      expect(result.contact).toBeDefined();
      expect(result.contact.id).toBeDefined();
      expect(result.contact.name).toBe('Transaction Test Contact');

      // Verify all records were created
      const verifySearchQuery = await prisma.searchQuery.findUnique({
        where: { id: result.searchQuery.id }
      });
      expect(verifySearchQuery).toBeDefined();

      const verifyAISearch = await prisma.aISearch.findUnique({
        where: { id: result.aiSearch.id }
      });
      expect(verifyAISearch).toBeDefined();

      const verifySearchResult = await prisma.aISearchResult.findUnique({
        where: { id: result.searchResult.id }
      });
      expect(verifySearchResult).toBeDefined();

      const verifyContact = await prisma.contact.findUnique({
        where: { id: result.contact.id }
      });
      expect(verifyContact).toBeDefined();
    });

    it('should rollback transactions on errors', async () => {
      // Arrange
      const initialContactCount = await prisma.contact.count({
        where: { userId: testUsers.user.id }
      });

      // Act
      try {
        await prisma.$transaction(async (tx) => {
          // Create a contact
          await tx.contact.create({
            data: {
              name: 'Rollback Test Contact',
              email: 'rollback@example.com',
              role: 'Test Reporter',
              organization: 'Test News',
              confidence: 0.88,
              userId: testUsers.user.id
            }
          });

          // Force an error
          throw new Error('Intentional error for rollback test');
        });
      } catch (error) {
        // Expected error
      }

      // Assert
      const finalContactCount = await prisma.contact.count({
        where: { userId: testUsers.user.id }
      });
      expect(finalContactCount).toBe(initialContactCount);

      const rollbackContact = await prisma.contact.findFirst({
        where: {
          name: 'Rollback Test Contact',
          userId: testUsers.user.id
        }
      });
      expect(rollbackContact).toBeNull();
    });

    it('should handle concurrent transactions safely', async () => {
      // Arrange
      const concurrentOperations = Array.from({ length: 5 }, (_, i) =>
        prisma.$transaction(async (tx) => {
          const searchQuery = await tx.searchQuery.create({
            data: {
              query: `concurrent test query ${i}`,
              filters: {},
              userId: testUsers.user.id,
              status: 'active'
            }
          });

          const aiSearch = await tx.aISearch.create({
            data: {
              searchId: `concurrent-test-search-${i}`,
              queryId: searchQuery.id,
              userId: testUsers.user.id,
              status: 'processing',
              progress: 0,
              options: {} as any
            }
          });

          return { searchQuery, aiSearch };
        })
      );

      // Act
      const startTime = Date.now();
      const results = await Promise.all(concurrentOperations);
      const endTime = Date.now();

      // Assert
      expect(results).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete quickly

      // Verify all records were created
      for (const result of results) {
        const verifySearchQuery = await prisma.searchQuery.findUnique({
          where: { id: result.searchQuery.id }
        });
        expect(verifySearchQuery).toBeDefined();

        const verifyAISearch = await prisma.aISearch.findUnique({
          where: { id: result.aiSearch.id }
        });
        expect(verifyAISearch).toBeDefined();
      }
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain referential integrity', async () => {
      // Arrange
      const nonExistentQueryId = 'non-existent-query-id';

      // Act & Assert
      await expect(
        prisma.aISearch.create({
          data: {
            searchId: 'integrity-test-search',
            queryId: nonExistentQueryId,
            userId: testUsers.user.id,
            status: 'processing',
            progress: 0,
            options: {} as any
          }
        })
      ).rejects.toThrow();

      await expect(
        prisma.aISearchResult.create({
          data: {
            searchId: 'non-existent-search-id',
            url: 'https://example.com/article',
            title: 'Test Article',
            summary: 'Test summary',
            relevanceScore: 0.9,
            confidence: 0.85,
            metadata: {} as any
          }
        })
      ).rejects.toThrow();
    });

    it('should handle cascade operations correctly', async () => {
      // Arrange
      const searchQuery = await prisma.searchQuery.create({
        data: {
          query: 'cascade test query',
          filters: {},
          userId: testUsers.user.id,
          status: 'active'
        }
      });

      const aiSearch = await prisma.aISearch.create({
        data: {
          searchId: 'cascade-test-search',
          queryId: searchQuery.id,
          userId: testUsers.user.id,
          status: 'processing',
          progress: 0,
          options: {} as any
        }
      });

      await prisma.aISearchResult.create({
        data: {
          searchId: aiSearch.id,
          url: 'https://example.com/article',
          title: 'Cascade Test Article',
          summary: 'Test summary',
          relevanceScore: 0.9,
          confidence: 0.85,
          metadata: {} as any
        }
      });

      // Act
      await prisma.aISearch.delete({
        where: { id: aiSearch.id }
      });

      // Assert
      const deletedSearch = await prisma.aISearch.findUnique({
        where: { id: aiSearch.id }
      });
      expect(deletedSearch).toBeNull();

      const orphanedResult = await prisma.aISearchResult.findFirst({
        where: { searchId: aiSearch.id }
      });
      expect(orphanedResult).toBeNull();

      const remainingQuery = await prisma.searchQuery.findUnique({
        where: { id: searchQuery.id }
      });
      expect(remainingQuery).toBeDefined(); // Query should remain
    });

    it('should enforce unique constraints', async () => {
      // Arrange
      const searchId = 'unique-constraint-test-search';

      await prisma.aISearch.create({
        data: {
          searchId,
          queryId: 'test-query-id',
          userId: testUsers.user.id,
          status: 'processing',
          progress: 0,
          options: {} as any
        }
      });

      // Act & Assert
      await expect(
        prisma.aISearch.create({
          data: {
            searchId, // Same searchId
            queryId: 'another-test-query-id',
            userId: testUsers.user.id,
            status: 'processing',
            progress: 0,
            options: {} as any
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      // Arrange
      const largeDatasetSize = 100;
      const contacts = Array.from({ length: largeDatasetSize }, (_, i) => ({
        name: `Contact ${i}`,
        email: `contact${i}@example.com`,
        role: 'Reporter',
        organization: `News Outlet ${i % 10}`,
        confidence: 0.8 + (i % 20) * 0.01,
        beats: ['technology'] as any,
        languages: ['English'] as any,
        userId: testUsers.user.id
      }));

      // Act
      const startTime = Date.now();
      await prisma.contact.createMany({ data: contacts });
      const insertTime = Date.now() - startTime;

      const queryStartTime = Date.now();
      const retrievedContacts = await prisma.contact.findMany({
        where: {
          userId: testUsers.user.id,
          confidence: {
            gte: 0.9
          }
        },
        take: 50
      });
      const queryTime = Date.now() - queryStartTime;

      // Assert
      expect(insertTime).toBeLessThan(5000); // Should insert quickly
      expect(queryTime).toBeLessThan(1000); // Should query quickly
      expect(retrievedContacts.length).toBeGreaterThan(0);
    });

    it('should handle complex queries efficiently', async () => {
      // Arrange
      // Create test data
      const searchQueries = Array.from({ length: 20 }, (_, i) => ({
        query: `Test query ${i}`,
        filters: {
          beats: ['technology', 'business'][i % 2],
          regions: ['US', 'UK'][i % 2]
        } as any,
        userId: testUsers.user.id,
        status: 'active'
      }));

      const createdQueries = await prisma.searchQuery.createMany({
        data: searchQueries
      });

      const aiSearches = await Promise.all(
        searchQueries.map((query, i) =>
          prisma.aISearch.create({
            data: {
              searchId: `complex-query-search-${i}`,
              queryId: (createdQueries as any).count + i, // Approximate ID
              userId: testUsers.user.id,
              status: 'completed',
              progress: 100,
              options: {} as any
            }
          })
        )
      );

      // Act
      const startTime = Date.now();
      const complexQueryResults = await prisma.aISearch.findMany({
        where: {
          userId: testUsers.user.id,
          status: 'completed',
          query: {
            filters: {
              path: ['beats'],
              equals: 'technology'
            }
          }
        },
        include: {
          query: true,
          results: {
            take: 5
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        take: 10
      });
      const queryTime = Date.now() - startTime;

      // Assert
      expect(queryTime).toBeLessThan(2000); // Should complete quickly
      expect(complexQueryResults.length).toBeGreaterThan(0);
    });
  });
});