/**
 * AI-Powered Query Enhancement
 * Uses AI models to expand and optimize base queries
 */

import { aiServiceManager, type AISearchResult } from '../services';
import {
  QueryCriteria,
  QueryEnhancementRequest,
  QueryGenerationError,
  QueryValidationResult,
  QueryEnhancementType
} from './types';

export class AIQueryEnhancer {
  private maxRetries = 3;
  private timeoutMs = 30000;

  /**
   * Enhance a base query using AI
   */
  async enhanceQuery(request: QueryEnhancementRequest): Promise<string[]> {
    const startTime = Date.now();

    try {
      let enhancedQueries: string[] = [];

      switch (request.enhancementType) {
        case 'expansion':
          enhancedQueries = await this.expandQuery(request);
          break;
        case 'refinement':
          enhancedQueries = await this.refineQuery(request);
          break;
        case 'localization':
          enhancedQueries = await this.localizeQuery(request);
          break;
        default:
          throw new QueryGenerationError(
            `Unknown enhancement type: ${request.enhancementType}`,
            'UNKNOWN_TYPE',
            'AI_ERROR'
          );
      }

      // Add diversity if requested
      if (request.diversityBoost) {
        enhancedQueries = await this.addDiversity(enhancedQueries, request.criteria);
      }

      // Validate and filter enhanced queries
      const validQueries = enhancedQueries
        .map(query => this.validateQuery(query))
        .filter(validation => validation.isValid)
        .map(validation => validation.normalizedQuery || validation.query || '')
        .filter(query => query.length > 0)
        .slice(0, request.targetCount);

      console.log(`AI enhancement completed in ${Date.now() - startTime}ms. Generated ${validQueries.length} valid queries.`);

      return validQueries;

    } catch (error) {
      console.error('AI query enhancement failed:', error);
      throw new QueryGenerationError(
        `AI enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_ENHANCEMENT_FAILED',
        'AI_ERROR',
        { originalError: error, request }
      );
    }
  }

  /**
   * Expand a query with variations and synonyms
   */
  private async expandQuery(request: QueryEnhancementRequest): Promise<string[]> {
    const prompt = this.buildExpansionPrompt(request.baseQuery, request.criteria);

    const aiResult = await this.callAI(prompt, 'query_expansion');

    if (!aiResult.success || !aiResult.content) {
      throw new QueryGenerationError(
        'AI expansion failed to generate content',
        'EXPANSION_FAILED',
        'AI_ERROR',
        { aiResult }
      );
    }

    return this.parseAIResponse(aiResult.content);
  }

  /**
   * Refine a query for better precision
   */
  private async refineQuery(request: QueryEnhancementRequest): Promise<string[]> {
    const prompt = this.buildRefinementPrompt(request.baseQuery, request.criteria);

    const aiResult = await this.callAI(prompt, 'query_refinement');

    if (!aiResult.success || !aiResult.content) {
      throw new QueryGenerationError(
        'AI refinement failed to generate content',
        'REFINEMENT_FAILED',
        'AI_ERROR',
        { aiResult }
      );
    }

    return this.parseAIResponse(aiResult.content);
  }

  /**
   * Localize a query for specific countries/languages
   */
  private async localizeQuery(request: QueryEnhancementRequest): Promise<string[]> {
    const localizedQueries: string[] = [];

    // Generate localized versions for each country
    if (request.criteria.countries && request.criteria.countries.length > 0) {
      for (const country of request.criteria.countries) {
        const prompt = this.buildLocalizationPrompt(request.baseQuery, country, request.criteria);

        try {
          const aiResult = await this.callAI(prompt, 'query_localization');

          if (aiResult.success && aiResult.content) {
            const queries = this.parseAIResponse(aiResult.content);
            localizedQueries.push(...queries);
          }
        } catch (error) {
          console.warn(`Localization failed for country ${country}:`, error);
        }
      }
    }

    // Generate language-specific versions
    if (request.criteria.languages && request.criteria.languages.length > 0) {
      for (const language of request.criteria.languages) {
        const prompt = this.buildLanguagePrompt(request.baseQuery, language, request.criteria);

        try {
          const aiResult = await this.callAI(prompt, 'query_language_specific');

          if (aiResult.success && aiResult.content) {
            const queries = this.parseAIResponse(aiResult.content);
            localizedQueries.push(...queries);
          }
        } catch (error) {
          console.warn(`Language-specific query failed for ${language}:`, error);
        }
      }
    }

    return localizedQueries;
  }

  /**
   * Add diversity to a set of queries
   */
  private async addDiversity(queries: string[], criteria: Partial<QueryCriteria>): Promise<string[]> {
    if (queries.length === 0) return queries;

    const diverseQueries = [...queries];

    // Add category variations
    if (criteria.categories && criteria.categories.length > 0) {
      for (const category of criteria.categories) {
        const categoryPrompts = queries.map(query => `${query} ${category}`);
        diverseQueries.push(...categoryPrompts);
      }
    }

    // Add beat variations
    if (criteria.beats && criteria.beats.length > 0) {
      for (const beat of criteria.beats) {
        const beatPrompts = queries.map(query => `${query} ${beat}`);
        diverseQueries.push(...beatPrompts);
      }
    }

    // Remove duplicates while preserving order
    const uniqueQueries = Array.from(new Set(diverseQueries));

    return uniqueQueries;
  }

  /**
   * Build expansion prompt for AI
   */
  private buildExpansionPrompt(baseQuery: string, criteria: Partial<QueryCriteria>): string {
    const contextInfo = this.buildContextInfo(criteria);

    return `You are an expert in media research and query optimization.

Given the base search query: "${baseQuery}"

${contextInfo}

Generate 5-8 expanded search queries that would help find relevant media contacts. Each query should:
1. Include synonyms and related terms
2. Use different phrasing and structure
3. Incorporate relevant media/journalism terminology
4. Be optimized for search engines
5. Maintain the core intent of the original query

Format your response as a numbered list of queries only, no additional text:

1. [First expanded query]
2. [Second expanded query]
...`;
  }

  /**
   * Build refinement prompt for AI
   */
  private buildRefinementPrompt(baseQuery: string, criteria: Partial<QueryCriteria>): string {
    const contextInfo = this.buildContextInfo(criteria);

    return `You are an expert in media research and precision searching.

Given the base search query: "${baseQuery}"

${contextInfo}

Refine this query into 3-5 more precise versions that would yield higher quality results. Each refined query should:
1. Be more specific and targeted
2. Include professional terminology
3. Add relevant qualifiers and filters
4. Remove ambiguity
5. Maintain searchability

Format your response as a numbered list of refined queries only, no additional text:

1. [First refined query]
2. [Second refined query]
...`;
  }

  /**
   * Build localization prompt for AI
   */
  private buildLocalizationPrompt(baseQuery: string, country: string, criteria: Partial<QueryCriteria>): string {
    const contextInfo = this.buildContextInfo(criteria);
    const countryContext = this.getCountryContext(country);

    return `You are an expert in international media research.

Given the base search query: "${baseQuery}"

${contextInfo}
Country context: ${countryContext}

Generate 3-5 localized versions of this query for ${country}. Each query should:
1. Incorporate local media terminology
2. Use country-specific publications and outlets
3. Include local geographic references
4. Adapt to local media landscape
5. Maintain searchability

Format your response as a numbered list of localized queries only, no additional text:

1. [First localized query]
2. [Second localized query]
...`;
  }

  /**
   * Build language-specific prompt for AI
   */
  private buildLanguagePrompt(baseQuery: string, language: string, criteria: Partial<QueryCriteria>): string {
    const contextInfo = this.buildContextInfo(criteria);

    return `You are an expert in multilingual media research.

Given the base search query: "${baseQuery}"

${contextInfo}
Target language: ${language}

Generate 3-5 language-specific versions of this query. Each query should:
1. Include relevant language terminology
2. Target language-specific media outlets
3. Use appropriate cultural references
4. Maintain searchability in both English and target language where applicable

Format your response as a numbered list of language-specific queries only, no additional text:

1. [First language-specific query]
2. [Second language-specific query]
...`;
  }

  /**
   * Build context information for prompts
   */
  private buildContextInfo(criteria: Partial<QueryCriteria>): string {
    const contextParts: string[] = [];

    if (criteria.categories && criteria.categories.length > 0) {
      contextParts.push(`Categories: ${criteria.categories.join(', ')}`);
    }

    if (criteria.beats && criteria.beats.length > 0) {
      contextParts.push(`Beats: ${criteria.beats.join(', ')}`);
    }

    if (criteria.countries && criteria.countries.length > 0) {
      contextParts.push(`Countries: ${criteria.countries.join(', ')}`);
    }

    if (criteria.languages && criteria.languages.length > 0) {
      contextParts.push(`Languages: ${criteria.languages.join(', ')}`);
    }

    if (criteria.topics && criteria.topics.length > 0) {
      contextParts.push(`Topics: ${criteria.topics.join(', ')}`);
    }

    if (criteria.outlets && criteria.outlets.length > 0) {
      contextParts.push(`Target outlets: ${criteria.outlets.join(', ')}`);
    }

    return contextParts.length > 0 ? `\nAdditional context:\n${contextParts.join('\n')}` : '';
  }

  /**
   * Get country-specific context
   */
  private getCountryContext(country: string): string {
    const countryContexts: Record<string, string> = {
      'US': 'Major publications include NYT, Washington Post, WSJ. Focus on national and regional media.',
      'GB': 'Major publications include BBC, The Guardian, The Times. Focus on UK and European media.',
      'CA': 'Major publications include CBC, The Globe and Mail, Toronto Star. Focus on Canadian media.',
      'AU': 'Major publications include ABC, The Australian, Sydney Morning Herald. Focus on Australian and Asia-Pacific media.',
      'DE': 'Major publications include Der Spiegel, Die Zeit, Frankfurter Allgemeine. Focus on German and European media.',
      'FR': 'Major publications include Le Monde, Le Figaro, Libération. Focus on French and European media.'
    };

    return countryContexts[country] || 'Focus on local and national media outlets.';
  }

  /**
   * Call AI service with retry logic
   */
  private async callAI(prompt: string, operation: string): Promise<AISearchResult> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await aiServiceManager.searchWeb({
          query: prompt,
          filters: {},
          options: {
            maxResults: 1,
            priority: 'high',
            includeSummaries: false,
            extractContacts: false,
            scrapeContent: false
          }
        });

        if (result.length > 0) {
          return {
            success: true,
            content: result[0].content || result[0].summary,
            query: prompt,
            model: 'gpt-4',
            tokensUsed: 0,
            processingTime: 0
          };
        }

        throw new Error('No content returned from AI service');

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.warn(`AI call attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new QueryGenerationError(
      `AI call failed after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      'AI_CALL_FAILED',
      'AI_ERROR',
      { lastError, operation, prompt: prompt.substring(0, 100) + '...' }
    );
  }

  /**
   * Parse AI response into array of queries
   */
  private parseAIResponse(content: string): string[] {
    const lines = content.split('\n');
    const queries: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and non-numbered lines
      if (!trimmed || !/^\d+/.test(trimmed)) {
        continue;
      }

      // Extract query after the number (e.g., "1. query text" -> "query text")
      const queryMatch = trimmed.match(/^\d+\.\s*(.+)$/);
      if (queryMatch) {
        const query = queryMatch[1].trim();

        // Clean up the query (remove quotes, etc.)
        const cleanQuery = query.replace(/^["']|["']$/g, '').trim();

        if (cleanQuery.length > 0) {
          queries.push(cleanQuery);
        }
      }
    }

    return queries;
  }

  /**
   * Validate a query
   */
  private validateQuery(query: string): QueryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    if (!query || query.trim().length === 0) {
      errors.push('Query cannot be empty');
      return { isValid: false, errors, warnings, suggestions };
    }

    if (query.length < 3) {
      errors.push('Query is too short');
    }

    if (query.length > 1000) {
      warnings.push('Query is very long');
    }

    // Normalize the query
    const normalizedQuery = query
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      normalizedQuery,
      query
    };
  }

  /**
   * Get AI enhancement statistics
   */
  getStats(): {
    totalEnhancements: number;
    successRate: number;
    averageProcessingTime: number;
    breakdownByType: Record<QueryEnhancementType, number>;
  } {
    // This would typically be stored in a database or metrics system
    // For now, return placeholder values
    return {
      totalEnhancements: 0,
      successRate: 0.95,
      averageProcessingTime: 2500,
      breakdownByType: {
        expansion: 0,
        refinement: 0,
        localization: 0,
        diversification: 0,
        optimization: 0
      }
    };
  }
}