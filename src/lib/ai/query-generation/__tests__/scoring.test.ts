/**
 * Query Scoring Tests
 * Unit tests for the query scoring algorithm
 */

import { QueryScorer } from '../scoring';
import { QueryCriteria } from '../types';

describe('QueryScorer', () => {
  let scorer: QueryScorer;

  beforeEach(() => {
    scorer = new QueryScorer();
  });

  describe('query scoring', () => {
    it('should score a basic query correctly', async () => {
      const scores = await scorer.scoreQuery(
        'technology journalist reporter',
        'technology',
        { categories: ['Technology'] }
      );

      expect(scores).toBeDefined();
      expect(scores.relevance).toBeGreaterThan(0);
      expect(scores.diversity).toBeGreaterThanOrEqual(0);
      expect(scores.complexity).toBeGreaterThan(0);
      expect(scores.overall).toBeGreaterThanOrEqual(0);
      expect(scores.overall).toBeLessThanOrEqual(1);
    });

    it('should give higher scores to queries with relevant criteria', async () => {
      const relevantQuery = 'technology journalist reporter AI';
      const irrelevantQuery = 'sports entertainment news';

      const relevantScores = await scorer.scoreQuery(
        relevantQuery,
        'AI technology',
        { categories: ['Technology'], beats: ['AI'] }
      );

      const irrelevantScores = await scorer.scoreQuery(
        irrelevantQuery,
        'AI technology',
        { categories: ['Technology'], beats: ['AI'] }
      );

      expect(relevantScores.relevance).toBeGreaterThan(irrelevantScores.relevance);
      expect(relevantScores.overall).toBeGreaterThan(irrelevantScores.overall);
    });

    it('should score complex queries higher', async () => {
      const simpleQuery = 'technology journalist';
      const complexQuery = 'technology site:techcrunch.com "artificial intelligence" journalist -spam';

      const simpleScores = await scorer.scoreQuery(
        simpleQuery,
        'technology',
        { categories: ['Technology'] }
      );

      const complexScores = await scorer.scoreQuery(
        complexQuery,
        'technology',
        { categories: ['Technology'] }
      );

      expect(complexScores.complexity).toBeGreaterThan(simpleScores.complexity);
    });

    it('should calculate diversity score correctly', async () => {
      const existingQueries = [
        'technology journalist reporter',
        'tech media contact',
        'artificial intelligence writer'
      ];

      const diverseQuery = 'healthcare medical reporter';
      const similarQuery = 'technology news journalist';

      const diverseScores = await scorer.scoreQuery(
        diverseQuery,
        'healthcare',
        { categories: ['Healthcare'] },
        { existingQueries }
      );

      const similarScores = await scorer.scoreQuery(
        similarQuery,
        'technology',
        { categories: ['Technology'] },
        { existingQueries }
      );

      expect(diverseScores.diversity).toBeGreaterThan(similarScores.diversity);
    });

    it('should handle empty or invalid queries gracefully', async () => {
      const emptyScores = await scorer.scoreQuery(
        '',
        'test',
        {}
      );

      expect(emptyScores.relevance).toBe(0);
      expect(emptyScores.overall).toBeLessThanOrEqual(0.1);
    });
  });

  describe('query ranking', () => {
    it('should rank queries by overall score', async () => {
      const queries = [
        {
          query: 'technology journalist',
          originalQuery: 'tech',
          criteria: { categories: ['Technology'] }
        },
        {
          query: 'technology site:techcrunch.com "AI" journalist reporter',
          originalQuery: 'tech',
          criteria: { categories: ['Technology'] }
        },
        {
          query: 'tech media contact',
          originalQuery: 'tech',
          criteria: { categories: ['Technology'] }
        }
      ];

      const rankedQueries = await scorer.scoreAndRankQueries(queries);

      expect(rankedQueries).toHaveLength(3);
      expect(rankedQueries[0].scores.overall).toBeGreaterThanOrEqual(rankedQueries[1].scores.overall);
      expect(rankedQueries[1].scores.overall).toBeGreaterThanOrEqual(rankedQueries[2].scores.overall);
    });

    it('should include metadata in ranked results', async () => {
      const queries = [
        {
          query: 'technology journalist',
          originalQuery: 'tech',
          criteria: { categories: ['Technology'] },
          metadata: { type: 'template', templateId: 'tmpl-1' }
        }
      ];

      const rankedQueries = await scorer.scoreAndRankQueries(queries);

      expect(rankedQueries[0].metadata).toBeDefined();
      expect(rankedQueries[0].metadata.type).toBe('template');
    });
  });

  describe('filtering and selection', () => {
    it('should filter queries by minimum score', async () => {
      const scoredQueries = [
        {
          query: 'high score query',
          scores: { relevance: 0.9, diversity: 0.8, complexity: 0.7, overall: 0.8 }
        },
        {
          query: 'low score query',
          scores: { relevance: 0.2, diversity: 0.3, complexity: 0.1, overall: 0.2 }
        },
        {
          query: 'medium score query',
          scores: { relevance: 0.6, diversity: 0.5, complexity: 0.4, overall: 0.5 }
        }
      ];

      const filteredQueries = scorer.filterQueriesByScore(scoredQueries, 0.5);

      expect(filteredQueries).toHaveLength(2);
      expect(filteredQueries.map(q => q.query)).toEqual(['high score query', 'medium score query']);
    });

    it('should get top N queries', async () => {
      const scoredQueries = [
        { query: 'query 1', scores: { relevance: 0.7, diversity: 0.6, complexity: 0.5, overall: 0.6 } },
        { query: 'query 2', scores: { relevance: 0.9, diversity: 0.8, complexity: 0.7, overall: 0.8 } },
        { query: 'query 3', scores: { relevance: 0.5, diversity: 0.4, complexity: 0.3, overall: 0.4 } },
        { query: 'query 4', scores: { relevance: 0.8, diversity: 0.7, complexity: 0.6, overall: 0.7 } },
        { query: 'query 5', scores: { relevance: 0.6, diversity: 0.5, complexity: 0.4, overall: 0.5 } }
      ];

      const topQueries = scorer.getTopQueries(scoredQueries, 3);

      expect(topQueries).toHaveLength(3);
      expect(topQueries[0].query).toBe('query 2'); // Highest score
      expect(topQueries[1].query).toBe('query 4'); // Second highest
      expect(topQueries[2].query).toBe('query 1'); // Third highest
    });
  });

  describe('statistics', () => {
    it('should calculate scoring statistics correctly', () => {
      const scoredQueries = [
        { scores: { relevance: 0.9, diversity: 0.8, complexity: 0.7, overall: 0.8 } },
        { scores: { relevance: 0.6, diversity: 0.5, complexity: 0.4, overall: 0.5 } },
        { scores: { relevance: 0.3, diversity: 0.2, complexity: 0.1, overall: 0.2 } },
        { scores: { relevance: 0.85, diversity: 0.75, complexity: 0.65, overall: 0.75 } },
        { scores: { relevance: 0.4, diversity: 0.3, complexity: 0.2, overall: 0.3 } }
      ];

      const stats = scorer.getScoringStats(scoredQueries);

      expect(stats.totalQueries).toBe(5);
      expect(stats.averageScore).toBeCloseTo(0.51, 2);
      expect(stats.scoreDistribution.high).toBe(2); // > 0.8
      expect(stats.scoreDistribution.medium).toBe(2); // 0.5 - 0.8
      expect(stats.scoreDistribution.low).toBe(1); // < 0.5
      expect(stats.breakdownByDimension.relevance.avg).toBeCloseTo(0.61, 2);
      expect(stats.breakdownByDimension.diversity.avg).toBeCloseTo(0.52, 2);
      expect(stats.breakdownByDimension.complexity.avg).toBeCloseTo(0.42, 2);
    });

    it('should handle empty query list in statistics', () => {
      const stats = scorer.getScoringStats([]);

      expect(stats.totalQueries).toBe(0);
      expect(stats.averageScore).toBe(0);
      expect(stats.scoreDistribution.high).toBe(0);
      expect(stats.scoreDistribution.medium).toBe(0);
      expect(stats.scoreDistribution.low).toBe(0);
    });
  });

  describe('weight management', () => {
    it('should update scoring weights', () => {
      const originalWeights = scorer.getWeights();

      scorer.updateWeights({
        relevance: 0.5,
        diversity: 0.3,
        complexity: 0.15,
        specificity: 0.05
      });

      const newWeights = scorer.getWeights();

      expect(newWeights.relevance).toBe(0.5);
      expect(newWeights.diversity).toBe(0.3);
      expect(newWeights.complexity).toBe(0.15);
      expect(newWeights.specificity).toBe(0.05);
      expect(newWeights).not.toEqual(originalWeights);
    });

    it('should merge partial weight updates correctly', () => {
      const originalWeights = scorer.getWeights();

      scorer.updateWeights({
        relevance: 0.6
      });

      const newWeights = scorer.getWeights();

      expect(newWeights.relevance).toBe(0.6);
      expect(newWeights.diversity).toBe(originalWeights.diversity); // Unchanged
      expect(newWeights.complexity).toBe(originalWeights.complexity); // Unchanged
      expect(newWeights.specificity).toBe(originalWeights.specificity); // Unchanged
    });
  });

  describe('edge cases', () => {
    it('should handle queries with special characters', async () => {
      const specialQuery = 'technology "artificial intelligence" journalist reporter -spam';

      const scores = await scorer.scoreQuery(
        specialQuery,
        'AI technology',
        { categories: ['Technology'] }
      );

      expect(scores).toBeDefined();
      expect(scores.complexity).toBeGreaterThan(0.5); // Should recognize complexity
    });

    it('should handle very long queries', async () => {
      const longQuery = 'technology journalist reporter AI machine learning deep learning artificial intelligence ' +
        'software development programming startup innovation entrepreneurship venture capital silicon valley ' +
        'tech industry news media publication blog website content writer author expert';

      const scores = await scorer.scoreQuery(
        longQuery,
        'technology',
        { categories: ['Technology'] }
      );

      expect(scores).toBeDefined();
      expect(scores.overall).toBeGreaterThanOrEqual(0);
      expect(scores.overall).toBeLessThanOrEqual(1);
    });

    it('should handle queries with non-ASCII characters', async () => {
      const internationalQuery = 'technology journaliste reporter AI apprentissage automatique';

      const scores = await scorer.scoreQuery(
        internationalQuery,
        'AI technology',
        { categories: ['Technology'], languages: ['French'] }
      );

      expect(scores).toBeDefined();
      expect(scores.overall).toBeGreaterThanOrEqual(0);
    });

    it('should handle queries with boolean operators', async () => {
      const booleanQuery = 'technology AND (AI OR "machine learning") AND NOT spam journalist';

      const scores = await scorer.scoreQuery(
        booleanQuery,
        'AI technology',
        { categories: ['Technology'] }
      );

      expect(scores).toBeDefined();
      expect(scores.complexity).toBeGreaterThan(0.5);
    });
  });
});