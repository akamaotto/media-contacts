/**
 * Contact Extraction Module
 * Main entry point for the AI-powered contact extraction pipeline
 */

// Core services
export { WebContentParser } from './content-parser';
export { AIContactIdentifier } from './ai-identifier';
export { EmailValidator } from './email-validator';
export { SocialMediaDetector } from './social-detector';
export { ConfidenceScorer } from './confidence-scorer';
export { DuplicateDetector } from './duplicate-detector';
export { QualityAssessor } from './quality-assessor';
export { ExtractionCache } from './extraction-cache';
export { ContactExtractionService } from './contact-extraction-service';

// API layer
export { ContactExtractionAPIService } from '../../app/api/ai/contact-extraction/service';
export { ContactExtractionController } from '../../app/api/ai/contact-extraction/controller';

// Types and interfaces
export * from './types';

// Utility exports
export const ContactExtraction = {
  // Service factory
  createService: (cacheConfig?: any) => new ContactExtractionService(cacheConfig),

  // Create API service
  createAPIService: () => new ContactExtractionAPIService(),

  // Version info
  version: '1.0.0',

  // Default configuration
  defaultConfig: {
    ai: {
      enabled: true,
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 2000,
      timeoutMs: 30000
    },
    validation: {
      emailValidation: true,
      socialValidation: true,
      nameValidation: true,
      strictMode: false
    },
    caching: {
      enabled: true,
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 10000,
      cleanupInterval: 60 * 60 * 1000 // 1 hour
    },
    processing: {
      maxConcurrent: 5,
      batchSize: 10,
      timeoutMs: 30000,
      retryAttempts: 3
    },
    quality: {
      minConfidence: 0.5,
      minQuality: 0.3,
      enableAssessment: true
    }
  }
};

// Export convenience functions
export const createContactExtractionService = ContactExtraction.createService;
export const createContactExtractionAPIService = ContactExtraction.createAPIService;