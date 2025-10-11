/**
 * AI Contact Identifier Tests
 * Comprehensive test suite for AI-powered contact identification
 */

import { AIContactIdentifier } from '../ai-identifier';
import { ParsedContent, ExtractedContact } from '../types';
import { setupMockServices, configureMockBehavior } from '@/tests/mocks/ai-services.mock';
import { createMockMediaContact } from '@/tests/utils/test-helpers';

// Mock AI service manager
jest.mock('../services/index', () => ({
  aiServiceManager: {
    executeQuery: jest.fn()
  }
}));

describe('AIContactIdentifier', () => {
  let identifier: AIContactIdentifier;

  beforeEach(() => {
    identifier = new AIContactIdentifier();
    setupMockServices();
    jest.clearAllMocks();
  });

  describe('extractContacts', () => {
    const createMockContent = (overrides: Partial<ParsedContent> = {}): ParsedContent => ({
      url: 'https://example.com/article',
      title: 'Tech Article',
      content: 'John Doe is a technology journalist. Contact him at john.doe@example.com.',
      author: 'Jane Smith',
      publishDate: new Date('2024-01-01'),
      metadata: {
        wordCount: 100,
        language: 'en',
        domain: 'example.com'
      },
      links: [
        { url: 'https://twitter.com/johndoe', text: 'Twitter' },
        { url: 'mailto:john.doe@example.com', text: 'Email' }
      ],
      images: [],
      ...overrides
    });

    it('should extract contacts from simple content', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            role: 'technology journalist',
            outlet: 'Tech News',
            confidence: 0.85,
            source: 'ai_extraction',
            context: 'John Doe is a technology journalist'
          }
        ],
        metadata: {
          service: 'openai',
          model: 'gpt-4',
          processingTime: 1500
        }
      });

      const content = createMockContent();
      const result = await identifier.extractContacts(content);

      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('John');
      expect(result[0].lastName).toBe('Doe');
      expect(result[0].email).toBe('john.doe@example.com');
      expect(result[0].confidence).toBe(0.85);
    });

    it('should extract multiple contacts from content', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            role: 'technology journalist',
            confidence: 0.85
          },
          {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            role: 'editor',
            confidence: 0.90
          }
        ],
        metadata: {
          service: 'anthropic',
          model: 'claude-3-sonnet',
          processingTime: 1200
        }
      });

      const content = createMockContent({
        content: 'John Doe (john.doe@example.com) and Jane Smith (jane.smith@example.com) are our tech journalists.'
      });
      const result = await identifier.extractContacts(content);

      expect(result).toHaveLength(2);
      expect(result[0].firstName).toBe('John');
      expect(result[1].firstName).toBe('Jane');
    });

    it('should respect maxContacts limit', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: Array.from({ length: 15 }, (_, i) => ({
          firstName: `Contact${i}`,
          lastName: 'Test',
          email: `contact${i}@example.com`,
          confidence: 0.8
        })),
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const content = createMockContent();
      const result = await identifier.extractContacts(content, { maxContacts: 5 });

      expect(result).toHaveLength(5);
    });

    it('should include bio when requested', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            bio: 'Senior technology correspondent with 15 years of experience covering AI and startups.',
            confidence: 0.88
          }
        ],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const content = createMockContent();
      const result = await identifier.extractContacts(content, { includeBio: true });

      expect(result[0]).toHaveProperty('bio');
      expect(result[0].bio).toContain('Senior technology correspondent');
    });

    it('should include social profiles when requested', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            socialProfiles: {
              twitter: '@johndoe',
              linkedin: 'linkedin.com/in/johndoe'
            },
            confidence: 0.85
          }
        ],
        metadata: { service: 'anthropic', model: 'claude-3-sonnet' }
      });

      const content = createMockContent();
      const result = await identifier.extractContacts(content, { includeSocialProfiles: true });

      expect(result[0]).toHaveProperty('socialProfiles');
      expect(result[0].socialProfiles.twitter).toBe('@johndoe');
      expect(result[0].socialProfiles.linkedin).toBe('linkedin.com/in/johndoe');
    });

    it('should apply strict validation when enabled', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'invalid-email', // Invalid email format
            confidence: 0.6 // Low confidence
          },
          {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@example.com',
            confidence: 0.9
          }
        ],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const content = createMockContent();
      const result = await identifier.extractContacts(content, { strictValidation: true });

      // Should filter out invalid contacts
      expect(result).toHaveLength(1);
      expect(result[0].firstName).toBe('Jane');
      expect(result[0].email).toBe('jane.smith@example.com');
    });

    it('should handle content with no contacts', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: [],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const content = createMockContent({
        content: 'This is a general article about technology trends with no specific contacts mentioned.'
      });
      const result = await identifier.extractContacts(content);

      expect(result).toHaveLength(0);
    });

    it('should handle malformed AI responses gracefully', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: null, // Malformed response
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const content = createMockContent();
      const result = await identifier.extractContacts(content);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('should handle AI service failures', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockRejectedValue(new Error('AI service unavailable'));

      const content = createMockContent();
      const result = await identifier.extractContacts(content);

      expect(result).toHaveLength(0);
    });
  });

  describe('validateContact', () => {
    it('should validate contact with complete information', () => {
      const contact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        confidence: 0.85
      } as ExtractedContact;

      const result = identifier.validateContact(contact, true);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject contact with invalid email', () => {
      const contact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        confidence: 0.85
      } as ExtractedContact;

      const result = identifier.validateContact(contact, true);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject contact with low confidence in strict mode', () => {
      const contact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        confidence: 0.3
      } as ExtractedContact;

      const result = identifier.validateContact(contact, true);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Confidence too low');
    });

    it('should accept low confidence in non-strict mode', () => {
      const contact = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        confidence: 0.3
      } as ExtractedContact;

      const result = identifier.validateContact(contact, false);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require name in strict mode', () => {
      const contact = {
        email: 'john.doe@example.com',
        confidence: 0.85
      } as ExtractedContact;

      const result = identifier.validateContact(contact, true);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing name information');
    });
  });

  describe('processContent', () => {
    it('should chunk large content appropriately', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            confidence: 0.85
          }
        ],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      // Create large content (over 2000 tokens)
      const largeContent = 'John Doe is a journalist. '.repeat(500);
      const content = createMockContent({ content: largeContent });

      const result = await identifier.extractContacts(content);

      expect(aiServiceManager.executeQuery).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('should handle content with special characters', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: [
          {
            firstName: 'José',
            lastName: 'García',
            email: 'jose.garcia@español.com',
            confidence: 0.85
          }
        ],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const content = createMockContent({
        content: 'José García (jose.garcia@español.com) es nuestro corresponsal.'
      });

      const result = await identifier.extractContacts(content);

      expect(result[0].firstName).toBe('José');
      expect(result[0].lastName).toBe('García');
      expect(result[0].email).toBe('jose.garcia@español.com');
    });

    it('should extract contacts from structured content', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@technews.com',
            phone: '+1-555-0123',
            role: 'Senior Technology Correspondent',
            outlet: 'Tech News Daily',
            confidence: 0.92
          }
        ],
        metadata: { service: 'anthropic', model: 'claude-3-sonnet' }
      });

      const structuredContent = `
        <div class="author-bio">
          <h3>John Doe</h3>
          <p class="title">Senior Technology Correspondent</p>
          <p class="outlet">Tech News Daily</p>
          <p>Email: <a href="mailto:john.doe@technews.com">john.doe@technews.com</a></p>
          <p>Phone: +1-555-0123</p>
        </div>
      `;

      const content = createMockContent({ content: structuredContent });
      const result = await identifier.extractContacts(content);

      expect(result[0].role).toBe('Senior Technology Correspondent');
      expect(result[0].outlet).toBe('Tech News Daily');
      expect(result[0].phone).toBe('+1-555-0123');
    });
  });

  describe('deduplicateContacts', () => {
    it('should remove duplicate contacts', () => {
      const contacts = [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          confidence: 0.85
        },
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          confidence: 0.90
        },
        {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@example.com',
          confidence: 0.88
        }
      ] as ExtractedContact[];

      const result = identifier.deduplicateContacts(contacts);

      expect(result).toHaveLength(2);
      expect(result.find(c => c.email === 'john.doe@example.com')!.confidence).toBe(0.90); // Keep higher confidence
      expect(result.find(c => c.email === 'jane.smith@example.com')).toBeDefined();
    });

    it('should handle contacts with similar names but different emails', () => {
      const contacts = [
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@work.com',
          confidence: 0.85
        },
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@personal.com',
          confidence: 0.88
        }
      ] as ExtractedContact[];

      const result = identifier.deduplicateContacts(contacts);

      // Should keep both as they have different emails
      expect(result).toHaveLength(2);
    });
  });

  describe('getStats', () => {
    it('should return extraction statistics', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            confidence: 0.85
          }
        ],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const content = createMockContent();
      await identifier.extractContacts(content);

      const stats = identifier.getStats();

      expect(stats).toHaveProperty('totalExtractions');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('averageProcessingTime');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('contactsExtracted');
      expect(stats.totalExtractions).toBeGreaterThan(0);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle empty content', async () => {
      const content = createMockContent({ content: '' });
      const result = await identifier.extractContacts(content);

      expect(result).toHaveLength(0);
    });

    it('should handle null content', async () => {
      await expect(identifier.extractContacts(null as any)).rejects.toThrow();
    });

    it('should handle content with only HTML tags', async () => {
      const content = createMockContent({
        content: '<div><p><span><strong>No actual content here</strong></span></p></div>'
      });
      const result = await identifier.extractContacts(content);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should retry on transient failures', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockResolvedValueOnce({
          contacts: [
            {
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              confidence: 0.85
            }
          ],
          metadata: { service: 'openai', model: 'gpt-4' }
        });

      const content = createMockContent();
      const result = await identifier.extractContacts(content);

      expect(result).toHaveLength(1);
      expect(aiServiceManager.executeQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('performance tests', () => {
    it('should process content within reasonable time', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            confidence: 0.85
          }
        ],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const content = createMockContent();
      const startTime = Date.now();
      await identifier.extractContacts(content);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle batch processing efficiently', async () => {
      const { aiServiceManager } = require('../services/index');
      aiServiceManager.executeQuery.mockResolvedValue({
        contacts: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            confidence: 0.85
          }
        ],
        metadata: { service: 'openai', model: 'gpt-4' }
      });

      const contents = Array.from({ length: 5 }, (_, i) =>
        createMockContent({ url: `https://example.com/article-${i}` })
      );

      const startTime = Date.now();
      const results = await Promise.all(contents.map(content => identifier.extractContacts(content)));
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(results.every(r => Array.isArray(r))).toBe(true);
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
    });
  });
});