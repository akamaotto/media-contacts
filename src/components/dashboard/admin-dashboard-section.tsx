'use client';

import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Users, 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  HardDrive,
  Cpu,
  Zap,
  TrendingUp,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminMetrics } from '@/backend/dashboard/admin';

interface AdminDashboardSectionProps {
  userId: string;
  userRole?: string;
}

/**
 * Admin-specific dashboard section with system health and metrics
 */
export function AdminDashboardSection({ userId, userRole }: AdminDashboardSectionProps) {
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has admin access
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    fetchAdminMetrics();
    
    // Refresh admin metrics every 2 minutes
    const interval = setInterval(fetchAdminMetrics, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isAdmin]);

  const fetchAdminMetrics = async () => {
    try {
      const response = await fetch('/api/dashboard/admin');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch admin metrics: ${response.statusText}`);
      }
      
      const result = await response.json();
      setAdminMetrics(result.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching admin metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admin metrics');
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything for non-admin users
  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Admin Dashboard Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!adminMetrics) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Admin Dashboard</h2>
        <Badge variant="secondary">Admin Only</Badge>
      </div>

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="users">User Activity</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SystemHealthCard
              title="System Uptime"
              value={formatUptime(adminMetrics.systemHealth.uptime)}
              icon={<Clock className="h-4 w-4" />}
              status="healthy"
            />
            <SystemHealthCard
              title="Memory Usage"
              value={`${adminMetrics.systemHealth.memoryUsage.percentage}%`}
              icon={<Cpu className="h-4 w-4" />}
              status={adminMetrics.systemHealth.memoryUsage.percentage > 80 ? 'warning' : 'healthy'}
              progress={adminMetrics.systemHealth.memoryUsage.percentage}
            />
            <SystemHealthCard
              title="DB Connections"
              value={`${adminMetrics.systemHealth.databaseConnections.active}/${adminMetrics.systemHealth.databaseConnections.total}`}
              icon={<Database className="h-4 w-4" />}
              status="healthy"
            />
            <SystemHealthCard
              title="Cache Status"
              value={adminMetrics.systemHealth.cacheStatus.isAvailable ? 'Online' : 'Offline'}
              icon={<Zap className="h-4 w-4" />}
              status={adminMetrics.systemHealth.cacheStatus.isAvailable ? 'healthy' : 'error'}
              subtitle={adminMetrics.systemHealth.cacheStatus.hitRate ? `${adminMetrics.systemHealth.cacheStatus.hitRate}% hit rate` : undefined}
            />
          </div>
        </TabsContent>

        {/* User Activity Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total Users"
              value={adminMetrics.userActivity.totalUsers.toString()}
              icon={<Users className="h-4 w-4" />}
            />
            <MetricCard
              title="Active Today"
              value={adminMetrics.userActivity.activeUsers.today.toString()}
              icon={<Activity className="h-4 w-4" />}
            />
            <MetricCard
              title="Active This Week"
              value={adminMetrics.userActivity.activeUsers.thisWeek.toString()}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <MetricCard
              title="New This Month"
              value={adminMetrics.userActivity.newUsersThisMonth.toString()}
              icon={<Users className="h-4 w-4" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Most Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {adminMetrics.userActivity.mostActiveUsers.map((user, index) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                        <span className="text-sm font-medium">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{user.activityCount} actions</p>
                      <p className="text-sm text-muted-foreground">
                        Last active: {new Date(user.lastActive).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Media Contacts"
              value={adminMetrics.databaseMetrics.totalRecords.mediaContacts.toLocaleString()}
              icon={<Database className="h-4 w-4" />}
            />
            <MetricCard
              title="Publishers"
              value={adminMetrics.databaseMetrics.totalRecords.publishers.toLocaleString()}
              icon={<Database className="h-4 w-4" />}
            />
            <MetricCard
              title="Outlets"
              value={adminMetrics.databaseMetrics.totalRecords.outlets.toLocaleString()}
              icon={<Database className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Database Size
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Size</span>
                    <span className="text-lg font-bold">{adminMetrics.databaseMetrics.databaseSize.total}</span>
                  </div>
                  {adminMetrics.databaseMetrics.databaseSize.tables.map((table) => (
                    <div key={table.name} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">{table.name}</span>
                      <div className="text-right">
                        <div>{table.size}</div>
                        <div className="text-xs text-muted-foreground">{table.rowCount.toLocaleString()} rows</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Imports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {adminMetrics.databaseMetrics.recentImports.map((importItem, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                      <div>
                        <p className="font-medium capitalize">{importItem.type}</p>
                        <p className="text-sm text-muted-foreground">by {importItem.userName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{importItem.count} records</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(importItem.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              title="Avg Response Time"
              value={`${adminMetrics.performanceMetrics.averageResponseTime}ms`}
              icon={<Zap className="h-4 w-4" />}
            />
            <MetricCard
              title="Error Rate"
              value={`${adminMetrics.performanceMetrics.errorRate.percentage}%`}
              icon={<AlertTriangle className="h-4 w-4" />}
              subtitle={`${adminMetrics.performanceMetrics.errorRate.count} errors in ${adminMetrics.performanceMetrics.errorRate.period}`}
            />
            <MetricCard
              title="Slow Queries"
              value={adminMetrics.performanceMetrics.slowQueries.length.toString()}
              icon={<Database className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>API Endpoint Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {adminMetrics.performanceMetrics.apiEndpointStats.map((endpoint, index) => (
                    <div key={index} className="p-3 bg-muted/20 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <code className="text-sm font-mono">{endpoint.endpoint}</code>
                        <Badge variant={endpoint.errorCount > 0 ? 'destructive' : 'secondary'}>
                          {endpoint.errorCount} errors
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Requests:</span>
                          <span className="ml-2 font-medium">{endpoint.requestCount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Time:</span>
                          <span className="ml-2 font-medium">{endpoint.averageResponseTime}ms</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slow Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {adminMetrics.performanceMetrics.slowQueries.map((query, index) => (
                    <div key={index} className="p-3 bg-muted/20 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="destructive">{query.duration}ms</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(query.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <code className="text-xs font-mono text-muted-foreground block truncate">
                        {query.query}
                      </code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * System health metric card component
 */
function SystemHealthCard({
  title,
  value,
  icon,
  status,
  progress,
  subtitle
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  status: 'healthy' | 'warning' | 'error';
  progress?: number;
  subtitle?: string;
}) {
  const statusColors = {
    healthy: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  };

  const statusIcons = {
    healthy: <CheckCircle className="h-4 w-4 text-green-600" />,
    warning: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
    error: <AlertTriangle className="h-4 w-4 text-red-600" />
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex items-center space-x-1">
          {icon}
          {statusIcons[status]}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {progress !== undefined && (
          <Progress value={progress} className="mt-2" />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Generic metric card component
 */
function MetricCard({
  title,
  value,
  icon,
  subtitle
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Format uptime in human readable format
 */
function formatUptime(uptimeSeconds: number): string {
  const days = Math.floor(uptimeSeconds / (24 * 60 * 60));
  const hours = Math.floor((uptimeSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((uptimeSeconds % (60 * 60)) / 60);

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}
