'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

interface ContactsMetricCardProps {
  period: '7d' | '30d' | '3m';
  onPeriodChange: (period: '7d' | '30d' | '3m') => void;
}

interface ContactsData {
  totalContacts: number;
  verifiedContacts: number;
}

export function ContactsMetricCard({ period, onPeriodChange }: ContactsMetricCardProps) {
  const [data, setData] = useState<ContactsData>({
    totalContacts: 0,
    verifiedContacts: 0
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
            totalContacts: metrics.totalContacts,
            verifiedContacts: metrics.verifiedContacts
          });
        }
      } catch (error) {
        console.error('Error fetching contacts metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [period]);

  const periodLabels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '3m': 'Last 3 months'
  } as const;

  const verificationRate = data.totalContacts > 0 ? Math.round((data.verifiedContacts / data.totalContacts) * 100) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            Contacts
          </CardTitle>
          <div className="flex items-center gap-1 rounded-md border p-1">
            {Object.entries(periodLabels).map(([key, label]) => (
              <Button
                key={key}
                variant={period === key ? 'default' : 'ghost'}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onPeriodChange(key as '7d' | '30d' | '3m')}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
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
            <div className="text-2xl font-bold mb-2">
              {data.verifiedContacts} / {data.totalContacts} <span className="text-sm font-normal text-muted-foreground">({verificationRate}%) of contacts have verified emails</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${verificationRate}%` }}
              ></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
