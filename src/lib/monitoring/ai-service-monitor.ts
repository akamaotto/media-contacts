/**
 * AI Service Monitoring System
 * Detailed monitoring for all AI services (OpenAI, Anthropic, Exa, Firecrawl)
 */

export interface AIServiceMetrics {
  provider: string;
  service: string;
  availability: {
    status: 'online' | 'degraded' | 'offline';
    lastCheck: Date;
    uptime: number;
    downtime: number;
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
      average: number;
    };
  };
  performance: {
    requestsPerMinute: number;
    successRate: number;
    errorRate: number;
    timeoutRate: number;
    retryRate: number;
  };
  usage: {
    totalRequests: number;
    requestsToday: number;
    requestsThisHour: number;
    tokensUsed?: number;
    cost: number;
    costToday: number;
    quotaUsed?: number;
    quotaLimit?: number;
  };
  errors: {
    byType: Record<string, number>;
    byStatusCode: Record<number, number>;
    recentErrors: Array<{
      timestamp: Date;
      error: string;
      statusCode?: number;
      responseTime: number;
    }>;
  };
  quality: {
    averageRelevanceScore?: number;
    userSatisfactionScore?: number;
    resultQualityScore?: number;
  };
  limits: {
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    quotaRemaining?: number;
    quotaReset?: Date;
  };
}

export interface AIServiceAlert {
  id: string;
  provider: string;
  service: string;
  type: 'availability' | 'performance' | 'usage' | 'cost' | 'quota' | 'quality';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  recommendations: string[];
}

export interface AIServiceThresholds {
  availability: {
    minUptime: number; // percentage
    maxDowntime: number; // minutes per day
    maxResponseTime: number; // milliseconds
  };
  performance: {
    minSuccessRate: number; // percentage
    maxErrorRate: number; // percentage
    maxTimeoutRate: number; // percentage
  };
  usage: {
    maxDailyCost: number; // USD
    maxHourlyRequests: number;
    maxQuotaUsage: number; // percentage
  };
  quality: {
    minRelevanceScore: number; // 0-1 scale
    minUserSatisfaction: number; // 0-5 scale
  };
}

export interface AIServiceHealthCheck {
  provider: string;
  service: string;
  endpoint: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  timeout: number;
  expectedStatus: number;
  expectedResponse?: any;
}

/**
 * AI Service Monitor Class
 */
export class AIServiceMonitor {
  private static instance: AIServiceMonitor;
  private metrics: Map<string, AIServiceMetrics> = new Map();
  private thresholds: Map<string, AIServiceThresholds> = new Map();
  private alerts: AIServiceAlert[] = [];
  private healthChecks: Map<string, AIServiceHealthCheck> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private requestHistory: Array<{
    provider: string;
    service: string;
    timestamp: Date;
    success: boolean;
    responseTime: number;
    error?: string;
    statusCode?: number;
    tokensUsed?: number;
    cost: number;
  }> = [];

  private constructor() {
    this.initializeServices();
    this.initializeThresholds();
    this.initializeHealthChecks();
    this.startMonitoring();
  }

  static getInstance(): AIServiceMonitor {
    if (!AIServiceMonitor.instance) {
      AIServiceMonitor.instance = new AIServiceMonitor();
    }
    return AIServiceMonitor.instance;
  }

  /**
   * Initialize AI services to monitor
   */
  private initializeServices(): void {
    const services = [
      { provider: 'openai', service: 'chat-completion' },
      { provider: 'openai', service: 'embeddings' },
      { provider: 'anthropic', service: 'messages' },
      { provider: 'exa', service: 'search' },
      { provider: 'firecrawl', service: 'scrape' },
      { provider: 'firecrawl', service: 'crawl' }
    ];

    services.forEach(({ provider, service }) => {
      const key = `${provider}:${service}`;
      this.metrics.set(key, {
        provider,
        service,
        availability: {
          status: 'unknown',
          lastCheck: new Date(),
          uptime: 0,
          downtime: 0,
          responseTime: { p50: 0, p95: 0, p99: 0, average: 0 }
        },
        performance: {
          requestsPerMinute: 0,
          successRate: 100,
          errorRate: 0,
          timeoutRate: 0,
          retryRate: 0
        },
        usage: {
          totalRequests: 0,
          requestsToday: 0,
          requestsThisHour: 0,
          cost: 0,
          costToday: 0
        },
        errors: {
          byType: {},
          byStatusCode: {},
          recentErrors: []
        },
        quality: {
          averageRelevanceScore: 0,
          userSatisfactionScore: 0,
          resultQualityScore: 0
        },
        limits: {
          rateLimitRemaining: 0,
          quotaRemaining: 0
        }
      });
    });

    console.log(`✅ [AI-SERVICE-MONITOR] Initialized monitoring for ${services.length} AI services`);
  }

  /**
   * Initialize monitoring thresholds
   */
  private initializeThresholds(): void {
    const defaultThresholds: AIServiceThresholds = {
      availability: {
        minUptime: 99.5,
        maxDowntime: 5,
        maxResponseTime: 10000
      },
      performance: {
        minSuccessRate: 95,
        maxErrorRate: 5,
        maxTimeoutRate: 2
      },
      usage: {
        maxDailyCost: 100,
        maxHourlyRequests: 1000,
        maxQuotaUsage: 80
      },
      quality: {
        minRelevanceScore: 0.7,
        minUserSatisfaction: 3.5
      }
    };

    // Apply default thresholds to all services
    this.metrics.forEach((_, key) => {
      this.thresholds.set(key, { ...defaultThresholds });
    });

    // Service-specific threshold overrides
    this.thresholds.set('openai:chat-completion', {
      ...defaultThresholds,
      availability: {
        ...defaultThresholds.availability,
        maxResponseTime: 15000
      },
      usage: {
        ...defaultThresholds.usage,
        maxDailyCost: 200
      }
    });

    this.thresholds.set('anthropic:messages', {
      ...defaultThresholds,
      availability: {
        ...defaultThresholds.availability,
        maxResponseTime: 20000
      },
      usage: {
        ...defaultThresholds.usage,
        maxDailyCost: 150
      }
    });

    console.log('✅ [AI-SERVICE-MONITOR] Thresholds initialized');
  }

  /**
   * Initialize health checks
   */
  private initializeHealthChecks(): void {
    const healthChecks: AIServiceHealthCheck[] = [
      {
        provider: 'openai',
        service: 'chat-completion',
        endpoint: 'https://api.openai.com/v1/models',
        method: 'GET',
        headers: {},
        timeout: 10000,
        expectedStatus: 200
      },
      {
        provider: 'anthropic',
        service: 'messages',
        endpoint: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: {},
        body: {
          model: 'claude-3-haiku-20240307',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1
        },
        timeout: 15000,
        expectedStatus: 200
      },
      {
        provider: 'exa',
        service: 'search',
        endpoint: 'https://api.exa.ai/search',
        method: 'POST',
        headers: {},
        body: {
          query: 'test',
          numResults: 1
        },
        timeout: 10000,
        expectedStatus: 200
      },
      {
        provider: 'firecrawl',
        service: 'scrape',
        endpoint: 'https://api.firecrawl.dev/v1/scrape',
        method: 'POST',
        headers: {},
        body: {
          url: 'https://example.com'
        },
        timeout: 15000,
        expectedStatus: 200
      }
    ];

    healthChecks.forEach(check => {
      const key = `${check.provider}:${check.service}`;
      this.healthChecks.set(key, check);
    });

    console.log(`✅ [AI-SERVICE-MONITOR] Initialized ${healthChecks.length} health checks`);
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
        this.updateMetrics();
        this.checkAlerts();
      } catch (error) {
        console.error('AI service monitoring error:', error);
      }
    }, 60000); // Every minute

    console.log('✅ [AI-SERVICE-MONITOR] AI service monitoring started');
  }

  /**
   * Perform health checks on all services
   */
  private async performHealthChecks(): Promise<void> {
    for (const [key, healthCheck] of this.healthChecks.entries()) {
      try {
        const startTime = Date.now();
        
        // Add API key to headers if available
        const headers = { ...healthCheck.headers };
        if (healthCheck.provider === 'openai' && process.env.OPENAI_API_KEY) {
          headers['Authorization'] = `Bearer ${process.env.OPENAI_API_KEY}`;
        } else if (healthCheck.provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
          headers['x-api-key'] = process.env.ANTHROPIC_API_KEY;
        } else if (healthCheck.provider === 'exa' && process.env.EXA_API_KEY) {
          headers['Authorization'] = `Bearer ${process.env.EXA_API_KEY}`;
        } else if (healthCheck.provider === 'firecrawl' && process.env.FIRECRAWL_API_KEY) {
          headers['Authorization'] = `Bearer ${process.env.FIRECRAWL_API_KEY}`;
        }

        const response = await fetch(healthCheck.endpoint, {
          method: healthCheck.method,
          headers,
          body: healthCheck.body ? JSON.stringify(healthCheck.body) : undefined,
          signal: AbortSignal.timeout(healthCheck.timeout)
        });

        const responseTime = Date.now() - startTime;
        const success = response.status === healthCheck.expectedStatus;

        // Record health check result
        this.recordRequest({
          provider: healthCheck.provider,
          service: healthCheck.service,
          timestamp: new Date(),
          success,
          responseTime,
          statusCode: response.status,
          error: success ? undefined : `HTTP ${response.status}`,
          cost: 0 // Health checks are free
        });

        // Update availability metrics
        const metrics = this.metrics.get(key);
        if (metrics) {
          metrics.availability.lastCheck = new Date();
          metrics.availability.responseTime.average = responseTime;
          metrics.availability.status = success ? 'online' : 'offline';
        }

      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        // Record failed health check
        this.recordRequest({
          provider: healthCheck.provider,
          service: healthCheck.service,
          timestamp: new Date(),
          success: false,
          responseTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          cost: 0
        });

        // Update availability metrics
        const metrics = this.metrics.get(key);
        if (metrics) {
          metrics.availability.lastCheck = new Date();
          metrics.availability.status = 'offline';
        }
      }
    }
  }

  /**
   * Update all metrics
   */
  private updateMetrics(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    this.metrics.forEach((metrics, key) => {
      // Get recent requests for this service
      const [provider, service] = key.split(':');
      const recentRequests = this.requestHistory.filter(
        r => r.provider === provider && r.service === service
      );

      const requestsThisHour = recentRequests.filter(r => r.timestamp >= oneHourAgo);
      const requestsToday = recentRequests.filter(r => r.timestamp >= oneDayAgo);

      // Update performance metrics
      const successfulRequests = requestsThisHour.filter(r => r.success);
      const failedRequests = requestsThisHour.filter(r => !r.success);
      const timeoutRequests = requestsThisHour.filter(r => 
        r.error?.includes('timeout') || r.responseTime > 30000
      );

      metrics.performance.requestsPerMinute = requestsThisHour.length / 60;
      metrics.performance.successRate = requestsThisHour.length > 0 
        ? (successfulRequests.length / requestsThisHour.length) * 100 
        : 100;
      metrics.performance.errorRate = requestsThisHour.length > 0 
        ? (failedRequests.length / requestsThisHour.length) * 100 
        : 0;
      metrics.performance.timeoutRate = requestsThisHour.length > 0 
        ? (timeoutRequests.length / requestsThisHour.length) * 100 
        : 0;

      // Update usage metrics
      metrics.usage.requestsToday = requestsToday.length;
      metrics.usage.requestsThisHour = requestsThisHour.length;
      metrics.usage.costToday = requestsToday.reduce((sum, r) => sum + r.cost, 0);

      // Update response time metrics
      if (successfulRequests.length > 0) {
        const responseTimes = successfulRequests.map(r => r.responseTime).sort((a, b) => a - b);
        metrics.availability.responseTime.p50 = this.calculatePercentile(responseTimes, 50);
        metrics.availability.responseTime.p95 = this.calculatePercentile(responseTimes, 95);
        metrics.availability.responseTime.p99 = this.calculatePercentile(responseTimes, 99);
        metrics.availability.responseTime.average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      }

      // Update error metrics
      metrics.errors.byType = {};
      metrics.errors.byStatusCode = {};
      metrics.errors.recentErrors = failedRequests.slice(-10).map(r => ({
        timestamp: r.timestamp,
        error: r.error || 'Unknown error',
        statusCode: r.statusCode,
        responseTime: r.responseTime
      }));

      failedRequests.forEach(r => {
        const errorType = this.categorizeError(r.error || '');
        metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
        
        if (r.statusCode) {
          metrics.errors.byStatusCode[r.statusCode] = (metrics.errors.byStatusCode[r.statusCode] || 0) + 1;
        }
      });

      // Calculate uptime/downtime
      const totalChecks = requestsThisHour.length || 1;
      const successfulChecks = successfulRequests.length || 0;
      metrics.availability.uptime = (successfulChecks / totalChecks) * 100;
      metrics.availability.downtime = totalChecks - successfulChecks;
    });
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    const alerts: AIServiceAlert[] = [];

    this.metrics.forEach((metrics, key) => {
      const thresholds = this.thresholds.get(key);
      if (!thresholds) return;

      // Availability alerts
      if (metrics.availability.uptime < thresholds.availability.minUptime) {
        alerts.push(this.createAlert(
          metrics.provider,
          metrics.service,
          'availability',
          'critical',
          'Low Service Uptime',
          `${metrics.provider} ${metrics.service} uptime is ${metrics.availability.uptime.toFixed(1)}%`,
          'uptime',
          metrics.availability.uptime,
          thresholds.availability.minUptime,
          [
            'Check service status page',
            'Verify API keys and credentials',
            'Review network connectivity'
          ]
        ));
      }

      if (metrics.availability.responseTime.p95 > thresholds.availability.maxResponseTime) {
        alerts.push(this.createAlert(
          metrics.provider,
          metrics.service,
          'availability',
          'warning',
          'High Response Time',
          `${metrics.provider} ${metrics.service} P95 response time is ${metrics.availability.responseTime.p95}ms`,
          'response_time_p95',
          metrics.availability.responseTime.p95,
          thresholds.availability.maxResponseTime,
          [
            'Check service performance',
            'Consider switching to faster endpoint',
            'Review request complexity'
          ]
        ));
      }

      // Performance alerts
      if (metrics.performance.successRate < thresholds.performance.minSuccessRate) {
        alerts.push(this.createAlert(
          metrics.provider,
          metrics.service,
          'performance',
          'critical',
          'Low Success Rate',
          `${metrics.provider} ${metrics.service} success rate is ${metrics.performance.successRate.toFixed(1)}%`,
          'success_rate',
          metrics.performance.successRate,
          thresholds.performance.minSuccessRate,
          [
            'Review error patterns',
            'Check API quotas and limits',
            'Verify request format'
          ]
        ));
      }

      if (metrics.performance.errorRate > thresholds.performance.maxErrorRate) {
        alerts.push(this.createAlert(
          metrics.provider,
          metrics.service,
          'performance',
          'warning',
          'High Error Rate',
          `${metrics.provider} ${metrics.service} error rate is ${metrics.performance.errorRate.toFixed(1)}%`,
          'error_rate',
          metrics.performance.errorRate,
          thresholds.performance.maxErrorRate,
          [
            'Analyze recent errors',
            'Check service status',
            'Review recent changes'
          ]
        ));
      }

      // Usage alerts
      if (metrics.usage.costToday > thresholds.usage.maxDailyCost) {
        alerts.push(this.createAlert(
          metrics.provider,
          metrics.service,
          'cost',
          'critical',
          'Daily Cost Limit Exceeded',
          `${metrics.provider} ${metrics.service} daily cost is $${metrics.usage.costToday.toFixed(2)}`,
          'daily_cost',
          metrics.usage.costToday,
          thresholds.usage.maxDailyCost,
          [
            'Review usage patterns',
            'Implement cost controls',
            'Consider rate limiting'
          ]
        ));
      }

      if (metrics.usage.requestsThisHour > thresholds.usage.maxHourlyRequests) {
        alerts.push(this.createAlert(
          metrics.provider,
          metrics.service,
          'usage',
          'warning',
          'High Request Volume',
          `${metrics.provider} ${metrics.service} has ${metrics.usage.requestsThisHour} requests this hour`,
          'hourly_requests',
          metrics.usage.requestsThisHour,
          thresholds.usage.maxHourlyRequests,
          [
            'Monitor request patterns',
            'Implement caching',
            'Consider rate limiting'
          ]
        ));
      }

      // Quota alerts
      if (metrics.limits.quotaRemaining !== undefined && metrics.limits.quotaLimit) {
        const quotaUsage = ((metrics.limits.quotaLimit - metrics.limits.quotaRemaining) / metrics.limits.quotaLimit) * 100;
        if (quotaUsage > thresholds.usage.maxQuotaUsage) {
          alerts.push(this.createAlert(
            metrics.provider,
            metrics.service,
            'quota',
            'warning',
            'High Quota Usage',
            `${metrics.provider} ${metrics.service} quota usage is ${quotaUsage.toFixed(1)}%`,
            'quota_usage',
            quotaUsage,
            thresholds.usage.maxQuotaUsage,
            [
              'Monitor remaining quota',
              'Plan for quota reset',
              'Consider upgrading plan'
            ]
          ));
        }
      }
    });

    // Add new alerts to the list
    alerts.forEach(alert => {
      // Check if similar alert already exists
      const existingAlert = this.alerts.find(a => 
        a.provider === alert.provider && 
        a.service === alert.service &&
        a.type === alert.type &&
        (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000 // 5 minutes
      );

      if (!existingAlert) {
        this.alerts.push(alert);
        console.log(`🚨 [AI-SERVICE-MONITOR] Alert: ${alert.title} (${alert.provider}:${alert.service})`);
      }
    });

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Record a service request
   */
  recordRequest(data: {
    provider: string;
    service: string;
    timestamp: Date;
    success: boolean;
    responseTime: number;
    error?: string;
    statusCode?: number;
    tokensUsed?: number;
    cost: number;
  }): void {
    this.requestHistory.push(data);
    
    // Keep only last 10000 requests
    if (this.requestHistory.length > 10000) {
      this.requestHistory = this.requestHistory.slice(-10000);
    }

    // Update service metrics
    const key = `${data.provider}:${data.service}`;
    const metrics = this.metrics.get(key);
    
    if (metrics) {
      metrics.usage.totalRequests++;
      metrics.usage.cost += data.cost;
      
      if (data.tokensUsed) {
        metrics.usage.tokensUsed = (metrics.usage.tokensUsed || 0) + data.tokensUsed;
      }
    }
  }

  /**
   * Create an AI service alert
   */
  private createAlert(
    provider: string,
    service: string,
    type: AIServiceAlert['type'],
    severity: AIServiceAlert['severity'],
    title: string,
    message: string,
    metric: string,
    value: number,
    threshold: number,
    recommendations: string[]
  ): AIServiceAlert {
    return {
      id: `ai_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider,
      service,
      type,
      severity,
      title,
      message,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      recommendations
    };
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: string): string {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('rate limit')) return 'rate_limit';
    if (error.includes('quota')) return 'quota_exceeded';
    if (error.includes('authentication')) return 'auth_error';
    if (error.includes('network')) return 'network_error';
    if (error.includes('parsing')) return 'parsing_error';
    if (error.includes('validation')) return 'validation_error';
    if (error.includes('insufficient')) return 'insufficient_quota';
    return 'unknown_error';
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Get metrics for a specific service
   */
  getServiceMetrics(provider: string, service: string): AIServiceMetrics | undefined {
    return this.metrics.get(`${provider}:${service}`);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, AIServiceMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Get alerts for a specific service
   */
  getServiceAlerts(provider?: string, service?: string): AIServiceAlert[] {
    return this.alerts.filter(alert => {
      if (provider && alert.provider !== provider) return false;
      if (service && alert.service !== service) return false;
      return true;
    });
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AIServiceAlert['severity']): AIServiceAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Update service quality metrics
   */
  updateQualityMetrics(provider: string, service: string, metrics: {
    relevanceScore?: number;
    userSatisfaction?: number;
    resultQuality?: number;
  }): void {
    const serviceMetrics = this.metrics.get(`${provider}:${service}`);
    if (serviceMetrics) {
      if (metrics.relevanceScore !== undefined) {
        serviceMetrics.quality.averageRelevanceScore = metrics.relevanceScore;
      }
      if (metrics.userSatisfaction !== undefined) {
        serviceMetrics.quality.userSatisfactionScore = metrics.userSatisfaction;
      }
      if (metrics.resultQuality !== undefined) {
        serviceMetrics.quality.resultQualityScore = metrics.resultQuality;
      }
    }
  }

  /**
   * Update service limits
   */
  updateServiceLimits(provider: string, service: string, limits: {
    rateLimitRemaining?: number;
    rateLimitReset?: Date;
    quotaRemaining?: number;
    quotaReset?: Date;
  }): void {
    const serviceMetrics = this.metrics.get(`${provider}:${service}`);
    if (serviceMetrics) {
      serviceMetrics.limits = { ...serviceMetrics.limits, ...limits };
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    metrics: Map<string, AIServiceMetrics>;
    alerts: AIServiceAlert[];
    summary: {
      overall: 'healthy' | 'degraded' | 'critical';
      servicesByStatus: Record<string, string>;
      totalCost: number;
      totalRequests: number;
      averageResponseTime: number;
      issues: string[];
      recommendations: string[];
    };
  } {
    const criticalAlerts = this.getAlertsBySeverity('critical');
    const warningAlerts = this.getAlertsBySeverity('warning');
    
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      overall = 'critical';
    } else if (warningAlerts.length > 0) {
      overall = 'degraded';
    }

    const servicesByStatus: Record<string, string> = {};
    let totalCost = 0;
    let totalRequests = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    this.metrics.forEach((metrics, key) => {
      servicesByStatus[key] = metrics.availability.status;
      totalCost += metrics.usage.cost;
      totalRequests += metrics.usage.totalRequests;
      
      if (metrics.availability.responseTime.average > 0) {
        totalResponseTime += metrics.availability.responseTime.average;
        responseTimeCount++;
      }
    });

    const averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
    const issues = this.alerts.map(alert => alert.title);
    const recommendations = this.alerts.flatMap(alert => alert.recommendations);

    return {
      metrics: new Map(this.metrics),
      alerts: this.alerts,
      summary: {
        overall,
        servicesByStatus,
        totalCost,
        totalRequests,
        averageResponseTime,
        issues,
        recommendations
      }
    };
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 [AI-SERVICE-MONITOR] AI service monitoring stopped');
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.metrics.clear();
    this.alerts = [];
    this.requestHistory = [];
    this.initializeServices();
    console.log('🔄 [AI-SERVICE-MONITOR] All metrics reset');
  }
}

// Export singleton instance
export const aiServiceMonitor = AIServiceMonitor.getInstance();

// Export utility functions
export function recordAIServiceRequest(data: {
  provider: string;
  service: string;
  timestamp: Date;
  success: boolean;
  responseTime: number;
  error?: string;
  statusCode?: number;
  tokensUsed?: number;
  cost: number;
}): void {
  aiServiceMonitor.recordRequest(data);
}

export function getAIServiceMetrics(provider: string, service: string): AIServiceMetrics | undefined {
  return aiServiceMonitor.getServiceMetrics(provider, service);
}

export function getAllAIServiceMetrics(): Map<string, AIServiceMetrics> {
  return aiServiceMonitor.getAllMetrics();
}

export function getAIServiceAlerts(provider?: string, service?: string): AIServiceAlert[] {
  return aiServiceMonitor.getServiceAlerts(provider, service);
}

export function getAIServicePerformanceReport() {
  return aiServiceMonitor.getPerformanceReport();
}

export function updateAIServiceQualityMetrics(provider: string, service: string, metrics: {
  relevanceScore?: number;
  userSatisfaction?: number;
  resultQuality?: number;
}): void {
  aiServiceMonitor.updateQualityMetrics(provider, service, metrics);
}