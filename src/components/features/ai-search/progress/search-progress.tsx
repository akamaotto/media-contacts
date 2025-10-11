/**
 * Search Progress Component
 * Main progress tracking component with real-time updates
 */

"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  Clock,
  BarChart3,
  X,
  RefreshCw,
  Eye,
  RotateCcw,
  Pause,
  Play
} from 'lucide-react';

import {
  SearchProgressProps,
  ProgressData,
  ProgressStageData,
  ConnectionStatus,
  CategorizedError,
  TimeEstimation,
  ProgressStatistics,
  defaultAnimations,
  progressAccessibilityLabels,
  progressColorSchemes
} from './types';
import { ProgressStage } from './progress-stage';
import { ProgressStats } from './progress-stats';
import { TimeEstimator } from './time-estimator';
import { ErrorDisplay } from './error-display';
import { useWebSocketProgress } from './use-websocket-progress';
import { aiSearchIntegrationService } from '@/lib/ai/integration/aisearch-integration-service';
import { SearchStage } from '@/lib/ai/search-orchestration/types';

export function SearchProgress({
  searchId,
  initialProgress,
  onCancel,
  onRetry,
  onViewResults,
  className,
  showDetails = true,
  compact = false,
  autoHide = false,
  persistState = true
}: SearchProgressProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [fallbackProgress, setFallbackProgress] = useState<ProgressData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);

  // WebSocket progress tracking
  const {
    connectionStatus,
    progress,
    stages,
    error,
    isCompleted,
    isRunning,
    cancelSearch,
    retrySearch,
    clearError,
    reconnect
  } = useWebSocketProgress({
    searchId,
    onProgressUpdate: (updatedProgress) => {
      // Optional custom progress update handling
    },
    onConnectionChange: (status) => {
      // Optional connection status handling
    }
  });

  // Merge initial progress with WebSocket updates
  const currentProgress = useMemo(() => {
    if (progress) {
      return progress;
    }
    if (fallbackProgress) {
      return fallbackProgress;
    }
    return initialProgress;
  }, [progress, initialProgress, fallbackProgress]);

  // Auto-hide when completed
  useEffect(() => {
    if (autoHide && isCompleted && onViewResults) {
      const timer = setTimeout(() => {
        onViewResults(searchId);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [autoHide, isCompleted, onViewResults, searchId]);

  // Fallback polling when WebSocket connection is unavailable
  useEffect(() => {
    const shouldPoll =
      searchId &&
      (connectionStatus === 'error' ||
        connectionStatus === 'disconnected' ||
        connectionStatus === 'offline');

    if (!shouldPoll) {
      setIsPolling(false);
      setPollError(null);
      return;
    }

    let cancelled = false;
    let pollTimer: NodeJS.Timeout | null = null;

    const estimatedDuration = initialProgress?.estimatedDuration;

    const fetchProgress = async () => {
      try {
        const status = await aiSearchIntegrationService.getSearchStatus(searchId);

        if (!status) {
          return;
        }

        const rawProgress = status.progress;

        const defaultProgress = {
          percentage: 0,
          stage: SearchStage.INITIALIZING,
          message: 'Starting search...',
          currentStep: 1,
          totalSteps: 5,
          stageProgress: {}
        };

        const progressPayload =
          typeof rawProgress === 'number'
            ? {
                ...defaultProgress,
                percentage: rawProgress,
                message: rawProgress >= 100 ? 'Search completed' : 'Processing search...',
                currentStep: rawProgress >= 100
                  ? defaultProgress.totalSteps
                  : Math.max(1, Math.ceil((defaultProgress.totalSteps * rawProgress) / 100)),
                totalSteps: defaultProgress.totalSteps
              }
            : rawProgress ?? defaultProgress;

        const normalizedProgress: ProgressData = {
          ...progressPayload,
          searchId,
          startTime: status.createdAt ? new Date(status.createdAt) : new Date(),
          connectionStatus: 'disconnected',
          retryCount: 0,
          lastUpdate: new Date(),
          estimatedDuration: status.metrics?.processingTime ?? estimatedDuration
        };

        if (!cancelled) {
          setFallbackProgress(normalizedProgress);
          setPollError(null);
        }

        if (!cancelled && (status.status === 'COMPLETED' || status.status === 'FAILED')) {
          setIsPolling(false);
          if (pollTimer) {
            clearInterval(pollTimer);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setPollError(err instanceof Error ? err.message : 'Unable to refresh progress');
        }
      }
    };

    setIsPolling(true);
    fetchProgress();
    pollTimer = setInterval(fetchProgress, 4000);

    return () => {
      cancelled = true;
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      setIsPolling(false);
    };
  }, [connectionStatus, searchId, initialProgress?.estimatedDuration]);

  // Handle cancel action
  const handleCancel = async () => {
    if (isCancelling) return;

    setIsCancelling(true);
    try {
      await cancelSearch();
      onCancel?.(searchId);
    } catch (error) {
      console.error('Failed to cancel search:', error);
    } finally {
      setIsCancelling(false);
    }
  };

  // Handle retry action
  const handleRetry = async () => {
    try {
      clearError();
      await retrySearch();
      onRetry?.(searchId);
    } catch (error) {
      console.error('Failed to retry search:', error);
    }
  };

  // Determine color scheme based on status
  const colorScheme = useMemo(() => {
    if (error) return progressColorSchemes.red;
    if (isCompleted) return progressColorSchemes.green;
    if (isRunning) return progressColorSchemes.blue;
    return progressColorSchemes.default;
  }, [error, isCompleted, isRunning]);

  // Status icon and text
  const statusInfo = useMemo(() => {
    if (isCompleted) {
      return {
        icon: CheckCircle2,
        text: 'Completed',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      };
    }
    if (error) {
      return {
        icon: XCircle,
        text: 'Failed',
        color: 'text-red-600',
        bgColor: 'bg-red-100'
      };
    }
    if (isRunning) {
      return {
        icon: Loader2,
        text: 'Processing',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      };
    }
    return {
      icon: Clock,
      text: 'Pending',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100'
    };
  }, [isCompleted, error, isRunning]);

  const StatusIcon = statusInfo.icon;

  // Render connection status indicator
  const renderConnectionStatus = () => {
    if (compact && !showDetails) return null;

    const statusConfig = {
      connected: { icon: Wifi, text: 'Connected', color: 'text-green-600' },
      connecting: { icon: Loader2, text: 'Connecting...', color: 'text-blue-600' },
      disconnected: { icon: WifiOff, text: 'Disconnected', color: 'text-gray-600' },
      reconnecting: { icon: RefreshCw, text: 'Reconnecting...', color: 'text-orange-600' },
      error: { icon: XCircle, text: 'Connection Error', color: 'text-red-600' },
      offline: { icon: WifiOff, text: 'Offline', color: 'text-gray-600' }
    };

    const config = statusConfig[connectionStatus];
    const ConnectionIcon = config.icon;

    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <ConnectionIcon
          className={cn(
            "h-4 w-4",
            connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
              ? "animate-spin"
              : "",
            config.color
          )}
        />
        <span className={config.color}>{config.text}</span>
        {connectionStatus === 'error' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reconnect}
            className="h-6 w-6 p-0"
            aria-label="Reconnect"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
        {isPolling && (
          <Badge variant="outline" className="text-xs">
            Refreshing via API
          </Badge>
        )}
        {pollError && (
          <span className="text-xs text-red-600" role="status">
            {pollError}
          </span>
        )}
      </div>
    );
  };

  // Render main progress bar
  const renderProgressBar = () => {
    if (!currentProgress) return null;

    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Overall Progress</span>
          <span className="text-sm text-muted-foreground">
            {currentProgress.percentage}%
          </span>
        </div>
        <Progress
          value={currentProgress.percentage}
          className="h-2"
          // Custom styling for smooth animations
          style={{
            transition: `all ${defaultAnimations.barDuration}ms ease-in-out`
          }}
        />
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{currentProgress.message}</span>
          <span>
            Step {currentProgress.currentStep} of {currentProgress.totalSteps}
          </span>
        </div>
      </div>
    );
  };

  // Render stage progress
  const renderStages = () => {
    if (!showDetails || stages.size === 0) return null;

    const stagesArray = Array.from(stages.values()).sort((a, b) => {
      // Sort by progression order
      const order = ['pending', 'queued', 'running', 'processing', 'completed', 'failed', 'skipped'];
      return order.indexOf(a.status) - order.indexOf(b.status);
    });

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Stage Details</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
            aria-label={isExpanded ? 'Collapse stages' : 'Expand stages'}
          >
            {isExpanded ? <X className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        </div>

        {isExpanded && (
          <div className="space-y-2">
            {stagesArray.map((stage) => (
              <ProgressStage
                key={stage.id}
                stage={stage}
                isCurrent={stage.isCurrent}
                expanded={stage.isExpanded}
                onToggleExpanded={() => {
                  // Toggle stage expansion logic
                }}
                showMetrics={showDetails}
                compact={compact}
                colorScheme="default"
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render action buttons
  const renderActions = () => {
    if (compact && !isExpanded) return null;

    return (
      <div className="flex flex-wrap gap-2">
        {isRunning && onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isCancelling}
            className="flex items-center gap-2"
            aria-label="Cancel search"
          >
            {isCancelling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Cancel
          </Button>
        )}

        {error && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="flex items-center gap-2"
            aria-label="Retry search"
          >
            <RotateCcw className="h-4 w-4" />
            Retry
          </Button>
        )}

        {isCompleted && onViewResults && (
          <Button
            size="sm"
            onClick={() => onViewResults(searchId)}
            className="flex items-center gap-2"
            aria-label="View results"
          >
            <Eye className="h-4 w-4" />
            View Results
          </Button>
        )}

        {showTechnicalDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            className="flex items-center gap-2"
            aria-label={showTechnicalDetails ? 'Hide details' : 'Show details'}
          >
            <BarChart3 className="h-4 w-4" />
            {showTechnicalDetails ? 'Hide' : 'Show'} Details
          </Button>
        )}
      </div>
    );
  };

  // Render error display
  const renderError = () => {
    if (!error) return null;

    return (
      <ErrorDisplay
        error={error}
        onRetry={handleRetry}
        onCancel={handleCancel}
        showTechnicalDetails={showTechnicalDetails}
        compact={compact}
      />
    );
  };

  // Auto-hide completed progress after delay
  if (autoHide && isCompleted && !showDetails) {
    return null;
  }

  return (
    <Card
      className={cn(
        "w-full max-w-4xl",
        "transition-all duration-300 ease-in-out",
        compact ? "border-0 shadow-sm" : "shadow-md",
        isCompleted && "border-green-200 bg-green-50/50",
        error && "border-red-200 bg-red-50/50",
        className
      )}
      role="region"
      aria-label={progressAccessibilityLabels.progressBar(
        currentProgress?.percentage || 0,
        currentProgress?.stage || 'unknown'
      )}
    >
      <CardHeader className={cn(compact ? "pb-3" : "pb-4")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              statusInfo.bgColor
            )}>
              <StatusIcon
                className={cn(
                  "h-5 w-5",
                  statusInfo.color,
                  statusInfo.icon === Loader2 && "animate-spin"
                )}
              />
            </div>
            <div>
              <CardTitle className={cn(
                "text-lg",
                compact && "text-base"
              )}>
                AI Search Progress
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  Search ID: {searchId.slice(0, 8)}...
                </Badge>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-xs",
                    statusInfo.bgColor,
                    statusInfo.color
                  )}
                >
                  {statusInfo.text}
                </Badge>
              </div>
            </div>
          </div>

          {!compact && (
            <div className="flex items-center gap-3">
              {renderConnectionStatus()}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-8 w-8 p-0"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <X className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn(compact ? "pt-0" : "pt-4")}>
        <div className="space-y-4">
          {/* Progress Bar */}
          {renderProgressBar()}

          {/* Error Display */}
          {renderError()}

          {/* Stage Details */}
          {isExpanded && (
            <>
              {renderStages()}

              {/* Statistics */}
              {showDetails && currentProgress && (
                <ProgressStats
                  searchId={searchId}
                  statistics={{
                    totalQueries: 0,
                    completedQueries: 0,
                    foundContacts: 0,
                    processingRate: 0,
                    averageTimePerQuery: 0,
                    successRate: 100,
                    errorCount: error ? 1 : 0,
                    retryCount: 0,
                    cacheHitRate: 0,
                    costBreakdown: {
                      queryGeneration: 0,
                      webSearch: 0,
                      contentScraping: 0,
                      contactExtraction: 0,
                      total: 0
                    }
                  }}
                  showDetails={showTechnicalDetails}
                  compact={compact}
                />
              )}

              {/* Time Estimation */}
              {currentProgress && !isCompleted && (
                <TimeEstimator
                  searchId={searchId}
                  estimation={{
                    totalEstimated: 120,
                    remaining: 60,
                    confidence: 0.8,
                    lastUpdated: new Date(),
                    basedOn: 'hybrid'
                  }}
                  showConfidence={showTechnicalDetails}
                  compact={compact}
                />
              )}
            </>
          )}

          {/* Action Buttons */}
          {renderActions()}
        </div>
      </CardContent>
    </Card>
  );
}

export default SearchProgress;
