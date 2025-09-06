'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building2 } from 'lucide-react';

interface SimplifiedMetricsCardProps {
  period: '7d' | '30d' | '3m';
  onPeriodChange: (period: '7d' | '30d' | '3m') => void;
}

interface MetricsData {
  totalContacts: number;
  verifiedContacts: number;
  totalOutlets: number;
  totalPublishers: number;
}

export function SimplifiedMetricsCard({ period, onPeriodChange }: SimplifiedMetricsCardProps) {
  const [metrics, setMetrics] = useState<MetricsData>({
    totalContacts: 0,
    verifiedContacts: 0,
    totalOutlets: 0,
    totalPublishers: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/dashboard/metrics?period=${period}`);
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [period]);

  const periodLabels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '3m': 'Last 3 months'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Key Metrics</CardTitle>
          <div className="flex items-center gap-1 rounded-md border p-1">
            {Object.entries(periodLabels).map(([key, label]) => (
              <Button
                key={key}
                variant={period === key ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-3 text-xs"
                onClick={() => onPeriodChange(key as '7d' | '30d' | '3m')}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Row 1: Contacts */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contacts</p>
                  <p className="text-2xl font-bold">
                    {metrics.verifiedContacts} <span className="text-sm font-normal text-muted-foreground">of {metrics.totalContacts}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.totalContacts > 0 ? Math.round((metrics.verifiedContacts / metrics.totalContacts) * 100) : 0}% verified
                  </p>
                </div>
              </div>
            </div>

            {/* Row 2: Outlets */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Building2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Outlets</p>
                  <p className="text-2xl font-bold">
                    {metrics.totalOutlets} <span className="text-sm font-normal text-muted-foreground">in {metrics.totalPublishers} publishers</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.totalPublishers > 0 ? Math.round(metrics.totalOutlets / metrics.totalPublishers * 10) / 10 : 0} outlets per publisher
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
