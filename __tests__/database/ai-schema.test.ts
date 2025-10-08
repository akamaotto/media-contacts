import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

describe('AI Database Schema', () => {
  beforeAll(async () => {
    // Ensure database is in clean state for tests
    // Note: In a real environment, you might use a test database
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('ai_searches table', () => {
    it('should create table with correct structure', async () => {
      const columnInfo = await prisma.$queryRaw<Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string;
      }>>`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'ai_searches'
        ORDER BY ordinal_position
      `;

      expect(columnInfo).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            column_name: 'id',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'userId',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'status',
            data_type: 'USER-DEFINED',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'configuration',
            data_type: 'jsonb',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'contacts_found',
            data_type: 'integer',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'contacts_imported',
            data_type: 'integer',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'duration_seconds',
            data_type: 'integer',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'started_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'completed_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'created_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'updated_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO'
          })
        ])
      );
    });

    it('should enforce unique constraint on userId + status', async () => {
      // Create a test user
      const testUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (!testUser) {
        console.warn('No test user found for RLS tests');
        return;
      }

      // Try to create two searches with same userId and status
      const searchConfig = {
        query: 'test query',
        filters: { country: 'US' },
        maxContacts: 10
      };

      const search1 = await prisma.ai_searches.create({
        data: {
          userId: testUser.id,
          status: 'PENDING',
          configuration: searchConfig
        }
      });

      expect(search1.id).toBeDefined();
      expect(search1.userId).toBe(testUser.id);
      expect(search1.status).toBe('PENDING');

      // This should fail due to unique constraint
      await expect(
        prisma.ai_searches.create({
          data: {
            userId: testUser.id,
            status: 'PENDING',
            configuration: searchConfig
          }
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.ai_searches.delete({
        where: { id: search1.id }
      });
    });

    it('should enforce foreign key constraints', async () => {
      const searchConfig = {
        query: 'test query',
        filters: { country: 'US' },
        maxContacts: 10
      };

      // This should fail due to non-existent user
      await expect(
        prisma.ai_searches.create({
          data: {
            userId: 'non-existent-user-id',
            status: 'PENDING',
            configuration: searchConfig
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('ai_search_sources table', () => {
    it('should create table with correct structure', async () => {
      const columnInfo = await prisma.$queryRaw<Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>>`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'ai_search_sources'
        ORDER BY ordinal_position
      `;

      expect(columnInfo).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            column_name: 'id',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'searchId',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'sourceUrl',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'sourceType',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'domain',
            data_type: 'text',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'title',
            data_type: 'text',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'confidenceScore',
            data_type: 'numeric',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'contactCount',
            data_type: 'integer',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'processingTimeMs',
            data_type: 'integer',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'created_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO'
          })
        ])
      );
    });

    it('should enforce foreign key relationship with ai_searches', async () => {
      const sourceData = {
        sourceUrl: 'https://example.com',
        sourceType: 'media_outlet',
        domain: 'example.com',
        title: 'Example Source',
        confidenceScore: 0.85,
        contactCount: 5,
        processingTimeMs: 1200
      };

      // This should fail due to non-existent search
      await expect(
        prisma.ai_search_sources.create({
          data: {
            searchId: 'non-existent-search-id',
            ...sourceData
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('ai_performance_logs table', () => {
    it('should create table with correct structure', async () => {
      const columnInfo = await prisma.$queryRaw<Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>>`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'ai_performance_logs'
        ORDER BY ordinal_position
      `;

      expect(columnInfo).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            column_name: 'id',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'searchId',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'operation',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'startTime',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'endTime',
            data_type: 'timestamp without time zone',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'durationMs',
            data_type: 'integer',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'status',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'metadata',
            data_type: 'jsonb',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'created_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO'
          })
        ])
      );
    });
  });

  describe('ai_search_cache table', () => {
    it('should create table with correct structure', async () => {
      const columnInfo = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'ai_search_cache'
        ORDER BY ordinal_position
      ` as Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>;

      expect(columnInfo).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            column_name: 'id',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'queryHash',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'searchConfiguration',
            data_type: 'jsonb',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'results',
            data_type: 'jsonb',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'contactCount',
            data_type: 'integer',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'averageConfidence',
            data_type: 'numeric',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'expiresAt',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'accessCount',
            data_type: 'integer',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'lastAccessedAt',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'created_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'searchId',
            data_type: 'text',
            is_nullable: 'YES'
          })
        ])
      );

      // Check unique constraints
      const uniqueConstraints = await prisma.$queryRaw`
        SELECT constraint_name, column_name
        FROM information_schema.key_column_usage
        WHERE table_name = 'ai_search_cache'
        AND constraint_name LIKE '%unique%'
        ORDER BY constraint_name, ordinal_position
      ` as Array<{
        constraint_name: string;
        column_name: string;
      }>;

      expect(uniqueConstraints).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            column_name: 'queryHash'
          }),
          expect.objectContaining({
            column_name: 'searchId'
          })
        ])
      );
    });
  });

  describe('ai_contact_duplicates table', () => {
    it('should create table with correct structure', async () => {
      const columnInfo = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'ai_contact_duplicates'
        ORDER BY ordinal_position
      ` as Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
      }>;

      expect(columnInfo).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            column_name: 'id',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'originalContactId',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'duplicateContactId',
            data_type: 'text',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'similarityScore',
            data_type: 'numeric',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'duplicateType',
            data_type: 'USER-DEFINED',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'verificationStatus',
            data_type: 'USER-DEFINED',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'verifiedAt',
            data_type: 'timestamp without time zone',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'verifiedBy',
            data_type: 'text',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'created_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO'
          }),
          expect.objectContaining({
            column_name: 'updated_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'NO'
          })
        ])
      );
    });

    it('should enforce unique constraint on originalContactId + duplicateContactId', async () => {
      const testContact = await prisma.media_contacts.findFirst();

      if (!testContact) {
        console.warn('No test contact found for duplicate tests');
        return;
      }

      const duplicateData = {
        originalContactId: testContact.id,
        duplicateContactId: testContact.id, // Same contact for testing
        similarityScore: 0.95,
        duplicateType: 'EMAIL',
        verificationStatus: 'PENDING'
      };

      // This should work first time
      const duplicate1 = await prisma.ai_contact_duplicates.create({
        data: duplicateData
      });

      expect(duplicate1.id).toBeDefined();

      // This should fail due to unique constraint
      await expect(
        prisma.ai_contact_duplicates.create({
          data: duplicateData
        })
      ).rejects.toThrow();

      // Clean up
      await prisma.ai_contact_duplicates.delete({
        where: { id: duplicate1.id }
      });
    });
  });

  describe('media_contacts table modifications', () => {
    it('should have AI-related columns added', async () => {
      const columnInfo = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'media_contacts'
        AND column_name IN ('discovery_source', 'discovery_method', 'ai_confidence_score', 'discovered_at', 'ai_search_id', 'discovery_metadata')
        ORDER BY ordinal_position
      ` as Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string;
      }>;

      expect(columnInfo).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            column_name: 'discovery_source',
            data_type: 'USER-DEFINED',
            is_nullable: 'NO',
            column_default: "'MANUAL'::USER-DEFINED"
          }),
          expect.objectContaining({
            column_name: 'discovery_method',
            data_type: 'text',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'ai_confidence_score',
            data_type: 'integer',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'discovered_at',
            data_type: 'timestamp without time zone',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'ai_search_id',
            data_type: 'text',
            is_nullable: 'YES'
          }),
          expect.objectContaining({
            column_name: 'discovery_metadata',
            data_type: 'jsonb',
            is_nullable: 'YES'
          })
        ])
      );
    });
  });

  describe('Indexes', () => {
    it('should have performance indexes on AI tables', async () => {
      const indexes = await prisma.$queryRaw`
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE tablename IN ('ai_searches', 'ai_search_sources', 'ai_performance_logs', 'ai_search_cache', 'ai_contact_duplicates')
        AND indexname NOT LIKE '%_pkey'
        ORDER BY tablename, indexname
      ` as Array<{
        tablename: string;
        indexname: string;
        indexdef: string;
      }>;

      // Check that we have indexes on key columns
      const aiSearchesIndexes = indexes.filter(i => i.tablename === 'ai_searches');
      expect(aiSearchesIndexes.length).toBeGreaterThan(0);

      expect(aiSearchesIndexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            indexname: expect.stringContaining('status_idx')
          }),
          expect.objectContaining({
            indexname: expect.stringContaining('created_at_idx')
          }),
          expect.objectContaining({
            indexname: expect.stringContaining('userId_idx')
          })
        ])
      );

      const aiSourcesIndexes = indexes.filter(i => i.tablename === 'ai_search_sources');
      expect(aiSourcesIndexes.length).toBeGreaterThan(0);

      expect(aiSourcesIndexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            indexname: expect.stringContaining('searchId_idx')
          }),
          expect.objectContaining({
            indexname: expect.stringContaining('sourceType_idx')
          }),
          expect.objectContaining({
            indexname: expect.stringContaining('confidenceScore_idx')
          })
        ])
      );
    });
  });
});