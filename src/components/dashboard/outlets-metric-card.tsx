'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2 } from 'lucide-react';

interface OutletsMetricCardProps {
  period: '7d' | '30d' | '3m';
}

interface OutletsData {
  totalOutlets: number;
  totalPublishers: number;
}

export function OutletsMetricCard({ period }: OutletsMetricCardProps) {
  const [data, setData] = useState<OutletsData>({
    totalOutlets: 0,
    totalPublishers: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/dashboard/metrics?period=${period}`);
        if (response.ok) {
          const metrics = await response.json();
          setData({
            totalOutlets: metrics.totalOutlets,
            totalPublishers: metrics.totalPublishers
          });
        }
      } catch (error) {
        console.error('Error fetching outlets metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const outletsPerPublisher = data.totalPublishers > 0 ? Math.round(data.totalOutlets / data.totalPublishers * 10) / 10 : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          Outlets
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {data.totalOutlets} <span className="text-sm font-normal text-muted-foreground">in {data.totalPublishers} publishers</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {outletsPerPublisher} outlets per publisher
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(outletsPerPublisher * 20, 100)}%` }}
                ></div>
              </div>
              <span className="text-xs text-muted-foreground">{outletsPerPublisher}x</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
