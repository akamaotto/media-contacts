/**
 * Robots.txt Compliance Checker
 * Ensures ethical web scraping by respecting robots.txt directives
 */

export interface RobotsRule {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
  sitemap?: string[];
}

export interface RobotsCheckResult {
  allowed: boolean;
  crawlDelay?: number;
  reason?: string;
  rules?: RobotsRule[];
}

export interface RobotsCacheEntry {
  rules: RobotsRule[];
  fetchedAt: Date;
  expiresAt: Date;
}

/**
 * Robots.txt Parser and Checker
 */
export class RobotsChecker {
  private static instance: RobotsChecker;
  private cache: Map<string, RobotsCacheEntry> = new Map();
  private readonly cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  private readonly userAgent = 'MediaContactBot/1.0';

  static getInstance(): RobotsChecker {
    if (!RobotsChecker.instance) {
      RobotsChecker.instance = new RobotsChecker();
    }
    return RobotsChecker.instance;
  }

  /**
   * Check if a URL is allowed to be crawled
   */
  async isAllowed(url: string, userAgent?: string): Promise<RobotsCheckResult> {
    try {
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      const path = urlObj.pathname;
      const agent = userAgent || this.userAgent;

      // Get robots.txt rules
      const rules = await this.getRobotsRules(baseUrl);
      
      // Find applicable rules for this user agent
      const applicableRules = this.findApplicableRules(rules, agent);
      
      // Check if path is allowed
      const isAllowed = this.checkPathAllowed(path, applicableRules);
      
      // Get crawl delay
      const crawlDelay = this.getCrawlDelay(applicableRules);

      return {
        allowed: isAllowed,
        crawlDelay,
        reason: isAllowed ? undefined : 'Disallowed by robots.txt',
        rules: applicableRules
      };
    } catch (error) {
      console.warn('Robots.txt check failed:', error);
      // Default to allowed if robots.txt check fails
      return {
        allowed: true,
        reason: 'Robots.txt check failed, defaulting to allowed'
      };
    }
  }

  /**
   * Get robots.txt rules for a domain
   */
  private async getRobotsRules(baseUrl: string): Promise<RobotsRule[]> {
    // Check cache first
    const cached = this.cache.get(baseUrl);
    if (cached && new Date() < cached.expiresAt) {
      return cached.rules;
    }

    try {
      const robotsUrl = `${baseUrl}/robots.txt`;
      const response = await fetch(robotsUrl, {
        headers: {
          'User-Agent': this.userAgent
        },
        // Timeout after 5 seconds
        signal: AbortSignal.timeout(5000)
      });

      let robotsText = '';
      if (response.ok) {
        robotsText = await response.text();
      }

      const rules = this.parseRobotsText(robotsText);
      
      // Cache the results
      this.cache.set(baseUrl, {
        rules,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + this.cacheTimeout)
      });

      return rules;
    } catch (error) {
      console.warn(`Failed to fetch robots.txt for ${baseUrl}:`, error);
      
      // Cache empty rules to avoid repeated failures
      const emptyRules: RobotsRule[] = [];
      this.cache.set(baseUrl, {
        rules: emptyRules,
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + this.cacheTimeout)
      });

      return emptyRules;
    }
  }

  /**
   * Parse robots.txt content
   */
  private parseRobotsText(robotsText: string): RobotsRule[] {
    const rules: RobotsRule[] = [];
    const lines = robotsText.split('\n').map(line => line.trim());
    
    let currentRule: Partial<RobotsRule> | null = null;

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) {
        continue;
      }

      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) {
        continue;
      }

      const directive = line.substring(0, colonIndex).trim().toLowerCase();
      const value = line.substring(colonIndex + 1).trim();

      switch (directive) {
        case 'user-agent':
          // Start new rule
          if (currentRule) {
            rules.push(this.finalizeRule(currentRule));
          }
          currentRule = {
            userAgent: value.toLowerCase(),
            allow: [],
            disallow: [],
            sitemap: []
          };
          break;

        case 'disallow':
          if (currentRule && value) {
            currentRule.disallow!.push(value);
          }
          break;

        case 'allow':
          if (currentRule && value) {
            currentRule.allow!.push(value);
          }
          break;

        case 'crawl-delay':
          if (currentRule) {
            const delay = parseInt(value, 10);
            if (!isNaN(delay)) {
              currentRule.crawlDelay = delay * 1000; // Convert to milliseconds
            }
          }
          break;

        case 'sitemap':
          if (currentRule && value) {
            currentRule.sitemap!.push(value);
          }
          break;
      }
    }

    // Add the last rule
    if (currentRule) {
      rules.push(this.finalizeRule(currentRule));
    }

    return rules;
  }

  /**
   * Finalize a rule by ensuring all required fields are present
   */
  private finalizeRule(rule: Partial<RobotsRule>): RobotsRule {
    return {
      userAgent: rule.userAgent || '*',
      allow: rule.allow || [],
      disallow: rule.disallow || [],
      crawlDelay: rule.crawlDelay,
      sitemap: rule.sitemap || []
    };
  }

  /**
   * Find applicable rules for a user agent
   */
  private findApplicableRules(rules: RobotsRule[], userAgent: string): RobotsRule[] {
    const lowerUserAgent = userAgent.toLowerCase();
    const applicableRules: RobotsRule[] = [];

    // First, look for exact matches
    for (const rule of rules) {
      if (rule.userAgent === lowerUserAgent) {
        applicableRules.push(rule);
      }
    }

    // If no exact matches, look for wildcard rules
    if (applicableRules.length === 0) {
      for (const rule of rules) {
        if (rule.userAgent === '*') {
          applicableRules.push(rule);
        }
      }
    }

    // Also include partial matches (user agent contains the rule's user agent)
    for (const rule of rules) {
      if (rule.userAgent !== '*' && 
          rule.userAgent !== lowerUserAgent && 
          lowerUserAgent.includes(rule.userAgent)) {
        applicableRules.push(rule);
      }
    }

    return applicableRules;
  }

  /**
   * Check if a path is allowed based on rules
   */
  private checkPathAllowed(path: string, rules: RobotsRule[]): boolean {
    if (rules.length === 0) {
      return true; // No rules means everything is allowed
    }

    let allowed = true;

    for (const rule of rules) {
      // Check disallow rules first
      for (const disallowPattern of rule.disallow) {
        if (this.matchesPattern(path, disallowPattern)) {
          allowed = false;
          break;
        }
      }

      // Check allow rules (they can override disallow)
      for (const allowPattern of rule.allow) {
        if (this.matchesPattern(path, allowPattern)) {
          allowed = true;
          break;
        }
      }
    }

    return allowed;
  }

  /**
   * Check if a path matches a robots.txt pattern
   */
  private matchesPattern(path: string, pattern: string): boolean {
    if (pattern === '/') {
      return true; // Root pattern matches everything
    }

    if (pattern.endsWith('*')) {
      // Wildcard pattern
      const prefix = pattern.slice(0, -1);
      return path.startsWith(prefix);
    }

    if (pattern.endsWith('$')) {
      // End-of-string pattern
      const exactPattern = pattern.slice(0, -1);
      return path === exactPattern;
    }

    // Exact prefix match
    return path.startsWith(pattern);
  }

  /**
   * Get crawl delay from applicable rules
   */
  private getCrawlDelay(rules: RobotsRule[]): number | undefined {
    for (const rule of rules) {
      if (rule.crawlDelay !== undefined) {
        return rule.crawlDelay;
      }
    }
    return undefined;
  }

  /**
   * Get sitemap URLs from robots.txt
   */
  async getSitemaps(baseUrl: string): Promise<string[]> {
    const rules = await this.getRobotsRules(baseUrl);
    const sitemaps: string[] = [];

    for (const rule of rules) {
      if (rule.sitemap) {
        sitemaps.push(...rule.sitemap);
      }
    }

    return [...new Set(sitemaps)]; // Remove duplicates
  }

  /**
   * Clear cache for a specific domain
   */
  clearCache(baseUrl?: string): void {
    if (baseUrl) {
      this.cache.delete(baseUrl);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache(): void {
    const now = new Date();
    for (const [url, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(url);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalEntries: number;
    expiredEntries: number;
    hitRate: number;
  } {
    const now = new Date();
    let expiredEntries = 0;
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      expiredEntries,
      hitRate: this.cache.size > 0 ? (this.cache.size - expiredEntries) / this.cache.size : 0
    };
  }
}

// Export singleton instance
export const robotsChecker = RobotsChecker.getInstance();

/**
 * Utility functions for robots.txt compliance
 */
export const robotsUtils = {
  /**
   * Check multiple URLs for robots.txt compliance
   */
  async checkMultipleUrls(
    urls: string[], 
    userAgent?: string
  ): Promise<Array<{ url: string; result: RobotsCheckResult }>> {
    const results = await Promise.allSettled(
      urls.map(async (url) => ({
        url,
        result: await robotsChecker.isAllowed(url, userAgent)
      }))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<{ url: string; result: RobotsCheckResult }> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  },

  /**
   * Filter URLs based on robots.txt compliance
   */
  async filterAllowedUrls(urls: string[], userAgent?: string): Promise<string[]> {
    const results = await this.checkMultipleUrls(urls, userAgent);
    return results
      .filter(({ result }) => result.allowed)
      .map(({ url }) => url);
  },

  /**
   * Get recommended crawl delay for a domain
   */
  async getRecommendedDelay(url: string, userAgent?: string): Promise<number> {
    const result = await robotsChecker.isAllowed(url, userAgent);
    return result.crawlDelay || 1000; // Default 1 second delay
  },

  /**
   * Check if a domain allows any crawling
   */
  async isDomainCrawlable(baseUrl: string, userAgent?: string): Promise<boolean> {
    try {
      const testUrls = [
        `${baseUrl}/`,
        `${baseUrl}/index.html`,
        `${baseUrl}/about`,
        `${baseUrl}/contact`
      ];

      const results = await this.checkMultipleUrls(testUrls, userAgent);
      return results.some(({ result }) => result.allowed);
    } catch (error) {
      console.warn('Domain crawlability check failed:', error);
      return true; // Default to crawlable if check fails
    }
  }
};