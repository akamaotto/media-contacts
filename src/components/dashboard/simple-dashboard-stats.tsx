'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  CheckCircle,
  Building2,
  Newspaper,
  Globe,
  Languages,
  MapPin
} from 'lucide-react';

interface DashboardStats {
  totalContacts: number;
  verifiedContacts: number;
  totalOutlets: number;
  totalPublishers: number;
  countriesWithContacts: number;
  languagesWithContacts: number;
  regionsWithContacts: number;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
}

function StatCard({ title, value, icon: Icon, color, bgColor }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}

export function SimpleDashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    verifiedContacts: 0,
    totalOutlets: 0,
    totalPublishers: 0,
    countriesWithContacts: 0,
    languagesWithContacts: 0,
    regionsWithContacts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/dashboard/metrics');
        if (response.ok) {
          const metrics = await response.json();
          setStats({
            totalContacts: metrics.totalContacts || 0,
            verifiedContacts: metrics.verifiedContacts || 0,
            totalOutlets: metrics.totals?.outlets || 0,
            totalPublishers: metrics.totals?.publishers || 0,
            countriesWithContacts: metrics.totals?.countriesWithContacts || 0,
            languagesWithContacts: metrics.totals?.languagesWithContacts || 0,
            regionsWithContacts: metrics.totals?.regionsWithContacts || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
              <div className="h-8 w-8 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Database Overview</h2>
        <p className="text-muted-foreground">All-time statistics for your media contacts database</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <StatCard
          title="Total Contacts"
          value={stats.totalContacts}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-900/20"
        />

        <StatCard
          title="Verified Contacts"
          value={stats.verifiedContacts}
          icon={CheckCircle}
          color="text-green-600"
          bgColor="bg-green-50 dark:bg-green-900/20"
        />

        <StatCard
          title="Media Outlets"
          value={stats.totalOutlets}
          icon={Newspaper}
          color="text-purple-600"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />

        <StatCard
          title="Publishers"
          value={stats.totalPublishers}
          icon={Building2}
          color="text-orange-600"
          bgColor="bg-orange-50 dark:bg-orange-900/20"
        />

        <StatCard
          title="Countries with Contacts"
          value={stats.countriesWithContacts}
          icon={Globe}
          color="text-indigo-600"
          bgColor="bg-indigo-50 dark:bg-indigo-900/20"
        />

        <StatCard
          title="Languages with Contacts"
          value={stats.languagesWithContacts}
          icon={Languages}
          color="text-cyan-600"
          bgColor="bg-cyan-50 dark:bg-cyan-900/20"
        />

        <StatCard
          title="Regions with Contacts"
          value={stats.regionsWithContacts}
          icon={MapPin}
          color="text-teal-600"
          bgColor="bg-teal-50 dark:bg-teal-900/20"
        />
      </div>
    </div>
  );
}