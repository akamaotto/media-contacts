/**
 * Progress Stats Component
 * Statistics panel with performance metrics and insights
 */

"use client";

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ProgressStatsProps,
  ProgressStatistics
} from './types';
import {
  BarChart3,
  TrendingUp,
  Users,
  Search,
  Clock,
  DollarSign,
  RefreshCw,
  Zap,
  Target,
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description?: string;
  compact?: boolean;
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  bgColor,
  description,
  compact = false
}: StatCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
      if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <Card className={cn(
      "border-0 shadow-sm",
      compact ? "p-3" : "p-4"
    )}>
      <CardContent className={cn("p-0", compact && "space-y-1")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg", bgColor)}>
              <Icon className={cn("h-4 w-4", color)} />
            </div>
            <div>
              <p className={cn(
                "text-sm font-medium text-muted-foreground",
                compact && "text-xs"
              )}>
                {title}
              </p>
              <p className={cn(
                "text-2xl font-bold",
                compact && "text-lg"
              )}>
                {formatValue(value)}
              </p>
            </div>
          </div>
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-600"
            )}>
              {change > 0 ? <TrendingUp className="h-3 w-3" /> :
               change < 0 ? <AlertTriangle className="h-3 w-3" /> :
               <Info className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
        {description && !compact && (
          <p className="text-xs text-muted-foreground mt-2">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ProgressStats({
  searchId,
  statistics,
  showDetails = true,
  refreshRate = 5000,
  onRefresh,
  compact = false
}: ProgressStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Handle manual refresh
  const handleRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh?.();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh statistics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate performance insights
  const insights = useMemo(() => {
    const insights = [];

    // Processing speed insight
    if (statistics.processingRate > 0) {
      if (statistics.processingRate > 10) {
        insights.push({
          type: 'success',
          title: 'High Performance',
          description: `Processing at ${statistics.processingRate.toFixed(1)} queries/second`
        });
      } else if (statistics.processingRate < 1) {
        insights.push({
          type: 'warning',
          title: 'Slow Processing',
          description: 'Processing speed is below optimal range'
        });
      }
    }

    // Success rate insight
    if (statistics.successRate < 90) {
      insights.push({
        type: 'error',
        title: 'Low Success Rate',
        description: `Only ${statistics.successRate.toFixed(1)}% of queries successful`
      });
    }

    // Cache efficiency insight
    if (statistics.cacheHitRate > 50) {
      insights.push({
        type: 'success',
        title: 'Efficient Caching',
        description: `${statistics.cacheHitRate.toFixed(1)}% cache hit rate`
      });
    }

    // Cost efficiency insight
    const costPerContact = statistics.costBreakdown.total / Math.max(statistics.foundContacts, 1);
    if (costPerContact > 0.10) {
      insights.push({
        type: 'warning',
        title: 'High Cost per Contact',
        description: `$${costPerContact.toFixed(4)} per contact found`
      });
    }

    return insights;
  }, [statistics]);

  // Main statistics cards
  const mainStats = useMemo(() => [
    {
      title: 'Queries Processed',
      value: `${statistics.completedQueries}/${statistics.totalQueries}`,
      icon: Search,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: 'Total queries executed',
      change: statistics.totalQueries > 0 ?
        (statistics.completedQueries / statistics.totalQueries) * 100 : 0
    },
    {
      title: 'Contacts Found',
      value: statistics.foundContacts,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: 'Total contacts extracted',
      change: statistics.totalQueries > 0 ?
        (statistics.foundContacts / statistics.totalQueries) * 10 : 0
    },
    {
      title: 'Processing Rate',
      value: `${statistics.processingRate.toFixed(1)}/s`,
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: 'Queries per second',
      change: statistics.processingRate > 5 ? 10 : statistics.processingRate > 0 ? 0 : -10
    },
    {
      title: 'Success Rate',
      value: `${statistics.successRate.toFixed(1)}%`,
      icon: Target,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      description: 'Query success percentage',
      change: statistics.successRate > 90 ? 5 : statistics.successRate > 70 ? 0 : -15
    }
  ], [statistics]);

  // Secondary statistics
  const secondaryStats = useMemo(() => [
    {
      title: 'Avg Time/Query',
      value: `${statistics.averageTimePerQuery.toFixed(1)}s`,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: 'Average processing time'
    },
    {
      title: 'Cache Hit Rate',
      value: `${statistics.cacheHitRate.toFixed(1)}%`,
      icon: Database,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
      description: 'Cache efficiency'
    },
    {
      title: 'Total Cost',
      value: `$${statistics.costBreakdown.total.toFixed(4)}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: 'API costs incurred'
    },
    {
      title: 'Errors',
      value: statistics.errorCount,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: 'Total errors encountered'
    }
  ], [statistics]);

  // Copy statistics to clipboard
  const copyStats = async () => {
    const statsText = `
Search Statistics for ${searchId}
================================
Queries: ${statistics.completedQueries}/${statistics.totalQueries}
Contacts Found: ${statistics.foundContacts}
Processing Rate: ${statistics.processingRate.toFixed(1)}/s
Success Rate: ${statistics.successRate.toFixed(1)}%
Average Time/Query: ${statistics.averageTimePerQuery.toFixed(1)}s
Cache Hit Rate: ${statistics.cacheHitRate.toFixed(1)}%
Total Cost: $${statistics.costBreakdown.total.toFixed(4)}
Errors: ${statistics.errorCount}
Retries: ${statistics.retryCount}
Last Updated: ${lastRefresh.toLocaleString()}
    `.trim();

    try {
      await navigator.clipboard.writeText(statsText);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy statistics:', error);
    }
  };

  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {mainStats.map((stat, index) => (
          <StatCard
            key={index}
            {...stat}
            compact={compact}
          />
        ))}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Performance Statistics</CardTitle>
            <Badge variant="outline" className="text-xs">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyStats}
              className="h-8 w-8 p-0"
              aria-label="Copy statistics"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0"
              aria-label="Refresh statistics"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  isRefreshing && "animate-spin"
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mainStats.map((stat, index) => (
            <StatCard
              key={index}
              {...stat}
            />
          ))}
        </div>

        {/* Secondary Statistics and Details */}
        {isExpanded && (
          <>
            {/* Performance Insights */}
            {insights.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Performance Insights</h4>
                <div className="grid gap-2">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        insight.type === 'success' && "border-green-200 bg-green-50/50",
                        insight.type === 'warning' && "border-yellow-200 bg-yellow-50/50",
                        insight.type === 'error' && "border-red-200 bg-red-50/50"
                      )}
                    >
                      {insight.type === 'success' && <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />}
                      {insight.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />}
                      {insight.type === 'error' && <XCircle className="h-4 w-4 text-red-600 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {insight.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {insight.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Secondary Statistics */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Detailed Metrics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {secondaryStats.map((stat, index) => (
                  <StatCard
                    key={index}
                    {...stat}
                  />
                ))}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Cost Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">
                    ${statistics.costBreakdown.queryGeneration.toFixed(4)}
                  </div>
                  <div className="text-xs text-muted-foreground">Query Generation</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold text-green-600">
                    ${statistics.costBreakdown.webSearch.toFixed(4)}
                  </div>
                  <div className="text-xs text-muted-foreground">Web Search</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold text-purple-600">
                    ${statistics.costBreakdown.contentScraping.toFixed(4)}
                  </div>
                  <div className="text-xs text-muted-foreground">Content Scraping</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-semibold text-orange-600">
                    ${statistics.costBreakdown.contactExtraction.toFixed(4)}
                  </div>
                  <div className="text-xs text-muted-foreground">Contact Extraction</div>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg border-2 border-primary">
                  <div className="text-lg font-bold text-primary">
                    ${statistics.costBreakdown.total.toFixed(4)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Cost</div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ProgressStats;