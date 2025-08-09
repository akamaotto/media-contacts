'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Users, 
  Building2, 
  Newspaper, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  change?: {
    value: number;
    percentage: number;
    period: string;
  };
  icon?: 'contacts' | 'publishers' | 'outlets' | 'verification' | 'custom';
  customIcon?: React.ReactNode;
  isLoading?: boolean;
  error?: string;
  className?: string;
}

const iconMap = {
  contacts: Users,
  publishers: Building2,
  outlets: Newspaper,
  verification: CheckCircle,
};

export function MetricCard({
  title,
  value,
  subtitle,
  change,
  icon = 'contacts',
  customIcon,
  isLoading = false,
  error,
  className
}: MetricCardProps) {
  // Handle loading state
  if (isLoading) {
    return (
      <Card className={cn('relative overflow-hidden', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Card className={cn('relative overflow-hidden border-destructive/50', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-destructive">
            {title}
          </CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-xs text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get icon component
  const IconComponent = customIcon ? null : iconMap[icon as keyof typeof iconMap];

  // Determine change styling and icon
  const getChangeDisplay = () => {
    if (!change) return null;

    const isPositive = change.percentage > 0;
    const isNegative = change.percentage < 0;
    const isNeutral = change.percentage === 0;

    let changeIcon;
    let changeColor;
    let bgColor;

    if (isPositive) {
      changeIcon = <TrendingUp className="h-3 w-3" />;
      changeColor = 'text-green-600';
      bgColor = 'bg-green-50 border-green-200';
    } else if (isNegative) {
      changeIcon = <TrendingDown className="h-3 w-3" />;
      changeColor = 'text-red-600';
      bgColor = 'bg-red-50 border-red-200';
    } else {
      changeIcon = <Minus className="h-3 w-3" />;
      changeColor = 'text-gray-600';
      bgColor = 'bg-gray-50 border-gray-200';
    }

    return (
      <Badge 
        variant="outline" 
        className={cn(
          'text-xs font-medium px-2 py-1 gap-1',
          changeColor,
          bgColor
        )}
      >
        {changeIcon}
        {isNeutral ? '0%' : `${isPositive ? '+' : ''}${change.percentage}%`}
        <span className="text-muted-foreground">vs {change.period}</span>
      </Badge>
    );
  };

  return (
    <Card className={cn('relative overflow-hidden transition-all hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">
          {customIcon || (IconComponent && <IconComponent className="h-4 w-4" />)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Main metric value */}
          <div className="text-2xl font-bold tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          
          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          )}
          
          {/* Change indicator */}
          {change && (
            <div className="flex items-center gap-2">
              {getChangeDisplay()}
              {change.value !== 0 && (
                <span className="text-xs text-muted-foreground">
                  {change.value > 0 ? '+' : ''}{change.value.toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Predefined metric card configurations
export const MetricCardConfigs = {
  totalContacts: {
    title: 'Total Contacts',
    subtitle: 'Active media contacts in your database',
    icon: 'contacts' as const,
  },
  totalPublishers: {
    title: 'Publishers',
    subtitle: 'Media publishers and organizations',
    icon: 'publishers' as const,
  },
  totalOutlets: {
    title: 'Outlets',
    subtitle: 'Media outlets and publications',
    icon: 'outlets' as const,
  },
  emailVerificationRate: {
    title: 'Email Verification',
    subtitle: 'Percentage of verified email addresses',
    icon: 'verification' as const,
  },
} as const;
