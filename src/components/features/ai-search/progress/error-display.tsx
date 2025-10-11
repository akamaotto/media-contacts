/**
 * Error Display Component
 * Error presentation with retry mechanisms and categorized errors
 */

"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ErrorDisplayProps,
  CategorizedError,
  errorMessagesByCategory
} from './types';
import {
  AlertTriangle,
  XCircle,
  WifiOff,
  Server,
  Shield,
  Timer,
  CreditCard,
  User,
  HelpCircle,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Mail
} from 'lucide-react';

// Error category icons and configurations
const errorCategoryConfig = {
  network: {
    icon: WifiOff,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200'
  },
  api: {
    icon: Server,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-200'
  },
  validation: {
    icon: Shield,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200'
  },
  system: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200'
  },
  timeout: {
    icon: Timer,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200'
  },
  quota: {
    icon: CreditCard,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-200'
  },
  authentication: {
    icon: User,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    borderColor: 'border-cyan-200'
  },
  unknown: {
    icon: HelpCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200'
  }
};

// Severity indicators
const severityConfig = {
  low: {
    label: 'Low',
    color: 'text-green-600 bg-green-100'
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-600 bg-yellow-100'
  },
  high: {
    label: 'High',
    color: 'text-orange-600 bg-orange-100'
  },
  critical: {
    label: 'Critical',
    color: 'text-red-600 bg-red-100'
  }
};

export function ErrorDisplay({
  error,
  onRetry,
  onSkip,
  onCancel,
  showTechnicalDetails = false,
  compact = false
}: ErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);

  const categoryConfig = errorCategoryConfig[error.category];
  const CategoryIcon = categoryConfig.icon;
  const severityInfo = severityConfig[error.severity];

  // Copy error details to clipboard
  const copyErrorDetails = async () => {
    const errorText = `
Error Details
=============
Title: ${error.title}
Message: ${error.message}
Category: ${error.category}
Severity: ${error.severity}
Retryable: ${error.retryable}
Timestamp: ${error.timestamp.toISOString()}
${error.technicalDetails ? `Technical Details: ${error.technicalDetails}` : ''}
${error.details ? `Additional Details: ${JSON.stringify(error.details, null, 2)}` : ''}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error('Failed to copy error details:', err);
    }
  };

  // Get default error configuration
  const defaultConfig = errorMessagesByCategory[error.category];

  // Render error actions
  const renderActions = () => {
    const actions = error.actions || defaultConfig.actions;
    if (actions.length === 0) return null;

    return (
      <div className={cn(
        "flex flex-wrap gap-2",
        compact ? "mt-2" : "mt-4"
      )}>
        {actions.includes('retry') && onRetry && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={onRetry}
            className="flex items-center gap-2"
            aria-label="Retry operation"
          >
            <RefreshCw className="h-4 w-4" />
            {compact ? 'Retry' : 'Try Again'}
          </Button>
        )}

        {actions.includes('skip') && onSkip && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={onSkip}
            className="flex items-center gap-2"
            aria-label="Skip current step"
          >
            Skip Step
          </Button>
        )}

        {actions.includes('cancel') && onCancel && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={onCancel}
            className="flex items-center gap-2"
            aria-label="Cancel operation"
          >
            <X className="h-4 w-4" />
            {compact ? 'Cancel' : 'Cancel Search'}
          </Button>
        )}

        {actions.includes('contact-support') && (
          <Button
            variant="outline"
            size={compact ? "sm" : "default"}
            onClick={() => {
              // Open support email or chat
              window.location.href = 'mailto:support@example.com?subject=Search Error Support';
            }}
            className="flex items-center gap-2"
            aria-label="Contact support"
          >
            <Mail className="h-4 w-4" />
            {compact ? 'Help' : 'Contact Support'}
          </Button>
        )}

        {actions.includes('view-details') && (
          <Button
            variant="ghost"
            size={compact ? "sm" : "default"}
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2"
            aria-label={isExpanded ? 'Hide details' : 'View details'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {compact ? 'Details' : 'Technical Details'}
          </Button>
        )}
      </div>
    );
  };

  // Render compact version
  if (compact) {
    return (
      <Alert className={cn(
        "border-l-4",
        categoryConfig.borderColor
      )}>
        <CategoryIcon className={cn("h-4 w-4", categoryConfig.color)} />
        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm">
            {error.title}
          </AlertTitle>
          <AlertDescription className="text-xs mt-1">
            {error.message}
          </AlertDescription>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className={cn("text-xs", severityInfo.color)}>
            {severityInfo.label}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyErrorDetails}
            className="h-6 w-6 p-0"
            aria-label="Copy error details"
          >
            {copiedToClipboard ? (
              <div className="h-3 w-3 text-green-600">✓</div>
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
        {renderActions()}
      </Alert>
    );
  }

  // Render full version
  return (
    <Alert className={cn(
      "border-l-4",
      categoryConfig.borderColor,
      error.severity === 'critical' && "border-red-500"
    )}>
      <CategoryIcon className={cn("h-5 w-5", categoryConfig.color)} />
      <div className="flex-1 space-y-3">
        {/* Error Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <AlertTitle className="flex items-center gap-2">
              {error.title}
              <Badge variant="secondary" className={cn("text-xs", severityInfo.color)}>
                {severityInfo.label} Severity
              </Badge>
              {error.retryable && (
                <Badge variant="outline" className="text-xs">
                  Retryable
                </Badge>
              )}
            </AlertTitle>
            <AlertDescription className="text-sm">
              {error.message}
            </AlertDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", categoryConfig.color, categoryConfig.bgColor)}>
              {error.category.charAt(0).toUpperCase() + error.category.slice(1)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyErrorDetails}
              className="h-8 w-8 p-0"
              aria-label="Copy error details"
            >
              {copiedToClipboard ? (
                <div className="h-4 w-4 text-green-600">✓</div>
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Error Actions */}
        {renderActions()}

        {/* Technical Details */}
        {(showTechnicalDetails || isExpanded) && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleContent className="space-y-3 mt-4">
              {error.technicalDetails && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-muted-foreground">
                    Technical Details
                  </h5>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <code className="text-xs text-monospace break-all">
                      {error.technicalDetails}
                    </code>
                  </div>
                </div>
              )}

              {error.details && Object.keys(error.details).length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-muted-foreground">
                    Additional Information
                  </h5>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(error.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Timestamp:</span>
                  <div>{error.timestamp.toLocaleString()}</div>
                </div>
                <div>
                  <span className="font-medium">Error Code:</span>
                  <div>{error.details?.code || 'N/A'}</div>
                </div>
              </div>

              {/* Suggested Actions */}
              {error.suggestedAction && (
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-muted-foreground">
                    Suggested Action
                  </h5>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      💡 {error.suggestedAction}
                    </p>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Show Details Button */}
        {!showTechnicalDetails && (
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
              aria-label={isExpanded ? 'Hide technical details' : 'Show technical details'}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide Technical Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show Technical Details
                </>
              )}
            </Button>
          </CollapsibleTrigger>
        )}
      </div>
    </Alert>
  );
}

export default ErrorDisplay;