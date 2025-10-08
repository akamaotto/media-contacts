/**
 * Confidence Scorer Tests
 */

import { ConfidenceScorer } from '../confidence-scorer';
import { ExtractedContact, ParsedContent } from '../types';

describe('ConfidenceScorer', () => {
  let scorer: ConfidenceScorer;
  let mockContact: ExtractedContact;
  let mockContent: ParsedContent;

  beforeEach(() => {
    scorer = new ConfidenceScorer();

    mockContact = {
      id: 'test-contact-1',
      extractionId: 'test-extraction-1',
      searchId: 'test-search-1',
      sourceUrl: 'https://example.com/article',
      name: 'John Smith',
      title: 'Senior Editor',
      bio: 'John Smith is a senior editor with 10 years of experience covering technology news.',
      email: 'john.smith@example.com',
      confidenceScore: 0,
      relevanceScore: 0,
      qualityScore: 0,
      extractionMethod: 'AI_BASED' as any,
      socialProfiles: [
        {
          platform: 'twitter',
          handle: '@johnsmith',
          url: 'https://twitter.com/johnsmith',
          verified: true,
          followers: 5000
        }
      ],
      verificationStatus: 'PENDING' as any,
      isDuplicate: false,
      metadata: {
        extractionMethod: 'AI_BASED' as any,
        processingSteps: [],
        confidenceFactors: {
          nameConfidence: 0,
          emailConfidence: 0,
          titleConfidence: 0,
          bioConfidence: 0,
          socialConfidence: 0,
          overallConfidence: 0
        },
        qualityFactors: {
          sourceCredibility: 0,
          contentFreshness: 0,
          contactCompleteness: 0,
          informationConsistency: 0,
          overallQuality: 0
        }
      },
      createdAt: new Date()
    };

    mockContent = {
      url: 'https://example.com/article',
      title: 'Tech News Article',
      content: 'This is a tech news article written by John Smith, who is a senior editor at Tech Daily.',
      metadata: {
        title: 'Tech News Article',
        author: 'John Smith',
        wordCount: 500,
        readingTime: 2,
        domain: 'example.com'
      },
      links: [],
      images: [],
      language: 'en'
    };
  });

  describe('calculateConfidenceScore', () => {
    it('should calculate high confidence for complete contact', () => {
      const result = scorer.calculateConfidenceScore(mockContact, {
        content: mockContent,
        sourceCredibility: 0.9,
        contentFreshness: 0.8
      });

      expect(result.confidenceScore).toBeGreaterThan(0.8);
      expect(result.confidenceFactors.nameConfidence).toBeGreaterThan(0.8);
      expect(result.confidenceFactors.emailConfidence).toBeGreaterThan(0.8);
      expect(result.confidenceFactors.titleConfidence).toBeGreaterThan(0.7);
      expect(result.reasoning).toContain('High confidence contact');
    });

    it('should calculate lower confidence for incomplete contact', () => {
      const incompleteContact = {
        ...mockContact,
        name: 'John',
        title: undefined,
        email: undefined,
        bio: undefined,
        socialProfiles: []
      };

      const result = scorer.calculateConfidenceScore(incompleteContact, {
        content: mockContent,
        sourceCredibility: 0.9,
        contentFreshness: 0.8
      });

      expect(result.confidenceScore).toBeLessThan(0.6);
      expect(result.recommendations).toContain('Add professional title if available');
      expect(result.recommendations).toContain('Add email address if available');
    });

    it('should handle suspicious name patterns', () => {
      const suspiciousContact = {
        ...mockContact,
        name: 'test123',
        email: 'spam@tempmail.com'
      };

      const result = scorer.calculateConfidenceScore(suspiciousContact, {
        content: mockContent,
        sourceCredibility: 0.9,
        contentFreshness: 0.8
      });

      expect(result.confidenceScore).toBeLessThan(0.5);
      expect(result.reasoning).toContain('suspicious patterns');
    });
  });

  describe('calculateQualityScore', () => {
    it('should calculate high quality for authoritative source', () => {
      const result = scorer.calculateQualityScore(mockContact, {
        content: mockContent,
        sourceCredibility: 0.9,
        contentFreshness: 0.8,
        consistencyScore: 0.85
      });

      expect(result.qualityScore).toBeGreaterThan(0.8);
      expect(result.qualityFactors.sourceCredibility).toBe(0.9);
      expect(result.qualityFactors.contentFreshness).toBe(0.8);
      expect(result.reasoning).toContain('High quality contact');
    });

    it('should calculate lower quality for questionable source', () => {
      const result = scorer.calculateQualityScore(mockContact, {
        content: mockContent,
        sourceCredibility: 0.3,
        contentFreshness: 0.2,
        consistencyScore: 0.4
      });

      expect(result.qualityScore).toBeLessThan(0.6);
      expect(result.improvementSuggestions).toContain('Review and reconcile conflicting information');
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should calculate high relevance for journalist content', () => {
      const relevantContent = {
        ...mockContent,
        content: 'By John Smith. John Smith is a reporter covering technology for the New York Times. Email john.smith@nytimes.com.',
        metadata: {
          ...mockContent.metadata,
          author: 'John Smith'
        }
      };

      const score = scorer.calculateRelevanceScore(mockContact, relevantContent);

      expect(score).toBeGreaterThan(0.8);
    });

    it('should boost relevance with target criteria', () => {
      const score = scorer.calculateRelevanceScore(mockContact, mockContent, {
        beats: ['technology'],
        outlets: ['example.com'],
        languages: ['en']
      });

      expect(score).toBeGreaterThan(0.6);
    });

    it('should calculate lower relevance for generic content', () => {
      const genericContent = {
        ...mockContent,
        content: 'This is a generic article without specific contact information.',
        metadata: {
          ...mockContent.metadata,
          author: undefined
        }
      };

      const score = scorer.calculateRelevanceScore(mockContact, genericContent);

      expect(score).toBeLessThan(0.6);
    });
  });

  describe('name validation', () => {
    it('should validate realistic names', () => {
      expect(scorer['isRealisticName']('John Smith')).toBe(true);
      expect(scorer['isRealisticName']('Mary Jane Johnson')).toBe(true);
      expect(scorer['isRealisticName']('Jean-Claude Van Damme')).toBe(true);
    });

    it('should reject unrealistic names', () => {
      expect(scorer['isRealisticName']('test123')).toBe(false);
      expect(scorer['isRealisticName']('ALLCAPS')).toBe(false);
      expect(scorer['isRealisticName']('a')).toBe(false);
      expect(scorer['isRealisticName']('')).toBe(false);
    });

    it('should detect title contamination', () => {
      expect(scorer['hasTitleContamination']('John Smith Editor')).toBe(true);
      expect(scorer['hasTitleContamination']('Dr. John Smith')).toBe(true);
      expect(scorer['hasTitleContamination']('John Smith Jr.')).toBe(true);
    });

    it('should detect suspicious patterns', () => {
      expect(scorer['hasSuspiciousPatterns']('testuser')).toBe(true);
      expect(scorer['hasSuspiciousPatterns']('fake_contact')).toBe(true);
      expect(scorer['hasSuspiciousPatterns']('AAAAAA')).toBe(true);
    });
  });

  describe('email validation', () => {
    it('should identify professional emails', () => {
      expect(scorer['isProfessionalEmail']('john.smith@example.com')).toBe(true);
      expect(scorer['isProfessionalEmail']('jsmith@example.com')).toBe(true);
      expect(scorer['isProfessionalEmail']('j.smith@example.com')).toBe(true);
    });

    it('should identify generic emails', () => {
      expect(scorer['isGenericEmail']('info@example.com')).toBe(true);
      expect(scorer['isGenericEmail']('contact@example.com')).toBe(true);
      expect(scorer['isGenericEmail']('editor@example.com')).toBe(true);
    });

    it('should identify credible domains', () => {
      expect(scorer['isCredibleDomain']('nytimes.com')).toBe(true);
      expect(scorer['isCredibleDomain']('cnn.com')).toBe(true);
      expect(scorer['isCredibleDomain']('harvard.edu')).toBe(true);
    });

    it('should identify suspicious domains', () => {
      expect(scorer['isSuspiciousDomain']('example.tk')).toBe(true);
      expect(scorer['isSuspiciousDomain']('spam.xyz')).toBe(true);
    });
  });

  describe('title validation', () => {
    it('should identify professional titles', () => {
      expect(scorer['isProfessionalTitle']('Senior Editor')).toBe(true);
      expect(scorer['isProfessionalTitle']('Technology Reporter')).toBe(true);
      expect(scorer['isProfessionalTitle']('Managing Director')).toBe(true);
    });

    it('should reject non-professional titles', () => {
      expect(scorer['isProfessionalTitle']('Software Developer')).toBe(false);
      expect(scorer['isProfessionalTitle']('Sales Manager')).toBe(false);
    });
  });

  describe('getScoringStatistics', () => {
    it('should return scoring statistics', () => {
      const stats = scorer.getScoringStatistics();

      expect(stats).toHaveProperty('totalScores');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('averageQuality');
      expect(stats).toHaveProperty('distribution');
      expect(stats).toHaveProperty('factorWeights');
    });
  });
});