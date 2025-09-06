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
import { UserCheck, UserX, ArrowRight, AlertCircle, CheckCircle, XCircle, RefreshCw, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContactMove {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  previousOutlet: {
    id: string;
    name: string;
    domain: string;
  };
  newOutlet: {
    id: string;
    name: string;
    domain: string;
  };
  moveType: 'job_change' | 'outlet_change' | 'role_change' | 'promotion';
  confidence: number;
  status: 'detected' | 'confirmed' | 'rejected' | 'updated';
  detectionMethod: 'byline_analysis' | 'email_change' | 'social_media' | 'manual_report';
  detectedAt: Date;
  confirmedAt?: Date;
  confirmedBy?: string;
  evidence: {
    type: 'byline' | 'email' | 'social' | 'bio';
    source: string;
    content: string;
    timestamp: Date;
  }[];
  impactAssessment: {
    relationshipStrength: 'weak' | 'moderate' | 'strong';
    communicationHistory: number;
    lastContact: Date;
    campaignInvolvement: string[];
  };
  recommendedAction: 'update_contact' | 'create_new' | 'archive_old' | 'no_action';
  notes?: string;
}

interface MoveDetectionConfig {
  id: string;
  isEnabled: boolean;
  detectionMethods: {
    bylineAnalysis: boolean;
    emailTracking: boolean;
    socialMediaMonitoring: boolean;
  };
  confidenceThreshold: number;
  checkFrequency: 'daily' | 'weekly' | 'monthly';
  autoUpdateThreshold: number;
  notificationSettings: {
    immediate: boolean;
    digest: boolean;
    digestFrequency: 'daily' | 'weekly';
  };
  lastRun: Date;
  nextRun: Date;
  totalDetections: number;
}

export function MoveDetection() {
  const [contactMoves, setContactMoves] = useState<ContactMove[]>([]);
  const [config, setConfig] = useState<MoveDetectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('moves');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterConfidence, setFilterConfidence] = useState<string>('all');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  useEffect(() => {
    const mockContactMoves: ContactMove[] = [
      {
        id: '1',
        contactId: 'contact-1',
        contactName: 'John Doe',
        contactEmail: 'john.doe@techreporter.com',
        previousOutlet: {
          id: 'outlet-1',
          name: 'Tech Reporter',
          domain: 'techreporter.com'
        },
        newOutlet: {
          id: 'outlet-2',
          name: 'Innovation Daily',
          domain: 'innovationdaily.com'
        },
        moveType: 'job_change',
        confidence: 0.87,
        status: 'detected',
        detectionMethod: 'byline_analysis',
        detectedAt: new Date('2024-01-22T10:30:00Z'),
        evidence: [
          {
            type: 'byline',
            source: 'https://innovationdaily.com/tech-trends-2024',
            content: 'By John Doe, Senior Technology Reporter',
            timestamp: new Date('2024-01-22T08:00:00Z')
          },
          {
            type: 'social',
            source: 'LinkedIn',
            content: 'Excited to join Innovation Daily as Senior Technology Reporter!',
            timestamp: new Date('2024-01-20T14:30:00Z')
          }
        ],
        impactAssessment: {
          relationshipStrength: 'strong',
          communicationHistory: 15,
          lastContact: new Date('2024-01-15T00:00:00Z'),
          campaignInvolvement: ['AI Product Launch', 'Tech Trends Report']
        },
        recommendedAction: 'update_contact'
      },
      {
        id: '2',
        contactId: 'contact-2',
        contactName: 'Sarah Johnson',
        contactEmail: 'sarah.johnson@businessweekly.com',
        previousOutlet: {
          id: 'outlet-3',
          name: 'Business Weekly',
          domain: 'businessweekly.com'
        },
        newOutlet: {
          id: 'outlet-4',
          name: 'Financial Times',
          domain: 'ft.com'
        },
        moveType: 'promotion',
        confidence: 0.95,
        status: 'confirmed',
        detectionMethod: 'email_change',
        detectedAt: new Date('2024-01-20T16:45:00Z'),
        confirmedAt: new Date('2024-01-21T09:00:00Z'),
        confirmedBy: 'user-1',
        evidence: [
          {
            type: 'email',
            source: 'Email bounce notification',
            content: 'Email bounced from sarah.johnson@businessweekly.com',
            timestamp: new Date('2024-01-20T16:45:00Z')
          },
          {
            type: 'byline',
            source: 'https://ft.com/business-analysis',
            content: 'By Sarah Johnson, Senior Business Editor',
            timestamp: new Date('2024-01-21T07:30:00Z')
          }
        ],
        impactAssessment: {
          relationshipStrength: 'moderate',
          communicationHistory: 8,
          lastContact: new Date('2024-01-10T00:00:00Z'),
          campaignInvolvement: ['Q4 Earnings Report']
        },
        recommendedAction: 'create_new'
      },
      {
        id: '3',
        contactId: 'contact-3',
        contactName: 'Mike Wilson',
        contactEmail: 'mike.wilson@startupnews.com',
        previousOutlet: {
          id: 'outlet-5',
          name: 'Startup News',
          domain: 'startupnews.com'
        },
        newOutlet: {
          id: 'outlet-6',
          name: 'Venture Beat',
          domain: 'venturebeat.com'
        },
        moveType: 'role_change',
        confidence: 0.72,
        status: 'rejected',
        detectionMethod: 'social_media',
        detectedAt: new Date('2024-01-18T12:15:00Z'),
        evidence: [
          {
            type: 'social',
            source: 'Twitter',
            content: 'Great interview with VentureBeat team today!',
            timestamp: new Date('2024-01-18T11:00:00Z')
          }
        ],
        impactAssessment: {
          relationshipStrength: 'weak',
          communicationHistory: 3,
          lastContact: new Date('2023-12-20T00:00:00Z'),
          campaignInvolvement: []
        },
        recommendedAction: 'no_action',
        notes: 'False positive - was just conducting an interview'
      }
    ];

    const mockConfig: MoveDetectionConfig = {
      id: 'config-1',
      isEnabled: true,
      detectionMethods: {
        bylineAnalysis: true,
        emailTracking: true,
        socialMediaMonitoring: false
      },
      confidenceThreshold: 0.8,
      checkFrequency: 'daily',
      autoUpdateThreshold: 0.9,
      notificationSettings: {
        immediate: true,
        digest: true,
        digestFrequency: 'weekly'
      },
      lastRun: new Date('2024-01-22T06:00:00Z'),
      nextRun: new Date('2024-01-23T06:00:00Z'),
      totalDetections: 47
    };

    setContactMoves(mockContactMoves);
    setConfig(mockConfig);
    setLoading(false);
  }, []);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusColor = (status: ContactMove['status']) => {
    switch (status) {
      case 'detected': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'updated': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: ContactMove['status']) => {
    switch (status) {
      case 'detected': return <AlertCircle className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'updated': return <UserCheck className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getRelationshipColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'weak': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredMoves = contactMoves.filter(move => {
    if (filterStatus !== 'all' && move.status !== filterStatus) return false;
    if (filterConfidence !== 'all') {
      const threshold = parseFloat(filterConfidence);
      if (move.confidence < threshold) return false;
    }
    return true;
  });

  const pendingMoves = contactMoves.filter(move => move.status === 'detected');
  const confirmedMoves = contactMoves.filter(move => move.status === 'confirmed');

  const handleUpdateStatus = async (moveId: string, newStatus: ContactMove['status']) => {
    try {
      setContactMoves(prev => 
        prev.map(move => 
          move.id === moveId 
            ? { 
                ...move, 
                status: newStatus,
                confirmedAt: newStatus === 'confirmed' ? new Date() : move.confirmedAt,
                confirmedBy: newStatus === 'confirmed' ? 'current-user' : move.confirmedBy
              }
            : move
        )
      );
      
      toast({
        title: 'Status Updated',
        description: `Contact move marked as ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const handleApplyRecommendation = async (moveId: string) => {
    try {
      const move = contactMoves.find(m => m.id === moveId);
      if (!move) return;

      // In real implementation, this would apply the recommended action
      setContactMoves(prev => 
        prev.map(m => 
          m.id === moveId ? { ...m, status: 'updated' as ContactMove['status'] } : m
        )
      );
      
      toast({
        title: 'Recommendation Applied',
        description: `Contact has been ${move.recommendedAction.replace('_', ' ')}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to apply recommendation.',
        variant: 'destructive',
      });
    }
  };

  const handleRunDetection = async () => {
    try {
      if (!config) return;

      setConfig(prev => prev ? { ...prev, lastRun: new Date() } : null);
      
      toast({
        title: 'Detection Started',
        description: 'Move detection process has been initiated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start detection process.',
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
            <CardTitle className="text-sm font-medium">Pending Moves</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingMoves.length}</div>
            <p className="text-xs text-muted-foreground">
              Require review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Confirmed Moves</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{confirmedMoves.length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Detection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {config ? ((confirmedMoves.length / contactMoves.length) * 100).toFixed(0) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Accuracy rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Detections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config?.totalDetections || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contact Move Detection</CardTitle>
              <CardDescription>
                Monitor and manage contact job changes and moves
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleRunDetection}
                disabled={!config?.isEnabled}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Run Detection
              </Button>
              <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">Configure</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Move Detection Configuration</DialogTitle>
                    <DialogDescription>
                      Configure move detection settings and thresholds
                    </DialogDescription>
                  </DialogHeader>
                  <MoveDetectionConfigForm config={config} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="moves">
                <Users className="h-4 w-4 mr-2" />
                Detected Moves ({pendingMoves.length})
              </TabsTrigger>
              <TabsTrigger value="config">
                <AlertCircle className="h-4 w-4 mr-2" />
                Configuration
              </TabsTrigger>
            </TabsList>

            <TabsContent value="moves" className="space-y-4">
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
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="updated">Updated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Label>Min Confidence:</Label>
                  <Select value={filterConfidence} onValueChange={setFilterConfidence}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="0.9">90%+</SelectItem>
                      <SelectItem value="0.8">80%+</SelectItem>
                      <SelectItem value="0.7">70%+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Moves */}
              <div className="space-y-4">
                {filteredMoves.map((move) => (
                  <Card key={move.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {getStatusIcon(move.status)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium">{move.contactName}</h4>
                              <Badge className={getStatusColor(move.status)}>
                                {move.status}
                              </Badge>
                              <Badge className={getConfidenceColor(move.confidence)}>
                                {(move.confidence * 100).toFixed(0)}% confidence
                              </Badge>
                              <Badge variant="outline">{move.moveType.replace('_', ' ')}</Badge>
                            </div>
                            
                            <div className="flex items-center space-x-2 mb-3">
                              <span className="text-sm">{move.previousOutlet.name}</span>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{move.newOutlet.name}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">Relationship Strength</span>
                                <div className="mt-1">
                                  <Badge className={getRelationshipColor(move.impactAssessment.relationshipStrength)}>
                                    {move.impactAssessment.relationshipStrength}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-muted-foreground">Communication History</span>
                                <div className="mt-1 text-sm">
                                  {move.impactAssessment.communicationHistory} interactions
                                </div>
                              </div>
                            </div>
                            
                            {move.evidence.length > 0 && (
                              <div className="mb-3">
                                <span className="text-xs font-medium text-muted-foreground">Evidence:</span>
                                <div className="mt-1 space-y-1">
                                  {move.evidence.slice(0, 2).map((evidence, index) => (
                                    <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <Badge variant="secondary" className="text-xs">
                                          {evidence.type}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                          {evidence.timestamp.toLocaleDateString()}
                                        </span>
                                      </div>
                                      <div className="text-gray-700">{evidence.content}</div>
                                    </div>
                                  ))}
                                  {move.evidence.length > 2 && (
                                    <div className="text-xs text-muted-foreground">
                                      +{move.evidence.length - 2} more evidence items
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>Detected: {move.detectedAt.toLocaleDateString()}</span>
                              <span>Method: {move.detectionMethod.replace('_', ' ')}</span>
                              <span>Recommended: {move.recommendedAction.replace('_', ' ')}</span>
                            </div>
                            
                            {move.notes && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                <span className="font-medium">Notes: </span>
                                {move.notes}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          {move.status === 'detected' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateStatus(move.id, 'confirmed')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUpdateStatus(move.id, 'rejected')}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {move.status === 'confirmed' && move.recommendedAction !== 'no_action' && (
                            <Button
                              size="sm"
                              onClick={() => handleApplyRecommendation(move.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Apply Action
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredMoves.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No contact moves found matching the current filters.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              {config && <MoveDetectionConfigForm config={config} />}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function MoveDetectionConfigForm({ config }: { config: MoveDetectionConfig | null }) {
  if (!config) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Detection Status</Label>
          <div className="flex items-center space-x-2 mt-2">
            <Switch checked={config.isEnabled} />
            <span className="text-sm">
              {config.isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
        
        <div>
          <Label>Check Frequency</Label>
          <div className="mt-2">
            <Badge variant="outline">{config.checkFrequency}</Badge>
          </div>
        </div>
      </div>

      <div>
        <Label>Detection Methods</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center space-x-2">
            <Switch checked={config.detectionMethods.bylineAnalysis} />
            <span className="text-sm">Byline Analysis</span>
          </div>
          <div className="flex items-center space-x-2">
            <Switch checked={config.detectionMethods.emailTracking} />
            <span className="text-sm">Email Tracking</span>
          </div>
          <div className="flex items-center space-x-2">
            <Switch checked={config.detectionMethods.socialMediaMonitoring} />
            <span className="text-sm">Social Media Monitoring</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Confidence Threshold</Label>
          <div className="mt-2">
            <Badge className="bg-blue-100 text-blue-800">
              {(config.confidenceThreshold * 100).toFixed(0)}%
            </Badge>
          </div>
        </div>
        
        <div>
          <Label>Auto-Update Threshold</Label>
          <div className="mt-2">
            <Badge className="bg-green-100 text-green-800">
              {(config.autoUpdateThreshold * 100).toFixed(0)}%
            </Badge>
          </div>
        </div>
      </div>

      <div>
        <Label>Notification Settings</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center space-x-2">
            <Switch checked={config.notificationSettings.immediate} />
            <span className="text-sm">Immediate Notifications</span>
          </div>
          <div className="flex items-center space-x-2">
            <Switch checked={config.notificationSettings.digest} />
            <span className="text-sm">
              Digest Notifications ({config.notificationSettings.digestFrequency})
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
        <div>
          <span className="font-medium">Last Run: </span>
          {config.lastRun.toLocaleString()}
        </div>
        <div>
          <span className="font-medium">Next Run: </span>
          {config.nextRun.toLocaleString()}
        </div>
      </div>
    </div>
  );
}