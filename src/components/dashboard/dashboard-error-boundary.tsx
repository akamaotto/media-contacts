'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  section?: string;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  section?: string;
}

/**
 * Default error fallback component
 */
function DefaultErrorFallback({ error, resetError, section }: ErrorFallbackProps) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {section ? `${section} Error` : 'Something went wrong'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">We encountered an error while loading this section:</p>
          <code className="block p-2 bg-muted rounded text-xs break-all">
            {error.message}
          </code>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={resetError}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="secondary"
            size="sm"
          >
            Reload Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Dashboard Error Boundary Component
 */
export class DashboardErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard Error Boundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      hasError: true,
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
          section={this.props.section}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 */
export function useDashboardErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    console.error('Dashboard error:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      // Log error to monitoring service in production
      if (process.env.NODE_ENV === 'production') {
        // TODO: Integrate with error monitoring service (e.g., Sentry)
        console.error('Production dashboard error:', error);
      }
    }
  }, [error]);

  return {
    error,
    resetError,
    handleError,
    hasError: error !== null,
  };
}

/**
 * Async error boundary wrapper for handling promise rejections
 */
export function withAsyncErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>
) {
  return function AsyncErrorBoundaryWrapper(props: T) {
    const { handleError } = useDashboardErrorHandler();

    React.useEffect(() => {
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        handleError(new Error(event.reason));
      };

      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }, [handleError]);

    return <Component {...props} />;
  };
}
