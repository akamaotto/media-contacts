/**
 * Enhanced Error Boundary with Recovery Options
 * Provides user-friendly error handling with recovery actions
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
  showErrorDetails?: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error('🚨 [ERROR-BOUNDARY] Caught error:', error);
    console.error('🚨 [ERROR-BOUNDARY] Error info:', errorInfo);
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount >= maxRetries) {
      return;
    }

    this.setState({ isRetrying: true });

    // Clear any existing timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Retry after a short delay
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1,
        isRetrying: false
      });
    }, 1000);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-destructive">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  An unexpected error occurred. This has been logged and will be investigated.
                </AlertDescription>
              </Alert>

              {this.props.showErrorDetails && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Error Details
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="font-mono text-xs break-all">
                      {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <pre className="mt-2 text-xs overflow-auto max-h-32">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={this.handleRetry}
                  disabled={this.state.isRetrying || this.state.retryCount >= (this.props.maxRetries || 3)}
                  className="flex-1"
                >
                  {this.state.isRetrying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry ({this.state.retryCount}/{this.props.maxRetries || 3})
                    </>
                  )}
                </Button>
                
                <Button onClick={this.handleReload} variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                
                <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                If this problem persists, please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Network Status Indicator Component
 */
interface NetworkStatusProps {
  isOnline: boolean;
  connectionQuality: 'good' | 'poor' | 'offline';
  onRetry?: () => void;
  className?: string;
}

export function NetworkStatusIndicator({ 
  isOnline, 
  connectionQuality, 
  onRetry, 
  className = '' 
}: NetworkStatusProps) {
  if (connectionQuality === 'offline' || !isOnline) {
    return (
      <Alert className={`border-destructive/50 bg-destructive/10 ${className}`}>
        <WifiOff className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>You're offline. Some features may not work.</span>
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (connectionQuality === 'poor') {
    return (
      <Alert className={`border-warning/50 bg-warning/10 ${className}`}>
        <Wifi className="h-4 w-4" />
        <AlertDescription>
          Poor connection detected. Some features may be slow.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

/**
 * Loading State with Retry Component
 */
interface LoadingWithRetryProps {
  isLoading: boolean;
  error?: string | null;
  onRetry?: () => void;
  loadingMessage?: string;
  retryMessage?: string;
  children: ReactNode;
  showSkeleton?: boolean;
  skeletonComponent?: ReactNode;
}

export function LoadingWithRetry({
  isLoading,
  error,
  onRetry,
  loadingMessage = 'Loading...',
  retryMessage = 'Something went wrong',
  children,
  showSkeleton = false,
  skeletonComponent
}: LoadingWithRetryProps) {
  if (isLoading) {
    if (showSkeleton && skeletonComponent) {
      return <>{skeletonComponent}</>;
    }

    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <div>
            <p className="text-sm font-medium text-destructive">{retryMessage}</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
          {onRetry && (
            <Button size="sm" onClick={onRetry}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Progressive Enhancement Wrapper
 */
interface ProgressiveEnhancementProps {
  enhanced: ReactNode;
  fallback: ReactNode;
  isEnhanced: boolean;
  enhancementError?: string;
  onRetryEnhancement?: () => void;
  showEnhancementStatus?: boolean;
}

export function ProgressiveEnhancement({
  enhanced,
  fallback,
  isEnhanced,
  enhancementError,
  onRetryEnhancement,
  showEnhancementStatus = false
}: ProgressiveEnhancementProps) {
  return (
    <div>
      {showEnhancementStatus && !isEnhanced && (
        <Alert className="mb-4 border-info/50 bg-info/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {enhancementError 
                ? 'Enhanced features unavailable. Using basic functionality.' 
                : 'Loading enhanced features...'}
            </span>
            {enhancementError && onRetryEnhancement && (
              <Button size="sm" variant="outline" onClick={onRetryEnhancement}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {isEnhanced ? enhanced : fallback}
    </div>
  );
}

/**
 * Hook for online status detection
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Proactively verify connectivity in case navigator.onLine is inaccurate
    let aborted = false;

    const withTimeoutFetch = (input: RequestInfo | URL, init: RequestInit = {}, ms: number) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), ms);
      return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeout));
    };

    const verifyConnectivity = async () => {
      try {
        // Try a well-known lightweight endpoint (no-cors) — resolves if reachable
        await withTimeoutFetch(
          'https://www.gstatic.com/generate_204',
          { mode: 'no-cors', cache: 'no-cache' },
          3000
        );
        if (!aborted) setIsOnline(true);
        return;
      } catch (_) {
        // Ignore and try same-origin fallback
      }

      try {
        await withTimeoutFetch('/favicon.ico', { cache: 'no-cache' }, 2000);
        if (!aborted) setIsOnline(true);
      } catch (_) {
        // If both checks fail, keep current state; offline listener will handle changes
      }
    };

    // Run once on mount, and again shortly after reporting online
    verifyConnectivity();
    const onlineCheckId = window.setTimeout(() => {
      if (navigator.onLine) verifyConnectivity();
    }, 500);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      aborted = true;
      window.clearTimeout(onlineCheckId);
    };
  }, []);

  return isOnline;
}

/**
 * Hook for connection quality detection
 */
export function useConnectionQuality() {
  const [quality, setQuality] = React.useState<'good' | 'poor' | 'offline'>('good');
  const isOnline = useOnlineStatus();

  React.useEffect(() => {
    if (!isOnline) {
      setQuality('offline');
      return;
    }

    // Check connection quality using navigator.connection if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const updateQuality = () => {
        const effectiveType = connection.effectiveType;
        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          setQuality('poor');
        } else {
          setQuality('good');
        }
      };

      updateQuality();
      connection.addEventListener('change', updateQuality);

      return () => {
        connection.removeEventListener('change', updateQuality);
      };
    } else {
      // Fallback: assume good connection if online
      setQuality('good');
    }
  }, [isOnline]);

  return { quality, isOnline };
}