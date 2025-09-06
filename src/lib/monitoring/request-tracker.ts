/**
 * Request Context Tracking System
 * Provides request tracing, context management, and operation tracking for debugging
 */

import { NextRequest } from 'next/server';

export interface RequestContext {
  traceId: string;
  userId?: string;
  sessionId?: string;
  endpoint: string;
  method: string;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
  metadata: Record<string, any>;
  operations: OperationLog[];
}

export interface OperationLog {
  operation: string;
  timestamp: Date;
  duration?: number;
  status: 'started' | 'completed' | 'failed';
  details?: any;
  error?: string;
}

export interface ErrorContext {
  traceId: string;
  operation?: string;
  error: Error;
  timestamp: Date;
  context: RequestContext;
  additionalData?: Record<string, any>;
}

// Global context storage (in production, use Redis or external storage)
const activeContexts = new Map<string, RequestContext>();
const MAX_CONTEXTS = 1000; // Prevent memory leaks

/**
 * RequestTracker class for managing request contexts and operations
 */
export class RequestTracker {
  private context: RequestContext;

  constructor(context: RequestContext) {
    this.context = context;
    this.storeContext();
  }

  /**
   * Create a new request context from NextRequest
   */
  static createContext(request: NextRequest, additionalMetadata?: Record<string, any>): RequestContext {
    const traceId = RequestTracker.generateTraceId();
    const url = new URL(request.url);
    
    const context: RequestContext = {
      traceId,
      endpoint: url.pathname,
      method: request.method,
      timestamp: new Date(),
      userAgent: request.headers.get('user-agent') || undefined,
      ip: RequestTracker.getClientIP(request),
      metadata: {
        searchParams: Object.fromEntries(url.searchParams),
        headers: Object.fromEntries(request.headers.entries()),
        ...additionalMetadata
      },
      operations: []
    };

    return context;
  }

  /**
   * Create a new RequestTracker instance
   */
  static create(request: NextRequest, additionalMetadata?: Record<string, any>): RequestTracker {
    const context = RequestTracker.createContext(request, additionalMetadata);
    return new RequestTracker(context);
  }

  /**
   * Generate a unique trace ID
   */
  static generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `trace-${timestamp}-${random}`;
  }

  /**
   * Get client IP address from request
   */
  private static getClientIP(request: NextRequest): string | undefined {
    // Check various headers for client IP
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    return undefined;
  }

  /**
   * Get the trace ID for this context
   */
  getTraceId(): string {
    return this.context.traceId;
  }

  /**
   * Get the full context
   */
  getContext(): RequestContext {
    return { ...this.context };
  }

  /**
   * Update user information in context
   */
  setUser(userId: string, sessionId?: string): void {
    this.context.userId = userId;
    this.context.sessionId = sessionId;
    this.updateStoredContext();
  }

  /**
   * Add metadata to the context
   */
  addMetadata(key: string, value: any): void {
    this.context.metadata[key] = value;
    this.updateStoredContext();
  }

  /**
   * Track the start of an operation
   */
  trackOperationStart(operation: string, details?: any): void {
    const operationLog: OperationLog = {
      operation,
      timestamp: new Date(),
      status: 'started',
      details
    };

    this.context.operations.push(operationLog);
    this.updateStoredContext();

    console.log(`🔄 [REQUEST-TRACKER] [${this.context.traceId}] Operation started: ${operation}`, {
      timestamp: operationLog.timestamp.toISOString(),
      details
    });
  }

  /**
   * Track the completion of an operation
   */
  trackOperationComplete(operation: string, details?: any): void {
    const operationIndex = this.context.operations.findIndex(
      op => op.operation === operation && op.status === 'started'
    );

    if (operationIndex >= 0) {
      const startTime = this.context.operations[operationIndex].timestamp;
      const duration = Date.now() - startTime.getTime();
      
      this.context.operations[operationIndex] = {
        ...this.context.operations[operationIndex],
        status: 'completed',
        duration,
        details: { ...this.context.operations[operationIndex].details, ...details }
      };
    } else {
      // Operation wasn't tracked as started, add as completed
      this.context.operations.push({
        operation,
        timestamp: new Date(),
        status: 'completed',
        details
      });
    }

    this.updateStoredContext();

    const completedOp = this.context.operations[operationIndex >= 0 ? operationIndex : this.context.operations.length - 1];
    console.log(`✅ [REQUEST-TRACKER] [${this.context.traceId}] Operation completed: ${operation}`, {
      duration: completedOp.duration ? `${completedOp.duration}ms` : 'unknown',
      details
    });
  }

  /**
   * Track a failed operation
   */
  trackOperationFailed(operation: string, error: Error, details?: any): void {
    const operationIndex = this.context.operations.findIndex(
      op => op.operation === operation && op.status === 'started'
    );

    if (operationIndex >= 0) {
      const startTime = this.context.operations[operationIndex].timestamp;
      const duration = Date.now() - startTime.getTime();
      
      this.context.operations[operationIndex] = {
        ...this.context.operations[operationIndex],
        status: 'failed',
        duration,
        error: error.message,
        details: { ...this.context.operations[operationIndex].details, ...details }
      };
    } else {
      // Operation wasn't tracked as started, add as failed
      this.context.operations.push({
        operation,
        timestamp: new Date(),
        status: 'failed',
        error: error.message,
        details
      });
    }

    this.updateStoredContext();

    console.error(`❌ [REQUEST-TRACKER] [${this.context.traceId}] Operation failed: ${operation}`, {
      error: error.message,
      details,
      stack: error.stack
    });
  }

  /**
   * Log an error with full context
   */
  logError(error: Error, operation?: string, additionalData?: Record<string, any>): void {
    const errorContext: ErrorContext = {
      traceId: this.context.traceId,
      operation,
      error,
      timestamp: new Date(),
      context: this.getContext(),
      additionalData
    };

    console.error(`💥 [REQUEST-TRACKER] [${this.context.traceId}] Error logged:`, {
      operation,
      error: error.message,
      stack: error.stack,
      context: {
        endpoint: this.context.endpoint,
        method: this.context.method,
        userId: this.context.userId,
        timestamp: this.context.timestamp.toISOString(),
        operations: this.context.operations.length
      },
      additionalData
    });

    // Track as failed operation if operation is specified
    if (operation) {
      this.trackOperationFailed(operation, error, additionalData);
    }
  }

  /**
   * Get operation summary for this request
   */
  getOperationSummary(): {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    totalDuration: number;
  } {
    const operations = this.context.operations;
    const completed = operations.filter(op => op.status === 'completed');
    const failed = operations.filter(op => op.status === 'failed');
    const inProgress = operations.filter(op => op.status === 'started');
    
    const totalDuration = completed.reduce((sum, op) => sum + (op.duration || 0), 0);

    return {
      total: operations.length,
      completed: completed.length,
      failed: failed.length,
      inProgress: inProgress.length,
      totalDuration
    };
  }

  /**
   * Store context in global storage
   */
  private storeContext(): void {
    // Prevent memory leaks by limiting stored contexts
    if (activeContexts.size >= MAX_CONTEXTS) {
      const oldestKey = activeContexts.keys().next().value;
      if (oldestKey) {
        activeContexts.delete(oldestKey);
      }
    }

    activeContexts.set(this.context.traceId, this.context);
  }

  /**
   * Update stored context
   */
  private updateStoredContext(): void {
    activeContexts.set(this.context.traceId, this.context);
  }

  /**
   * Clean up context from storage
   */
  cleanup(): void {
    activeContexts.delete(this.context.traceId);
  }

  /**
   * Get context by trace ID (static method)
   */
  static getContextByTraceId(traceId: string): RequestContext | undefined {
    return activeContexts.get(traceId);
  }

  /**
   * Get all active contexts (for debugging/monitoring)
   */
  static getAllActiveContexts(): RequestContext[] {
    return Array.from(activeContexts.values());
  }

  /**
   * Clean up old contexts (call periodically to prevent memory leaks)
   */
  static cleanupOldContexts(maxAgeMs: number = 60 * 60 * 1000): number {
    const cutoffTime = Date.now() - maxAgeMs;
    let cleaned = 0;

    for (const [traceId, context] of activeContexts.entries()) {
      if (context.timestamp.getTime() < cutoffTime) {
        activeContexts.delete(traceId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 [REQUEST-TRACKER] Cleaned up ${cleaned} old contexts`);
    }

    return cleaned;
  }
}

/**
 * Utility function to create a request tracker from NextRequest
 */
export function createRequestTracker(request: NextRequest, additionalMetadata?: Record<string, any>): RequestTracker {
  return RequestTracker.create(request, additionalMetadata);
}

/**
 * Utility function to generate a trace ID
 */
export function generateTraceId(): string {
  return RequestTracker.generateTraceId();
}

/**
 * Start periodic cleanup of old contexts
 */
export function startContextCleanup(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
  console.log('🧹 [REQUEST-TRACKER] Starting periodic context cleanup...');
  
  return setInterval(() => {
    RequestTracker.cleanupOldContexts();
  }, intervalMs);
}