'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getPerformanceDashboard, 
  onPerformanceAlert, 
  PerformanceAlert 
} from '@/lib/performance/performance-integration';
import { lazyLoadComponent } from '@/lib/performance/frontend-optimizer';

interface PerformanceMetrics {
  overview: {
    overallScore: number;
    totalViolations: number;
    activeAlerts: number;
    lastUpdated: Date;
  };
  metrics: any;
  services: {
    database: any;
    api: any;
    frontend: any;
    aiService: any;
  };
  trends: {
    responseTime: number[];
    errorRate: number[];
    throughput: number[];
  };
  alerts: PerformanceAlert[];
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const data = await getPerformanceDashboard();
        setMetrics(data);
        setAlerts(data.alerts);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to load performance metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    // Load initial metrics
    loadMetrics();

    // Set up periodic updates
    const interval = setInterval(loadMetrics, 30000); // Update every 30 seconds

    // Subscribe to performance alerts
    const unsubscribe = onPerformanceAlert((alert) => {
      setAlerts(prev => [...prev.slice(-9), alert]); // Keep last 10 alerts
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAlertColor = (type: 'warning' | 'critical'): string => {
    return type === 'critical' ? 'destructive' : 'default';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg">Loading performance metrics...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-red-600">Failed to load performance metrics</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(metrics.overview.overallScore)}`}>
              {metrics.overview.overallScore}%
            </div>
            <Progress value={metrics.overview.overallScore} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Violations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.overview.totalViolations}
            </div>
            <p className="text-xs text-muted-foreground">Performance issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {metrics.overview.activeAlerts}
            </div>
            <p className="text-xs text-muted-foreground">Critical issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {lastUpdate?.toLocaleTimeString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastUpdate?.toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>
              Latest performance alerts and warnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <Alert key={index}>
                  <Badge variant={getAlertColor(alert.type)} className="mr-2">
                    {alert.type.toUpperCase()}
                  </Badge>
                  <AlertDescription>
                    {alert.message}
                  </AlertDescription>
                  <div className="text-xs text-muted-foreground mt-1">
                    {alert.timestamp.toLocaleString()}
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics */}
      <Tabs defaultValue="database" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="frontend">Frontend</TabsTrigger>
          <TabsTrigger value="ai">AI Services</TabsTrigger>
        </TabsList>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Database Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Average Query Time</span>
                    <span>{metrics.services.database.queryStats?.avgTime?.toFixed(2) || 0}ms</span>
                  </div>
                  <Progress 
                    value={Math.min((metrics.services.database.queryStats?.avgTime || 0) / 2, 100)} 
                    className="mt-1" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Cache Hit Rate</span>
                    <span>{metrics.services.database.cacheStats?.hitRate || 0}%</span>
                  </div>
                  <Progress 
                    value={metrics.services.database.cacheStats?.hitRate || 0} 
                    className="mt-1" 
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span>Connection Usage</span>
                    <span>{metrics.services.database.connectionStats?.totalConnections || 0}</span>
                  </div>
                  <Progress 
                    value={(metrics.services.database.connectionStats?.totalConnections || 0) * 10} 
                    className="mt-1" 
                  />
                </div>

                {metrics.services.database.recommendations?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {metrics.services.database.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-muted-foreground">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Average Response Time</span>
                    <span>{metrics.services.api.requestStats?.avgTime?.toFixed(2) || 0}ms</span>
                  </div>
                  <Progress 
                    value={Math.min((metrics.services.api.requestStats?.avgTime || 0) / 5, 100)} 
                    className="mt-1" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Error Rate</span>
                    <span>{metrics.services.api.requestStats?.errorRate?.toFixed(2) || 0}%</span>
                  </div>
                  <Progress 
                    value={metrics.services.api.requestStats?.errorRate || 0} 
                    className="mt-1" 
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span>Cache Hit Rate</span>
                    <span>{metrics.services.api.cacheStats?.hitRate || 0}%</span>
                  </div>
                  <Progress 
                    value={metrics.services.api.cacheStats?.hitRate || 0} 
                    className="mt-1" 
                  />
                </div>

                {metrics.services.api.recommendations?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {metrics.services.api.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-muted-foreground">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frontend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frontend Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Bundle Size</span>
                    <span>{((metrics.services.frontend.bundleAnalysis?.totalSize || 0) / 1024).toFixed(2)}KB</span>
                  </div>
                  <Progress 
                    value={Math.min(((metrics.services.frontend.bundleAnalysis?.totalSize || 0) / 1024) / 5, 100)} 
                    className="mt-1" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>LCP</span>
                      <span>{metrics.metrics.frontend.coreWebVitals.lcp.toFixed(0)}ms</span>
                    </div>
                    <Progress 
                      value={Math.min((metrics.metrics.frontend.coreWebVitals.lcp / 2500) * 100, 100)} 
                      className="mt-1" 
                    />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>FID</span>
                      <span>{metrics.metrics.frontend.coreWebVitals.fid.toFixed(0)}ms</span>
                    </div>
                    <Progress 
                      value={Math.min((metrics.metrics.frontend.coreWebVitals.fid / 100) * 100, 100)} 
                      className="mt-1" 
                    />
                  </div>
                </div>

                {metrics.services.frontend.recommendations?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {metrics.services.frontend.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-muted-foreground">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Service Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Search Latency</span>
                    <span>{(metrics.metrics.ai.searchLatency / 1000).toFixed(2)}s</span>
                  </div>
                  <Progress 
                    value={Math.min((metrics.metrics.ai.searchLatency / 30000) * 100, 100)} 
                    className="mt-1" 
                  />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span>{metrics.metrics.ai.successRate.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={metrics.metrics.ai.successRate} 
                    className="mt-1" 
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm">
                    <span>Cost per Search</span>
                    <span>${metrics.metrics.ai.costPerSearch.toFixed(4)}</span>
                  </div>
                  <Progress 
                    value={Math.min((metrics.metrics.ai.costPerSearch / 0.10) * 100, 100)} 
                    className="mt-1" 
                  />
                </div>

                {metrics.services.aiService.recommendations?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                    <ul className="text-sm space-y-1">
                      {metrics.services.aiService.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="text-muted-foreground">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Lazy load the performance dashboard
export const LazyPerformanceDashboard = lazyLoadComponent(
  () => import('./performance-dashboard').then(mod => ({ default: mod.PerformanceDashboard })),
  {
    chunkName: 'performance-dashboard',
    prefetch: false
  }
);