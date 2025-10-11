/**
 * AI Contact Extraction API Endpoints Integration Tests
 * Tests the complete request/response cycle for AI contact extraction functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/contact-extraction/extract/route';
import { GET, POST as JobsPOST } from '@/app/api/ai/contact-extraction/jobs/route.ts';
import { GET as HealthGET } from '@/app/api/ai/contact-extraction/health/route.ts';
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
jest.mock('@/app/api/ai/contact-extraction/controller', () => ({
  ContactExtractionController: jest.fn().mockImplementation(() => ({
    extractContacts: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          jobId: 'test-job-id-123',
          status: 'processing',
          estimatedDuration: 45000
        },
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString()
      }), { status: 202 })
    ),
    getJobs: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          jobs: [
            {
              id: 'test-job-id-123',
              status: 'completed',
              progress: 100,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              contactsFound: 5,
              confidence: 0.85
            }
          ],
          total: 1
        },
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString()
      }), { status: 200 })
    ),
    getJobStatus: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          jobId: 'test-job-id-123',
          status: 'processing',
          progress: 65,
          contactsFound: 3,
          estimatedTimeRemaining: 15000,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString()
      }), { status: 200 })
    ),
    cancelJob: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          jobId: 'test-job-id-123',
          status: 'cancelled',
          cancelledAt: new Date().toISOString()
        },
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString()
      }), { status: 200 })
    ),
    getJobContacts: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          contacts: [
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
              source: {
                url: 'https://techcrunch.com/2024/01/15/ai-journalists',
                title: 'The Rise of AI Journalism',
                extractedAt: '2024-01-15T10:00:00Z'
              }
            }
          ],
          total: 1,
          page: 1,
          pageSize: 10
        },
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString()
      }), { status: 200 })
    ),
    getHealthStatus: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          status: 'healthy',
          services: {
            openai: { status: 'healthy', responseTime: 150 },
            anthropic: { status: 'healthy', responseTime: 200 },
            database: { status: 'healthy', responseTime: 50 },
            redis: { status: 'healthy', responseTime: 25 }
          },
          metrics: {
            activeJobs: 2,
            completedJobs: 150,
            failedJobs: 3,
            averageProcessingTime: 42000,
            totalContactsExtracted: 1250
          },
          timestamp: new Date().toISOString()
        },
        correlationId: 'test-correlation-id',
        timestamp: new Date().toISOString()
      }), { status: 200 })
    ),
    getStatistics: jest.fn().mockResolvedValue(
      new Response(JSON.stringify({
        success: true,
        data: {
          totalJobs: 200,
          successfulJobs: 185,
          failedJobs: 15,
          averageConfidence: 0.84,
          totalContactsExtracted: 1500,
          averageProcessingTime: 45000,
          jobsByStatus: {
            pending: 5,
            processing: 3,
            completed: 185,
            failed: 7
          },
          topSources: [
            { domain: 'techcrunch.com', contacts: 45 },
            { domain: 'wired.com', contacts: 32 },
            { domain: 'reuters.com', contacts: 28 }
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

describe('AI Contact Extraction API Endpoints Integration', () => {
  describe('POST /api/ai/contact-extraction/extract', () => {
    let correlationId: string;

    beforeEach(() => {
      correlationId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      jest.clearAllMocks();
    });

    it('should submit a contact extraction job successfully', async () => {
      // Arrange
      const extractionRequest = {
        urls: [
          'https://techcrunch.com/2024/01/15/ai-journalists',
          'https://wired.com/2024/01/10/tech-media-landscape'
        ],
        content: `
          The Rise of AI Journalism: Meet the Key Players

          By Sarah Chen
          January 15, 2024

          In the rapidly evolving world of technology journalism, a new breed of reporters has emerged to cover one of the most transformative beats: artificial intelligence. These journalists bring a unique blend of technical understanding and storytelling ability to make complex AI concepts accessible to mainstream audiences.

          Leading this movement is John Doe, a veteran technology journalist at Tech News Outlet. With over a decade of experience covering Silicon Valley, John has established himself as a go-to source for insights on AI development and its impact on society.

          Contact: john.doe@technewsoutlet.com
          Twitter: @johndoetech
          Phone: +1-555-0123

          Another notable voice is Jane Smith, who covers AI for Wired Magazine.

          Contact: jane.smith@wired.com
          LinkedIn: linkedin.com/in/janesmith
        `,
        options: {
          maxContactsPerSource: 5,
          confidenceThreshold: 0.7,
          includeSocialMedia: true,
          includePhoneNumbers: true,
          enrichWithExternalData: true,
          priority: 'normal'
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
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.jobId).toBe('test-job-id-123');
      expect(data.data.status).toBe('processing');
      expect(data.data.estimatedDuration).toBe(45000);
      expect(data).toHaveCorrelationId();
    });

    it('should handle extraction with only URLs', async () => {
      // Arrange
      const extractionRequest = {
        urls: [
          'https://example.com/article1',
          'https://example.com/article2'
        ],
        options: {
          maxContactsPerSource: 3,
          confidenceThreshold: 0.8,
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
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.jobId).toBeDefined();
      expect(data.data.status).toBe('processing');
    });

    it('should handle extraction with only content', async () => {
      // Arrange
      const extractionRequest = {
        content: `
          Tech Media Contacts

          Editorial Team:
          - Editor: Michael Johnson (michael.johnson@techmedia.com)
          - Senior Writer: Lisa Chen (lisa.chen@techmedia.com, @lisachen)
          
          Contributors:
          - David Park (david.park@freelance.com)
          - Sarah Williams (sarah.williams@independent.com)
        `,
        options: {
          maxContactsPerSource: 10,
          confidenceThreshold: 0.6
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
      expect(response.status).toBe(202);
      expect(data).toBeValidAPIResponse();
      expect(data.success).toBe(true);
      expect(data.data.jobId).toBeDefined();
    });

    it('should handle invalid extraction request', async () => {
      // Arrange
      const invalidRequest = {
        urls: [], // Empty URLs
        content: '', // Empty content
        options: {
          maxContactsPerSource: -1 // Invalid negative number
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
    });

    it('should handle service failures during extraction', async () => {
      // Arrange
      const { ContactExtractionController } = require('@/app/api/ai/contact-extraction/controller');
      ContactExtractionController.mockImplementation(() => ({
        extractContacts: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      }));

      const extractionRequest = {
        urls: ['https://example.com/article'],
        options: { maxContactsPerSource: 5 }
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
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Internal server error');
    });
  });

  describe('Jobs Management', () => {
    describe('GET /api/ai/contact-extraction/jobs', () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      it('should return list of extraction jobs', async () => {
        // Arrange
        const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/jobs', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `test-${Date.now()}`
          }
        });

        // Act
        const response = await JobsPOST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data).toBeValidAPIResponse();
        expect(data.success).toBe(true);
        expect(data.data.jobs).toHaveLength(1);
        expect(data.data.jobs[0].id).toBe('test-job-id-123');
        expect(data.data.jobs[0].status).toBe('completed');
        expect(data.data.jobs[0].progress).toBe(100);
        expect(data.data.jobs[0].contactsFound).toBe(5);
        expect(data.data.total).toBe(1);
      });
    });

    describe('POST /api/ai/contact-extraction/jobs', () => {
      it('should create a new extraction job', async () => {
        // Arrange
        const jobRequest = {
          name: 'Tech Journalists Extraction',
          urls: ['https://techcrunch.com/2024/01/15/ai-journalists'],
          options: {
            maxContactsPerSource: 10,
            confidenceThreshold: 0.8
          }
        };

        const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `test-${Date.now()}`
          },
          body: JSON.stringify(jobRequest)
        });

        // Act
        const response = await JobsPOST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(202);
        expect(data).toBeValidAPIResponse();
        expect(data.success).toBe(true);
        expect(data.data.jobId).toBeDefined();
        expect(data.data.status).toBe('processing');
      });
    });
  });

  describe('Individual Job Management', () => {
    describe('GET /api/ai/contact-extraction/jobs/[jobId]', () => {
      it('should return job status', async () => {
        // Arrange
        const jobId = 'test-job-id-123';
        const request = new NextRequest(`http://localhost:3000/api/ai/contact-extraction/jobs/${jobId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `test-${Date.now()}`
          }
        });

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data).toBeValidAPIResponse();
        expect(data.success).toBe(true);
        expect(data.data.jobId).toBe(jobId);
        expect(data.data.status).toBe('processing');
        expect(data.data.progress).toBe(65);
        expect(data.data.contactsFound).toBe(3);
        expect(data.data.estimatedTimeRemaining).toBe(15000);
      });
    });

    describe('GET /api/ai/contact-extraction/jobs/[jobId]/contacts', () => {
      it('should return extracted contacts for a job', async () => {
        // Arrange
        const jobId = 'test-job-id-123';
        const request = new NextRequest(`http://localhost:3000/api/ai/contact-extraction/jobs/${jobId}/contacts`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `test-${Date.now()}`
          }
        });

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data).toBeValidAPIResponse();
        expect(data.success).toBe(true);
        expect(data.data.contacts).toHaveLength(1);
        expect(data.data.contacts[0]).toContainValidContacts();
        expect(data.data.contacts[0].name).toBe('John Doe');
        expect(data.data.contacts[0].email).toBe('john.doe@technewsoutlet.com');
        expect(data.data.contacts[0].confidence).toBe(0.92);
        expect(data.data.total).toBe(1);
        expect(data.data.page).toBe(1);
        expect(data.data.pageSize).toBe(10);
      });
    });

    describe('POST /api/ai/contact-extraction/jobs/[jobId]/cancel', () => {
      it('should cancel a running job', async () => {
        // Arrange
        const jobId = 'test-job-id-123';
        const request = new NextRequest(`http://localhost:3000/api/ai/contact-extraction/jobs/${jobId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `test-${Date.now()}`
          }
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data).toBeValidAPIResponse();
        expect(data.success).toBe(true);
        expect(data.data.jobId).toBe(jobId);
        expect(data.data.status).toBe('cancelled');
        expect(data.data.cancelledAt).toBeRecent();
      });
    });

    describe('POST /api/ai/contact-extraction/jobs/[jobId]/retry', () => {
      it('should retry a failed job', async () => {
        // Arrange
        const jobId = 'test-job-id-123';
        const { ContactExtractionController } = require('@/app/api/ai/contact-extraction/controller');
        ContactExtractionController.mockImplementation(() => ({
          retryJob: jest.fn().mockResolvedValue(
            new Response(JSON.stringify({
              success: true,
              data: {
                jobId: jobId,
                status: 'pending',
                retryCount: 1,
                createdAt: new Date().toISOString()
              },
              correlationId: 'test-correlation-id',
              timestamp: new Date().toISOString()
            }), { status: 200 })
          )
        }));

        const request = new NextRequest(`http://localhost:3000/api/ai/contact-extraction/jobs/${jobId}/retry`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `test-${Date.now()}`
          }
        });

        // Act
        const response = await POST(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data).toBeValidAPIResponse();
        expect(data.success).toBe(true);
        expect(data.data.jobId).toBe(jobId);
        expect(data.data.status).toBe('pending');
        expect(data.data.retryCount).toBe(1);
      });
    });
  });

  describe('Health and Statistics', () => {
    describe('GET /api/ai/contact-extraction/health', () => {
      it('should return service health status', async () => {
        // Arrange
        const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/health', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `test-${Date.now()}`
          }
        });

        // Act
        const response = await HealthGET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data).toBeValidAPIResponse();
        expect(data.success).toBe(true);
        expect(data.data.status).toBe('healthy');
        expect(data.data.services.openai.status).toBe('healthy');
        expect(data.data.services.anthropic.status).toBe('healthy');
        expect(data.data.services.database.status).toBe('healthy');
        expect(data.data.services.redis.status).toBe('healthy');
        expect(data.data.metrics.activeJobs).toBe(2);
        expect(data.data.metrics.completedJobs).toBe(150);
        expect(data.data.metrics.failedJobs).toBe(3);
        expect(data.data.metrics.averageProcessingTime).toBe(42000);
        expect(data.data.metrics.totalContactsExtracted).toBe(1250);
      });
    });

    describe('GET /api/ai/contact-extraction/statistics', () => {
      it('should return extraction statistics', async () => {
        // Arrange
        const { ContactExtractionController } = require('@/app/api/ai/contact-extraction/controller');
        ContactExtractionController.mockImplementation(() => ({
          getStatistics: jest.fn().mockResolvedValue(
            new Response(JSON.stringify({
              success: true,
              data: {
                totalJobs: 200,
                successfulJobs: 185,
                failedJobs: 15,
                averageConfidence: 0.84,
                totalContactsExtracted: 1500,
                averageProcessingTime: 45000,
                jobsByStatus: {
                  pending: 5,
                  processing: 3,
                  completed: 185,
                  failed: 7
                },
                topSources: [
                  { domain: 'techcrunch.com', contacts: 45 },
                  { domain: 'wired.com', contacts: 32 },
                  { domain: 'reuters.com', contacts: 28 }
                ]
              },
              correlationId: 'test-correlation-id',
              timestamp: new Date().toISOString()
            }), { status: 200 })
          )
        }));

        const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/statistics', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `test-${Date.now()}`
          }
        });

        // Act
        const response = await GET(request);
        const data = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(data).toBeValidAPIResponse();
        expect(data.success).toBe(true);
        expect(data.data.totalJobs).toBe(200);
        expect(data.data.successfulJobs).toBe(185);
        expect(data.data.failedJobs).toBe(15);
        expect(data.data.averageConfidence).toBe(0.84);
        expect(data.data.totalContactsExtracted).toBe(1500);
        expect(data.data.averageProcessingTime).toBe(45000);
        expect(data.data.jobsByStatus.pending).toBe(5);
        expect(data.data.jobsByStatus.processing).toBe(3);
        expect(data.data.jobsByStatus.completed).toBe(185);
        expect(data.data.jobsByStatus.failed).toBe(7);
        expect(data.data.topSources).toHaveLength(3);
        expect(data.data.topSources[0].domain).toBe('techcrunch.com');
        expect(data.data.topSources[0].contacts).toBe(45);
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should reject requests without authentication', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/health', {
        method: 'GET',
        headers: {
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

      // Act
      const response = await HealthGET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
    });

    it('should include proper correlation ID in responses', async () => {
      // Arrange
      const correlationId = 'custom-correlation-id-456';
      const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/health', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': correlationId
        }
      });

      // Act
      const response = await HealthGET(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.correlationId).toBe(correlationId);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON in extraction requests', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: 'invalid-json{'
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
    });

    it('should handle oversized content in extraction requests', async () => {
      // Arrange
      const largeContent = 'x'.repeat(1000000); // 1MB of content
      const extractionRequest = {
        content: largeContent,
        options: { maxContactsPerSource: 5 }
      };

      const request = new NextRequest('http://localhost:3000/api/ai/contact-extraction/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        },
        body: JSON.stringify(extractionRequest)
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data).toBeValidErrorResponse();
      expect(data.success).toBe(false);
    });

    it('should handle invalid job IDs', async () => {
      // Arrange
      const invalidJobId = 'invalid-job-id';
      const request = new NextRequest(`http://localhost:3000/api/ai/contact-extraction/jobs/${invalidJobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-token`,
          'X-Correlation-ID': `test-${Date.now()}`
        }
      });

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
    it('should handle multiple concurrent extraction requests', async () => {
      // Arrange
      const extractionRequests = Array.from({ length: 3 }, (_, i) => {
        const request = {
          urls: [`https://example.com/article${i}`],
          content: `Test content ${i} with contact test${i}@example.com`,
          options: { maxContactsPerSource: 5 }
        };
        
        return new NextRequest('http://localhost:3000/api/ai/contact-extraction/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer test-token`,
            'X-Correlation-ID': `concurrent-extraction-${i}`
          },
          body: JSON.stringify(request)
        });
      });

      // Act
      const startTime = Date.now();
      const responses = await Promise.allSettled(extractionRequests.map(req => POST(req)));
      const endTime = Date.now();

      // Assert
      expect(responses).toHaveLength(3);
      const successfulResponses = responses.filter(r =>
        r.status === 'fulfilled' && r.value.status === 202
      );
      expect(successfulResponses.length).toBe(3);

      // Should complete in reasonable time (concurrent execution)
      expect(endTime - startTime).toBeLessThan(5000);

      // Each response should have unique job ID
      const jobIds = await Promise.all(
        successfulResponses.map(async (r) => {
          const data = await (r as PromiseFulfilledResult<Response>).value.json();
          return data.data.jobId;
        })
      );
      const uniqueIds = new Set(jobIds);
      expect(uniqueIds.size).toBe(3);
    });
  });
});