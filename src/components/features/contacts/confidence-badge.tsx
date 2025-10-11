/**
 * ConfidenceBadge Component
 * Visual indicator for data quality and reliability with color coding
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ConfidenceBadgeProps } from './types';

const confidenceConfig = {
  high: {
    threshold: 0.8,
    label: 'High',
    color: 'bg-green-100 text-green-800 border-green-200',
    tooltip: 'High confidence - Data is reliable and well-verified',
    icon: '✓',
  },
  medium: {
    threshold: 0.6,
    label: 'Medium',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    tooltip: 'Medium confidence - Data is likely accurate but needs verification',
    icon: '~',
  },
  low: {
    threshold: 0.4,
    label: 'Low',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    tooltip: 'Low confidence - Data may be incomplete or inaccurate',
    icon: '!',
  },
  veryLow: {
    threshold: 0,
    label: 'Very Low',
    color: 'bg-red-100 text-red-800 border-red-200',
    tooltip: 'Very low confidence - Data is unreliable and needs review',
    icon: '✗',
  },
};

const sizeConfig = {
  sm: {
    className: 'text-xs px-1.5 py-0.5',
    iconSize: 'text-xs',
  },
  md: {
    className: 'text-sm px-2 py-1',
    iconSize: 'text-sm',
  },
  lg: {
    className: 'text-base px-3 py-1.5',
    iconSize: 'text-base',
  },
};

const variantConfig = {
  default: {
    className: '',
    showIcon: true,
    showLabel: true,
  },
  outline: {
    className: 'border-2',
    showIcon: true,
    showLabel: true,
  },
  subtle: {
    className: 'bg-opacity-50 border-opacity-50',
    showIcon: false,
    showLabel: true,
  },
  minimal: {
    className: 'px-1.5 py-0.5',
    showIcon: false,
    showLabel: false,
  },
};

export function ConfidenceBadge({
  confidence,
  showLabel = true,
  size = 'md',
  variant = 'default',
  className,
  ...props
}: ConfidenceBadgeProps) {
  // Determine confidence level
  const getConfidenceLevel = (score: number) => {
    if (score >= confidenceConfig.high.threshold) return 'high';
    if (score >= confidenceConfig.medium.threshold) return 'medium';
    if (score >= confidenceConfig.low.threshold) return 'low';
    return 'veryLow';
  };

  const level = getConfidenceLevel(confidence);
  const config = confidenceConfig[level];
  const sizeConfig = sizeConfig[size];
  const variantConfig = variantConfig[variant];

  // Calculate percentage for display
  const percentage = Math.round(confidence * 100);
  const shouldShowLabel = showLabel && variantConfig.showLabel;
  const shouldShowIcon = variantConfig.showIcon;

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        config.color,
        sizeConfig.className,
        variantConfig.className,
        'font-medium flex items-center gap-1 transition-colors',
        className
      )}
      {...props}
    >
      {shouldShowIcon && (
        <span className={sizeConfig.iconSize} aria-hidden="true">
          {config.icon}
        </span>
      )}
      {shouldShowLabel && (
        <span>
          {config.label} ({percentage}%)
        </span>
      )}
      {!shouldShowLabel && !shouldShowIcon && (
        <span className="w-2 h-2 rounded-full bg-current" />
      )}
    </Badge>
  );

  // Wrap in tooltip for additional context
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badgeContent}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{config.label} Confidence</p>
            <p className="text-sm text-muted-foreground">{config.tooltip}</p>
            <div className="flex items-center gap-2 text-xs">
              <span>Score:</span>
              <span className="font-mono">{confidence.toFixed(3)}</span>
              <span>({percentage}%)</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Confidence Bar component for visual representation
export function ConfidenceBar({
  confidence,
  showLabel = false,
  size = 'md',
  className,
}: {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const percentage = Math.round(confidence * 100);
  const level = confidence >= 0.8 ? 'high' : 
                confidence >= 0.6 ? 'medium' : 
                confidence >= 0.4 ? 'low' : 'veryLow';
  
  const colors = {
    high: 'bg-green-500',
    medium: 'bg-yellow-500',
    low: 'bg-orange-500',
    veryLow: 'bg-red-500',
  };

  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Confidence</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div className={cn('w-full bg-gray-200 rounded-full', heights[size])}>
        <div
          className={cn(
            colors[level],
            heights[size],
            'rounded-full transition-all duration-300 ease-out'
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Confidence: ${percentage}%`}
        />
      </div>
    </div>
  );
}

// Confidence Score component for detailed view
export function ConfidenceScore({
  confidence,
  showBreakdown = false,
  size = 'md',
  className,
}: {
  confidence: number;
  showBreakdown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const percentage = Math.round(confidence * 100);
  const level = confidence >= 0.8 ? 'High' : 
                confidence >= 0.6 ? 'Medium' : 
                confidence >= 0.4 ? 'Low' : 'Very Low';

  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-2">
        <ConfidenceBadge confidence={confidence} size={size} variant="minimal" />
        <span className={cn('font-medium', sizes[size])}>
          {level}
        </span>
        <span className={cn('text-muted-foreground', sizes[size])}>
          ({percentage}%)
        </span>
      </div>
      
      {showBreakdown && (
        <div className="ml-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Data Quality:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={cn(
                    'text-xs',
                    star <= Math.ceil(confidence * 5) 
                      ? 'text-yellow-500' 
                      : 'text-gray-300'
                  )}
                >
                  ★
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Confidence Legend component for reference
export function ConfidenceLegend({
  orientation = 'horizontal',
  className,
}: {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}) {
  const legendItems = Object.entries(confidenceConfig).map(([key, config]) => (
    <div key={key} className="flex items-center gap-2">
      <ConfidenceBadge 
        confidence={config.threshold + 0.01} 
        size="sm" 
        variant="minimal"
      />
      <span className="text-sm text-muted-foreground">{config.label}</span>
      <span className="text-xs text-muted-foreground">
        ({Math.round(config.threshold * 100)}%+)
      </span>
    </div>
  ));

  return (
    <div className={cn(
      'flex gap-4',
      orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
      className
    )}>
      {legendItems}
    </div>
  );
}

// Export the default component
export default ConfidenceBadge;