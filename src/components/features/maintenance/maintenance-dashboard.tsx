'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ContactOutcomeTracker } from './contact-outcome-tracker';
import { WatchlistManager } from './watchlist-manager';
import { PolicyAlerts } from './policy-alerts';
import { MoveDetection } from './move-detection';
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  UserCheck, 
  TrendingUp, 
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface MaintenanceStats {
  outcomes: {
    total: number;
    replyRate: number;
    coverageRate: number;
    bounceRate: number;
    trend: number;
  };
  watchlist: {
    totalItems: number;
    activeItems: number;
    unreadAlerts: number;
    criticalItems: number;
  };
  policyChanges: {
    pendingChanges: number;
    verifiedChanges: number;
    monitoredOutlets: number;
    criticalChanges: number;
  };
  moveDetection: {
    pendingMoves: number;
    confirmedMoves: number;
    detectionRate: number;
    totalDetections: number;
  };
}

export function MaintenanceDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock stats data
  const stats: MaintenanceStats = {
    outcomes: {
      total: 156,
      replyRate: 25.0,
      coverageRate: 12.5,
      bounceRate: 15.0,
      trend: 5.2
    },
    watchlist: {
      totalItems: 47,
      activeItems: 42,
      unreadAlerts: 8,
      criticalItems: 3
    },
    policyChanges: {
      pendingChanges: 5,
      verifiedChanges: 12,
      monitoredOutlets: 28,
      criticalChanges: 2
    },
    moveDetection: {
      pendingMoves: 7,
      confirmedMoves: 15,
      detectionRate: 87,
      totalDetections: 47
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Maintenance Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor contact outcomes, watchlists, policy changes, and contact moves
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="outcomes">
            <CheckCircle className="h-4 w-4 mr-2" />
            Outcomes
            {stats.outcomes.total > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.outcomes.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="watchlist">
            <Users className="h-4 w-4 mr-2" />
            Watchlist
            {stats.watchlist.unreadAlerts > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.watchlist.unreadAlerts}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="policy">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Policy Changes
            {stats.policyChanges.pendingChanges > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.policyChanges.pendingChanges}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="moves">
            <UserCheck className="h-4 w-4 mr-2" />
            Move Detection
            {stats.moveDetection.pendingMoves > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.moveDetection.pendingMoves}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Contact Outcomes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Contact Outcomes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reply Rate</span>
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{stats.outcomes.replyRate}%</span>
                      {getTrendIcon(stats.outcomes.trend)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Coverage Rate</span>
                    <span className="font-medium">{stats.outcomes.coverageRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Outcomes</span>
                    <span className="font-medium">{stats.outcomes.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Watchlist */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  Watchlist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Unread Alerts</span>
                    <Badge variant={stats.watchlist.unreadAlerts > 0 ? "destructive" : "secondary"}>
                      {stats.watchlist.unreadAlerts}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Items</span>
                    <span className="font-medium">{stats.watchlist.activeItems}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Critical Items</span>
                    <Badge variant={stats.watchlist.criticalItems > 0 ? "destructive" : "secondary"}>
                      {stats.watchlist.criticalItems}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Policy Changes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                  Policy Changes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <Badge variant={stats.policyChanges.pendingChanges > 0 ? "destructive" : "secondary"}>
                      {stats.policyChanges.pendingChanges}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Verified</span>
                    <span className="font-medium">{stats.policyChanges.verifiedChanges}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Monitored Outlets</span>
                    <span className="font-medium">{stats.policyChanges.monitoredOutlets}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Move Detection */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <UserCheck className="h-4 w-4 mr-2 text-purple-600" />
                  Move Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending Moves</span>
                    <Badge variant={stats.moveDetection.pendingMoves > 0 ? "destructive" : "secondary"}>
                      {stats.moveDetection.pendingMoves}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Detection Rate</span>
                    <span className="font-medium">{stats.moveDetection.detectionRate}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Detections</span>
                    <span className="font-medium">{stats.moveDetection.totalDetections}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Alerts</CardTitle>
                <CardDescription>Latest notifications requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Critical Policy Change Detected</p>
                      <p className="text-xs text-muted-foreground">
                        Innovation Report changed embargo policy - 2 hours ago
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <UserCheck className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Contact Move Detected</p>
                      <p className="text-xs text-muted-foreground">
                        John Doe moved to Innovation Daily - 4 hours ago
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Users className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Watchlist Alert</p>
                      <p className="text-xs text-muted-foreground">
                        Sarah Johnson published 3 new articles - 6 hours ago
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Positive Outcome</p>
                      <p className="text-xs text-muted-foreground">
                        Coverage published by Tech Weekly - 8 hours ago
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Status</CardTitle>
                <CardDescription>Monitoring and detection system health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Outcome Tracking</span>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Watchlist Monitoring</span>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Policy Monitoring</span>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Move Detection</span>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Last System Check</span>
                      <span>2 minutes ago</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common maintenance tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div 
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setActiveTab('outcomes')}
                >
                  <CheckCircle className="h-6 w-6 text-green-600 mb-2" />
                  <h4 className="font-medium text-sm">Record Outcome</h4>
                  <p className="text-xs text-muted-foreground">Track contact interactions</p>
                </div>
                
                <div 
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setActiveTab('watchlist')}
                >
                  <Users className="h-6 w-6 text-blue-600 mb-2" />
                  <h4 className="font-medium text-sm">Add to Watchlist</h4>
                  <p className="text-xs text-muted-foreground">Monitor contacts/outlets</p>
                </div>
                
                <div 
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setActiveTab('policy')}
                >
                  <AlertTriangle className="h-6 w-6 text-orange-600 mb-2" />
                  <h4 className="font-medium text-sm">Review Changes</h4>
                  <p className="text-xs text-muted-foreground">Verify policy updates</p>
                </div>
                
                <div 
                  className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setActiveTab('moves')}
                >
                  <UserCheck className="h-6 w-6 text-purple-600 mb-2" />
                  <h4 className="font-medium text-sm">Confirm Moves</h4>
                  <p className="text-xs text-muted-foreground">Review contact changes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outcomes">
          <ContactOutcomeTracker />
        </TabsContent>

        <TabsContent value="watchlist">
          <WatchlistManager />
        </TabsContent>

        <TabsContent value="policy">
          <PolicyAlerts />
        </TabsContent>

        <TabsContent value="moves">
          <MoveDetection />
        </TabsContent>
      </Tabs>
    </div>
  );
}