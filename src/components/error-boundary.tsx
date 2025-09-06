"use client";

import React, { Component, ReactNode } from 'react';
import { ErrorBoundaryDisplay } from '@/components/ui/error-display';
import { errorHandler } from '@/lib/error-handling/error-handler';
import { ErrorContext } from '@/lib/error-handling/error-types';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  context?: Partial<ErrorContext>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to our error handling system
    const context: ErrorContext = {
      timestamp: new Date(),
      ...this.props.context,
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    };

    errorHandler.handleError(error, context);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <ErrorBoundaryDisplay
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}