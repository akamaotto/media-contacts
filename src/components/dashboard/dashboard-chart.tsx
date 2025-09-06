'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  TooltipProps
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  RefreshCw,
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ChartType = 'bar' | 'pie' | 'line';
export type TimeRange = '7d' | '30d' | '3m' | '1y';

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface DashboardChartProps {
  title: string;
  subtitle?: string;
  chartType: ChartType;
  dataType: 'country' | 'beat' | 'category' | 'language' | 'publisher' | 'geographic' | 'trending' | 'verification';
  timeRange?: TimeRange;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  showTimeRangeSelector?: boolean;
  hideRefreshButton?: boolean;
  height?: number;
  className?: string;
  emptyStateMessage?: string;
}

interface ChartData {
  type: string;
  timeRange: string;
  data: ChartDataPoint[];
  timestamp: string;
}

// Custom tooltip component for better accessibility and styling
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const isPieChart = data.payload?.percent !== undefined;
    
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {isPieChart ? `${label} (${data.value?.toLocaleString()})` : data.value?.toLocaleString()}
            {isPieChart && data.payload?.percent && 
              ` - ${(data.payload.percent * 100).toFixed(1)}%`
            }
          </span>
          {data.payload?.metadata && (
            <span className="ml-2">
              {data.payload.metadata.description && `• ${data.payload.metadata.description}`}
              {data.payload.metadata.flagEmoji && ` ${data.payload.metadata.flagEmoji}`}
            </span>
          )}
        </p>
      </div>
    );
  }
  return null;
};

// Default colors for charts - warm shades of blue
const DEFAULT_COLORS = [
  '#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE',
  '#1E3A8A', '#1D4ED8', '#2563EB', '#3B82F6', '#6366F1'
];

export function DashboardChart({
  title,
  subtitle,
  chartType,
  dataType,
  timeRange = '30d',
  onTimeRangeChange,
  showTimeRangeSelector = true,
  hideRefreshButton = false,
  height = 300,
  className,
  emptyStateMessage = 'No data available for the selected time period'
}: DashboardChartProps) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchChartData = async (selectedTimeRange: TimeRange = timeRange) => {
    try {
      setError(null);
      const response = await fetch(
        `/api/dashboard/charts?type=${dataType}&timeRange=${selectedTimeRange}&_=${Date.now()}`,
        { cache: 'no-store' }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chart data: ${response.statusText}`);
      }
      
      const data = await response.json();
      setChartData(data);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [dataType, timeRange]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchChartData();
  };

  

  const chartTypeIcons = {
    bar: BarChart3,
    pie: PieChartIcon,
    line: TrendingUp
  };

  const IconComponent = chartTypeIcons[chartType];

  // Prepare data for charts (defensive: ensure array shape)
  const rawData = Array.isArray(chartData?.data) ? (chartData!.data as ChartDataPoint[]) : [];
  const preparedData = rawData.map((item, index) => ({
    name: item.label,
    value: item.value,
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    ...item.metadata
  }));

  // Render chart based on type
  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <Skeleton className="h-full w-full" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center gap-2" style={{ height }}>
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive text-center">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      );
    }

    if (!preparedData.length) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground" style={{ height }}>
          <IconComponent className="h-8 w-8" />
          <p className="text-sm text-center">{emptyStateMessage}</p>
        </div>
      );
    }

    const commonProps = {
      width: '100%',
      height,
      'aria-label': `${title} ${chartType} chart`
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={preparedData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11 }}
                angle={0}
                textAnchor="middle"
                height={25}
                interval={0}
              />
              <YAxis 
                tick={{ fontSize: 11 }} 
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="value" 
                fill="#3B82F6"
                radius={[3, 3, 0, 0]}
                maxBarSize={50}
              >
                {preparedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer {...commonProps}>
            <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <Pie
                data={preparedData}
                cx="50%"
                cy="50%"
                outerRadius={Math.min(height * 0.5, 180)}
                innerRadius={0}
                fill="#3B82F6"
                dataKey="value"
                stroke="none"
              >
                {preparedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={preparedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

      </CardHeader>
      
      <CardContent className="pt-0">
        {renderChart()}
        
        
      </CardContent>
    </Card>
  );
}
