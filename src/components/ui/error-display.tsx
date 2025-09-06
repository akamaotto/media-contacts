"use client";

import React, { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Copy,
  X
} from "lucide-react";
import { AppError } from '@/lib/error-handling/error-types';
import { UserMessage, UserMessageGenerator, messageUtils } from '@/lib/error-handling/user-messages';

export interface ErrorDisplayProps {
  error: AppError;
  context?: {
    operationType?: string;
    featureName?: string;
    userRole?: string;
    hasAlternatives?: boolean;
    supportContact?: string;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showTechnicalDetails?: boolean;
  compact?: boolean;
}

export interface FallbackMessageProps {
  fallbackName: string;
  limitations?: string[];
  onDismiss?: () => void;
  className?: string;
}

export interface ErrorBoundaryDisplayProps {
  error: Error;
  resetError: () => void;
  className?: string;
}

const ICON_MAP = {
  error: AlertTriangle,
  warning: AlertCircle,
  info: Info,
  success: CheckCircle
};

/**
 * Main Error Display Component
 */
export function ErrorDisplay({
  error,
  context = {},
  onRetry,
  onDismiss,
  className = "",
  showTechnicalDetails = false,
  compact = false
}: ErrorDisplayProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const userMessage = UserMessageGenerator.generateMessage(error, context);
  const IconComponent = ICON_MAP[userMessage.icon || 'error'];

  const handleRetry = async () => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        setIsRetrying(false);
      }
    }
  };

  const handleCopyDetails = () => {
    const details = messageUtils.formatTechnicalDetails(error);
    navigator.clipboard.writeText(details);
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 border rounded-md bg-red-50 border-red-200 ${className}`}>
        <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
        <span className="text-sm text-red-800 flex-1">{userMessage.message}</span>
        {userMessage.retryable && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="h-6 px-2 text-xs"
          >
            {isRetrying ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              'Retry'
            )}
          </Button>
        )}
        {userMessage.dismissible && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Alert className={`${className}`} variant={userMessage.icon === 'error' ? 'destructive' : 'default'}>
      <IconComponent className="h-4 w-4" />
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <AlertTitle className="flex items-center gap-2">
              {userMessage.title}
              <Badge variant="outline" className="text-xs">
                {error.severity}
              </Badge>
            </AlertTitle>
            <AlertDescription className="mt-2">
              {userMessage.message}
              {userMessage.helpText && (
                <div className="mt-2 text-sm text-muted-foreground">
                  {userMessage.helpText}
                </div>
              )}
            </AlertDescription>
          </div>
          
          {userMessage.dismissible && onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 ml-2"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 mt-4">
          {userMessage.retryable && onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {userMessage.actionText || 'Retry'}
                </>
              )}
            </Button>
          )}

          {userMessage.actionUrl && (
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={userMessage.actionUrl} target="_blank" rel="noopener noreferrer">
                {userMessage.actionText || 'Learn More'}
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}

          {(showTechnicalDetails || userMessage.showDetails) && (
            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  Technical Details
                  {isDetailsOpen ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Error Details</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyDetails}
                      className="h-6 px-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {messageUtils.formatTechnicalDetails(error)}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </Alert>
  );
}

/**
 * Fallback Message Component
 */
export function FallbackMessage({
  fallbackName,
  limitations = [],
  onDismiss,
  className = ""
}: FallbackMessageProps) {
  const userMessage = UserMessageGenerator.generateFallbackMessage(fallbackName, limitations);
  const IconComponent = ICON_MAP[userMessage.icon || 'info'];

  return (
    <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
      <IconComponent className="h-4 w-4 text-blue-600" />
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <AlertTitle className="text-blue-800">{userMessage.title}</AlertTitle>
            <AlertDescription className="mt-2 text-blue-700">
              {userMessage.message}
              {userMessage.helpText && (
                <div className="mt-2 text-sm text-blue-600">
                  {userMessage.helpText}
                </div>
              )}
            </AlertDescription>
          </div>
          
          {userMessage.dismissible && onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 ml-2 text-blue-600 hover:text-blue-800"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {limitations.length > 0 && (
          <div className="mt-3">
            <div className="text-sm font-medium text-blue-800 mb-1">Limitations:</div>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              {limitations.map((limitation, index) => (
                <li key={index}>{limitation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Alert>
  );
}

/**
 * Error Boundary Display Component
 */
export function ErrorBoundaryDisplay({
  error,
  resetError,
  className = ""
}: ErrorBoundaryDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleCopyError = () => {
    const errorDetails = `Error: ${error.message}\n\nStack Trace:\n${error.stack}`;
    navigator.clipboard.writeText(errorDetails);
  };

  return (
    <div className={`min-h-[400px] flex items-center justify-center p-6 ${className}`}>
      <div className="max-w-md w-full">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="mt-2">
            An unexpected error occurred while rendering this component. 
            This has been logged and our team has been notified.
          </AlertDescription>
          
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={resetError}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            
            <Collapsible open={showDetails} onOpenChange={setShowDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  Show Details
                  {showDetails ? (
                    <ChevronUp className="ml-2 h-4 w-4" />
                  ) : (
                    <ChevronDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="p-3 bg-muted rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Error Details</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyError}
                      className="h-6 px-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {error.message}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </Alert>
      </div>
    </div>
  );
}

/**
 * Loading Error Component (for async operations)
 */
export function LoadingError({
  message = "Failed to load data",
  onRetry,
  className = ""
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center p-6 ${className}`}>
      <div className="text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground mb-3">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Network Error Component
 */
export function NetworkError({
  onRetry,
  className = ""
}: {
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center p-6 ${className}`}>
      <div className="text-center max-w-sm">
        <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
        <h3 className="font-medium mb-1">Connection Problem</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Please check your internet connection and try again.
        </p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}