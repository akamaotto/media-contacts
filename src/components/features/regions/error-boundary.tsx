'use client';

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class RegionsTableErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('RegionsTable Error Boundary caught an error:', error, errorInfo);
    
    // Send error to backend for debugging
    if (typeof window !== 'undefined') {
      fetch('/api/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'RegionsTable Error Boundary caught an error',
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        })
      }).catch(logErr => console.error('Failed to send error log:', logErr));
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Something went wrong while displaying the regions table. Please try refreshing the page.
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-2 text-sm">
                <p>Error: {this.state.error?.message}</p>
                <p>Component stack: {this.state.error?.stack}</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}