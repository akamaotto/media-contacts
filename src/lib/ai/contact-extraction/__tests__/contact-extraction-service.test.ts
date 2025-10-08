/**
 * Contact Extraction Service Tests
 */

import { ContactExtractionService } from '../contact-extraction-service';
import { ContactExtractionRequest } from '../types';

// Mock all dependencies
jest.mock('../content-parser');
jest.mock('../ai-identifier');
jest.mock('../email-validator');
jest.mock('../social-detector');
jest.mock('../confidence-scorer');
jest.mock('../duplicate-detector');
jest.mock('../quality-assessor');
jest.mock('../extraction-cache');
jest.mock('../../../prisma', () => ({
  prisma: {
    aiExtractionJob: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    aiExtractedContact: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    aiExtractionLog: {
      create: jest.fn()
    }
  }
}));

describe('ContactExtractionService', () => {
  let service: ContactExtractionService;
  let mockRequest: ContactExtractionRequest;

  beforeEach(() => {
    service = new ContactExtractionService({
      enabled: true,
      ttl: 60000, // 1 minute for tests
      maxSize: 100,
      cleanupInterval: 30000 // 30 seconds
    });

    mockRequest = {
      searchId: 'test-search-123',
      sources: [
        {
          url: 'https://example.com/article1',
          type: 'web_content',
          priority: 'high'
        },
        {
          url: 'https://example.com/article2',
          type: 'web_content',
          priority: 'medium'
        }
      ],
      options: {
        enableAIEnhancement: true,
        enableEmailValidation: true,
        enableSocialDetection: true,
        enableDuplicateDetection: true,
        enableQualityAssessment: true,
        enableCaching: true,
        confidenceThreshold: 0.5,
        maxContactsPerSource: 10,
        processingTimeout: 30000,
        batchSize: 5,
        includeBio: true,
        includeSocialProfiles: true,
        strictValidation: false
      },
      userId: 'test-user-123'
    };

    jest.clearAllMocks();
  });

  describe('extractContacts', () => {
    it('should extract contacts successfully', async () => {
      // Mock the entire pipeline
      const mockParsedContent = {
        url: 'https://example.com/article1',
        title: 'Test Article',
        content: 'This is a test article about technology.',
        metadata: { wordCount: 100, readingTime: 1 },
        links: [],
        images: [],
        language: 'en'
      };

      const mockExtractedContacts = [
        {
          id: 'contact-1',
          extractionId: '',
          searchId: 'test-search-123',
          sourceUrl: 'https://example.com/article1',
          name: 'John Smith',
          title: 'Technology Reporter',
          email: 'john.smith@example.com',
          confidenceScore: 0.8,
          relevanceScore: 0.7,
          qualityScore: 0.75,
          extractionMethod: 'AI_BASED' as any,
          verificationStatus: 'PENDING' as any,
          isDuplicate: false,
          metadata: {
            extractionMethod: 'AI_BASED' as any,
            processingSteps: [],
            confidenceFactors: {
              nameConfidence: 0.9,
              emailConfidence: 0.8,
              titleConfidence: 0.7,
              bioConfidence: 0.6,
              socialConfidence: 0.5,
              overallConfidence: 0.8
            },
            qualityFactors: {
              sourceCredibility: 0.8,
              contentFreshness: 0.7,
              contactCompleteness: 0.75,
              informationConsistency: 0.8,
              overallQuality: 0.75
            }
          },
          createdAt: new Date()
        }
      ];

      // Mock database operations
      const { prisma } = require('../../../prisma');
      prisma.aiExtractionJob.create.mockResolvedValue({
        id: 'job-123',
        extractionId: 'ext-123',
        status: 'PROCESSING'
      });

      prisma.aiExtractedContact.create.mockResolvedValue({});
      prisma.aiExtractedContact.updateMany.mockResolvedValue({ count: 1 });
      prisma.aiExtractionLog.create.mockResolvedValue({});
      prisma.aiExtractionJob.update.mockResolvedValue({});

      // Mock service methods
      const mockContentParser = require('../content-parser').WebContentParser;
      mockContentParser.mockImplementation(() => ({
        parseContent: jest.fn().mockResolvedValue(mockParsedContent)
      }));

      const mockAIIdentifier = require('../ai-identifier').AIContactIdentifier;
      mockAIIdentifier.mockImplementation(() => ({
        extractContacts: jest.fn().mockResolvedValue(mockExtractedContacts)
      }));

      const mockEmailValidator = require('../email-validator').EmailValidator;
      mockEmailValidator.mockImplementation(() => ({
        validateEmail: jest.fn().mockResolvedValue({
          email: 'john.smith@example.com',
          isValid: true,
          isDisposable: false,
          spamScore: 0.1
        })
      }));

      const mockSocialDetector = require('../social-detector').SocialMediaDetector;
      mockSocialDetector.mockImplementation(() => ({
        detectSocialProfiles: jest.fn().mockReturnValue([])
      }));

      const mockConfidenceScorer = require('../confidence-scorer').ConfidenceScorer;
      mockConfidenceScorer.mockImplementation(() => ({
        calculateConfidenceScore: jest.fn().mockReturnValue({
          confidenceScore: 0.8,
          confidenceFactors: {
            nameConfidence: 0.9,
            emailConfidence: 0.8,
            titleConfidence: 0.7,
            bioConfidence: 0.6,
            socialConfidence: 0.5,
            overallConfidence: 0.8
          },
          reasoning: ['High confidence contact'],
          recommendations: []
        }),
        calculateQualityScore: jest.fn().mockReturnValue({
          qualityScore: 0.75,
          qualityFactors: {
            sourceCredibility: 0.8,
            contentFreshness: 0.7,
            contactCompleteness: 0.75,
            informationConsistency: 0.8,
            overallQuality: 0.75
          },
          reasoning: ['Good quality'],
          improvementSuggestions: []
        }),
        calculateRelevanceScore: jest.fn().mockReturnValue(0.7)
      }));

      const mockDuplicateDetector = require('../duplicate-detector').DuplicateDetector;
      mockDuplicateDetector.mockImplementation(() => ({
        detectDuplicates: jest.fn().mockReturnValue({
          duplicateGroups: [],
          uniqueContacts: mockExtractedContacts,
          totalDuplicates: 0,
          duplicateRate: 0
        })
      }));

      const mockQualityAssessor = require('../quality-assessor').QualityAssessor;
      mockQualityAssessor.mockImplementation(() => ({
        assessContentQuality: jest.fn().mockResolvedValue({
          url: 'https://example.com/article1',
          credibility: 0.8,
          relevance: 0.7,
          freshness: 0.9,
          authority: 0.8,
          spamScore: 0.1,
          overallScore: 0.8
        })
      }));

      const mockCache = require('../extraction-cache').ExtractionCache;
      mockCache.mockImplementation(() => ({
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue()
      }));

      const result = await service.extractContacts(mockRequest);

      expect(result.extractionId).toBeDefined();
      expect(result.searchId).toBe('test-search-123');
      expect(result.status).toBe('COMPLETED');
      expect(result.sourcesProcessed).toBe(2);
      expect(result.contactsFound).toBeGreaterThan(0);
      expect(result.averageConfidence).toBeGreaterThan(0);
      expect(result.averageQuality).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it('should handle processing errors gracefully', async () => {
      const { prisma } = require('../../../prisma');
      prisma.aiExtractionJob.create.mockRejectedValue(new Error('Database error'));

      await expect(service.extractContacts(mockRequest))
        .rejects.toThrow('Contact extraction failed');
    });

    it('should skip low-quality content in strict validation mode', async () => {
      const strictRequest = {
        ...mockRequest,
        options: {
          ...mockRequest.options,
          strictValidation: true
        }
      };

      // Mock content parser to return content
      const mockContentParser = require('../content-parser').WebContentParser;
      mockContentParser.mockImplementation(() => ({
        parseContent: jest.fn().mockResolvedValue({
          url: 'https://example.com/article1',
          content: 'Low quality content',
          metadata: { wordCount: 10, readingTime: 1 }
        })
      }));

      // Mock quality assessor to return low score
      const mockQualityAssessor = require('../quality-assessor').QualityAssessor;
      mockQualityAssessor.mockImplementation(() => ({
        assessContentQuality: jest.fn().mockResolvedValue({
          url: 'https://example.com/article1',
          credibility: 0.2,
          relevance: 0.1,
          freshness: 0.3,
          authority: 0.2,
          spamScore: 0.8,
          overallScore: 0.2
        })
      }));

      const { prisma } = require('../../../prisma');
      prisma.aiExtractionJob.create.mockResolvedValue({
        id: 'job-123',
        extractionId: 'ext-123',
        status: 'PROCESSING'
      });

      await expect(service.extractContacts(strictRequest))
        .rejects.toThrow('Content quality too low');
    });

    it('should use cached results when available', async () => {
      const mockCachedEntry = {
        id: 'cache-123',
        contentHash: 'hash-123',
        sourceUrl: 'https://example.com/article1',
        extractedData: [
          {
            id: 'cached-contact-1',
            extractionId: '',
            searchId: '',
            sourceUrl: 'https://example.com/article1',
            name: 'Cached Contact',
            confidenceScore: 0.8,
            relevanceScore: 0.7,
            qualityScore: 0.75,
            extractionMethod: 'AI_BASED' as any,
            verificationStatus: 'PENDING' as any,
            isDuplicate: false,
            metadata: {
              extractionMethod: 'AI_BASED' as any,
              processingSteps: []
            },
            createdAt: new Date()
          }
        ],
        contactCount: 1,
        expiresAt: new Date(Date.now() + 60000),
        accessCount: 1,
        lastAccessedAt: new Date(),
        createdAt: new Date()
      };

      const mockCache = require('../extraction-cache').ExtractionCache;
      mockCache.mockImplementation(() => ({
        get: jest.fn().mockResolvedValue(mockCachedEntry),
        set: jest.fn().mockResolvedValue()
      }));

      const { prisma } = require('../../../prisma');
      prisma.aiExtractionJob.create.mockResolvedValue({
        id: 'job-123',
        extractionId: 'ext-123',
        status: 'PROCESSING'
      });
      prisma.aiExtractedContact.create.mockResolvedValue({});
      prisma.aiExtractionLog.create.mockResolvedValue({});
      prisma.aiExtractionJob.update.mockResolvedValue({});

      const result = await service.extractContacts(mockRequest);

      expect(result.contactsFound).toBe(1);
      expect(result.contactsImported).toBe(1);
    });
  });

  describe('getExtractionStatistics', () => {
    it('should return extraction statistics', async () => {
      const { prisma } = require('../../../prisma');
      prisma.aiExtractionJob.findMany.mockResolvedValue([
        {
          id: 'job-1',
          status: 'COMPLETED',
          contactsFound: 5,
          processingTimeMs: 10000,
          extractedContacts: [
            { confidenceScore: 0.8 },
            { confidenceScore: 0.9 },
            { confidenceScore: 0.7 }
          ]
        }
      ]);

      const stats = await service.getExtractionStatistics('test-user-123');

      expect(stats.totalExtractions).toBe(1);
      expect(stats.successfulExtractions).toBe(1);
      expect(stats.averageContactsPerSource).toBeGreaterThan(0);
      expect(stats.averageConfidence).toBeGreaterThan(0);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should handle user-specific statistics', async () => {
      const { prisma } = require('../../../prisma');
      prisma.aiExtractionJob.findMany.mockResolvedValue([]);

      const stats = await service.getExtractionStatistics('specific-user-123');

      expect(stats.totalExtractions).toBe(0);
      expect(stats.successfulExtractions).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources properly', async () => {
      const mockCache = require('../extraction-cache').ExtractionCache;
      const mockDestroy = jest.fn();
      mockCache.mockImplementation(() => ({
        destroy: mockDestroy
      }));

      const serviceWithMock = new ContactExtractionService();
      await serviceWithMock.cleanup();

      expect(mockDestroy).toHaveBeenCalled();
    });
  });
});