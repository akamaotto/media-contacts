/**
 * Query Generation Service
 * Main service that orchestrates query generation, enhancement, scoring, and deduplication
 */

import { PrismaClient } from '@prisma/client';
import { QueryTemplateEngine } from './template-engine';
import { AIQueryEnhancer } from './ai-enhancement';
import { QueryScorer } from './scoring';
import { QueryDeduplicator } from './deduplication';
import {
  QueryGenerationRequest,
  QueryGenerationResult,
  GeneratedQuery,
  QueryScores,
  QueryPerformanceMetrics,
  QueryGenerationError,
  QueryStatus,
  QueryType,
  QueryOperationType,
  QueryGenerationConfig
} from './types';

export class QueryGenerationService {
  private prisma: PrismaClient;
  private templateEngine: QueryTemplateEngine;
  private aiEnhancer: AIQueryEnhancer;
  private queryScorer: QueryScorer;
  private deduplicator: QueryDeduplicator;
  private config: QueryGenerationConfig;

  constructor(prisma: PrismaClient, config?: Partial<QueryGenerationConfig>) {
    this.prisma = prisma;
    this.config = this.mergeConfig(config);
    this.templateEngine = new QueryTemplateEngine(prisma);
    this.aiEnhancer = new AIQueryEnhancer();
    this.queryScorer = new QueryScorer();
    this.deduplicator = new QueryDeduplicator();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.templateEngine.initialize();
    console.log('Query Generation Service initialized');
  }

  /**
   * Generate queries for a search request
   */
  async generateQueries(request: QueryGenerationRequest): Promise<QueryGenerationResult> {
    const startTime = Date.now();
    let generatedQueries: GeneratedQuery[] = [];
    const errors: string[] = [];

    try {
      // Log operation start
      await this.logPerformance({
        queryId: '',
        searchId: request.searchId,
        batchId: request.batchId,
        operation: QueryOperationType.TEMPLATE_SELECTION,
        startTime: new Date(),
        status: 'STARTED'
      });

      // Step 1: Select and generate from templates
      const templateQueries = await this.generateFromTemplates(request);
      generatedQueries.push(...templateQueries);

      // Step 2: AI enhancement (if enabled)
      if (request.options.enableAIEnhancement && this.config.ai.enabled) {
        try {
          const enhancedQueries = await this.enhanceWithAI(request);
          generatedQueries.push(...enhancedQueries);
        } catch (error) {
          console.warn('AI enhancement failed:', error);
          errors.push(`AI enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Step 3: Score all queries
      const scoredQueries = await this.scoreQueries(generatedQueries, request);

      // Step 4: Deduplicate queries
      const deduplicationResult = await this.deduplicateQueries(scoredQueries, request);

      // Step 5: Filter and select final queries
      const finalQueries = await this.selectFinalQueries(deduplicationResult.uniqueQueries, request);

      // Step 6: Save to database
      await this.saveQueries(finalQueries);

      // Step 7: Generate result
      const result = await this.generateResult(request, finalQueries, deduplicationResult, errors);

      // Log completion
      await this.logPerformance({
        queryId: '',
        searchId: request.searchId,
        batchId: request.batchId,
        operation: QueryOperationType.VALIDATION,
        startTime: new Date(),
        endTime: new Date(),
        durationMs: Date.now() - startTime,
        status: 'COMPLETED',
        metadata: {
          totalGenerated: generatedQueries.length,
          finalQueries: finalQueries.length,
          processingTime: Date.now() - startTime
        }
      });

      console.log(`Query generation completed: ${finalQueries.length} queries generated in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      console.error('Query generation failed:', error);

      await this.logPerformance({
        queryId: '',
        searchId: request.searchId,
        batchId: request.batchId,
        operation: QueryOperationType.VALIDATION,
        startTime: new Date(),
        endTime: new Date(),
        durationMs: Date.now() - startTime,
        status: 'FAILED',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      throw new QueryGenerationError(
        `Query generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_FAILED',
        'AI_ERROR',
        { error, request }
      );
    }
  }

  /**
   * Generate queries from templates
   */
  private async generateFromTemplates(request: QueryGenerationRequest): Promise<GeneratedQuery[]> {
    const startTime = Date.now();

    await this.logPerformance({
      queryId: '',
      searchId: request.searchId,
      batchId: request.batchId,
      operation: QueryOperationType.TEMPLATE_SELECTION,
      startTime: new Date(),
      status: 'PROCESSING'
    });

    const templates = await this.templateEngine.selectTemplates(request);
    const templateResults = await this.templateEngine.generateFromTemplates(templates, request);

    const generatedQueries: GeneratedQuery[] = [];

    for (const result of templateResults) {
      const query: GeneratedQuery = {
        id: this.generateId(),
        searchId: request.searchId,
        batchId: request.batchId,
        originalQuery: request.originalQuery,
        generatedQuery: result.query,
        templateId: result.templateId,
        queryType: QueryType.BASE,
        criteria: {
          country: request.criteria.countries?.[0],
          category: request.criteria.categories?.[0],
          beat: request.criteria.beats?.[0],
          language: request.criteria.languages?.[0]
        },
        scores: { relevance: 0, diversity: 0, complexity: 0, overall: 0 },
        metadata: {
          templateUsed: result.templateId,
          aiEnhanced: false,
          processingMs: Date.now() - startTime
        },
        status: QueryStatus.COMPLETED,
        createdAt: new Date()
      };

      generatedQueries.push(query);
    }

    await this.logPerformance({
      queryId: '',
      searchId: request.searchId,
      batchId: request.batchId,
      operation: QueryOperationType.TEMPLATE_SELECTION,
      startTime: new Date(),
      endTime: new Date(),
      durationMs: Date.now() - startTime,
      status: 'COMPLETED',
      metadata: { templateQueriesGenerated: generatedQueries.length }
    });

    return generatedQueries;
  }

  /**
   * Enhance queries with AI
   */
  private async enhanceWithAI(request: QueryGenerationRequest): Promise<GeneratedQuery[]> {
    const startTime = Date.now();

    await this.logPerformance({
      queryId: '',
      searchId: request.searchId,
      batchId: request.batchId,
      operation: QueryOperationType.AI_ENHANCEMENT,
      startTime: new Date(),
      status: 'PROCESSING'
    });

    const enhancedQueries: GeneratedQuery[] = [];

    // Generate different types of enhancements
    const enhancementTypes: Array<'expansion' | 'refinement' | 'localization'> = ['expansion', 'refinement'];

    if (request.criteria.countries && request.criteria.countries.length > 0) {
      enhancementTypes.push('localization');
    }

    for (const enhancementType of enhancementTypes) {
      try {
        const enhancementRequest = {
          baseQuery: request.originalQuery,
          criteria: request.criteria,
          enhancementType,
          targetCount: Math.ceil(request.options.maxQueries / enhancementTypes.length),
          diversityBoost: true
        };

        const aiQueries = await this.aiEnhancer.enhanceQuery(enhancementRequest);

        for (const queryText of aiQueries) {
          const query: GeneratedQuery = {
            id: this.generateId(),
            searchId: request.searchId,
            batchId: request.batchId,
            originalQuery: request.originalQuery,
            generatedQuery: queryText,
            queryType: this.mapEnhancementTypeToQueryType(enhancementType),
            criteria: {
              country: request.criteria.countries?.[0],
              category: request.criteria.categories?.[0],
              beat: request.criteria.beats?.[0],
              language: request.criteria.languages?.[0]
            },
            scores: { relevance: 0, diversity: 0, complexity: 0, overall: 0 },
            metadata: {
              aiEnhanced: true,
              processingMs: Date.now() - startTime,
              enhancementType
            },
            status: QueryStatus.COMPLETED,
            createdAt: new Date()
          };

          enhancedQueries.push(query);
        }

      } catch (error) {
        console.warn(`AI ${enhancementType} enhancement failed:`, error);
      }
    }

    await this.logPerformance({
      queryId: '',
      searchId: request.searchId,
      batchId: request.batchId,
      operation: QueryOperationType.AI_ENHANCEMENT,
      startTime: new Date(),
      endTime: new Date(),
      durationMs: Date.now() - startTime,
      status: 'COMPLETED',
      metadata: { aiQueriesGenerated: enhancedQueries.length }
    });

    return enhancedQueries;
  }

  /**
   * Score queries
   */
  private async scoreQueries(queries: GeneratedQuery[], request: QueryGenerationRequest): Promise<GeneratedQuery[]> {
    const startTime = Date.now();

    await this.logPerformance({
      queryId: '',
      searchId: request.searchId,
      batchId: request.batchId,
      operation: QueryOperationType.SCORING,
      startTime: new Date(),
      status: 'PROCESSING'
    });

    const scoredQueries: GeneratedQuery[] = [];

    // Prepare queries for scoring
    const scoringData = queries.map(query => ({
      query: query.generatedQuery,
      originalQuery: query.originalQuery,
      criteria: request.criteria,
      metadata: query.metadata
    }));

    // Score and rank queries
    const rankedQueries = await this.queryScorer.scoreAndRankQueries(scoringData);

    // Update queries with scores
    for (let i = 0; i < rankedQueries.length; i++) {
      const scoredQuery = rankedQueries[i];
      const originalQuery = queries.find(q => q.generatedQuery === scoredQuery.query);

      if (originalQuery) {
        originalQuery.scores = scoredQuery.scores;
        scoredQueries.push(originalQuery);
      }
    }

    await this.logPerformance({
      queryId: '',
      searchId: request.searchId,
      batchId: request.batchId,
      operation: QueryOperationType.SCORING,
      startTime: new Date(),
      endTime: new Date(),
      durationMs: Date.now() - startTime,
      status: 'COMPLETED',
      metadata: { queriesScored: scoredQueries.length }
    });

    return scoredQueries;
  }

  /**
   * Deduplicate queries
   */
  private async deduplicateQueries(queries: GeneratedQuery[], request: QueryGenerationRequest): Promise<{ uniqueQueries: GeneratedQuery[], deduplicationResult: any }> {
    const startTime = Date.now();

    await this.logPerformance({
      queryId: '',
      searchId: request.searchId,
      batchId: request.batchId,
      operation: QueryOperationType.DEDUPLICATION,
      startTime: new Date(),
      status: 'PROCESSING'
    });

    const deduplicationResult = await this.deduplicator.deduplicateQueries(queries, {
      method: 'hybrid',
      similarityThreshold: 0.8,
      keepHighestScored: true
    });

    // Get unique queries
    const uniqueQueries = queries.filter(query => deduplicationResult.uniqueQueries.includes(query.id));

    // Mark duplicates
    for (const duplicate of deduplicationResult.duplicates) {
      const query = queries.find(q => q.id === duplicate.queryId);
      if (query) {
        query.status = QueryStatus.CANCELLED;
        query.metadata = {
          ...query.metadata,
          duplicateOf: duplicate.duplicateOf,
          duplicateReason: duplicate.reason,
          similarity: duplicate.similarity
        };
      }
    }

    await this.logPerformance({
      queryId: '',
      searchId: request.searchId,
      batchId: request.batchId,
      operation: QueryOperationType.DEDUPLICATION,
      startTime: new Date(),
      endTime: new Date(),
      durationMs: Date.now() - startTime,
      status: 'COMPLETED',
      metadata: {
        totalProcessed: deduplicationResult.deduplicationStats.totalProcessed,
        duplicatesRemoved: deduplicationResult.deduplicationStats.duplicatesRemoved,
        uniqueQueries: deduplicationResult.deduplicationStats.uniqueQueries
      }
    });

    return { uniqueQueries, deduplicationResult };
  }

  /**
   * Select final queries
   */
  private async selectFinalQueries(queries: GeneratedQuery[], request: QueryGenerationRequest): Promise<GeneratedQuery[]> {
    // Filter by minimum score
    const filteredQueries = queries.filter(query =>
      query.scores.overall >= request.options.minRelevanceScore
    );

    // Sort by score (already done) and limit
    const finalQueries = filteredQueries
      .slice(0, request.options.maxQueries)
      .map(query => ({
        ...query,
        status: QueryStatus.COMPLETED
      }));

    return finalQueries;
  }

  /**
   * Save queries to database
   */
  private async saveQueries(queries: GeneratedQuery[]): Promise<void> {
    const savePromises = queries.map(query =>
      this.prisma.ai_generated_queries.create({
        data: {
          id: query.id,
          searchId: query.searchId,
          batchId: query.batchId,
          originalQuery: query.originalQuery,
          generatedQuery: query.generatedQuery,
          templateId: query.templateId,
          queryType: query.queryType,
          country: query.criteria.country,
          category: query.criteria.category,
          beat: query.criteria.beat,
          language: query.criteria.language,
          score: query.scores.overall,
          diversityScore: query.scores.diversity,
          relevanceScore: query.scores.relevance,
          complexityScore: query.scores.complexity,
          isDuplicate: query.status === QueryStatus.CANCELLED,
          duplicateOf: query.metadata?.duplicateOf,
          status: query.status,
          processingTimeMs: query.metadata?.processingMs,
          created_at: query.createdAt,
          updated_at: new Date()
        }
      })
    );

    await Promise.all(savePromises);
  }

  /**
   * Generate result object
   */
  private async generateResult(
    request: QueryGenerationRequest,
    queries: GeneratedQuery[],
    deduplicationResult: any,
    errors: string[]
  ): Promise<QueryGenerationResult> {
    const totalGenerated = queries.length;
    const totalDuplicates = deduplicationResult.deduplicationStats.duplicatesRemoved;
    const averageScore = queries.reduce((sum, q) => sum + q.scores.overall, 0) / totalGenerated;
    const processingTimeMs = Date.now() - (new Date().getTime() - 1000); // Approximate

    // Calculate coverage by criteria
    const coverageByCriteria = {
      countries: [...new Set(queries.map(q => q.criteria.country).filter(Boolean))],
      categories: [...new Set(queries.map(q => q.criteria.category).filter(Boolean))],
      beats: [...new Set(queries.map(q => q.criteria.beat).filter(Boolean))],
      languages: [...new Set(queries.map(q => q.criteria.language).filter(Boolean))]
    };

    // Calculate diversity score
    const diversityScore = queries.reduce((sum, q) => sum + q.scores.diversity, 0) / totalGenerated;

    const status = totalGenerated > 0 ? 'completed' : (errors.length > 0 ? 'partial' : 'failed');

    return {
      searchId: request.searchId,
      batchId: request.batchId,
      originalQuery: request.originalQuery,
      queries,
      metrics: {
        totalGenerated,
        totalDuplicates,
        averageScore,
        processingTimeMs,
        diversityScore,
        coverageByCriteria
      },
      status,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Log performance metrics
   */
  private async logPerformance(metrics: Partial<QueryPerformanceMetrics>): Promise<void> {
    try {
      await this.prisma.ai_query_performance_logs.create({
        data: {
          id: this.generateId(),
          queryId: metrics.queryId || '',
          searchId: metrics.searchId,
          batchId: metrics.batchId,
          operation: metrics.operation || QueryOperationType.VALIDATION,
          startTime: metrics.startTime,
          endTime: metrics.endTime,
          durationMs: metrics.durationMs,
          status: metrics.status || 'UNKNOWN',
          tokensGenerated: metrics.tokensGenerated,
          tokensProcessed: metrics.tokensProcessed,
          modelUsed: metrics.modelUsed,
          successRate: metrics.successRate,
          relevanceScore: metrics.relevanceScore,
          metadata: metrics.metadata || {},
          created_at: new Date()
        }
      });
    } catch (error) {
      console.warn('Failed to log performance metrics:', error);
    }
  }

  /**
   * Map enhancement type to query type
   */
  private mapEnhancementTypeToQueryType(type: string): QueryType {
    switch (type) {
      case 'expansion':
        return QueryType.EXPANDED;
      case 'refinement':
        return QueryType.REFINED;
      case 'localization':
        return QueryType.LOCALIZED;
      default:
        return QueryType.ENHANCED;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `qg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Merge configuration with defaults
   */
  private mergeConfig(config?: Partial<QueryGenerationConfig>): QueryGenerationConfig {
    const defaultConfig: QueryGenerationConfig = {
      ai: {
        enabled: true,
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 1000,
        timeoutMs: 30000
      },
      templates: {
        maxTemplatesPerQuery: 20,
        cacheEnabled: true,
        cacheTTL: 3600000
      },
      scoring: {
        relevanceWeight: 0.4,
        diversityWeight: 0.25,
        complexityWeight: 0.2,
        minScore: 0.3
      },
      deduplication: {
        enabled: true,
        similarityThreshold: 0.8,
        method: 'hybrid'
      },
      performance: {
        trackingEnabled: true,
        batchProcessing: true,
        maxConcurrent: 5,
        timeoutMs: 60000
      }
    };

    if (!config) return defaultConfig;

    return {
      ai: { ...defaultConfig.ai, ...config.ai },
      templates: { ...defaultConfig.templates, ...config.templates },
      scoring: { ...defaultConfig.scoring, ...config.scoring },
      deduplication: { ...defaultConfig.deduplication, ...config.deduplication },
      performance: { ...defaultConfig.performance, ...config.performance }
    };
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<{
    templateStats: any;
    aiStats: any;
    scoringStats: any;
    deduplicationStats: any;
  }> {
    const [templateStats, aiStats, scoringStats, deduplicationStats] = await Promise.all([
      this.templateEngine.getTemplateStats(),
      Promise.resolve(this.aiEnhancer.getStats()),
      Promise.resolve({}), // Placeholder for scoring stats
      Promise.resolve({})  // Placeholder for deduplication stats
    ]);

    return {
      templateStats,
      aiStats,
      scoringStats,
      deduplicationStats
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<QueryGenerationConfig>): void {
    this.config = this.mergeConfig(newConfig);
  }

  /**
   * Get current configuration
   */
  getConfig(): QueryGenerationConfig {
    return { ...this.config };
  }
}