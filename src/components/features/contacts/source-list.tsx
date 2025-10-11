/**
 * SourceList Component
 * Display of contact sources with verification status
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  IconChevronDown, 
  IconChevronRight, 
  IconExternalLink, 
  IconGlobe, 
  IconNewspaper, 
  IconUsers, 
  IconWorld,
  IconCheck,
  IconX,
  IconClock,
  IconEye,
  IconEyeOff
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { SourceListProps, ContactSource } from './types';

const sourceTypeIcons = {
  website: IconGlobe,
  social: IconUsers,
  article: IconNewspaper,
  directory: IconWorld,
  other: IconGlobe,
};

const sourceTypeLabels = {
  website: 'Website',
  social: 'Social Media',
  article: 'Article',
  directory: 'Directory',
  other: 'Other',
};

const verificationStatusConfig = {
  verified: {
    icon: IconCheck,
    color: 'text-green-600 bg-green-50 border-green-200',
    label: 'Verified',
    tooltip: 'This source has been verified and is reliable',
  },
  unverified: {
    icon: IconX,
    color: 'text-red-600 bg-red-50 border-red-200',
    label: 'Unverified',
    tooltip: 'This source has not been verified',
  },
  pending: {
    icon: IconClock,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    label: 'Pending',
    tooltip: 'This source is pending verification',
  },
};

const credibilityConfig = {
  high: {
    threshold: 0.8,
    label: 'High',
    color: 'text-green-600 bg-green-50',
  },
  medium: {
    threshold: 0.6,
    label: 'Medium',
    color: 'text-yellow-600 bg-yellow-50',
  },
  low: {
    threshold: 0.4,
    label: 'Low',
    color: 'text-orange-600 bg-orange-50',
  },
  veryLow: {
    threshold: 0,
    label: 'Very Low',
    color: 'text-red-600 bg-red-50',
  },
};

function getSourceUrl(source: ContactSource | string): string {
  if (typeof source === 'string') return source;
  return source.url;
}

function getSourceName(source: ContactSource | string): string {
  if (typeof source === 'string') {
    try {
      const url = new URL(source);
      return url.hostname;
    } catch {
      return source;
    }
  }
  return source.name;
}

function getSourceType(source: ContactSource | string): string {
  if (typeof source === 'string') return 'website';
  return source.type;
}

function isSourceVerified(source: ContactSource | string): boolean {
  if (typeof source === 'string') return false;
  return source.verified;
}

function getSourceCredibility(source: ContactSource | string): number {
  if (typeof source === 'string') return 0.5;
  return source.credibility;
}

function getCredibilityLevel(credibility: number): keyof typeof credibilityConfig {
  if (credibility >= credibilityConfig.high.threshold) return 'high';
  if (credibility >= credibilityConfig.medium.threshold) return 'medium';
  if (credibility >= credibilityConfig.low.threshold) return 'low';
  return 'veryLow';
}

export function SourceList({
  sources,
  verified = false,
  compact = false,
  maxItems,
  className,
}: SourceListProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [hiddenSources, setHiddenSources] = useState<Set<string>>(new Set());

  // Convert sources to ContactSource format if they're strings
  const normalizedSources: ContactSource[] = sources.map(source => {
    if (typeof source === 'string') {
      try {
        const url = new URL(source);
        return {
          id: source,
          url: source,
          name: url.hostname,
          type: 'website',
          credibility: 0.5,
          verified: false,
          lastUpdated: new Date(),
        };
      } catch {
        return {
          id: source,
          url: source,
          name: source,
          type: 'other',
          credibility: 0.5,
          verified: false,
          lastUpdated: new Date(),
        };
      }
    }
    return source;
  });

  // Filter by verification status if specified
  const filteredSources = verified 
    ? normalizedSources.filter(source => source.verified)
    : normalizedSources;

  // Limit items if maxItems is specified
  const displaySources = maxItems 
    ? filteredSources.slice(0, maxItems)
    : filteredSources;

  const hasMoreItems = maxItems && filteredSources.length > maxItems;
  const hiddenCount = filteredSources.length - displaySources.length;

  const toggleSourceVisibility = (sourceId: string) => {
    setHiddenSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sourceId)) {
        newSet.delete(sourceId);
      } else {
        newSet.add(sourceId);
      }
      return newSet;
    });
  };

  if (displaySources.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground italic', className)}>
        No sources available
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-auto p-2"
          >
            <span className="font-medium">
              Sources ({filteredSources.length})
            </span>
            {expanded ? (
              <IconChevronDown className="h-4 w-4" />
            ) : (
              <IconChevronRight className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-2">
          {displaySources.map((source, index) => {
            const isHidden = hiddenSources.has(source.id);
            const Icon = sourceTypeIcons[source.type];
            const credibilityLevel = getCredibilityLevel(source.credibility);
            const credibilityConfig = credibilityConfig[credibilityLevel];
            const verificationConfig = source.verified 
              ? verificationStatusConfig.verified 
              : verificationStatusConfig.unverified;
            const VerificationIcon = verificationConfig.icon;

            return (
              <Card key={source.id} className="p-3">
                <CardContent className="p-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-sm truncate">
                            {source.name}
                          </h4>
                          
                          <Badge variant="outline" className="text-xs">
                            {sourceTypeLabels[source.type]}
                          </Badge>
                          
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', credibilityConfig.color)}
                          >
                            {credibilityConfig.label} Credibility
                          </Badge>
                          
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs', verificationConfig.color)}
                          >
                            <VerificationIcon className="h-3 w-3 mr-1" />
                            {verificationConfig.label}
                          </Badge>
                        </div>
                        
                        {!compact && (
                          <div className="text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span>Credibility: {Math.round(source.credibility * 100)}%</span>
                              <Separator orientation="vertical" className="h-3" />
                              <span>Updated: {source.lastUpdated.toLocaleDateString()}</span>
                            </div>
                            
                            {source.metadata && Object.keys(source.metadata).length > 0 && (
                              <div className="mt-1">
                                <span className="font-medium">Metadata:</span>
                                <ul className="ml-2 mt-1 space-y-1">
                                  {Object.entries(source.metadata).slice(0, 2).map(([key, value]) => (
                                    <li key={key} className="text-xs">
                                      {key}: {String(value)}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => toggleSourceVisibility(source.id)}
                            >
                              {isHidden ? (
                                <IconEyeOff className="h-4 w-4" />
                              ) : (
                                <IconEye className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{isHidden ? 'Show' : 'Hide'} source</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              asChild
                            >
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <IconExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Visit source</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {hasMoreItems && (
            <div className="text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpanded(false)}
                className="text-xs"
              >
                Show {hiddenCount} more sources
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// Compact source list for inline display
export function SourceListCompact({
  sources,
  maxItems = 3,
  className,
}: {
  sources: (ContactSource | string)[];
  maxItems?: number;
  className?: string;
}) {
  const displaySources = sources.slice(0, maxItems);
  const hasMore = sources.length > maxItems;

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {displaySources.map((source, index) => {
        const Icon = sourceTypeIcons[getSourceType(source)];
        const isVerified = isSourceVerified(source);
        const credibility = getSourceCredibility(source);
        const credibilityLevel = getCredibilityLevel(credibility);

        return (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs gap-1',
                    credibilityConfig[credibilityLevel].color,
                    !isVerified && 'opacity-70'
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {getSourceName(source)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{getSourceName(source)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getSourceUrl(source)}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span>Credibility: {Math.round(credibility * 100)}%</span>
                    <span>•</span>
                    <span>{isVerified ? 'Verified' : 'Unverified'}</span>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      
      {hasMore && (
        <Badge variant="outline" className="text-xs">
          +{sources.length - maxItems} more
        </Badge>
      )}
    </div>
  );
}

// Source verification status indicator
export function SourceVerificationStatus({
  source,
  className,
}: {
  source: ContactSource | string;
  className?: string;
}) {
  const isVerified = isSourceVerified(source);
  const config = isVerified 
    ? verificationStatusConfig.verified 
    : verificationStatusConfig.unverified;
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn('text-xs gap-1', config.color, className)}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default SourceList;