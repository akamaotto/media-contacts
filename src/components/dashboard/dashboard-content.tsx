'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { MetricsSection } from './metrics-section';
import { ChartsSection } from './charts-section';
import { ActivityFeed } from './activity-feed';
import { GeographicVisualization } from './geographic-visualization';
import { AdminDashboardSection } from './admin-dashboard-section';
import { SimplifiedMetricsCard } from './simplified-metrics-card';
import { ContactsMetricCard } from './contacts-metric-card';
import { CategoryChartCard } from './category-chart-card';
import { CountryChartCard } from './country-chart-card';
import { TimeRange } from './dashboard-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardErrorBoundary } from './dashboard-error-boundary';
import { 
  MetricsSectionSkeleton, 
  ChartSkeleton, 
  ActivityFeedSkeleton, 
  GeographicSkeleton 
} from './enhanced-skeleton-loaders';
import { 
  MobileResponsiveSection,
  PullToRefresh,
  MobileSwipeTabs
} from './mobile-responsive-dashboard';
import { useIsMobile } from '@/hooks/use-media-query';

export function DashboardContent() {
  const { data: session } = useSession();
  const [globalTimeRange, setGlobalTimeRange] = useState<'7d' | '30d' | '3m'>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMobile = useIsMobile();
  
  // Check if user has admin access
  const isAdmin = session?.user?.role === 'ADMIN';

  const handleTimeRangeChange = (timeRange: '7d' | '30d' | '3m') => {
    setGlobalTimeRange(timeRange);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      // In a real implementation, this would trigger data refetch
      window.location.reload();
    } finally {
      setIsRefreshing(false);
    }
  };

  const dashboardContent = (
    <div className="space-y-8">
      {/* Row 1: Three Cards in One Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Contacts Metrics */}
        <DashboardErrorBoundary section="Contacts Metrics">
          <ContactsMetricCard 
            period={globalTimeRange}
            onPeriodChange={handleTimeRangeChange}
          />
        </DashboardErrorBoundary>
        
        {/* Card 2: Category Chart */}
        <DashboardErrorBoundary section="Category Chart">
          <CategoryChartCard timeRange={globalTimeRange} />
        </DashboardErrorBoundary>
        
        {/* Card 3: Country Chart */}
        <DashboardErrorBoundary section="Country Chart">
          <CountryChartCard timeRange={globalTimeRange} />
        </DashboardErrorBoundary>
      </div>

      {/* Row 2: Activity Feed */}
      <div className="w-full">
        <DashboardErrorBoundary section="Activity">
          <div className="space-y-4">
            <ActivityFeed 
              maxHeight={400}
              showFilters={false}
              limit={20}
            />
          </div>
        </DashboardErrorBoundary>
      </div>
    </div>
  );

  // Return with pull-to-refresh for mobile, regular content for desktop
  if (isMobile) {
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        {dashboardContent}
      </PullToRefresh>
    );
  }

  return dashboardContent;
}
