'use client';

import { useState } from 'react';
import { DashboardChart, TimeRange } from './dashboard-chart';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ChartsSectionProps {
  className?: string;
  defaultTimeRange?: TimeRange;
}

export function ChartsSection({ 
  className, 
  defaultTimeRange = '30d' 
}: ChartsSectionProps) {
  const [globalTimeRange, setGlobalTimeRange] = useState<TimeRange>(defaultTimeRange);

  const handleGlobalTimeRangeChange = (timeRange: TimeRange) => {
    setGlobalTimeRange(timeRange);
  };

  const timeRangeLabels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '3m': 'Last 3 months',
    '1y': 'Last year'
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Analytics & Insights</h2>
          <p className="text-sm text-muted-foreground">
            Visualize relationships and trends in your media database
          </p>
        </div>
        
        {/* Global Time Range Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Time Range:</span>
          <div className="flex items-center gap-1 rounded-md border p-1">
            {Object.entries(timeRangeLabels).map(([key, label]) => (
              <Button
                key={key}
                variant={globalTimeRange === key ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => handleGlobalTimeRangeChange(key as TimeRange)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="geographic">Geographic</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <DashboardChart
              title="Contacts by Country"
              subtitle="Distribution of media contacts across countries"
              chartType="bar"
              dataType="country"
              timeRange={globalTimeRange}
              onTimeRangeChange={setGlobalTimeRange}
              showTimeRangeSelector={false}
              emptyStateMessage="No contacts found for the selected time period"
            />
            
            <DashboardChart
              title="Contacts by Beat"
              subtitle="Coverage across different journalism beats"
              chartType="pie"
              dataType="beat"
              timeRange={globalTimeRange}
              onTimeRangeChange={setGlobalTimeRange}
              showTimeRangeSelector={false}
              emptyStateMessage="No beat assignments found"
            />
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <DashboardChart
              title="Email Verification Status"
              subtitle="Breakdown of verified vs unverified contacts"
              chartType="pie"
              dataType="verification"
              timeRange={globalTimeRange}
              onTimeRangeChange={setGlobalTimeRange}
              showTimeRangeSelector={false}
              emptyStateMessage="No contacts available"
            />
            
            <DashboardChart
              title="Contacts by Category"
              subtitle="Distribution across content categories"
              chartType="bar"
              dataType="category"
              timeRange={globalTimeRange}
              onTimeRangeChange={setGlobalTimeRange}
              showTimeRangeSelector={false}
              emptyStateMessage="No category assignments found"
            />
          </div>
        </TabsContent>

        {/* Geographic Tab */}
        <TabsContent value="geographic" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <DashboardChart
              title="Geographic Distribution"
              subtitle="Contact density by country and region"
              chartType="bar"
              dataType="geographic"
              timeRange={globalTimeRange}
              onTimeRangeChange={setGlobalTimeRange}
              showTimeRangeSelector={false}
              height={400}
              emptyStateMessage="No geographic data available"
            />
            
            <DashboardChart
              title="Contacts by Language"
              subtitle="Language distribution of media contacts"
              chartType="pie"
              dataType="language"
              timeRange={globalTimeRange}
              onTimeRangeChange={setGlobalTimeRange}
              showTimeRangeSelector={false}
              height={400}
              emptyStateMessage="No language data available"
            />
          </div>
        </TabsContent>

        {/* Relationships Tab */}
        <TabsContent value="relationships" className="space-y-4">
          <div className="grid gap-4">
            <DashboardChart
              title="Publisher-Outlet Distribution"
              subtitle="Relationship between publishers and their outlets"
              chartType="bar"
              dataType="publisher"
              timeRange={globalTimeRange}
              onTimeRangeChange={setGlobalTimeRange}
              showTimeRangeSelector={false}
              height={400}
              emptyStateMessage="No publisher-outlet relationships found"
            />
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <DashboardChart
              title="Trending Beats"
              subtitle="Most active journalism beats recently"
              chartType="line"
              dataType="trending"
              timeRange={globalTimeRange}
              onTimeRangeChange={setGlobalTimeRange}
              showTimeRangeSelector={false}
              emptyStateMessage="No trending data available"
            />
            
            <DashboardChart
              title="Country Growth"
              subtitle="Contact growth by country over time"
              chartType="line"
              dataType="country"
              timeRange={globalTimeRange}
              onTimeRangeChange={setGlobalTimeRange}
              showTimeRangeSelector={false}
              emptyStateMessage="No growth data available"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
