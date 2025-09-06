/**
 * Fallback System for Graceful Degradation
 * Provides fallback options when primary operations fail
 */

import { AppError, ErrorCategory, RecoveryStrategy } from './error-types';

export interface FallbackOption<T> {
  name: string;
  priority: number;
  condition?: (error: AppError) => boolean;
  operation: () => Promise<T>;
  description: string;
  limitations?: string[];
}

export interface FallbackResult<T> {
  success: boolean;
  result?: T;
  fallbackUsed?: string;
  error?: Error;
  limitations?: string[];
}

export interface FallbackConfig {
  enableFallback: boolean;
  maxFallbackAttempts: number;
  fallbackTimeout: number;
  logFallbackUsage: boolean;
}

/**
 * Fallback System Class
 */
export class FallbackSystem {
  private static instance: FallbackSystem;
  private config: FallbackConfig;
  private fallbackUsageStats: Map<string, number> = new Map();

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = {
      enableFallback: true,
      maxFallbackAttempts: 3,
      fallbackTimeout: 10000,
      logFallbackUsage: true,
      ...config
    };
  }

  static getInstance(config?: Partial<FallbackConfig>): FallbackSystem {
    if (!FallbackSystem.instance) {
      FallbackSystem.instance = new FallbackSystem(config);
    }
    return FallbackSystem.instance;
  }

  /**
   * Execute operation with fallback options
   */
  async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOptions: FallbackOption<T>[],
    error?: AppError
  ): Promise<FallbackResult<T>> {
    if (!this.config.enableFallback) {
      try {
        const result = await primaryOperation();
        return { success: true, result };
      } catch (err) {
        return { success: false, error: err as Error };
      }
    }

    // Sort fallback options by priority
    const sortedFallbacks = fallbackOptions
      .filter(option => !option.condition || !error || option.condition(error))
      .sort((a, b) => a.priority - b.priority);

    // Try each fallback option
    for (const fallback of sortedFallbacks.slice(0, this.config.maxFallbackAttempts)) {
      try {
        const result = await this.executeWithTimeout(
          fallback.operation,
          this.config.fallbackTimeout
        );

        // Log fallback usage
        if (this.config.logFallbackUsage) {
          this.recordFallbackUsage(fallback.name);
        }

        return {
          success: true,
          result,
          fallbackUsed: fallback.name,
          limitations: fallback.limitations
        };
      } catch (fallbackError) {
        console.warn(`Fallback '${fallback.name}' failed:`, fallbackError);
        continue;
      }
    }

    return {
      success: false,
      error: error || new Error('All fallback options failed')
    };
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Fallback operation timeout')), timeout)
      )
    ]);
  }

  /**
   * Record fallback usage for statistics
   */
  private recordFallbackUsage(fallbackName: string): void {
    const currentCount = this.fallbackUsageStats.get(fallbackName) || 0;
    this.fallbackUsageStats.set(fallbackName, currentCount + 1);
  }

  /**
   * Get fallback usage statistics
   */
  getFallbackStats(): Record<string, number> {
    return Object.fromEntries(this.fallbackUsageStats);
  }

  /**
   * Reset fallback statistics
   */
  resetStats(): void {
    this.fallbackUsageStats.clear();
  }
}

/**
 * Pre-defined fallback strategies for different operations
 */
export class AIFallbackStrategies {
  /**
   * Research operation fallbacks
   */
  static getResearchFallbacks(query: string, userId: string): FallbackOption<any>[] {
    return [
      {
        name: 'cached_results',
        priority: 1,
        description: 'Use cached research results from similar queries',
        operation: async () => {
          // Mock cached results - in real implementation, query cache
          return {
            candidates: [],
            source: 'cache',
            message: 'Showing cached results from similar research'
          };
        },
        limitations: ['Results may be outdated', 'Limited to previous searches']
      },
      {
        name: 'simplified_search',
        priority: 2,
        description: 'Perform basic search without AI enhancement',
        operation: async () => {
          // Mock simplified search - in real implementation, use basic search
          return {
            candidates: [],
            source: 'basic_search',
            message: 'Showing basic search results without AI enhancement'
          };
        },
        limitations: ['No AI-powered insights', 'Basic relevance scoring']
      },
      {
        name: 'manual_suggestions',
        priority: 3,
        description: 'Provide manual research suggestions',
        operation: async () => {
          return {
            candidates: [],
            source: 'manual',
            message: 'AI research is temporarily unavailable. Here are some manual research suggestions.',
            suggestions: [
              'Try searching industry publications directly',
              'Check company press pages',
              'Look for journalist Twitter profiles',
              'Search LinkedIn for media contacts'
            ]
          };
        },
        limitations: ['Manual effort required', 'No automated scoring']
      }
    ];
  }

  /**
   * Enrichment operation fallbacks
   */
  static getEnrichmentFallbacks(contactId: string): FallbackOption<any>[] {
    return [
      {
        name: 'basic_enrichment',
        priority: 1,
        description: 'Use basic data enrichment without AI',
        operation: async () => {
          return {
            suggestions: {},
            source: 'basic',
            message: 'Showing basic enrichment suggestions'
          };
        },
        limitations: ['Limited data sources', 'No AI-powered analysis']
      },
      {
        name: 'manual_enrichment_guide',
        priority: 2,
        description: 'Provide manual enrichment guidance',
        operation: async () => {
          return {
            suggestions: {},
            source: 'manual_guide',
            message: 'AI enrichment is temporarily unavailable. Here\'s how to enrich this contact manually.',
            guide: [
              'Check the contact\'s recent articles for beat information',
              'Look up their social media profiles',
              'Verify their current role and outlet',
              'Check for contact preferences on their bio page'
            ]
          };
        },
        limitations: ['Manual effort required', 'No automated suggestions']
      }
    ];
  }

  /**
   * Duplicate detection fallbacks
   */
  static getDuplicateDetectionFallbacks(contactId: string): FallbackOption<any>[] {
    return [
      {
        name: 'exact_match_detection',
        priority: 1,
        description: 'Use exact matching for duplicate detection',
        operation: async () => {
          return {
            duplicates: [],
            source: 'exact_match',
            message: 'Using exact matching for duplicate detection'
          };
        },
        limitations: ['Only finds exact matches', 'May miss similar contacts']
      },
      {
        name: 'manual_duplicate_check',
        priority: 2,
        description: 'Provide manual duplicate checking guidance',
        operation: async () => {
          return {
            duplicates: [],
            source: 'manual_guide',
            message: 'AI duplicate detection is unavailable. Please check manually for duplicates.',
            checkList: [
              'Search for contacts with the same name',
              'Check for similar email addresses',
              'Look for contacts at the same outlet',
              'Compare social media profiles'
            ]
          };
        },
        limitations: ['Manual verification required', 'Time-consuming process']
      }
    ];
  }
}

/**
 * Service availability checker
 */
export class ServiceAvailabilityChecker {
  private static serviceStatus: Map<string, boolean> = new Map();
  private static lastChecked: Map<string, number> = new Map();
  private static checkInterval = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if a service is available
   */
  static async isServiceAvailable(serviceName: string, healthCheckUrl?: string): Promise<boolean> {
    const now = Date.now();
    const lastCheck = this.lastChecked.get(serviceName) || 0;

    // Return cached status if recently checked
    if (now - lastCheck < this.checkInterval) {
      return this.serviceStatus.get(serviceName) ?? false;
    }

    let isAvailable = false;

    try {
      if (healthCheckUrl) {
        const response = await fetch(healthCheckUrl, {
          method: 'GET',
          timeout: 5000
        } as any);
        isAvailable = response.ok;
      } else {
        // Service-specific availability checks
        isAvailable = await this.performServiceCheck(serviceName);
      }
    } catch (error) {
      console.warn(`Service availability check failed for ${serviceName}:`, error);
      isAvailable = false;
    }

    this.serviceStatus.set(serviceName, isAvailable);
    this.lastChecked.set(serviceName, now);

    return isAvailable;
  }

  /**
   * Perform service-specific availability checks
   */
  private static async performServiceCheck(serviceName: string): Promise<boolean> {
    switch (serviceName) {
      case 'openai':
        try {
          // Mock OpenAI availability check
          return true; // In real implementation, make a test API call
        } catch {
          return false;
        }

      case 'anthropic':
        try {
          // Mock Anthropic availability check
          return true; // In real implementation, make a test API call
        } catch {
          return false;
        }

      case 'database':
        try {
          // Mock database availability check
          return true; // In real implementation, make a test query
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Get all service statuses
   */
  static getAllServiceStatuses(): Record<string, boolean> {
    return Object.fromEntries(this.serviceStatus);
  }

  /**
   * Force refresh service status
   */
  static async refreshServiceStatus(serviceName: string, healthCheckUrl?: string): Promise<boolean> {
    this.lastChecked.delete(serviceName);
    return this.isServiceAvailable(serviceName, healthCheckUrl);
  }

  /**
   * Reset all service statuses
   */
  static resetAllStatuses(): void {
    this.serviceStatus.clear();
    this.lastChecked.clear();
  }
}

/**
 * Graceful degradation utilities
 */
export const gracefulDegradation = {
  /**
   * Execute with automatic fallback based on error type
   */
  async executeWithAutoFallback<T>(
    primaryOperation: () => Promise<T>,
    operationType: 'research' | 'enrichment' | 'duplicate_detection',
    context: any
  ): Promise<FallbackResult<T>> {
    const fallbackSystem = FallbackSystem.getInstance();

    try {
      const result = await primaryOperation();
      return { success: true, result };
    } catch (error) {
      const appError = error as AppError;

      // Get appropriate fallback options based on operation type
      let fallbackOptions: FallbackOption<T>[] = [];

      switch (operationType) {
        case 'research':
          fallbackOptions = AIFallbackStrategies.getResearchFallbacks(
            context.query,
            context.userId
          ) as FallbackOption<T>[];
          break;
        case 'enrichment':
          fallbackOptions = AIFallbackStrategies.getEnrichmentFallbacks(
            context.contactId
          ) as FallbackOption<T>[];
          break;
        case 'duplicate_detection':
          fallbackOptions = AIFallbackStrategies.getDuplicateDetectionFallbacks(
            context.contactId
          ) as FallbackOption<T>[];
          break;
      }

      return fallbackSystem.executeWithFallback(
        primaryOperation,
        fallbackOptions,
        appError
      );
    }
  },

  /**
   * Check service health and return appropriate strategy
   */
  async getRecommendedStrategy(serviceName: string): Promise<'primary' | 'fallback' | 'unavailable'> {
    const isAvailable = await ServiceAvailabilityChecker.isServiceAvailable(serviceName);
    
    if (isAvailable) {
      return 'primary';
    }

    // Check if fallback options are available
    const fallbackSystem = FallbackSystem.getInstance();
    if (fallbackSystem['config'].enableFallback) {
      return 'fallback';
    }

    return 'unavailable';
  },

  /**
   * Create a degraded response with user-friendly messaging
   */
  createDegradedResponse<T>(
    fallbackResult: T,
    fallbackName: string,
    limitations: string[] = []
  ): T & { _degraded: boolean; _fallback: string; _limitations: string[] } {
    return {
      ...fallbackResult,
      _degraded: true,
      _fallback: fallbackName,
      _limitations: limitations
    };
  }
};

// Export singleton instance
export const fallbackSystem = FallbackSystem.getInstance();