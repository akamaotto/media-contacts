import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * Enhanced metric card skeleton loader
 */
export function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Enhanced chart skeleton loader
 */
export function ChartSkeleton({ height = 400 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart area */}
          <div 
            className="relative bg-muted/20 rounded-lg overflow-hidden"
            style={{ height }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            
            {/* Mock chart elements */}
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between space-x-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted/40 rounded-t"
                  style={{
                    height: `${Math.random() * 60 + 20}%`,
                    width: '12%',
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Enhanced activity feed skeleton loader
 */
export function ActivityFeedSkeleton({ items = 10 }: { items?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="flex items-start space-x-3">
              {/* Activity icon */}
              <div className="flex-shrink-0 mt-1">
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              
              {/* Activity content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Enhanced geographic visualization skeleton loader
 */
export function GeographicSkeleton({ height = 500 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-52" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Map area */}
          <div 
            className="relative bg-muted/20 rounded-lg overflow-hidden"
            style={{ height }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            
            {/* Mock geographic elements */}
            <div className="absolute inset-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute bg-muted/60 rounded-full"
                  style={{
                    top: `${Math.random() * 80}%`,
                    left: `${Math.random() * 80}%`,
                    width: `${Math.random() * 20 + 10}px`,
                    height: `${Math.random() * 20 + 10}px`,
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Geographic legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-2 w-12" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Enhanced metrics section skeleton loader
 */
export function MetricsSectionSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      
      {/* Metric cards grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Enhanced dashboard content skeleton loader
 */
export function DashboardContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metrics section */}
      <MetricsSectionSkeleton />
      
      {/* Tabs skeleton */}
      <div className="space-y-4">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg w-fit">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
        
        {/* Tab content */}
        <div className="grid gap-6 md:grid-cols-2">
          <ChartSkeleton height={350} />
          <ChartSkeleton height={350} />
        </div>
      </div>
    </div>
  );
}

/**
 * Progressive loading skeleton that reveals content gradually
 */
export function ProgressiveLoadingSkeleton({ 
  stage = 1, 
  totalStages = 3 
}: { 
  stage?: number; 
  totalStages?: number; 
}) {
  return (
    <div className="space-y-6">
      {/* Stage 1: Metrics */}
      {stage >= 1 && <MetricsSectionSkeleton />}
      
      {/* Stage 2: Charts */}
      {stage >= 2 && (
        <div className="grid gap-6 md:grid-cols-2">
          <ChartSkeleton height={300} />
          <ChartSkeleton height={300} />
        </div>
      )}
      
      {/* Stage 3: Activity */}
      {stage >= 3 && <ActivityFeedSkeleton items={5} />}
      
      {/* Loading progress indicator */}
      <div className="flex items-center justify-center space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Loading dashboard... ({stage}/{totalStages})
        </div>
        <div className="flex space-x-1">
          {Array.from({ length: totalStages }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${
                i < stage ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
