/**
 * Firecrawl Service Implementation
 * Provides integration with Firecrawl for web scraping and content extraction
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BaseAIService } from '../base/service';
import {
  AIServiceRequest,
  ContentScrapingRequest,
  ContentScrapingResponse,
  ServiceHealth,
  RateLimitInfo,
  QuotaInfo,
  RetryConfig,
  CircuitBreakerConfig,
  CacheConfig
} from '../base/types';
import { FirecrawlConfig } from '../config/types';
import { aiConfigManager } from '../config/manager';

interface FirecrawlScrapeRequest {
  url: string;
  formats?: string[];
  includeTags?: string[];
  excludeTags?: string[];
  onlyMainContent?: boolean;
  timeout?: number;
  waitFor?: number;
  screenshot?: boolean;
  headers?: Record<string, string>;
}

interface FirecrawlScrapeResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    links?: string[];
    images?: string[];
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      keywords?: string[];
      robots?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
      url?: string;
      timestamp?: string;
    };
    screenshot?: string;
  };
  error?: string;
  code?: number;
}

interface FirecrawlCrawlRequest {
  url: string;
  includePaths?: string[];
  excludePaths?: string[];
  limit?: number;
  maxDepth?: number;
  allowBackwardLinks?: boolean;
  formats?: string[];
  ignoreSitemap?: boolean;
  scrapeOptions?: FirecrawlScrapeRequest;
}

interface FirecrawlMapRequest {
  url: string;
  includePaths?: string[];
  excludePaths?: string[];
  limit?: number;
  maxDepth?: number;
  ignoreSitemap?: boolean;
}

interface FirecrawlMapResponse {
  success: boolean;
  data?: string[]; // Array of URLs
  error?: string;
  code?: number;
}

interface FirecrawlServiceMetrics {
  requests: number;
  scrapes: number;
  crawls: number;
  maps: number;
  pagesScraped: number;
  charactersExtracted: number;
  cost: number;
  errors: number;
  rateLimitHits: number;
  cacheHits: number;
}

export class FirecrawlService extends BaseAIService {
  private client: AxiosInstance | null = null;
  private config: FirecrawlConfig | null = null;
  private metrics: FirecrawlServiceMetrics = {
    requests: 0,
    scrapes: 0,
    crawls: 0,
    maps: 0,
    pagesScraped: 0,
    charactersExtracted: 0,
    cost: 0,
    errors: 0,
    rateLimitHits: 0,
    cacheHits: 0
  };

  private constructor() {
    const retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelayMs: 2000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrorTypes: ['NETWORK', 'API', 'RATE_LIMIT']
    };

    const circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeoutMs: 60000,
      monitoringPeriodMs: 300000,
      expectedRecoveryTimeMs: 45000
    };

    const cacheConfig: CacheConfig = {
      enabled: true,
      ttlLocal: 3600, // 1 hour for scraped content
      ttlCold: 86400, // 24 hours for cold cache
      maxSize: 1500,
      keyPrefix: 'firecrawl'
    };

    super('firecrawl', '1.0.0', retryConfig, circuitBreakerConfig, cacheConfig);
  }

  public static getInstance(): FirecrawlService {
    return new FirecrawlService();
  }

  /**
   * Initialize the Firecrawl service
   */
  async initialize(): Promise<void> {
    try {
      this.config = aiConfigManager.getServiceConfig('firecrawl');

      if (!this.config.apiKey) {
        throw new Error('Firecrawl API key is required');
      }

      this.client = axios.create({
        baseURL: this.config.baseUrl || 'https://api.firecrawl.dev/v1',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': `media-contacts/${this.serviceName}/${this.version}`
        },
        timeout: this.config.crawlOptions.timeout
      });

      // Add response interceptor for metrics and error handling
      this.client.interceptors.response.use(
        (response) => this.handleSuccessResponse(response),
        (error) => this.handleErrorResponse(error)
      );

      // Perform a simple health check
      await this.healthCheck();

      console.info('Firecrawl service initialized successfully', {
        baseUrl: this.config.baseUrl,
        timeout: this.config.crawlOptions.timeout,
        maxPages: this.config.crawlOptions.maxPages
      });

    } catch (error) {
      console.error('Failed to initialize Firecrawl service:', error);
      throw new Error(`Firecrawl service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Scrape a single URL for content
   */
  async scrapeContent(request: ContentScrapingRequest): Promise<ContentScrapingResponse> {
    const response = await this.executeOperation(
      request,
      () => this.performContentScraping(request),
      {
        maxAttempts: 2, // Scraping can fail, don't retry too much
        baseDelayMs: 3000
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Content scraping failed');
    }

    return response.data;
  }

  /**
   * Crawl a website starting from a URL
   */
  async crawlWebsite(startUrl: string, options?: {
    limit?: number;
    maxDepth?: number;
    includePaths?: string[];
    excludePaths?: string[];
    formats?: string[];
  }): Promise<ContentScrapingResponse[]> {
    const request: AIServiceRequest = {
      correlationId: Math.random().toString(36).substr(2, 9),
      operation: 'crawlWebsite',
      timestamp: Date.now(),
      metadata: { startUrl, options }
    };

    const response = await this.executeOperation(
      request,
      () => this.performWebsiteCrawl(startUrl, options)
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Website crawling failed');
    }

    return response.data;
  }

  /**
   * Map a website to discover all pages
   */
  async mapWebsite(startUrl: string, options?: {
    limit?: number;
    maxDepth?: number;
    includePaths?: string[];
    excludePaths?: string[];
  }): Promise<string[]> {
    const request: AIServiceRequest = {
      correlationId: Math.random().toString(36).substr(2, 9),
      operation: 'mapWebsite',
      timestamp: Date.now(),
      metadata: { startUrl, options }
    };

    const response = await this.executeOperation(
      request,
      () => this.performWebsiteMapping(startUrl, options)
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Website mapping failed');
    }

    return response.data;
  }

  /**
   * Perform content scraping for a single URL
   */
  private async performContentScraping(request: ContentScrapingRequest): Promise<ContentScrapingResponse> {
    if (!this.client || !this.config) {
      throw new Error('Firecrawl service not initialized');
    }

    const startTime = Date.now();

    try {
      const scrapePayload: FirecrawlScrapeRequest = {
        url: request.url,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: this.config.crawlOptions.timeout,
        waitFor: request.options?.waitForJavaScript || 3000,
        screenshot: request.options?.includeImages || this.config.crawlOptions.screenshot,
        headers: {
          ...this.config.crawlOptions.headers,
          ...request.options?.customHeaders
        }
      };

      if (request.options?.userAgent) {
        scrapePayload.headers = {
          ...scrapePayload.headers,
          'User-Agent': request.options.userAgent
        };
      }

      const response: AxiosResponse<FirecrawlScrapeResponse> = await this.client.post('/scrape', scrapePayload);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Scraping failed');
      }

      const firecrawlData = response.data.data;

      // Transform to our standard format
      const result: ContentScrapingResponse = {
        url: request.url,
        title: firecrawlData.metadata?.title || 'Untitled',
        content: firecrawlData.markdown || firecrawlData.html || '',
        metadata: {
          contentType: this.detectContentType(firecrawlData.metadata),
          contentLength: firecrawlData.markarkdown?.length || firecrawlData.html?.length || 0,
          author: firecrawlData.metadata?.author,
          publishedDate: firecrawlData.metadata?.timestamp,
          language: firecrawlData.metadata?.language || 'en',
          wordCount: this.countWords(firecrawlData.markdown || firecrawlData.html || ''),
          readingTime: this.calculateReadingTime(firecrawlData.markdown || firecrawlData.html || '')
        },
        links: this.extractLinks(firecrawlData.links || []),
        images: this.extractImages(firecrawlData.images || [], firecrawlData.metadata?.ogImage),
        error: response.data.error
      };

      // Update metrics
      this.metrics.scrapes++;
      this.metrics.pagesScraped++;
      this.metrics.charactersExtracted += result.metadata.contentLength;

      return result;

    } catch (error) {
      this.metrics.errors++;

      // Return error response for scraping failures
      return {
        url: request.url,
        title: 'Error',
        content: '',
        metadata: {
          contentType: 'error',
          contentLength: 0,
          language: 'en',
          wordCount: 0
        },
        error: error instanceof Error ? error.message : 'Unknown scraping error'
      };
    }
  }

  /**
   * Perform website crawling
   */
  private async performWebsiteCrawl(startUrl: string, options?: any): Promise<ContentScrapingResponse[]> {
    if (!this.client || !this.config) {
      throw new Error('Firecrawl service not initialized');
    }

    try {
      const crawlPayload: FirecrawlCrawlRequest = {
        url: startUrl,
        limit: Math.min(options?.limit || this.config.crawlOptions.maxPages, 100),
        maxDepth: options?.maxDepth || 2,
        formats: ['markdown'],
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
          timeout: this.config.crawlOptions.timeout,
          waitFor: 3000
        }
      };

      if (options?.includePaths) {
        crawlPayload.includePaths = options.includePaths;
      }
      if (options?.excludePaths) {
        crawlPayload.excludePaths = options.excludePaths;
      }

      // Start the crawl job
      const startResponse = await this.client.post('/crawl', crawlPayload);
      const jobId = startResponse.data.id;

      if (!jobId) {
        throw new Error('Failed to start crawl job');
      }

      // Monitor the crawl job
      const results = await this.monitorCrawlJob(jobId);

      this.metrics.crawls++;
      this.metrics.pagesScraped += results.length;

      return results;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Perform website mapping
   */
  private async performWebsiteMapping(startUrl: string, options?: any): Promise<string[]> {
    if (!this.client || !this.config) {
      throw new Error('Firecrawl service not initialized');
    }

    try {
      const mapPayload: FirecrawlMapRequest = {
        url: startUrl,
        limit: Math.min(options?.limit || 1000, 10000),
        maxDepth: options?.maxDepth || 3
      };

      if (options?.includePaths) {
        mapPayload.includePaths = options.includePaths;
      }
      if (options?.excludePaths) {
        mapPayload.excludePaths = options.excludePaths;
      }

      const response: AxiosResponse<FirecrawlMapResponse> = await this.client.post('/map', mapPayload);

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Website mapping failed');
      }

      this.metrics.maps++;
      return response.data.data;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Monitor crawl job until completion
   */
  private async monitorCrawlJob(jobId: string): Promise<ContentScrapingResponse[]> {
    const maxWaitTime = 300000; // 5 minutes max wait
    const pollInterval = 5000; // Poll every 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const statusResponse = await this.client.get(`/crawl/status/${jobId}`);
        const status = statusResponse.data;

        if (status.status === 'completed') {
          // Get the results
          const data = status.data || [];
          return data.map((item: any) => ({
            url: item.url || item.metadata?.url || '',
            title: item.metadata?.title || 'Untitled',
            content: item.markdown || item.html || '',
            metadata: {
              contentType: this.detectContentType(item.metadata),
              contentLength: (item.markdown || item.html || '').length,
              author: item.metadata?.author,
              publishedDate: item.metadata?.timestamp,
              language: item.metadata?.language || 'en',
              wordCount: this.countWords(item.markdown || item.html || ''),
              readingTime: this.calculateReadingTime(item.markdown || item.html || '')
            },
            links: this.extractLinks(item.links || []),
            images: this.extractImages(item.images || [], item.metadata?.ogImage)
          }));
        }

        if (status.status === 'failed') {
          throw new Error(`Crawl job failed: ${status.error || 'Unknown error'}`);
        }

        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, pollInterval));

      } catch (error) {
        throw new Error(`Failed to monitor crawl job: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    throw new Error('Crawl job timed out');
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      if (!this.client) {
        throw new Error('Client not initialized');
      }

      // Test with a simple status check or scrape request
      const testUrl = 'https://httpbin.org/html';
      const testResponse = await this.client.post('/scrape', {
        url: testUrl,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 10000
      });

      const responseTime = Date.now() - startTime;
      const baseHealth = this.calculateHealthFromMetrics();

      return {
        ...baseHealth,
        lastCheck: Date.now(),
        responseTime,
        metadata: {
          ...baseHealth.metadata,
          apiKeyStatus: 'valid',
          crawlQuota: this.config?.quotas.requestsPerMonth,
          requestsUsed: this.metrics.requests
        }
      };

    } catch (error) {
      this.metrics.errors++;

      return {
        service: this.serviceName,
        status: 'unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        errorRate: 100,
        uptime: 0,
        requestCount: 1,
        errorCount: 1,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          apiKeyStatus: this.config?.apiKey ? 'invalid' : 'missing'
        }
      };
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(): Promise<RateLimitInfo | null> {
    if (!this.config) {
      return null;
    }

    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    const recentMetrics = this.getRecentMetrics(1); // Last minute

    const requestsInWindow = recentMetrics.filter(m =>
      m.timestamp > now - windowMs && m.operation !== 'healthCheck'
    ).length;

    return {
      limit: this.config.rateLimits.requestsPerMinute,
      remaining: Math.max(0, this.config.rateLimits.requestsPerMinute - requestsInWindow),
      resetTime: Math.ceil(now / windowMs) * windowMs,
      windowMs
    };
  }

  /**
   * Get current quota usage
   */
  async getQuotaStatus(): Promise<QuotaInfo | null> {
    if (!this.config) {
      return null;
    }

    const now = Date.now();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Calculate monthly usage from metrics
    const monthlyUsage = this.metrics.requests;

    return {
      limit: this.config.quotas.requestsPerMonth,
      used: monthlyUsage,
      remaining: Math.max(0, this.config.quotas.requestsPerMonth - monthlyUsage),
      resetTime: nextMonth.getTime(),
      period: 'monthly'
    };
  }

  /**
   * Handle successful responses
   */
  private handleSuccessResponse(response: AxiosResponse): AxiosResponse {
    // Update cost metrics if available
    const cost = response.headers['x-cost-used'];
    if (cost) {
      this.metrics.cost += parseFloat(cost);
    }

    // Check for rate limit headers
    const remaining = response.headers['x-ratelimit-remaining'];
    if (remaining && parseInt(remaining) < 5) {
      this.metrics.rateLimitHits++;
    }

    return response;
  }

  /**
   * Handle error responses
   */
  private handleErrorResponse(error: any): Promise<never> {
    this.metrics.errors++;

    // Check for rate limit errors
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      const rateLimitError = new Error(`Rate limit exceeded. Retry after ${retryAfter || '60'} seconds`);
      (rateLimitError as any).retryAfter = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      throw rateLimitError;
    }

    // Check for quota exceeded
    if (error.response?.status === 402) {
      throw new Error('Quota exceeded. Please check your plan limits.');
    }

    // Check for authentication errors
    if (error.response?.status === 401) {
      throw new Error('Invalid API key or authentication failed.');
    }

    // Generic API error
    throw error;
  }

  /**
   * Utility methods for content processing
   */
  private detectContentType(metadata?: any): string {
    if (!metadata) return 'unknown';

    const url = metadata.url || '';
    const title = metadata.title || '';

    if (url.includes('/contact') || title.toLowerCase().includes('contact')) return 'contact';
    if (url.includes('/about') || title.toLowerCase().includes('about')) return 'about';
    if (url.includes('/author') || title.toLowerCase().includes('author')) return 'author';
    if (metadata.ogImage) return 'article';
    if (url.includes('/blog') || url.includes('/news')) return 'article';

    return 'website';
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private calculateReadingTime(text: string): number {
    const wordsPerMinute = 200;
    const words = this.countWords(text);
    return Math.ceil(words / wordsPerMinute);
  }

  private extractLinks(links: string[]): any[] {
    return links.map(link => ({
      url: link,
      type: 'external' as const, // Simplified - would need more sophisticated detection
      trustScore: 0.5
    }));
  }

  private extractImages(images: string[], ogImage?: string): any[] {
    const result = images.map(url => ({
      url,
      format: this.getImageFormat(url)
    }));

    if (ogImage && !images.includes(ogImage)) {
      result.unshift({
        url: ogImage,
        format: this.getImageFormat(ogImage)
      });
    }

    return result;
  }

  private getImageFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  /**
   * Get detailed metrics
   */
  public getDetailedMetrics(): FirecrawlServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing)
   */
  public resetMetrics(): void {
    this.metrics = {
      requests: 0,
      scrapes: 0,
      crawls: 0,
      maps: 0,
      pagesScraped: 0,
      charactersExtracted: 0,
      cost: 0,
      errors: 0,
      rateLimitHits: 0,
      cacheHits: 0
    };
  }
}

// Export singleton instance
export const firecrawlService = FirecrawlService.getInstance();