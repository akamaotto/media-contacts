/**
 * Time Estimator Component
 * ETA calculation and display component with confidence levels
 */

"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  TimeEstimatorProps,
  TimeEstimation
} from './types';
import {
  Clock,
  Timer,
  TrendingUp,
  AlertTriangle,
  Info,
  Settings,
  ChevronDown,
  ChevronUp,
  Zap,
  Turtle,
  BarChart3
} from 'lucide-react';

// Time formatting utilities
const formatTime = (seconds: number, format: 'short' | 'long' | 'compact' = 'long'): string => {
  if (seconds <= 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  switch (format) {
    case 'short':
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${secs}s`;
      return `${secs}s`;

    case 'compact':
      if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      if (minutes > 0) return `${minutes}:${secs.toString().padStart(2, '0')}`;
      return `0:${secs.toString().padStart(2, '0')}`;

    case 'long':
    default:
      if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
      if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`;
      return `${secs} second${secs !== 1 ? 's' : ''}`;
  }
};

// Confidence level display
const getConfidenceInfo = (confidence: number) => {
  if (confidence >= 0.8) {
    return {
      level: 'High',
      color: 'text-green-600 bg-green-100',
      icon: TrendingUp,
      description: 'Based on similar searches and current progress'
    };
  } else if (confidence >= 0.5) {
    return {
      level: 'Medium',
      color: 'text-yellow-600 bg-yellow-100',
      icon: Info,
      description: 'Estimate based on current processing speed'
    };
  } else {
    return {
      level: 'Low',
      color: 'text-red-600 bg-red-100',
      icon: AlertTriangle,
      description: 'Limited data for accurate estimation'
    };
  }
};

// Speed indicator
const getSpeedIndicator = (totalEstimated: number, remaining: number) => {
  const progress = ((totalEstimated - remaining) / totalEstimated) * 100;

  if (progress < 25) return { icon: Turtle, text: 'Starting up', color: 'text-blue-600' };
  if (progress < 75) return { icon: Timer, text: 'Processing', color: 'text-orange-600' };
  return { icon: Zap, text: 'Finishing up', color: 'text-green-600' };
};

export function TimeEstimator({
  searchId,
  estimation,
  showConfidence = true,
  compact = false,
  format = 'long'
}: TimeEstimatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for accurate countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate updated remaining time based on elapsed time since last update
  const updatedEstimation = useMemo(() => {
    const elapsedSinceUpdate = (currentTime.getTime() - estimation.lastUpdated.getTime()) / 1000;
    const adjustedRemaining = Math.max(0, estimation.remaining - elapsedSinceUpdate);

    return {
      ...estimation,
      remaining: adjustedRemaining
    };
  }, [estimation, currentTime]);

  const confidenceInfo = useMemo(() =>
    getConfidenceInfo(estimation.confidence),
    [estimation.confidence]
  );

  const speedIndicator = useMemo(() =>
    getSpeedIndicator(estimation.totalEstimated, updatedEstimation.remaining),
    [estimation.totalEstimated, updatedEstimation.remaining]
  );

  const SpeedIcon = speedIndicator.icon;
  const ConfidenceIcon = confidenceInfo.icon;

  // Calculate progress percentage for visual representation
  const progressPercentage = estimation.totalEstimated > 0
    ? ((estimation.totalEstimated - updatedEstimation.remaining) / estimation.totalEstimated) * 100
    : 0;

  // Render compact version
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">
          {formatTime(updatedEstimation.remaining, 'compact')} remaining
        </span>
        {showConfidence && (
          <Badge variant="outline" className={cn("text-xs", confidenceInfo.color)}>
            {confidenceInfo.level}
          </Badge>
        )}
      </div>
    );
  }

  // Render detailed version
  return (
    <Card className="w-full">
      <CardHeader className={cn("pb-3", !showDetails && "pb-0")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Time Estimation</CardTitle>
            <Badge variant="outline" className="text-xs">
              {speedIndicator.text}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {showConfidence && (
              <Badge variant="secondary" className={cn("text-xs", confidenceInfo.color)}>
                <ConfidenceIcon className="h-3 w-3 mr-1" />
                {confidenceInfo.level} Confidence
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
              className="h-8 w-8 p-0"
              aria-label={showDetails ? 'Hide details' : 'Show details'}
            >
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-4", !showDetails && "pt-0")}>
        {/* Main Time Display */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <SpeedIcon className={cn("h-6 w-6", speedIndicator.color)} />
            <div className="text-3xl font-bold">
              {formatTime(updatedEstimation.remaining, format)}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Estimated time remaining
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progressPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Detailed Information */}
        {showDetails && (
          <div className="space-y-4 pt-4 border-t">
            {/* Time Breakdown */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-lg font-semibold text-blue-600">
                  {formatTime(estimation.totalEstimated - updatedEstimation.remaining, 'short')}
                </div>
                <div className="text-xs text-muted-foreground">Elapsed</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-semibold text-orange-600">
                  {formatTime(updatedEstimation.remaining, 'short')}
                </div>
                <div className="text-xs text-muted-foreground">Remaining</div>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-semibold text-green-600">
                  {formatTime(estimation.totalEstimated, 'short')}
                </div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
            </div>

            {/* Confidence Information */}
            {showConfidence && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ConfidenceIcon className={cn("h-4 w-4", confidenceInfo.color.replace('text-', 'text-'))} />
                  <span className="text-sm font-medium">Confidence Level</span>
                  <Badge variant="outline" className={cn("text-xs ml-auto", confidenceInfo.color)}>
                    {(estimation.confidence * 100).toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  {confidenceInfo.description}
                </p>
              </div>
            )}

            {/* Estimation Method */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Estimation Method</span>
              </div>
              <div className="ml-6">
                <Badge variant="secondary" className="text-xs">
                  {estimation.basedOn.charAt(0).toUpperCase() + estimation.basedOn.slice(1)}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated: {estimation.lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Performance Tips */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Performance Note</span>
              </div>
              <div className="ml-6 text-xs text-muted-foreground">
                {estimation.confidence < 0.5 && (
                  <p>⚠️ Low confidence estimate. Time may vary significantly based on search complexity.</p>
                )}
                {updatedEstimation.remaining < 30 && (
                  <p>🎯 Almost there! The search is in its final stages.</p>
                )}
                {updatedEstimation.remaining > 300 && (
                  <p>🔄 This is a comprehensive search. Progress updates will continue as we process results.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TimeEstimator;