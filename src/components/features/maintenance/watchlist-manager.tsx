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
import { Switch } from '@/components/ui/switch';
import { Eye, EyeOff, AlertTriangle, Clock, Users, Building, Settings, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WatchlistItem {
  id: string;
  type: 'contact' | 'outlet';
  entityId: string;
  entityName: string;
  entityEmail?: string;
  outletDomain?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  monitoringType: 'moves' | 'policy_changes' | 'activity' | 'all';
  isActive: boolean;
  alertFrequency: 'immediate' | 'daily' | 'weekly';
  lastChecked: Date;
  lastAlert?: Date;
  alertCount: number;
  notes: string;
  createdAt: Date;
  createdBy: string;
  tags: string[];
}

interface WatchlistAlert {
  id: string;
  watchlistItemId: string;
  alertType: 'contact_moved' | 'policy_changed' | 'activity_detected' | 'data_updated';
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  metadata: {
    oldValue?: string;
    newValue?: string;
    detectedAt: Date;
    confidence: number;
  };
  isRead: boolean;
  createdAt: Date;
}

export function WatchlistManager() {
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [alerts, setAlerts] = useState<WatchlistAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('items');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  useEffect(() => {
    const mockWatchlistItems: WatchlistItem[] = [
      {
        id: '1',
        type: 'contact',
        entityId: 'contact-1',
        entityName: 'John Doe',
        entityEmail: 'john.doe@techreporter.com',
        priority: 'high',
        monitoringType: 'moves',
        isActive: true,
        alertFrequency: 'immediate',
        lastChecked: new Date('2024-01-22T10:00:00Z'),
        lastAlert: new Date('2024-01-20T14:30:00Z'),
        alertCount: 3,
        notes: 'Key technology reporter, monitor for outlet changes',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        createdBy: 'user-1',
        tags: ['technology', 'key-contact', 'tier-1']
      },
      {
        id: '2',
        type: 'outlet',
        entityId: 'outlet-1',
        entityName: 'Tech Weekly',
        outletDomain: 'techweekly.com',
        priority: 'medium',
        monitoringType: 'policy_changes',
        isActive: true,
        alertFrequency: 'daily',
        lastChecked: new Date('2024-01-22T08:00:00Z'),
        alertCount: 1,
        notes: 'Monitor for contact policy changes',
        createdAt: new Date('2024-01-05T00:00:00Z'),
        createdBy: 'user-2',
        tags: ['technology', 'weekly-publication']
      },
      {
        id: '3',
        type: 'contact',
        entityId: 'contact-2',
        entityName: 'Sarah Johnson',
        entityEmail: 'sarah.johnson@newsoutlet.com',
        priority: 'critical',
        monitoringType: 'all',
        isActive: true,
        alertFrequency: 'immediate',
        lastChecked: new Date('2024-01-22T12:00:00Z'),
        lastAlert: new Date('2024-01-21T16:45:00Z'),
        alertCount: 7,
        notes: 'VIP contact - monitor all changes',
        createdAt: new Date('2023-12-15T00:00:00Z'),
        createdBy: 'user-1',
        tags: ['vip', 'business', 'tier-1']
      }
    ];

    const mockAlerts: WatchlistAlert[] = [
      {
        id: '1',
        watchlistItemId: '1',
        alertType: 'contact_moved',
        severity: 'warning',
        title: 'Contact Changed Outlet',
        description: 'John Doe appears to have moved from Tech Reporter to Innovation Daily',
        metadata: {
          oldValue: 'Tech Reporter',
          newValue: 'Innovation Daily',
          detectedAt: new Date('2024-01-20T14:30:00Z'),
          confidence: 0.85
        },
        isRead: false,
        createdAt: new Date('2024-01-20T14:30:00Z')
      },
      {
        id: '2',
        watchlistItemId: '2',
        alertType: 'policy_changed',
        severity: 'info',
        title: 'Contact Policy Updated',
        description: 'Tech Weekly updated their media contact policy',
        metadata: {
          detectedAt: new Date('2024-01-19T09:15:00Z'),
          confidence: 0.92
        },
        isRead: true,
        createdAt: new Date('2024-01-19T09:15:00Z')
      },
      {
        id: '3',
        watchlistItemId: '3',
        alertType: 'activity_detected',
        severity: 'info',
        title: 'New Articles Published',
        description: 'Sarah Johnson published 3 new articles in the past week',
        metadata: {
          detectedAt: new Date('2024-01-21T16:45:00Z'),
          confidence: 0.95
        },
        isRead: false,
        createdAt: new Date('2024-01-21T16:45:00Z')
      }
    ];

    setWatchlistItems(mockWatchlistItems);
    setAlerts(mockAlerts);
    setLoading(false);
  }, []);

  const getPriorityColor = (priority: WatchlistItem['priority']) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: WatchlistAlert['severity']) => {
    switch (severity) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredItems = watchlistItems.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
    return true;
  });

  const unreadAlerts = alerts.filter(alert => !alert.isRead);

  const handleToggleActive = async (itemId: string, isActive: boolean) => {
    try {
      setWatchlistItems(prev => 
        prev.map(item => 
          item.id === itemId ? { ...item, isActive } : item
        )
      );
      
      toast({
        title: isActive ? 'Monitoring Enabled' : 'Monitoring Disabled',
        description: `Watchlist item has been ${isActive ? 'activated' : 'deactivated'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update watchlist item.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      setWatchlistItems(prev => prev.filter(item => item.id !== itemId));
      
      toast({
        title: 'Item Removed',
        description: 'Watchlist item has been removed.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove watchlist item.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAlertRead = async (alertId: string) => {
    try {
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, isRead: true } : alert
        )
      );
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark alert as read.',
        variant: 'destructive',
      });
    }
  };

  const handleAddWatchlistItem = async (itemData: Partial<WatchlistItem>) => {
    try {
      const newItem: WatchlistItem = {
        id: `watchlist-${Date.now()}`,
        type: itemData.type!,
        entityId: itemData.entityId!,
        entityName: itemData.entityName!,
        entityEmail: itemData.entityEmail,
        outletDomain: itemData.outletDomain,
        priority: itemData.priority!,
        monitoringType: itemData.monitoringType!,
        isActive: true,
        alertFrequency: itemData.alertFrequency!,
        lastChecked: new Date(),
        alertCount: 0,
        notes: itemData.notes || '',
        createdAt: new Date(),
        createdBy: 'current-user',
        tags: itemData.tags || []
      };

      setWatchlistItems(prev => [newItem, ...prev]);
      setShowAddDialog(false);
      
      toast({
        title: 'Watchlist Item Added',
        description: 'New item has been added to the watchlist.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add watchlist item.',
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
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{watchlistItems.length}</div>
            <p className="text-xs text-muted-foreground">
              {watchlistItems.filter(item => item.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unread Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unreadAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {watchlistItems.filter(item => item.priority === 'critical').length}
            </div>
            <p className="text-xs text-muted-foreground">
              High priority monitoring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Last 24h Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alerts.filter(alert => 
                new Date().getTime() - alert.createdAt.getTime() < 24 * 60 * 60 * 1000
              ).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Recent activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Watchlist Management</CardTitle>
              <CardDescription>
                Monitor contacts and outlets for changes and activity
              </CardDescription>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Watchlist
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Watchlist Item</DialogTitle>
                  <DialogDescription>
                    Add a contact or outlet to monitor for changes
                  </DialogDescription>
                </DialogHeader>
                <AddWatchlistForm onSubmit={handleAddWatchlistItem} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="items">
                <Users className="h-4 w-4 mr-2" />
                Watchlist Items
              </TabsTrigger>
              <TabsTrigger value="alerts">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Alerts ({unreadAlerts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Label>Type:</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="contact">Contacts</SelectItem>
                      <SelectItem value="outlet">Outlets</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Label>Priority:</Label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Watchlist Items */}
              <div className="space-y-4">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            {item.type === 'contact' ? (
                              <Users className="h-5 w-5 text-blue-600" />
                            ) : (
                              <Building className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium">{item.entityName}</h4>
                              <Badge className={getPriorityColor(item.priority)}>
                                {item.priority}
                              </Badge>
                              <Badge variant="outline">
                                {item.monitoringType.replace('_', ' ')}
                              </Badge>
                              {item.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            
                            {item.entityEmail && (
                              <p className="text-sm text-muted-foreground mb-1">
                                {item.entityEmail}
                              </p>
                            )}
                            
                            {item.outletDomain && (
                              <p className="text-sm text-muted-foreground mb-1">
                                {item.outletDomain}
                              </p>
                            )}
                            
                            {item.notes && (
                              <p className="text-sm mb-2">{item.notes}</p>
                            )}
                            
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <span>
                                Last checked: {item.lastChecked.toLocaleDateString()}
                              </span>
                              <span>Alerts: {item.alertCount}</span>
                              <span>Frequency: {item.alertFrequency}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={(checked) => handleToggleActive(item.id, checked)}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No watchlist items found matching the current filters.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <Card 
                    key={alert.id} 
                    className={`border-l-4 ${
                      alert.isRead ? 'border-l-gray-300' : 'border-l-blue-500'
                    } ${!alert.isRead ? 'bg-blue-50/50' : ''}`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            {!alert.isRead && (
                              <Badge variant="default" className="bg-blue-600">
                                New
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm mb-2">{alert.description}</p>
                          
                          {alert.metadata.oldValue && alert.metadata.newValue && (
                            <div className="bg-gray-50 p-3 rounded-md mb-2 text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-red-600">From: {alert.metadata.oldValue}</span>
                                <span>→</span>
                                <span className="text-green-600">To: {alert.metadata.newValue}</span>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>{alert.createdAt.toLocaleString()}</span>
                            <span>Confidence: {(alert.metadata.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        
                        {!alert.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAlertRead(alert.id)}
                          >
                            Mark Read
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No alerts found.
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

function AddWatchlistForm({ onSubmit }: { onSubmit: (data: Partial<WatchlistItem>) => void }) {
  const [formData, setFormData] = useState({
    type: 'contact' as WatchlistItem['type'],
    entityName: '',
    entityEmail: '',
    outletDomain: '',
    priority: 'medium' as WatchlistItem['priority'],
    monitoringType: 'all' as WatchlistItem['monitoringType'],
    alertFrequency: 'daily' as WatchlistItem['alertFrequency'],
    notes: '',
    tags: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      type: formData.type,
      entityId: `${formData.type}-${Date.now()}`, // In real app, this would be the actual entity ID
      entityName: formData.entityName,
      entityEmail: formData.entityEmail || undefined,
      outletDomain: formData.outletDomain || undefined,
      priority: formData.priority,
      monitoringType: formData.monitoringType,
      alertFrequency: formData.alertFrequency,
      notes: formData.notes,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="type">Type</Label>
        <Select value={formData.type} onValueChange={(value: WatchlistItem['type']) => 
          setFormData(prev => ({ ...prev, type: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contact">Contact</SelectItem>
            <SelectItem value="outlet">Outlet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="entityName">
          {formData.type === 'contact' ? 'Contact Name' : 'Outlet Name'}
        </Label>
        <Input
          id="entityName"
          value={formData.entityName}
          onChange={(e) => setFormData(prev => ({ ...prev, entityName: e.target.value }))}
          required
        />
      </div>

      {formData.type === 'contact' && (
        <div>
          <Label htmlFor="entityEmail">Email</Label>
          <Input
            id="entityEmail"
            type="email"
            value={formData.entityEmail}
            onChange={(e) => setFormData(prev => ({ ...prev, entityEmail: e.target.value }))}
          />
        </div>
      )}

      {formData.type === 'outlet' && (
        <div>
          <Label htmlFor="outletDomain">Domain</Label>
          <Input
            id="outletDomain"
            value={formData.outletDomain}
            onChange={(e) => setFormData(prev => ({ ...prev, outletDomain: e.target.value }))}
            placeholder="example.com"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(value: WatchlistItem['priority']) => 
            setFormData(prev => ({ ...prev, priority: value }))
          }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="alertFrequency">Alert Frequency</Label>
          <Select value={formData.alertFrequency} onValueChange={(value: WatchlistItem['alertFrequency']) => 
            setFormData(prev => ({ ...prev, alertFrequency: value }))
          }>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="immediate">Immediate</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="monitoringType">Monitoring Type</Label>
        <Select value={formData.monitoringType} onValueChange={(value: WatchlistItem['monitoringType']) => 
          setFormData(prev => ({ ...prev, monitoringType: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="moves">Contact Moves</SelectItem>
            <SelectItem value="policy_changes">Policy Changes</SelectItem>
            <SelectItem value="activity">Activity</SelectItem>
            <SelectItem value="all">All Changes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
          placeholder="technology, tier-1, vip"
        />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Additional notes about this watchlist item..."
        />
      </div>

      <DialogFooter>
        <Button type="submit">Add to Watchlist</Button>
      </DialogFooter>
    </form>
  );
}