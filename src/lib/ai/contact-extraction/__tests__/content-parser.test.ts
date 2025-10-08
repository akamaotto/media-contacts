/**
 * Web Content Parser Tests
 */

import { WebContentParser } from '../content-parser';
import { ParsedContent } from '../types';

// Mock firecrawl service
jest.mock('../../services', () => ({
  firecrawlService: {
    scrapeContent: jest.fn()
  }
}));

describe('WebContentParser', () => {
  let parser: WebContentParser;

  beforeEach(() => {
    parser = new WebContentParser();
    jest.clearAllMocks();
  });

  describe('parseContent', () => {
    it('should parse content successfully', async () => {
      const mockScrapeResult = {
        success: true,
        data: {
          markdown: '# Test Article\n\nThis is a test article content.',
          rawHtml: '<h1>Test Article</h1><p>This is a test article content.</p>',
          metadata: {
            title: 'Test Article',
            description: 'Test description',
            author: 'Test Author',
            publishedAt: '2024-01-01T00:00:00Z',
            language: 'en'
          },
          links: ['https://example.com'],
          images: ['https://example.com/image.jpg']
        }
      };

      const { firecrawlService } = require('../../services');
      firecrawlService.scrapeContent.mockResolvedValue(mockScrapeResult);

      const result = await parser.parseContent('https://example.com/article');

      expect(result).toMatchObject({
        url: 'https://example.com/article',
        title: 'Test Article',
        content: 'Test Article\n\nThis is a test article content.',
        language: 'en',
        author: 'Test Author',
        links: ['https://example.com'],
        images: ['https://example.com/image.jpg']
      });
      expect(result.publishedAt).toBeInstanceOf(Date);
    });

    it('should handle scrape failure', async () => {
      const mockScrapeResult = {
        success: false,
        error: 'Scraping failed'
      };

      const { firecrawlService } = require('../../services');
      firecrawlService.scrapeContent.mockResolvedValue(mockScrapeResult);

      await expect(parser.parseContent('https://example.com/article'))
        .rejects.toThrow('Failed to scrape content');
    });

    it('should use cached content when available', async () => {
      const cachedContent: ParsedContent = {
        url: 'https://example.com/article',
        title: 'Cached Article',
        content: 'Cached content',
        metadata: { wordCount: 100, readingTime: 1 },
        links: [],
        images: []
      };

      // Set cache through private method for testing
      (parser as any).cache.set('test-key', cachedContent);
      (parser as any).cacheExpiry.set('test-key', Date.now() + 60000);

      const result = await parser.parseContent('https://example.com/article');

      expect(result.title).toBe('Cached Article');
      expect(result.content).toBe('Cached content');
    });
  });

  describe('parseMultipleContent', () => {
    it('should parse multiple URLs in parallel', async () => {
      const mockScrapeResult = {
        success: true,
        data: {
          markdown: 'Test content',
          metadata: { title: 'Test' }
        }
      };

      const { firecrawlService } = require('../../services');
      firecrawlService.scrapeContent.mockResolvedValue(mockScrapeResult);

      const urls = [
        'https://example.com/article1',
        'https://example.com/article2',
        'https://example.com/article3'
      ];

      const results = await parser.parseMultipleContent(urls, { maxConcurrent: 2 });

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.content).toBeDefined();
        expect(result.error).toBeUndefined();
      });
    });

    it('should handle mixed success/failure results', async () => {
      const { firecrawlService } = require('../../services');
      firecrawlService.scrapeContent
        .mockResolvedValueOnce({
          success: true,
          data: { markdown: 'Success', metadata: { title: 'Success' } }
        })
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          success: true,
          data: { markdown: 'Success 2', metadata: { title: 'Success 2' } }
        });

      const urls = [
        'https://example.com/article1',
        'https://example.com/article2',
        'https://example.com/article3'
      ];

      const results = await parser.parseMultipleContent(urls);

      expect(results).toHaveLength(3);
      expect(results[0].error).toBeUndefined();
      expect(results[1].error).toBeDefined();
      expect(results[2].error).toBeUndefined();
    });
  });

  describe('utility methods', () => {
    describe('isValidUrl', () => {
      it('should validate URLs correctly', () => {
        expect(WebContentParser.isValidUrl('https://example.com')).toBe(true);
        expect(WebContentParser.isValidUrl('http://example.com/path')).toBe(true);
        expect(WebContentParser.isValidUrl('ftp://example.com')).toBe(true);
        expect(WebContentParser.isValidUrl('invalid-url')).toBe(false);
        expect(WebContentParser.isValidUrl('')).toBe(false);
      });
    });

    describe('extractUrls', () => {
      it('should extract URLs from text', () => {
        const text = 'Check out https://example.com and http://test.org for more info';
        const urls = WebContentParser.extractUrls(text);

        expect(urls).toEqual(['https://example.com', 'http://test.org']);
      });

      it('should remove duplicates', () => {
        const text = 'Visit https://example.com and https://example.com again';
        const urls = WebContentParser.extractUrls(text);

        expect(urls).toEqual(['https://example.com']);
      });
    });

    describe('extractEmails', () => {
      it('should extract email addresses from text', () => {
        const text = 'Contact us at info@example.com or support@test.org';
        const emails = WebContentParser.extractEmails(text);

        expect(emails).toEqual(['info@example.com', 'support@test.org']);
      });

      it('should handle various email formats', () => {
        const text = 'Emails: user.name@domain.co.uk, test+tag@example.io';
        const emails = WebContentParser.extractEmails(text);

        expect(emails).toEqual(['user.name@domain.co.uk', 'test+tag@example.io']);
      });
    });

    describe('detectLanguage', () => {
      it('should detect English content', () => {
        const english = 'The quick brown fox jumps over the lazy dog. This is a test article with many English words.';
        expect(WebContentParser.detectLanguage(english)).toBe('en');
      });

      it('should detect French content', () => {
        const french = 'Le chat noir mange la souris. C\'est un test avec des mots français.';
        expect(WebContentParser.detectLanguage(french)).toBe('fr');
      });

      it('should return unknown for ambiguous content', () => {
        const ambiguous = '123 456 789 test';
        expect(WebContentParser.detectLanguage(ambiguous)).toBe('unknown');
      });
    });
  });

  describe('content cleaning', () => {
    it('should clean content properly', async () => {
      const mockScrapeResult = {
        success: true,
        data: {
          markdown: '  Test   content  with   extra   spaces  ',
          rawHtml: '<p>Test content</p>',
          metadata: { title: 'Test' }
        }
      };

      const { firecrawlService } = require('../../services');
      firecrawlService.scrapeContent.mockResolvedValue(mockScrapeResult);

      const result = await parser.parseContent('https://example.com');

      expect(result.content).toBe('Test content with extra spaces');
    });

    it('should handle HTML entities', async () => {
      const mockScrapeResult = {
        success: true,
        data: {
          html: '<p>Don&apos;t use &quot;test&quot; in &amp; content</p>',
          metadata: { title: 'Test' }
        }
      };

      const { firecrawlService } = require('../../services');
      firecrawlService.scrapeContent.mockResolvedValue(mockScrapeResult);

      const result = await parser.parseContent('https://example.com', { format: 'html' });

      expect(result.content).toBe("Don't use \"test\" in & content");
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = parser.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('oldestEntry');
      expect(stats).toHaveProperty('newestEntry');
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', () => {
      parser.clearCache();

      const stats = parser.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe('getContentSummary', () => {
    it('should generate content summary', async () => {
      const mockContent: ParsedContent = {
        url: 'https://example.com',
        title: 'Test Article',
        content: 'This is a test article about journalism. Contact us at editor@example.com. Visit https://media-outlet.com for more info.',
        metadata: { wordCount: 20, readingTime: 1 },
        links: ['https://media-outlet.com'],
        images: [],
        language: 'en'
      };

      const summary = parser.getContentSummary(mockContent);

      expect(summary).toMatchObject({
        title: 'Test Article',
        wordCount: 20,
        hasContactInfo: true,
        emails: ['editor@example.com'],
        urls: ['https://media-outlet.com'],
        language: 'en'
      });
    });
  });
});