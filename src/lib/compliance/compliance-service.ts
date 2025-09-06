/**
 * Integrated Compliance Service
 * Orchestrates all compliance features for ethical data handling
 */

import { robotsChecker, robotsUtils } from './robots-checker';
import { requestThrottler, throttleUtils } from './request-throttler';
import { takedownSystem } from './takedown-system';
import { provenanceTracker } from './provenance-tracker';

export interface ComplianceConfig {
  enableRobotsCheck: boolean;
  enableRateThrottling: boolean;
  enableProvenanceTracking: boolean;
  enableTakedownHandling: boolean;
  defaultUserAgent: string;
  respectCrawlDelay: boolean;
  minRequestDelay: number;
  maxRequestsPerDomain: number;
}

export interface ScrapingRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  userAgent?: string;
  purpose: string;
  userId: string;
  sessionId?: string;
}

export interface ComplianceResult {
  allowed: boolean;
  reason?: string;
  delay?: number;
  restrictions?: string[];
  provenanceId?: string;
}

export interface ComplianceReport {
  summary: {
    totalRequests: number;
    allowedRequests: number;
    blockedRequests: number;
    complianceRate: number;
  };
  robotsCompliance: {
    domainsChecked: number;
    compliantDomains: number;
    nonCompliantBlocked: number;
  };
  throttling: {
    totalDomains: number;
    throttledDomains: number;
    averageDelay: number;
  };
  takedowns: {
    totalRequests: number;
    pendingRequests: number;
    completedRequests: number;
  };
  provenance: {
    trackedDataItems: number;
    verifiedItems: number;
    qualityScore: number;
  };
}

/**
 * Compliance Service Class
 */
export class ComplianceService {
  private static instance: ComplianceService;
  private config: ComplianceConfig;
  private requestLog: Array<{
    url: string;
    timestamp: Date;
    allowed: boolean;
    reason?: string;
  }> = [];

  constructor(config: Partial<ComplianceConfig> = {}) {
    this.config = {
      enableRobotsCheck: true,
      enableRateThrottling: true,
      enableProvenanceTracking: true,
      enableTakedownHandling: true,
      defaultUserAgent: 'MediaContactBot/1.0 (+https://example.com/bot)',
      respectCrawlDelay: true,
      minRequestDelay: 1000,
      maxRequestsPerDomain: 100,
      ...config
    };
  }

  static getInstance(config?: Partial<ComplianceConfig>): ComplianceService {
    if (!ComplianceService.instance) {
      ComplianceService.instance = new ComplianceService(config);
    }
    return ComplianceService.instance;
  }

  /**
   * Check if a scraping request is compliant
   */
  async checkCompliance(request: ScrapingRequest): Promise<ComplianceResult> {
    const { url, userAgent = this.config.defaultUserAgent, purpose, userId } = request;
    const restrictions: string[] = [];
    let allowed = true;
    let reason: string | undefined;
    let delay = 0;

    try {
      // 1. Check if domain/contact is opted out
      if (this.config.enableTakedownHandling) {
        const domain = new URL(url).hostname;
        const isOptedOut = takedownSystem.isOptedOut(domain, 'domain');
        
        if (isOptedOut) {
          allowed = false;
          reason = 'Domain is opted out from data collection';
          this.logRequest(url, allowed, reason);
          return { allowed, reason, restrictions };
        }
      }

      // 2. Check robots.txt compliance
      if (this.config.enableRobotsCheck) {
        const robotsResult = await robotsChecker.isAllowed(url, userAgent);
        
        if (!robotsResult.allowed) {
          allowed = false;
          reason = robotsResult.reason || 'Blocked by robots.txt';
          restrictions.push('robots.txt disallows access');
          this.logRequest(url, allowed, reason);
          return { allowed, reason, restrictions };
        }

        // Set crawl delay if specified
        if (robotsResult.crawlDelay) {
          delay = Math.max(delay, robotsResult.crawlDelay);
          restrictions.push(`Crawl delay: ${robotsResult.crawlDelay}ms`);
        }
      }

      // 3. Check rate limiting
      if (this.config.enableRateThrottling) {
        const throttleResult = await requestThrottler.checkRequest(
          url,
          {
            respectCrawlDelay: this.config.respectCrawlDelay,
            minDelay: this.config.minRequestDelay
          },
          delay
        );

        if (!throttleResult.allowed) {
          allowed = false;
          reason = throttleResult.reason || 'Rate limit exceeded';
          delay = throttleResult.delay || 0;
          restrictions.push(`Rate limited: wait ${delay}ms`);
          this.logRequest(url, allowed, reason);
          return { allowed, reason, delay, restrictions };
        }

        delay = Math.max(delay, throttleResult.delay);
      }

      // 4. Record provenance if tracking enabled
      let provenanceId: string | undefined;
      if (this.config.enableProvenanceTracking) {
        provenanceId = await provenanceTracker.recordDataSource({
          type: 'web_scraping',
          url,
          domain: new URL(url).hostname,
          method: request.method || 'GET',
          userAgent,
          robotsCompliant: true,
          rateLimited: true,
          metadata: {
            purpose,
            userId,
            sessionId: request.sessionId
          }
        });
      }

      this.logRequest(url, allowed);
      return { 
        allowed, 
        delay: delay > 0 ? delay : undefined, 
        restrictions: restrictions.length > 0 ? restrictions : undefined,
        provenanceId 
      };

    } catch (error) {
      console.error('Compliance check failed:', error);
      allowed = false;
      reason = 'Compliance check failed';
      this.logRequest(url, allowed, reason);
      return { allowed, reason, restrictions };
    }
  }

  /**
   * Execute a compliant web request
   */
  async executeCompliantRequest<T>(
    request: ScrapingRequest,
    requestFunction: () => Promise<T>
  ): Promise<T> {
    // Check compliance first
    const complianceResult = await this.checkCompliance(request);
    
    if (!complianceResult.allowed) {
      throw new Error(`Request blocked: ${complianceResult.reason}`);
    }

    // Wait for required delay
    if (complianceResult.delay && complianceResult.delay > 0) {
      await this.sleep(complianceResult.delay);
    }

    try {
      // Execute the request
      const result = await requestFunction();

      // Record successful request
      if (this.config.enableRateThrottling) {
        requestThrottler.recordRequest(request.url);
      }

      // Log data access for provenance
      if (this.config.enableProvenanceTracking && complianceResult.provenanceId) {
        await provenanceTracker.logDataAccess({
          dataId: complianceResult.provenanceId,
          userId: request.userId,
          action: 'read',
          purpose: request.purpose
        });
      }

      return result;
    } catch (error) {
      // Record failed request
      if (this.config.enableRateThrottling) {
        requestThrottler.recordError(request.url);
      }

      throw error;
    }
  }

  /**
   * Batch compliance check for multiple URLs
   */
  async checkBatchCompliance(
    requests: ScrapingRequest[]
  ): Promise<Array<{ request: ScrapingRequest; result: ComplianceResult }>> {
    const results = await Promise.allSettled(
      requests.map(async (request) => ({
        request,
        result: await this.checkCompliance(request)
      }))
    );

    return results
      .filter((result): result is PromiseFulfilledResult<{ request: ScrapingRequest; result: ComplianceResult }> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
  }

  /**
   * Filter URLs based on compliance
   */
  async filterCompliantUrls(
    requests: ScrapingRequest[]
  ): Promise<ScrapingRequest[]> {
    const results = await this.checkBatchCompliance(requests);
    return results
      .filter(({ result }) => result.allowed)
      .map(({ request }) => request);
  }

  /**
   * Submit a takedown request
   */
  async submitTakedownRequest(params: {
    type: 'takedown' | 'opt_out' | 'correction' | 'data_deletion';
    requesterInfo: {
      name: string;
      email: string;
      organization?: string;
      relationship: 'subject' | 'representative' | 'legal' | 'other';
    };
    requestDetails: {
      reason: string;
      description: string;
      affectedData: string[];
      evidence?: string[];
      legalBasis?: string;
    };
    affectedRecords: {
      contactIds?: string[];
      outletIds?: string[];
      dataTypes: string[];
    };
    priority?: 'low' | 'medium' | 'high' | 'urgent';
  }): Promise<string> {
    if (!this.config.enableTakedownHandling) {
      throw new Error('Takedown handling is disabled');
    }

    return takedownSystem.submitTakedownRequest({
      type: params.type,
      priority: params.priority || 'medium',
      requesterInfo: {
        ...params.requesterInfo,
        verificationStatus: 'unverified'
      },
      requestDetails: params.requestDetails,
      affectedRecords: {
        contactIds: params.affectedRecords.contactIds || [],
        outletIds: params.affectedRecords.outletIds || [],
        dataTypes: params.affectedRecords.dataTypes,
        estimatedRecordCount: (params.affectedRecords.contactIds?.length || 0) + 
                             (params.affectedRecords.outletIds?.length || 0)
      },
      timeline: {
        submittedAt: new Date()
      }
    });
  }

  /**
   * Add opt-out entry
   */
  async addOptOut(params: {
    type: 'email' | 'domain' | 'contact' | 'organization';
    value: string;
    reason: string;
    source?: 'user_request' | 'takedown' | 'bounce' | 'complaint' | 'legal';
    addedBy: string;
    expiresAt?: Date;
    notes?: string;
  }): Promise<string> {
    if (!this.config.enableTakedownHandling) {
      throw new Error('Takedown handling is disabled');
    }

    return takedownSystem.addOptOut({
      type: params.type,
      value: params.value,
      reason: params.reason,
      source: params.source || 'user_request',
      addedBy: params.addedBy,
      expiresAt: params.expiresAt,
      notes: params.notes
    });
  }

  /**
   * Track data processing
   */
  async trackDataProcessing(params: {
    dataId: string;
    processingType: 'extraction' | 'transformation' | 'enrichment' | 'validation' | 'deduplication' | 'ai_processing';
    processor: string;
    inputData: any;
    outputData: any;
    success: boolean;
    confidence?: number;
    duration?: number;
    error?: string;
  }): Promise<string> {
    if (!this.config.enableProvenanceTracking) {
      throw new Error('Provenance tracking is disabled');
    }

    return provenanceTracker.recordProcessingStep({
      type: params.processingType,
      processor: params.processor,
      input: {
        dataIds: [params.dataId],
        parameters: params.inputData
      },
      output: {
        dataIds: [params.dataId],
        changes: params.outputData
      },
      duration: params.duration || 0,
      success: params.success,
      error: params.error,
      confidence: params.confidence
    });
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(timeRange?: { start: Date; end: Date }): Promise<ComplianceReport> {
    let filteredLog = this.requestLog;
    
    if (timeRange) {
      filteredLog = this.requestLog.filter(
        log => log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      );
    }

    const totalRequests = filteredLog.length;
    const allowedRequests = filteredLog.filter(log => log.allowed).length;
    const blockedRequests = totalRequests - allowedRequests;
    const complianceRate = totalRequests > 0 ? (allowedRequests / totalRequests) * 100 : 100;

    // Get robots.txt stats
    const robotsStats = robotsChecker.getCacheStats();

    // Get throttling stats
    const throttlingStats = requestThrottler.getAllStats();
    const throttledDomains = Object.keys(throttlingStats).length;

    // Get takedown stats
    const takedownStats = takedownSystem.getComplianceStats();

    // Get provenance stats
    const provenanceStats = provenanceTracker.getProvenanceStats();

    return {
      summary: {
        totalRequests,
        allowedRequests,
        blockedRequests,
        complianceRate: Math.round(complianceRate * 100) / 100
      },
      robotsCompliance: {
        domainsChecked: robotsStats.totalEntries,
        compliantDomains: Math.round(robotsStats.totalEntries * robotsStats.hitRate),
        nonCompliantBlocked: blockedRequests
      },
      throttling: {
        totalDomains: throttledDomains,
        throttledDomains,
        averageDelay: this.config.minRequestDelay
      },
      takedowns: {
        totalRequests: takedownStats.takedownRequests.total,
        pendingRequests: takedownStats.takedownRequests.pending,
        completedRequests: takedownStats.takedownRequests.total - takedownStats.takedownRequests.pending
      },
      provenance: {
        trackedDataItems: provenanceStats.totalDataItems,
        verifiedItems: provenanceStats.complianceStats.verified,
        qualityScore: Math.round(
          (provenanceStats.qualityDistribution.high * 0.9 + 
           provenanceStats.qualityDistribution.medium * 0.7 + 
           provenanceStats.qualityDistribution.low * 0.3) / 
          provenanceStats.totalDataItems * 100
        ) / 100
      }
    };
  }

  /**
   * Validate domain for scraping
   */
  async validateDomain(domain: string): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check if domain is opted out
    if (this.config.enableTakedownHandling) {
      const isOptedOut = takedownSystem.isOptedOut(domain, 'domain');
      if (isOptedOut) {
        issues.push('Domain is opted out from data collection');
        recommendations.push('Remove domain from scraping targets');
      }
    }

    // Check robots.txt
    if (this.config.enableRobotsCheck) {
      const isCrawlable = await robotsUtils.isDomainCrawlable(`https://${domain}`);
      if (!isCrawlable) {
        issues.push('Domain blocks all crawling via robots.txt');
        recommendations.push('Respect robots.txt and avoid scraping this domain');
      }
    }

    // Check if domain is currently throttled
    if (this.config.enableRateThrottling) {
      const isThrottled = throttleUtils.isDomainThrottled(domain);
      if (isThrottled) {
        const nextAvailable = throttleUtils.getNextAvailableTime(domain);
        issues.push(`Domain is currently rate limited until ${nextAvailable?.toISOString()}`);
        recommendations.push('Wait for rate limit to reset before scraping');
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * Get recommended scraping configuration for domain
   */
  async getRecommendedConfig(domain: string): Promise<{
    userAgent: string;
    requestDelay: number;
    maxConcurrency: number;
    respectRobots: boolean;
    allowedPaths: string[];
    disallowedPaths: string[];
  }> {
    const baseUrl = `https://${domain}`;
    
    // Get robots.txt info
    const allowedPaths: string[] = ['/'];
    const disallowedPaths: string[] = [];
    let crawlDelay = this.config.minRequestDelay;

    if (this.config.enableRobotsCheck) {
      try {
        const robotsResult = await robotsChecker.isAllowed(baseUrl, this.config.defaultUserAgent);
        if (robotsResult.crawlDelay) {
          crawlDelay = Math.max(crawlDelay, robotsResult.crawlDelay);
        }
      } catch (error) {
        console.warn('Failed to get robots.txt info for domain:', domain);
      }
    }

    // Get throttling recommendations
    const throttleConfig = throttleUtils.getRecommendedConfig(domain);
    if (throttleConfig.minDelay) {
      crawlDelay = Math.max(crawlDelay, throttleConfig.minDelay);
    }

    return {
      userAgent: this.config.defaultUserAgent,
      requestDelay: crawlDelay,
      maxConcurrency: 1, // Conservative default
      respectRobots: this.config.enableRobotsCheck,
      allowedPaths,
      disallowedPaths
    };
  }

  /**
   * Log request for compliance tracking
   */
  private logRequest(url: string, allowed: boolean, reason?: string): void {
    this.requestLog.push({
      url,
      timestamp: new Date(),
      allowed,
      reason
    });

    // Keep only recent logs (last 10000 entries)
    if (this.requestLog.length > 10000) {
      this.requestLog = this.requestLog.slice(-5000);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup expired data and cache
   */
  async cleanup(): Promise<void> {
    // Cleanup robots cache
    robotsChecker.cleanupCache();

    // Cleanup throttling states
    requestThrottler.cleanup();

    // Cleanup takedown system
    takedownSystem.cleanup();

    // Cleanup provenance data
    await provenanceTracker.cleanup();

    // Cleanup request log (keep last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.requestLog = this.requestLog.filter(log => log.timestamp >= thirtyDaysAgo);
  }
}

// Export singleton instance
export const complianceService = ComplianceService.getInstance();