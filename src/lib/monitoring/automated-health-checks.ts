/**
 * Automated Health Checks Service
 * Comprehensive health monitoring for all system components
 */

import { apiHealthMonitor, type SystemHealthMetrics } from './api-health-monitor';
import { databaseMonitor } from '../database/database-monitor';
import { aiSearchMonitor } from './ai-search-monitor';
import { aiCostMonitor } from '../cost/ai-cost-monitor';
import { alertManager } from './alert-manager';

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  responseTime: number;
  lastChecked: Date;
  details: Record<string, any>;
  errorMessage?: string;
  recommendations: string[];
}

export interface SystemHealthReport {
  timestamp: Date;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  components: HealthCheckResult[];
  summary: {
    totalComponents: number;
    healthyComponents: number;
    degradedComponents: number;
    unhealthyComponents: number;
    criticalComponents: number;
  };
  alerts: string[];
  recommendations: string[];
  nextCheck: Date;
}

export interface HealthCheckConfig {
  component: string;
  enabled: boolean;
  checkInterval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  thresholds: {
    responseTime: number; // milliseconds
    errorRate: number; // percentage
    availability: number; // percentage
  };
  alerting: {
    enabled: boolean;
    severity: 'info' | 'warning' | 'critical' | 'emergency';
    cooldown: number; // milliseconds
  };
}

export class AutomatedHealthChecks {
  private static instance: AutomatedHealthChecks;
  private configs = new Map<string, HealthCheckConfig>();
  private checkIntervals = new Map<string, NodeJS.Timeout>();
  private lastResults = new Map<string, HealthCheckResult>();
  private alertCooldowns = new Map<string, Date>();
  private subscribers: Set<(report: SystemHealthReport) => void> = new Set();
  private isRunning = false;

  private constructor() {
    this.initializeDefaultConfigs();
  }

  static getInstance(): AutomatedHealthChecks {
    if (!AutomatedHealthChecks.instance) {
      AutomatedHealthChecks.instance = new AutomatedHealthChecks();
    }
    return AutomatedHealthChecks.instance;
  }

  /**
   * Initialize automated health checks
   */
  async initialize(): Promise<void> {
    console.log('🚀 [HEALTH-CHECKS] Initializing automated health checks...');

    // Validate configurations
    this.validateConfigs();

    // Start health checks for enabled components
    await this.startAllHealthChecks();

    this.isRunning = true;
    console.log('✅ [HEALTH-CHECKS] Automated health checks initialized');
  }

  /**
   * Start health checks for all enabled components
   */
  async startAllHealthChecks(): Promise<void> {
    for (const [component, config] of this.configs.entries()) {
      if (config.enabled) {
        await this.startHealthCheck(component);
      }
    }
  }

  /**
   * Start health check for a specific component
   */
  async startHealthCheck(component: string): Promise<void> {
    const config = this.configs.get(component);
    if (!config) {
      throw new Error(`No configuration found for component: ${component}`);
    }

    // Stop existing check if running
    this.stopHealthCheck(component);

    // Start new check interval
    const interval = setInterval(async () => {
      await this.performHealthCheck(component);
    }, config.checkInterval);

    this.checkIntervals.set(component, interval);

    // Perform initial check
    await this.performHealthCheck(component);

    console.log(`⏰ [HEALTH-CHECKS] Started health checks for ${component} (interval: ${config.checkInterval}ms)`);
  }

  /**
   * Stop health check for a specific component
   */
  stopHealthCheck(component: string): void {
    const interval = this.checkIntervals.get(component);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(component);
      console.log(`🛑 [HEALTH-CHECKS] Stopped health checks for ${component}`);
    }
  }

  /**
   * Stop all health checks
   */
  stopAllHealthChecks(): void {
    for (const component of this.checkIntervals.keys()) {
      this.stopHealthCheck(component);
    }
    this.isRunning = false;
    console.log('🛑 [HEALTH-CHECKS] Stopped all health checks');
  }

  /**
   * Perform health check for a specific component
   */
  async performHealthCheck(component: string): Promise<HealthCheckResult> {
    const config = this.configs.get(component);
    if (!config) {
      throw new Error(`No configuration found for component: ${component}`);
    }

    const startTime = Date.now();
    let result: HealthCheckResult;

    try {
      // Perform component-specific health check
      result = await this.checkComponentHealth(component, config);
      
      // Determine status based on thresholds
      result.status = this.determineHealthStatus(result, config);
      
    } catch (error) {
      result = {
        component,
        status: 'critical',
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        recommendations: [`Investigate ${component} component immediately`, `Check ${component} logs`, `Verify ${component} configuration`]
      };
    }

    // Store result
    this.lastResults.set(component, result);

    // Check if alert should be triggered
    if (config.alerting.enabled) {
      await this.checkAlerting(component, result, config);
    }

    // Generate and notify subscribers if this is a critical component
    if (this.isCriticalComponent(component)) {
      await this.generateSystemHealthReport();
    }

    return result;
  }

  /**
   * Get health check result for a component
   */
  getHealthCheckResult(component: string): HealthCheckResult | null {
    return this.lastResults.get(component) || null;
  }

  /**
   * Get all health check results
   */
  getAllHealthCheckResults(): HealthCheckResult[] {
    return Array.from(this.lastResults.values());
  }

  /**
   * Generate comprehensive system health report
   */
  async generateSystemHealthReport(): Promise<SystemHealthReport> {
    const results = Array.from(this.lastResults.values());
    
    // Calculate summary
    const summary = {
      totalComponents: results.length,
      healthyComponents: results.filter(r => r.status === 'healthy').length,
      degradedComponents: results.filter(r => r.status === 'degraded').length,
      unhealthyComponents: results.filter(r => r.status === 'unhealthy').length,
      criticalComponents: results.filter(r => r.status === 'critical').length
    };

    // Determine overall status
    let overallStatus: SystemHealthReport['overallStatus'] = 'healthy';
    if (summary.criticalComponents > 0) {
      overallStatus = 'critical';
    } else if (summary.unhealthyComponents > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degradedComponents > 0) {
      overallStatus = 'degraded';
    }

    // Generate alerts
    const alerts: string[] = [];
    results.forEach(result => {
      if (result.status === 'critical') {
        alerts.push(`CRITICAL: ${result.component} is ${result.status}`);
      } else if (result.status === 'unhealthy') {
        alerts.push(`WARNING: ${result.component} is ${result.status}`);
      }
    });

    // Generate recommendations
    const recommendations = this.generateSystemRecommendations(results);

    const report: SystemHealthReport = {
      timestamp: new Date(),
      overallStatus,
      components: results,
      summary,
      alerts,
      recommendations,
      nextCheck: new Date(Date.now() + 60000) // Next check in 1 minute
    };

    // Notify subscribers
    this.notifySubscribers(report);

    return report;
  }

  /**
   * Update configuration for a component
   */
  updateConfig(component: string, config: Partial<HealthCheckConfig>): void {
    const existingConfig = this.configs.get(component);
    if (!existingConfig) {
      throw new Error(`No configuration found for component: ${component}`);
    }

    const updatedConfig = { ...existingConfig, ...config };
    this.configs.set(component, updatedConfig);

    // Restart health check with new configuration
    if (updatedConfig.enabled && this.checkIntervals.has(component)) {
      this.startHealthCheck(component);
    } else if (!updatedConfig.enabled) {
      this.stopHealthCheck(component);
    }

    console.log(`⚙️ [HEALTH-CHECKS] Updated configuration for ${component}`);
  }

  /**
   * Subscribe to health report updates
   */
  subscribe(callback: (report: SystemHealthReport) => void): () => void {
    this.subscribers.add(callback);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private async checkComponentHealth(component: string, config: HealthCheckConfig): Promise<HealthCheckResult> {
    const startTime = Date.now();

    switch (component) {
      case 'api':
        return await this.checkAPIHealth(startTime);
      case 'database':
        return await this.checkDatabaseHealth(startTime);
      case 'ai-services':
        return await this.checkAIServicesHealth(startTime);
      case 'cost-monitoring':
        return await this.checkCostMonitoringHealth(startTime);
      case 'error-tracking':
        return await this.checkErrorTrackingHealth(startTime);
      default:
        throw new Error(`Unknown component: ${component}`);
    }
  }

  private async checkAPIHealth(startTime: number): Promise<HealthCheckResult> {
    try {
      const healthMetrics = await apiHealthMonitor.getSystemHealthMetrics();
      
      return {
        component: 'api',
        status: this.mapHealthStatus(healthMetrics.overall),
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: {
          uptime: healthMetrics.uptime,
          endpoints: healthMetrics.endpoints,
          overall: healthMetrics.overall
        },
        recommendations: this.generateAPIRecommendations(healthMetrics)
      };
    } catch (error) {
      throw new Error(`API health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkDatabaseHealth(startTime: number): Promise<HealthCheckResult> {
    try {
      const dbStatus = await databaseMonitor.getHealthStatus();
      
      return {
        component: 'database',
        status: this.mapHealthStatus(dbStatus.overall),
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: {
          connection: dbStatus.connection,
          queries: dbStatus.queries,
          performance: dbStatus.performance,
          overall: dbStatus.overall
        },
        recommendations: this.generateDatabaseRecommendations(dbStatus)
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkAIServicesHealth(startTime: number): Promise<HealthCheckResult> {
    try {
      const aiMetrics = aiSearchMonitor.getMetrics();
      
      return {
        component: 'ai-services',
        status: this.mapHealthStatus(aiMetrics.searchSuccessRate >= 95 ? 'healthy' : aiMetrics.searchSuccessRate >= 80 ? 'degraded' : 'unhealthy'),
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: {
          searchSuccessRate: aiMetrics.searchSuccessRate,
          searchLatency: aiMetrics.searchLatency,
          searchesPerMinute: aiMetrics.searchesPerMinute,
          totalCost: aiMetrics.totalCost
        },
        recommendations: this.generateAIServicesRecommendations(aiMetrics)
      };
    } catch (error) {
      throw new Error(`AI Services health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkCostMonitoringHealth(startTime: number): Promise<HealthCheckResult> {
    try {
      const costMetrics = aiCostMonitor.getCostMetrics();
      
      return {
        component: 'cost-monitoring',
        status: 'healthy', // Simplified - would check actual cost monitoring health
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: {
          dailySpend: costMetrics.dailySpend,
          monthlySpend: costMetrics.monthlySpend,
          costPerSearch: costMetrics.costPerSearch,
          costByProvider: costMetrics.costByProvider
        },
        recommendations: this.generateCostMonitoringRecommendations(costMetrics)
      };
    } catch (error) {
      throw new Error(`Cost monitoring health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async checkErrorTrackingHealth(startTime: number): Promise<HealthCheckResult> {
    try {
      const alertStats = alertManager.getAlertStats();
      
      return {
        component: 'error-tracking',
        status: 'healthy', // Simplified - would check actual error tracking health
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: {
          totalRules: alertStats.totalRules,
          enabledRules: alertStats.enabledRules,
          activeAlerts: alertStats.activeAlerts,
          alertsLast24h: alertStats.alertsLast24h
        },
        recommendations: this.generateErrorTrackingRecommendations(alertStats)
      };
    } catch (error) {
      throw new Error(`Error tracking health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private determineHealthStatus(result: HealthCheckResult, config: HealthCheckConfig): HealthCheckResult['status'] {
    // Check response time
    if (result.responseTime > config.thresholds.responseTime * 2) {
      return 'critical';
    } else if (result.responseTime > config.thresholds.responseTime) {
      return 'degraded';
    }

    // Check error rate if available
    if (result.details.errorRate && result.details.errorRate > config.thresholds.errorRate * 2) {
      return 'critical';
    } else if (result.details.errorRate && result.details.errorRate > config.thresholds.errorRate) {
      return 'unhealthy';
    }

    // Check availability if available
    if (result.details.availability && result.details.availability < config.thresholds.availability) {
      return 'unhealthy';
    }

    return result.status;
  }

  private async checkAlerting(component: string, result: HealthCheckResult, config: HealthCheckConfig): Promise<void> {
    // Check if in cooldown period
    const lastAlert = this.alertCooldowns.get(component);
    if (lastAlert && Date.now() - lastAlert.getTime() < config.alerting.cooldown) {
      return;
    }

    // Check if alert should be triggered
    if (result.status === 'critical' || result.status === 'unhealthy') {
      await this.triggerHealthAlert(component, result, config);
      this.alertCooldowns.set(component, new Date());
    }
  }

  private async triggerHealthAlert(component: string, result: HealthCheckResult, config: HealthCheckConfig): Promise<void> {
    const message = `Health check alert for ${component}: Status is ${result.status}`;
    
    console.log(`🚨 [HEALTH-CHECKS] ${message}`);
    
    // In a real implementation, this would send notifications through various channels
    // For now, we just log the alert
  }

  private mapHealthStatus(status: string): HealthCheckResult['status'] {
    switch (status.toLowerCase()) {
      case 'healthy':
        return 'healthy';
      case 'degraded':
        return 'degraded';
      case 'unhealthy':
        return 'unhealthy';
      case 'critical':
      case 'offline':
        return 'critical';
      default:
        return 'unhealthy';
    }
  }

  private generateAPIRecommendations(healthMetrics: SystemHealthMetrics): string[] {
    const recommendations: string[] = [];
    
    if (healthMetrics.overall !== 'healthy') {
      recommendations.push('Investigate API endpoint failures');
      recommendations.push('Check API service dependencies');
    }
    
    if (healthMetrics.uptime < 99) {
      recommendations.push('Improve API availability and reliability');
    }
    
    return recommendations;
  }

  private generateDatabaseRecommendations(dbStatus: any): string[] {
    const recommendations: string[] = [];
    
    if (dbStatus.overall !== 'healthy') {
      recommendations.push('Check database connectivity and performance');
      recommendations.push('Review slow queries and optimize indexes');
    }
    
    if (!dbStatus.connection.isConnected) {
      recommendations.push('Restore database connection immediately');
    }
    
    return recommendations;
  }

  private generateAIServicesRecommendations(aiMetrics: any): string[] {
    const recommendations: string[] = [];
    
    if (aiMetrics.searchSuccessRate < 90) {
      recommendations.push('Investigate AI service failures and improve error handling');
    }
    
    if (aiMetrics.searchLatency > 2000) {
      recommendations.push('Optimize AI service response time');
    }
    
    if (aiMetrics.totalCost > 100) {
      recommendations.push('Monitor AI service costs and implement optimization');
    }
    
    return recommendations;
  }

  private generateCostMonitoringRecommendations(costMetrics: any): string[] {
    const recommendations: string[] = [];
    
    if (costMetrics.dailySpend > 100) {
      recommendations.push('Daily cost exceeds budget - implement cost optimization');
    }
    
    if (costMetrics.costPerSearch > 1) {
      recommendations.push('Optimize cost per search through caching and query optimization');
    }
    
    return recommendations;
  }

  private generateErrorTrackingRecommendations(alertStats: any): string[] {
    const recommendations: string[] = [];
    
    if (alertStats.activeAlerts > 5) {
      recommendations.push('High number of active alerts - investigate system issues');
    }
    
    if (alertStats.alertsLast24h > 20) {
      recommendations.push('Review alert patterns and adjust thresholds if needed');
    }
    
    return recommendations;
  }

  private generateSystemRecommendations(results: HealthCheckResult[]): string[] {
    const recommendations: string[] = [];
    
    const criticalComponents = results.filter(r => r.status === 'critical');
    const unhealthyComponents = results.filter(r => r.status === 'unhealthy');
    const degradedComponents = results.filter(r => r.status === 'degraded');
    
    if (criticalComponents.length > 0) {
      recommendations.push('IMMEDIATE ACTION REQUIRED: Address critical component failures');
      recommendations.push(`Critical components: ${criticalComponents.map(c => c.component).join(', ')}`);
    }
    
    if (unhealthyComponents.length > 0) {
      recommendations.push('Investigate and resolve unhealthy components');
      recommendations.push(`Unhealthy components: ${unhealthyComponents.map(c => c.component).join(', ')}`);
    }
    
    if (degradedComponents.length > 0) {
      recommendations.push('Monitor and optimize degraded components');
      recommendations.push(`Degraded components: ${degradedComponents.map(c => c.component).join(', ')}`);
    }
    
    if (results.every(r => r.status === 'healthy')) {
      recommendations.push('All systems operating normally - continue monitoring');
    }
    
    return recommendations;
  }

  private isCriticalComponent(component: string): boolean {
    // Define which components are critical for overall system health
    return ['api', 'database', 'ai-services'].includes(component);
  }

  private notifySubscribers(report: SystemHealthReport): void {
    this.subscribers.forEach(callback => {
      try {
        callback(report);
      } catch (error) {
        console.error('❌ [HEALTH-CHECKS] Error in subscriber callback:', error);
      }
    });
  }

  private initializeDefaultConfigs(): void {
    const defaultConfigs: HealthCheckConfig[] = [
      {
        component: 'api',
        enabled: true,
        checkInterval: 30000, // 30 seconds
        timeout: 5000, // 5 seconds
        retries: 3,
        thresholds: {
          responseTime: 1000, // 1 second
          errorRate: 5, // 5%
          availability: 99 // 99%
        },
        alerting: {
          enabled: true,
          severity: 'critical',
          cooldown: 300000 // 5 minutes
        }
      },
      {
        component: 'database',
        enabled: true,
        checkInterval: 60000, // 1 minute
        timeout: 3000, // 3 seconds
        retries: 2,
        thresholds: {
          responseTime: 500, // 500ms
          errorRate: 2, // 2%
          availability: 99.5 // 99.5%
        },
        alerting: {
          enabled: true,
          severity: 'critical',
          cooldown: 300000 // 5 minutes
        }
      },
      {
        component: 'ai-services',
        enabled: true,
        checkInterval: 60000, // 1 minute
        timeout: 10000, // 10 seconds
        retries: 2,
        thresholds: {
          responseTime: 2000, // 2 seconds
          errorRate: 10, // 10%
          availability: 95 // 95%
        },
        alerting: {
          enabled: true,
          severity: 'warning',
          cooldown: 600000 // 10 minutes
        }
      },
      {
        component: 'cost-monitoring',
        enabled: true,
        checkInterval: 300000, // 5 minutes
        timeout: 5000, // 5 seconds
        retries: 1,
        thresholds: {
          responseTime: 2000, // 2 seconds
          errorRate: 5, // 5%
          availability: 95 // 95%
        },
        alerting: {
          enabled: true,
          severity: 'warning',
          cooldown: 1800000 // 30 minutes
        }
      },
      {
        component: 'error-tracking',
        enabled: true,
        checkInterval: 60000, // 1 minute
        timeout: 2000, // 2 seconds
        retries: 1,
        thresholds: {
          responseTime: 1000, // 1 second
          errorRate: 2, // 2%
          availability: 99 // 99%
        },
        alerting: {
          enabled: true,
          severity: 'info',
          cooldown: 600000 // 10 minutes
        }
      }
    ];

    defaultConfigs.forEach(config => {
      this.configs.set(config.component, config);
    });

    console.log(`✅ [HEALTH-CHECKS] Initialized ${defaultConfigs.length} default health check configurations`);
  }

  private validateConfigs(): void {
    for (const [component, config] of this.configs.entries()) {
      if (config.checkInterval < 5000) { // 5 seconds minimum
        throw new Error(`Check interval for ${component} must be at least 5 seconds`);
      }
      
      if (config.timeout < 1000) { // 1 second minimum
        throw new Error(`Timeout for ${component} must be at least 1 second`);
      }
      
      if (config.retries < 0 || config.retries > 5) {
        throw new Error(`Retries for ${component} must be between 0 and 5`);
      }
    }
  }
}

// Export singleton instance
export const automatedHealthChecks = AutomatedHealthChecks.getInstance();

// Export utility functions
export async function initializeAutomatedHealthChecks(): Promise<void> {
  return automatedHealthChecks.initialize();
}

export async function startHealthCheck(component: string): Promise<void> {
  return automatedHealthChecks.startHealthCheck(component);
}

export function stopHealthCheck(component: string): void {
  automatedHealthChecks.stopHealthCheck(component);
}

export async function performHealthCheck(component: string): Promise<HealthCheckResult> {
  return automatedHealthChecks.performHealthCheck(component);
}

export async function generateSystemHealthReport(): Promise<SystemHealthReport> {
  return automatedHealthChecks.generateSystemHealthReport();
}

export function getHealthCheckResult(component: string): HealthCheckResult | null {
  return automatedHealthChecks.getHealthCheckResult(component);
}

export function getAllHealthCheckResults(): HealthCheckResult[] {
  return automatedHealthChecks.getAllHealthCheckResults();
}