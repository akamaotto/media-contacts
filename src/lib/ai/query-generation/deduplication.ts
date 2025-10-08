/**
 * Query Deduplication System
 * Identifies and removes redundant or overlapping queries
 */

import {
  QueryDeduplicationResult,
  QueryGenerationError,
  GeneratedQuery
} from './types';

export class QueryDeduplicator {
  private readonly similarityThreshold = 0.8;
  private readonly semanticThreshold = 0.75;

  /**
   * Deduplicate a list of queries
   */
  async deduplicateQueries(
    queries: GeneratedQuery[],
    options: {
      method?: 'exact' | 'semantic' | 'hybrid';
      similarityThreshold?: number;
      keepHighestScored?: boolean;
    } = {}
  ): Promise<QueryDeduplicationResult> {
    const {
      method = 'hybrid',
      similarityThreshold = this.similarityThreshold,
      keepHighestScored = true
    } = options;

    try {
      const totalProcessed = queries.length;
      const duplicates: Array<{
        queryId: string;
        duplicateOf: string;
        similarity: number;
        reason: string;
      }> = [];

      // Sort queries by score if we want to keep the highest scored
      const sortedQueries = keepHighestScored
        ? [...queries].sort((a, b) => b.scores.overall - a.scores.overall)
        : queries;

      const uniqueQueries: string[] = [];
      const processedQueries = new Set<string>();

      for (let i = 0; i < sortedQueries.length; i++) {
        const currentQuery = sortedQueries[i];

        if (processedQueries.has(currentQuery.id)) {
          continue; // Already marked as duplicate
        }

        // Check against previously accepted unique queries
        let isDuplicate = false;
        let duplicateOf = '';
        let maxSimilarity = 0;
        let duplicateReason = '';

        for (const uniqueQueryId of uniqueQueries) {
          const uniqueQuery = sortedQueries.find(q => q.id === uniqueQueryId);
          if (!uniqueQuery) continue;

          const similarity = await this.calculateSimilarity(
            currentQuery.generatedQuery,
            uniqueQuery.generatedQuery,
            method
          );

          if (similarity >= similarityThreshold) {
            isDuplicate = true;
            duplicateOf = uniqueQueryId;
            maxSimilarity = similarity;
            duplicateReason = this.getDuplicateReason(similarity, method);
            break;
          }
        }

        if (isDuplicate) {
          duplicates.push({
            queryId: currentQuery.id,
            duplicateOf,
            similarity: maxSimilarity,
            reason: duplicateReason
          });
          processedQueries.add(currentQuery.id);
        } else {
          uniqueQueries.push(currentQuery.id);
        }
      }

      const deduplicationStats = {
        totalProcessed,
        duplicatesRemoved: duplicates.length,
        uniqueQueries: uniqueQueries.length
      };

      return {
        duplicates,
        uniqueQueries,
        deduplicationStats
      };

    } catch (error) {
      console.error('Query deduplication failed:', error);
      throw new QueryGenerationError(
        `Deduplication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DEDUPLICATION_FAILED',
        'DEDUPLICATION_ERROR',
        { error, queryCount: queries.length }
      );
    }
  }

  /**
   * Calculate similarity between two queries
   */
  private async calculateSimilarity(
    query1: string,
    query2: string,
    method: 'exact' | 'semantic' | 'hybrid'
  ): Promise<number> {
    switch (method) {
      case 'exact':
        return this.calculateExactSimilarity(query1, query2);
      case 'semantic':
        return this.calculateSemanticSimilarity(query1, query2);
      case 'hybrid':
        const exactSim = this.calculateExactSimilarity(query1, query2);
        const semanticSim = await this.calculateSemanticSimilarity(query1, query2);
        return (exactSim + semanticSim) / 2;
      default:
        throw new Error(`Unknown deduplication method: ${method}`);
    }
  }

  /**
   * Calculate exact similarity using text analysis
   */
  private calculateExactSimilarity(query1: string, query2: string): number {
    const normalized1 = this.normalizeQuery(query1);
    const normalized2 = this.normalizeQuery(query2);

    // Exact match
    if (normalized1 === normalized2) {
      return 1.0;
    }

    // Jaccard similarity on word sets
    const words1 = new Set(normalized1.split(/\s+/));
    const words2 = new Set(normalized2.split(/\s+/));

    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    const jaccardSimilarity = union.size === 0 ? 0 : intersection.size / union.size;

    // Edit distance similarity
    const editDistance = this.calculateEditDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    const editSimilarity = maxLength === 0 ? 1 : 1 - (editDistance / maxLength);

    // Combine similarities
    return (jaccardSimilarity * 0.7) + (editSimilarity * 0.3);
  }

  /**
   * Calculate semantic similarity (placeholder for AI-based similarity)
   */
  private async calculateSemanticSimilarity(query1: string, query2: string): Promise<number> {
    // For now, use a simplified semantic similarity
    // In a production environment, this would use embeddings or AI models

    const keywords1 = this.extractKeywords(query1);
    const keywords2 = this.extractKeywords(query2);

    // Calculate semantic similarity based on keyword overlap and synonyms
    const semanticSim = this.calculateKeywordSimilarity(keywords1, keywords2);

    // Add structural similarity
    const structuralSim = this.calculateStructuralSimilarity(query1, query2);

    return (semanticSim * 0.6) + (structuralSim * 0.4);
  }

  /**
   * Normalize query for comparison
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace non-alphanumeric with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
  }

  /**
   * Calculate edit distance between two strings
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);

    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Get unique keywords
    return [...new Set(words)];
  }

  /**
   * Calculate keyword similarity
   */
  private calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 && keywords2.length === 0) {
      return 1.0;
    }

    if (keywords1.length === 0 || keywords2.length === 0) {
      return 0.0;
    }

    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);

    // Direct overlap
    const intersection = new Set([...set1].filter(keyword => set2.has(keyword)));
    const union = new Set([...set1, ...set2]);

    const directOverlap = union.size === 0 ? 0 : intersection.size / union.size;

    // Synonym overlap (simplified)
    const synonymOverlap = this.calculateSynonymOverlap(set1, set2);

    return (directOverlap * 0.7) + (synonymOverlap * 0.3);
  }

  /**
   * Calculate synonym overlap
   */
  private calculateSynonymOverlap(set1: Set<string>, set2: Set<string>): number {
    const synonyms: Record<string, string[]> = {
      'journalist': ['reporter', 'writer', 'author', 'correspondent'],
      'media': ['news', 'press', 'publication', 'outlet'],
      'contact': ['reach', 'email', 'connect'],
      'search': ['find', 'look', 'research', 'investigate'],
      'technology': ['tech', 'software', 'digital', 'it'],
      'business': ['finance', 'corporate', 'commercial', 'company'],
      'sports': ['athletics', 'games', 'competition', 'fitness'],
      'health': ['medical', 'wellness', 'healthcare', 'medicine']
    };

    let synonymMatches = 0;
    let totalComparisons = 0;

    for (const word1 of set1) {
      for (const word2 of set2) {
        totalComparisons++;

        if (word1 === word2) {
          synonymMatches++;
          continue;
        }

        // Check if words are synonyms
        const synonyms1 = synonyms[word1] || [];
        const synonyms2 = synonyms[word2] || [];

        if (synonyms1.includes(word2) || synonyms2.includes(word1)) {
          synonymMatches++;
        }
      }
    }

    return totalComparisons === 0 ? 0 : synonymMatches / totalComparisons;
  }

  /**
   * Calculate structural similarity
   */
  private calculateStructuralSimilarity(query1: string, query2: string): number {
    const structure1 = this.getQueryStructure(query1);
    const structure2 = this.getQueryStructure(query2);

    let similarityScore = 0;
    let totalChecks = 0;

    // Compare structure elements
    for (const key of Object.keys(structure1)) {
      totalChecks++;
      if (structure1[key] === structure2[key]) {
        similarityScore++;
      }
    }

    return totalChecks === 0 ? 0 : similarityScore / totalChecks;
  }

  /**
   * Get query structure features
   */
  private getQueryStructure(query: string): Record<string, any> {
    const lowerQuery = query.toLowerCase();

    return {
      hasQuotes: lowerQuery.includes('"'),
      hasExactPhrase: /"[^"]+"/.test(query),
      hasSiteOperator: lowerQuery.includes('site:'),
      hasFiletypeOperator: lowerQuery.includes('filetype:'),
      hasBooleanOperators: /\b(and|or|not)\b/.test(lowerQuery),
      hasExcludeOperators: /-\w+/.test(query),
      wordCount: query.split(/\s+/).length,
      hasAdvancedOperators: ['site:', 'filetype:', 'intitle:', 'inurl:', 'related:'].some(op => lowerQuery.includes(op))
    };
  }

  /**
   * Get duplicate reason
   */
  private getDuplicateReason(similarity: number, method: string): string {
    if (similarity >= 0.95) {
      return `Nearly identical (${method})`;
    } else if (similarity >= 0.85) {
      return `Very similar (${method})`;
    } else if (similarity >= 0.75) {
      return `Similar (${method})`;
    } else {
      return `Potentially duplicate (${method})`;
    }
  }

  /**
   * Find similar queries for a given query
   */
  async findSimilarQueries(
    targetQuery: string,
    queryPool: string[],
    options: {
      method?: 'exact' | 'semantic' | 'hybrid';
      threshold?: number;
      maxResults?: number;
    } = {}
  ): Promise<Array<{ query: string; similarity: number; reason: string }>> {
    const {
      method = 'hybrid',
      threshold = 0.5,
      maxResults = 10
    } = options;

    const similarities: Array<{ query: string; similarity: number; reason: string }> = [];

    for (const query of queryPool) {
      if (query === targetQuery) continue;

      const similarity = await this.calculateSimilarity(targetQuery, query, method);

      if (similarity >= threshold) {
        similarities.push({
          query,
          similarity,
          reason: this.getDuplicateReason(similarity, method)
        });
      }
    }

    // Sort by similarity (descending) and limit results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);
  }

  /**
   * Batch deduplication for multiple query sets
   */
  async batchDeduplicate(
    queryBatches: Array<{ batchId: string; queries: GeneratedQuery[] }>,
    options?: {
      method?: 'exact' | 'semantic' | 'hybrid';
      similarityThreshold?: number;
    }
  ): Promise<Array<{
    batchId: string;
    result: QueryDeduplicationResult;
  }>> {
    const results = [];

    for (const batch of queryBatches) {
      const result = await this.deduplicateQueries(batch.queries, options);
      results.push({
        batchId: batch.batchId,
        result
      });
    }

    return results;
  }

  /**
   * Get deduplication statistics
   */
  getDeduplicationStats(results: QueryDeduplicationResult[]): {
    totalBatches: number;
    totalQueriesProcessed: number;
    totalDuplicatesRemoved: number;
    averageDuplicateRate: number;
    averageUniqueQueries: number;
  } {
    const totalBatches = results.length;
    const totalQueriesProcessed = results.reduce((sum, r) => sum + r.deduplicationStats.totalProcessed, 0);
    const totalDuplicatesRemoved = results.reduce((sum, r) => sum + r.deduplicationStats.duplicatesRemoved, 0);
    const totalUniqueQueries = results.reduce((sum, r) => sum + r.deduplicationStats.uniqueQueries, 0);

    const averageDuplicateRate = totalQueriesProcessed > 0 ? totalDuplicatesRemoved / totalQueriesProcessed : 0;
    const averageUniqueQueries = totalBatches > 0 ? totalUniqueQueries / totalBatches : 0;

    return {
      totalBatches,
      totalQueriesProcessed,
      totalDuplicatesRemoved,
      averageDuplicateRate,
      averageUniqueQueries
    };
  }

  /**
   * Update similarity threshold
   */
  updateSimilarityThreshold(newThreshold: number): void {
    if (newThreshold < 0 || newThreshold > 1) {
      throw new Error('Similarity threshold must be between 0 and 1');
    }
    this.similarityThreshold = newThreshold;
  }

  /**
   * Get current similarity threshold
   */
  getSimilarityThreshold(): number {
    return this.similarityThreshold;
  }
}