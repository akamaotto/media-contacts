/**
 * Web Content Parser
 * Extracts and normalizes content from various web sources
 */

import { firecrawlService } from '../services';
import { ParsedContent, ContentMetadata, ContactExtractionError } from './types';
import crypto from 'crypto';

export class WebContentParser {
  private cache = new Map<string, ParsedContent>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 3600000; // 1 hour

  /**
   * Parse content from a URL
   */
  async parseContent(url: string, options: {
    format?: 'markdown' | 'html' | 'text';
    includeImages?: boolean;
    includeLinks?: boolean;
    timeout?: number;
  } = {}): Promise<ParsedContent> {
    const {
      format = 'markdown',
      includeImages = true,
      includeLinks = true,
      timeout = 30000
    } = options;

    // Check cache first
    const cacheKey = this.generateCacheKey(url, format);
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      await this.updateCacheAccess(cacheKey);
      return cached;
    }

    try {
      const scrapeRequest = {
        url,
        formats: [format],
        includeTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'article', 'section', 'div'],
        excludeTags: ['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe'],
        onlyMainContent: true,
        timeout,
        waitFor: 2000,
        screenshot: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MediaBot/1.0; +https://media-contacts.com/bot)'
        }
      };

      const result = await firecrawlService.scrapeContent(scrapeRequest);

      if (!result.success || !result.data) {
        throw new ContactExtractionError(
          `Failed to scrape content from ${url}: ${result.error || 'Unknown error'}`,
          'CONTENT_SCRAPE_FAILED',
          'PARSING_ERROR',
          { url, result }
        );
      }

      const parsedContent = this.processScrapedData(url, result.data, {
        includeImages,
        includeLinks,
        format
      });

      // Cache the result
      this.cache.set(cacheKey, parsedContent);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

      return parsedContent;

    } catch (error) {
      throw new ContactExtractionError(
        `Failed to parse content from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CONTENT_PARSE_FAILED',
        'PARSING_ERROR',
        { url, error, options }
      );
    }
  }

  /**
   * Parse content from multiple URLs in parallel
   */
  async parseMultipleContent(
    urls: string[],
    options: {
      format?: 'markdown' | 'html' | 'text';
      includeImages?: boolean;
      includeLinks?: boolean;
      timeout?: number;
      maxConcurrent?: number;
    } = {}
  ): Promise<Array<{ url: string; content: ParsedContent | null; error?: string }>> {
    const {
      maxConcurrent = 5
    } = options;

    const results = [];
    const chunks = this.chunkArray(urls, maxConcurrent);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (url) => {
        try {
          const content = await this.parseContent(url, options);
          return { url, content };
        } catch (error) {
          return {
            url,
            content: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Process scraped data into normalized format
   */
  private processScrapedData(
    url: string,
    data: any,
    options: {
      includeImages: boolean;
      includeLinks: boolean;
      format: string;
    }
  ): ParsedContent {
    const { includeImages, includeLinks, format } = options;

    // Extract content based on format
    let content = '';
    let html = '';

    switch (format) {
      case 'markdown':
        content = data.markdown || '';
        html = data.rawHtml || '';
        break;
      case 'html':
        content = this.htmlToText(data.html || '');
        html = data.html || '';
        break;
      case 'text':
        content = data.html ? this.htmlToText(data.html) : (data.markdown || '');
        html = data.rawHtml || '';
        break;
      default:
        content = data.markdown || data.html || '';
        html = data.rawHtml || '';
    }

    // Extract metadata
    const metadata = this.extractMetadata(data, url);

    // Extract links
    const links = includeLinks && data.links ? data.links : [];

    // Extract images
    const images = includeImages && data.images ? data.images : [];

    // Parse dates
    const publishedAt = this.parseDate(metadata.publishedAt);

    return {
      url,
      title: metadata.title,
      content: this.cleanContent(content),
      html: html || undefined,
      metadata,
      links,
      images,
      language: metadata.language,
      publishedAt,
      author: metadata.author
    };
  }

  /**
   * Extract metadata from scraped data
   */
  private extractMetadata(data: any, url: string): ContentMetadata {
    const metadata: ContentMetadata = {};

    // Basic metadata from Firecrawl
    if (data.metadata) {
      metadata.title = data.metadata.title;
      metadata.description = data.metadata.description;
      metadata.keywords = data.metadata.keywords;
      metadata.author = data.metadata.author;
      metadata.publishedAt = data.metadata.publishedAt;
      metadata.language = data.metadata.language;
      metadata.ogTitle = data.metadata.ogTitle;
      metadata.ogDescription = data.metadata.ogDescription;
      metadata.ogImage = data.metadata.ogImage;
    }

    // Additional metadata extraction
    const domain = this.extractDomain(url);
    metadata.domain = domain;

    // Word count and reading time
    const textContent = data.markdown || data.html || '';
    metadata.wordCount = this.countWords(textContent);
    metadata.readingTime = this.calculateReadingTime(metadata.wordCount);

    return metadata;
  }

  /**
   * Clean and normalize content
   */
  private cleanContent(content: string): string {
    return content
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove leading/trailing whitespace
      .trim()
      // Remove HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Remove special characters that might interfere with processing
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Normalize line breaks
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, ' ');

    // Convert HTML entities
    text = text.replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…');

    // Clean up whitespace
    return this.cleanContent(text);
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Calculate reading time in minutes
   */
  private calculateReadingTime(wordCount: number): number {
    const wordsPerMinute = 200;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Parse date from various formats
   */
  private parseDate(dateString?: string): Date | undefined {
    if (!dateString) return undefined;

    try {
      // Try ISO format first
      const isoDate = new Date(dateString);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }

      // Try other common formats
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Generate cache key for URL and format
   */
  private generateCacheKey(url: string, format: string): string {
    const hash = crypto.createHash('md5');
    hash.update(`${url}:${format}`);
    return hash.digest('hex');
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Update cache access statistics
   */
  private async updateCacheAccess(key: string): Promise<void> {
    // This could update access statistics in a database
    // For now, we just keep the cache entry valid
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
      oldestEntry: undefined,
      newestEntry: undefined
    };
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extract URLs from text content
   */
  static extractUrls(text: string): string[] {
    const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    const matches = text.match(urlPattern) || [];

    // Remove duplicates and validate each URL
    return Array.from(new Set(matches))
      .filter(url => WebContentParser.isValidUrl(url));
  }

  /**
   * Extract email addresses from text content
   */
  static extractEmails(text: string): string[] {
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.match(emailPattern) || [];

    // Remove duplicates and validate basic format
    return Array.from(new Set(matches))
      .filter(email => email.includes('@') && email.includes('.'));
  }

  /**
   * Detect content language
   */
  static detectLanguage(content: string): string {
    // Simple language detection based on common words
    const sample = content.substring(0, 1000).toLowerCase();

    // English indicators
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'];
    const englishMatches = englishWords.filter(word => sample.includes(word)).length;

    // French indicators
    const frenchWords = ['le', 'de', 'et', 'est', 'dans', 'pour', 'que', 'il', 'avec'];
    const frenchMatches = frenchWords.filter(word => sample.includes(word)).length;

    // Spanish indicators
    const spanishWords = ['el', 'de', 'y', 'es', 'en', 'para', 'que', 'con', 'por'];
    const spanishMatches = spanishWords.filter(word => sample.includes(word)).length;

    // German indicators
    const germanWords = ['der', 'die', 'und', 'ist', 'in', 'zu', 'den', 'das', 'mit'];
    const germanMatches = germanWords.filter(word => sample.includes(word)).length;

    const maxMatches = Math.max(englishMatches, frenchMatches, spanishMatches, germanMatches);

    if (maxMatches === englishMatches && englishMatches > 2) return 'en';
    if (maxMatches === frenchMatches && frenchMatches > 2) return 'fr';
    if (maxMatches === spanishMatches && spanishMatches > 2) return 'es';
    if (maxMatches === germanMatches && germanMatches > 2) return 'de';

    return 'unknown';
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get content summary
   */
  getContentSummary(content: ParsedContent): {
    title: string;
    wordCount: number;
    hasContactInfo: boolean;
    emails: string[];
    urls: string[];
    language: string;
  } {
    return {
      title: content.title || 'Untitled',
      wordCount: content.metadata.wordCount || 0,
      hasContactInfo: this.hasContactIndicators(content.content),
      emails: WebContentParser.extractEmails(content.content),
      urls: WebContentParser.extractUrls(content.content),
      language: content.language || 'unknown'
    };
  }

  /**
   * Check if content has contact indicators
   */
  private hasContactIndicators(content: string): boolean {
    const contactIndicators = [
      'email', 'contact', 'reach', 'mailto:', '@',
      'phone', 'call', 'dial',
      'twitter', 'linkedin', 'facebook',
      'instagram', 'social media',
      'editor', 'reporter', 'journalist',
      'author', 'writer', 'contributor'
    ];

    const lowerContent = content.toLowerCase();
    return contactIndicators.some(indicator => lowerContent.includes(indicator));
  }
}