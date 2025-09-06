/**
 * Tests for Media Research Types and Interfaces
 */

import {
  ResearchRequest,
  ContactCandidate,
  ContactCandidateSchema,
  ResearchRequestSchema,
  isValidEmail,
  isValidUrl,
  isRecentByline,
  ScoreBreakdown
} from '../types';

import {
  MediaResearchError,
  MediaResearchErrorType,
  ConfigurationError,
  NetworkError,
  RateLimitError,
  formatErrorForUser,
  getRecoveryStrategy
} from '../errors';

import { BaseMediaResearchService } from '../base-service';

// ============================================================================
// Type Validation Tests
// ============================================================================

describe('Media Research Types', () => {
  describe('ContactCandidateSchema', () => {
    it('should validate a valid contact candidate', () => {
      const validCandidate = {
        name: 'John Doe',
        role: 'Reporter' as const,
        outlet: 'TechCrunch',
        authorPages: ['https://techcrunch.com/author/john-doe/'],
        channels: [{
          type: 'email' as const,
          value: 'john@techcrunch.com',
          sourceUrl: 'https://techcrunch.com/author/john-doe/',
          confidence: 0.9,
          policyCompliant: true
        }],
        beats: ['Technology', 'Startups'],
        sources: ['https://techcrunch.com/author/john-doe/'],
        freshness: '2024-01-15T10:00:00Z',
        score: 85
      };

      const result = ContactCandidateSchema.safeParse(validCandidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
        expect(result.data.role).toBe('Reporter');
        expect(result.data.channels).toHaveLength(1);
      }
    });

    it('should reject invalid contact candidate', () => {
      const invalidCandidate = {
        name: '', // Empty name should fail
        outlet: 'TechCrunch',
        sources: [], // Empty sources should fail
        freshness: 'invalid-date'
      };

      const result = ContactCandidateSchema.safeParse(invalidCandidate);
      expect(result.success).toBe(false);
    });

    it('should apply defaults for optional fields', () => {
      const minimalCandidate = {
        name: 'Jane Smith',
        outlet: 'Wired',
        sources: ['https://wired.com/author/jane-smith/'],
        freshness: '2024-01-15T10:00:00Z'
      };

      const result = ContactCandidateSchema.safeParse(minimalCandidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.channels).toEqual([]);
        expect(result.data.beats).toEqual([]);
        expect(result.data.score).toBe(0);
      }
    });
  });

  describe('ResearchRequestSchema', () => {
    it('should validate a valid research request', () => {
      const validRequest = {
        topic: 'AI and Machine Learning',
        region: 'United States',
        mode: 'precision' as const,
        targetGeo: ['San Francisco', 'New York'],
        targetBeats: ['Technology', 'AI'],
        maxContacts: 25,
        scoreThreshold: 75
      };

      const result = ResearchRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.topic).toBe('AI and Machine Learning');
        expect(result.data.mode).toBe('precision');
      }
    });

    it('should apply defaults for optional fields', () => {
      const minimalRequest = {
        topic: 'Climate Change'
      };

      const result = ResearchRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mode).toBe('precision');
        expect(result.data.maxContacts).toBe(30);
        expect(result.data.scoreThreshold).toBe(70);
      }
    });

    it('should reject invalid research request', () => {
      const invalidRequest = {
        topic: 'AI', // Too short
        maxContacts: 150 // Too many
      };

      const result = ResearchRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    describe('isValidEmail', () => {
      it('should validate correct email addresses', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
        expect(isValidEmail('firstname.lastname@company.org')).toBe(true);
      });

      it('should reject invalid email addresses', () => {
        expect(isValidEmail('invalid-email')).toBe(false);
        expect(isValidEmail('@domain.com')).toBe(false);
        expect(isValidEmail('user@')).toBe(false);
        expect(isValidEmail('')).toBe(false);
      });
    });

    describe('isValidUrl', () => {
      it('should validate correct URLs', () => {
        expect(isValidUrl('https://example.com')).toBe(true);
        expect(isValidUrl('http://subdomain.example.com/path')).toBe(true);
        expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        expect(isValidUrl('not-a-url')).toBe(false);
        expect(isValidUrl('://example.com')).toBe(false); // Invalid protocol
        expect(isValidUrl('')).toBe(false);
      });
    });

    describe('isRecentByline', () => {
      it('should identify recent bylines', () => {
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 30); // 30 days ago
        
        expect(isRecentByline(recentDate.toISOString(), 90)).toBe(true);
      });

      it('should identify old bylines', () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 120); // 120 days ago
        
        expect(isRecentByline(oldDate.toISOString(), 90)).toBe(false);
      });
    });
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('Media Research Errors', () => {
  describe('MediaResearchError', () => {
    it('should create error with all properties', () => {
      const error = new MediaResearchError(
        MediaResearchErrorType.NETWORK_ERROR,
        'Network request failed',
        {
          retryable: true,
          statusCode: 503,
          context: { url: 'https://example.com' }
        }
      );

      expect(error.type).toBe(MediaResearchErrorType.NETWORK_ERROR);
      expect(error.message).toBe('Network request failed');
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(503);
      expect(error.context?.url).toBe('https://example.com');
      expect(error.isRetryable()).toBe(true);
    });

    it('should convert to JSON correctly', () => {
      const error = new MediaResearchError(
        MediaResearchErrorType.CONFIGURATION_ERROR,
        'Missing API key'
      );

      const json = error.toJSON();
      expect(json.name).toBe('MediaResearchError');
      expect(json.type).toBe(MediaResearchErrorType.CONFIGURATION_ERROR);
      expect(json.message).toBe('Missing API key');
      expect(json.retryable).toBe(false);
    });
  });

  describe('Specific Error Classes', () => {
    it('should create ConfigurationError correctly', () => {
      const error = new ConfigurationError('Missing API key', { key: 'OPENROUTER_API_KEY' });
      
      expect(error.type).toBe(MediaResearchErrorType.CONFIGURATION_ERROR);
      expect(error.retryable).toBe(false);
      expect(error.statusCode).toBe(500);
      expect(error.context?.key).toBe('OPENROUTER_API_KEY');
    });

    it('should create NetworkError correctly', () => {
      const originalError = new Error('Connection timeout');
      const error = new NetworkError('Network failed', originalError);
      
      expect(error.type).toBe(MediaResearchErrorType.NETWORK_ERROR);
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(503);
      expect(error.originalError).toBe(originalError);
    });

    it('should create RateLimitError with retry info', () => {
      const error = new RateLimitError('Rate limit exceeded', 60);
      
      expect(error.type).toBe(MediaResearchErrorType.API_RATE_LIMIT);
      expect(error.retryable).toBe(true);
      expect(error.statusCode).toBe(429);
      expect(error.getRetryAfter()).toBe(60);
    });
  });

  describe('Error Formatting', () => {
    it('should format configuration errors for users', () => {
      const error = new MediaResearchError(
        MediaResearchErrorType.CONFIGURATION_ERROR,
        'Missing API key'
      );

      const userMessage = formatErrorForUser(error);
      expect(userMessage).toContain('not properly configured');
      expect(userMessage).toContain('administrator');
    });

    it('should format rate limit errors for users', () => {
      const error = new MediaResearchError(
        MediaResearchErrorType.API_RATE_LIMIT,
        'Too many requests'
      );

      const userMessage = formatErrorForUser(error);
      expect(userMessage).toContain('Too many requests');
      expect(userMessage).toContain('wait a moment');
    });

    it('should format no results errors for users', () => {
      const error = new MediaResearchError(
        MediaResearchErrorType.NO_RESULTS_FOUND,
        'No contacts found'
      );

      const userMessage = formatErrorForUser(error);
      expect(userMessage).toContain('No contacts found');
      expect(userMessage).toContain('adjusting your search');
    });
  });

  describe('Recovery Strategies', () => {
    it('should provide recovery strategy for retryable errors', () => {
      const error = new MediaResearchError(
        MediaResearchErrorType.NETWORK_ERROR,
        'Network failed',
        { retryable: true }
      );

      const strategy = getRecoveryStrategy(error);
      expect(strategy.canRecover).toBe(true);
      expect(strategy.retryDelay).toBeGreaterThan(0);
      expect(strategy.maxRetries).toBeGreaterThan(0);
    });

    it('should provide recovery strategy for non-retryable errors', () => {
      const error = new MediaResearchError(
        MediaResearchErrorType.NO_RESULTS_FOUND,
        'No results'
      );

      const strategy = getRecoveryStrategy(error);
      expect(strategy.canRecover).toBe(false);
      expect(strategy.userAction).toBeDefined();
    });
  });
});

// ============================================================================
// Base Service Tests
// ============================================================================

describe('BaseMediaResearchService', () => {
  class TestService extends BaseMediaResearchService {
    public testValidateUrl(url: string): boolean {
      return this.validateUrl(url);
    }

    public testValidateEmail(email: string): boolean {
      return this.validateEmail(email);
    }

    public testCalculateRecencyScore(date: Date, maxScore?: number): number {
      return this.calculateRecencyScore(date, maxScore);
    }

    public testNormalizeText(text: string): string {
      return this.normalizeText(text);
    }

    public testGenerateHash(input: string): string {
      return this.generateHash(input);
    }

    public async testRetryWithBackoff<T>(
      operation: () => Promise<T>,
      maxRetries?: number,
      baseDelay?: number
    ): Promise<T> {
      return this.retryWithBackoff(operation, maxRetries, baseDelay);
    }
  }

  let service: TestService;

  beforeEach(() => {
    service = new TestService();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = service.getConfig();
      expect(config.defaultMode).toBe('precision');
      expect(config.maxContactsPerSession).toBe(30);
      expect(config.scoringWeights.recency).toBe(30);
    });

    it('should allow configuration updates', () => {
      service.updateConfig({ maxContactsPerSession: 50 });
      const config = service.getConfig();
      expect(config.maxContactsPerSession).toBe(50);
    });
  });

  describe('Validation Methods', () => {
    it('should validate URLs correctly', () => {
      expect(service.testValidateUrl('https://example.com')).toBe(true);
      expect(service.testValidateUrl('invalid-url')).toBe(false);
    });

    it('should validate emails correctly', () => {
      expect(service.testValidateEmail('test@example.com')).toBe(true);
      expect(service.testValidateEmail('invalid-email')).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should calculate recency score with decay', () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 30); // 30 days ago
      
      const score = service.testCalculateRecencyScore(recentDate);
      expect(score).toBeGreaterThan(15); // Should be high for recent date
      expect(score).toBeLessThanOrEqual(30); // Should not exceed max
    });

    it('should normalize text correctly', () => {
      const normalized = service.testNormalizeText('  John Doe  ');
      expect(normalized).toBe('john doe');
    });

    it('should generate consistent hashes', () => {
      const hash1 = service.testGenerateHash('test input');
      const hash2 = service.testGenerateHash('test input');
      expect(hash1).toBe(hash2);
      
      const hash3 = service.testGenerateHash('different input');
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('Retry Logic', () => {
    it('should succeed on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await service.testRetryWithBackoff(operation, 3, 100);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue('success');
      
      const result = await service.testRetryWithBackoff(operation, 3, 10);
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const nonRetryableError = new MediaResearchError(
        MediaResearchErrorType.CONFIGURATION_ERROR,
        'Config error',
        { retryable: false }
      );
      
      const operation = jest.fn().mockRejectedValue(nonRetryableError);
      
      await expect(service.testRetryWithBackoff(operation, 3, 10))
        .rejects.toThrow(nonRetryableError);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw last error', async () => {
      const error = new Error('Persistent failure');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(service.testRetryWithBackoff(operation, 2, 10))
        .rejects.toThrow(error);
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Type Integration', () => {
  it('should work with complete contact workflow', () => {
    // Create a research request
    const request: ResearchRequest = {
      topic: 'Artificial Intelligence',
      region: 'United States',
      mode: 'precision',
      targetGeo: ['San Francisco', 'New York'],
      targetBeats: ['Technology', 'AI'],
      maxContacts: 25,
      scoreThreshold: 75
    };

    // Validate the request
    const validationResult = ResearchRequestSchema.safeParse(request);
    expect(validationResult.success).toBe(true);

    // Create a contact candidate
    const candidate: ContactCandidate = {
      name: 'Sarah Johnson',
      role: 'Reporter',
      outlet: 'TechCrunch',
      authorPages: ['https://techcrunch.com/author/sarah-johnson/'],
      channels: [{
        type: 'email',
        value: 'sarah@techcrunch.com',
        sourceUrl: 'https://techcrunch.com/author/sarah-johnson/',
        confidence: 0.95,
        policyCompliant: true
      }],
      beats: ['AI', 'Machine Learning', 'Startups'],
      sources: ['https://techcrunch.com/author/sarah-johnson/'],
      freshness: new Date().toISOString(),
      score: 88
    };

    // Validate the candidate
    const candidateValidation = ContactCandidateSchema.safeParse(candidate);
    expect(candidateValidation.success).toBe(true);

    // Test score breakdown
    const scoreBreakdown: ScoreBreakdown = {
      recency: 28,
      beatMatch: 25,
      channelScore: 20,
      corroboration: 10,
      geoMatch: 5
    };

    const totalScore = Object.values(scoreBreakdown).reduce((sum, score) => sum + score, 0);
    expect(totalScore).toBe(88);
  });
});