/**
 * User-Friendly Error Messages
 * Provides contextual, helpful error messages for different scenarios
 */

import { AppError, ErrorCategory, ErrorSeverity, ERROR_CODES } from './error-types';

export interface UserMessage {
  title: string;
  message: string;
  actionText?: string;
  actionUrl?: string;
  helpText?: string;
  icon?: 'error' | 'warning' | 'info' | 'success';
  dismissible?: boolean;
  showDetails?: boolean;
  retryable?: boolean;
}

export interface MessageContext {
  operationType?: string;
  featureName?: string;
  userRole?: string;
  hasAlternatives?: boolean;
  supportContact?: string;
}

/**
 * User Message Generator
 */
export class UserMessageGenerator {
  private static readonly MESSAGE_TEMPLATES: Record<string, UserMessage> = {
    // AI Service Errors
    [ERROR_CODES.AI_SERVICE_UNAVAILABLE]: {
      title: 'AI Service Temporarily Unavailable',
      message: 'Our AI service is currently experiencing issues. We\'re working to resolve this quickly.',
      actionText: 'Try Again',
      helpText: 'You can try again in a few minutes, or use manual alternatives.',
      icon: 'warning',
      dismissible: true,
      retryable: true
    },
    [ERROR_CODES.AI_MODEL_OVERLOADED]: {
      title: 'High Demand',
      message: 'Our AI service is experiencing high demand. Please wait a moment and try again.',
      actionText: 'Retry',
      helpText: 'Peak usage times may cause temporary delays.',
      icon: 'info',
      dismissible: true,
      retryable: true
    },
    [ERROR_CODES.AI_TIMEOUT]: {
      title: 'Request Timeout',
      message: 'The AI service took too long to respond. This might be due to a complex request.',
      actionText: 'Try Again',
      helpText: 'Consider simplifying your request or trying again later.',
      icon: 'warning',
      dismissible: true,
      retryable: true
    },
    [ERROR_CODES.AI_QUOTA_EXCEEDED]: {
      title: 'Usage Limit Reached',
      message: 'You\'ve reached your AI usage limit for this period.',
      actionText: 'View Usage',
      actionUrl: '/dashboard/usage',
      helpText: 'Your quota will reset automatically, or you can upgrade your plan.',
      icon: 'warning',
      dismissible: false,
      retryable: false
    },

    // Network Errors
    [ERROR_CODES.NETWORK_TIMEOUT]: {
      title: 'Connection Timeout',
      message: 'The request took too long to complete. Please check your internet connection.',
      actionText: 'Retry',
      helpText: 'Ensure you have a stable internet connection.',
      icon: 'error',
      dismissible: true,
      retryable: true
    },
    [ERROR_CODES.NETWORK_CONNECTION_FAILED]: {
      title: 'Connection Failed',
      message: 'Unable to connect to our servers. Please check your internet connection.',
      actionText: 'Retry',
      helpText: 'This is usually a temporary issue. Try refreshing the page.',
      icon: 'error',
      dismissible: true,
      retryable: true
    },

    // Authentication Errors
    [ERROR_CODES.AUTH_TOKEN_EXPIRED]: {
      title: 'Session Expired',
      message: 'Your session has expired for security reasons. Please log in again.',
      actionText: 'Log In',
      actionUrl: '/login',
      helpText: 'This helps keep your account secure.',
      icon: 'warning',
      dismissible: false,
      retryable: false
    },
    [ERROR_CODES.AUTH_REQUIRED]: {
      title: 'Login Required',
      message: 'You need to be logged in to access this feature.',
      actionText: 'Log In',
      actionUrl: '/login',
      helpText: 'Create an account if you don\'t have one.',
      icon: 'info',
      dismissible: false,
      retryable: false
    },

    // Authorization Errors
    [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: {
      title: 'Access Denied',
      message: 'You don\'t have permission to perform this action.',
      actionText: 'Contact Support',
      helpText: 'If you believe this is an error, please contact your administrator.',
      icon: 'error',
      dismissible: true,
      retryable: false
    },

    // Rate Limit Errors
    [ERROR_CODES.RATE_LIMIT_EXCEEDED]: {
      title: 'Too Many Requests',
      message: 'You\'re making requests too quickly. Please slow down and try again.',
      actionText: 'Wait and Retry',
      helpText: 'Rate limits help ensure fair usage for all users.',
      icon: 'warning',
      dismissible: true,
      retryable: true
    },

    // Validation Errors
    [ERROR_CODES.INVALID_INPUT]: {
      title: 'Invalid Input',
      message: 'Please check your input and correct any errors.',
      actionText: 'Review Input',
      helpText: 'Make sure all required fields are filled correctly.',
      icon: 'warning',
      dismissible: true,
      retryable: false
    },

    // Configuration Errors
    [ERROR_CODES.SERVICE_MISCONFIGURED]: {
      title: 'Service Unavailable',
      message: 'This service is temporarily unavailable due to maintenance.',
      actionText: 'Contact Support',
      helpText: 'We\'re working to restore service as quickly as possible.',
      icon: 'error',
      dismissible: true,
      retryable: false
    },

    // Default Error
    [ERROR_CODES.UNKNOWN_ERROR]: {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Please try again.',
      actionText: 'Retry',
      helpText: 'If the problem persists, please contact support.',
      icon: 'error',
      dismissible: true,
      retryable: true
    }
  };

  /**
   * Generate user-friendly message from error
   */
  static generateMessage(
    error: AppError,
    context: MessageContext = {}
  ): UserMessage {
    const template = this.MESSAGE_TEMPLATES[error.code] || 
                    this.MESSAGE_TEMPLATES[ERROR_CODES.UNKNOWN_ERROR];

    // Customize message based on context
    const customizedMessage = this.customizeMessage(template, error, context);

    return {
      ...customizedMessage,
      showDetails: error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL
    };
  }

  /**
   * Customize message based on context
   */
  private static customizeMessage(
    template: UserMessage,
    error: AppError,
    context: MessageContext
  ): UserMessage {
    let customizedMessage = { ...template };

    // Customize based on operation type
    if (context.operationType) {
      customizedMessage = this.customizeForOperation(customizedMessage, context.operationType);
    }

    // Add feature-specific context
    if (context.featureName) {
      customizedMessage.message = customizedMessage.message.replace(
        'service',
        context.featureName
      );
    }

    // Add support contact if available
    if (context.supportContact && customizedMessage.actionText === 'Contact Support') {
      customizedMessage.actionUrl = `mailto:${context.supportContact}`;
    }

    // Suggest alternatives if available
    if (context.hasAlternatives && error.retryable) {
      customizedMessage.helpText += ' You can also try using manual alternatives while we fix this issue.';
    }

    return customizedMessage;
  }

  /**
   * Customize message for specific operations
   */
  private static customizeForOperation(
    message: UserMessage,
    operationType: string
  ): UserMessage {
    const operationMessages: Record<string, Partial<UserMessage>> = {
      research: {
        title: message.title.replace('Service', 'Research'),
        message: message.message.replace('service', 'research feature'),
        helpText: 'You can try manual research methods or use cached results.'
      },
      enrichment: {
        title: message.title.replace('Service', 'Contact Enrichment'),
        message: message.message.replace('service', 'contact enrichment'),
        helpText: 'You can manually enrich contacts using the provided guidelines.'
      },
      duplicate_detection: {
        title: message.title.replace('Service', 'Duplicate Detection'),
        message: message.message.replace('service', 'duplicate detection'),
        helpText: 'You can manually check for duplicates using the search function.'
      }
    };

    const operationCustomization = operationMessages[operationType];
    if (operationCustomization) {
      return { ...message, ...operationCustomization };
    }

    return message;
  }

  /**
   * Generate message for fallback scenarios
   */
  static generateFallbackMessage(
    fallbackName: string,
    limitations: string[] = []
  ): UserMessage {
    const fallbackMessages: Record<string, UserMessage> = {
      cached_results: {
        title: 'Using Cached Results',
        message: 'We\'re showing you cached results while our AI service recovers.',
        icon: 'info',
        helpText: 'These results may be slightly outdated but should still be helpful.',
        dismissible: true
      },
      simplified_search: {
        title: 'Basic Search Active',
        message: 'We\'re using basic search while AI features are temporarily unavailable.',
        icon: 'info',
        helpText: 'Results may be less refined than usual.',
        dismissible: true
      },
      manual_suggestions: {
        title: 'Manual Mode',
        message: 'AI features are temporarily unavailable. Here are some manual alternatives.',
        icon: 'warning',
        helpText: 'These suggestions will help you complete your task manually.',
        dismissible: true
      },
      exact_match_detection: {
        title: 'Basic Duplicate Detection',
        message: 'Using exact matching for duplicate detection while AI is unavailable.',
        icon: 'info',
        helpText: 'This may miss some similar contacts that aren\'t exact matches.',
        dismissible: true
      }
    };

    const baseMessage = fallbackMessages[fallbackName] || {
      title: 'Alternative Method Active',
      message: 'We\'re using an alternative method while our primary service recovers.',
      icon: 'info' as const,
      dismissible: true
    };

    // Add limitations to help text
    if (limitations.length > 0) {
      const limitationText = limitations.join(', ').toLowerCase();
      baseMessage.helpText = `${baseMessage.helpText || ''} Note: ${limitationText}.`;
    }

    return baseMessage;
  }

  /**
   * Generate success message for recovery
   */
  static generateRecoveryMessage(operationType?: string): UserMessage {
    return {
      title: 'Service Restored',
      message: `${operationType ? operationType.charAt(0).toUpperCase() + operationType.slice(1) : 'Service'} is now working normally.`,
      icon: 'success',
      dismissible: true,
      helpText: 'You can now use all features without limitations.'
    };
  }

  /**
   * Generate maintenance message
   */
  static generateMaintenanceMessage(
    estimatedDuration?: string,
    affectedFeatures?: string[]
  ): UserMessage {
    let message = 'We\'re performing scheduled maintenance to improve your experience.';
    
    if (affectedFeatures && affectedFeatures.length > 0) {
      message += ` The following features may be temporarily unavailable: ${affectedFeatures.join(', ')}.`;
    }

    return {
      title: 'Scheduled Maintenance',
      message,
      icon: 'info',
      helpText: estimatedDuration ? `Expected completion: ${estimatedDuration}` : 'We\'ll be back shortly.',
      dismissible: false,
      retryable: false
    };
  }
}

/**
 * Message severity levels for UI styling
 */
export const MESSAGE_SEVERITY = {
  [ErrorSeverity.LOW]: 'info',
  [ErrorSeverity.MEDIUM]: 'warning',
  [ErrorSeverity.HIGH]: 'error',
  [ErrorSeverity.CRITICAL]: 'error'
} as const;

/**
 * Utility functions for message handling
 */
export const messageUtils = {
  /**
   * Get appropriate icon for error category
   */
  getIconForCategory(category: ErrorCategory): UserMessage['icon'] {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return 'warning';
      case ErrorCategory.NETWORK:
      case ErrorCategory.AI_SERVICE:
      case ErrorCategory.DATABASE:
        return 'error';
      case ErrorCategory.VALIDATION:
        return 'warning';
      case ErrorCategory.RATE_LIMIT:
      case ErrorCategory.QUOTA_EXCEEDED:
        return 'info';
      case ErrorCategory.CONFIGURATION:
        return 'error';
      default:
        return 'error';
    }
  },

  /**
   * Determine if error should show retry button
   */
  shouldShowRetry(error: AppError): boolean {
    return error.retryable && 
           error.category !== ErrorCategory.AUTHENTICATION &&
           error.category !== ErrorCategory.AUTHORIZATION &&
           error.category !== ErrorCategory.VALIDATION;
  },

  /**
   * Get estimated retry delay in human-readable format
   */
  getRetryDelayText(delayMs: number): string {
    if (delayMs < 1000) return 'immediately';
    if (delayMs < 60000) return `in ${Math.ceil(delayMs / 1000)} seconds`;
    return `in ${Math.ceil(delayMs / 60000)} minutes`;
  },

  /**
   * Format technical error details for display
   */
  formatTechnicalDetails(error: AppError): string {
    return [
      `Code: ${error.code}`,
      `Category: ${error.category}`,
      `Severity: ${error.severity}`,
      error.context.requestId ? `Request ID: ${error.context.requestId}` : null,
      error.context.timestamp ? `Time: ${error.context.timestamp.toISOString()}` : null
    ].filter(Boolean).join('\n');
  }
};