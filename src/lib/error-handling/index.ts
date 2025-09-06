/**
 * Error Handling System
 * Comprehensive error handling with graceful degradation
 */

// Core error types and classes
export * from './error-types';

// Main error handler
export { errorHandler, ErrorHandler } from './error-handler';

// Retry mechanism
export { RetryMechanism, retryUtils, Retryable } from './retry-mechanism';

// Fallback system
export { 
  fallbackSystem, 
  FallbackSystem, 
  AIFallbackStrategies, 
  ServiceAvailabilityChecker,
  gracefulDegradation 
} from './fallback-system';

// User messages
export { 
  UserMessageGenerator, 
  messageUtils, 
  MESSAGE_SEVERITY 
} from './user-messages';

// API integration utilities
export * from './api-integration';

// Default export for convenience
export { errorHandler as default } from './error-handler';