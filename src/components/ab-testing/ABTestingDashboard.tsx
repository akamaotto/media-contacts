/**
 * A/B Testing Dashboard Component
 * Main dashboard for managing and monitoring A/B tests
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Experiment, 
  ExperimentVariant, 
  ExperimentMetrics,
  abTestingService 
} from '@/lib/feature-flags/ab-testing-service';
import { 
  ExperimentConfig, 
  ExperimentStatus, 
  experimentConfigService 
} from '@/lib/ab-testing/experiment-config-service';
import { 
  ExperimentAnalytics, 
  abTestingAnalytics 
} from '@/lib/analytics/ab-testing-analytics';
import { 
  UserSegment, 
  userSegmentationService 
} from '@/lib/ab-testing/user-segmentation-service';
import { 
  StatisticalTestResult, 
  statisticalAnalyzer 
} from '@/lib/ab-testing/statistical-analysis';
import { 
  PlusIcon, 
  PlayIcon, 
  PauseIcon, 
  StopIcon, 
  BarChart3Icon, 
  UsersIcon, 
  TrendingUpIcon,
  EyeIcon,
  SettingsIcon,
  DownloadIcon,
  RefreshCwIcon
} from 'lucide-react';

interface DashboardStats {
  totalExperiments: number;
  runningExperiments: number;
  completedExperiments: number;
  totalParticipants: number;
  averageConversionRate: number;
  totalRevenueImpact: number;
}

interface ExperimentWithAnalytics extends Experiment {
  analytics?: ExperimentAnalytics;
  config?: ExperimentConfig;
}

export default function ABTestingDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [experiments, setExperiments] = useState<ExperimentWithAnalytics[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<ExperimentWithAnalytics | null>(null);
  const [segments, setSegments] = useState<UserSegment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalExperiments: 0,
    runningExperiments: 0,
    completedExperiments: 0,
    totalParticipants: 0,
    averageConversionRate: 0,
    totalRevenueImpact: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [newExperimentForm, setNewExperimentForm] = useState({
    name: '',
    description: '',
    hypothesis: '',
    flagId: '',
    trafficAllocation: 50,
    variants: [
      { name: 'Control', isControl: true, trafficWeight: 50, config: {} },
      { name: 'Variant A', isControl: false, trafficWeight: 50, config: {} }
    ]
  });

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load experiments
      const allExperiments = abTestingService.getAllExperiments();
      const experimentsWithAnalytics: ExperimentWithAnalytics[] = [];
      
      for (const experiment of allExperiments) {
        try {
          const analytics = await abTestingAnalytics.analyzeExperiment(experiment.id);
          const config = experimentConfigService.getExperiment(experiment.id);
          experimentsWithAnalytics.push({ ...experiment, analytics, config });
        } catch (error) {
          console.error(`Failed to load analytics for experiment ${experiment.id}:`, error);
          experimentsWithAnalytics.push(experiment);
        }
      }
      
      setExperiments(experimentsWithAnalytics);
      
      // Load segments
      const allSegments = userSegmentationService.getAllSegments();
      setSegments(allSegments);
      
      // Calculate stats
      calculateDashboardStats(experimentsWithAnalytics);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDashboardStats = (experiments: ExperimentWithAnalytics[]) => {
    const stats: DashboardStats = {
      totalExperiments: experiments.length,
      runningExperiments: experiments.filter(exp => exp.status === 'running').length,
      completedExperiments: experiments.filter(exp => exp.status === 'completed').length,
      totalParticipants: experiments.reduce((sum, exp) => {
        return sum + (exp.analytics?.metrics.overallMetrics.totalParticipants || 0);
      }, 0),
      averageConversionRate: experiments.reduce((sum, exp) => {
        return sum + (exp.analytics?.metrics.overallMetrics.overallConversionRate || 0);
      }, 0) / Math.max(experiments.length, 1),
      totalRevenueImpact: experiments.reduce((sum, exp) => {
        return sum + (exp.analytics?.businessImpact.revenueImpact || 0);
      }, 0)
    };
    
    setStats(stats);
  };

  const handleCreateExperiment = async () => {
    try {
      // Create experiment configuration
      const config = await experimentConfigService.createExperiment({
        name: newExperimentForm.name,
        description: newExperimentForm.description,
        hypothesis: newExperimentForm.hypothesis,
        successMetrics: [
          {
            id: 'conversion_rate',
            name: 'Conversion Rate',
            type: 'conversion',
            description: 'Primary conversion metric',
            isPrimary: true,
            calculationMethod: 'rate',
            eventTriggers: ['conversion', 'page_view']
          }
        ],
        targetingRules: [
          {
            id: 'all_users',
            name: 'All Users',
            type: 'include',
            conditions: []
          }
        ],
        variants: newExperimentForm.variants.map((variant, index) => ({
          id: `variant_${index}`,
          name: variant.name,
          description: `${variant.name} variant`,
          isControl: variant.isControl,
          trafficWeight: variant.trafficWeight,
          config: variant.config,
          overrides: {},
          triggers: [],
          customizations: [],
          implementationStatus: 'ready'
        })),
        trafficAllocation: newExperimentForm.trafficAllocation,
        duration: { type: 'fixed', minimumDuration: 14 },
        status: 'draft',
        priority: 'medium',
        tags: [],
        owner: 'current_user', // Would get from auth context
        createdBy: 'current_user',
        updatedBy: 'current_user',
        metadata: {}
      }, 'current_user');

      // Create A/B test experiment
      await abTestingService.createExperiment({
        name: newExperimentForm.name,
        description: newExperimentForm.description,
        flagId: newExperimentForm.flagId,
        flagKey: newExperimentForm.flagId,
        trafficAllocation: newExperimentForm.trafficAllocation,
        variants: newExperimentForm.variants.map((variant, index) => ({
          name: variant.name,
          description: `${variant.name} variant`,
          isControl: variant.isControl,
          trafficWeight: variant.trafficWeight,
          config: variant.config
        })),
        targetMetrics: ['conversion_rate']
      }, 'current_user');

      // Reset form and close dialog
      setNewExperimentForm({
        name: '',
        description: '',
        hypothesis: '',
        flagId: '',
        trafficAllocation: 50,
        variants: [
          { name: 'Control', isControl: true, trafficWeight: 50, config: {} },
          { name: 'Variant A', isControl: false, trafficWeight: 50, config: {} }
        ]
      });
      setShowCreateDialog(false);
      
      // Reload data
      loadDashboardData();
    } catch (error) {
      console.error('Failed to create experiment:', error);
    }
  };

  const handleStartExperiment = async (experimentId: string) => {
    try {
      await abTestingService.startExperiment(experimentId, 'current_user');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to start experiment:', error);
    }
  };

  const handlePauseExperiment = async (experimentId: string) => {
    try {
      await abTestingService.pauseExperiment(experimentId, 'current_user');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to pause experiment:', error);
    }
  };

  const handleCompleteExperiment = async (experimentId: string) => {
    try {
      await abTestingService.completeExperiment(experimentId, 'current_user');
      loadDashboardData();
    } catch (error) {
      console.error('Failed to complete experiment:', error);
    }
  };

  const getStatusBadgeVariant = (status: ExperimentStatus) => {
    switch (status) {
      case 'running':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'paused':
        return 'outline';
      case 'draft':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCwIcon className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading A/B Testing Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">A/B Testing Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and monitor your A/B tests for the "Find Contacts with AI" feature
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          New Experiment
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Experiments</CardTitle>
            <BarChart3Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExperiments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.runningExperiments} running
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Running Tests</CardTitle>
            <PlayIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.runningExperiments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedExperiments} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalParticipants.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all experiments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Conversion</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(stats.averageConversionRate)}</div>
            <p className="text-xs text-muted-foreground">
              Across all experiments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Impact</CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenueImpact)}</div>
            <p className="text-xs text-muted-foreground">
              Total impact
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Segments</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments.filter(s => s.isActive).length}</div>
            <p className="text-xs text-muted-foreground">
              {segments.length} total segments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Experiments</CardTitle>
                <CardDescription>
                  Latest A/B test experiments and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {experiments.slice(0, 5).map((experiment) => (
                    <div key={experiment.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusBadgeVariant(experiment.status)}>
                          {experiment.status}
                        </Badge>
                        <span className="font-medium">{experiment.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {experiment.analytics?.metrics.overallMetrics.totalParticipants || 0} participants
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedExperiment(experiment);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>
                  Key performance indicators across all experiments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Best Performing Variant</span>
                    <span className="text-sm">
                      {experiments
                        .filter(exp => exp.analytics?.statisticalAnalysis.winner)
                        .map(exp => exp.analytics?.statisticalAnalysis.winner?.variantName)
                        .filter(Boolean)
                        .slice(0, 1)
                        .join(', ') || 'No winner yet'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Average Lift</span>
                    <span className="text-sm">
                      {formatPercentage(
                        experiments.reduce((sum, exp) => {
                          const winner = exp.analytics?.statisticalAnalysis.winner;
                          return sum + (winner?.lift || 0) / 100;
                        }, 0) / Math.max(experiments.length, 1)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Statistical Significance</span>
                    <span className="text-sm">
                      {formatPercentage(
                        experiments.reduce((sum, exp) => {
                          const significant = exp.analytics?.statisticalAnalysis.winner?.confidence || 0;
                          return sum + significant;
                        }, 0) / Math.max(experiments.length, 1)
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="experiments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Experiments</CardTitle>
              <CardDescription>
                Manage and monitor all A/B test experiments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Conversion Rate</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {experiments.map((experiment) => (
                    <TableRow key={experiment.id}>
                      <TableCell className="font-medium">
                        {experiment.name}
                        {experiment.analytics?.statisticalAnalysis.winner && (
                          <Badge variant="secondary" className="ml-2">
                            Winner: {experiment.analytics.statisticalAnalysis.winner.variantName}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(experiment.status)}>
                          {experiment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {experiment.analytics?.metrics.overallMetrics.totalParticipants || 0}
                      </TableCell>
                      <TableCell>
                        {formatPercentage(
                          experiment.analytics?.metrics.overallMetrics.overallConversionRate || 0
                        )}
                      </TableCell>
                      <TableCell>
                        {experiment.analytics?.statisticalAnalysis.winner ? (
                          <div className="flex items-center space-x-2">
                            <span>
                              {formatPercentage(experiment.analytics.statisticalAnalysis.winner.confidence)}
                            </span>
                            <Progress
                              value={experiment.analytics.statisticalAnalysis.winner.confidence * 100}
                              className="w-16"
                            />
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {experiment.status === 'draft' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartExperiment(experiment.id)}
                            >
                              <PlayIcon className="h-4 w-4" />
                            </Button>
                          )}
                          {experiment.status === 'running' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePauseExperiment(experiment.id)}
                            >
                              <PauseIcon className="h-4 w-4" />
                            </Button>
                          )}
                          {experiment.status === 'paused' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStartExperiment(experiment.id)}
                            >
                              <PlayIcon className="h-4 w-4" />
                            </Button>
                          )}
                          {experiment.status === 'running' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCompleteExperiment(experiment.id)}
                            >
                              <StopIcon className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedExperiment(experiment);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Segments</CardTitle>
              <CardDescription>
                Manage user segments for targeted experiments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>User Count</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.map((segment) => (
                    <TableRow key={segment.id}>
                      <TableCell className="font-medium">{segment.name}</TableCell>
                      <TableCell>{segment.description}</TableCell>
                      <TableCell>{segment.userCount}</TableCell>
                      <TableCell>
                        <Badge variant={segment.isActive ? 'default' : 'outline'}>
                          {segment.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <SettingsIcon className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Overview</CardTitle>
              <CardDescription>
                Deep dive into experiment performance and statistical analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3Icon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Advanced Analytics</h3>
                <p className="text-muted-foreground mb-4">
                  Detailed analytics and visualizations will be available here.
                </p>
                <Button variant="outline">
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Experiment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Experiment</DialogTitle>
            <DialogDescription>
              Configure a new A/B test experiment for the "Find Contacts with AI" feature.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newExperimentForm.name}
                onChange={(e) => setNewExperimentForm(prev => ({ ...prev, name: e.target.value }))}
                className="col-span-3"
                placeholder="Experiment name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={newExperimentForm.description}
                onChange={(e) => setNewExperimentForm(prev => ({ ...prev, description: e.target.value }))}
                className="col-span-3"
                placeholder="Experiment description"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hypothesis" className="text-right">
                Hypothesis
              </Label>
              <Textarea
                id="hypothesis"
                value={newExperimentForm.hypothesis}
                onChange={(e) => setNewExperimentForm(prev => ({ ...prev, hypothesis: e.target.value }))}
                className="col-span-3"
                placeholder="What do you want to test?"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="flagId" className="text-right">
                Feature Flag
              </Label>
              <Select
                value={newExperimentForm.flagId}
                onValueChange={(value) => setNewExperimentForm(prev => ({ ...prev, flagId: value }))}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select feature flag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai-search-enabled">AI Search Enabled</SelectItem>
                  <SelectItem value="ai-search-advanced-options">AI Search Advanced Options</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="traffic" className="text-right">
                Traffic Allocation
              </Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Input
                  id="traffic"
                  type="number"
                  min="1"
                  max="100"
                  value={newExperimentForm.trafficAllocation}
                  onChange={(e) => setNewExperimentForm(prev => ({ ...prev, trafficAllocation: parseInt(e.target.value) || 0 }))}
                  className="w-20"
                />
                <span>%</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateExperiment}>
              Create Experiment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Experiment Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Experiment Details</DialogTitle>
            <DialogDescription>
              Detailed view of experiment performance and configuration.
            </DialogDescription>
          </DialogHeader>
          {selectedExperiment && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {selectedExperiment.name}</div>
                    <div><strong>Description:</strong> {selectedExperiment.description}</div>
                    <div><strong>Status:</strong> {selectedExperiment.status}</div>
                    <div><strong>Traffic Allocation:</strong> {selectedExperiment.trafficAllocation}%</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Performance</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <strong>Participants:</strong>{' '}
                      {selectedExperiment.analytics?.metrics.overallMetrics.totalParticipants || 0}
                    </div>
                    <div>
                      <strong>Conversion Rate:</strong>{' '}
                      {formatPercentage(
                        selectedExperiment.analytics?.metrics.overallMetrics.overallConversionRate || 0
                      )}
                    </div>
                    <div>
                      <strong>Revenue Impact:</strong>{' '}
                      {formatCurrency(
                        selectedExperiment.analytics?.businessImpact.revenueImpact || 0
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {selectedExperiment.analytics?.statisticalAnalysis.winner && (
                <div>
                  <h4 className="font-medium mb-2">Statistical Winner</h4>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {selectedExperiment.analytics.statisticalAnalysis.winner.variantName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Lift: {selectedExperiment.analytics.statisticalAnalysis.winner.lift.toFixed(2)}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatPercentage(selectedExperiment.analytics.statisticalAnalysis.winner.confidence)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Risk: {selectedExperiment.analytics.statisticalAnalysis.winner.risk}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <h4 className="font-medium mb-2">Variants</h4>
                <div className="space-y-2">
                  {selectedExperiment.variants.map((variant) => (
                    <div key={variant.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {variant.name}
                            {variant.isControl && (
                              <Badge variant="outline" className="ml-2">Control</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Traffic: {variant.trafficWeight}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {formatPercentage(variant.results?.conversionRate || 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {variant.results?.participants || 0} participants
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}