/**
 * AI Service Manager - Unified Interface
 * Orchestrates all AI services and provides fallback mechanisms
 */

import { randomUUID } from 'crypto';
import {
  AIServiceRequest,
  ContactExtractionRequest,
  ContactExtractionResponse,
  ContentAnalysisRequest,
  ContentAnalysisResponse,
  WebSearchRequest,
  WebSearchResponse,
  ContentScrapingRequest,
  ContentScrapingResponse,
  ServiceHealth,
  AIServiceError
} from '../base/types';
import { openAIService } from '../openai/client';
import { exaService } from '../exa/client';
import { firecrawlService } from '../firecrawl/client';
import { anthropicService } from '../anthropic/client';
import { aiConfigManager } from '../config/manager';

export interface AISearchQuery {
  query: string;
  filters?: {
    beats?: string[];
    regions?: string[];
    countries?: string[];
    languages?: string[];
    categories?: string[];
    outletTypes?: string[];
    domains?: string[];
    excludeDomains?: string[];
    dateRange?: {
      from: string;
      to: string;
    };
    safeSearch?: 'off' | 'moderate' | 'strict';
  };
  options?: {
    maxResults?: number;
    priority?: 'low' | 'normal' | 'high';
    includeSummaries?: boolean;
    extractContacts?: boolean;
    scrapeContent?: boolean;
  };
}

export interface AISearchResult {
  id: string;
  url: string;
  title: string;
  summary?: string;
  content?: string;
  contacts?: any[];
  confidence: number;
  relevanceScore: number;
  metadata: {
    source: 'exa' | 'firecrawl' | 'manual';
    publishedDate?: string;
    author?: string;
    language?: string;
    region?: string;
    contentLength?: number;
    contactCount?: number;
    extractionTime?: number;
  };
}

export interface ExtractionContext {
  source?: string;
  language?: string;
  region?: string;
  beats?: string[];
  confidence?: number;
  maxContacts?: number;
  includeSocial?: boolean;
}

export interface AnalysisType {
  sentiment?: boolean;
  topic?: boolean;
  quality?: boolean;
  contact_density?: boolean;
  relevance?: boolean;
}

export interface AnalysisResult {
  sentiment?: {
    score: number;
    confidence: number;
    reasoning: string;
  };
  topic?: {
    topics: Array<{ name: string; relevance: number }>;
    primaryTopic: string;
    confidence: number;
  };
  quality?: {
    score: number;
    confidence: number;
    issues: string[];
    recommendations: string[];
  };
  contact_density?: {
    score: number;
    estimatedContacts: number;
    confidence: number;
  };
  relevance?: {
    score: number;
    reasoning: string;
    targetAudience: string[];
  };
}

export interface ServiceHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  responseTime: number;
  errorRate: number;
  uptime: number;
  requestCount: number;
  errorCount: number;
  lastError?: string;
  metadata?: Record<string, any>;
}

export interface AIServiceManager {
  // Search orchestration
  searchWeb(query: AISearchQuery): Promise<AISearchResult[]>;

  // Content extraction
  extractContacts(content: string, context: ExtractionContext): Promise<ContactExtractionResponse>;

  // Content analysis
  analyzeContent(content: string, analysisType: AnalysisType, context?: any): Promise<AnalysisResult>;

  // Web scraping
  scrapeContent(url: string, options?: any): Promise<ContentScrapingResponse>;

  // Service health
  getServiceHealth(): Promise<ServiceHealth[]>;

  // Fallback handling
  withFallback<T>(operation: () => Promise<T>, fallback: () => Promise<T>): Promise<T>;
}

class AIServiceManagerImpl implements AIServiceManager {
  private services = {
    openai: openAIService,
    exa: exaService,
    firecrawl: firecrawlService,
    anthropic: anthropicService
  };

  private initialized = false;

  /**
   * Initialize all AI services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.info('Initializing AI Service Manager...');

      // Load configuration
      await aiConfigManager.loadConfig();

      // Initialize services in dependency order
      const initOrder = [
        { name: 'openai', service: this.services.openai },
        { name: 'exa', service: this.services.exa },
        { name: 'firecrawl', service: this.services.firecrawl },
        { name: 'anthropic', service: this.services.anthropic }
      ];

      for (const { name, service } of initOrder) {
        try {
          console.info(`Initializing ${name} service...`);
          await service.initialize();
          console.info(`${name} service initialized successfully`);
        } catch (error) {
          console.error(`Failed to initialize ${name} service:`, error);
          // Continue initialization but mark service as unavailable
          aiConfigManager.updateServiceHealth(name, {
            status: 'unhealthy',
            lastCheck: new Date().toISOString(),
            responseTime: 0,
            errorRate: 100
          });
        }
      }

      this.initialized = true;
      console.info('AI Service Manager initialization completed');

    } catch (error) {
      console.error('AI Service Manager initialization failed:', error);
      throw new Error(`AI Service Manager initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform web search using Exa with fallbacks
   */
  async searchWeb(query: AISearchQuery): Promise<AISearchResult[]> {
    this.ensureInitialized();

    const searchId = randomUUID();
    const startTime = Date.now();

    try {
      console.info(`Starting web search ${searchId}:`, { query: query.query, maxResults: query.options?.maxResults });

      // Primary search using Exa
      const exaResults = await this.searchWithExa(query);

      let results: AISearchResult[] = [];

      // Process Exa results
      if (exaResults.results.length > 0) {
        results = await this.processSearchResults(exaResults, query);

        // If contact extraction is requested, scrape content for top results
        if (query.options?.extractContacts && results.length > 0) {
          const topResults = results.slice(0, Math.min(query.options.maxResults || 5, 5));
          const enrichedResults = await this.enrichResultsWithContacts(topResults, query);

          // Merge enriched results back
          enrichedResults.forEach(enriched => {
            const originalIndex = results.findIndex(r => r.url === enriched.url);
            if (originalIndex >= 0) {
              results[originalIndex] = enriched;
            }
          });
        }
      }

      // Fallback search if no results
      if (results.length === 0) {
        console.warn(`No results from primary search, attempting fallback strategies`);
        results = await this.performFallbackSearch(query);
      }

      // Sort by relevance score
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      const duration = Date.now() - startTime;
      console.info(`Web search ${searchId} completed:`, { resultsCount: results.length, duration });

      return results.slice(0, query.options?.maxResults || 10);

    } catch (error) {
      console.error(`Web search ${searchId} failed:`, error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract contacts from content using OpenAI with Anthropic fallback
   */
  async extractContacts(content: string, context: ExtractionContext): Promise<ContactExtractionResponse> {
    this.ensureInitialized();

    const request: ContactExtractionRequest = {
      correlationId: randomUUID(),
      operation: 'extractContacts',
      timestamp: Date.now(),
      content,
      context,
      options: {
        confidence: context.confidence || 70,
        maxContacts: context.maxContacts || 50,
        includeSocial: context.includeSocial || false
      }
    };

    try {
      // Primary extraction using OpenAI
      return await this.services.openai.extractContacts(request);
    } catch (error) {
      console.warn('OpenAI contact extraction failed, trying Anthropic fallback:', error);

      try {
        // Fallback to Anthropic
        return await this.services.anthropic.extractContacts(request);
      } catch (fallbackError) {
        console.error('All contact extraction methods failed:', fallbackError);
        throw new Error(`Contact extraction failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Analyze content using multiple AI services
   */
  async analyzeContent(content: string, analysisType: AnalysisType, context?: any): Promise<AnalysisResult> {
    this.ensureInitialized();

    const result: AnalysisResult = {};

    try {
      // Use OpenAI for primary analysis
      if (analysisType.sentiment || analysisType.topic || analysisType.quality) {
        const analysisTypes = [];
        if (analysisType.sentiment) analysisTypes.push('sentiment');
        if (analysisType.topic) analysisTypes.push('topic');
        if (analysisType.quality) analysisTypes.push('quality');

        for (const type of analysisTypes) {
          try {
            const response = await this.services.openai.analyzeContent({
              correlationId: randomUUID(),
              operation: `analyzeContent_${type}`,
              timestamp: Date.now(),
              content,
              analysisType: type as any,
              context,
              options: { detailLevel: 'detailed', includeReasoning: true }
            });

            result[type] = response.analysis as any;
          } catch (error) {
            console.warn(`OpenAI ${type} analysis failed:`, error);
            // Could try Anthropic fallback here if needed
          }
        }
      }

      // Use Anthropic for contact density and relevance
      if (analysisType.contact_density || analysisType.relevance) {
        const analysisTypes = [];
        if (analysisType.contact_density) analysisTypes.push('contact_density');
        if (analysisType.relevance) analysisTypes.push('relevance');

        for (const type of analysisTypes) {
          try {
            const response = await this.services.anthropic.analyzeContent({
              correlationId: randomUUID(),
              operation: `analyzeContent_${type}`,
              timestamp: Date.now(),
              content,
              analysisType: type as any,
              context,
              options: { detailLevel: 'comprehensive', includeReasoning: true }
            });

            result[type] = response.analysis as any;
          } catch (error) {
            console.warn(`Anthropic ${type} analysis failed:`, error);
          }
        }
      }

      return result;

    } catch (error) {
      console.error('Content analysis failed:', error);
      throw new Error(`Content analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Scrape content from URL using Firecrawl
   */
  async scrapeContent(url: string, options?: any): Promise<ContentScrapingResponse> {
    this.ensureInitialized();

    const request: ContentScrapingRequest = {
      correlationId: randomUUID(),
      operation: 'scrapeContent',
      timestamp: Date.now(),
      url,
      options: {
        includeImages: options?.includeImages || false,
        includeLinks: options?.includeLinks || true,
        waitForJavaScript: options?.waitForJavaScript || 3000,
        customHeaders: options?.customHeaders,
        userAgent: options?.userAgent
      }
    };

    try {
      return await this.services.firecrawl.scrapeContent(request);
    } catch (error) {
      console.error('Content scraping failed:', error);
      throw new Error(`Content scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get health status of all services
   */
  async getServiceHealth(): Promise<ServiceHealth[]> {
    const healthPromises = Object.entries(this.services).map(async ([name, service]) => {
      try {
        return await service.healthCheck();
      } catch (error) {
        return {
          service: name,
          status: 'unhealthy' as const,
          lastCheck: new Date().toISOString(),
          responseTime: 0,
          errorRate: 100,
          uptime: 0,
          requestCount: 0,
          errorCount: 1,
          lastError: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    return Promise.all(healthPromises);
  }

  /**
   * Execute operation with fallback
   */
  async withFallback<T>(operation: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.warn('Primary operation failed, using fallback:', error);
      return await fallback();
    }
  }

  /**
   * Search using Exa API
   */
  private async searchWithExa(query: AISearchQuery): Promise<WebSearchResponse> {
    const request: WebSearchRequest = {
      correlationId: randomUUID(),
      operation: 'searchWeb',
      timestamp: Date.now(),
      query: query.query,
      filters: {
        domains: query.filters?.domains,
        excludeDomains: query.filters?.excludeDomains,
        dateRange: query.filters?.dateRange,
        safeSearch: query.filters?.safeSearch
      },
      options: {
        maxResults: query.options?.maxResults || 10,
        includeSummaries: query.options?.includeSummaries ?? true,
        sortBy: 'relevance'
      }
    };

    return await this.services.exa.searchWeb(request);
  }

  /**
   * Process search results and convert to our format
   */
  private async processSearchResults(exaResults: WebSearchResponse, query: AISearchQuery): Promise<AISearchResult[]> {
    return exaResults.results.map(result => ({
      id: randomUUID(),
      url: result.url,
      title: result.title,
      summary: result.summary,
      confidence: result.authority,
      relevanceScore: result.relevanceScore,
      metadata: {
        source: 'exa',
        publishedDate: result.publishedDate,
        language: result.metadata?.language,
        region: result.metadata?.region,
        contentLength: result.metadata?.contentLength,
        contactCount: 0
      }
    }));
  }

  /**
   * Enrich results with contact information
   */
  private async enrichResultsWithContacts(results: AISearchResult[], query: AISearchQuery): Promise<AISearchResult[]> {
    const enrichedResults = [];

    for (const result of results) {
      try {
        // Scrape content for detailed analysis
        const scrapedContent = await this.scrapeContent(result.url, {
          includeLinks: false,
          includeImages: false,
          waitForJavaScript: 2000
        });

        if (scrapedContent.content && !scrapedContent.error) {
          // Extract contacts from scraped content
          const contactExtraction = await this.extractContacts(scrapedContent.content, {
            source: result.url,
            language: result.metadata.language,
            region: result.metadata.region,
            beats: query.filters?.beats,
            confidence: 70,
            maxContacts: 10,
            includeSocial: true
          });

          enrichedResults.push({
            ...result,
            content: scrapedContent.content,
            contacts: contactExtraction.contacts,
            metadata: {
              ...result.metadata,
              contactCount: contactExtraction.contacts.length,
              extractionTime: contactExtraction.processingTime
            }
          });
        } else {
          enrichedResults.push(result);
        }
      } catch (error) {
        console.warn(`Failed to enrich result ${result.url}:`, error);
        enrichedResults.push(result);
      }
    }

    return enrichedResults;
  }

  /**
   * Perform fallback search strategies
   */
  private async performFallbackSearch(query: AISearchQuery): Promise<AISearchResult[]> {
    const results: AISearchResult[] = [];

    // Strategy 1: Try different query variations
    const queryVariations = [
      query.query,
      `${query.query} media contacts`,
      `${query.query} journalists`,
      `${query.query} editorial team`
    ];

    for (const variation of queryVariations) {
      if (results.length >= (query.options?.maxResults || 10)) break;

      try {
        const fallbackResponse = await this.searchWithExa({
          ...query,
          query: variation,
          options: { ...query.options, maxResults: Math.min(5, (query.options?.maxResults || 10) - results.length) }
        });

        const fallbackResults = await this.processSearchResults(fallbackResponse, query);
        results.push(...fallbackResults);
      } catch (error) {
        console.warn(`Fallback search failed for variation "${variation}":`, error);
      }
    }

    return results;
  }

  /**
   * Ensure manager is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('AI Service Manager not initialized. Call initialize() first.');
    }
  }

  /**
   * Get service metrics
   */
  async getMetrics(): Promise<any> {
    const metrics: any = {};

    for (const [name, service] of Object.entries(this.services)) {
      try {
        metrics[name] = {
          health: await service.healthCheck(),
          metrics: (service as any).getDetailedMetrics?.() || null
        };
      } catch (error) {
        metrics[name] = {
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return metrics;
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown(): Promise<void> {
    console.info('Shutting down AI Service Manager...');

    const shutdownPromises = Object.entries(this.services).map(async ([name, service]) => {
      try {
        await service.shutdown();
        console.info(`${name} service shut down successfully`);
      } catch (error) {
        console.error(`Error shutting down ${name} service:`, error);
      }
    });

    await Promise.all(shutdownPromises);
    this.initialized = false;

    console.info('AI Service Manager shut down completed');
  }
}

// Export class and singleton instance
export { AIServiceManagerImpl };
const aiServiceManager = new AIServiceManagerImpl();
export default aiServiceManager;
export { aiServiceManager };