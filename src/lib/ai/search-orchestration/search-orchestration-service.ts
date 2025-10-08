/**
 * Search Orchestration Service
 * Main orchestrator for AI-powered contact discovery searches
 */

import { PrismaClient, SearchStatus, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';

import { QueryGenerationService } from '../query-generation/service';
import { ContactExtractionService } from '../contact-extraction/contact-extraction-service';
import aiServiceManager, { AISearchQuery } from '../services/manager';

import {
  SearchConfiguration,
  SearchJob,
  SearchProgress,
  SearchStage,
  SearchResult,
  ExtractedContact,
  AggregatedSearchResult,
  SearchOrchestrationConfig,
  SearchRequest,
  SearchResponse,
  ProgressUpdate,
  CancellationRequest,
  CancellationResponse,
  SearchFilter,
  SearchStatistics,
  OrchestrationError,
  HealthCheck,
  OrchestrationMetrics,
  SearchJobMetadata,
  SearchPerformanceMetrics,
  SearchCostBreakdown,
  DuplicateGroup,
  SearchMetrics,
  StageProgress,
  SearchResultMetadata
} from './types';

interface QueuedSearch {
  request: SearchRequest;
  resolve: (response: SearchResponse) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  cancelled: boolean;
}

export class SearchOrchestrationService extends EventEmitter {
  private prisma: PrismaClient;
  private queryGenerationService: QueryGenerationService;
  private contactExtractionService: ContactExtractionService;
  private config: SearchOrchestrationConfig;

  // Job queue management
  private searchQueue: Map<string, QueuedSearch> = new Map();
  private activeSearches: Map<string, SearchJob> = new Map();
  private processingQueue: QueuedSearch[] = [];
  private isProcessing = false;

  // Metrics and monitoring
  private metrics: OrchestrationMetrics;
  private healthStatus: HealthCheck;

  // Cancellation tokens
  private cancellationTokens: Map<string, boolean> = new Map();

  constructor(prisma: PrismaClient, config?: Partial<SearchOrchestrationConfig>) {
    super();
    this.prisma = prisma;
    this.config = this.mergeConfig(config);
    this.queryGenerationService = new QueryGenerationService(prisma);
    this.contactExtractionService = new ContactExtractionService();
    this.metrics = this.initializeMetrics();
    this.healthStatus = this.initializeHealthStatus();

    // Start queue processing
    this.startQueueProcessor();
    this.startMetricsCollector();
    this.startHealthChecker();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    try {
      await this.queryGenerationService.initialize();
      await this.contactExtractionService.cleanup(); // Initialize extraction service

      // Load active searches from database
      await this.loadActiveSearches();

      console.info('Search Orchestration Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Search Orchestration Service:', error);
      throw new Error(`Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit a new search request
   */
  async submitSearch(request: SearchRequest): Promise<SearchResponse> {
    const searchId = randomUUID();
    const correlationId = randomUUID();

    try {
      // Create search job record
      const searchJob = await this.createSearchJob(searchId, request, correlationId);

      // Add to queue
      const queuedSearch: QueuedSearch = {
        request,
        resolve: () => {},
        reject: () => {},
        timeout: setTimeout(() => {
          this.cancelSearch(searchId, request.userId, 'Search timeout');
        }, request.timeout || this.config.timeouts.totalSearch),
        cancelled: false
      };

      this.searchQueue.set(searchId, queuedSearch);

      // Return initial response
      const response: SearchResponse = {
        searchId,
        status: SearchStatus.PENDING,
        progress: this.createInitialProgress(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add to processing queue
      this.addToProcessingQueue(searchId, request);

      return response;

    } catch (error) {
      console.error(`Failed to submit search ${searchId}:`, error);
      throw new Error(`Search submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get search status and progress
   */
  async getSearchStatus(searchId: string, userId?: string): Promise<SearchResponse | null> {
    try {
      const search = await this.prisma.ai_searches.findUnique({
        where: { id: searchId },
        include: {
          ai_search_sources: true,
          ai_extracted_contacts: true
        }
      });

      if (!search) {
        return null;
      }

      if (userId && search.userId !== userId) {
        throw new Error('Access denied: Search does not belong to user');
      }

      // Get active search job if in progress
      const activeSearch = this.activeSearches.get(searchId);
      const progress = activeSearch?.progress || this.createProgressFromSearch(search);

      return {
        searchId,
        status: search.status,
        progress,
        results: activeSearch?.results || [],
        contacts: activeSearch?.results.flatMap(r => r.contacts) || [],
        metrics: this.calculateMetrics(search),
        createdAt: search.created_at,
        updatedAt: search.updated_at
      };

    } catch (error) {
      console.error(`Failed to get search status for ${searchId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel an active search
   */
  async cancelSearch(searchId: string, userId: string, reason?: string): Promise<CancellationResponse> {
    try {
      const search = await this.prisma.ai_searches.findUnique({
        where: { id: searchId }
      });

      if (!search) {
        return {
          searchId,
          success: false,
          message: 'Search not found',
          cancelledAt: new Date()
        };
      }

      if (search.userId !== userId) {
        return {
          searchId,
          success: false,
          message: 'Access denied: Search does not belong to user',
          cancelledAt: new Date()
        };
      }

      if (search.status === SearchStatus.COMPLETED || search.status === SearchStatus.CANCELLED) {
        return {
          searchId,
          success: false,
          message: `Search cannot be cancelled: ${search.status}`,
          cancelledAt: new Date()
        };
      }

      // Set cancellation flag
      this.cancellationTokens.set(searchId, true);

      // Update database
      await this.prisma.ai_searches.update({
        where: { id: searchId },
        data: {
          status: SearchStatus.CANCELLED,
          completed_at: new Date(),
          updated_at: new Date()
        }
      });

      // Remove from active searches
      this.activeSearches.delete(searchId);

      // Clear timeout
      const queuedSearch = this.searchQueue.get(searchId);
      if (queuedSearch?.timeout) {
        clearTimeout(queuedSearch.timeout);
      }
      this.searchQueue.delete(searchId);

      // Update metrics
      this.metrics.cancelledSearches++;
      this.metrics.concurrentSearches = Math.max(0, this.metrics.concurrentSearches - 1);

      // Emit cancellation event
      this.emit('searchCancelled', { searchId, userId, reason });

      return {
        searchId,
        success: true,
        message: reason || 'Search cancelled by user',
        cancelledAt: new Date()
      };

    } catch (error) {
      console.error(`Failed to cancel search ${searchId}:`, error);
      return {
        searchId,
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        cancelledAt: new Date()
      };
    }
  }

  /**
   * Get search statistics
   */
  async getSearchStatistics(userId?: string): Promise<SearchStatistics> {
    try {
      const whereClause = userId ? { userId } : {};

      const searches = await this.prisma.ai_searches.findMany({
        where: whereClause,
        select: {
          status: true,
          created_at: true,
          started_at: true,
          completed_at: true,
          contacts_found: true,
          duration_seconds: true
        }
      });

      const totalSearches = searches.length;
      const activeSearches = searches.filter(s => s.status === SearchStatus.PROCESSING).length;
      const completedSearches = searches.filter(s => s.status === SearchStatus.COMPLETED).length;
      const failedSearches = searches.filter(s => s.status === SearchStatus.FAILED).length;
      const cancelledSearches = searches.filter(s => s.status === SearchStatus.CANCELLED).length;

      const processingTimes = searches
        .filter(s => s.duration_seconds !== null)
        .map(s => s.duration_seconds!);

      const averageProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0;

      const totalContacts = searches.reduce((sum, s) => sum + s.contacts_found, 0);
      const averageContactsPerSearch = totalSearches > 0 ? totalContacts / totalSearches : 0;

      // Get recent searches for top queries
      const recentSearches = await this.prisma.ai_searches.findMany({
        where: {
          ...whereClause,
          created_at: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        },
        select: {
          configuration: true
        },
        orderBy: { created_at: 'desc' },
        take: 100
      });

      const queryCounts = new Map<string, number>();
      recentSearches.forEach(search => {
        const config = search.configuration as any;
        const query = config?.query || 'Unknown';
        queryCounts.set(query, (queryCounts.get(query) || 0) + 1);
      });

      const topQueries = Array.from(queryCounts.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([query, count]) => ({ query, count }));

      return {
        totalSearches,
        activeSearches,
        completedSearches,
        failedSearches,
        cancelledSearches,
        averageProcessingTime,
        averageContactsPerSearch,
        averageResultsPerSearch: 0, // Would need to track results separately
        cacheHitRate: this.metrics.cacheHitRate,
        errorRate: this.metrics.errorRate,
        costPerSearch: this.metrics.costEfficiency,
        searchesByTimeRange: this.calculateSearchesByTimeRange(searches),
        topQueries
      };

    } catch (error) {
      console.error('Failed to get search statistics:', error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<HealthCheck> {
    try {
      const serviceHealth = await aiServiceManager.getServiceHealth();

      // Update health status
      this.healthStatus.services = serviceHealth;
      this.healthStatus.timestamp = new Date();
      this.healthStatus.activeSearches = this.activeSearches.size;
      this.healthStatus.queueSize = this.processingQueue.length;
      this.healthStatus.errorRate = this.metrics.errorRate;
      this.healthStatus.averageResponseTime = this.metrics.averageProcessingTime;

      // Determine overall health
      const unhealthyServices = serviceHealth.filter(s => s.status === 'unhealthy');
      const degradedServices = serviceHealth.filter(s => s.status === 'degraded');

      if (unhealthyServices.length > 0) {
        this.healthStatus.status = 'unhealthy';
      } else if (degradedServices.length > 0 || this.metrics.errorRate > 10) {
        this.healthStatus.status = 'degraded';
      } else {
        this.healthStatus.status = 'healthy';
      }

      return this.healthStatus;

    } catch (error) {
      console.error('Failed to get health status:', error);
      return {
        ...this.healthStatus,
        status: 'unhealthy',
        timestamp: new Date()
      };
    }
  }

  /**
   * Process search queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    if (this.activeSearches.size >= this.config.concurrency.maxConcurrentSearches) {
      return; // Max concurrency reached
    }

    this.isProcessing = true;

    try {
      const search = this.processingQueue.shift();
      if (!search) {
        return;
      }

      const searchId = randomUUID();

      // Check if cancelled
      if (search.cancelled) {
        return;
      }

      // Execute search
      this.executeSearch(searchId, search.request)
        .then(response => {
          search.resolve(response);
        })
        .catch(error => {
          search.reject(error);
        })
        .finally(() => {
          // Clean up
          this.searchQueue.delete(searchId);
          this.activeSearches.delete(searchId);
          this.cancellationTokens.delete(searchId);

          // Continue processing
          this.isProcessing = false;
          setImmediate(() => this.processQueue());
        });

    } catch (error) {
      console.error('Error processing search queue:', error);
      this.isProcessing = false;
    }
  }

  /**
   * Execute a search
   */
  private async executeSearch(searchId: string, request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();
    let currentStage = SearchStage.INITIALIZING;

    try {
      // Create search job
      const searchJob = await this.createSearchJob(searchId, request, randomUUID());
      this.activeSearches.set(searchId, searchJob);

      // Update status to processing
      await this.updateSearchStatus(searchId, SearchStatus.PROCESSING);
      currentStage = SearchStage.QUERY_GENERATION;

      // Check for cancellation
      if (this.isCancelled(searchId)) {
        throw new Error('Search cancelled during initialization');
      }

      // Step 1: Generate queries
      const queries = await this.generateQueries(searchId, request.configuration, searchJob);
      currentStage = SearchStage.WEB_SEARCH;

      // Check for cancellation
      if (this.isCancelled(searchId)) {
        throw new Error('Search cancelled during query generation');
      }

      // Step 2: Perform web searches
      const searchResults = await this.performWebSearches(searchId, queries, searchJob);
      currentStage = SearchStage.CONTENT_SCRAPING;

      // Check for cancellation
      if (this.isCancelled(searchId)) {
        throw new Error('Search cancelled during web search');
      }

      // Step 3: Scrape content if needed
      if (request.configuration.options.enableContentScraping) {
        await this.scrapeContent(searchId, searchResults, searchJob);
      }
      currentStage = SearchStage.CONTACT_EXTRACTION;

      // Check for cancellation
      if (this.isCancelled(searchId)) {
        throw new Error('Search cancelled during content scraping');
      }

      // Step 4: Extract contacts
      if (request.configuration.options.enableContactExtraction) {
        await this.extractContacts(searchId, searchResults, searchJob);
      }
      currentStage = SearchStage.RESULT_AGGREGATION;

      // Check for cancellation
      if (this.isCancelled(searchId)) {
        throw new Error('Search cancelled during contact extraction');
      }

      // Step 5: Aggregate results
      const aggregatedResults = await this.aggregateResults(searchId, searchResults, searchJob);
      currentStage = SearchStage.FINALIZATION;

      // Step 6: Finalize search
      const response = await this.finalizeSearch(searchId, aggregatedResults, searchJob);

      // Update metrics
      this.updateMetrics(response, Date.now() - startTime);

      // Emit completion event
      this.emit('searchCompleted', { searchId, response });

      return response;

    } catch (error) {
      console.error(`Search ${searchId} failed at stage ${currentStage}:`, error);

      // Update search status to failed
      await this.updateSearchStatus(searchId, SearchStatus.FAILED);

      // Update metrics
      this.metrics.failedSearches++;
      this.metrics.errorRate = (this.metrics.failedSearches / this.metrics.searchesProcessed) * 100;

      // Emit error event
      this.emit('searchFailed', { searchId, error, stage: currentStage });

      throw error;
    }
  }

  /**
   * Generate search queries
   */
  private async generateQueries(searchId: string, config: SearchConfiguration, job: SearchJob): Promise<string[]> {
    const startTime = Date.now();

    try {
      // Update progress
      this.updateProgress(searchId, {
        percentage: 10,
        stage: SearchStage.QUERY_GENERATION,
        message: 'Generating search queries...',
        currentStep: 1,
        totalSteps: 5,
        stageProgress: { queryGeneration: 0 }
      });

      const queryRequest = {
        searchId,
        batchId: randomUUID(),
        originalQuery: config.query,
        criteria: {
          countries: config.criteria.countries || [],
          categories: config.criteria.categories || [],
          beats: config.criteria.beats || [],
          languages: config.criteria.languages || []
        },
        options: {
          maxQueries: 20,
          minRelevanceScore: config.options.confidenceThreshold || 0.5,
          enableAIEnhancement: config.options.enableAIEnhancement ?? true
        }
      };

      const result = await this.queryGenerationService.generateQueries(queryRequest);

      // Update progress
      this.updateProgress(searchId, {
        percentage: 20,
        stage: SearchStage.QUERY_GENERATION,
        message: `Generated ${result.queries.length} search queries`,
        currentStep: 1,
        totalSteps: 5,
        stageProgress: { queryGeneration: 100 }
      });

      // Update job metadata
      job.metadata.totalQueries = result.queries.length;
      job.metadata.performanceMetrics.queryGenerationTime = Date.now() - startTime;

      return result.queries.map(q => q.generatedQuery);

    } catch (error) {
      console.error(`Query generation failed for search ${searchId}:`, error);
      throw new Error(`Query generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform web searches
   */
  private async performWebSearches(searchId: string, queries: string[], job: SearchJob): Promise<SearchResult[]> {
    const startTime = Date.now();
    const results: SearchResult[] = [];

    try {
      // Update progress
      this.updateProgress(searchId, {
        percentage: 25,
        stage: SearchStage.WEB_SEARCH,
        message: 'Performing web searches...',
        currentStep: 2,
        totalSteps: 5,
        stageProgress: { webSearch: 0 }
      });

      // Convert to AI search query format
      const aiSearchQuery: AISearchQuery = {
        query: queries[0], // Use first query as primary
        filters: {
          countries: job.configuration.criteria.countries,
          domains: job.configuration.criteria.domains,
          excludeDomains: job.configuration.criteria.excludeDomains,
          safeSearch: job.configuration.criteria.safeSearch as any
        },
        options: {
          maxResults: job.configuration.options.maxResults || 50,
          priority: job.configuration.options.priority,
          includeSummaries: true,
          extractContacts: false, // We'll do this separately
          scrapeContent: false // We'll do this separately
        }
      };

      // Perform search
      const searchResults = await aiServiceManager.searchWeb(aiSearchQuery);

      // Convert to our format
      for (const result of searchResults) {
        const searchResult: SearchResult = {
          id: randomUUID(),
          url: result.url,
          title: result.title,
          summary: result.summary,
          content: result.content,
          publishedDate: result.metadata.publishedDate,
          domain: new URL(result.url).hostname,
          authority: result.confidence,
          relevanceScore: result.relevanceScore,
          confidenceScore: result.confidence,
          contacts: [],
          metadata: {
            language: result.metadata.language,
            region: result.metadata.region,
            contentLength: result.metadata.contentLength,
            contentType: result.metadata.contactCount ? 'contact_page' : 'article',
            author: result.metadata.author,
            image: result.metadata.image,
            contactCount: result.metadata.contactCount || 0,
            searchQuery: queries[0],
            matchedCriteria: []
          },
          sourceType: result.metadata.source,
          processingTime: 0
        };

        results.push(searchResult);
      }

      // Update progress
      this.updateProgress(searchId, {
        percentage: 50,
        stage: SearchStage.WEB_SEARCH,
        message: `Found ${results.length} search results`,
        currentStep: 2,
        totalSteps: 5,
        stageProgress: { webSearch: 100 }
      });

      // Update job
      job.results = results;
      job.metadata.totalSources = results.length;
      job.metadata.performanceMetrics.webSearchTime = Date.now() - startTime;

      return results;

    } catch (error) {
      console.error(`Web search failed for search ${searchId}:`, error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Scrape content from search results
   */
  private async scrapeContent(searchId: string, results: SearchResult[], job: SearchJob): Promise<void> {
    const startTime = Date.now();

    try {
      // Update progress
      this.updateProgress(searchId, {
        percentage: 60,
        stage: SearchStage.CONTENT_SCRAPING,
        message: 'Scraping content from search results...',
        currentStep: 3,
        totalSteps: 5,
        stageProgress: { contentScraping: 0 }
      });

      // Scrape content for top results
      const topResults = results.slice(0, Math.min(10, results.length));

      for (let i = 0; i < topResults.length; i++) {
        if (this.isCancelled(searchId)) {
          break;
        }

        const result = topResults[i];

        try {
          const scrapedContent = await aiServiceManager.scrapeContent(result.url, {
            includeLinks: false,
            includeImages: false,
            waitForJavaScript: 2000
          });

          if (scrapedContent.content && !scrapedContent.error) {
            result.content = scrapedContent.content;
            result.metadata.contentLength = scrapedContent.content.length;
          }

        } catch (error) {
          console.warn(`Failed to scrape content for ${result.url}:`, error);
        }

        // Update progress
        const progressPercentage = 60 + (40 * (i + 1) / topResults.length);
        this.updateProgress(searchId, {
          percentage: progressPercentage,
          stage: SearchStage.CONTENT_SCRAPING,
          message: `Scraped content from ${i + 1}/${topResults.length} results`,
          currentStep: 3,
          totalSteps: 5,
          stageProgress: { contentScraping: Math.round((100 * (i + 1)) / topResults.length) }
        });
      }

      job.metadata.performanceMetrics.contentScrapingTime = Date.now() - startTime;

    } catch (error) {
      console.error(`Content scraping failed for search ${searchId}:`, error);
      // Don't fail the entire search if scraping fails
    }
  }

  /**
   * Extract contacts from search results
   */
  private async extractContacts(searchId: string, results: SearchResult[], job: SearchJob): Promise<void> {
    const startTime = Date.now();

    try {
      // Update progress
      this.updateProgress(searchId, {
        percentage: 70,
        stage: SearchStage.CONTACT_EXTRACTION,
        message: 'Extracting contacts from search results...',
        currentStep: 4,
        totalSteps: 5,
        stageProgress: { contactExtraction: 0 }
      });

      const sourcesWithContent = results.filter(r => r.content && r.content.length > 100);

      for (let i = 0; i < sourcesWithContent.length; i++) {
        if (this.isCancelled(searchId)) {
          break;
        }

        const result = sourcesWithContent[i];

        try {
          const extractionRequest = {
            searchId,
            userId: job.userId,
            sources: [{ url: result.url }],
            options: {
              maxContactsPerSource: job.configuration.options.maxContactsPerSource || 10,
              confidenceThreshold: job.configuration.options.confidenceThreshold || 0.6,
              enableAIEnhancement: job.configuration.options.enableAIEnhancement ?? true,
              enableEmailValidation: true,
              enableSocialDetection: true,
              enableCaching: job.configuration.options.enableCaching ?? true,
              strictValidation: job.configuration.options.strictValidation ?? false,
              processingTimeout: 30000,
              includeBio: true,
              includeSocialProfiles: true
            }
          };

          const extractionResult = await this.contactExtractionService.extractContacts(extractionRequest);

          // Convert extracted contacts to our format
          const contacts: ExtractedContact[] = extractionResult.contacts.map(contact => ({
            id: contact.id,
            name: contact.name,
            title: contact.title,
            bio: contact.bio,
            email: contact.email,
            phone: contact.contactInfo?.phone,
            socialProfiles: contact.socialProfiles as any || [],
            confidenceScore: contact.confidenceScore,
            relevanceScore: contact.relevanceScore,
            qualityScore: contact.qualityScore,
            verificationStatus: contact.verificationStatus,
            extractionMethod: contact.extractionMethod,
            metadata: contact.metadata,
            createdAt: contact.createdAt
          }));

          result.contacts = contacts;
          job.metadata.totalContacts += contacts.length;

        } catch (error) {
          console.warn(`Failed to extract contacts from ${result.url}:`, error);
        }

        // Update progress
        const progressPercentage = 70 + (20 * (i + 1) / sourcesWithContent.length);
        this.updateProgress(searchId, {
          percentage: progressPercentage,
          stage: SearchStage.CONTACT_EXTRACTION,
          message: `Extracted contacts from ${i + 1}/${sourcesWithContent.length} sources`,
          currentStep: 4,
          totalSteps: 5,
          stageProgress: { contactExtraction: Math.round((100 * (i + 1)) / sourcesWithContent.length) }
        });
      }

      job.metadata.performanceMetrics.contactExtractionTime = Date.now() - startTime;

    } catch (error) {
      console.error(`Contact extraction failed for search ${searchId}:`, error);
      // Don't fail the entire search if extraction fails
    }
  }

  /**
   * Aggregate and deduplicate results
   */
  private async aggregateResults(searchId: string, results: SearchResult[], job: SearchJob): Promise<AggregatedSearchResult> {
    const startTime = Date.now();

    try {
      // Update progress
      this.updateProgress(searchId, {
        percentage: 90,
        stage: SearchStage.RESULT_AGGREGATION,
        message: 'Aggregating and deduplicating results...',
        currentStep: 5,
        totalSteps: 5,
        stageProgress: { resultAggregation: 50 }
      });

      // Collect all contacts
      const allContacts = results.flatMap(r => r.contacts);

      // Basic deduplication by email
      const uniqueContacts = new Map<string, ExtractedContact>();
      const duplicates: DuplicateGroup[] = [];

      for (const contact of allContacts) {
        if (contact.email) {
          const existing = uniqueContacts.get(contact.email);
          if (existing) {
            // Create duplicate group
            duplicates.push({
              id: randomUUID(),
              similarityScore: 0.9,
              duplicateType: 'EMAIL',
              contacts: [existing.id, contact.id],
              selectedContact: existing.id,
              verificationStatus: 'PENDING',
              metadata: { reason: 'Email match' }
            });
          } else {
            uniqueContacts.set(contact.email, contact);
          }
        } else {
          // For contacts without email, use name + title combination
          const key = `${contact.name}_${contact.title}`.toLowerCase();
          if (!uniqueContacts.has(key)) {
            uniqueContacts.set(key, contact);
          }
        }
      }

      // Update progress
      this.updateProgress(searchId, {
        percentage: 95,
        stage: SearchStage.RESULT_AGGREGATION,
        message: `Aggregated ${uniqueContacts.size} unique contacts from ${allContacts.length} total`,
        currentStep: 5,
        totalSteps: 5,
        stageProgress: { resultAggregation: 100 }
      });

      // Calculate metrics
      const averageConfidence = uniqueContacts.size > 0
        ? Array.from(uniqueContacts.values()).reduce((sum, c) => sum + c.confidenceScore, 0) / uniqueContacts.size
        : 0;

      const averageQuality = uniqueContacts.size > 0
        ? Array.from(uniqueContacts.values()).reduce((sum, c) => sum + (c.qualityScore || 0), 0) / uniqueContacts.size
        : 0;

      const aggregatedResult: AggregatedSearchResult = {
        searchId,
        status: SearchStatus.PROCESSING,
        totalResults: results.length,
        uniqueContacts: uniqueContacts.size,
        duplicateContacts: allContacts.length - uniqueContacts.size,
        averageConfidence,
        averageQuality,
        processingTime: Date.now() - startTime,
        results,
        contacts: Array.from(uniqueContacts.values()),
        duplicates,
        metrics: this.calculateSearchMetrics(results, Array.from(uniqueContacts.values()), duplicates),
        errors: job.errors
      };

      job.metadata.performanceMetrics.resultAggregationTime = Date.now() - startTime;

      return aggregatedResult;

    } catch (error) {
      console.error(`Result aggregation failed for search ${searchId}:`, error);
      throw new Error(`Result aggregation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finalize search and save to database
   */
  private async finalizeSearch(searchId: string, aggregatedResults: AggregatedSearchResult, job: SearchJob): Promise<SearchResponse> {
    try {
      // Update progress
      this.updateProgress(searchId, {
        percentage: 100,
        stage: SearchStage.FINALIZATION,
        message: 'Finalizing search results...',
        currentStep: 5,
        totalSteps: 5,
        stageProgress: { finalization: 100 }
      });

      // Update search record in database
      await this.prisma.ai_searches.update({
        where: { id: searchId },
        data: {
          status: SearchStatus.COMPLETED,
          contacts_found: aggregatedResults.uniqueContacts,
          contacts_imported: aggregatedResults.uniqueContacts,
          duration_seconds: Math.round(aggregatedResults.processingTime / 1000),
          completed_at: new Date(),
          updated_at: new Date()
        }
      });

      // Save search sources
      const sourceData = aggregatedResults.results.map(result => ({
        id: randomUUID(),
        searchId,
        sourceUrl: result.url,
        sourceType: result.sourceType,
        domain: result.domain,
        title: result.title,
        confidenceScore: result.confidenceScore,
        contactCount: result.contacts.length,
        processingTimeMs: result.processingTime,
        created_at: new Date()
      }));

      await this.prisma.ai_search_sources.createMany({
        data: sourceData,
        skipDuplicates: true
      });

      // Save extracted contacts
      const contactData = aggregatedResults.contacts.map(contact => ({
        id: contact.id,
        searchId,
        sourceUrl: job.results.find(r => r.contacts.includes(contact))?.url || '',
        name: contact.name,
        title: contact.title,
        bio: contact.bio,
        email: contact.email,
        confidenceScore: contact.confidenceScore,
        relevanceScore: contact.relevanceScore,
        qualityScore: contact.qualityScore,
        extractionMethod: contact.extractionMethod,
        socialProfiles: JSON.stringify(contact.socialProfiles || []),
        metadata: JSON.stringify(contact.metadata),
        verificationStatus: contact.verificationStatus,
        processingTimeMs: 0,
        created_at: contact.createdAt
      }));

      await this.prisma.ai_extracted_contact.createMany({
        data: contactData,
        skipDuplicates: true
      });

      // Update job status
      job.status = SearchStatus.COMPLETED;
      job.updatedAt = new Date();
      job.completedAt = new Date();

      // Create response
      const response: SearchResponse = {
        searchId,
        status: SearchStatus.COMPLETED,
        progress: {
          percentage: 100,
          stage: SearchStage.COMPLETED,
          message: 'Search completed successfully',
          currentStep: 5,
          totalSteps: 5,
          stageProgress: {
            queryGeneration: 100,
            webSearch: 100,
            contentScraping: 100,
            contactExtraction: 100,
            resultAggregation: 100,
            finalization: 100
          }
        },
        results: aggregatedResults.results,
        contacts: aggregatedResults.contacts,
        metrics: aggregatedResults.metrics,
        createdAt: job.createdAt,
        updatedAt: new Date()
      };

      return response;

    } catch (error) {
      console.error(`Search finalization failed for ${searchId}:`, error);
      throw new Error(`Search finalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper methods

  private mergeConfig(config?: Partial<SearchOrchestrationConfig>): SearchOrchestrationConfig {
    const defaultConfig: SearchOrchestrationConfig = {
      concurrency: {
        maxConcurrentSearches: 50,
        maxConcurrentQueries: 10,
        maxConcurrentExtractions: 20
      },
      timeouts: {
        queryGeneration: 30000,
        webSearch: 60000,
        contentScraping: 45000,
        contactExtraction: 60000,
        totalSearch: 300000 // 5 minutes
      },
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2
      },
      cache: {
        enabled: true,
        ttl: 3600000, // 1 hour
        maxSize: 1000
      },
      thresholds: {
        minRelevanceScore: 0.3,
        minConfidenceScore: 0.5,
        minQualityScore: 0.3,
        maxResultsPerSource: 50
      }
    };

    if (!config) return defaultConfig;

    return {
      concurrency: { ...defaultConfig.concurrency, ...config.concurrency },
      timeouts: { ...defaultConfig.timeouts, ...config.timeouts },
      retry: { ...defaultConfig.retry, ...config.retry },
      cache: { ...defaultConfig.cache, ...config.cache },
      thresholds: { ...defaultConfig.thresholds, ...config.thresholds }
    };
  }

  private initializeMetrics(): OrchestrationMetrics {
    return {
      searchesProcessed: 0,
      contactsFound: 0,
      averageProcessingTime: 0,
      cacheHitRate: 0,
      costEfficiency: 0,
      errorRate: 0,
      concurrentSearches: 0,
      queueUtilization: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
  }

  private initializeHealthStatus(): HealthCheck {
    return {
      status: 'healthy',
      timestamp: new Date(),
      services: [],
      metrics: this.initializeMetrics(),
      activeSearches: 0,
      queueSize: 0,
      errorRate: 0,
      averageResponseTime: 0
    };
  }

  private createInitialProgress(): SearchProgress {
    return {
      percentage: 0,
      stage: SearchStage.INITIALIZING,
      message: 'Initializing search...',
      currentStep: 0,
      totalSteps: 5,
      stageProgress: {}
    };
  }

  private createProgressFromSearch(search: any): SearchProgress {
    // Create progress object from database search record
    const percentage = search.status === SearchStatus.COMPLETED ? 100 :
                     search.status === SearchStatus.PROCESSING ? 50 : 0;

    return {
      percentage,
      stage: search.status as SearchStage,
      message: this.getStageMessage(search.status as SearchStage),
      currentStep: Math.ceil(percentage / 20),
      totalSteps: 5,
      stageProgress: {}
    };
  }

  private getStageMessage(stage: SearchStage): string {
    switch (stage) {
      case SearchStage.INITIALIZING: return 'Initializing search...';
      case SearchStage.QUERY_GENERATION: return 'Generating search queries...';
      case SearchStage.WEB_SEARCH: return 'Performing web searches...';
      case SearchStage.CONTENT_SCRAPING: return 'Scraping content...';
      case SearchStage.CONTACT_EXTRACTION: return 'Extracting contacts...';
      case SearchStage.RESULT_AGGREGATION: return 'Aggregating results...';
      case SearchStage.FINALIZATION: return 'Finalizing search...';
      case SearchStage.COMPLETED: return 'Search completed';
      case SearchStage.FAILED: return 'Search failed';
      case SearchStage.CANCELLED: return 'Search cancelled';
      default: return 'Processing...';
    }
  }

  private async createSearchJob(searchId: string, request: SearchRequest, correlationId: string): Promise<SearchJob> {
    const job: SearchJob = {
      id: randomUUID(),
      searchId,
      userId: request.userId,
      configuration: request.configuration,
      status: SearchStatus.PENDING,
      progress: this.createInitialProgress(),
      results: [],
      errors: [],
      metadata: {
        correlationId,
        totalQueries: 0,
        totalSources: 0,
        totalContacts: 0,
        processingTime: 0,
        cacheHit: false,
        retryCount: 0,
        costBreakdown: {
          queryGeneration: 0,
          webSearch: 0,
          contentScraping: 0,
          contactExtraction: 0,
          total: 0
        },
        performanceMetrics: {
          queryGenerationTime: 0,
          webSearchTime: 0,
          contentScrapingTime: 0,
          contactExtractionTime: 0,
          resultAggregationTime: 0,
          totalTime: 0,
          sourcesProcessed: 0,
          contactsFound: 0,
          contactsImported: 0,
          cacheHitRate: 0,
          errorRate: 0
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create database record
    await this.prisma.ai_searches.create({
      data: {
        id: searchId,
        userId: request.userId,
        status: SearchStatus.PENDING,
        configuration: request.configuration as any,
        contacts_found: 0,
        contacts_imported: 0,
        created_at: job.createdAt,
        updated_at: job.updatedAt
      }
    });

    return job;
  }

  private addToProcessingQueue(searchId: string, request: SearchRequest): void {
    // Sort by priority
    const priorityMap = { high: 0, normal: 1, low: 2 };
    const priority = priorityMap[request.configuration.options.priority || 'normal'];

    const queuedSearch: QueuedSearch = {
      request,
      resolve: () => {},
      reject: () => {},
      timeout: setTimeout(() => {
        this.cancelSearch(searchId, request.userId, 'Search timeout');
      }, request.timeout || this.config.timeouts.totalSearch),
      cancelled: false
    };

    // Insert in priority order
    let insertIndex = this.processingQueue.length;
    for (let i = 0; i < this.processingQueue.length; i++) {
      const itemPriority = priorityMap[this.processingQueue[i].request.configuration.options.priority || 'normal'];
      if (priority < itemPriority) {
        insertIndex = i;
        break;
      }
    }

    this.processingQueue.splice(insertIndex, 0, queuedSearch);

    // Start processing if not already running
    setImmediate(() => this.processQueue());
  }

  private async loadActiveSearches(): Promise<void> {
    try {
      const activeSearches = await this.prisma.ai_searches.findMany({
        where: {
          status: {
            in: [SearchStatus.PENDING, SearchStatus.PROCESSING]
          }
        },
        include: {
          ai_search_sources: true,
          ai_extracted_contacts: true
        }
      });

      for (const search of activeSearches) {
        // Check if search is too old (more than 1 hour)
        if (Date.now() - search.created_at.getTime() > 3600000) {
          await this.prisma.ai_searches.update({
            where: { id: search.id },
            data: {
              status: SearchStatus.FAILED,
              completed_at: new Date(),
              updated_at: new Date()
            }
          });
        }
      }

      console.info(`Loaded ${activeSearches.length} active searches`);

    } catch (error) {
      console.error('Failed to load active searches:', error);
    }
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 1000); // Process queue every second
  }

  private startMetricsCollector(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 30000); // Collect metrics every 30 seconds
  }

  private startHealthChecker(): void {
    setInterval(() => {
      this.getHealthStatus();
    }, 60000); // Check health every minute
  }

  private collectMetrics(): void {
    this.metrics.concurrentSearches = this.activeSearches.size;
    this.metrics.queueUtilization = this.processingQueue.length / this.config.concurrency.maxConcurrentSearches;
    this.metrics.averageProcessingTime = this.metrics.averageProcessingTime; // Would calculate from recent searches
  }

  private calculateMetrics(search: any): SearchMetrics {
    // Calculate metrics from search data
    return {
      queryMetrics: {
        totalGenerated: 0,
        totalDuplicates: 0,
        averageScore: 0,
        diversityScore: 0,
        coverageByCriteria: {}
      },
      sourceMetrics: {
        totalSources: search.ai_search_sources?.length || 0,
        successfulSources: search.ai_search_sources?.length || 0,
        failedSources: 0,
        averageAuthority: 0,
        contentQualityDistribution: {}
      },
      contactMetrics: {
        totalFound: search.contacts_found,
        totalImported: search.contacts_imported,
        averageConfidence: 0.7, // Would calculate from actual contacts
        averageQuality: 0.7,
        confidenceDistribution: {},
        extractionMethodBreakdown: {}
      },
      performanceMetrics: {
        processingSpeed: 0,
        accuracyEstimate: 0.7,
        cacheEffectiveness: 0.3,
        costEfficiency: 0.05
      }
    };
  }

  private calculateSearchMetrics(results: SearchResult[], contacts: ExtractedContact[], duplicates: DuplicateGroup[]): SearchMetrics {
    return {
      queryMetrics: {
        totalGenerated: results.length,
        totalDuplicates: duplicates.length,
        averageScore: results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length,
        diversityScore: 0.7, // Would calculate actual diversity
        coverageByCriteria: {}
      },
      sourceMetrics: {
        totalSources: results.length,
        successfulSources: results.length,
        failedSources: 0,
        averageAuthority: results.reduce((sum, r) => sum + r.authority, 0) / results.length,
        contentQualityDistribution: {}
      },
      contactMetrics: {
        totalFound: contacts.length + duplicates.length,
        totalImported: contacts.length,
        averageConfidence: contacts.reduce((sum, c) => sum + c.confidenceScore, 0) / contacts.length,
        averageQuality: contacts.reduce((sum, c) => sum + (c.qualityScore || 0), 0) / contacts.length,
        confidenceDistribution: {},
        extractionMethodBreakdown: contacts.reduce((acc, c) => {
          acc[c.extractionMethod] = (acc[c.extractionMethod] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      performanceMetrics: {
        processingSpeed: contacts.length / 30, // contacts per second
        accuracyEstimate: contacts.reduce((sum, c) => sum + c.confidenceScore, 0) / contacts.length,
        cacheEffectiveness: 0.3,
        costEfficiency: 0.05
      }
    };
  }

  private calculateSearchesByTimeRange(searches: any[]): Record<string, number> {
    const ranges = {
      'Last 24h': 0,
      'Last 7d': 0,
      'Last 30d': 0,
      'Older': 0
    };

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const week = 7 * day;
    const month = 30 * day;

    for (const search of searches) {
      const age = now - search.created_at.getTime();
      if (age <= day) ranges['Last 24h']++;
      else if (age <= week) ranges['Last 7d']++;
      else if (age <= month) ranges['Last 30d']++;
      else ranges['Older']++;
    }

    return ranges;
  }

  private updateProgress(searchId: string, progress: Partial<SearchProgress>): void {
    const search = this.activeSearches.get(searchId);
    if (search) {
      search.progress = { ...search.progress, ...progress };
      search.updatedAt = new Date();

      // Emit progress update event
      this.emit('progressUpdate', {
        searchId,
        progress: search.progress,
        timestamp: new Date()
      } as ProgressUpdate);
    }
  }

  private async updateSearchStatus(searchId: string, status: SearchStatus): Promise<void> {
    try {
      await this.prisma.ai_searches.update({
        where: { id: searchId },
        data: {
          status,
          updated_at: new Date(),
          ...(status === SearchStatus.PROCESSING && { started_at: new Date() }),
          ...(status === SearchStatus.COMPLETED && { completed_at: new Date() })
        }
      });

      const search = this.activeSearches.get(searchId);
      if (search) {
        search.status = status;
        search.updatedAt = new Date();

        if (status === SearchStatus.PROCESSING) {
          search.startedAt = new Date();
        } else if (status === SearchStatus.COMPLETED) {
          search.completedAt = new Date();
        }
      }

    } catch (error) {
      console.error(`Failed to update search status for ${searchId}:`, error);
    }
  }

  private isCancelled(searchId: string): boolean {
    return this.cancellationTokens.get(searchId) || false;
  }

  private updateMetrics(response: SearchResponse, processingTime: number): void {
    this.metrics.searchesProcessed++;
    this.metrics.contactsFound += response.contacts?.length || 0;

    // Update average processing time
    const totalTime = this.metrics.averageProcessingTime * (this.metrics.searchesProcessed - 1) + processingTime;
    this.metrics.averageProcessingTime = totalTime / this.metrics.searchesProcessed;

    // Update error rate
    this.metrics.errorRate = (this.metrics.failedSearches / this.metrics.searchesProcessed) * 100;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.info('Shutting down Search Orchestration Service...');

    // Cancel all active searches
    for (const [searchId, search] of this.activeSearches) {
      try {
        await this.cancelSearch(searchId, search.userId, 'Service shutdown');
      } catch (error) {
        console.error(`Failed to cancel search ${searchId}:`, error);
      }
    }

    // Clear timeouts
    for (const [searchId, queuedSearch] of this.searchQueue) {
      if (queuedSearch.timeout) {
        clearTimeout(queuedSearch.timeout);
      }
    }

    // Clean up extraction service
    await this.contactExtractionService.cleanup();

    // Clear all data structures
    this.activeSearches.clear();
    this.searchQueue.clear();
    this.processingQueue.length = 0;
    this.cancellationTokens.clear();

    // Remove all listeners
    this.removeAllListeners();

    console.info('Search Orchestration Service shut down completed');
  }
}