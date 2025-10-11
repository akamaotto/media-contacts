/**
 * Feature Flags Dashboard
 * Main dashboard for managing feature flags
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  featureFlagClient,
  type FeatureFlag,
  type CreateFlagData
} from '@/lib/api/feature-flag-client';
import { 
  Flag, 
  Plus, 
  Settings, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Users,
  Clock,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  FileText,
  BarChart3
} from 'lucide-react';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export default function FeatureFlagsDashboard() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Form state for creating/editing flags
  const [formData, setFormData] = useState<CreateFlagData>({
    name: '',
    description: '',
    type: 'release',
    enabled: false,
    rolloutPercentage: 0,
    userSegments: [],
    metadata: {}
  });

  // Fetch feature flags
  const fetchFlags = async () => {
    try {
      setLoading(true);
      const flags = await featureFlagClient.getAllFlags();
      setFlags(flags);
    } catch (err) {
      setError('An error occurred while fetching feature flags');
    } finally {
      setLoading(false);
    }
  };

  // Initialize feature flags
  const initializeFlags = async () => {
    try {
      await featureFlagClient.initializeFlags();
      await fetchFlags();
    } catch (err) {
      setError('An error occurred while initializing feature flags');
    }
  };

  // Toggle flag enabled state
  const toggleFlag = async (flagId: string, enabled: boolean) => {
    try {
      await featureFlagClient.toggleFlag(flagId, enabled, 'current-user');
      await fetchFlags();
    } catch (err) {
      setError('An error occurred while updating the flag');
    }
  };

  // Update rollout percentage
  const updateRollout = async (flagId: string, percentage: number) => {
    try {
      await featureFlagClient.updateFeatureFlagRolloutPercentage(flagId, percentage, 'current-user');
      await fetchFlags();
    } catch (err) {
      setError('An error occurred while updating the rollout');
    }
  };

  // Emergency rollback
  const emergencyRollback = async (flagId: string) => {
    try {
      await featureFlagClient.emergencyRollbackFeatureFlag(
        flagId,
        'Emergency rollback via dashboard',
        'current-user'
      );
      await fetchFlags();
    } catch (err) {
      setError('An error occurred while performing emergency rollback');
    }
  };

  // Create new flag
  const createFlag = async () => {
    try {
      await featureFlagClient.createFlag(formData, 'current-user');
      setIsCreateModalOpen(false);
      resetForm();
      await fetchFlags();
    } catch (err) {
      setError('An error occurred while creating the flag');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'release',
      enabled: false,
      rolloutPercentage: 0,
      userSegments: [],
      metadata: {}
    });
  };

  // Refresh data
  const refreshData = async () => {
    setRefreshing(true);
    await fetchFlags();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  // Get flag type color
  const getFlagTypeColor = (type: string) => {
    switch (type) {
      case 'release': return 'bg-blue-100 text-blue-800';
      case 'experiment': return 'bg-purple-100 text-purple-800';
      case 'ops': return 'bg-green-100 text-green-800';
      case 'permission': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get flag status icon
  const getFlagStatusIcon = (flag: FeatureFlag) => {
    if (!flag.enabled) return <XCircle className="h-4 w-4 text-red-500" />;
    if (flag.rolloutPercentage === 100) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">
            Manage and monitor feature flags for gradual rollout
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={refreshData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Flag
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
                <Flag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{flags.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enabled</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {flags.filter(f => f.enabled).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Rollout</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {flags.filter(f => f.enabled && f.rolloutPercentage > 0 && f.rolloutPercentage < 100).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fully Rolled Out</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {flags.filter(f => f.enabled && f.rolloutPercentage === 100).length}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {flags.map((flag) => (
              <Card key={flag.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getFlagStatusIcon(flag)}
                      <CardTitle className="text-lg">{flag.name}</CardTitle>
                      <Badge className={getFlagTypeColor(flag.type)}>
                        {flag.type}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => emergencyRollout(flag.id)}
                        disabled={!flag.enabled}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFlag(flag);
                          setFormData({
                            name: flag.name,
                            description: flag.description,
                            type: flag.type,
                            enabled: flag.enabled,
                            rolloutPercentage: flag.rolloutPercentage,
                            userSegments: flag.userSegments,
                            metadata: flag.metadata
                          });
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>{flag.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={(checked) => toggleFlag(flag.id, checked)}
                      />
                      <Label>{flag.enabled ? 'Enabled' : 'Disabled'}</Label>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {flag.rolloutPercentage}% rollout
                    </div>
                  </div>
                  
                  {flag.enabled && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Rollout Percentage</Label>
                        <span className="text-sm font-medium">{flag.rolloutPercentage}%</span>
                      </div>
                      <Progress value={flag.rolloutPercentage} className="h-2" />
                      <Slider
                        value={[flag.rolloutPercentage]}
                        onValueChange={([value]) => updateRollout(flag.id, value)}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{flag.userSegments.join(', ')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(flag.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flag Analytics</CardTitle>
              <CardDescription>
                Monitor the performance and usage of your feature flags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <p>Analytics dashboard coming soon</p>
                <p className="text-sm">View detailed metrics, usage patterns, and performance data</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
              <CardDescription>
                Track all changes to your feature flags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>Audit log coming soon</p>
                <p className="text-sm">View detailed history of all flag changes and rollouts</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Flag Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Create New Feature Flag</CardTitle>
              <CardDescription>
                Define a new feature flag for gradual rollout
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter flag name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this flag controls"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="release">Release</SelectItem>
                    <SelectItem value="experiment">Experiment</SelectItem>
                    <SelectItem value="ops">Operations</SelectItem>
                    <SelectItem value="permission">Permission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rollout">Initial Rollout Percentage</Label>
                <div className="space-y-2">
                  <Slider
                    value={[formData.rolloutPercentage]}
                    onValueChange={([value]) => setFormData({ ...formData, rolloutPercentage: value })}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="text-center text-sm font-medium">{formData.rolloutPercentage}%</div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={createFlag}>
                  Create Flag
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}