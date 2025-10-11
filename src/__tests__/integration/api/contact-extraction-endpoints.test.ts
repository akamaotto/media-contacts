/**
 * Contact Extraction API Endpoints Integration Tests
 * Tests the complete request/response cycle for contact extraction functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/contact-extraction/extract/route';
import { POST as POST_IMPORT, GET as GET_IMPORT } from '@/app/api/ai/contacts/import/route';
import { testFixtures, testUsers } from '../config/test-config';

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn((req) => {
    // For import endpoints, return admin user
    if (req.url?.includes('/api/ai/contacts/import')) {
      return Promise.resolve({
        user: {
          id: testUsers.admin.id,
          email: testUsers.admin.email,
          name: testUsers.admin.name,
          role: testUsers.admin.role
        }
      });
    }
    // For other endpoints, return regular user
    return Promise.resolve({
      user: {
        id: testUsers.user.id,
        email: testUsers.user.email,
        name: testUsers.user.name,
        role: testUsers.user.role
      }
    });
  })
}));

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    mediaContact: {
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue({
        id: 'test-contact-id',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        userId: testUsers.user.id,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    },
    activityLog: {
      create: jest.fn().mockResolvedValue({
        id: 'test-activity-id',
        userId: testUsers.user.id,
        action: 'AI_CONTACTS_IMPORTED',
        entityType: 'bulk_import',
        entityId: 'test-search-id',
        createdAt: new Date()
      }),
      findMany: jest.fn().mockResolvedValue([])
    },
    $connect: jest.fn(),
    $disconnect: jest.fn()
  }))
}));

// Mock Contact Extraction Controller
jest.mock('@/app/api/ai/contact-extraction/controller', () => ({
  ContactExtractionController: jest.fn().mockImplementation(() => ({
    extractContacts: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          jobId: 'test-job-id',
          status: 'completed',
          contacts: [
            {
              id: 'contact-1',
              name: 'John Doe',
              email: 'john.doe@example.com',
              role: 'Technology Journalist',
              organization: 'Tech News Outlet',
              confidence: 0.85,
              location: 'San Francisco, CA',
              beats: ['technology'],
              languages: ['English'],
              phone: '+1-555-0123',
              socialMedia: {
                twitter: '@johndoetech',
                linkedin: 'linkedin.com/in/johndoe'
              },
              source: {
                url: 'https://example.com/article1',
                title: 'Test Article',
                extractedAt: new Date().toISOString()
              }
            },
            {
              id: 'contact-2',
              name: 'Jane Smith',
              email: 'jane.smith@example.com',
              role: 'AI Researcher',
              organization: 'AI Institute',
              confidence: 0.92,
              location: 'Boston, MA',
              beats: ['AI', 'research'],
              languages: ['English'],
              socialMedia: {
                twitter: '@janesmithai'
              },
              source: {
                url: 'https://example.com/article2',
                title: 'AI Research Article',
                extractedAt: new Date().toISOString()
              }
            }
          ],
          totalContacts: 2,
          averageConfidence: 0.885,
          processingTime: 2500,
          extractionStatus: 'completed'
        },
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    )
  }))
}));

// Mock dependencies
jest.mock('@/app/api/ai/shared/logger', () => ({
  AILogger: {
    logBusiness: jest.fn().mockResolvedValue(undefined),
    logPerformance: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('Contact Extraction API Endpoints Integration', () => {
  describe('POST /api/ai/contact-extraction/extract', () => {
    let correlationId: string;

    beforeEach(() => {
      correlationId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      jest.clearAllMocks();
    });

    it('should extract contacts from web content successfully', async () => {
      // Arrange
      const extractionRequest = {
        urls: [
          'https://techcrunch.com/2024/01/15/ai-journalists',
          'https://wired.com/2024/01/10/tech-media-landscape'
        ],
        options: {
          extractSocialMedia: true,
          extractPhoneNumbers: true,
          confidenceThreshold: 0.7,
          maxContactsPerPage: 5,
          scrapeContent: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(extractionRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('jobId');
      expect(data.data).toHaveProperty('status', 'completed');
      expect(data.data).toHaveProperty('contacts');
      expect(Array.isArray(data.data.contacts)).toBe(true);
      expect(data.data.contacts).toHaveLength(2);
      expect(data.data.contacts).toContainValidContacts();
      expect(data.data).toHaveProperty('totalContacts', 2);
      expect(data.data).toHaveProperty('averageConfidence');
      expect(data.data.averageConfidence).toBeGreaterThanOrEqual(0.7);
      expect(data.data).toHaveProperty('processingTime');
      expect(data.data).toHaveProperty('extractionStatus', 'completed');
      expect(data).toHaveCorrelationId();
    });

    it('should handle extraction with options correctly', async () => {
      // Arrange
      const extractionRequest = {
        urls: ['https://example.com/article-with-contacts'],
        options: {
          extractSocialMedia: true,
          extractPhoneNumbers: true,
          extractLocations: true,
          confidenceThreshold: 0.8,
          maxContactsPerPage: 3,
          scrapeContent: true,
          includeContext: true,
          prioritizeHighConfidence: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(extractionRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.data.contacts).toHaveLength(2);

      // Verify extracted contacts have all requested fields
      data.data.contacts.forEach((contact: any) => {
        expect(contact).toHaveProperty('name');
        expect(contact).toHaveProperty('email');
        expect(contact).toHaveProperty('confidence');
        expect(contact.confidence).toBeGreaterThanOrEqual(0.8);
        expect(contact).toHaveProperty('socialMedia');
        expect(contact).toHaveProperty('source');
      });
    });

    it('should handle invalid extraction requests', async () => {
      // Arrange
      const invalidRequest = {
        urls: [], // Empty URLs array
        options: {
          confidenceThreshold: 1.5 // Invalid confidence threshold
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(invalidRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('validation');
    });

    it('should handle extraction service failures', async () => {
      // Arrange
      const { ContactExtractionController } = require('@/app/api/ai/contact-extraction/controller');
      const mockController = {
        extractContacts: jest.fn().mockResolvedValue(
          new Response(JSON.stringify({
            success: false,
            error: 'Extraction service temporarily unavailable',
            correlationId: correlationId,
            timestamp: new Date().toISOString()
          }), { status: 503 })
        )
      };
      ContactExtractionController.mockImplementation(() => mockController);

      const extractionRequest = {
        urls: ['https://example.com/article'],
        options: { confidenceThreshold: 0.7 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(extractionRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(503);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('temporarily unavailable');
    });

    it('should handle URL validation', async () => {
      // Arrange
      const invalidUrlsRequest = {
        urls: [
          'invalid-url',
          'not-a-url',
          'ftp://invalid-protocol.com'
        ],
        options: { confidenceThreshold: 0.7 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(invalidUrlsRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.error).toContain('Invalid URLs');
    });
  });

  describe('POST /api/ai/contacts/import', () => {
    let correlationId: string;

    beforeEach(() => {
      correlationId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      jest.clearAllMocks();
    });

    it('should import contacts successfully', async () => {
      // Arrange
      const importRequest = {
        searchId: 'test-search-id',
        contactIds: ['contact-1', 'contact-2'],
        targetLists: ['technology-journalists', 'ai-experts'],
        tags: ['AI', 'technology', 'journalism']
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(importRequest)
      });

      // Act
      const response = await POST_IMPORT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('importId');
      expect(data.data).toHaveProperty('status', 'completed');
      expect(data.data).toHaveProperty('imported');
      expect(data.data).toHaveProperty('failed');
      expect(data.data).toHaveProperty('total');
      expect(data.data.total).toBe(2);
      expect(data.data).toHaveProperty('importedAt');
      expect(data).toHaveCorrelationId();
    });

    it('should handle duplicate contacts during import', async () => {
      // Arrange
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = new PrismaClient();
      mockPrisma.mediaContact.findFirst.mockResolvedValue({ id: 'existing-contact' });

      const importRequest = {
        searchId: 'test-search-id',
        contactIds: ['existing-contact-id'],
        tags: ['test']
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(importRequest)
      });

      // Act
      const response = await POST_IMPORT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.imported).toBe(0);
      expect(data.data.failed).toBe(1);
      expect(data.data.errors).toBeDefined();
      expect(data.data.errors.length).toBe(1);
      expect(data.data.errors[0]).toContain('already exists');
    });

    it('should handle invalid import requests', async () => {
      // Arrange
      const invalidRequest = {
        searchId: '', // Empty search ID
        contactIds: [], // Empty contact IDs
        tags: 'invalid-tag-format' // Should be array
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(invalidRequest)
      });

      // Act
      const response = await POST_IMPORT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('required');
    });

    it('should require authentication for import', async () => {
      // Arrange
      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValueOnce(null); // No authenticated user

      const importRequest = {
        searchId: 'test-search-id',
        contactIds: ['contact-1']
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(importRequest)
      });

      // Act
      const response = await POST_IMPORT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Authentication required');
    });
  });

  describe('GET /api/ai/contacts/import', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retrieve import status by search ID', async () => {
      // Arrange
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = new PrismaClient();
      mockPrisma.activityLog.findMany.mockResolvedValue([
        {
          id: 'import-1',
          details: {
            searchId: 'test-search-id',
            importedCount: 5,
            failedCount: 1,
            totalContacts: 6,
            errors: []
          },
          createdAt: new Date()
        }
      ]);

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import?action=status&searchId=test-search-id', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await GET_IMPORT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('imports');
      expect(data.data).toHaveProperty('total');
      expect(Array.isArray(data.data.imports)).toBe(true);
      expect(data.data.imports).toHaveLength(1);
      expect(data.data.imports[0]).toMatchObject({
        searchId: 'test-search-id',
        status: 'completed',
        imported: 5,
        failed: 1,
        total: 6
      });
    });

    it('should retrieve import status by import ID', async () => {
      // Arrange
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = new PrismaClient();
      mockPrisma.activityLog.findMany.mockResolvedValue([
        {
          id: 'specific-import-id',
          details: {
            searchId: 'test-search-id',
            importedCount: 3,
            failedCount: 0,
            totalContacts: 3
          },
          createdAt: new Date()
        }
      ]);

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import?action=status&importId=specific-import-id', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await GET_IMPORT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.data.imports).toHaveLength(1);
      expect(data.data.imports[0].id).toBe('specific-import-id');
    });

    it('should retrieve all imports for user', async () => {
      // Arrange
      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = new PrismaClient();
      mockPrisma.activityLog.findMany.mockResolvedValue([
        {
          id: 'import-1',
          details: { searchId: 'search-1', importedCount: 5, failedCount: 0, totalContacts: 5 },
          createdAt: new Date('2024-01-15T10:00:00Z')
        },
        {
          id: 'import-2',
          details: { searchId: 'search-2', importedCount: 3, failedCount: 1, totalContacts: 4 },
          createdAt: new Date('2024-01-14T15:30:00Z')
        }
      ]);

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import?action=status&limit=20', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await GET_IMPORT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toBeValidAPIResponse();
      expect(data.data.imports).toHaveLength(2);
      expect(data.data.total).toBe(2);

      // Verify imports are sorted by creation date (most recent first)
      expect(new Date(data.data.imports[0].createdAt).getTime()).toBeGreaterThan(
        new Date(data.data.imports[1].createdAt).getTime()
      );
    });

    it('should handle invalid action parameter', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import?action=invalid', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await GET_IMPORT(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid request');
    });
  });

  describe('Integration Workflow Tests', () => {
    it('should handle complete extraction to import workflow', async () => {
      // Step 1: Extract contacts
      const extractionRequest = {
        urls: ['https://example.com/article-with-contacts'],
        options: { confidenceThreshold: 0.8, maxContactsPerPage: 3 }
      };

      const extractRequest = new NextRequest('http://localhost:3000/api/ai/contact-extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `workflow-test-${Date.now()}`
        },
        body: JSON.stringify(extractionRequest)
      });

      const extractResponse = await POST(extractRequest);
      const extractData = await extractResponse.json();

      expect(extractResponse.status).toBe(200);
      expect(extractData.success).toBe(true);
      expect(extractData.data.contacts).toBeDefined();
      expect(extractData.data.contacts.length).toBeGreaterThan(0);

      // Step 2: Import extracted contacts
      const contactIds = extractData.data.contacts.map((c: any) => c.id);
      const importRequest = {
        searchId: extractData.data.jobId,
        contactIds: contactIds,
        tags: ['workflow-test']
      };

      const importRequestObj = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `workflow-test-${Date.now()}`
        },
        body: JSON.stringify(importRequest)
      });

      const importResponse = await POST_IMPORT(importRequestObj);
      const importData = await importResponse.json();

      expect(importResponse.status).toBe(200);
      expect(importData.success).toBe(true);
      expect(importData.data.imported).toBe(contactIds.length);

      // Step 3: Verify import status
      const statusRequest = new NextRequest(`http://localhost:3000/api/ai/contacts/import?action=status&searchId=${extractData.data.jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `workflow-test-${Date.now()}`
        }
      });

      const statusResponse = await GET_IMPORT(statusRequest);
      const statusData = await statusResponse.json();

      expect(statusResponse.status).toBe(200);
      expect(statusData.success).toBe(true);
      expect(statusData.data.imports).toHaveLength(1);
      expect(statusData.data.imports[0].imported).toBe(contactIds.length);
    });
  });
});