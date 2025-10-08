/**
 * Duplicate Detector Tests
 */

import { DuplicateDetector } from '../duplicate-detector';
import { ExtractedContact } from '../types';
import { DuplicateType } from '../types';

describe('DuplicateDetector', () => {
  let detector: DuplicateDetector;
  let mockContacts: ExtractedContact[];

  beforeEach(() => {
    detector = new DuplicateDetector();

    mockContacts = [
      {
        id: 'contact-1',
        extractionId: 'extraction-1',
        searchId: 'search-1',
        sourceUrl: 'https://nytimes.com/article1',
        name: 'John Smith',
        title: 'Senior Editor',
        email: 'john.smith@nytimes.com',
        confidenceScore: 0.9,
        relevanceScore: 0.8,
        qualityScore: 0.85,
        extractionMethod: 'AI_BASED' as any,
        socialProfiles: [
          {
            platform: 'twitter',
            handle: '@johnsmith',
            url: 'https://twitter.com/johnsmith',
            verified: true
          }
        ],
        verificationStatus: 'PENDING' as any,
        isDuplicate: false,
        metadata: {
          extractionMethod: 'AI_BASED' as any,
          processingSteps: [],
          confidenceFactors: {
            nameConfidence: 0.9,
            emailConfidence: 0.95,
            titleConfidence: 0.8,
            bioConfidence: 0.7,
            socialConfidence: 0.8,
            overallConfidence: 0.9
          },
          qualityFactors: {
            sourceCredibility: 0.9,
            contentFreshness: 0.8,
            contactCompleteness: 0.85,
            informationConsistency: 0.9,
            overallQuality: 0.85
          }
        },
        createdAt: new Date()
      },
      {
        id: 'contact-2',
        extractionId: 'extraction-2',
        searchId: 'search-1',
        sourceUrl: 'https://washingtonpost.com/article1',
        name: 'John Smith',
        title: 'Senior Editor at NYT',
        email: 'john.smith@nytimes.com',
        confidenceScore: 0.85,
        relevanceScore: 0.75,
        qualityScore: 0.8,
        extractionMethod: 'AI_BASED' as any,
        socialProfiles: [],
        verificationStatus: 'PENDING' as any,
        isDuplicate: false,
        metadata: {
          extractionMethod: 'AI_BASED' as any,
          processingSteps: [],
          confidenceFactors: {
            nameConfidence: 0.9,
            emailConfidence: 0.95,
            titleConfidence: 0.8,
            bioConfidence: 0.7,
            socialConfidence: 0,
            overallConfidence: 0.85
          },
          qualityFactors: {
            sourceCredibility: 0.85,
            contentFreshness: 0.75,
            contactCompleteness: 0.7,
            informationConsistency: 0.8,
            overallQuality: 0.8
          }
        },
        createdAt: new Date()
      },
      {
        id: 'contact-3',
        extractionId: 'extraction-3',
        searchId: 'search-1',
        sourceUrl: 'https://cnn.com/article1',
        name: 'Sarah Johnson',
        title: 'Technology Reporter',
        email: 'sarah.j@cnn.com',
        confidenceScore: 0.8,
        relevanceScore: 0.9,
        qualityScore: 0.85,
        extractionMethod: 'AI_BASED' as any,
        socialProfiles: [],
        verificationStatus: 'PENDING' as any,
        isDuplicate: false,
        metadata: {
          extractionMethod: 'AI_BASED' as any,
          processingSteps: [],
          confidenceFactors: {
            nameConfidence: 0.85,
            emailConfidence: 0.9,
            titleConfidence: 0.8,
            bioConfidence: 0.7,
            socialConfidence: 0,
            overallConfidence: 0.8
          },
          qualityFactors: {
            sourceCredibility: 0.9,
            contentFreshness: 0.8,
            contactCompleteness: 0.75,
            informationConsistency: 0.85,
            overallQuality: 0.85
          }
        },
        createdAt: new Date()
      }
    ];
  });

  describe('detectDuplicates', () => {
    it('should detect email duplicates', () => {
      const result = detector.detectDuplicates(mockContacts);

      expect(result.totalDuplicates).toBe(1);
      expect(result.uniqueContacts).toHaveLength(2);
      expect(result.duplicateGroups).toHaveLength(1);

      const duplicateGroup = result.duplicateGroups[0];
      expect(duplicateGroup.duplicateType).toBe(DuplicateType.EMAIL);
      expect(duplicateGroup.contacts).toContain('contact-1');
      expect(duplicateGroup.contacts).toContain('contact-2');
    });

    it('should detect no duplicates in unique contacts', () => {
      const uniqueContacts = [mockContacts[0], mockContacts[2]]; // Remove the duplicate
      const result = detector.detectDuplicates(uniqueContacts);

      expect(result.totalDuplicates).toBe(0);
      expect(result.uniqueContacts).toHaveLength(2);
      expect(result.duplicateGroups).toHaveLength(0);
    });

    it('should calculate duplicate rate correctly', () => {
      const result = detector.detectDuplicates(mockContacts);

      expect(result.duplicateRate).toBeCloseTo(1/3, 2); // 1 duplicate out of 3 contacts
    });

    it('should handle empty input', () => {
      const result = detector.detectDuplicates([]);

      expect(result.totalDuplicates).toBe(0);
      expect(result.uniqueContacts).toHaveLength(0);
      expect(result.duplicateGroups).toHaveLength(0);
      expect(result.duplicateRate).toBe(0);
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate high similarity for identical emails', () => {
      const similarity = detector.calculateSimilarity(mockContacts[0], mockContacts[1]);

      expect(similarity.overall).toBeGreaterThan(0.8);
      expect(similarity.email).toBe(1.0);
      expect(similarity.name).toBe(1.0);
    });

    it('should calculate lower similarity for different contacts', () => {
      const similarity = detector.calculateSimilarity(mockContacts[0], mockContacts[2]);

      expect(similarity.overall).toBeLessThan(0.5);
      expect(similarity.email).toBe(0);
      expect(similarity.name).toBeLessThan(0.5);
    });

    it('should handle name variations', () => {
      const contactWithVariation = {
        ...mockContacts[2],
        name: 'S. Johnson',
        title: 'Tech Reporter'
      };

      const similarity = detector.calculateSimilarity(mockContacts[2], contactWithVariation);

      expect(similarity.name).toBeGreaterThan(0.7);
    });

    it('should detect outlet similarity', () => {
      const sameOutletContact = {
        ...mockContacts[2],
        name: 'Different Name',
        email: 'different@nytimes.com',
        sourceUrl: 'https://nytimes.com/article2'
      };

      const similarity = detector.calculateSimilarity(mockContacts[0], sameOutletContact);

      expect(similarity.outlet).toBe(1.0);
    });
  });

  describe('email comparison', () => {
    it('should match exact emails', () => {
      expect(detector['compareEmails']('john@example.com', 'john@example.com')).toBe(true);
    });

    it('should handle case insensitive matching', () => {
      expect(detector['compareEmails']('John@Example.COM', 'john@example.com')).toBe(true);
    });

    it('should handle common variations', () => {
      expect(detector['compareEmails']('john.smith@example.com', 'john_smith@example.com')).toBe(true);
      expect(detector['compareEmails']('john.smith@example.com', 'john@example.com')).toBe(true);
      expect(detector['compareEmails']('john.smith@example.com', 'john+tag@example.com')).toBe(true);
    });

    it('should reject different emails', () => {
      expect(detector['compareEmails']('john@example.com', 'jane@example.com')).toBe(false);
      expect(detector['compareEmails']('john@example.com', 'john@test.com')).toBe(false);
    });

    it('should handle undefined inputs', () => {
      expect(detector['compareEmails']('', 'john@example.com')).toBe(false);
      expect(detector['compareEmails']('john@example.com', '')).toBe(false);
      expect(detector['compareEmails']('', '')).toBe(false);
    });
  });

  describe('name similarity', () => {
    it('should match identical names', () => {
      const similarity = detector['calculateNameSimilarity']('John Smith', 'John Smith');
      expect(similarity).toBe(1.0);
    });

    it('should handle reversed names', () => {
      const similarity = detector['calculateNameSimilarity']('John Smith', 'Smith John');
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should handle names with middle initials', () => {
      const similarity = detector['calculateNameSimilarity']('John A. Smith', 'John Smith');
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should handle common nicknames', () => {
      const similarity = detector['calculateNameSimilarity']('William Smith', 'Bill Smith');
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should calculate low similarity for different names', () => {
      const similarity = detector['calculateNameSimilarity']('John Smith', 'Sarah Johnson');
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('title similarity', () => {
    it('should match identical titles', () => {
      const similarity = detector['calculateTitleSimilarity']('Senior Editor', 'Senior Editor');
      expect(similarity).toBe(1.0);
    });

    it('should handle hierarchical variations', () => {
      const similarity = detector['calculateTitleSimilarity']('Senior Editor', 'Editor');
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should handle word reordering', () => {
      const similarity = detector['calculateTitleSimilarity']('Technology Reporter', 'Reporter covering Technology');
      expect(similarity).toBeGreaterThan(0.7);
    });
  });

  describe('outlet similarity', () => {
    it('should match identical domains', () => {
      const similarity = detector['calculateOutletSimilarity'](
        'https://nytimes.com/article1',
        'https://nytimes.com/article2'
      );
      expect(similarity).toBe(1.0);
    });

    it('should handle subdomain relationships', () => {
      const similarity = detector['calculateOutletSimilarity'](
        'https://www.nytimes.com/article',
        'https://nytimes.com/article'
      );
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('should recognize news organization variations', () => {
      const similarity = detector['calculateOutletSimilarity'](
        'https://wsj.com/article',
        'https://wallstreetjournal.com/article'
      );
      expect(similarity).toBeGreaterThan(0.9);
    });
  });

  describe('mergeDuplicateGroup', () => {
    it('should merge duplicate contacts effectively', () => {
      const duplicateGroup = {
        id: 'test-group',
        contacts: ['contact-1', 'contact-2'],
        similarityScore: 0.9,
        duplicateType: DuplicateType.EMAIL,
        confidenceScore: 0.9,
        selectedContact: 'contact-1',
        reasoning: 'Email addresses match'
      };

      const mergedContact = detector.mergeDuplicateGroup(duplicateGroup, mockContacts);

      expect(mergedContact.name).toBe('John Smith'); // Highest confidence contact
      expect(mergedContact.email).toBe('john.smith@nytimes.com');
      expect(mergedContact.socialProfiles).toBeDefined();
    });

    it('should prefer higher confidence contact', () => {
      const lowerConfidenceContact = {
        ...mockContacts[1],
        confidenceScore: 0.7,
        title: 'Editor' // Less specific title
      };

      const duplicateGroup = {
        id: 'test-group',
        contacts: ['contact-1', 'contact-2'],
        similarityScore: 0.9,
        duplicateType: DuplicateType.EMAIL,
        confidenceScore: 0.9,
        selectedContact: 'contact-1',
        reasoning: 'Email addresses match'
      };

      const mergedContact = detector.mergeDuplicateGroup(duplicateGroup, [
        mockContacts[0],
        lowerConfidenceContact
      ]);

      expect(mergedContact.confidenceScore).toBe(0.9);
      expect(mergedContact.title).toBe('Senior Editor');
    });
  });

  describe('getDuplicateStatistics', () => {
    it('should return duplicate detection statistics', () => {
      const stats = detector.getDuplicateStatistics();

      expect(stats).toHaveProperty('totalGroupsProcessed');
      expect(stats).toHaveProperty('averageGroupSize');
      expect(stats).toHaveProperty('commonDuplicateTypes');
      expect(stats).toHaveProperty('averageSimilarityScore');
      expect(stats).toHaveProperty('processingTimeMs');
    });
  });

  describe('Levenshtein similarity', () => {
    it('should calculate string similarity correctly', () => {
      const similarity = detector['calculateLevenshteinSimilarity']('test', 'test');
      expect(similarity).toBe(1.0);

      const similarity2 = detector['calculateLevenshteinSimilarity']('test', 'tost');
      expect(similarity2).toBe(0.75);

      const similarity3 = detector['calculateLevenshteinSimilarity']('test', 'completely different');
      expect(similarity3).toBeLessThan(0.5);
    });
  });
});