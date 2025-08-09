'use client';

import { useState, useEffect } from 'react';
import { MetricCard, MetricCardConfigs } from './metric-card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardMetrics {
  totalContacts: number;
  totalPublishers: number;
  totalOutlets: number;
  emailVerificationRate: number;
  contactsChange: {
    value: number;
    percentage: number;
    period: string;
  };
  publishersChange: {
    value: number;
    percentage: number;
    period: string;
  };
  outletsChange: {
    value: number;
    percentage: number;
    period: string;
  };
  verificationChange: {
    value: number;
    percentage: number;
    period: string;
  };
}

interface MetricsSectionProps {
  className?: string;
  period?: '7d' | '30d' | '3m';
  onPeriodChange?: (period: '7d' | '30d' | '3m') => void;
}

export function MetricsSection({ 
  className, 
  period = '30d', 
  onPeriodChange 
}: MetricsSectionProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMetrics = async (selectedPeriod: string = period) => {
    try {
      setError(null);
      const response = await fetch(`/api/dashboard/metrics?period=${selectedPeriod}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMetrics();
  };

  const handlePeriodChange = (newPeriod: '7d' | '30d' | '3m') => {
    if (onPeriodChange) {
      onPeriodChange(newPeriod);
    }
    setIsLoading(true);
    fetchMetrics(newPeriod);
  };

  const periodLabels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '3m': 'Last 3 months'
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Key Metrics</h2>
          <p className="text-sm text-muted-foreground">
            Overview of your media database performance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1 rounded-md border p-1">
            {Object.entries(periodLabels).map(([key, label]) => (
              <Button
                key={key}
                variant={period === key ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handlePeriodChange(key as '7d' | '30d' | '3m')}
                disabled={isLoading}
              >
                {label}
              </Button>
            ))}
          </div>
          
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn(
              'h-3 w-3',
              (isLoading || isRefreshing) && 'animate-spin'
            )} />
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          {...MetricCardConfigs.totalContacts}
          value={metrics?.totalContacts ?? 0}
          change={metrics?.contactsChange}
          isLoading={isLoading}
          error={error ? 'Failed to load' : undefined}
        />
        
        <MetricCard
          {...MetricCardConfigs.totalPublishers}
          value={metrics?.totalPublishers ?? 0}
          change={metrics?.publishersChange}
          isLoading={isLoading}
          error={error ? 'Failed to load' : undefined}
        />
        
        <MetricCard
          {...MetricCardConfigs.totalOutlets}
          value={metrics?.totalOutlets ?? 0}
          change={metrics?.outletsChange}
          isLoading={isLoading}
          error={error ? 'Failed to load' : undefined}
        />
        
        <MetricCard
          {...MetricCardConfigs.emailVerificationRate}
          value={metrics?.emailVerificationRate ? `${metrics.emailVerificationRate}%` : '0%'}
          change={metrics?.verificationChange}
          isLoading={isLoading}
          error={error ? 'Failed to load' : undefined}
        />
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-destructive">
                Failed to load metrics
              </h3>
              <p className="text-sm text-destructive/80 mt-1">
                {error}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
