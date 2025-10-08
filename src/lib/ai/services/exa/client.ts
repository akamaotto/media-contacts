/**
 * Exa API Service Implementation
 * Provides integration with Exa for neural web search and source discovery
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BaseAIService } from '../base/service';
import {
  AIServiceRequest,
  WebSearchRequest,
  WebSearchResponse,
  ServiceHealth,
  RateLimitInfo,
  QuotaInfo,
  RetryConfig,
  CircuitBreakerConfig,
  CacheConfig
} from '../base/types';
import { ExaConfig } from '../config/types';
import { aiConfigManager } from '../config/manager';

interface ExaSearchResult {
  id: string;
  url: string;
  title: string;
  publishedDate?: string;
  author?: string;
  text?: string;
  highlights?: string[];
  score: number;
  category?: string;
  subcategory?: string;
  image?: string;
  favicon?: string;
}

interface ExaSearchResponse {
  results: ExaSearchResult[];
  requestId: string;
  cost?: number;
  totalCount?: number;
  resolvedQuery?: string;
  autopromptString?: string;
}

interface ExaServiceMetrics {
  requests: number;
  searches: number;
  resultsFound: number;
  cost: number;
  errors: number;
  rateLimitHits: number;
  cacheHits: number;
}

export class ExaService extends BaseAIService {
  private client: AxiosInstance | null = null;
  private config: ExaConfig | null = null;
  private metrics: ExaServiceMetrics = {
    requests: 0,
    searches: 0,
    resultsFound: 0,
    cost: 0,
    errors: 0,
    rateLimitHits: 0,
    cacheHits: 0
  };

  private constructor() {
    const retryConfig: RetryConfig = {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 15000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrorTypes: ['NETWORK', 'API', 'RATE_LIMIT']
    };

    const circuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeoutMs: 45000,
      monitoringPeriodMs: 300000,
      expectedRecoveryTimeMs: 30000
    };

    const cacheConfig: CacheConfig = {
      enabled: true,
      ttlLocal: 1800, // 30 minutes for search results
      ttlCold: 7200,  // 2 hours for cold cache
      maxSize: 2000,
      keyPrefix: 'exa'
    };

    super('exa', '1.0.0', retryConfig, circuitBreakerConfig, cacheConfig);
  }

  public static getInstance(): ExaService {
    return new ExaService();
  }

  /**
   * Initialize the Exa service
   */
  async initialize(): Promise<void> {
    try {
      this.config = aiConfigManager.getServiceConfig('exa');

      if (!this.config.apiKey) {
        throw new Error('Exa API key is required');
      }

      this.client = axios.create({
        baseURL: this.config.baseUrl || 'https://api.exa.ai',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': `media-contacts/${this.serviceName}/${this.version}`
        },
        timeout: 30000
      });

      // Add response interceptor for metrics and error handling
      this.client.interceptors.response.use(
        (response) => this.handleSuccessResponse(response),
        (error) => this.handleErrorResponse(error)
      );

      // Perform a simple health check
      await this.healthCheck();

      console.info('Exa service initialized successfully', {
        baseUrl: this.config.baseUrl,
        searchQuota: this.config.quotas.requestsPerMonth
      });

    } catch (error) {
      console.error('Failed to initialize Exa service:', error);
      throw new Error(`Exa service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform web search using Exa
   */
  async searchWeb(request: WebSearchRequest): Promise<WebSearchResponse> {
    const response = await this.executeOperation(
      request,
      () => this.performWebSearch(request),
      {
        maxAttempts: 2, // Search is less critical, fewer retries
        baseDelayMs: 1500
      }
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Web search failed');
    }

    return response.data;
  }

  /**
   * Perform content-based search (find similar content)
   */
  async findSimilarContent(url: string, options?: {
    maxResults?: number;
    includeText?: boolean;
    category?: string;
  }): Promise<WebSearchResponse> {
    const request: AIServiceRequest = {
      correlationId: Math.random().toString(36).substr(2, 9),
      operation: 'findSimilarContent',
      timestamp: Date.now(),
      metadata: { url, options }
    };

    const response = await this.executeOperation(
      request,
      () => this.performSimilarContentSearch(url, options)
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Similar content search failed');
    }

    return response.data;
  }

  /**
   * Get detailed information about URLs
   */
  async getContents(urls: string[]): Promise<ExaSearchResult[]> {
    const request: AIServiceRequest = {
      correlationId: Math.random().toString(36).substr(2, 9),
      operation: 'getContents',
      timestamp: Date.now(),
      metadata: { urls }
    };

    const response = await this.executeOperation(
      request,
      () => this.performContentsRetrieval(urls)
    );

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Contents retrieval failed');
    }

    return response.data;
  }

  /**
   * Perform web search using Exa API
   */
  private async performWebSearch(request: WebSearchRequest): Promise<WebSearchResponse> {
    if (!this.client || !this.config) {
      throw new Error('Exa service not initialized');
    }

    const startTime = Date.now();

    try {
      const searchPayload: any = {
        query: request.query,
        numResults: Math.min(request.options?.maxResults || this.config.searchOptions.maxResults, 10),
        includeDomains: request.filters?.domains,
        excludeDomains: request.filters?.excludeDomains,
        startCrawlDate: request.filters?.dateRange?.from,
        endCrawlDate: request.filters?.dateRange?.to,
        summary: request.options?.includeSummaries ?? true,
        text: true // Always include text for analysis
      };

      // Add safe search if specified
      if (request.filters?.safeSearch || this.config.searchOptions.safeSearch !== 'off') {
        searchPayload.includeText = '[\\"safe search\\"]';
      }

      const response: AxiosResponse<ExaSearchResponse> = await this.client.post('/search', searchPayload);
      const exaData = response.data;

      // Transform Exa results to our format
      const results = exaData.results.map(result => this.transformExaResult(result));

      this.metrics.searches++;
      this.metrics.resultsFound += results.length;

      const queryTime = Date.now() - startTime;

      return {
        results,
        totalResults: exaData.totalCount || results.length,
        queryTime,
        searchId: response.data.requestId || Math.random().toString(36).substr(2, 9),
        metadata: {
          searchEngine: 'exa',
          filters: {
            domains: request.filters?.domains,
            excludeDomains: request.filters?.excludeDomains,
            dateRange: request.filters?.dateRange,
            safeSearch: request.filters?.safeSearch
          },
          autopromptString: exaData.autopromptString,
          resolvedQuery: exaData.resolvedQuery
        }
      };

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Find similar content using Exa's contents endpoint
   */
  private async performSimilarContentSearch(url: string, options?: any): Promise<WebSearchResponse> {
    if (!this.client || !this.config) {
      throw new Error('Exa service not initialized');
    }

    const startTime = Date.now();

    try {
      const searchPayload: any = {
        urls: [url],
        numResults: Math.min(options?.maxResults || 5, 10),
        includeText: true,
        summary: options?.includeSummary ?? true
      };

      if (options?.category) {
        searchPayload.category = options.category;
      }

      const response: AxiosResponse<ExaSearchResponse> = await this.client.post('/contents', searchPayload);
      const exaData = response.data;

      // Transform results (excluding the original URL)
      const results = exaData.results
        .filter(result => result.url !== url)
        .map(result => this.transformExaResult(result));

      this.metrics.searches++;
      this.metrics.resultsFound += results.length;

      const queryTime = Date.now() - startTime;

      return {
        results,
        totalResults: results.length,
        queryTime,
        searchId: response.data.requestId || Math.random().toString(36).substr(2, 9),
        metadata: {
          searchEngine: 'exa',
          searchType: 'similar',
          originalUrl: url,
          category: options?.category
        }
      };

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Retrieve detailed content for specific URLs
   */
  private async performContentsRetrieval(urls: string[]): Promise<ExaSearchResult[]> {
    if (!this.client || !this.config) {
      throw new Error('Exa service not initialized');
    }

    try {
      const searchPayload = {
        urls: urls.slice(0, 10), // Limit to 10 URLs per request
        text: true,
        summary: true
      };

      const response: AxiosResponse<ExaSearchResponse> = await this.client.post('/contents', searchPayload);

      this.metrics.requests++;
      this.metrics.resultsFound += response.data.results.length;

      return response.data.results;

    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Transform Exa result to our standard format
   */
  private transformExaResult(result: ExaSearchResult): WebSearchResponse['results'][0] {
    // Calculate authority score based on Exa's score and other factors
    let authority = Math.min(result.score || 0, 1);

    // Boost authority based on domain reputation (simplified)
    const domain = new URL(result.url).hostname;
    if (domain.includes('reuters.com') || domain.includes('ap.org') || domain.includes('bbc.com')) {
      authority = Math.min(authority + 0.2, 1);
    }

    // Calculate relevance score from Exa's score
    const relevanceScore = result.score || 0;

    return {
      url: result.url,
      title: result.title || 'Untitled',
      summary: result.highlights?.join(' ') || result.text?.substring(0, 300),
      publishedDate: result.publishedDate,
      domain,
      authority,
      relevanceScore,
      metadata: {
        language: 'en', // Exa doesn't provide language info
        region: 'global', // Exa doesn't provide region info
        contentLength: result.text?.length || 0,
        contentType: result.category || 'article',
        author: result.author,
        image: result.image,
        favicon: result.favicon
      }
    };
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

      // Simple test - perform a minimal search
      const testResponse = await this.client.post('/search', {
        query: 'test query',
        numResults: 1,
        text: false
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
          searchQuota: this.config?.quotas.requestsPerMonth,
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
    const monthlyMetrics = this.metrics.requests; // Simplified - should track by month

    return {
      limit: this.config.quotas.requestsPerMonth,
      used: monthlyMetrics,
      remaining: Math.max(0, this.config.quotas.requestsPerMonth - monthlyMetrics),
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
   * Get detailed metrics
   */
  public getDetailedMetrics(): ExaServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing)
   */
  public resetMetrics(): void {
    this.metrics = {
      requests: 0,
      searches: 0,
      resultsFound: 0,
      cost: 0,
      errors: 0,
      rateLimitHits: 0,
      cacheHits: 0
    };
  }
}

// Export singleton instance
export const exaService = ExaService.getInstance();