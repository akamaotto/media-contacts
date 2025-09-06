"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Shield,
  Key,
  AlertTriangle,
  DollarSign,
  Activity,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Settings
} from "lucide-react";

export interface SecurityDashboardProps {
  className?: string;
}

interface SecurityMetrics {
  rateLimits: {
    totalRequests: number;
    blockedRequests: number;
    topLimitedIPs: Array<{ ip: string; count: number }>;
  };
  apiKeys: {
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    recentUsage: number;
  };
  alerts: {
    total: number;
    open: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  costs: {
    totalSpent: number;
    budgetUsage: number;
    topSpenders: Array<{ userId: string; amount: number }>;
    predictions: {
      dailyAverage: number;
      monthlyProjection: number;
    };
  };
  audit: {
    totalEvents: number;
    securityViolations: number;
    topEventTypes: Array<{ type: string; count: number }>;
  };
}

interface SecurityAlert {
  id: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  createdAt: string;
  status: 'open' | 'investigating' | 'resolved';
}

const SEVERITY_COLORS = {
  low: 'bg-blue-100 text-blue-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700'
};

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-700',
  investigating: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700'
};

export function SecurityDashboard({ className = "" }: SecurityDashboardProps) {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadSecurityData();
  }, [timeRange]);

  const loadSecurityData = async () => {
    try {
      // Load metrics
      const metricsResponse = await fetch(`/api/security/metrics?timeRange=${timeRange}`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      // Load alerts
      const alertsResponse = await fetch('/api/security/alerts?status=open&limit=20');
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.alerts);
      }
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSecurityData();
    setRefreshing(false);
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/security/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          alertId,
          status: 'resolved'
        })
      });

      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId));
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading security data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor security metrics, alerts, and system health
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.alerts.open}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.alerts.critical} critical, {metrics.alerts.high} high priority
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">API Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.apiKeys.activeKeys}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.apiKeys.expiredKeys} expired, {metrics.apiKeys.recentUsage} recent uses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rate Limits</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.rateLimits.blockedRequests}</div>
              <p className="text-xs text-muted-foreground">
                {((metrics.rateLimits.blockedRequests / metrics.rateLimits.totalRequests) * 100).toFixed(1)}% of {metrics.rateLimits.totalRequests} requests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Tracking</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.costs.totalSpent.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.costs.budgetUsage.toFixed(1)}% of budget used
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
          <TabsTrigger value="metrics">Detailed Metrics</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Security Alerts</CardTitle>
              <CardDescription>
                Security incidents requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{alert.title}</span>
                          <Badge className={`text-xs ${SEVERITY_COLORS[alert.severity]}`}>
                            {alert.severity}
                          </Badge>
                          <Badge className={`text-xs ${STATUS_COLORS[alert.status]}`}>
                            {alert.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            <Clock className="inline h-3 w-3 mr-1" />
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                          <span>Type: {alert.alertType}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResolveAlert(alert.id)}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {alerts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No active security alerts
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rate Limiting Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Rate Limiting</CardTitle>
                  <CardDescription>
                    Request blocking and rate limit statistics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Block Rate</span>
                    <span className="text-sm font-medium">
                      {((metrics.rateLimits.blockedRequests / metrics.rateLimits.totalRequests) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(metrics.rateLimits.blockedRequests / metrics.rateLimits.totalRequests) * 100} 
                    className="h-2" 
                  />
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Top Limited IPs</h4>
                    {metrics.rateLimits.topLimitedIPs.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="font-mono">{item.ip}</span>
                        <span>{item.count} blocks</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Cost Tracking */}
              <Card>
                <CardHeader>
                  <CardTitle>Cost Analysis</CardTitle>
                  <CardDescription>
                    AI operation costs and budget usage
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        ${metrics.costs.predictions.dailyAverage.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Daily Average</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        ${metrics.costs.predictions.monthlyProjection.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">Monthly Projection</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Top Spenders</h4>
                    {metrics.costs.topSpenders.map((spender, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{spender.userId}</span>
                        <span className="font-medium">${spender.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* API Key Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>API Key Management</CardTitle>
                  <CardDescription>
                    API key usage and security status
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-xl font-bold text-green-600">
                        {metrics.apiKeys.activeKeys}
                      </div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                    
                    <div>
                      <div className="text-xl font-bold text-red-600">
                        {metrics.apiKeys.expiredKeys}
                      </div>
                      <div className="text-xs text-muted-foreground">Expired</div>
                    </div>
                    
                    <div>
                      <div className="text-xl font-bold text-blue-600">
                        {metrics.apiKeys.recentUsage}
                      </div>
                      <div className="text-xs text-muted-foreground">Recent Uses</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Audit Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Audit Activity</CardTitle>
                  <CardDescription>
                    Security events and audit trail
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Security Violations</span>
                    <span className="text-sm font-medium text-red-600">
                      {metrics.audit.securityViolations}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Top Event Types</h4>
                    {metrics.audit.topEventTypes.map((event, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="capitalize">{event.type.replace('_', ' ')}</span>
                        <span>{event.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Audit Events</CardTitle>
              <CardDescription>
                Security-related events and system activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Audit log integration would be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security policies and thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Security configuration interface would be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}