/**
 * Client-Side Error Handler
 * Handles structured error responses from the enhanced API error system
 */

export interface APIErrorResponse {
  success: false;
  error: {
    id: string;
    message: string;
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    isRetryable: boolean;
    recoveryStrategy: string;
    suggestedActions: string[];
    retryAfterMs?: number;
    maxRetries?: number;
    validationErrors?: Record<string, string[]>;
  };
  context: {
    traceId: string;
    timestamp: string;
    endpoint: string;
    method: string;
    userId?: string;
  };
  debug?: {
    technicalMessage: string;
    originalError: string;
    stackTrace?: string;
  };
}

export interface APISuccessResponse<T = any> {
  success: true;
  data: T;
  metadata?: {
    traceId?: string;
    timestamp: string;
    performance?: {
      totalRequestTime: number;
      operationCount?: number;
    };
    dataSource?: {
      source: string;
      isFallback: boolean;
      degradationLevel?: string;
      availableFeatures?: string[];
      unavailableFeatures?: string[];
      userMessage?: string;
    };
  };
}

export type APIResponse<T = any> = APISuccessResponse<T> | APIErrorResponse;

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  retryableCategories: string[];
  retryableStrategies: string[];
}

export interface ClientErrorHandlerOptions {
  retryConfig?: Partial<RetryConfig>;
  onRetry?: (attempt: number, error: APIErrorResponse) => void;
  onMaxRetriesReached?: (error: APIErrorResponse) => void;
  onRecovery?: (response: APISuccessResponse) => void;
  enableToasts?: boolean;
  enableConsoleLogging?: boolean;
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  backoffMultiplier: 2,
  retryableCategories: ['network', 'timeout', 'server', 'database_connection', 'database_timeout', 'rate_limit'],
  retryableStrategies: ['retry_immediately', 'retry_with_backoff']
};

/**
 * ClientErrorHandler class for handling API errors with retry logic
 */
export class ClientErrorHandler {
  private retryConfig: RetryConfig;
  private options: ClientErrorHandlerOptions;

  constructor(options: ClientErrorHandlerOptions = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...options.retryConfig };
    this.options = {
      enableToasts: true,
      enableConsoleLogging: true,
      ...options
    };
  }

  /**
   * Execute a fetch request with error handling and retry logic
   */
  async fetchWithRetry<T = any>(
    url: string,
    options: RequestInit = {},
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<APIResponse<T>> {
    const config = { ...this.retryConfig, ...customRetryConfig };
    let lastError: APIErrorResponse | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.calculateBackoffDelay(attempt, config);
          
          if (this.options.enableConsoleLogging) {
            console.log(`🔄 [CLIENT-ERROR-HANDLER] Retrying request to ${url} (attempt ${attempt + 1}/${config.maxRetries + 1}) after ${delay}ms`);
          }
          
          if (this.options.onRetry && lastError) {
            this.options.onRetry(attempt, lastError);
          }
          
          await this.delay(delay);
        }

        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
            ...(attempt > 0 && lastError && { 'X-Retry-Attempt': attempt.toString() })
          }
        });

        // Be defensive: API may return non-JSON bodies on errors (e.g., HTML, empty)
        let data: any;
        let parsedJson = true;
        try {
          // Clone so we can still access original response if parsing fails
          data = await response.clone().json();
        } catch {
          parsedJson = false;
          const text = await response.text().catch(() => '');
          data = text ? { message: text } : {};
        }

        // Handle successful response
        if (response.ok && data.success !== false) {
          if (attempt > 0 && this.options.onRecovery) {
            this.options.onRecovery(data);
          }
          
          if (this.options.enableConsoleLogging && attempt > 0) {
            console.log(`✅ [CLIENT-ERROR-HANDLER] Request to ${url} succeeded after ${attempt} retries`);
          }
          
          return data;
        }

        // Handle error response
        const errorResponse: APIErrorResponse = data.success === false ? data : {
          success: false,
          error: {
            id: `client-error-${Date.now()}`,
            message: data.message || response.statusText || 'Request failed',
            category: this.categorizeHttpError(response.status),
            severity: this.getSeverityFromStatus(response.status),
            isRetryable: this.isHttpStatusRetryable(response.status),
            recoveryStrategy: this.getRecoveryStrategy(response.status),
            suggestedActions: this.getSuggestedActions(response.status)
          },
          context: {
            traceId: response.headers.get('X-Trace-ID') || `client-${Date.now()}`,
            timestamp: new Date().toISOString(),
            endpoint: url,
            method: options.method || 'GET'
          },
          debug: {
            technicalMessage: typeof data?.message === 'string' ? data.message : (response.statusText || 'Request failed'),
            originalError: `HTTP ${response.status}`
          }
        };

        lastError = errorResponse;

        // Check if we should retry
        if (attempt < config.maxRetries && this.shouldRetry(errorResponse, config)) {
          continue;
        }

        // Max retries reached or not retryable
        if (attempt >= config.maxRetries && this.options.onMaxRetriesReached) {
          this.options.onMaxRetriesReached(errorResponse);
        }

        if (this.options.enableConsoleLogging) {
          console.error(
            `❌ [CLIENT-ERROR-HANDLER] Request to ${url} failed after ${attempt + 1} attempts:`,
            {
              status: response.status,
              statusText: response.statusText,
              parsedJson,
              data,
              error: errorResponse
            }
          );
        }

        return errorResponse;

      } catch (networkError) {
        const error = networkError instanceof Error ? networkError : new Error('Network error');
        
        lastError = {
          success: false,
          error: {
            id: `network-error-${Date.now()}`,
            message: 'Network connection failed',
            category: 'network',
            severity: 'high',
            isRetryable: true,
            recoveryStrategy: 'retry_with_backoff',
            suggestedActions: [
              'Check your internet connection',
              'Try again in a moment',
              'Contact support if the issue persists'
            ]
          },
          context: {
            traceId: `network-${Date.now()}`,
            timestamp: new Date().toISOString(),
            endpoint: url,
            method: options.method || 'GET'
          },
          debug: {
            technicalMessage: error.message,
            originalError: error.name
          }
        };

        if (attempt < config.maxRetries) {
          continue;
        }

        if (this.options.enableConsoleLogging) {
          console.error(`❌ [CLIENT-ERROR-HANDLER] Network error for ${url}:`, error);
        }

        return lastError;
      }
    }

    return lastError!;
  }

  /**
   * Handle API response and provide user feedback
   */
  handleResponse<T>(
    response: APIResponse<T>,
    options: {
      successMessage?: string;
      showSuccessToast?: boolean;
      showErrorToast?: boolean;
      customErrorHandler?: (error: APIErrorResponse) => void;
    } = {}
  ): { success: boolean; data?: T; error?: APIErrorResponse } {
    if (response.success) {
      if (options.successMessage && options.showSuccessToast !== false && this.options.enableToasts) {
        this.showToast('success', options.successMessage);
      }
      
      // Handle degraded data source messaging
      if (response.metadata?.dataSource?.userMessage) {
        this.showToast('warning', response.metadata.dataSource.userMessage, {
          duration: 8000,
          description: `Data source: ${response.metadata.dataSource.source}`
        });
      }
      
      return { success: true, data: response.data };
    } else {
      if (options.customErrorHandler) {
        options.customErrorHandler(response);
      } else if (options.showErrorToast !== false && this.options.enableToasts) {
        this.showErrorToast(response);
      }
      
      return { success: false, error: response };
    }
  }

  /**
   * Show error toast with appropriate styling and actions
   */
  private showErrorToast(error: APIErrorResponse): void {
    const { error: errorDetails } = error;
    
    // Import toast dynamically to avoid SSR issues
    import('sonner').then(({ toast }) => {
      const toastOptions: any = {
        duration: this.getToastDuration(errorDetails.severity),
        description: errorDetails.suggestedActions.length > 0 
          ? errorDetails.suggestedActions[0] 
          : undefined
      };

      // Add action buttons for retryable errors
      if (errorDetails.isRetryable && errorDetails.recoveryStrategy === 'retry_immediately') {
        toastOptions.action = {
          label: 'Retry',
          onClick: () => {
            // This would need to be handled by the calling component
            window.dispatchEvent(new CustomEvent('retry-last-request'));
          }
        };
      }

      switch (errorDetails.severity) {
        case 'critical':
        case 'high':
          toast.error(errorDetails.message, toastOptions);
          break;
        case 'medium':
          toast.warning(errorDetails.message, toastOptions);
          break;
        case 'low':
        default:
          toast.info(errorDetails.message, toastOptions);
          break;
      }
    });
  }

  /**
   * Show success/info toast
   */
  private showToast(
    type: 'success' | 'info' | 'warning', 
    message: string, 
    options: { duration?: number; description?: string } = {}
  ): void {
    import('sonner').then(({ toast }) => {
      const toastFn = toast[type];
      toastFn(message, options);
    });
  }

  /**
   * Get toast duration based on severity
   */
  private getToastDuration(severity: string): number {
    switch (severity) {
      case 'critical': return 10000; // 10 seconds
      case 'high': return 8000;      // 8 seconds
      case 'medium': return 5000;    // 5 seconds
      case 'low': return 3000;       // 3 seconds
      default: return 5000;
    }
  }

  /**
   * Check if error should be retried
   */
  private shouldRetry(error: APIErrorResponse, config: RetryConfig): boolean {
    const { error: errorDetails } = error;
    
    // Check if error is marked as retryable
    if (!errorDetails.isRetryable) {
      return false;
    }
    
    // Check if category is retryable
    if (!config.retryableCategories.includes(errorDetails.category)) {
      return false;
    }
    
    // Check if recovery strategy allows retry
    if (!config.retryableStrategies.includes(errorDetails.recoveryStrategy)) {
      return false;
    }
    
    return true;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number, config: RetryConfig): number {
    const delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Categorize HTTP errors
   */
  private categorizeHttpError(status: number): string {
    if (status >= 500) return 'server';
    if (status === 429) return 'rate_limit';
    if (status === 408) return 'timeout';
    if (status >= 400) return 'client';
    return 'unknown';
  }

  /**
   * Get severity from HTTP status
   */
  private getSeverityFromStatus(status: number): 'low' | 'medium' | 'high' | 'critical' {
    if (status >= 500) return 'critical';
    if (status === 429 || status === 408) return 'high';
    if (status >= 400) return 'medium';
    return 'low';
  }

  /**
   * Check if HTTP status is retryable
   */
  private isHttpStatusRetryable(status: number): boolean {
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  /**
   * Get recovery strategy for HTTP status
   */
  private getRecoveryStrategy(status: number): string {
    if ([500, 502, 503, 504].includes(status)) return 'retry_with_backoff';
    if (status === 429) return 'retry_with_backoff';
    if (status === 408) return 'retry_immediately';
    return 'user_action_required';
  }

  /**
   * Get suggested actions for HTTP status
   */
  private getSuggestedActions(status: number): string[] {
    switch (status) {
      case 400:
        return ['Check your input and try again', 'Ensure all required fields are filled'];
      case 401:
        return ['Please log in to continue', 'Check if your session has expired'];
      case 403:
        return ['You don\'t have permission for this action', 'Contact your administrator'];
      case 404:
        return ['The requested resource was not found', 'Check the URL and try again'];
      case 408:
        return ['The request timed out', 'Try again with a better connection'];
      case 429:
        return ['Too many requests', 'Wait a moment before trying again'];
      case 500:
        return ['Server error occurred', 'Try again in a few moments'];
      case 502:
      case 503:
      case 504:
        return ['Service temporarily unavailable', 'Please try again later'];
      default:
        return ['An error occurred', 'Please try again'];
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a default error handler instance
 */
export const defaultErrorHandler = new ClientErrorHandler();

/**
 * Utility function for simple API calls with error handling
 */
export async function apiCall<T = any>(
  url: string,
  options: RequestInit = {},
  retryConfig?: Partial<RetryConfig>
): Promise<APIResponse<T>> {
  return defaultErrorHandler.fetchWithRetry<T>(url, options, retryConfig);
}

/**
 * Utility function to check if response is an error
 */
export function isErrorResponse(response: APIResponse): response is APIErrorResponse {
  return response.success === false;
}

/**
 * Utility function to extract error message from response
 */
export function getErrorMessage(response: APIResponse): string {
  if (isErrorResponse(response)) {
    return response.error.message;
  }
  return '';
}

/**
 * Utility function to check if error is retryable
 */
export function isRetryableError(response: APIResponse): boolean {
  if (isErrorResponse(response)) {
    return response.error.isRetryable;
  }
  return false;
}