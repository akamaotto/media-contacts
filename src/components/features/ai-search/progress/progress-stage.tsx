/**
 * Progress Stage Component
 * Individual stage component with status, metrics, and details
 */

"use client";

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ProgressStageProps,
  StageStatus,
  StageMetrics,
  StageError,
  progressAccessibilityLabels,
  defaultAnimations
} from './types';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Play,
  Pause,
  SkipForward,
  Info,
  TrendingUp,
  Zap,
  Target,
  Database,
  Search,
  FileText,
  Users,
  BarChart3
} from 'lucide-react';

// Stage-specific icons
const stageIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  initializing: Clock,
  query_generation: Target,
  web_search: Search,
  content_scraping: FileText,
  contact_extraction: Users,
  result_aggregation: BarChart3,
  finalization: CheckCircle2,
  completed: CheckCircle2,
  failed: XCircle,
  cancelled: XCircle
};

// Status-specific colors
const statusColors = {
  pending: 'text-gray-500 bg-gray-100',
  queued: 'text-blue-500 bg-blue-100',
  running: 'text-blue-600 bg-blue-100',
  processing: 'text-blue-600 bg-blue-100 animate-pulse',
  completed: 'text-green-600 bg-green-100',
  failed: 'text-red-600 bg-red-100',
  skipped: 'text-gray-400 bg-gray-100',
  retrying: 'text-orange-600 bg-orange-100',
  paused: 'text-yellow-600 bg-yellow-100'
};

// Status-specific icons
const statusIcons: Record<StageStatus, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  queued: Pause,
  running: Loader2,
  processing: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
  skipped: SkipForward,
  retrying: RefreshCw,
  paused: Pause
};

export function ProgressStage({
  stage,
  isCurrent,
  expanded = false,
  onToggleExpanded,
  showMetrics = true,
  compact = false,
  colorScheme = 'default'
}: ProgressStageProps) {
  const StageIcon = stage.icon || stageIcons[stage.id] || Clock;
  const StatusIcon = statusIcons[stage.status];

  // Determine stage color based on status
  const stageColor = useMemo(() => {
    switch (stage.status) {
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'running':
      case 'processing':
        return 'text-blue-600';
      case 'retrying':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  }, [stage.status]);

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Format processing rate
  const formatProcessingRate = (rate?: number) => {
    if (!rate) return 'N/A';
    if (rate < 1) return `${(rate * 60).toFixed(1)}/min`;
    return `${rate.toFixed(1)}/s`;
  };

  // Render status badge
  const renderStatusBadge = () => {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "text-xs font-medium capitalize",
          statusColors[stage.status]
        )}
      >
        <StatusIcon
          className={cn(
            "h-3 w-3 mr-1",
            (stage.status === 'running' || stage.status === 'processing') && "animate-spin"
          )}
        />
        {stage.status.replace('_', ' ')}
      </Badge>
    );
  };

  // Render progress bar for active stages
  const renderProgressBar = () => {
    if (stage.status === 'completed' || stage.status === 'failed') {
      return (
        <Progress
          value={stage.status === 'completed' ? 100 : 0}
          className="h-1"
        />
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{stage.progress}%</span>
        </div>
        <Progress
          value={stage.progress}
          className="h-1"
          style={{
            transition: `all ${defaultAnimations.barDuration}ms ease-in-out`
          }}
        />
      </div>
    );
  };

  // Render stage metrics
  const renderMetrics = () => {
    if (!showMetrics || !stage.metrics || compact) return null;

    const { metrics } = stage;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/30 rounded-lg">
        {metrics.itemsProcessed !== undefined && (
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {metrics.itemsProcessed}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.totalItems ? `of ${metrics.totalItems}` : 'Items'}
            </div>
          </div>
        )}

        {metrics.processingRate !== undefined && (
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {formatProcessingRate(metrics.processingRate)}
            </div>
            <div className="text-xs text-muted-foreground">
              Processing Rate
            </div>
          </div>
        )}

        {metrics.successRate !== undefined && (
          <div className="text-center">
            <div className="text-lg font-semibold text-emerald-600">
              {metrics.successRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Success Rate
            </div>
          </div>
        )}

        {metrics.cacheHitRate !== undefined && (
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">
              {metrics.cacheHitRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Cache Hit Rate
            </div>
          </div>
        )}

        {metrics.cost !== undefined && (
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">
              ${metrics.cost.toFixed(4)}
            </div>
            <div className="text-xs text-muted-foreground">
              Cost
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render error information
  const renderError = () => {
    if (!stage.error) return null;

    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-red-800">
              {stage.error.code}
            </div>
            <div className="text-sm text-red-700 mt-1">
              {stage.error.message}
            </div>
            {stage.error.suggestedAction && (
              <div className="text-xs text-red-600 mt-2">
                Suggested: {stage.error.suggestedAction}
              </div>
            )}
          </div>
          {stage.error.retryable && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                // Handle retry logic
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Render detailed stage information
  const renderDetails = () => {
    if (!expanded) return null;

    return (
      <div className="space-y-3 mt-3">
        {renderMetrics()}
        {renderError()}

        {/* Timing Information */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {stage.startTime && (
            <div>
              Started: {stage.startTime.toLocaleTimeString()}
            </div>
          )}
          {stage.endTime && (
            <div>
              Ended: {stage.endTime.toLocaleTimeString()}
            </div>
          )}
          {stage.duration && (
            <div>
              Duration: {formatDuration(stage.duration)}
            </div>
          )}
        </div>

        {/* Stage Description */}
        {stage.description && (
          <div className="text-sm text-muted-foreground">
            {stage.description}
          </div>
        )}
      </div>
    );
  };

  return (
    <Collapsible
      open={expanded}
      onOpenChange={onToggleExpanded}
      className="w-full"
    >
      <div className={cn(
        "border rounded-lg p-3 space-y-2",
        isCurrent && "border-blue-200 bg-blue-50/30",
        stage.status === 'completed' && "border-green-200 bg-green-50/30",
        stage.status === 'failed' && "border-red-200 bg-red-50/30",
        !isCurrent && stage.status === 'pending' && "border-gray-200 bg-gray-50/30"
      )}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between h-auto p-0 hover:bg-transparent"
            aria-label={progressAccessibilityLabels.expandStage(stage.name)}
          >
            <div className="flex items-center gap-3 flex-1">
              {/* Stage Icon */}
              <div className={cn(
                "p-2 rounded-full",
                stageColor,
                "bg-opacity-10"
              )}>
                <StageIcon
                  className={cn(
                    "h-4 w-4",
                    (stage.status === 'running' || stage.status === 'processing') && "animate-pulse"
                  )}
                />
              </div>

              {/* Stage Information */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium truncate">
                    {stage.name}
                  </h4>
                  {isCurrent && (
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {renderStatusBadge()}
                  {stage.progress > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {stage.progress}% complete
                    </span>
                  )}
                </div>
              </div>

              {/* Expand/Collapse Icon */}
              <div className="flex items-center gap-2">
                {stage.status === 'running' || stage.status === 'processing' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                ) : expanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </Button>
        </CollapsibleTrigger>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Detailed Information */}
        <CollapsibleContent>
          {renderDetails()}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default ProgressStage;