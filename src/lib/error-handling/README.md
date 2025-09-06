# Comprehensive Error Handling System

This module provides a complete error handling solution with graceful degradation, retry mechanisms, fallback options, and user-friendly error messages.

## Overview

The error handling system consists of several interconnected components:

1. **Error Types & Classification** - Structured error definitions with recovery strategies
2. **Error Handler** - Central error processing with retry and fallback logic
3. **Retry Mechanism** - Configurable retry with exponential backoff
4. **Fallback System** - Graceful degradation when primary operations fail
5. **User Messages** - Context-aware, user-friendly error messages
6. **React Components** - UI components for displaying errors
7. **API Integration** - Utilities for integrating with API routes

## Key Features

### 🔄 Automatic Retry with Exponential Backoff
- Configurable retry attempts and delays
- Intelligent retry conditions based on error type
- Circuit breaker pattern to prevent cascading failures

### 🛡️ Graceful Degradation
- Automatic fallback to alternative methods
- Service availability checking
- Degraded functionality with clear limitations

### 👥 User-Friendly Error Messages
- Context-aware error messages
- Actionable guidance for users
- Technical details for developers

### 🎯 Smart Error Classification
- Automatic error categorization
- Recovery strategy assignment
- Severity-based handling

## Quick Start

### Basic Error Handling

```typescript
import { errorHandler, ErrorContext } from '@/lib/error-handling';

async function performOperation() {
  const context: ErrorContext = {
    timestamp: new Date(),
    operationType: 'research',
    userId: 'user-123'
  };

  const result = await errorHandler.handleError(
    new Error('Operation failed'),
    context,
    () => retryableOperation(), // Primary operation
    () => fallbackOperation()   // Fallback operation
  );

  if (result.success) {
    return result.result;
  } else {
    throw result.error;
  }
}
```

### Using React Hooks

```typescript
import { useErrorHandler } from '@/hooks/use-error-handling';

// useAIOperation has been removed. Use useAsyncOperation or useErrorHandler directly.
```

### API Route Integration

```typescript
import { withErrorHandling } from '@/lib/error-handling/api-integration';

export const POST = withErrorHandling(
  async (request: NextRequest) => {
    // Your API logic here
    const result = await performOperation();
    return NextResponse.json(result);
  },
  {
    operationType: 'operation',
    enableFallback: true,
    enableRetry: true
  }
);
```

## Error Types

### Core Error Classes

```typescript
// Base application error
class AppError extends Error {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoveryStrategy: RecoveryStrategy;
  userMessage: string;
  retryable: boolean;
  // ... more properties
}

// Specific error types
class AIServiceError extends AppError
class NetworkError extends AppError
class AuthenticationError extends AppError
class ValidationError extends AppError
class RateLimitError extends AppError
```

### Error Categories

- **AI_SERVICE** - AI/ML service failures
- **NETWORK** - Network connectivity issues
- **AUTHENTICATION** - Authentication failures
- **AUTHORIZATION** - Permission denied
- **VALIDATION** - Input validation errors
- **RATE_LIMIT** - Rate limiting violations
- **QUOTA_EXCEEDED** - Usage quota exceeded
- **CONFIGURATION** - Service configuration errors
- **DATABASE** - Database connectivity/query errors
- **EXTERNAL_API** - Third-party API failures

### Recovery Strategies

- **RETRY** - Automatic retry with backoff
- **FALLBACK** - Use alternative method
- **GRACEFUL_DEGRADATION** - Reduced functionality
- **USER_ACTION_REQUIRED** - User intervention needed
- **FAIL_FAST** - Immediate failure

## Retry Mechanism

### Basic Retry

```typescript
import { RetryMechanism } from '@/lib/error-handling';

const result = await RetryMechanism.execute(
  () => unstableOperation(),
  {
    maxAttempts: 3,
    baseDelay: 1000,
    backoffMultiplier: 2,
    jitter: true
  }
);
```

### Pre-configured Retries

```typescript
import { retryUtils } from '@/lib/error-handling';

// Network retry
const networkResult = await retryUtils.network(() => fetchData());

// Database retry
const dbResult = await retryUtils.database(() => queryDatabase());
```

### Retry Decorator

```typescript
import { Retryable } from '@/lib/error-handling';

class APIService {
  @Retryable({ maxAttempts: 3, baseDelay: 1000 })
  async fetchData() {
    // This method will automatically retry on failure
    return await fetch('/api/data');
  }
}
```

## Fallback System

### Automatic Fallback

```typescript
import { gracefulDegradation } from '@/lib/error-handling';

// Example of graceful degradation to alternative methods
const result = await gracefulDegradation.executeWithAutoFallback(
  () => primaryOperation(),
  'operation',
  { userId: 'user-123', query: 'technology' }
);

if (result.fallbackUsed) {
  console.log(`Using fallback: ${result.fallbackUsed}`);
  console.log(`Limitations: ${result.limitations}`);
}
```

### Custom Fallback Options

```typescript
import { FallbackSystem, FallbackOption } from '@/lib/error-handling';

const fallbackOptions: FallbackOption<any>[] = [
  {
    name: 'cached_results',
    priority: 1,
    description: 'Use cached data',
    operation: () => getCachedData(),
    limitations: ['Data may be outdated']
  },
  {
    name: 'manual_process',
    priority: 2,
    description: 'Manual alternative',
    operation: () => getManualInstructions(),
    limitations: ['Requires manual effort']
  }
];

const fallbackSystem = FallbackSystem.getInstance();
const result = await fallbackSystem.executeWithFallback(
  () => primaryOperation(),
  fallbackOptions
);
```

## User Messages

### Generating User-Friendly Messages

```typescript
import { UserMessageGenerator } from '@/lib/error-handling';

const error = new ExternalAPIError('SERVICE_UNAVAILABLE', 'Service down', context);
const userMessage = UserMessageGenerator.generateMessage(error, {
  operationType: 'operation',
  featureName: 'Operation',
  hasAlternatives: true
});

console.log(userMessage.title);    // "Feature Temporarily Unavailable"
console.log(userMessage.message);  // User-friendly explanation
console.log(userMessage.helpText); // Helpful guidance
```

### Fallback Messages

```typescript
const fallbackMessage = UserMessageGenerator.generateFallbackMessage(
  'cached_results',
  ['Results may be outdated', 'Limited to previous searches']
);
```

## React Components

### Error Display Component

```typescript
import { ErrorDisplay } from '@/components/ui/error-display';

<ErrorDisplay
  error={appError}
  context={{
    operationType: 'operation',
    featureName: 'Feature',
    hasAlternatives: true
  }}
  onRetry={() => retryOperation()}
  onDismiss={() => clearError()}
  showTechnicalDetails={isDevelopment}
/>
```

### Fallback Message Component

```typescript
import { FallbackMessage } from '@/components/ui/error-display';

<FallbackMessage
  fallbackName="cached_results"
  limitations={['Data may be outdated']}
  onDismiss={() => clearFallback()}
/>
```

### Error Boundary

```typescript
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary
  fallback={(error, resetError) => (
    <CustomErrorDisplay error={error} onReset={resetError} />
  )}
  onError={(error, errorInfo) => logError(error, errorInfo)}
>
  <YourComponent />
</ErrorBoundary>
```

## React Hooks

### useErrorHandler

```typescript
const {
  error,
  isRetrying,
  retryCount,
  fallbackUsed,
  userMessage,
  handleError,
  retry,
  clearError,
  hasError
} = useErrorHandler({
  enableRetry: true,
  enableFallback: true,
  onError: (error) => console.log('Error occurred:', error),
  onRetry: (attempt) => console.log('Retry attempt:', attempt),
  onFallback: (fallback) => console.log('Using fallback:', fallback)
});
```

### useAsyncOperation

```typescript
const {
  data,
  loading,
  execute,
  retry,
  error,
  hasError
} = useAsyncOperation(
  () => fetchUserData(userId),
  {
    immediate: true,
    dependencies: [userId],
    enableRetry: true
  }
);
```

 

### useNetworkRequest

```typescript
const {
  data,
  loading,
  execute,
  retry,
  error
} = useNetworkRequest('/api/contacts', {
  method: 'GET',
  immediate: true,
  enableRetry: true
});
```

## API Integration

### Error Handling Wrapper

```typescript
import { withErrorHandling } from '@/lib/error-handling/api-integration';

export const POST = withErrorHandling(
  async (request: NextRequest) => {
    const body = await request.json();
    const result = await processRequest(body);
    return NextResponse.json(result);
  },
  {
    operationType: 'data_processing',
    enableFallback: true,
    logErrors: true
  }
);
```

### AI Operation with Fallback

```typescript
import { withAIFallback } from '@/lib/error-handling/api-integration';

export const POST = withAIFallback(
  () => performAIResearch(query),
  'research',
  { userId: 'user-123', query }
);
```

### Manual Error Handling

```typescript
import { handleAsyncOperation, createErrorResponse } from '@/lib/error-handling/api-integration';

export async function POST(request: NextRequest) {
  const context = {
    timestamp: new Date(),
    operationType: 'research',
    endpoint: '/api/research'
  };

  const result = await handleAsyncOperation(
    () => performResearch(query),
    context,
    { logErrors: true }
  );

  if (result.success) {
    return NextResponse.json(result.data);
  } else {
    return createErrorResponse(result.error!);
  }
}
```

## Configuration

### Error Handler Configuration

```typescript
import { ErrorHandler } from '@/lib/error-handling';

const errorHandler = ErrorHandler.getInstance({
  enableLogging: true,
  enableRetry: true,
  enableFallback: true,
  enableUserNotification: true,
  maxRetryAttempts: 3,
  baseRetryDelay: 1000,
  enableCircuitBreaker: true
});
```

### Retry Configuration

```typescript
import { RETRY_CONFIGS } from '@/lib/error-handling';

// Use predefined configurations
const result = await RetryMechanism.executeWithConfig(
  () => operation(),
  'ai_service' // or 'network', 'database', 'external_api'
);

// Custom configuration
const customResult = await RetryMechanism.execute(
  () => operation(),
  {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 1.5,
    jitter: true
  }
);
```

## Best Practices

### 1. Error Classification
```typescript
// Always provide proper context
const context: ErrorContext = {
  timestamp: new Date(),
  operationType: 'research',
  userId: session.user.id,
  endpoint: '/api/research',
  requestId: generateRequestId()
};
```

### 2. Graceful Degradation
```typescript
// Always provide fallback options for critical operations
const fallbackOptions = [
  {
    name: 'cached_data',
    priority: 1,
    operation: () => getCachedData(),
    limitations: ['May be outdated']
  },
  {
    name: 'manual_alternative',
    priority: 2,
    operation: () => getManualInstructions(),
    limitations: ['Requires manual effort']
  }
];
```

### 3. User Communication
```typescript
// Always provide clear, actionable error messages
const userMessage = UserMessageGenerator.generateMessage(error, {
  operationType: 'research',
  hasAlternatives: true,
  supportContact: 'support@company.com'
});
```

### 4. Monitoring and Logging
```typescript
// Log errors with sufficient context for debugging
await errorHandler.handleError(error, {
  timestamp: new Date(),
  operationType: 'research',
  userId: user.id,
  metadata: {
    query: searchQuery,
    filters: appliedFilters,
    sessionId: session.id
  }
});
```

## Testing

### Unit Tests
```typescript
import { ErrorHandler, AppError } from '@/lib/error-handling';

describe('ErrorHandler', () => {
  it('should retry retryable errors', async () => {
    const mockOperation = jest.fn()
      .mockRejectedValueOnce(new Error('Temporary failure'))
      .mockResolvedValueOnce('Success');

    const result = await errorHandler.handleError(
      new Error('Temporary failure'),
      context,
      mockOperation
    );

    expect(result.success).toBe(true);
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });
});
```

### Integration Tests
```typescript
import { withErrorHandling } from '@/lib/error-handling/api-integration';

describe('API Error Handling', () => {
  it('should return proper error response', async () => {
    const handler = withErrorHandling(
      async () => {
        throw new Error('Test error');
      },
      { operationType: 'test' }
    );

    const response = await handler(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBeDefined();
    expect(data.error.message).toBeDefined();
  });
});
```

This comprehensive error handling system provides robust error management with graceful degradation, ensuring your application remains functional even when individual services fail.
