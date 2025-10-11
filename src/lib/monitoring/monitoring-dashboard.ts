/**
 * Monitoring Dashboard System
 * Provides real-time visualization of monitoring metrics and alerts
 */

import { aiSearchMonitor } from './ai-search-monitor';
import { alertManager } from './alert-manager';
import { alertConfigManager, type MonitoringDashboard, type AlertRule } from './alert-config';
import { apiHealthMonitor } from './api-health-monitor';

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert' | 'status' | 'gauge' | 'progress';
  title: string;
  query: string;
  refreshInterval: number;
  config: Record<string, any>;
  data?: any;
  lastUpdated?: Date;
  error?: string;
}

export interface DashboardData {
  timestamp: Date;
  metrics: {
    performance: any;
    usage: any;
    costs: any;
    errors: any;
    userExperience: any;
    business: any;
  };
  alerts: any[];
  systemHealth: any;
}

export interface ChartDataPoint {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
  }>;
}

/**
 * Monitoring Dashboard Class
 */
export class MonitoringDashboard {
  private static instance: MonitoringDashboard;
  private dashboards: Map<string, MonitoringDashboard> = new Map();
  private widgetData: Map<string, any> = new Map();
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();
  private subscribers: Set<(dashboardId: string, data: DashboardData) => void> = new Set();

  private constructor() {
    this.initializeDefaultDashboards();
  }

  static getInstance(): MonitoringDashboard {
    if (!MonitoringDashboard.instance) {
      MonitoringDashboard.instance = new MonitoringDashboard();
    }
    return MonitoringDashboard.instance;
  }

  /**
   * Initialize default dashboards
   */
  private initializeDefaultDashboards(): void {
    const config = alertConfigManager.getConfiguration();
    
    config.dashboards.forEach(dashboard => {
      this.dashboards.set(dashboard.id, dashboard);
    });
    
    console.log(`✅ [MONITORING-DASHBOARD] Initialized ${config.dashboards.length} dashboards`);
  }

  /**
   * Get dashboard by ID
   */
  getDashboard(dashboardId: string): MonitoringDashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  /**
   * Get all dashboards
   */
  getAllDashboards(): MonitoringDashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Add dashboard
   */
  addDashboard(dashboard: MonitoringDashboard): void {
    this.dashboards.set(dashboard.id, dashboard);
    this.startDashboardRefresh(dashboard.id);
  }

  /**
   * Update dashboard
   */
  updateDashboard(dashboardId: string, updates: Partial<MonitoringDashboard>): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    const updatedDashboard = { ...dashboard, ...updates };
    this.dashboards.set(dashboardId, updatedDashboard);
    
    // Restart refresh with new configuration
    this.stopDashboardRefresh(dashboardId);
    this.startDashboardRefresh(dashboardId);
    
    return true;
  }

  /**
   * Delete dashboard
   */
  deleteDashboard(dashboardId: string): boolean {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return false;

    this.stopDashboardRefresh(dashboardId);
    this.dashboards.delete(dashboardId);
    return true;
  }

  /**
   * Get widget data
   */
  async getWidgetData(dashboardId: string, widgetId: string): Promise<any> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const widget = dashboard.widgets.find(w => w.id === widgetId);
    if (!widget) return null;

    return this.fetchWidgetData(widget);
  }

  /**
   * Get all dashboard data
   */
  async getDashboardData(dashboardId: string): Promise<DashboardData | null> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const data: DashboardData = {
      timestamp: new Date(),
      metrics: {
        performance: await this.getPerformanceMetrics(),
        usage: await this.getUsageMetrics(),
        costs: await this.getCostMetrics(),
        errors: await this.getErrorMetrics(),
        userExperience: await this.getUserExperienceMetrics(),
        business: await this.getBusinessMetrics()
      },
      alerts: await this.getActiveAlerts(),
      systemHealth: await this.getSystemHealth()
    };

    return data;
  }

  /**
   * Start refreshing dashboard widgets
   */
  startDashboardRefresh(dashboardId: string): void {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return;

    // Stop existing refresh
    this.stopDashboardRefresh(dashboardId);

    // Start new refresh interval
    const interval = setInterval(async () => {
      await this.refreshDashboard(dashboardId);
    }, dashboard.refreshInterval * 1000);

    this.refreshIntervals.set(dashboardId, interval);
    
    // Initial refresh
    this.refreshDashboard(dashboardId);
    
    console.log(`⏰ [MONITORING-DASHBOARD] Started refresh for dashboard: ${dashboardId} (${dashboard.refreshInterval}s)`);
  }

  /**
   * Stop refreshing dashboard
   */
  stopDashboardRefresh(dashboardId: string): void {
    const interval = this.refreshIntervals.get(dashboardId);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(dashboardId);
      console.log(`🛑 [MONITORING-DASHBOARD] Stopped refresh for dashboard: ${dashboardId}`);
    }
  }

  /**
   * Refresh dashboard widgets
   */
  private async refreshDashboard(dashboardId: string): Promise<void> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return;

    for (const widget of dashboard.widgets) {
      try {
        const data = await this.fetchWidgetData(widget);
        this.widgetData.set(`${dashboardId}:${widget.id}`, {
          data,
          lastUpdated: new Date(),
          error: null
        });
      } catch (error) {
        console.error(`❌ [MONITORING-DASHBOARD] Error refreshing widget ${widget.id}:`, error);
        this.widgetData.set(`${dashboardId}:${widget.id}`, {
          data: null,
          lastUpdated: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Notify subscribers
    const dashboardData = await this.getDashboardData(dashboardId);
    if (dashboardData) {
      this.subscribers.forEach(callback => {
        try {
          callback(dashboardId, dashboardData);
        } catch (error) {
          console.error('❌ [MONITORING-DASHBOARD] Error in subscriber callback:', error);
        }
      });
    }
  }

  /**
   * Fetch data for a specific widget
   */
  private async fetchWidgetData(widget: DashboardWidget): Promise<any> {
    switch (widget.query) {
      case 'overall_system_health':
        return this.getSystemHealth();
      
      case 'api_response_time_timeseries':
        return this.getResponseTimeChartData(widget.config?.timeRange || '1h');
      
      case 'error_rate_timeseries':
        return this.getErrorRateChartData(widget.config?.timeRange || '1h');
      
      case 'daily_cost_total':
        return this.getDailyCostTotal();
      
      case 'active_alerts_list':
        return this.getActiveAlertsList(widget.config?.groupBy || 'severity');
      
      case 'search_performance_table':
        return this.getSearchPerformanceTable();
      
      case 'ai_search_metrics':
        return this.getAISearchMetrics();
      
      case 'cost_by_provider':
        return this.getCostByProviderChart();
      
      case 'user_satisfaction_trend':
        return this.getUserSatisfactionTrend();
      
      case 'search_success_rate':
        return this.getSearchSuccessRate();
      
      case 'system_resources':
        return this.getSystemResources();
      
      default:
        return null;
    }
  }

  /**
   * Get system health
   */
  private async getSystemHealth(): Promise<any> {
    const healthMetrics = await apiHealthMonitor.getSystemHealthMetrics();
    const aiMetrics = aiSearchMonitor.getMetrics();
    
    return {
      overall: healthMetrics.overall,
      components: {
        api: healthMetrics.overall,
        database: healthMetrics.database.status,
        aiServices: aiMetrics.searchSuccessRate >= 90 ? 'healthy' : 'degraded',
        systemResources: 'healthy' // Simplified
      },
      uptime: healthMetrics.uptime,
      lastCheck: new Date()
    };
  }

  /**
   * Get response time chart data
   */
  private async getResponseTimeChartData(timeRange: string): Promise<ChartData> {
    const metrics = aiSearchMonitor.getMetrics();
    const now = new Date();
    const timePoints = this.getTimePoints(timeRange);
    
    // Generate sample data for demonstration
    const data = timePoints.map((time, index) => {
      const baseValue = metrics.searchLatency.p95;
      const variation = Math.sin(index * 0.5) * baseValue * 0.2;
      return baseValue + variation;
    });
    
    return {
      labels: timePoints.map(time => time.toLocaleTimeString()),
      datasets: [{
        label: 'Response Time (ms)',
        data,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true
      }]
    };
  }

  /**
   * Get error rate chart data
   */
  private async getErrorRateChartData(timeRange: string): Promise<ChartData> {
    const metrics = aiSearchMonitor.getMetrics();
    const now = new Date();
    const timePoints = this.getTimePoints(timeRange);
    
    // Generate sample data for demonstration
    const data = timePoints.map((time, index) => {
      const baseErrorRate = 100 - metrics.searchSuccessRate;
      const variation = Math.sin(index * 0.3) * baseErrorRate * 0.5;
      return Math.max(0, baseErrorRate + variation);
    });
    
    return {
      labels: timePoints.map(time => time.toLocaleTimeString()),
      datasets: [{
        label: 'Error Rate (%)',
        data,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: true
      }]
    };
  }

  /**
   * Get daily cost total
   */
  private async getDailyCostTotal(): Promise<any> {
    const metrics = aiSearchMonitor.getMetrics();
    return {
      value: metrics.totalCost,
      formatted: `$${metrics.totalCost.toFixed(2)}`,
      trend: 'up', // Simplified
      trendPercent: 5.2 // Simplified
    };
  }

  /**
   * Get active alerts list
   */
  private async getActiveAlertsList(groupBy: string): Promise<any[]> {
    const alerts = alertManager.getActiveAlerts();
    
    if (groupBy === 'severity') {
      const grouped = alerts.reduce((acc, alert) => {
        if (!acc[alert.severity]) {
          acc[alert.severity] = [];
        }
        acc[alert.severity].push(alert);
        return acc;
      }, {} as Record<string, any[]>);
      
      return Object.entries(grouped).map(([severity, alertList]) => ({
        group: severity,
        count: alertList.length,
        alerts: alertList.slice(0, 5) // Limit to 5 per group
      }));
    }
    
    return alerts.slice(0, 10); // Limit to 10 total
  }

  /**
   * Get search performance table
   */
  private async getSearchPerformanceTable(): Promise<any[]> {
    // Generate sample data for demonstration
    const data = [];
    const now = new Date();
    
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000); // 5-minute intervals
      data.push({
        timestamp: timestamp.toISOString(),
        total_searches: Math.floor(Math.random() * 50) + 10,
        success_rate: 85 + Math.random() * 15,
        avg_response_time: 1000 + Math.random() * 2000,
        cost_per_search: 0.01 + Math.random() * 0.05
      });
    }
    
    return data.reverse();
  }

  /**
   * Get AI search metrics
   */
  private async getAISearchMetrics(): Promise<any> {
    const metrics = aiSearchMonitor.getMetrics();
    
    return {
      searchLatency: metrics.searchLatency,
      successRate: metrics.searchSuccessRate,
      searchesPerMinute: metrics.searchesPerMinute,
      averageResultsPerSearch: metrics.averageResultsPerSearch,
      costPerSearch: metrics.costPerSearch,
      providerMetrics: metrics.providerMetrics
    };
  }

  /**
   * Get cost by provider chart
   */
  private async getCostByProviderChart(): Promise<ChartData> {
    const metrics = aiSearchMonitor.getMetrics();
    const providers = Object.keys(metrics.costByProvider);
    
    return {
      labels: providers,
      datasets: [{
        label: 'Cost by Provider ($)',
        data: providers.map(provider => metrics.costByProvider[provider]),
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 205, 86, 0.2)',
          'rgba(75, 192, 192, 0.2)'
        ],
        borderColor: [
          'rgb(255, 99, 132)',
          'rgb(54, 162, 235)',
          'rgb(255, 205, 86)',
          'rgb(75, 192, 192)'
        ],
        borderWidth: 1
      }]
    };
  }

  /**
   * Get user satisfaction trend
   */
  private async getUserSatisfactionTrend(): Promise<ChartData> {
    // Generate sample data for demonstration
    const timePoints = this.getTimePoints('7d');
    const data = timePoints.map((time, index) => {
      return 4.0 + Math.sin(index * 0.2) * 0.5; // Rating between 3.5 and 4.5
    });
    
    return {
      labels: timePoints.map(time => time.toLocaleDateString()),
      datasets: [{
        label: 'User Satisfaction (1-5)',
        data,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true
      }]
    };
  }

  /**
   * Get search success rate
   */
  private async getSearchSuccessRate(): Promise<any> {
    const metrics = aiSearchMonitor.getMetrics();
    
    return {
      value: metrics.searchSuccessRate,
      formatted: `${metrics.searchSuccessRate.toFixed(1)}%`,
      status: metrics.searchSuccessRate >= 95 ? 'good' : metrics.searchSuccessRate >= 85 ? 'warning' : 'critical'
    };
  }

  /**
   * Get system resources
   */
  private async getSystemResources(): Promise<any> {
    // Generate sample data for demonstration
    return {
      memory: {
        used: 65,
        total: 100,
        unit: '%'
      },
      cpu: {
        used: 45,
        total: 100,
        unit: '%'
      },
      disk: {
        used: 72,
        total: 100,
        unit: '%'
      },
      network: {
        incoming: 1024 * 1024, // 1MB/s
        outgoing: 512 * 1024   // 512KB/s
      }
    };
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<any> {
    const metrics = aiSearchMonitor.getMetrics();
    
    return {
      responseTime: metrics.searchLatency,
      throughput: {
        requestsPerMinute: metrics.searchesPerMinute,
        requestsPerHour: metrics.searchesPerMinute * 60
      },
      availability: 99.9, // Simplified
      errorRate: 100 - metrics.searchSuccessRate
    };
  }

  /**
   * Get usage metrics
   */
  private async getUsageMetrics(): Promise<any> {
    const metrics = aiSearchMonitor.getMetrics();
    
    return {
      searchesPerMinute: metrics.searchesPerMinute,
      uniqueSearchers: metrics.uniqueSearchers,
      repeatSearchRate: metrics.repeatSearchRate,
      averageResultsPerSearch: metrics.averageResultsPerSearch
    };
  }

  /**
   * Get cost metrics
   */
  private async getCostMetrics(): Promise<any> {
    const metrics = aiSearchMonitor.getMetrics();
    
    return {
      totalCost: metrics.totalCost,
      costPerSearch: metrics.costPerSearch,
      costByProvider: metrics.costByProvider,
      dailyForecast: metrics.totalCost * 1.1 // Simplified forecast
    };
  }

  /**
   * Get error metrics
   */
  private async getErrorMetrics(): Promise<any> {
    const metrics = aiSearchMonitor.getMetrics();
    
    return {
      errorCategories: metrics.errorCategories,
      commonErrors: metrics.commonErrors.slice(0, 5),
      errorRate: 100 - metrics.searchSuccessRate
    };
  }

  /**
   * Get user experience metrics
   */
  private async getUserExperienceMetrics(): Promise<any> {
    // Generate sample data for demonstration
    return {
      satisfactionScore: 4.2,
      abandonmentRate: 15.5,
      averageSessionDuration: 300, // seconds
      featureAdoption: {
        'ai-search': 85,
        'advanced-filters': 45,
        'export-results': 30
      }
    };
  }

  /**
   * Get business metrics
   */
  private async getBusinessMetrics(): Promise<any> {
    // Generate sample data for demonstration
    return {
      productivityGain: 25.5, // percentage
      timeSaved: 120, // hours
      costSavings: 5000, // USD
      roi: 2.5 // ratio
    };
  }

  /**
   * Get active alerts
   */
  private async getActiveAlerts(): Promise<any[]> {
    return alertManager.getActiveAlerts();
  }

  /**
   * Get time points for chart data
   */
  private getTimePoints(timeRange: string): Date[] {
    const now = new Date();
    const points: Date[] = [];
    
    let intervalMs: number;
    let pointCount: number;
    
    switch (timeRange) {
      case '1h':
        intervalMs = 5 * 60 * 1000; // 5 minutes
        pointCount = 12;
        break;
      case '24h':
        intervalMs = 60 * 60 * 1000; // 1 hour
        pointCount = 24;
        break;
      case '7d':
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        pointCount = 7;
        break;
      default:
        intervalMs = 5 * 60 * 1000; // 5 minutes
        pointCount = 12;
    }
    
    for (let i = pointCount - 1; i >= 0; i--) {
      points.push(new Date(now.getTime() - i * intervalMs));
    }
    
    return points;
  }

  /**
   * Subscribe to dashboard updates
   */
  subscribe(callback: (dashboardId: string, data: DashboardData) => void): () => void {
    this.subscribers.add(callback);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get dashboard as JSON for API response
   */
  async getDashboardJSON(dashboardId: string): Promise<any> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) return null;

    const widgets = await Promise.all(
      dashboard.widgets.map(async widget => {
        const widgetData = this.widgetData.get(`${dashboardId}:${widget.id}`);
        return {
          ...widget,
          data: widgetData?.data,
          lastUpdated: widgetData?.lastUpdated,
          error: widgetData?.error
        };
      })
    );

    return {
      ...dashboard,
      widgets,
      lastUpdated: new Date()
    };
  }

  /**
   * Stop all dashboard refreshes
   */
  stopAll(): void {
    for (const dashboardId of this.refreshIntervals.keys()) {
      this.stopDashboardRefresh(dashboardId);
    }
    console.log('🛑 [MONITORING-DASHBOARD] Stopped all dashboard refreshes');
  }
}

// Export singleton instance
export const monitoringDashboard = MonitoringDashboard.getInstance();

// Export utility functions
export function getDashboard(dashboardId: string): MonitoringDashboard | undefined {
  return monitoringDashboard.getDashboard(dashboardId);
}

export async function getDashboardData(dashboardId: string): Promise<DashboardData | null> {
  return monitoringDashboard.getDashboardData(dashboardId);
}

export function subscribeToDashboard(callback: (dashboardId: string, data: DashboardData) => void): () => void {
  return monitoringDashboard.subscribe(callback);
}

export function getDashboardJSON(dashboardId: string): Promise<any> {
  return monitoringDashboard.getDashboardJSON(dashboardId);
}