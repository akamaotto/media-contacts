'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, XCircle, Mail, MessageSquare, Eye, Ban, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ContactOutcome {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  outletName: string;
  campaignId?: string;
  campaignName?: string;
  outcomeType: 'reply' | 'bounce' | 'coverage' | 'optout' | 'complaint';
  status: 'positive' | 'negative' | 'neutral';
  details: string;
  metadata: {
    subject?: string;
    replyContent?: string;
    coverageUrl?: string;
    bounceReason?: string;
    optoutReason?: string;
  };
  recordedAt: Date;
  recordedBy: string;
  verified: boolean;
}

interface OutcomeStats {
  totalOutcomes: number;
  replyRate: number;
  bounceRate: number;
  coverageRate: number;
  optoutRate: number;
  complaintRate: number;
  trends: {
    replies: number;
    bounces: number;
    coverage: number;
    optouts: number;
  };
}

export function ContactOutcomeTracker() {
  const [outcomes, setOutcomes] = useState<ContactOutcome[]>([]);
  const [stats, setStats] = useState<OutcomeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  useEffect(() => {
    const mockOutcomes: ContactOutcome[] = [
      {
        id: '1',
        contactId: 'contact-1',
        contactName: 'John Doe',
        contactEmail: 'john.doe@techreporter.com',
        outletName: 'Tech Reporter',
        campaignId: 'campaign-1',
        campaignName: 'AI Product Launch',
        outcomeType: 'reply',
        status: 'positive',
        details: 'Interested in covering the story, requested additional information',
        metadata: {
          subject: 'Re: AI Product Launch Story Opportunity',
          replyContent: 'Thanks for reaching out. This looks interesting. Can you send me more details about the technical specifications?'
        },
        recordedAt: new Date('2024-01-15T10:30:00Z'),
        recordedBy: 'user-1',
        verified: true
      },
      {
        id: '2',
        contactId: 'contact-2',
        contactName: 'Jane Smith',
        contactEmail: 'jane.smith@newsoutlet.com',
        outletName: 'News Outlet',
        campaignId: 'campaign-1',
        campaignName: 'AI Product Launch',
        outcomeType: 'coverage',
        status: 'positive',
        details: 'Published comprehensive article about the product launch',
        metadata: {
          coverageUrl: 'https://newsoutlet.com/ai-product-launch-coverage'
        },
        recordedAt: new Date('2024-01-20T14:15:00Z'),
        recordedBy: 'user-1',
        verified: true
      },
      {
        id: '3',
        contactId: 'contact-3',
        contactName: 'Bob Wilson',
        contactEmail: 'bob.wilson@invalid-email.com',
        outletName: 'Tech Weekly',
        campaignId: 'campaign-2',
        campaignName: 'Industry Report',
        outcomeType: 'bounce',
        status: 'negative',
        details: 'Email bounced - invalid email address',
        metadata: {
          bounceReason: 'Invalid email address'
        },
        recordedAt: new Date('2024-01-18T09:45:00Z'),
        recordedBy: 'system',
        verified: true
      },
      {
        id: '4',
        contactId: 'contact-4',
        contactName: 'Sarah Johnson',
        contactEmail: 'sarah.johnson@mediaco.com',
        outletName: 'Media Co',
        outcomeType: 'optout',
        status: 'negative',
        details: 'Requested to be removed from all future communications',
        metadata: {
          optoutReason: 'No longer covers this beat'
        },
        recordedAt: new Date('2024-01-22T16:20:00Z'),
        recordedBy: 'user-2',
        verified: true
      }
    ];

    const mockStats: OutcomeStats = {
      totalOutcomes: mockOutcomes.length,
      replyRate: 25.0,
      bounceRate: 15.0,
      coverageRate: 12.5,
      optoutRate: 8.0,
      complaintRate: 2.0,
      trends: {
        replies: 5.2,
        bounces: -2.1,
        coverage: 8.7,
        optouts: 1.3
      }
    };

    setOutcomes(mockOutcomes);
    setStats(mockStats);
    setLoading(false);
  }, []);

  const getOutcomeIcon = (type: ContactOutcome['outcomeType']) => {
    switch (type) {
      case 'reply': return <Mail className="h-4 w-4" />;
      case 'coverage': return <Eye className="h-4 w-4" />;
      case 'bounce': return <XCircle className="h-4 w-4" />;
      case 'optout': return <Ban className="h-4 w-4" />;
      case 'complaint': return <AlertCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: ContactOutcome['status']) => {
    switch (status) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'neutral': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  const filteredOutcomes = outcomes.filter(outcome => {
    if (filterType !== 'all' && outcome.outcomeType !== filterType) return false;
    if (filterStatus !== 'all' && outcome.status !== filterStatus) return false;
    if (selectedContact && outcome.contactId !== selectedContact) return false;
    return true;
  });

  const handleAddOutcome = async (outcomeData: Partial<ContactOutcome>) => {
    try {
      // In real implementation, this would call the API
      const newOutcome: ContactOutcome = {
        id: `outcome-${Date.now()}`,
        contactId: outcomeData.contactId!,
        contactName: outcomeData.contactName!,
        contactEmail: outcomeData.contactEmail!,
        outletName: outcomeData.outletName!,
        campaignId: outcomeData.campaignId,
        campaignName: outcomeData.campaignName,
        outcomeType: outcomeData.outcomeType!,
        status: outcomeData.status!,
        details: outcomeData.details!,
        metadata: outcomeData.metadata || {},
        recordedAt: new Date(),
        recordedBy: 'current-user',
        verified: false
      };

      setOutcomes(prev => [newOutcome, ...prev]);
      setShowAddDialog(false);
      
      toast({
        title: 'Outcome Recorded',
        description: 'Contact outcome has been successfully recorded.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record outcome. Please try again.',
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
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.replyRate}%</div>
                {getTrendIcon(stats.trends.replies)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.trends.replies > 0 ? '+' : ''}{stats.trends.replies}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Coverage Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.coverageRate}%</div>
                {getTrendIcon(stats.trends.coverage)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.trends.coverage > 0 ? '+' : ''}{stats.trends.coverage}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.bounceRate}%</div>
                {getTrendIcon(stats.trends.bounces)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.trends.bounces > 0 ? '+' : ''}{stats.trends.bounces}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Opt-out Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.optoutRate}%</div>
                {getTrendIcon(stats.trends.optouts)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.trends.optouts > 0 ? '+' : ''}{stats.trends.optouts}% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOutcomes}</div>
              <p className="text-xs text-muted-foreground">
                Recorded this month
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contact Outcomes</CardTitle>
              <CardDescription>
                Track and manage contact interaction outcomes
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>Record Outcome</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Record Contact Outcome</DialogTitle>
                  <DialogDescription>
                    Record the outcome of a contact interaction
                  </DialogDescription>
                </DialogHeader>
                <AddOutcomeForm onSubmit={handleAddOutcome} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Label htmlFor="filter-type">Type:</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="reply">Replies</SelectItem>
                  <SelectItem value="coverage">Coverage</SelectItem>
                  <SelectItem value="bounce">Bounces</SelectItem>
                  <SelectItem value="optout">Opt-outs</SelectItem>
                  <SelectItem value="complaint">Complaints</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Label htmlFor="filter-status">Status:</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Outcomes List */}
          <div className="space-y-4">
            {filteredOutcomes.map((outcome) => (
              <Card key={outcome.id} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getOutcomeIcon(outcome.outcomeType)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{outcome.contactName}</h4>
                          <Badge variant="outline">{outcome.outletName}</Badge>
                          <Badge className={getStatusColor(outcome.status)}>
                            {outcome.status}
                          </Badge>
                          {!outcome.verified && (
                            <Badge variant="outline" className="text-yellow-600">
                              Unverified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {outcome.contactEmail}
                        </p>
                        <p className="text-sm mb-2">{outcome.details}</p>
                        
                        {/* Metadata */}
                        {outcome.metadata.replyContent && (
                          <div className="bg-gray-50 p-3 rounded-md mb-2">
                            <p className="text-sm font-medium mb-1">Reply:</p>
                            <p className="text-sm text-gray-700">{outcome.metadata.replyContent}</p>
                          </div>
                        )}
                        
                        {outcome.metadata.coverageUrl && (
                          <div className="mb-2">
                            <a 
                              href={outcome.metadata.coverageUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              View Coverage →
                            </a>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Recorded {outcome.recordedAt.toLocaleDateString()}</span>
                          {outcome.campaignName && (
                            <span>Campaign: {outcome.campaignName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredOutcomes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No outcomes found matching the current filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AddOutcomeForm({ onSubmit }: { onSubmit: (data: Partial<ContactOutcome>) => void }) {
  const [formData, setFormData] = useState({
    contactId: '',
    contactName: '',
    contactEmail: '',
    outletName: '',
    campaignId: '',
    campaignName: '',
    outcomeType: 'reply' as ContactOutcome['outcomeType'],
    status: 'positive' as ContactOutcome['status'],
    details: '',
    replyContent: '',
    coverageUrl: '',
    bounceReason: '',
    optoutReason: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const metadata: any = {};
    if (formData.replyContent) metadata.replyContent = formData.replyContent;
    if (formData.coverageUrl) metadata.coverageUrl = formData.coverageUrl;
    if (formData.bounceReason) metadata.bounceReason = formData.bounceReason;
    if (formData.optoutReason) metadata.optoutReason = formData.optoutReason;

    onSubmit({
      contactId: formData.contactId,
      contactName: formData.contactName,
      contactEmail: formData.contactEmail,
      outletName: formData.outletName,
      campaignId: formData.campaignId || undefined,
      campaignName: formData.campaignName || undefined,
      outcomeType: formData.outcomeType,
      status: formData.status,
      details: formData.details,
      metadata
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contactName">Contact Name</Label>
          <Input
            id="contactName"
            value={formData.contactName}
            onChange={(e) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="contactEmail">Contact Email</Label>
          <Input
            id="contactEmail"
            type="email"
            value={formData.contactEmail}
            onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="outletName">Outlet Name</Label>
          <Input
            id="outletName"
            value={formData.outletName}
            onChange={(e) => setFormData(prev => ({ ...prev, outletName: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="campaignName">Campaign (Optional)</Label>
          <Input
            id="campaignName"
            value={formData.campaignName}
            onChange={(e) => setFormData(prev => ({ ...prev, campaignName: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="outcomeType">Outcome Type</Label>
          <Select value={formData.outcomeType} onValueChange={(value: ContactOutcome['outcomeType']) => 
            setFormData(prev => ({ ...prev, outcomeType: value }))
          }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="reply">Reply</SelectItem>
              <SelectItem value="coverage">Coverage</SelectItem>
              <SelectItem value="bounce">Bounce</SelectItem>
              <SelectItem value="optout">Opt-out</SelectItem>
              <SelectItem value="complaint">Complaint</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value: ContactOutcome['status']) => 
            setFormData(prev => ({ ...prev, status: value }))
          }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="details">Details</Label>
        <Textarea
          id="details"
          value={formData.details}
          onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
          placeholder="Describe the outcome..."
          required
        />
      </div>

      {/* Conditional fields based on outcome type */}
      {formData.outcomeType === 'reply' && (
        <div>
          <Label htmlFor="replyContent">Reply Content</Label>
          <Textarea
            id="replyContent"
            value={formData.replyContent}
            onChange={(e) => setFormData(prev => ({ ...prev, replyContent: e.target.value }))}
            placeholder="Content of the reply..."
          />
        </div>
      )}

      {formData.outcomeType === 'coverage' && (
        <div>
          <Label htmlFor="coverageUrl">Coverage URL</Label>
          <Input
            id="coverageUrl"
            type="url"
            value={formData.coverageUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, coverageUrl: e.target.value }))}
            placeholder="https://..."
          />
        </div>
      )}

      {formData.outcomeType === 'bounce' && (
        <div>
          <Label htmlFor="bounceReason">Bounce Reason</Label>
          <Input
            id="bounceReason"
            value={formData.bounceReason}
            onChange={(e) => setFormData(prev => ({ ...prev, bounceReason: e.target.value }))}
            placeholder="Reason for bounce..."
          />
        </div>
      )}

      {formData.outcomeType === 'optout' && (
        <div>
          <Label htmlFor="optoutReason">Opt-out Reason</Label>
          <Input
            id="optoutReason"
            value={formData.optoutReason}
            onChange={(e) => setFormData(prev => ({ ...prev, optoutReason: e.target.value }))}
            placeholder="Reason for opt-out..."
          />
        </div>
      )}

      <DialogFooter>
        <Button type="submit">Record Outcome</Button>
      </DialogFooter>
    </form>
  );
}