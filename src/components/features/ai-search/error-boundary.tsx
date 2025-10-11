/**
 * AI Search Error Boundary
 * Provides graceful error handling for AI search components
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  RefreshCw,
  Bug,
  Home,
  ArrowLeft
} from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  showDetails?: boolean;
  onRetry?: () => void;
  onGoBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class AISearchErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error details
    console.error('AI Search Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: sendErrorToService(error, errorInfo);
    }
  }

  handleRetry = () => {
    const { retryCount } = this.state;

    if (retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));

      // Call custom retry handler if provided
      this.props.onRetry?.();
    }
  };

  handleGoBack = () => {
    this.props.onGoBack?.();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, retryCount } = this.state;
      const { showRetry = true, showDetails = false } = this.props;

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                AI Search Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* User-friendly error message */}
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">
                      Something went wrong with the AI search functionality.
                    </p>
                    <p className="text-sm">
                      {error?.message || 'An unexpected error occurred while processing your request.'}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {showRetry && retryCount < this.maxRetries && (
                  <Button
                    onClick={this.handleRetry}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again ({this.maxRetries - retryCount} attempts left)
                  </Button>
                )}

                {this.props.onGoBack && (
                  <Button
                    variant="outline"
                    onClick={this.handleGoBack}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Go Back
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
              </div>

              {/* Retry limit reached message */}
              {retryCount >= this.maxRetries && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="text-sm">
                      You've reached the maximum number of retry attempts. Please refresh the page or try again later.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Technical details (development only or if explicitly requested) */}
              {(process.env.NODE_ENV === 'development' || showDetails) && error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    <span className="flex items-center gap-2">
                      <Bug className="h-4 w-4" />
                      Technical Details
                    </span>
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Error Message:</h4>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                        {error.message}
                      </pre>
                    </div>

                    {error.stack && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">Stack Trace:</h4>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                          {error.stack}
                        </pre>
                      </div>
                    )}

                    {errorInfo?.componentStack && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">Component Stack:</h4>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      <p>Retry Count: {retryCount}/{this.maxRetries}</p>
                      <p>Timestamp: {new Date().toISOString()}</p>
                      <p>User Agent: {typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'}</p>
                    </div>
                  </div>
                </details>
              )}

              {/* Help section */}
              <div className="text-center pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  If this problem persists, please contact support.
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Copy error details to clipboard
                      const errorDetails = {
                        message: error?.message,
                        stack: error?.stack,
                        componentStack: errorInfo?.componentStack,
                        timestamp: new Date().toISOString(),
                        retryCount
                      };
                      navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
                    }}
                  >
                    <Bug className="h-4 w-4 mr-2" />
                    Copy Error Details
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Navigate to help page or open support chat
                      window.open('/support', '_blank');
                    }}
                  >
                    Get Help
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to use error boundaries
export function useAISearchErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('AI Search Error captured by hook:', error);
    setError(error);
  }, []);

  // Throw error to be caught by error boundary
  if (error) {
    throw error;
  }

  return {
    captureError,
    resetError,
    hasError: error !== null
  };
}

// Higher-order component for wrapping components with error boundary
export function withAISearchErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  return function WrappedComponent(props: P) {
    return (
      <AISearchErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </AISearchErrorBoundary>
    );
  };
}

export default AISearchErrorBoundary;