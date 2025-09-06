/**
 * React Hooks for Error Handling
 */

import { useState, useCallback, useEffect } from 'react';
import { AppError, ErrorContext } from '@/lib/error-handling/error-types';
import { errorHandler } from '@/lib/error-handling/error-handler';
import { gracefulDegradation } from '@/lib/error-handling/fallback-system';
import { UserMessage, UserMessageGenerator } from '@/lib/error-handling/user-messages';

export interface UseErrorHandlerOptions {
  enableRetry?: boolean;
  enableFallback?: boolean;
  maxRetries?: number;
  onError?: (error: AppError) => void;
  onRetry?: (attempt: number) => void;
  onFallback?: (fallbackName: string) => void;
}

export interface ErrorState {
  error: AppError | null;
  isRetrying: boolean;
  retryCount: number;
  fallbackUsed: string | null;
  userMessage: UserMessage | null;
}

/**
 * Main error handling hook
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
    fallbackUsed: null,
    userMessage: null
  });

  const handleError = useCallback(async (
    error: Error | AppError,
    context: ErrorContext,
    operation?: () => Promise<any>,
    fallbackOperation?: () => Promise<any>
  ) => {
    const result = await errorHandler.handleError(error, context, operation, fallbackOperation);
    
    if (result.error) {
      const userMessage = UserMessageGenerator.generateMessage(result.error, {
        operationType: context.operationType
      });

      setErrorState({
        error: result.error,
        isRetrying: false,
        retryCount: result.retryAttempts,
        fallbackUsed: result.fallbackUsed ? 'fallback' : null,
        userMessage
      });

      options.onError?.(result.error);
      
      if (result.fallbackUsed) {
        options.onFallback?.('fallback');
      }
    } else {
      // Success - clear error state
      setErrorState({
        error: null,
        isRetrying: false,
        retryCount: result.retryAttempts,
        fallbackUsed: result.fallbackUsed ? 'fallback' : null,
        userMessage: null
      });
    }

    return result;
  }, [options]);

  const retry = useCallback(async (operation: () => Promise<any>) => {
    if (!errorState.error || !errorState.error.retryable) return;

    setErrorState(prev => ({ ...prev, isRetrying: true }));
    options.onRetry?.(errorState.retryCount + 1);

    try {
      const result = await operation();
      setErrorState({
        error: null,
        isRetrying: false,
        retryCount: errorState.retryCount + 1,
        fallbackUsed: null,
        userMessage: null
      });
      return result;
    } catch (error) {
      const context: ErrorContext = {
        timestamp: new Date(),
        operationType: errorState.error.context.operationType
      };
      
      await handleError(error as Error, context);
    }
  }, [errorState, handleError, options]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
      fallbackUsed: null,
      userMessage: null
    });
  }, []);

  return {
    ...errorState,
    handleError,
    retry,
    clearError,
    hasError: !!errorState.error
  };
}

/**
 * Hook for async operations with error handling
 */
export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  options: UseErrorHandlerOptions & {
    immediate?: boolean;
    dependencies?: any[];
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const errorHandler = useErrorHandler(options);

  const execute = useCallback(async (...args: any[]) => {
    setLoading(true);
    
    try {
      const result = await operation();
      setData(result);
      errorHandler.clearError();
      return result;
    } catch (error) {
      const context: ErrorContext = {
        timestamp: new Date(),
        operationType: 'async_operation'
      };
      
      await errorHandler.handleError(error as Error, context, operation);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [operation, errorHandler]);

  const retry = useCallback(() => {
    return errorHandler.retry(execute);
  }, [errorHandler, execute]);

  // Execute immediately if requested
  useEffect(() => {
    if (options.immediate) {
      execute();
    }
  }, options.dependencies || []);

  const { retry: handlerRetry, ...handlerRest } = errorHandler;
  return {
    data,
    loading,
    execute,
    retry: handlerRetry,
    ...handlerRest
  };
}

// Removed deprecated AI-specific hook (useAIOperation)

/**
 * Hook for network requests with retry
 */
export function useNetworkRequest<T>(
  url: string,
  options: RequestInit & UseErrorHandlerOptions & {
    immediate?: boolean;
    dependencies?: any[];
  } = {}
) {
  const { immediate, dependencies, ...requestOptions } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const errorHandler = useErrorHandler(options);

  const execute = useCallback(async (overrideOptions?: RequestInit) => {
    setLoading(true);
    
    const fetchOperation = async () => {
      const response = await fetch(url, { ...requestOptions, ...overrideOptions });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    };

    try {
      const result = await fetchOperation();
      setData(result);
      errorHandler.clearError();
      return result;
    } catch (error) {
      const context: ErrorContext = {
        timestamp: new Date(),
        operationType: 'network_request',
        endpoint: url
      };
      
      await errorHandler.handleError(error as Error, context, fetchOperation);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [url, requestOptions, errorHandler]);

  const retry = useCallback(() => {
    return errorHandler.retry(() => execute());
  }, [errorHandler, execute]);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, dependencies || []);

  const { retry: handlerRetry3, ...handlerRest3 } = errorHandler;
  return {
    data,
    loading,
    execute,
    retry: handlerRetry3,
    ...handlerRest3
  };
}

/**
 * Hook for form submission with error handling
 */
export function useFormSubmission<T>(
  submitFunction: (data: any) => Promise<T>,
  options: UseErrorHandlerOptions = {}
) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const errorHandler = useErrorHandler(options);

  const submit = useCallback(async (formData: any) => {
    setSubmitting(true);
    setSubmitted(false);
    
    try {
      const result = await submitFunction(formData);
      setSubmitted(true);
      errorHandler.clearError();
      return result;
    } catch (error) {
      const context: ErrorContext = {
        timestamp: new Date(),
        operationType: 'form_submission'
      };
      
      await errorHandler.handleError(error as Error, context);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }, [submitFunction, errorHandler]);

  const retry = useCallback((formData: any) => {
    return errorHandler.retry(() => submit(formData));
  }, [errorHandler, submit]);

  const { retry: handlerRetry4, ...handlerRest4 } = errorHandler;
  return {
    submit,
    retry: handlerRetry4,
    submitting,
    submitted,
    ...handlerRest4
  };
}

/**
 * Hook for error recovery notifications
 */
export function useErrorRecovery() {
  const [recoveryMessage, setRecoveryMessage] = useState<UserMessage | null>(null);

  const notifyRecovery = useCallback((operationType?: string) => {
    const message = UserMessageGenerator.generateRecoveryMessage(operationType);
    setRecoveryMessage(message);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setRecoveryMessage(null);
    }, 5000);
  }, []);

  const dismissRecovery = useCallback(() => {
    setRecoveryMessage(null);
  }, []);

  return {
    recoveryMessage,
    notifyRecovery,
    dismissRecovery
  };
}
