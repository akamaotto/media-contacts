'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ActivityFeed } from './activity-feed';
import { SimpleDashboardStats } from './simple-dashboard-stats';
import { DashboardErrorBoundary } from './dashboard-error-boundary';
import { ActivityFeedSkeleton } from './enhanced-skeleton-loaders';
import { PullToRefresh } from './mobile-responsive-dashboard';
import { useIsMobile } from '@/hooks/use-media-query';

export function DashboardContent() {
  const { data: session } = useSession();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isMobile = useIsMobile();

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
      {/* Simple Dashboard Stats */}
      <DashboardErrorBoundary section="Dashboard Stats">
        <SimpleDashboardStats />
      </DashboardErrorBoundary>

      {/* Activity Feed */}
      <div className="w-full">
        <DashboardErrorBoundary section="Activity">
          <div className="space-y-4">
            <ActivityFeed
              maxHeight={600}
              showFilters={true}
              limit={50}
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
