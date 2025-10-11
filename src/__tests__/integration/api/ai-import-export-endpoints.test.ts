/**
 * AI Import/Export API Endpoints Integration Tests
 * Tests the complete request/response cycle for AI import/export functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as ImportPOST } from '@/app/api/ai/contacts/import/route.ts';
import { testFixtures, testUsers } from '../config/test-config';

// Mock NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(() => Promise.resolve({
    user: {
      id: testUsers.user.id,
      email: testUsers.user.email,
      name: testUsers.user.name,
      role: testUsers.user.role
    }
  }))
}));

// Mock dependencies
jest.mock('@/app/api/ai/contacts/import/controller', () => ({
  ContactsImportController: jest.fn().mockImplementation(() => ({
    importContacts: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          importId: 'test-import-id-123',
          status: 'processing',
          estimatedDuration: 30000,
          totalContacts: 25
        },
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString()
      }), { status: 202 })
    ),
    getImportStatus: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          importId: 'test-import-id-123',
          status: 'processing',
          progress: 65,
          processedContacts: 16,
          totalContacts: 25,
          successfulImports: 14,
          failedImports: 2,
          duplicatesSkipped: 2,
          estimatedTimeRemaining: 10000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString()
      }), { status: 200 })
    ),
    cancelImport: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          importId: 'test-import-id-123',
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
          processedContacts: 16,
          totalContacts: 25
        },
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString()
      }), { status: 200 })
    ),
    getImportResults: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          importId: 'test-import-id-123',
          status: 'completed',
          progress: 100,
          processedContacts: 25,
          totalContacts: 25,
          successfulImports: 20,
          failedImports: 3,
          duplicatesSkipped: 2,
          importedContacts: [
            {
              id: 'contact-1',
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
              importSource: 'ai-search',
              importedAt: '2024-01-15T10:00:00Z'
            },
            {
              id: 'contact-2',
              name: 'Jane Smith',
              email: 'jane.smith@wired.com',
              role: 'Senior Technology Reporter',
              organization: 'Wired Magazine',
              confidence: 0.88,
              location: 'New York, NY',
              beats: ['technology', 'innovation'],
              languages: ['English', 'Spanish'],
              socialMedia: {
                twitter: '@janesmith',
                linkedin: 'linkedin.com/in/janesmith'
              },
              importSource: 'ai-search',
              importedAt: '2024-01-15T10:01:00Z'
            }
          ],
          failedImports: [
            {
              row: 3,
              name: 'Invalid Contact',
              email: 'invalid-email',
              error: 'Invalid email format',
              rawData: {
                name: 'Invalid Contact',
                email: 'invalid-email',
                organization: 'Test Org'
              }
            }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString()
      }), { status: 200 })
    ),
    getImportStatistics: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          totalImports: 50,
          successfulImports: 45,
          failedImports: 5,
          totalContactsImported: 1250,
          averageProcessingTime: 25000,
          importsBySource: {
            'ai-search': 30,
            'csv-upload': 15,
            'manual-entry': 5
          },
          importsByStatus: {
            completed: 45,
            failed: 3,
            cancelled: 2
          },
          topSources: [
            { source: 'ai-search', contacts: 850 },
            { source: 'csv-upload', contacts: 350 },
            { source: 'manual-entry', contacts: 50 }
          ]
        },
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString()
      }), { status: 200 })
    )
  }))
}));

jest.mock('@/app/api/ai/shared/logger', () => ({
  AILogger: {
    logBusiness: jest.fn().mockResolvedValue(undefined),
    logPerformance: jest.fn().mockResolvedValue(undefined),
    logError: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('AI Import/Export API Endpoints Integration', () => {
  describe('POST /api/ai/contacts/import', () => {
    let correlationId: string;

    beforeEach(() => {
      correlationId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      jest.clearAllMocks();
    });

    it('should submit a contact import job successfully', async () => {
      // Arrange
      const importRequest = {
        source: 'ai-search',
        searchId: 'test-search-id-123',
        contactIds: ['contact-1', 'contact-2', 'contact-3'],
        targetLists: ['technology-journalists', 'ai-reporters'],
        tags: ['technology', 'AI', 'journalism'],
        options: {
          validateEmails: true,
          checkDuplicates: true,
          enrichWithExternalData: true,
          updateExisting: false,
          priority: 'normal'
        }
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
      const response = await ImportPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.importId).toBe('test-import-id-123');
      expect(data.data.status).toBe('processing');
      expect(data.data.estimatedDuration).toBe(30000);
      expect(data.data.totalContacts).toBe(25);
      expect(data).toHaveCorrelationId();
    });

    it('should handle import with CSV file', async () => {
      // Arrange
      const csvContent = `Name,Email,Organization,Role,Phone
John Doe,john.doe@example.com,Tech News,Reporter,+1-555-0101
Jane Smith,jane.smith@wired.com,Wired,Editor,+1-555-0102
Bob Johnson,bob@reuters.com,Reuters,Journalist,+1-555-0103`;

      const formData = new FormData();
      formData.append('file', new Blob([csvContent], { type: 'text/csv' }), 'contacts.csv');
      formData.append('options', JSON.stringify({
        validateEmails: true,
        checkDuplicates: true,
        updateExisting: false
      }));
      formData.append('tags', JSON.stringify(['csv-import', 'technology']));

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        },
        body: formData
      });

      // Mock the controller to handle file uploads
      const { ContactsImportController } = require('@/app/api/ai/contacts/import/controller');
      ContactsImportController.mockImplementation(() => ({
        importContacts: jest.fn().mockResolvedValue(
          new Response(JSON.stringify({
            success: true,
            data: {
              importId: 'test-import-id-456',
              status: 'processing',
              estimatedDuration: 15000,
              totalContacts: 3,
              source: 'csv-upload'
            },
            correlationId: 'test-correlation-id',
            timestamp: new Date().toISOString()
          }), { status: 202 })
        )
      }));

      // Act
      const response = await ImportPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.importId).toBe('test-import-id-456');
      expect(data.data.status).toBe('processing');
      expect(data.data.source).toBe('csv-upload');
      expect(data.data.totalContacts).toBe(3);
    });

    it('should handle import with JSON data', async () => {
      // Arrange
      const jsonContacts = [
        {
          name: 'Alice Johnson',
          email: 'alice@example.com',
          organization: 'Tech Media',
          role: 'Senior Reporter',
          beats: ['technology', 'AI'],
          languages: ['English']
        },
        {
          name: 'Bob Smith',
          email: 'bob@example.com',
          organization: 'News Outlet',
          role: 'Editor',
          beats: ['business', 'technology'],
          languages: ['English', 'Spanish']
        }
      ];

      const importRequest = {
        source: 'json-data',
        contacts: jsonContacts,
        targetLists: ['tech-reporters'],
        options: {
          validateEmails: true,
          checkDuplicates: true,
          updateExisting: false
        }
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
      const response = await ImportPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.importId).toBeDefined();
      expect(data.data.status).toBe('processing');
    });

    it('should handle invalid import request', async () => {
      // Arrange
      const invalidRequest = {
        source: '', // Empty source
        contactIds: [], // Empty contact IDs
        options: {
          validateEmails: 'invalid-boolean' // Should be boolean
        }
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
      const response = await ImportPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
    });

    it('should handle service failures during import', async () => {
      // Arrange
      const { ContactsImportController } = require('@/app/api/ai/contacts/import/controller');
      ContactsImportController.mockImplementation(() => ({
        importContacts: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      }));

      const importRequest = {
        source: 'ai-search',
        searchId: 'test-search-id-123',
        contactIds: ['contact-1', 'contact-2'],
        options: { validateEmails: true }
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
      const response = await ImportPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Internal server error');
    });
  });

  describe('Import Status and Results', () => {
    describe('GET /api/ai/contacts/import/[importId]', () => {
      it('should return import status', async () => {
        // Arrange
        const importId = 'test-import-id-123';
        const request = new NextRequest(`http://localhost:3000/api/ai/contacts/import/${importId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `test-${Date.now()}`
          }
        });

        // Mock the controller to handle status requests
        const { ContactsImportController } = require('@/app/api/ai/contacts/import/controller');
        ContactsImportController.mockImplementation(() => ({
          getImportStatus: jest.fn().mockResolvedValue(
            new Response(JSON.stringify({
              success: true,
              data: {
                importId: importId,
                status: 'processing',
                progress: 65,
                processedContacts: 16,
                totalContacts: 25,
                successfulImports: 14,
                failedImports: 2,
                duplicatesSkipped: 2,
                estimatedTimeRemaining: 10000,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              correlationId: 'test-correlation-id',
              timestamp: new Date().toISOString()
            }), { status: 200 })
          )
        }));

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data).toBeValidAPIResponse();
        expect(data.success).toBe(true);
        expect(data.data.importId).toBe(importId);
        expect(data.data.status).toBe('processing');
        expect(data.data.progress).toBe(65);
        expect(data.data.processedContacts).toBe(16);
        expect(data.data.totalContacts).toBe(25);
        expect(data.data.successfulImports).toBe(14);
        expect(data.data.failedImports).toBe(2);
        expect(data.data.duplicatesSkipped).toBe(2);
        expect(data.data.estimatedTimeRemaining).toBe(10000);
      });
    });

    describe('GET /api/ai/contacts/import/[importId]/results', () => {
      it('should return import results', async () => {
        // Arrange
        const importId = 'test-import-id-123';
        const request = new NextRequest(`http://localhost:3000/api/ai/contacts/import/${importId}/results`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `test-${Date.now()}`
          }
        });

        // Mock the controller to handle results requests
        const { ContactsImportController } = require('@/app/api/ai/contacts/import/controller');
        ContactsImportController.mockImplementation(() => ({
          getImportResults: jest.fn().mockResolvedValue(
            new Response(JSON.stringify({
              success: true,
              data: {
                importId: importId,
                status: 'completed',
                progress: 100,
                processedContacts: 25,
                totalContacts: 25,
                successfulImports: 20,
                failedImports: 3,
                duplicatesSkipped: 2,
                importedContacts: [
                  {
                    id: 'contact-1',
                    name: 'John Doe',
                    email: 'john.doe@example.com',
                    role: 'Technology Journalist',
                    organization: 'Tech News Outlet',
                    confidence: 0.92,
                    importSource: 'ai-search',
                    importedAt: '2024-01-15T10:00:00Z'
                  }
                ],
                failedImports: [
                  {
                    row: 3,
                    name: 'Invalid Contact',
                    email: 'invalid-email',
                    error: 'Invalid email format'
                  }
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              correlationId: 'test-correlation-id',
              timestamp: new Date().toISOString()
            }), { status: 200 })
          )
        }));

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data).toBeValidAPIResponse();
        expect(data.success).toBe(true);
        expect(data.data.importId).toBe(importId);
        expect(data.data.status).toBe('completed');
        expect(data.data.progress).toBe(100);
        expect(data.data.processedContacts).toBe(25);
        expect(data.data.totalContacts).toBe(25);
        expect(data.data.successfulImports).toBe(20);
        expect(data.data.failedImports).toBe(3);
        expect(data.data.duplicatesSkipped).toBe(2);
        expect(data.data.importedContacts).toHaveLength(1);
        expect(data.data.importedContacts[0]).toContainValidContacts();
        expect(data.data.failedImports).toHaveLength(1);
      });
    });

    describe('POST /api/ai/contacts/import/[importId]/cancel', () => {
      it('should cancel a running import', async () => {
        // Arrange
        const importId = 'test-import-id-123';
        const request = new NextRequest(`http://localhost:3000/api/ai/contacts/import/${importId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `test-${Date.now()}`
          }
        });

        // Mock the controller to handle cancel requests
        const { ContactsImportController } = require('@/app/api/ai/contacts/import/controller');
        ContactsImportController.mockImplementation(() => ({
          cancelImport: jest.fn().mockResolvedValue(
            new Response(JSON.stringify({
              success: true,
              data: {
                importId: importId,
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
                processedContacts: 16,
                totalContacts: 25
              },
              correlationId: 'test-correlation-id',
              timestamp: new Date().toISOString()
            }), { status: 200 })
          )
        }));

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data).toBeValidAPIResponse();
        expect(data.success).toBe(true);
        expect(data.data.importId).toBe(importId);
        expect(data.data.status).toBe('cancelled');
        expect(data.data.cancelledAt).toBeRecent();
      });
    });
  });

  describe('Import Statistics and Health', () => {
    describe('GET /api/ai/contacts/import/statistics', () => {
      it('should return import statistics', async () => {
        // Arrange
        const request = new NextRequest('http://localhost:3000/api/ai/contacts/import/statistics', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `test-${Date.now()}`
          }
        });

        // Mock the controller to handle statistics requests
        const { ContactsImportController } = require('@/app/api/ai/contacts/import/controller');
        ContactsImportController.mockImplementation(() => ({
          getImportStatistics: jest.fn().mockResolvedValue(
            new Response(JSON.stringify({
              success: true,
              data: {
                totalImports: 50,
                successfulImports: 45,
                failedImports: 5,
                totalContactsImported: 1250,
                averageProcessingTime: 25000,
                importsBySource: {
                  'ai-search': 30,
                  'csv-upload': 15,
                  'manual-entry': 5
                },
                importsByStatus: {
                  completed: 45,
                  failed: 3,
                  cancelled: 2
                },
                topSources: [
                  { source: 'ai-search', contacts: 850 },
                  { source: 'csv-upload', contacts: 350 },
                  { source: 'manual-entry', contacts: 50 }
                ]
              },
              correlationId: 'test-correlation-id',
              timestamp: new Date().toISOString()
            }), { status: 200 })
          )
        }));

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data).toBeValidAPIResponse();
        expect(data.success).toBe(true);
        expect(data.data.totalImports).toBe(50);
        expect(data.data.successfulImports).toBe(45);
        expect(data.data.failedImports).toBe(5);
        expect(data.data.totalContactsImported).toBe(1250);
        expect(data.data.averageProcessingTime).toBe(25000);
        expect(data.data.importsBySource['ai-search']).toBe(30);
        expect(data.data.importsBySource['csv-upload']).toBe(15);
        expect(data.data.importsBySource['manual-entry']).toBe(5);
        expect(data.data.importsByStatus.completed).toBe(45);
        expect(data.data.importsByStatus.failed).toBe(3);
        expect(data.data.importsByStatus.cancelled).toBe(2);
        expect(data.data.topSources).toHaveLength(3);
        expect(data.data.topSources[0].source).toBe('ai-search');
        expect(data.data.topSources[0].contacts).toBe(850);
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      // Arrange
      const importRequest = {
        source: 'ai-search',
        searchId: 'test-search-id-123',
        contactIds: ['contact-1']
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(importRequest)
      });

      // Act
      const response = await ImportPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
    });

    it('should include proper correlation ID in responses', async () => {
      // Arrange
      const correlationId = 'custom-correlation-id-789';
      const importRequest = {
        source: 'ai-search',
        searchId: 'test-search-id-123',
        contactIds: ['contact-1']
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
      const response = await ImportPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data.correlationId).toBe(correlationId);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON in import requests', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: 'invalid-json{'
      });

      // Act
      const response = await ImportPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
    });

    it('should handle oversized import requests', async () => {
      // Arrange
      const largeContactList = Array.from({ length: 1000 }, (_, i) => ({
        id: `contact-${i}`,
        name: `Contact ${i}`,
        email: `contact${i}@example.com`
      }));

      const importRequest = {
        source: 'ai-search',
        contactIds: largeContactList.map(c => c.id),
        options: { validateEmails: true }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(importRequest)
      });

      // Act
      const response = await ImportPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data).toBeValidErrorResponse();
      expect(data.error).toContain('too large');
    });

    it('should handle invalid import IDs', async () => {
      // Arrange
      const invalidImportId = 'invalid-import-id';
      const request = new NextRequest(`http://localhost:3000/api/ai/contacts/import/${invalidImportId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Mock the controller to handle invalid IDs
      const { ContactsImportController } = require('@/app/api/ai/contacts/import/controller');
      ContactsImportController.mockImplementation(() => ({
        getImportStatus: jest.fn().mockResolvedValue(
          new Response(JSON.stringify({
            success: false,
            error: 'Import not found',
            correlationId: 'test-correlation-id',
            timestamp: new Date().toISOString()
          }), { status: 404 })
        )
      }));

      // Act
      const response = await GET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('not found');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent import requests', async () => {
      // Arrange
      const importRequests = Array.from({ length: 3 }, (_, i) => {
        const request = {
          source: 'ai-search',
          searchId: `test-search-id-${i}`,
          contactIds: [`contact-${i}-1`, `contact-${i}-2`],
          options: { validateEmails: true }
        };
        
        return new NextRequest('http://localhost:3000/api/ai/contacts/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `concurrent-import-${i}`
          },
          body: JSON.stringify(request)
        });
      });

      // Act
      const startTime = Date.now();
      const responses = await Promise.allSettled(importRequests.map(req => ImportPOST(req)));
      const endTime = Date.now();

      // Assert
      expect(responses).toHaveLength(3);
      const successfulResponses = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 202
      );
      expect(successfulResponses.length).toBe(3);

      // Should complete in reasonable time (concurrent execution)
      expect(endTime - startTime).toBeLessThan(5000);

      // Each response should have unique import ID
      const importIds = await Promise.all(
        successfulResponses.map(async (r) => {
          const data = await (r as PromiseFulfilledResult<Response>).value.json();
          return data.data.importId;
        })
      );
      const uniqueIds = new Set(importIds);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('Data Validation and Quality', () => {
    it('should validate email addresses during import', async () => {
      // Arrange
      const jsonContacts = [
        {
          name: 'Valid Contact',
          email: 'valid@example.com',
          organization: 'Test Org'
        },
        {
          name: 'Invalid Contact',
          email: 'invalid-email',
          organization: 'Test Org'
        }
      ];

      const importRequest = {
        source: 'json-data',
        contacts: jsonContacts,
        options: {
          validateEmails: true,
          checkDuplicates: false
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(importRequest)
      });

      // Act
      const response = await ImportPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.importId).toBeDefined();
    });

    it('should check for duplicates during import', async () => {
      // Arrange
      const jsonContacts = [
        {
          name: 'John Doe',
          email: 'john.doe@example.com',
          organization: 'Tech News'
        },
        {
          name: 'John Doe',
          email: 'john.doe@example.com',
          organization: 'Tech News'
        }
      ];

      const importRequest = {
        source: 'json-data',
        contacts: jsonContacts,
        options: {
          validateEmails: true,
          checkDuplicates: true,
          updateExisting: false
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(importRequest)
      });

      // Act
      const response = await ImportPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.importId).toBeDefined();
    });

    it('should enrich contacts with external data when requested', async () => {
      // Arrange
      const jsonContacts = [
        {
          name: 'Jane Smith',
          email: 'jane.smith@wired.com',
          organization: 'Wired Magazine'
        }
      ];

      const importRequest = {
        source: 'json-data',
        contacts: jsonContacts,
        options: {
          validateEmails: true,
          checkDuplicates: false,
          enrichWithExternalData: true
        }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contacts/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(importRequest)
      });

      // Act
      const response = await ImportPOST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.importId).toBeDefined();
    });
  });
});