/**
 * Post-Launch Monitoring Dashboard
 * React component for visualizing post-launch metrics and health status
 */

import React, { useState, useEffect } from 'react';
import { 
  postLaunchMonitoringService, 
  type PostLaunchMetrics, 
  type MonitoringAlert,
  type PostLaunchReport 
} from './post-launch-monitoring-service';
import { 
  automatedHealthChecks, 
  type SystemHealthReport,
  type HealthCheckResult 
} from './automated-health-checks';

interface DashboardProps {
  environment?: string;
  refreshInterval?: number;
  showDetailedMetrics?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  subtitle?: string;
}

interface AlertItemProps {
  alert: MonitoringAlert;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  unit, 
  status, 
  trend, 
  subtitle 
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
      default: return '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {trend && <span className="text-lg">{getTrendIcon()}</span>}
      </div>
      <div className="mt-2">
        <p className={`text-2xl font-semibold ${getStatusColor()}`}>
          {value}{unit && <span className="text-sm font-normal">{unit}</span>}
        </p>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

const AlertItem: React.FC<AlertItemProps> = ({ alert, onAcknowledge, onResolve }) => {
  const getSeverityColor = () => {
    switch (alert.severity) {
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      case 'emergency': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor()}`}>
              {alert.severity.toUpperCase()}
            </span>
            <h4 className="ml-2 text-sm font-medium text-gray-900">{alert.title}</h4>
          </div>
          <p className="mt-1 text-sm text-gray-600">{alert.description}</p>
          <div className="mt-2 text-xs text-gray-500">
            Triggered: {alert.triggeredAt.toLocaleString()}
            {alert.acknowledged && (
              <span className="ml-2">Acknowledged by: {alert.acknowledgedBy}</span>
            )}
          </div>
          {alert.recommendations.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-700">Recommendations:</p>
              <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                {alert.recommendations.slice(0, 2).map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="ml-4 flex space-x-2">
          {!alert.acknowledged && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded hover:bg-yellow-200"
            >
              Acknowledge
            </button>
          )}
          <button
            onClick={() => onResolve(alert.id)}
            className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200"
          >
            Resolve
          </button>
        </div>
      </div>
    </div>
  );
};

const HealthStatusIndicator: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      case 'critical': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center">
      <div className={`w-3 h-3 rounded-full ${getStatusColor()} mr-2`}></div>
      <span className="text-sm font-medium capitalize">{status}</span>
    </div>
  );
};

export const PostLaunchMonitoringDashboard: React.FC<DashboardProps> = ({
  environment = 'production',
  refreshInterval = 60000,
  showDetailedMetrics = false
}) => {
  const [metrics, setMetrics] = useState<PostLaunchMetrics | null>(null);
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [lastReport, setLastReport] = useState<PostLaunchReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'usage' | 'costs' | 'health'>('overview');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch current metrics
        const currentMetrics = postLaunchMonitoringService.getCurrentMetrics();
        setMetrics(currentMetrics);

        // Fetch health report
        const healthData = await automatedHealthChecks.generateSystemHealthReport();
        setHealthReport(healthData);

        // Fetch active alerts
        const activeAlerts = postLaunchMonitoringService.getActiveAlerts();
        setAlerts(activeAlerts);

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for refreshing
    const interval = setInterval(fetchData, refreshInterval);

    return () => clearInterval(interval);
  }, [environment, refreshInterval]);

  const handleAcknowledgeAlert = (alertId: string) => {
    postLaunchMonitoringService.acknowledgeAlert(alertId, 'dashboard-user');
    // Refresh alerts
    setAlerts(postLaunchMonitoringService.getActiveAlerts());
  };

  const handleResolveAlert = (alertId: string) => {
    postLaunchMonitoringService.resolveAlert(alertId);
    // Refresh alerts
    setAlerts(postLaunchMonitoringService.getActiveAlerts());
  };

  const handleGenerateReport = async () => {
    try {
      const report = await postLaunchMonitoringService.generateReport();
      setLastReport(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-400">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading monitoring data</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Post-Launch Monitoring Dashboard</h1>
              <p className="text-sm text-gray-500">
                Environment: <span className="font-medium">{environment}</span>
                {metrics && (
                  <span className="ml-4">
                    Last updated: {metrics.timestamp.toLocaleString()}
                  </span>
                )}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleGenerateReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Generate Report
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-gray-200">
          <nav className="flex space-x-8">
            {['overview', 'performance', 'usage', 'costs', 'health'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-1 py-2 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Health Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">System Health</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {healthReport && (
                <>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-700">Overall Status</span>
                    <HealthStatusIndicator status={healthReport.overallStatus} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-700">Healthy Components</span>
                    <span className="text-sm font-bold text-green-600">
                      {healthReport.summary.healthyComponents}/{healthReport.summary.totalComponents}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-700">Active Alerts</span>
                    <span className="text-sm font-bold text-red-600">{alerts.length}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics && (
              <>
                <MetricCard
                  title="Daily Searches"
                  value={metrics.usage.dailySearches}
                  status={metrics.usage.dailySearches > 50 ? 'good' : 'warning'}
                  trend="stable"
                />
                <MetricCard
                  title="Success Rate"
                  value={metrics.usage.successRate}
                  unit="%"
                  status={metrics.usage.successRate >= 90 ? 'good' : metrics.usage.successRate >= 80 ? 'warning' : 'critical'}
                  trend="stable"
                />
                <MetricCard
                  title="Response Time"
                  value={metrics.performance.responseTime.p95}
                  unit="ms"
                  status={metrics.performance.responseTime.p95 < 1000 ? 'good' : 'warning'}
                  trend="stable"
                />
                <MetricCard
                  title="Daily Cost"
                  value={metrics.costs.dailyTotal}
                  unit="$"
                  status={metrics.costs.dailyTotal < 50 ? 'good' : metrics.costs.dailyTotal < 100 ? 'warning' : 'critical'}
                  trend="up"
                />
              </>
            )}
          </div>

          {/* Active Alerts */}
          {alerts.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Active Alerts ({alerts.length})</h2>
              <div className="space-y-4">
                {alerts.slice(0, 3).map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={handleAcknowledgeAlert}
                    onResolve={handleResolveAlert}
                  />
                ))}
                {alerts.length > 3 && (
                  <div className="text-center">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View {alerts.length - 3} more alerts
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="P50 Response Time"
              value={metrics.performance.responseTime.p50}
              unit="ms"
              status={metrics.performance.responseTime.p50 < 500 ? 'good' : 'warning'}
            />
            <MetricCard
              title="P95 Response Time"
              value={metrics.performance.responseTime.p95}
              unit="ms"
              status={metrics.performance.responseTime.p95 < 1000 ? 'good' : 'warning'}
            />
            <MetricCard
              title="P99 Response Time"
              value={metrics.performance.responseTime.p99}
              unit="ms"
              status={metrics.performance.responseTime.p99 < 2000 ? 'good' : 'warning'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricCard
              title="Requests/Minute"
              value={metrics.performance.throughput.requestsPerMinute}
              status="good"
            />
            <MetricCard
              title="Error Rate"
              value={metrics.performance.errorRate}
              unit="%"
              status={metrics.performance.errorRate < 5 ? 'good' : metrics.performance.errorRate < 10 ? 'warning' : 'critical'}
            />
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Distribution</h2>
            <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
              <p className="text-gray-500">Performance chart would be rendered here</p>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Daily Searches"
              value={metrics.usage.dailySearches}
              status={metrics.usage.dailySearches > 50 ? 'good' : 'warning'}
            />
            <MetricCard
              title="Unique Users"
              value={metrics.usage.uniqueUsers}
              status="good"
            />
            <MetricCard
              title="Repeat Users"
              value={metrics.usage.repeatUsers}
              status="good"
            />
            <MetricCard
              title="Avg Results/Search"
              value={metrics.usage.averageResultsPerSearch}
              status={metrics.usage.averageResultsPerSearch > 3 ? 'good' : 'warning'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricCard
              title="Feature Adoption Rate"
              value={metrics.usage.featureAdoptionRate}
              unit="%"
              status={metrics.usage.featureAdoptionRate > 50 ? 'good' : 'warning'}
            />
            <MetricCard
              title="Search Abandonment Rate"
              value={metrics.usage.searchAbandonmentRate}
              unit="%"
              status={metrics.usage.searchAbandonmentRate < 20 ? 'good' : 'warning'}
            />
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Usage Trends</h2>
            <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
              <p className="text-gray-500">Usage trends chart would be rendered here</p>
            </div>
          </div>
        </div>
      )}

      {/* Costs Tab */}
      {activeTab === 'costs' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Daily Cost"
              value={metrics.costs.dailyTotal}
              unit="$"
              status={metrics.costs.dailyTotal < 50 ? 'good' : metrics.costs.dailyTotal < 100 ? 'warning' : 'critical'}
            />
            <MetricCard
              title="Monthly Cost (Projected)"
              value={metrics.costs.monthlyTotal}
              unit="$"
              status={metrics.costs.monthlyTotal < 1500 ? 'good' : 'warning'}
            />
            <MetricCard
              title="Cost Per Search"
              value={metrics.costs.costPerSearch}
              unit="$"
              status={metrics.costs.costPerSearch < 0.50 ? 'good' : 'warning'}
            />
            <MetricCard
              title="Projected Monthly Spend"
              value={metrics.costs.projectedMonthlySpend}
              unit="$"
              status="good"
            />
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Cost Breakdown by Provider</h2>
            <div className="space-y-3">
              {Object.entries(metrics.costs.costByProvider).map(([provider, cost]) => (
                <div key={provider} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium text-gray-700 capitalize">{provider}</span>
                  <span className="text-sm font-bold text-gray-900">${cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Cost Trends</h2>
            <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
              <p className="text-gray-500">Cost trends chart would be rendered here</p>
            </div>
          </div>
        </div>
      )}

      {/* Health Tab */}
      {activeTab === 'health' && healthReport && (
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Component Health Status</h2>
            <div className="space-y-4">
              {healthReport.components.map((component) => (
                <div key={component.component} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 capitalize">{component.component}</h3>
                    <HealthStatusIndicator status={component.status} />
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Response Time: {component.responseTime}ms</p>
                    <p>Last Checked: {component.lastChecked.toLocaleString()}</p>
                    {component.errorMessage && (
                      <p className="text-red-600 mt-1">Error: {component.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">System Recommendations</h2>
            <div className="space-y-2">
              {healthReport.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <p className="text-sm text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Generated Report Modal */}
      {lastReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Generated Report</h3>
                <button
                  onClick={() => setLastReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="mt-4">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">
                    Report ID: {lastReport.id}
                  </p>
                  <p className="text-sm text-gray-600">
                    Generated: {lastReport.generatedAt.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Overall Score: {lastReport.overallScore}/100
                  </p>
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Immediate Recommendations:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {lastReport.recommendations.immediate.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setLastReport(null)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostLaunchMonitoringDashboard;