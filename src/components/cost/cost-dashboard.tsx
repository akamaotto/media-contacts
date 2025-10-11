/**
 * Cost Dashboard Component
 * Provides comprehensive cost visualization and monitoring interface
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  Zap,
  Target,
  Calendar,
  Download,
  Settings,
  Bell,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import {
  getCostMetrics,
  generateCostForecast,
  type CostMetrics,
  type CostForecast,
} from '@/lib/cost/cost-reporting';
import {
  getCostOptimizationRecommendations,
  implementCostOptimization,
  type OptimizationRecommendation,
} from '@/lib/cost/cost-optimization';
import {
  getActiveAlerts,
  acknowledgeAlert,
  type RealTimeAlert,
} from '@/lib/cost/realtime-cost-alerts';

interface DashboardData {
  metrics: CostMetrics | null;
  forecast: CostForecast | null;
  recommendations: OptimizationRecommendation[];
  alerts: RealTimeAlert[];
  loading: boolean;
  error: string | null;
}

export default function CostDashboard() {
  const [data, setData] = useState<DashboardData>({
    metrics: null,
    forecast: null,
    recommendations: [],
    alerts: [],
    loading: true,
    error: null,
  });

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const period = getTimeRangePeriod(timeRange);
      
      const [metrics, forecast, recommendations, alerts] = await Promise.all([
        getCostMetrics(undefined, period),
        generateCostForecast('monthly', 3),
        getCostOptimizationRecommendations(),
        getActiveAlerts(),
      ]);

      setData({
        metrics,
        forecast,
        recommendations: recommendations.slice(0, 5),
        alerts: alerts.slice(0, 10),
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data. Please try again.',
      }));
    }
  };

  const getTimeRangePeriod = (range: '7d' | '30d' | '90d') => {
    const end = new Date();
    const start = new Date();
    
    switch (range) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
    }
    
    return { start, end };
  };

  const handleImplementRecommendation = async (recommendationId: string) => {
    try {
      await implementCostOptimization(recommendationId);
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to implement recommendation:', error);
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId, 'current-user');
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const exportReport = async () => {
    // Implement report export functionality
    console.log('Exporting cost report...');
  };

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (data.error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{data.error}</AlertDescription>
      </Alert>
    );
  }

  if (!data.metrics) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No cost data available for the selected period.</AlertDescription>
      </Alert>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cost Dashboard</h1>
          <p className="text-muted-foreground">Monitor and optimize your AI service costs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['7d', '30d', '90d'] as const).map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            onClick={() => setTimeRange(range)}
          >
            {range === '7d' ? 'Last 7 days' : range === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </Button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Cost"
          value={`$${data.metrics.cost.total.toFixed(2)}`}
          change={data.metrics.cost.byDay.length > 1 
            ? ((data.metrics.cost.byDay[data.metrics.cost.byDay.length - 1].cost - 
                data.metrics.cost.byDay[data.metrics.cost.byDay.length - 2].cost) / 
                data.metrics.cost.byDay[data.metrics.cost.byDay.length - 2].cost) * 100
            : 0
          }
          icon={<DollarSign className="h-4 w-4" />}
        />
        <MetricCard
          title="Total Operations"
          value={data.metrics.usage.totalOperations.toLocaleString()}
          change={0}
          icon={<Zap className="h-4 w-4" />}
        />
        <MetricCard
          title="Success Rate"
          value={`${data.metrics.usage.successRate.toFixed(1)}%`}
          change={0}
          icon={<Target className="h-4 w-4" />}
        />
        <MetricCard
          title="Cost per Operation"
          value={`$${data.metrics.cost.total / data.metrics.usage.totalOperations}`}
          change={0}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Alerts</h2>
          <div className="grid gap-4">
            {data.alerts.slice(0, 3).map((alert) => (
              <Alert key={alert.id} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  {alert.title}
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  {alert.message}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAcknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Trend</CardTitle>
                <CardDescription>Daily cost over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.metrics.cost.byDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                    <Area type="monotone" dataKey="cost" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Provider Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Cost by Provider</CardTitle>
                <CardDescription>Distribution of costs across providers</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(data.metrics.cost.byProvider).map(([name, value]) => ({
                        name,
                        value,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.entries(data.metrics.cost.byProvider).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Efficiency Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Efficiency Metrics</CardTitle>
              <CardDescription>Performance and cost efficiency indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">${data.metrics.efficiency.costPerContact.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Cost per Contact</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">${data.metrics.efficiency.costPerSuccessfulSearch.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Cost per Successful Search</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.metrics.efficiency.roi.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Return on Investment</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Operations Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Operations Breakdown</CardTitle>
                <CardDescription>Cost and volume by operation type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={Object.entries(data.metrics.cost.byOperation).map(([name, value]) => ({
                      name,
                      cost: value,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                    <Bar dataKey="cost" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* User Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Top Users by Cost</CardTitle>
                <CardDescription>Users with highest cost consumption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(data.metrics.cost.byUser)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([userId, cost], index) => (
                      <div key={userId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span className="text-sm">User {index + 1}</span>
                        </div>
                        <span className="font-medium">${cost.toFixed(2)}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Anomalies */}
          {data.metrics.anomalies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detected Anomalies</CardTitle>
                <CardDescription>Unusual patterns in cost data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.metrics.anomalies.map((anomaly, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{anomaly.type}</div>
                        <div className="text-sm text-muted-foreground">{anomaly.description}</div>
                      </div>
                      <Badge variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'}>
                        {anomaly.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <div className="grid gap-6">
            {data.recommendations.map((recommendation) => (
              <Card key={recommendation.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant={recommendation.priority === 'high' ? 'destructive' : 'secondary'}>
                        {recommendation.priority}
                      </Badge>
                      <Badge variant="outline">
                        ${recommendation.potentialSavings.monthly.toFixed(0)}/mo
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>{recommendation.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium mb-2">Potential Savings</div>
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold text-green-600">
                          ${recommendation.potentialSavings.monthly.toFixed(2)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          ({recommendation.potentialSavings.percentage}% reduction)
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium mb-2">Implementation</div>
                      <div className="flex gap-4 text-sm">
                        <span>Effort: {recommendation.implementation.effort}</span>
                        <span>Time: {recommendation.implementation.time}</span>
                        <span>Complexity: {recommendation.implementation.complexity}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {recommendation.status === 'recommended' && (
                        <Button
                          onClick={() => handleImplementRecommendation(recommendation.id)}
                          disabled={recommendation.actions.some(a => !a.automated)}
                        >
                          Implement
                        </Button>
                      )}
                      <Button variant="outline">View Details</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-6">
          {data.forecast && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Cost Forecast</CardTitle>
                  <CardDescription>Predicted costs for the next 3 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={data.forecast.predictions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="predictedCost"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Predicted Cost"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {data.forecast.predictions.slice(0, 3).map((prediction, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {new Date(prediction.date).toLocaleDateString('en-US', { 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </CardTitle>
                      <CardDescription>
                        Confidence: {(prediction.confidence * 100).toFixed(0)}%
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold mb-2">
                        ${prediction.predictedCost.toFixed(2)}
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Key Factors:</div>
                        {prediction.factors.map((factor, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            • {factor.name}: {(factor.impact * 100).toFixed(0)}% impact
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Model Information</CardTitle>
                  <CardDescription>Forecast model details and accuracy</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm font-medium mb-2">Model Version</div>
                      <div>{data.forecast.model.version}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Accuracy</div>
                      <div>{(data.forecast.model.accuracy * 100).toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Last Trained</div>
                      <div>{data.forecast.model.trainedAt.toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Factors</div>
                      <div>{data.forecast.model.factors.join(', ')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
}

function MetricCard({ title, value, change, icon }: MetricCardProps) {
  const isPositive = change >= 0;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="flex items-center gap-2">
            {icon}
            {change !== 0 && (
              <Badge variant={isPositive ? 'default' : 'destructive'}>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {Math.abs(change).toFixed(1)}%
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}