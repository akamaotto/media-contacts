/**
 * Request Throttling System
 * Implements ethical rate limiting and request throttling for web scraping
 */

export interface ThrottleConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstSize: number;
  respectCrawlDelay: boolean;
  minDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface ThrottleState {
  domain: string;
  requestCount: {
    second: number;
    minute: number;
    hour: number;
  };
  lastRequest: Date;
  nextAllowedRequest: Date;
  consecutiveErrors: number;
  isBlocked: boolean;
  blockUntil?: Date;
}

export interface ThrottleResult {
  allowed: boolean;
  delay: number;
  reason?: string;
  retryAfter?: number;
}

/**
 * Request Throttler Class
 */
export class RequestThrottler {
  private static instance: RequestThrottler;
  private domainStates: Map<string, ThrottleState> = new Map();
  private defaultConfig: ThrottleConfig = {
    requestsPerSecond: 1,
    requestsPerMinute: 30,
    requestsPerHour: 1000,
    burstSize: 3,
    respectCrawlDelay: true,
    minDelay: 1000, // 1 second
    maxDelay: 60000, // 1 minute
    backoffMultiplier: 2
  };

  static getInstance(): RequestThrottler {
    if (!RequestThrottler.instance) {
      RequestThrottler.instance = new RequestThrottler();
    }
    return RequestThrottler.instance;
  }

  /**
   * Check if a request to a URL is allowed
   */
  async checkRequest(
    url: string, 
    config?: Partial<ThrottleConfig>,
    crawlDelay?: number
  ): Promise<ThrottleResult> {
    const domain = this.extractDomain(url);
    const effectiveConfig = { ...this.defaultConfig, ...config };
    
    // Get or create domain state
    let state = this.domainStates.get(domain);
    if (!state) {
      state = this.createDomainState(domain);
      this.domainStates.set(domain, state);
    }

    // Check if domain is blocked
    if (state.isBlocked && state.blockUntil && new Date() < state.blockUntil) {
      const retryAfter = Math.ceil((state.blockUntil.getTime() - Date.now()) / 1000);
      return {
        allowed: false,
        delay: 0,
        reason: 'Domain temporarily blocked due to errors',
        retryAfter
      };
    }

    // Clear block if expired
    if (state.isBlocked && state.blockUntil && new Date() >= state.blockUntil) {
      state.isBlocked = false;
      state.blockUntil = undefined;
      state.consecutiveErrors = 0;
    }

    const now = new Date();
    
    // Clean up old request counts
    this.cleanupRequestCounts(state, now);

    // Check rate limits
    const rateLimitCheck = this.checkRateLimits(state, effectiveConfig);
    if (!rateLimitCheck.allowed) {
      return rateLimitCheck;
    }

    // Calculate required delay
    const requiredDelay = this.calculateDelay(state, effectiveConfig, crawlDelay);
    
    // Check if enough time has passed since last request
    const timeSinceLastRequest = now.getTime() - state.lastRequest.getTime();
    if (timeSinceLastRequest < requiredDelay) {
      const remainingDelay = requiredDelay - timeSinceLastRequest;
      return {
        allowed: false,
        delay: remainingDelay,
        reason: 'Rate limit delay required'
      };
    }

    // Request is allowed
    return {
      allowed: true,
      delay: requiredDelay
    };
  }

  /**
   * Record a successful request
   */
  recordRequest(url: string): void {
    const domain = this.extractDomain(url);
    const state = this.domainStates.get(domain);
    
    if (state) {
      const now = new Date();
      state.lastRequest = now;
      state.nextAllowedRequest = new Date(now.getTime() + this.defaultConfig.minDelay);
      
      // Increment request counts
      state.requestCount.second++;
      state.requestCount.minute++;
      state.requestCount.hour++;
      
      // Reset consecutive errors on successful request
      state.consecutiveErrors = 0;
    }
  }

  /**
   * Record a failed request
   */
  recordError(url: string, errorType: 'network' | 'server' | 'blocked' = 'network'): void {
    const domain = this.extractDomain(url);
    const state = this.domainStates.get(domain);
    
    if (state) {
      state.consecutiveErrors++;
      
      // Apply exponential backoff for errors
      const backoffDelay = Math.min(
        this.defaultConfig.minDelay * Math.pow(this.defaultConfig.backoffMultiplier, state.consecutiveErrors - 1),
        this.defaultConfig.maxDelay
      );
      
      state.nextAllowedRequest = new Date(Date.now() + backoffDelay);
      
      // Block domain if too many consecutive errors
      if (state.consecutiveErrors >= 5) {
        state.isBlocked = true;
        state.blockUntil = new Date(Date.now() + 5 * 60 * 1000); // Block for 5 minutes
      }
    }
  }

  /**
   * Wait for the required delay before making a request
   */
  async waitForRequest(
    url: string, 
    config?: Partial<ThrottleConfig>,
    crawlDelay?: number
  ): Promise<void> {
    const result = await this.checkRequest(url, config, crawlDelay);
    
    if (!result.allowed && result.delay > 0) {
      await this.sleep(result.delay);
    } else if (!result.allowed && result.retryAfter) {
      await this.sleep(result.retryAfter * 1000);
    }
  }

  /**
   * Execute a request with automatic throttling
   */
  async executeThrottledRequest<T>(
    url: string,
    requestFunction: () => Promise<T>,
    config?: Partial<ThrottleConfig>,
    crawlDelay?: number
  ): Promise<T> {
    // Wait for throttling
    await this.waitForRequest(url, config, crawlDelay);
    
    try {
      const result = await requestFunction();
      this.recordRequest(url);
      return result;
    } catch (error) {
      this.recordError(url, this.classifyError(error));
      throw error;
    }
  }

  /**
   * Get throttling statistics for a domain
   */
  getDomainStats(domain: string): ThrottleState | null {
    return this.domainStates.get(domain) || null;
  }

  /**
   * Get all domain statistics
   */
  getAllStats(): Record<string, ThrottleState> {
    const stats: Record<string, ThrottleState> = {};
    for (const [domain, state] of this.domainStates.entries()) {
      stats[domain] = { ...state };
    }
    return stats;
  }

  /**
   * Reset throttling state for a domain
   */
  resetDomain(domain: string): void {
    this.domainStates.delete(domain);
  }

  /**
   * Reset all throttling states
   */
  resetAll(): void {
    this.domainStates.clear();
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Create initial domain state
   */
  private createDomainState(domain: string): ThrottleState {
    const now = new Date();
    return {
      domain,
      requestCount: {
        second: 0,
        minute: 0,
        hour: 0
      },
      lastRequest: new Date(0), // Epoch time
      nextAllowedRequest: now,
      consecutiveErrors: 0,
      isBlocked: false
    };
  }

  /**
   * Clean up old request counts
   */
  private cleanupRequestCounts(state: ThrottleState, now: Date): void {
    const oneSecondAgo = new Date(now.getTime() - 1000);
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Reset counters if enough time has passed
    if (state.lastRequest < oneSecondAgo) {
      state.requestCount.second = 0;
    }
    if (state.lastRequest < oneMinuteAgo) {
      state.requestCount.minute = 0;
    }
    if (state.lastRequest < oneHourAgo) {
      state.requestCount.hour = 0;
    }
  }

  /**
   * Check rate limits
   */
  private checkRateLimits(state: ThrottleState, config: ThrottleConfig): ThrottleResult {
    if (state.requestCount.second >= config.requestsPerSecond) {
      return {
        allowed: false,
        delay: 1000,
        reason: 'Requests per second limit exceeded'
      };
    }

    if (state.requestCount.minute >= config.requestsPerMinute) {
      return {
        allowed: false,
        delay: 60000,
        reason: 'Requests per minute limit exceeded'
      };
    }

    if (state.requestCount.hour >= config.requestsPerHour) {
      return {
        allowed: false,
        delay: 3600000,
        reason: 'Requests per hour limit exceeded'
      };
    }

    return { allowed: true, delay: 0 };
  }

  /**
   * Calculate required delay between requests
   */
  private calculateDelay(
    state: ThrottleState, 
    config: ThrottleConfig, 
    crawlDelay?: number
  ): number {
    let delay = config.minDelay;

    // Respect crawl-delay from robots.txt
    if (config.respectCrawlDelay && crawlDelay) {
      delay = Math.max(delay, crawlDelay);
    }

    // Apply exponential backoff for errors
    if (state.consecutiveErrors > 0) {
      delay = Math.min(
        delay * Math.pow(config.backoffMultiplier, state.consecutiveErrors),
        config.maxDelay
      );
    }

    return delay;
  }

  /**
   * Classify error type
   */
  private classifyError(error: any): 'network' | 'server' | 'blocked' {
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return 'network';
    }
    if (error.status >= 500) {
      return 'server';
    }
    if (error.status === 429 || error.status === 403) {
      return 'blocked';
    }
    return 'network';
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup expired states
   */
  cleanup(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const [domain, state] of this.domainStates.entries()) {
      // Remove states that haven't been used in over an hour
      if (state.lastRequest < oneHourAgo && !state.isBlocked) {
        this.domainStates.delete(domain);
      }
    }
  }
}

// Export singleton instance
export const requestThrottler = RequestThrottler.getInstance();

/**
 * Utility functions for request throttling
 */
export const throttleUtils = {
  /**
   * Create a throttled fetch function
   */
  createThrottledFetch: (config?: Partial<ThrottleConfig>) => {
    return async (url: string, options?: RequestInit): Promise<Response> => {
      return requestThrottler.executeThrottledRequest(
        url,
        () => fetch(url, options),
        config
      );
    };
  },

  /**
   * Throttle multiple requests with concurrency control
   */
  async throttleMultipleRequests<T>(
    requests: Array<{ url: string; requestFn: () => Promise<T> }>,
    config?: Partial<ThrottleConfig> & { concurrency?: number }
  ): Promise<Array<{ url: string; result?: T; error?: Error }>> {
    const { concurrency = 3, ...throttleConfig } = config || {};
    const results: Array<{ url: string; result?: T; error?: Error }> = [];
    
    // Process requests in batches
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async ({ url, requestFn }) => {
        try {
          const result = await requestThrottler.executeThrottledRequest(
            url,
            requestFn,
            throttleConfig
          );
          return { url, result };
        } catch (error) {
          return { url, error: error as Error };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  },

  /**
   * Get recommended throttle config for a domain
   */
  getRecommendedConfig(domain: string): Partial<ThrottleConfig> {
    // Domain-specific configurations
    const domainConfigs: Record<string, Partial<ThrottleConfig>> = {
      'twitter.com': {
        requestsPerSecond: 0.5,
        requestsPerMinute: 15,
        minDelay: 2000
      },
      'linkedin.com': {
        requestsPerSecond: 0.3,
        requestsPerMinute: 10,
        minDelay: 3000
      },
      'facebook.com': {
        requestsPerSecond: 0.2,
        requestsPerMinute: 5,
        minDelay: 5000
      },
      // News sites - generally more permissive
      'reuters.com': {
        requestsPerSecond: 2,
        requestsPerMinute: 60,
        minDelay: 500
      },
      'bbc.com': {
        requestsPerSecond: 1,
        requestsPerMinute: 30,
        minDelay: 1000
      }
    };

    return domainConfigs[domain] || {};
  },

  /**
   * Check if domain is currently throttled
   */
  isDomainThrottled(domain: string): boolean {
    const state = requestThrottler.getDomainStats(domain);
    if (!state) return false;

    const now = new Date();
    const nextDelayActive = state.nextAllowedRequest.getTime() > now.getTime();
    const blockedActive = !!state.isBlocked && !!state.blockUntil && state.blockUntil.getTime() > now.getTime();
    return nextDelayActive || blockedActive;
  },

  /**
   * Get next available request time for domain
   */
  getNextAvailableTime(domain: string): Date | null {
    const state = requestThrottler.getDomainStats(domain);
    if (!state) return null;

    if (state.isBlocked && state.blockUntil) {
      return state.blockUntil;
    }

    return state.nextAllowedRequest;
  }
};