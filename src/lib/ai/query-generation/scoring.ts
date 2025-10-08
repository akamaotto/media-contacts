/**
 * Query Scoring Algorithm
 * Ranks queries by relevance, specificity, and potential success rate
 */

import {
  QueryCriteria,
  GeneratedQuery,
  QueryScores,
  QueryGenerationError
} from './types';

export class QueryScorer {
  private readonly weights = {
    relevance: 0.4,
    diversity: 0.25,
    complexity: 0.2,
    specificity: 0.15
  };

  private readonly specificityFactors = {
    country: 0.15,
    category: 0.12,
    beat: 0.15,
    language: 0.08,
    outlet: 0.1,
    topic: 0.1
  };

  private readonly complexityIndicators = [
    'site:',
    'filetype:',
    'intitle:',
    'inurl:',
    'related:',
    'author:',
    '-',
    'OR',
    'AND',
    '"'
  ];

  /**
   * Score a single query
   */
  async scoreQuery(
    query: string,
    originalQuery: string,
    criteria: Partial<QueryCriteria>,
    context?: {
      existingQueries?: string[];
      queryType?: string;
      templateUsed?: string;
    }
  ): Promise<QueryScores> {
    try {
      const relevanceScore = this.calculateRelevanceScore(query, originalQuery, criteria);
      const complexityScore = this.calculateComplexityScore(query);
      const specificityScore = this.calculateSpecificityScore(query, criteria);
      const diversityScore = context?.existingQueries
        ? this.calculateDiversityScore(query, context.existingQueries)
        : 0.5; // Default diversity score

      // Calculate weighted overall score
      const overall =
        relevanceScore * this.weights.relevance +
        diversityScore * this.weights.diversity +
        complexityScore * this.weights.complexity +
        specificityScore * this.weights.specificity;

      return {
        relevance: this.normalizeScore(relevanceScore),
        diversity: this.normalizeScore(diversityScore),
        complexity: this.normalizeScore(complexityScore),
        overall: this.normalizeScore(overall)
      };

    } catch (error) {
      console.error('Error scoring query:', error);
      throw new QueryGenerationError(
        `Failed to score query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SCORING_FAILED',
        'SCORING_ERROR',
        { query, error }
      );
    }
  }

  /**
   * Score multiple queries and rank them
   */
  async scoreAndRankQueries(
    queries: Array<{
      query: string;
      originalQuery: string;
      criteria: Partial<QueryCriteria>;
      metadata?: any;
    }>
  ): Promise<Array<{ query: string; scores: QueryScores; metadata?: any }>> {
    const scoredQueries = [];

    // Score each query
    for (let i = 0; i < queries.length; i++) {
      const queryData = queries[i];
      const existingQueries = queries.slice(0, i).map(q => q.query);

      const scores = await this.scoreQuery(
        queryData.query,
        queryData.originalQuery,
        queryData.criteria,
        {
          existingQueries,
          queryType: queryData.metadata?.type,
          templateUsed: queryData.metadata?.templateId
        }
      );

      scoredQueries.push({
        query: queryData.query,
        scores,
        metadata: queryData.metadata
      });
    }

    // Sort by overall score (descending)
    scoredQueries.sort((a, b) => b.scores.overall - a.scores.overall);

    return scoredQueries;
  }

  /**
   * Calculate relevance score based on query similarity to original and criteria match
   */
  private calculateRelevanceScore(
    query: string,
    originalQuery: string,
    criteria: Partial<QueryCriteria>
  ): number {
    let score = 0.5; // Base score

    // Query similarity to original
    const similarity = this.calculateTextSimilarity(query.toLowerCase(), originalQuery.toLowerCase());
    score += similarity * 0.3;

    // Criteria matching
    if (criteria.categories && criteria.categories.length > 0) {
      const categoryScore = this.calculateCriteriaMatch(query, criteria.categories);
      score += categoryScore * 0.15;
    }

    if (criteria.beats && criteria.beats.length > 0) {
      const beatScore = this.calculateCriteriaMatch(query, criteria.beats);
      score += beatScore * 0.15;
    }

    if (criteria.countries && criteria.countries.length > 0) {
      const countryScore = this.calculateCriteriaMatch(query, criteria.countries);
      score += countryScore * 0.1;
    }

    if (criteria.topics && criteria.topics.length > 0) {
      const topicScore = this.calculateCriteriaMatch(query, criteria.topics);
      score += topicScore * 0.1;
    }

    // Media-related keywords
    const mediaKeywords = ['journalist', 'reporter', 'media', 'editor', 'writer', 'author', 'contact'];
    const hasMediaKeywords = mediaKeywords.some(keyword =>
      query.toLowerCase().includes(keyword)
    );
    if (hasMediaKeywords) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate complexity score based on query structure and advanced operators
   */
  private calculateComplexityScore(query: string): number {
    let score = 0.3; // Base complexity score

    const lowerQuery = query.toLowerCase();

    // Count advanced operators
    let operatorCount = 0;
    for (const indicator of this.complexityIndicators) {
      if (lowerQuery.includes(indicator)) {
        operatorCount++;
        score += 0.1;
      }
    }

    // Length complexity (longer queries are generally more complex)
    const wordCount = query.split(/\s+/).length;
    if (wordCount > 5) score += 0.1;
    if (wordCount > 10) score += 0.1;

    // Phrase usage (quotes indicate exact phrase matching)
    const phraseMatches = query.match(/"[^"]+"/g);
    if (phraseMatches && phraseMatches.length > 0) {
      score += Math.min(phraseMatches.length * 0.05, 0.2);
    }

    // Boolean operators
    if (lowerQuery.includes(' and ')) score += 0.05;
    if (lowerQuery.includes(' or ')) score += 0.05;
    if (lowerQuery.includes(' not ')) score += 0.05;

    // Exclude operators
    const excludeMatches = query.match(/-\w+/g);
    if (excludeMatches && excludeMatches.length > 0) {
      score += Math.min(excludeMatches.length * 0.03, 0.1);
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate specificity score based on how specific the query is
   */
  private calculateSpecificityScore(query: string, criteria: Partial<QueryCriteria>): number {
    let score = 0.2; // Base specificity score

    const lowerQuery = query.toLowerCase();

    // Country specificity
    if (criteria.countries && criteria.countries.length > 0) {
      const countryMention = criteria.countries.some(country =>
        lowerQuery.includes(country.toLowerCase()) ||
        this.hasCountrySynonyms(lowerQuery, country)
      );
      if (countryMention) {
        score += this.specificityFactors.country;
      }
    }

    // Category specificity
    if (criteria.categories && criteria.categories.length > 0) {
      const categoryMention = criteria.categories.some(category =>
        lowerQuery.includes(category.toLowerCase())
      );
      if (categoryMention) {
        score += this.specificityFactors.category;
      }
    }

    // Beat specificity
    if (criteria.beats && criteria.beats.length > 0) {
      const beatMention = criteria.beats.some(beat =>
        lowerQuery.includes(beat.toLowerCase())
      );
      if (beatMention) {
        score += this.specificityFactors.beat;
      }
    }

    // Language specificity
    if (criteria.languages && criteria.languages.length > 0) {
      const languageMention = criteria.languages.some(language =>
        lowerQuery.includes(language.toLowerCase())
      );
      if (languageMention) {
        score += this.specificityFactors.language;
      }
    }

    // Outlet specificity
    if (criteria.outlets && criteria.outlets.length > 0) {
      const outletMention = criteria.outlets.some(outlet =>
        lowerQuery.includes(outlet.toLowerCase())
      );
      if (outletMention) {
        score += this.specificityFactors.outlet;
      }
    }

    // Topic specificity
    if (criteria.topics && criteria.topics.length > 0) {
      const topicMention = criteria.topics.some(topic =>
        lowerQuery.includes(topic.toLowerCase())
      );
      if (topicMention) {
        score += this.specificityFactors.topic;
      }
    }

    // Geographic specificity
    if (this.hasGeographicTerms(lowerQuery)) {
      score += 0.1;
    }

    // Date/time specificity
    if (this.hasDateTerms(lowerQuery)) {
      score += 0.05;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculate diversity score compared to existing queries
   */
  private calculateDiversityScore(query: string, existingQueries: string[]): number {
    if (existingQueries.length === 0) {
      return 1.0; // First query is maximally diverse
    }

    let totalSimilarity = 0;
    const lowerQuery = query.toLowerCase();

    for (const existingQuery of existingQueries) {
      const similarity = this.calculateTextSimilarity(lowerQuery, existingQuery.toLowerCase());
      totalSimilarity += similarity;
    }

    const averageSimilarity = totalSimilarity / existingQueries.length;

    // Diversity is inverse of average similarity
    const diversity = 1.0 - averageSimilarity;

    // Boost diversity for queries that add new dimensions
    const uniqueTerms = this.getUniqueTerms(lowerQuery, existingQueries);
    if (uniqueTerms.length > 2) {
      diversity += 0.1;
    }

    return Math.min(diversity, 1.0);
  }

  /**
   * Calculate text similarity using Jaccard similarity
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Calculate how well a query matches given criteria
   */
  private calculateCriteriaMatch(query: string, criteria: string[]): number {
    const lowerQuery = query.toLowerCase();
    const matches = criteria.filter(criterion =>
      lowerQuery.includes(criterion.toLowerCase())
    );

    return matches.length / criteria.length;
  }

  /**
   * Check if query has country synonyms
   */
  private hasCountrySynonyms(query: string, country: string): boolean {
    const synonyms: Record<string, string[]> = {
      'US': ['america', 'usa', 'united states', 'american'],
      'GB': ['uk', 'britain', 'united kingdom', 'british'],
      'CA': ['canada', 'canadian'],
      'AU': ['australia', 'australian'],
      'DE': ['germany', 'german'],
      'FR': ['france', 'french']
    };

    const countrySynonyms = synonyms[country] || [];
    return countrySynonyms.some(synonym => query.includes(synonym));
  }

  /**
   * Check if query has geographic terms
   */
  private hasGeographicTerms(query: string): boolean {
    const geographicTerms = [
      'city', 'state', 'region', 'local', 'national', 'international',
      'global', 'worldwide', 'asia', 'europe', 'america', 'africa',
      'north', 'south', 'east', 'west', 'central'
    ];

    return geographicTerms.some(term => query.includes(term));
  }

  /**
   * Check if query has date terms
   */
  private hasDateTerms(query: string): boolean {
    const dateTerms = [
      '2023', '2024', '2025', 'january', 'february', 'march', 'april',
      'may', 'june', 'july', 'august', 'september', 'october',
      'november', 'december', 'recent', 'latest', 'current', 'year'
    ];

    return dateTerms.some(term => query.includes(term));
  }

  /**
   * Get unique terms in query compared to existing queries
   */
  private getUniqueTerms(query: string, existingQueries: string[]): string[] {
    const queryTerms = new Set(query.toLowerCase().split(/\s+/));
    const existingTerms = new Set(
      existingQueries.join(' ').toLowerCase().split(/\s+/)
    );

    return Array.from(queryTerms).filter(term => !existingTerms.has(term));
  }

  /**
   * Normalize score to 0-1 range
   */
  private normalizeScore(score: number): number {
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Filter queries by minimum score threshold
   */
  filterQueriesByScore(
    scoredQueries: Array<{ query: string; scores: QueryScores; metadata?: any }>,
    minScore: number = 0.3
  ): Array<{ query: string; scores: QueryScores; metadata?: any }> {
    return scoredQueries.filter(item => item.scores.overall >= minScore);
  }

  /**
   * Get top N queries by score
   */
  getTopQueries(
    scoredQueries: Array<{ query: string; scores: QueryScores; metadata?: any }>,
    topN: number = 10
  ): Array<{ query: string; scores: QueryScores; metadata?: any }> {
    return scoredQueries.slice(0, topN);
  }

  /**
   * Get scoring statistics for a batch of queries
   */
  getScoringStats(scoredQueries: Array<{ scores: QueryScores }>): {
    totalQueries: number;
    averageScore: number;
    scoreDistribution: {
      high: number; // > 0.8
      medium: number; // 0.5 - 0.8
      low: number; // < 0.5
    };
    breakdownByDimension: {
      relevance: { min: number; max: number; avg: number };
      diversity: { min: number; max: number; avg: number };
      complexity: { min: number; max: number; avg: number };
    };
  } {
    const totalQueries = scoredQueries.length;

    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        averageScore: 0,
        scoreDistribution: { high: 0, medium: 0, low: 0 },
        breakdownByDimension: {
          relevance: { min: 0, max: 0, avg: 0 },
          diversity: { min: 0, max: 0, avg: 0 },
          complexity: { min: 0, max: 0, avg: 0 }
        }
      };
    }

    const scores = scoredQueries.map(q => q.scores.overall);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / totalQueries;

    const scoreDistribution = {
      high: scores.filter(s => s > 0.8).length,
      medium: scores.filter(s => s >= 0.5 && s <= 0.8).length,
      low: scores.filter(s => s < 0.5).length
    };

    const breakdownByDimension = {
      relevance: this.calculateDimensionStats(scoredQueries.map(q => q.scores.relevance)),
      diversity: this.calculateDimensionStats(scoredQueries.map(q => q.scores.diversity)),
      complexity: this.calculateDimensionStats(scoredQueries.map(q => q.scores.complexity))
    };

    return {
      totalQueries,
      averageScore,
      scoreDistribution,
      breakdownByDimension
    };
  }

  /**
   * Calculate statistics for a specific dimension
   */
  private calculateDimensionStats(values: number[]): { min: number; max: number; avg: number } {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

    return { min, max, avg };
  }

  /**
   * Update scoring weights (for A/B testing or optimization)
   */
  updateWeights(newWeights: Partial<typeof this.weights>): void {
    Object.assign(this.weights, newWeights);
  }

  /**
   * Get current weights
   */
  getWeights(): typeof this.weights {
    return { ...this.weights };
  }
}