/**
 * Database Integration Tests for AI Search Operations
 * Tests the integration between AI search functionality and database operations
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { IntegrationTestSetup } from '../config/test-config';

describe('Database Integration Tests for AI Search Operations', () => {
  let testSetup: IntegrationTestSetup;
  let prisma: PrismaClient;

  beforeAll(async () => {
    testSetup = new IntegrationTestSetup();
    await testSetup.setupDatabase();
    prisma = testSetup.getPrismaClient();
  }, 60000);

  afterAll(async () => {
    await testSetup.teardownDatabase();
  }, 30000);

  beforeEach(async () => {
    // Clean up test data before each test
    await prisma.mediaContact.deleteMany();
    await prisma.outlet.deleteMany();
    await prisma.activityLog.deleteMany();
  });

  describe('AI Query Templates Database Operations', () => {
    it('should create and retrieve AI query templates', async () => {
      // Arrange
      const templateData = {
        name: 'Technology Journalists Template',
        description: 'Template for finding technology journalists',
        category: 'technology',
        template: '{{beat}} journalists in {{region}} covering {{topic}}',
        parameters: ['beat', 'region', 'topic'],
        examples: [
          'technology journalists in US covering AI',
          'business reporters in Europe covering startups'
        ],
        isActive: true,
        priority: 1
      };

      // Act
      const createdTemplate = await prisma.aI_query_templates.create({
        data: templateData
      });

      const retrievedTemplate = await prisma.aI_query_templates.findUnique({
        where: { id: createdTemplate.id }
      });

      // Assert
      expect(retrievedTemplate).not.toBeNull();
      expect(retrievedTemplate!.name).toBe(templateData.name);
      expect(retrievedTemplate!.template).toBe(templateData.template);
      expect(retrievedTemplate!.parameters).toEqual(templateData.parameters);
      expect(retrievedTemplate!.isActive).toBe(true);
      expect(retrievedTemplate).toBeValidDatabaseRecord();
    });

    it('should update AI query templates', async () => {
      // Arrange
      const template = await prisma.aI_query_templates.create({
        data: {
          name: 'Test Template',
          description: 'Test description',
          category: 'test',
          template: 'test template',
          parameters: ['param1'],
          isActive: true
        }
      });

      // Act
      const updatedTemplate = await prisma.aI_query_templates.update({
        where: { id: template.id },
        data: {
          name: 'Updated Test Template',
          description: 'Updated description',
          isActive: false,
          priority: 5
        }
      });

      // Assert
      expect(updatedTemplate.name).toBe('Updated Test Template');
      expect(updatedTemplate.description).toBe('Updated description');
      expect(updatedTemplate.isActive).toBe(false);
      expect(updatedTemplate.priority).toBe(5);
      expect(updatedTemplate.updatedAt).not.toEqual(template.updatedAt);
    });

    it('should query templates with filters', async () => {
      // Arrange
      await prisma.aI_query_templates.createMany({
        data: [
          {
            name: 'Tech Template 1',
            description: 'Technology template',
            category: 'technology',
            template: 'tech template 1',
            parameters: ['beat'],
            isActive: true,
            priority: 1
          },
          {
            name: 'Tech Template 2',
            description: 'Another technology template',
            category: 'technology',
            template: 'tech template 2',
            parameters: ['region'],
            isActive: true,
            priority: 2
          },
          {
            name: 'Inactive Template',
            description: 'Inactive template',
            category: 'business',
            template: 'inactive template',
            parameters: ['topic'],
            isActive: false,
            priority: 3
          }
        ]
      });

      // Act
      const activeTechTemplates = await prisma.aI_query_templates.findMany({
        where: {
          category: 'technology',
          isActive: true
        },
        orderBy: {
          priority: 'asc'
        }
      });

      // Assert
      expect(activeTechTemplates).toHaveLength(2);
      expect(activeTechTemplates[0].name).toBe('Tech Template 1');
      expect(activeTechTemplates[1].name).toBe('Tech Template 2');
      expect(activeTechTemplates.every(t => t.category === 'technology')).toBe(true);
      expect(activeTechTemplates.every(t => t.isActive)).toBe(true);
    });
  });

  describe('AI Generated Queries Database Operations', () => {
    let templateId: string;

    beforeEach(async () => {
      const template = await prisma.aI_query_templates.create({
        data: {
          name: 'Test Template',
          description: 'Test template for generated queries',
          category: 'test',
          template: 'test template for {{topic}}',
          parameters: ['topic'],
          isActive: true
        }
      });
      templateId = template.id;
    });

    it('should store and retrieve AI generated queries', async () => {
      // Arrange
      const generatedQueryData = {
        query: 'AI technology journalists in United States',
        type: 'ENHANCED',
        templateId: templateId,
        userId: 'test-user-id',
        originalInput: 'AI journalists',
        scores: {
          relevance: 0.95,
          diversity: 0.80,
          coverage: 0.90,
          overall: 0.88
        },
        metadata: {
          aiModel: 'gpt-4',
          tokensUsed: 150,
          processingTime: 850,
          enhanced: true
        }
      };

      // Act
      const createdQuery = await prisma.aI_generated_queries.create({
        data: generatedQueryData
      });

      const retrievedQuery = await prisma.aI_generated_queries.findUnique({
        where: { id: createdQuery.id },
        include: {
          template: true
        }
      });

      // Assert
      expect(retrievedQuery).not.toBeNull();
      expect(retrievedQuery!.query).toBe(generatedQueryData.query);
      expect(retrievedQuery!.type).toBe(generatedQueryData.type);
      expect(retrievedQuery!.templateId).toBe(templateId);
      expect(retrievedQuery!.template).not.toBeNull();
      expect(retrievedQuery!.template!.name).toBe('Test Template');
      expect(retrievedQuery!.scores).toEqual(generatedQueryData.scores);
      expect(retrievedQuery!.metadata).toEqual(generatedQueryData.metadata);
      expect(retrievedQuery).toBeValidDatabaseRecord();
    });

    it('should track query performance metrics', async () => {
      // Arrange
      const query = await prisma.aI_generated_queries.create({
        data: {
          query: 'test query for performance tracking',
          type: 'TEMPLATE',
          templateId: templateId,
          userId: 'test-user-id',
          scores: {
            relevance: 0.85,
            diversity: 0.75,
            coverage: 0.80,
            overall: 0.80
          }
        }
      });

      const performanceData = {
        queryId: query.id,
        searchResultsCount: 15,
        successfulExtractions: 8,
        averageConfidence: 0.87,
        processingTime: 1200,
        timestamp: new Date()
      };

      // Act
      const performanceLog = await prisma.aI_query_performance_logs.create({
        data: performanceData
      });

      // Assert
      expect(performanceLog.queryId).toBe(query.id);
      expect(performanceLog.searchResultsCount).toBe(15);
      expect(performanceLog.successfulExtractions).toBe(8);
      expect(performanceLog.averageConfidence).toBe(0.87);
      expect(performanceLog.processingTime).toBe(1200);
      expect(performanceLog).toBeValidDatabaseRecord();
    });

    it('should query generated queries with performance data', async () => {
      // Arrange
      const query1 = await prisma.aI_generated_queries.create({
        data: {
          query: 'high performing query',
          type: 'ENHANCED',
          templateId: templateId,
          userId: 'test-user-id',
          scores: { relevance: 0.9, diversity: 0.8, coverage: 0.85, overall: 0.85 }
        }
      });

      const query2 = await prisma.aI_generated_queries.create({
        data: {
          query: 'low performing query',
          type: 'TEMPLATE',
          templateId: templateId,
          userId: 'test-user-id',
          scores: { relevance: 0.7, diversity: 0.6, coverage: 0.65, overall: 0.65 }
        }
      });

      await prisma.aI_query_performance_logs.createMany({
        data: [
          {
            queryId: query1.id,
            searchResultsCount: 25,
            successfulExtractions: 20,
            averageConfidence: 0.92,
            processingTime: 800
          },
          {
            queryId: query2.id,
            searchResultsCount: 5,
            successfulExtractions: 2,
            averageConfidence: 0.68,
            processingTime: 1500
          }
        ]
      });

      // Act
      const queriesWithPerformance = await prisma.aI_generated_queries.findMany({
        include: {
          performanceLogs: true,
          template: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Assert
      expect(queriesWithPerformance).toHaveLength(2);

      const highPerformer = queriesWithPerformance.find(q => q.query === 'high performing query');
      const lowPerformer = queriesWithPerformance.find(q => q.query === 'low performing query');

      expect(highPerformer?.performanceLogs).toHaveLength(1);
      expect(highPerformer?.performanceLogs[0].searchResultsCount).toBe(25);
      expect(highPerformer?.performanceLogs[0].averageConfidence).toBe(0.92);

      expect(lowPerformer?.performanceLogs).toHaveLength(1);
      expect(lowPerformer?.performanceLogs[0].searchResultsCount).toBe(5);
      expect(lowPerformer?.performanceLogs[0].averageConfidence).toBe(0.68);
    });
  });

  describe('Media Contact Import Operations', () => {
    it('should import AI-extracted contacts to database', async () => {
      // Arrange
      const outlet = await prisma.outlet.create({
        data: {
          name: 'Tech News Outlet',
          domain: 'technews.example.com',
          description: 'Leading technology news source'
        }
      });

      const country = await prisma.country.findFirst({ where: { code: 'US' } });
      const language = await prisma.language.findFirst({ where: { code: 'en' } });
      const beat = await prisma.beat.findFirst({ where: { slug: 'technology' } });

      const contactData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@technews.example.com',
        title: 'Technology Journalist',
        outletId: outlet.id,
        phone: '+1-555-0123',
        bio: 'Experienced technology journalist covering AI and machine learning',
        countryId: country?.id,
        languageId: language?.id,
        confidence: 0.92,
        source: 'ai-extraction',
        sourceUrl: 'https://technews.example.com/article1',
        extractedAt: new Date(),
        userId: 'test-user-id'
      };

      // Act
      const createdContact = await prisma.mediaContact.create({
        data: contactData,
        include: {
          outlet: true,
          country: true,
          language: true,
          beats: {
            connect: [{ id: beat?.id }]
          }
        }
      });

      const retrievedContact = await prisma.mediaContact.findUnique({
        where: { id: createdContact.id },
        include: {
          outlet: true,
          country: true,
          language: true,
          beats: true
        }
      });

      // Assert
      expect(retrievedContact).not.toBeNull();
      expect(retrievedContact!.firstName).toBe('John');
      expect(retrievedContact!.lastName).toBe('Doe');
      expect(retrievedContact!.email).toBe('john.doe@technews.example.com');
      expect(retrievedContact!.confidence).toBe(0.92);
      expect(retrievedContact!.source).toBe('ai-extraction');
      expect(retrievedContact!.outlet.name).toBe('Tech News Outlet');
      expect(retrievedContact!.country?.code).toBe('US');
      expect(retrievedContact!.language?.code).toBe('en');
      expect(retrievedContact!.beats).toHaveLength(1);
      expect(retrievedContact!.beats[0].slug).toBe('technology');
      expect(retrievedContact).toBeValidDatabaseRecord();
    });

    it('should handle duplicate contact detection', async () => {
      // Arrange
      const existingContact = await prisma.mediaContact.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          confidence: 0.85,
          source: 'ai-extraction',
          userId: 'test-user-id'
        }
      });

      // Act
      const duplicateByEmail = await prisma.mediaContact.findFirst({
        where: { email: 'jane.smith@example.com' }
      });

      // Assert
      expect(duplicateByEmail).not.toBeNull();
      expect(duplicateByEmail!.id).toBe(existingContact.id);
      expect(duplicateByEmail!.email).toBe(existingContact.email);
    });

    it('should log import activities', async () => {
      // Arrange
      const activityData = {
        userId: 'test-user-id',
        action: 'AI_CONTACTS_IMPORTED',
        entityType: 'bulk_import',
        entityId: 'search-session-123',
        details: {
          searchId: 'search-123',
          source: 'ai-search',
          totalContacts: 10,
          importedCount: 8,
          failedCount: 2,
          errors: ['Duplicate contact: john@example.com'],
          processingTime: 2500,
          averageConfidence: 0.87
        }
      };

      // Act
      const createdActivity = await prisma.activityLog.create({
        data: activityData
      });

      const retrievedActivity = await prisma.activityLog.findUnique({
        where: { id: createdActivity.id }
      });

      // Assert
      expect(retrievedActivity).not.toBeNull();
      expect(retrievedActivity!.userId).toBe('test-user-id');
      expect(retrievedActivity!.action).toBe('AI_CONTACTS_IMPORTED');
      expect(retrievedActivity!.entityType).toBe('bulk_import');
      expect(retrievedActivity!.entityId).toBe('search-session-123');
      expect(retrievedActivity!.details).toEqual(activityData.details);
      expect(retrievedActivity).toBeValidDatabaseRecord();
    });
  });

  describe('Search Results Storage and Retrieval', () => {
    it('should store search session data', async () => {
      // Arrange
      const searchSessionData = {
        userId: 'test-user-id',
        query: 'AI technology journalists',
        filters: {
          beats: ['technology', 'AI'],
          regions: ['US'],
          languages: ['English']
        },
        options: {
          maxResults: 10,
          includeSummaries: true,
          extractContacts: true
        },
        status: 'completed',
        resultsCount: 8,
        extractedContacts: 6,
        processingTime: 3200,
        metadata: {
          searchEngine: 'exa',
          aiEnhanced: true,
          timestamp: new Date().toISOString()
        }
      };

      // Act
      const searchSession = await prisma.activityLog.create({
        data: {
          userId: searchSessionData.userId,
          action: 'AI_SEARCH_COMPLETED',
          entityType: 'ai_search',
          entityId: `search-${Date.now()}`,
          details: searchSessionData
        }
      });

      // Assert
      expect(searchSession.id).toBeDefined();
      expect(searchSession.action).toBe('AI_SEARCH_COMPLETED');
      expect(searchSession.details).toEqual(searchSessionData);
      expect(searchSession).toBeValidDatabaseRecord();
    });

    it('should retrieve search history for user', async () => {
      // Arrange
      const userId = 'test-user-id';

      await prisma.activityLog.createMany({
        data: [
          {
            userId,
            action: 'AI_SEARCH_COMPLETED',
            entityType: 'ai_search',
            entityId: 'search-1',
            details: { query: 'AI journalists', resultsCount: 5 },
            createdAt: new Date('2024-01-15T10:00:00Z')
          },
          {
            userId,
            action: 'AI_CONTACTS_IMPORTED',
            entityType: 'bulk_import',
            entityId: 'import-1',
            details: { importedCount: 3 },
            createdAt: new Date('2024-01-15T10:30:00Z')
          },
          {
            userId,
            action: 'AI_SEARCH_COMPLETED',
            entityType: 'ai_search',
            entityId: 'search-2',
            details: { query: 'tech reporters', resultsCount: 8 },
            createdAt: new Date('2024-01-15T11:00:00Z')
          }
        ]
      });

      // Act
      const searchHistory = await prisma.activityLog.findMany({
        where: {
          userId,
          action: 'AI_SEARCH_COMPLETED'
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Assert
      expect(searchHistory).toHaveLength(2);
      expect(searchHistory[0].details.query).toBe('tech reporters');
      expect(searchHistory[1].details.query).toBe('AI journalists');
      expect(searchHistory[0].createdAt.getTime()).toBeGreaterThan(
        searchHistory[1].createdAt.getTime()
      );
    });
  });

  describe('Database Transaction Tests', () => {
    it('should handle contact import with transactions', async () => {
      // Arrange
      const outlet = await prisma.outlet.create({
        data: { name: 'Test Outlet', domain: 'test.example.com' }
      });

      const contactsData = [
        {
          firstName: 'Contact1',
          lastName: 'Test',
          email: 'contact1@test.com',
          outletId: outlet.id,
          confidence: 0.85,
          source: 'ai-extraction',
          userId: 'test-user-id'
        },
        {
          firstName: 'Contact2',
          lastName: 'Test',
          email: 'contact2@test.com',
          outletId: outlet.id,
          confidence: 0.90,
          source: 'ai-extraction',
          userId: 'test-user-id'
        }
      ];

      // Act
      const result = await prisma.$transaction(async (tx) => {
        const contacts = await Promise.all(
          contactsData.map(contactData =>
            tx.mediaContact.create({ data: contactData })
          )
        );

        const activityLog = await tx.activityLog.create({
          data: {
            userId: 'test-user-id',
            action: 'AI_CONTACTS_IMPORTED',
            entityType: 'bulk_import',
            entityId: 'transaction-test',
            details: {
              importedCount: contacts.length,
              averageConfidence: contacts.reduce((sum, c) => sum + c.confidence, 0) / contacts.length
            }
          }
        });

        return { contacts, activityLog };
      });

      // Assert
      expect(result.contacts).toHaveLength(2);
      expect(result.activityLog.details.importedCount).toBe(2);
      expect(result.activityLog.details.averageConfidence).toBe(0.875);

      // Verify all data was committed
      const finalContacts = await prisma.mediaContact.findMany({
        where: { outletId: outlet.id }
      });
      expect(finalContacts).toHaveLength(2);
    });

    it('should rollback on transaction failure', async () => {
      // Arrange
      const outlet = await prisma.outlet.create({
        data: { name: 'Test Outlet', domain: 'test.example.com' }
      });

      const initialContactCount = await prisma.mediaContact.count();

      // Act & Assert
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.mediaContact.create({
            data: {
              firstName: 'Valid',
              lastName: 'Contact',
              email: 'valid@test.com',
              outletId: outlet.id,
              confidence: 0.85,
              source: 'ai-extraction',
              userId: 'test-user-id'
            }
          });

          // This should cause a transaction rollback
          await tx.mediaContact.create({
            data: {
              firstName: 'Invalid',
              lastName: 'Contact',
              email: '', // Invalid empty email
              outletId: outlet.id,
              confidence: 0.85,
              source: 'ai-extraction',
              userId: 'test-user-id'
            }
          });
        })
      ).rejects.toThrow();

      // Verify rollback occurred
      const finalContactCount = await prisma.mediaContact.count();
      expect(finalContactCount).toBe(initialContactCount);
    });
  });

  describe('Performance and Scaling Tests', () => {
    it('should handle bulk contact creation efficiently', async () => {
      // Arrange
      const outlet = await prisma.outlet.create({
        data: { name: 'Bulk Test Outlet', domain: 'bulk.example.com' }
      });

      const country = await prisma.country.findFirst({ where: { code: 'US' } });
      const beat = await prisma.beat.findFirst({ where: { slug: 'technology' } });

      const contactsData = Array.from({ length: 100 }, (_, i) => ({
        firstName: `Contact${i}`,
        lastName: 'Test',
        email: `contact${i}@bulktest.com`,
        title: `Journalist ${i}`,
        outletId: outlet.id,
        countryId: country?.id,
        confidence: 0.8 + (Math.random() * 0.2), // 0.8 to 1.0
        source: 'ai-extraction',
        sourceUrl: `https://bulktest.com/article${i}`,
        userId: 'test-user-id'
      }));

      // Act
      const startTime = Date.now();

      const createdContacts = await prisma.mediaContact.createMany({
        data: contactsData,
        skipDuplicates: true
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(createdContacts.count).toBe(100);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify data integrity
      const retrievedContacts = await prisma.mediaContact.findMany({
        where: { outletId: outlet.id },
        take: 10
      });

      expect(retrievedContacts).toHaveLength(10);
      retrievedContacts.forEach(contact => {
        expect(contact.email).toMatch(/contact\d+@bulktest\.com/);
        expect(contact.confidence).toBeGreaterThanOrEqual(0.8);
        expect(contact.source).toBe('ai-extraction');
      });
    });

    it('should efficiently query with complex filters', async () => {
      // Arrange
      const outlet = await prisma.outlet.create({
        data: { name: 'Performance Test Outlet', domain: 'perf.example.com' }
      });

      const countries = await prisma.country.findMany({ take: 3 });
      const beats = await prisma.beat.findMany({ take: 3 });

      // Create test data with various combinations
      const contactsData = [];
      for (let i = 0; i < 50; i++) {
        contactsData.push({
          firstName: `Perf${i}`,
          lastName: 'Test',
          email: `perf${i}@test.com`,
          title: 'Journalist',
          outletId: outlet.id,
          countryId: countries[i % countries.length]?.id,
          confidence: 0.5 + (Math.random() * 0.5),
          source: 'ai-extraction',
          userId: 'test-user-id'
        });
      }

      await prisma.mediaContact.createMany({ data: contactsData });

      // Act
      const startTime = Date.now();

      const queryResults = await prisma.mediaContact.findMany({
        where: {
          outletId: outlet.id,
          confidence: { gte: 0.7 },
          countryId: { in: countries.map(c => c.id) }
        },
        include: {
          country: true,
          beats: {
            where: { id: { in: beats.map(b => b.id) } }
          }
        },
        orderBy: [
          { confidence: 'desc' },
          { firstName: 'asc' }
        ],
        take: 20
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(queryResults.length).toBeGreaterThan(0);
      expect(queryResults.length).toBeLessThanOrEqual(20);

      queryResults.forEach(contact => {
        expect(contact.confidence).toBeGreaterThanOrEqual(0.7);
        expect(countries.map(c => c.id)).toContain(contact.countryId);
      });
    });
  });
});