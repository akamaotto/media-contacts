'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Download, 
  Upload, 
  User, 
  Building2, 
  Newspaper, 
  Tag, 
  Globe, 
  Languages, 
  MapPin,
  RefreshCw,
  Filter,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface ActivityItem {
  id: string;
  type: 'create' | 'update' | 'delete' | 'import' | 'export';
  entity: 'media_contact' | 'outlet' | 'publisher' | 'beat' | 'category' | 'country' | 'language' | 'region';
  entityName: string;
  user: {
    name: string;
    email: string;
  };
  timestamp: Date;
  details?: Record<string, any>;
}

interface ActivityFeedProps {
  className?: string;
  maxHeight?: number;
  showFilters?: boolean;
  limit?: number;
}

interface PaginatedActivities {
  activities: ActivityItem[];
  totalCount: number;
  hasMore: boolean;
}

// Activity type configurations
const activityTypeConfig = {
  create: {
    icon: Plus,
    label: 'Created',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  update: {
    icon: Edit,
    label: 'Updated',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  delete: {
    icon: Trash2,
    label: 'Deleted',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  import: {
    icon: Upload,
    label: 'Imported',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  export: {
    icon: Download,
    label: 'Exported',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
};

// Entity type configurations
const entityTypeConfig = {
  media_contact: {
    icon: User,
    label: 'Contact',
    color: 'text-blue-600'
  },
  outlet: {
    icon: Newspaper,
    label: 'Outlet',
    color: 'text-green-600'
  },
  publisher: {
    icon: Building2,
    label: 'Publisher',
    color: 'text-purple-600'
  },
  beat: {
    icon: Tag,
    label: 'Beat',
    color: 'text-orange-600'
  },
  category: {
    icon: Tag,
    label: 'Category',
    color: 'text-pink-600'
  },
  country: {
    icon: Globe,
    label: 'Country',
    color: 'text-indigo-600'
  },
  language: {
    icon: Languages,
    label: 'Language',
    color: 'text-cyan-600'
  },
  region: {
    icon: MapPin,
    label: 'Region',
    color: 'text-teal-600'
  }
};

export function ActivityFeed({ 
  className, 
  maxHeight = 400, 
  showFilters = true,
  limit = 20 
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('all');

  const fetchActivities = async (offset: number = 0, append: boolean = false) => {
    try {
      setError(null);
      if (!append) setIsLoading(true);
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });
      
      if (selectedTypeFilter !== 'all') {
        params.append('type', selectedTypeFilter);
      }
      
      if (selectedEntityFilter !== 'all') {
        params.append('entity', selectedEntityFilter);
      }
      
      const response = await fetch(`/api/dashboard/activity?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Convert timestamp strings to Date objects
      const processedActivities = data.activities.map((activity: any) => ({
        ...activity,
        timestamp: new Date(activity.timestamp)
      }));
      
      if (append) {
        setActivities(prev => [...prev, ...processedActivities]);
      } else {
        setActivities(processedActivities);
      }
      
      setHasMore(data.hasMore);
      setTotalCount(data.totalCount);
      
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [selectedTypeFilter, selectedEntityFilter]);

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    fetchActivities(activities.length, true);
  };

  const handleRefresh = () => {
    fetchActivities();
  };

  const renderActivityItem = (activity: ActivityItem) => {
    const typeConfig = activityTypeConfig[activity.type];
    const entityConfig = entityTypeConfig[activity.entity];
    const TypeIcon = typeConfig.icon;
    const EntityIcon = entityConfig.icon;

    return (
      <div
        key={activity.id}
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50',
          typeConfig.bgColor,
          typeConfig.borderColor
        )}
      >
        {/* Activity Type Icon */}
        <div className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          typeConfig.bgColor,
          typeConfig.borderColor,
          'border-2'
        )}>
          <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
        </div>

        {/* Activity Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <EntityIcon className={cn('h-3 w-3', entityConfig.color)} />
            <span className="text-sm font-medium">
              {typeConfig.label} {entityConfig.label}
            </span>
            <Badge variant="outline" className="text-xs">
              {activity.entityName}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">
            by {activity.user.name || activity.user.email}
          </p>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Clock className="h-8 w-8 text-muted-foreground mb-2" />
      <h3 className="text-sm font-medium text-muted-foreground mb-1">
        No recent activities
      </h3>
      <p className="text-xs text-muted-foreground">
        Activities will appear here as users interact with the system
      </p>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="h-8 w-8 text-destructive mb-2" />
      <h3 className="text-sm font-medium text-destructive mb-1">
        Failed to load activities
      </h3>
      <p className="text-xs text-destructive/80 mb-3">
        {error}
      </p>
      <Button variant="outline" size="sm" onClick={handleRefresh}>
        Try Again
      </Button>
    </div>
  );

  const renderLoadingSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest actions across your media database
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filters */}
          {showFilters && (
            <>
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background"
                disabled={isLoading}
              >
                <option value="all">All Types</option>
                {Object.entries(activityTypeConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              
              <select
                value={selectedEntityFilter}
                onChange={(e) => setSelectedEntityFilter(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background"
                disabled={isLoading}
              >
                <option value="all">All Entities</option>
                {Object.entries(entityTypeConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </>
          )}
          
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn(
              'h-3 w-3',
              isLoading && 'animate-spin'
            )} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea style={{ height: maxHeight }}>
          {isLoading && renderLoadingSkeleton()}
          {error && !isLoading && renderErrorState()}
          {!isLoading && !error && activities.length === 0 && renderEmptyState()}
          
          {!isLoading && !error && activities.length > 0 && (
            <div className="space-y-3">
              {activities.map(renderActivityItem)}
              
              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="text-xs"
                  >
                    {isLoadingMore ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      `Load More (${totalCount - activities.length} remaining)`
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        
        {/* Activity Count */}
        {!isLoading && !error && activities.length > 0 && (
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
            Showing {activities.length} of {totalCount} activities
          </div>
        )}
      </CardContent>
    </Card>
  );
}
