'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PolicyChange {
  id: string;
  outletId: string;
  outletName: string;
  outletDomain: string;
  changeType: 'contact_policy' | 'submission_guidelines' | 'embargo_policy' | 'press_release_policy';
  severity: 'minor' | 'major' | 'critical';
  status: 'detected' | 'verified' | 'false_positive' | 'acknowledged';
  title: string;
  description: string;
  oldPolicy?: string;
  newPolicy?: string;
  detectedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  confidence: number;
  impactedContacts: number;
  metadata: {
    sourceUrl: string;
    changeIndicators: string[];
    lastChecked: Date;
    checkFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

interface PolicyMonitoringConfig {
  id: string;
  outletId: string;
  outletName: string;
  outletDomain: string;
  isActive: boolean;
  checkFrequency: 'daily' | 'weekly' | 'monthly';
  monitoredSections: string[];
  alertThreshold: number;
  lastChecked: Date;
  nextCheck: Date;
  totalChanges: number;
  createdAt: Date;
}

export function PolicyAlerts() {
  const [policyChanges, setPolicyChanges] = useState<PolicyChange[]>([]);
  const [monitoringConfigs, setMonitoringConfigs] = useState<PolicyMonitoringConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('changes');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  useEffect(() => {
    const mockPolicyChanges: PolicyChange[] = [
      {
        id: '1',
        outletId: 'outlet-1',
        outletName: 'Tech Weekly',
        outletDomain: 'techweekly.com',
        changeType: 'contact_policy',
        severity: 'major',
        status: 'detected',
        title: 'Contact Policy Updated',
        description: 'The outlet has updated their media contact policy, changing preferred contact methods and response times.',
        oldPolicy: 'Email preferred, 24-48 hour response time',
        newPolicy: 'Phone calls only for breaking news, 72 hour response time for emails',
        detectedAt: new Date('2024-01-22T09:30:00Z'),
        confidence: 0.87,
        impactedContacts: 3,
        metadata: {
          sourceUrl: 'https://techweekly.com/contact-us',
          changeIndicators: ['contact method preference', 'response time change'],
          lastChecked: new Date('2024-01-22T09:30:00Z'),
          checkFrequency: 'daily'
        }
      },
      {
        id: '2',
        outletId: 'outlet-2',
        outletName: 'Business Daily',
        outletDomain: 'businessdaily.com',
        changeType: 'submission_guidelines',
        severity: 'minor',
        status: 'verified',
        title: 'Submission Guidelines Modified',
        description: 'Updated press release submission format requirements.',
        oldPolicy: 'PDF and Word documents accepted',
        newPolicy: 'Only PDF documents accepted, maximum 2 pages',
        detectedAt: new Date('2024-01-20T14:15:00Z'),
        verifiedAt: new Date('2024-01-21T10:00:00Z'),
        verifiedBy: 'user-1',
        confidence: 0.95,
        impactedContacts: 7,
        metadata: {
          sourceUrl: 'https://businessdaily.com/press-submissions',
          changeIndicators: ['format requirements', 'length restrictions'],
          lastChecked: new Date('2024-01-22T08:00:00Z'),
          checkFrequency: 'weekly'
        }
      },
      {
        id: '3',
        outletId: 'outlet-3',
        outletName: 'Innovation Report',
        outletDomain: 'innovationreport.com',
        changeType: 'embargo_policy',
        severity: 'critical',
        status: 'detected',
        title: 'Embargo Policy Changed',
        description: 'Significant changes to embargo handling and timing requirements.',
        oldPolicy: '24-hour embargo minimum',
        newPolicy: '72-hour embargo minimum, no weekend releases',
        detectedAt: new Date('2024-01-21T16:45:00Z'),
        confidence: 0.92,
        impactedContacts: 12,
        metadata: {
          sourceUrl: 'https://innovationreport.com/editorial-guidelines',
          changeIndicators: ['embargo timing', 'release restrictions'],
          lastChecked: new Date('2024-01-21T16:45:00Z'),
          checkFrequency: 'daily'
        }
      }
    ];

    const mockMonitoringConfigs: PolicyMonitoringConfig[] = [
      {
        id: '1',
        outletId: 'outlet-1',
        outletName: 'Tech Weekly',
        outletDomain: 'techweekly.com',
        isActive: true,
        checkFrequency: 'daily',
        monitoredSections: ['contact-us', 'press-guidelines', 'editorial-policy'],
        alertThreshold: 0.8,
        lastChecked: new Date('2024-01-22T09:30:00Z'),
        nextCheck: new Date('2024-01-23T09:30:00Z'),
        totalChanges: 5,
        createdAt: new Date('2024-01-01T00:00:00Z')
      },
      {
        id: '2',
        outletId: 'outlet-2',
        outletName: 'Business Daily',
        outletDomain: 'businessdaily.com',
        isActive: true,
        checkFrequency: 'weekly',
        monitoredSections: ['press-submissions', 'contact-policy'],
        alertThreshold: 0.7,
        lastChecked: new Date('2024-01-20T14:15:00Z'),
        nextCheck: new Date('2024-01-27T14:15:00Z'),
        totalChanges: 2,
        createdAt: new Date('2023-12-15T00:00:00Z')
      },
      {
        id: '3',
        outletId: 'outlet-3',
        outletName: 'Innovation Report',
        outletDomain: 'innovationreport.com',
        isActive: false,
        checkFrequency: 'monthly',
        monitoredSections: ['editorial-guidelines'],
        alertThreshold: 0.9,
        lastChecked: new Date('2024-01-15T10:00:00Z'),
        nextCheck: new Date('2024-02-15T10:00:00Z'),
        totalChanges: 1,
        createdAt: new Date('2024-01-10T00:00:00Z')
      }
    ];

    setPolicyChanges(mockPolicyChanges);
    setMonitoringConfigs(mockMonitoringConfigs);
    setLoading(false);
  }, []);

  const getSeverityColor = (severity: PolicyChange['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'major': return 'bg-orange-100 text-orange-800';
      case 'minor': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: PolicyChange['status']) => {
    switch (status) {
      case 'detected': return 'bg-blue-100 text-blue-800';
      case 'verified': return 'bg-green-100 text-green-800';
      case 'false_positive': return 'bg-gray-100 text-gray-800';
      case 'acknowledged': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: PolicyChange['status']) => {
    switch (status) {
      case 'detected': return <AlertTriangle className="h-4 w-4" />;
      case 'verified': return <CheckCircle className="h-4 w-4" />;
      case 'false_positive': return <XCircle className="h-4 w-4" />;
      case 'acknowledged': return <Clock className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const filteredChanges = policyChanges.filter(change => {
    if (filterStatus !== 'all' && change.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && change.severity !== filterSeverity) return false;
    return true;
  });

  const pendingChanges = policyChanges.filter(change => change.status === 'detected');
  const verifiedChanges = policyChanges.filter(change => change.status === 'verified');

  const handleUpdateStatus = async (changeId: string, newStatus: PolicyChange['status']) => {
    try {
      setPolicyChanges(prev => 
        prev.map(change => 
          change.id === changeId 
            ? { 
                ...change, 
                status: newStatus,
                verifiedAt: newStatus === 'verified' ? new Date() : change.verifiedAt,
                verifiedBy: newStatus === 'verified' ? 'current-user' : change.verifiedBy
              }
            : change
        )
      );
      
      toast({
        title: 'Status Updated',
        description: `Policy change marked as ${newStatus.replace('_', ' ')}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleMonitoring = async (configId: string, isActive: boolean) => {
    try {
      setMonitoringConfigs(prev => 
        prev.map(config => 
          config.id === configId ? { ...config, isActive } : config
        )
      );
      
      toast({
        title: isActive ? 'Monitoring Enabled' : 'Monitoring Disabled',
        description: `Policy monitoring has been ${isActive ? 'enabled' : 'disabled'} for this outlet.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update monitoring status.',
        variant: 'destructive',
      });
    }
  };

  const handleForceCheck = async (configId: string) => {
    try {
      setMonitoringConfigs(prev => 
        prev.map(config => 
          config.id === configId 
            ? { ...config, lastChecked: new Date() }
            : config
        )
      );
      
      toast({
        title: 'Check Initiated',
        description: 'Policy check has been initiated for this outlet.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to initiate policy check.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingChanges.length}</div>
            <p className="text-xs text-muted-foreground">
              Require verification
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedChanges.length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monitored Outlets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitoringConfigs.length}</div>
            <p className="text-xs text-muted-foreground">
              {monitoringConfigs.filter(config => config.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {policyChanges.filter(change => change.severity === 'critical').length}
            </div>
            <p className="text-xs text-muted-foreground">
              High priority
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Policy Change Monitoring</CardTitle>
              <CardDescription>
                Monitor outlet policy changes and manage verification
              </CardDescription>
            </div>
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Monitoring
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Configure Policy Monitoring</DialogTitle>
                  <DialogDescription>
                    Set up monitoring for outlet policy changes
                  </DialogDescription>
                </DialogHeader>
                <div className="text-center py-8 text-muted-foreground">
                  Configuration interface would be implemented here
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="changes">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Policy Changes ({pendingChanges.length})
              </TabsTrigger>
              <TabsTrigger value="monitoring">
                <Settings className="h-4 w-4 mr-2" />
                Monitoring Config
              </TabsTrigger>
            </TabsList>

            <TabsContent value="changes" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Label>Status:</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="detected">Detected</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="false_positive">False Positive</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Label>Severity:</Label>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="major">Major</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Policy Changes */}
              <div className="space-y-4">
                {filteredChanges.map((change) => (
                  <Card key={change.id} className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {getStatusIcon(change.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium">{change.title}</h4>
                              <Badge className={getSeverityColor(change.severity)}>
                                {change.severity}
                              </Badge>
                              <Badge className={getStatusColor(change.status)}>
                                {change.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-sm font-medium">{change.outletName}</span>
                              <Badge variant="outline">{change.outletDomain}</Badge>
                              <Badge variant="secondary">{change.changeType.replace('_', ' ')}</Badge>
                            </div>
                            
                            <p className="text-sm mb-3">{change.description}</p>
                            
                            {change.oldPolicy && change.newPolicy && (
                              <div className="bg-gray-50 p-3 rounded-md mb-3">
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <span className="font-medium text-red-600">Before: </span>
                                    <span>{change.oldPolicy}</span>
                                  </div>
                                  <div>
                                    <span className="font-medium text-green-600">After: </span>
                                    <span>{change.newPolicy}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-3">
                              <span>Detected: {change.detectedAt.toLocaleString()}</span>
                              <span>Confidence: {(change.confidence * 100).toFixed(0)}%</span>
                              <span>Impacts {change.impactedContacts} contacts</span>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <a
                                href={change.metadata.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex items-center"
                              >
                                View Source <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          {change.status === 'detected' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(change.id, 'verified')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Verify
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(change.id, 'false_positive')}
                              >
                                False Positive
                              </Button>
                            </>
                          )}
                          
                          {change.status === 'verified' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateStatus(change.id, 'acknowledged')}
                            >
                              Acknowledge
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredChanges.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No policy changes found matching the current filters.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="monitoring" className="space-y-4">
              <div className="space-y-4">
                {monitoringConfigs.map((config) => (
                  <Card key={config.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{config.outletName}</h4>
                            <Badge variant="outline">{config.outletDomain}</Badge>
                            <Badge variant="secondary">{config.checkFrequency}</Badge>
                            {config.isActive ? (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Monitored sections: </span>
                              {config.monitoredSections.join(', ')}
                            </div>
                            <div>
                              <span className="font-medium">Alert threshold: </span>
                              {(config.alertThreshold * 100).toFixed(0)}%
                            </div>
                            <div>
                              <span className="font-medium">Last checked: </span>
                              {config.lastChecked.toLocaleString()}
                            </div>
                            <div>
                              <span className="font-medium">Next check: </span>
                              {config.nextCheck.toLocaleString()}
                            </div>
                            <div>
                              <span className="font-medium">Total changes detected: </span>
                              {config.totalChanges}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleForceCheck(config.id)}
                            disabled={!config.isActive}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Check Now
                          </Button>
                          <Switch
                            checked={config.isActive}
                            onCheckedChange={(checked) => handleToggleMonitoring(config.id, checked)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {monitoringConfigs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No monitoring configurations found.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}