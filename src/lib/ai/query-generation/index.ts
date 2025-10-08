/**
 * Query Generation Module - Main Export
 * Provides unified access to query generation functionality
 */

// Core Service
export { QueryGenerationService } from './service';

// Components
export { QueryTemplateEngine } from './template-engine';
export { AIQueryEnhancer } from './ai-enhancement';
export { QueryScorer } from './scoring';
export { QueryDeduplicator } from './deduplication';

// Types and Interfaces
export type {
  QueryGenerationRequest,
  QueryCriteria,
  QueryGenerationOptions,
  GeneratedQuery,
  QueryScores,
  QueryMetadata,
  QueryTemplate,
  QueryPerformanceMetrics,
  QueryGenerationResult,
  QueryDeduplicationResult,
  QueryEnhancementRequest,
  QueryValidationResult,
  QueryGenerationJob,
  QueryGenerationConfig,
  QueryBatchMetrics,
  QueryEffectivenessMetrics
} from './types';

// Enums
export {
  QueryType,
  QueryTemplateType,
  QueryStatus,
  QueryOperationType,
  QueryEnhancementType
} from './types';

// Error Classes
export { QueryGenerationError } from './types';

// Factory function for easy initialization
import { PrismaClient } from '@prisma/client';
import { QueryGenerationService } from './service';
import { QueryGenerationConfig } from './types';

export const createQueryGenerationService = (
  prisma: PrismaClient,
  config?: Partial<QueryGenerationConfig>
): QueryGenerationService => {
  const service = new QueryGenerationService(prisma, config);
  return service;
};

// Default export
export default {
  Service: QueryGenerationService,
  Components: {
    TemplateEngine: QueryTemplateEngine,
    AIEnhancer: AIQueryEnhancer,
    Scorer: QueryScorer,
    Deduplicator: QueryDeduplicator
  },
  Types: {
    QueryType,
    QueryTemplateType,
    QueryStatus,
    QueryOperationType,
    QueryEnhancementType
  },
  Error: QueryGenerationError,
  createService: createQueryGenerationService
};