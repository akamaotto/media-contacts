/**
 * AI Search Monitoring Service
 * Specialized monitoring for AI search functionality including performance,
 * cost tracking, and quality metrics
 */

import { apiHealthMonitor } from './api-health-monitor';
import { performanceMonitor } from '../performance/performance-monitor';
import { costTracker } from '../security/cost-tracker';

export interface AISearchMetrics {
  // Performance metrics
  searchLatency: {
    p50: number;
    p95: number;
    p99: number;
    average: number;
  };
  
  // Quality metrics
  searchSuccessRate: number;
  resultRelevanceScore: number;
  userSatisfactionScore: number;
  zeroResultsRate: number;
  
  // Usage metrics
  searchesPerMinute: number;
  uniqueSearchers: number;
  repeatSearchRate: number;
  averageResultsPerSearch: number;
  
  // Cost metrics
  costPerSearch: number;
  totalCost: number;
  costByProvider: Record<string, number>;
  
  // Service-specific metrics
  providerMetrics: Record<string, {
    availability: number;
    averageResponseTime: number;
    errorRate: number;
    requestCount: number;
  }>;
  
  // Error analysis
  errorCategories: Record<string, number>;
  commonErrors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
}

export interface AISearchAlert {
  id: string;
  type: 'performance' | 'quality' | 'cost' | 'availability';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  recommendations: string[];
  affectedProviders?: string[];
}

export interface AISearchThresholds {
  performance: {
    maxLatencyP95: number; // milliseconds
    maxLatencyP99: number;
    minSuccessRate: number; // percentage
    maxZeroResultsRate: number; // percentage
  };
  
  quality: {
    minRelevanceScore: number; // 0-1 scale
    minUserSatisfaction: number; // 0-5 scale
    maxErrorRate: number; // percentage
  };
  
  cost: {
    maxCostPerSearch: number; // USD
    maxHourlyCost: number; // USD
    maxDailyCost: number; // USD
    costSpikeThreshold: number; // percentage increase
  };
  
  availability: {
    minProviderAvailability: number; // percentage
    maxProviderResponseTime: number; // milliseconds
    maxProviderErrorRate: number; // percentage
  };
}

export class AISearchMonitor {
  private static instance: AISearchMonitor;
  private metrics: AISearchMetrics;
  private thresholds: AISearchThresholds;
  private alerts: AISearchAlert[] = [];
  private alertCallbacks: Set<(alert: AISearchAlert) => void> = new Set();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private searchHistory: Array<{
    timestamp: Date;
    latency: number;
    success: boolean;
    provider: string;
    resultCount: number;
    cost: number;
    userId?: string;
  }> = [];

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.thresholds = this.initializeThresholds();
    this.startMonitoring();
  }

  static getInstance(): AISearchMonitor {
    if (!AISearchMonitor.instance) {
      AISearchMonitor.instance = new AISearchMonitor();
    }
    return AISearchMonitor.instance;
  }

  private initializeMetrics(): AISearchMetrics {
    return {
      searchLatency: { p50: 0, p95: 0, p99: 0, average: 0 },
      searchSuccessRate: 100,
      resultRelevanceScore: 0,
      userSatisfactionScore: 0,
      zeroResultsRate: 0,
      searchesPerMinute: 0,
      uniqueSearchers: 0,
      repeatSearchRate: 0,
      averageResultsPerSearch: 0,
      costPerSearch: 0,
      totalCost: 0,
      costByProvider: {},
      providerMetrics: {},
      errorCategories: {},
      commonErrors: []
    };
  }

  private initializeThresholds(): AISearchThresholds {
    return {
      performance: {
        maxLatencyP95: 25000, // 25 seconds
        maxLatencyP99: 30000, // 30 seconds
        minSuccessRate: 90, // 90%
        maxZeroResultsRate: 5 // 5%
      },
      quality: {
        minRelevanceScore: 0.7, // 0.7/1.0
        minUserSatisfaction: 4.0, // 4.0/5.0
        maxErrorRate: 5 // 5%
      },
      cost: {
        maxCostPerSearch: 0.10, // $0.10
        maxHourlyCost: 50, // $50 per hour
        maxDailyCost: 500, // $500 per day
        costSpikeThreshold: 150 // 150% increase
      },
      availability: {
        minProviderAvailability: 95, // 95%
        maxProviderResponseTime: 20000, // 20 seconds
        maxProviderErrorRate: 10 // 10%
      }
    };
  }

  /**
   * Record a search request for monitoring
   */
  recordSearch(data: {
    latency: number;
    success: boolean;
    provider: string;
    resultCount: number;
    cost: number;
    userId?: string;
    error?: string;
    relevanceScore?: number;
  }): void {
    const searchRecord = {
      timestamp: new Date(),
      ...data
    };

    this.searchHistory.push(searchRecord);
    
    // Keep only last 1000 searches
    if (this.searchHistory.length > 1000) {
      this.searchHistory = this.searchHistory.slice(-1000);
    }

    // Update metrics
    this.updateMetrics();
    
    // Check for alerts
    this.checkAlerts();

    console.log(`🔍 [AI-SEARCH-MONITOR] Search recorded: ${data.provider} - ${data.success ? 'SUCCESS' : 'FAILED'} (${data.latency}ms, $${data.cost.toFixed(4)})`);
  }

  /**
   * Update all metrics based on recent search history
   */
  private updateMetrics(): void {
    const recentSearches = this.searchHistory.slice(-100); // Last 100 searches
    
    if (recentSearches.length === 0) return;

    // Update latency metrics
    const latencies = recentSearches.map(s => s.latency).sort((a, b) => a - b);
    this.metrics.searchLatency = {
      p50: this.calculatePercentile(latencies, 50),
      p95: this.calculatePercentile(latencies, 95),
      p99: this.calculatePercentile(latencies, 99),
      average: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
    };

    // Update success rate
    const successfulSearches = recentSearches.filter(s => s.success).length;
    this.metrics.searchSuccessRate = (successfulSearches / recentSearches.length) * 100;

    // Update zero results rate
    const zeroResultsSearches = recentSearches.filter(s => s.resultCount === 0).length;
    this.metrics.zeroResultsRate = (zeroResultsSearches / recentSearches.length) * 100;

    // Update usage metrics
    this.updateUsageMetrics(recentSearches);

    // Update cost metrics
    this.updateCostMetrics(recentSearches);

    // Update provider metrics
    this.updateProviderMetrics(recentSearches);

    // Update error analysis
    this.updateErrorAnalysis(recentSearches);
  }

  private updateUsageMetrics(recentSearches: any[]): void {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentMinuteSearches = recentSearches.filter(s => s.timestamp >= oneMinuteAgo);
    
    this.metrics.searchesPerMinute = recentMinuteSearches.length;

    // Calculate unique searchers in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentHourSearches = this.searchHistory.filter(s => s.timestamp >= oneHourAgo);
    const uniqueUsers = new Set(recentHourSearches.filter(s => s.userId).map(s => s.userId));
    this.metrics.uniqueSearchers = uniqueUsers.size;

    // Calculate repeat search rate
    const userSearchCounts = new Map<string, number>();
    recentHourSearches.forEach(s => {
      if (s.userId) {
        userSearchCounts.set(s.userId, (userSearchCounts.get(s.userId) || 0) + 1);
      }
    });
    
    const repeatSearchers = Array.from(userSearchCounts.values()).filter(count => count > 1).length;
    this.metrics.repeatSearchRate = uniqueUsers.size > 0 ? (repeatSearchers / uniqueUsers.size) * 100 : 0;

    // Calculate average results per search
    this.metrics.averageResultsPerSearch = recentSearches.reduce((sum, s) => sum + s.resultCount, 0) / recentSearches.length;
  }

  private updateCostMetrics(recentSearches: any[]): void {
    const totalCost = recentSearches.reduce((sum, s) => sum + s.cost, 0);
    this.metrics.totalCost = totalCost;
    this.metrics.costPerSearch = totalCost / recentSearches.length;

    // Cost by provider
    const costByProvider: Record<string, number> = {};
    recentSearches.forEach(s => {
      costByProvider[s.provider] = (costByProvider[s.provider] || 0) + s.cost;
    });
    this.metrics.costByProvider = costByProvider;
  }

  private updateProviderMetrics(recentSearches: any[]): void {
    const providerMetrics: Record<string, any> = {};
    
    // Group searches by provider
    const searchesByProvider = recentSearches.reduce((acc, search) => {
      if (!acc[search.provider]) {
        acc[search.provider] = [];
      }
      acc[search.provider].push(search);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate metrics for each provider
    Object.entries(searchesByProvider).forEach(([provider, searches]) => {
      const successfulSearches = searches.filter(s => s.success).length;
      const totalLatency = searches.reduce((sum, s) => sum + s.latency, 0);
      
      providerMetrics[provider] = {
        availability: (successfulSearches / searches.length) * 100,
        averageResponseTime: totalLatency / searches.length,
        errorRate: ((searches.length - successfulSearches) / searches.length) * 100,
        requestCount: searches.length
      };
    });

    this.metrics.providerMetrics = providerMetrics;
  }

  private updateErrorAnalysis(recentSearches: any[]): void {
    const failedSearches = recentSearches.filter(s => !s.success && s.error);
    
    // Categorize errors
    const errorCategories: Record<string, number> = {};
    failedSearches.forEach(search => {
      const category = this.categorizeError(search.error);
      errorCategories[category] = (errorCategories[category] || 0) + 1;
    });
    this.metrics.errorCategories = errorCategories;

    // Find common errors
    const errorCounts: Record<string, number> = {};
    failedSearches.forEach(search => {
      errorCounts[search.error] = (errorCounts[search.error] || 0) + 1;
    });

    this.metrics.commonErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({
        error,
        count,
        percentage: (count / failedSearches.length) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 errors
  }

  private categorizeError(error: string): string {
    if (error.includes('timeout')) return 'timeout';
    if (error.includes('rate limit')) return 'rate_limit';
    if (error.includes('quota')) return 'quota_exceeded';
    if (error.includes('authentication')) return 'auth_error';
    if (error.includes('network')) return 'network_error';
    if (error.includes('parsing')) return 'parsing_error';
    if (error.includes('validation')) return 'validation_error';
    return 'unknown_error';
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    const alerts: AISearchAlert[] = [];

    // Performance alerts
    if (this.metrics.searchLatency.p95 > this.thresholds.performance.maxLatencyP95) {
      alerts.push(this.createAlert('performance', 'warning', 
        'High Search Latency',
        `P95 search latency (${this.metrics.searchLatency.p95}ms) exceeds threshold (${this.thresholds.performance.maxLatencyP95}ms)`,
        'searchLatencyP95',
        this.metrics.searchLatency.p95,
        this.thresholds.performance.maxLatencyP95,
        ['Check AI service provider performance', 'Consider switching to faster provider', 'Optimize search algorithms']
      ));
    }

    if (this.metrics.searchSuccessRate < this.thresholds.performance.minSuccessRate) {
      alerts.push(this.createAlert('performance', 'critical',
        'Low Search Success Rate',
        `Search success rate (${this.metrics.searchSuccessRate.toFixed(1)}%) below threshold (${this.thresholds.performance.minSuccessRate}%)`,
        'searchSuccessRate',
        this.metrics.searchSuccessRate,
        this.thresholds.performance.minSuccessRate,
        ['Investigate error patterns', 'Check AI service availability', 'Review recent code changes']
      ));
    }

    // Cost alerts
    if (this.metrics.costPerSearch > this.thresholds.cost.maxCostPerSearch) {
      alerts.push(this.createAlert('cost', 'warning',
        'High Cost Per Search',
        `Cost per search ($${this.metrics.costPerSearch.toFixed(4)}) exceeds threshold ($${this.thresholds.cost.maxCostPerSearch.toFixed(4)})`,
        'costPerSearch',
        this.metrics.costPerSearch,
        this.thresholds.cost.maxCostPerSearch,
        ['Optimize search queries', 'Implement better caching', 'Review provider pricing']
      ));
    }

    // Availability alerts
    Object.entries(this.metrics.providerMetrics).forEach(([provider, metrics]) => {
      if (metrics.availability < this.thresholds.availability.minProviderAvailability) {
        alerts.push(this.createAlert('availability', 'critical',
          `Low ${provider} Availability`,
          `${provider} availability (${metrics.availability.toFixed(1)}%) below threshold (${this.thresholds.availability.minProviderAvailability}%)`,
          'providerAvailability',
          metrics.availability,
          this.thresholds.availability.minProviderAvailability,
        ['Check provider status page', 'Switch to backup provider', 'Contact provider support'],
        [provider]
      ));
      }
    });

    // Send alerts
    alerts.forEach(alert => this.sendAlert(alert));
  }

  private createAlert(
    type: AISearchAlert['type'],
    severity: AISearchAlert['severity'],
    title: string,
    message: string,
    metric: string,
    value: number,
    threshold: number,
    recommendations: string[],
    affectedProviders?: string[]
  ): AISearchAlert {
    return {
      id: this.generateAlertId(),
      type,
      severity,
      title,
      message,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      recommendations,
      affectedProviders
    };
  }

  private sendAlert(alert: AISearchAlert): void {
    // Check if similar alert already exists (avoid spam)
    const existingAlert = this.alerts.find(a => 
      a.type === alert.type && 
      a.metric === alert.metric && 
      a.severity === alert.severity &&
      (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000 // 5 minutes
    );

    if (existingAlert) return;

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Notify subscribers
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });

    const emoji = this.getSeverityEmoji(alert.severity);
    console.log(`${emoji} [AI-SEARCH-MONITOR] Alert: ${alert.title} - ${alert.message}`);
  }

  private getSeverityEmoji(severity: AISearchAlert['severity']): string {
    switch (severity) {
      case 'emergency': return '🚨';
      case 'critical': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📊';
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      try {
        this.updateMetrics();
        this.checkAlerts();
      } catch (error) {
        console.error('AI Search monitoring error:', error);
      }
    }, 30000); // Every 30 seconds

    console.log('✅ [AI-SEARCH-MONITOR] AI Search monitoring started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 [AI-SEARCH-MONITOR] AI Search monitoring stopped');
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): AISearchMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current alerts
   */
  getAlerts(): AISearchAlert[] {
    return [...this.alerts];
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AISearchAlert['severity']): AISearchAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Subscribe to alerts
   */
  onAlert(callback: (alert: AISearchAlert) => void): () => void {
    this.alertCallbacks.add(callback);
    
    return () => {
      this.alertCallbacks.delete(callback);
    };
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds: Partial<AISearchThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 [AI-SEARCH-MONITOR] Thresholds updated');
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    metrics: AISearchMetrics;
    thresholds: AISearchThresholds;
    alerts: AISearchAlert[];
    summary: {
      overall: 'healthy' | 'degraded' | 'critical';
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

    const issues = this.alerts.map(alert => alert.title);
    const recommendations = this.alerts.flatMap(alert => alert.recommendations);

    return {
      metrics: this.metrics,
      thresholds: this.thresholds,
      alerts: this.alerts,
      summary: {
        overall,
        issues,
        recommendations
      }
    };
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.alerts = [];
    this.searchHistory = [];
    console.log('🔄 [AI-SEARCH-MONITOR] All metrics reset');
  }
}

// Export singleton instance
export const aiSearchMonitor = AISearchMonitor.getInstance();

// Export utility functions
export function recordAISearch(data: {
  latency: number;
  success: boolean;
  provider: string;
  resultCount: number;
  cost: number;
  userId?: string;
  error?: string;
  relevanceScore?: number;
}): void {
  aiSearchMonitor.recordSearch(data);
}

export function getAISearchMetrics(): AISearchMetrics {
  return aiSearchMonitor.getMetrics();
}

export function getAISearchAlerts(): AISearchAlert[] {
  return aiSearchMonitor.getAlerts();
}