/**
 * AI API Logging System
 * Comprehensive logging for requests, responses, errors, and security events
 */

import { randomUUID } from 'crypto';

// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Log entry types
export enum LogType {
  REQUEST = 'request',
  RESPONSE = 'response',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  RATE_LIMIT_VIOLATION = 'rate_limit_violation',
  ERROR = 'error',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  BUSINESS = 'business'
}

// Base log entry interface
interface LogEntry {
  timestamp: string;
  correlationId: string;
  level: LogLevel;
  type: LogType;
  message: string;
  data?: any;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

// Request log entry
interface RequestLogEntry extends LogEntry {
  type: LogType.REQUEST;
  method: string;
  url: string;
  headers: Record<string, string>;
  query?: Record<string, string>;
  bodySize?: number;
}

// Response log entry
interface ResponseLogEntry extends LogEntry {
  type: LogType.RESPONSE;
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  responseSize?: number;
}

// Authentication log entry
interface AuthenticationLogEntry extends LogEntry {
  type: LogType.AUTHENTICATION;
  success: boolean;
  error?: string;
  userRole?: string;
}

// Rate limit log entry
interface RateLimitLogEntry extends LogEntry {
  type: LogType.RATE_LIMIT;
  endpointType: string;
  limit: number;
  remaining: number;
}

// Rate limit violation log entry
interface RateLimitViolationLogEntry extends LogEntry {
  type: LogType.RATE_LIMIT_VIOLATION;
  endpointType: string;
  retryAfter?: number;
}

// Security log entry
interface SecurityLogEntry extends LogEntry {
  type: LogType.SECURITY;
  eventType: 'suspicious_activity' | 'token_manipulation' | 'session_hijack' | 'injection_attempt';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: any;
}

// Performance log entry
interface PerformanceLogEntry extends LogEntry {
  type: LogType.PERFORMANCE;
  operation: string;
  duration: number;
  metadata?: any;
}

// Business log entry
interface BusinessLogEntry extends LogEntry {
  type: LogType.BUSINESS;
  event: string;
  entityType?: string;
  entityId?: string;
  changes?: any;
}

/**
 * AI Logger Class
 */
export class AILogger {
  private static instance: AILogger;
  private logLevel: LogLevel = LogLevel.INFO;
  private enableConsole: boolean = process.env.NODE_ENV !== 'production';
  private enableFile: boolean = process.env.NODE_ENV === 'production';

  private constructor() {
    this.logLevel = this.getLogLevelFromEnv();
  }

  static getInstance(): AILogger {
    if (!AILogger.instance) {
      AILogger.instance = new AILogger();
    }
    return AILogger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.AI_LOG_LEVEL?.toUpperCase();
    return Object.values(LogLevel).includes(envLevel as LogLevel)
      ? envLevel as LogLevel
      : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private writeLog(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const logEntry = {
      ...entry,
      service: 'ai-api',
      version: process.env.APP_VERSION || '1.0.0'
    };

    if (this.enableConsole) {
      this.writeToConsole(logEntry);
    }

    if (this.enableFile) {
      this.writeToFile(logEntry);
    }

    // Send to external logging service if configured
    if (process.env.EXTERNAL_LOG_ENDPOINT) {
      this.sendToExternalService(logEntry);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const colorCode = this.getColorCode(entry.level);
    const resetCode = '\x1b[0m';

    console.log(
      `${colorCode}[${entry.timestamp}] ${entry.level.toUpperCase()} [${entry.type}] [${entry.correlationId}]${resetCode} ${entry.message}`,
      entry.data ? '\n' + JSON.stringify(entry.data, null, 2) : ''
    );
  }

  private getColorCode(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '\x1b[31m'; // Red
      case LogLevel.WARN: return '\x1b[33m';  // Yellow
      case LogLevel.INFO: return '\x1b[36m';  // Cyan
      case LogLevel.DEBUG: return '\x1b[37m'; // White
      default: return '\x1b[0m';
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    // In production, this would write to a file or logging service
    // For now, we'll just include it in the implementation
    console.log(`[FILE LOG] ${JSON.stringify(entry)}`);
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    try {
      const endpoint = process.env.EXTERNAL_LOG_ENDPOINT;
      if (endpoint) {
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXTERNAL_LOG_TOKEN}`
          },
          body: JSON.stringify(entry)
        });
      }
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  // Public logging methods

  /**
   * Log incoming request
   */
  static async logRequest(data: {
    method: string;
    url: string;
    headers: Record<string, string>;
    ip: string;
    userAgent: string;
    correlationId: string;
    timestamp: string;
    userId?: string;
    query?: Record<string, string>;
    bodySize?: number;
  }): Promise<void> {
    const logger = AILogger.getInstance();

    const entry: RequestLogEntry = {
      timestamp: data.timestamp,
      correlationId: data.correlationId,
      level: LogLevel.INFO,
      type: LogType.REQUEST,
      message: `${data.method} ${data.url}`,
      method: data.method,
      url: data.url,
      headers: this.sanitizeHeaders(data.headers),
      query: data.query,
      bodySize: data.bodySize,
      userId: data.userId,
      ip: data.ip,
      userAgent: data.userAgent,
      data: {
        method: data.method,
        url: data.url,
        ip: data.ip,
        userAgent: data.userAgent,
        query: data.query,
        bodySize: data.bodySize
      }
    };

    logger.writeLog(entry);
  }

  /**
   * Log response
   */
  static async logResponse(data: {
    method: string;
    url: string;
    statusCode: number;
    responseTime: number;
    correlationId: string;
    userId?: string;
    timestamp: string;
    responseSize?: number;
  }): Promise<void> {
    const logger = AILogger.getInstance();

    const level = data.statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;

    const entry: ResponseLogEntry = {
      timestamp: data.timestamp,
      correlationId: data.correlationId,
      level,
      type: LogType.RESPONSE,
      message: `${data.method} ${data.url} - ${data.statusCode} (${data.responseTime}ms)`,
      method: data.method,
      url: data.url,
      statusCode: data.statusCode,
      responseTime: data.responseTime,
      responseSize: data.responseSize,
      userId: data.userId,
      data: {
        method: data.method,
        url: data.url,
        statusCode: data.statusCode,
        responseTime: data.responseTime,
        responseSize: data.responseSize
      }
    };

    logger.writeLog(entry);
  }

  /**
   * Log authentication attempt
   */
  static async logAuthentication(data: {
    userId: string | null;
    userRole: string | null;
    ip: string;
    userAgent: string;
    correlationId: string;
    success: boolean;
    error?: string;
  }): Promise<void> {
    const logger = AILogger.getInstance();

    const entry: AuthenticationLogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: data.correlationId,
      level: data.success ? LogLevel.INFO : LogLevel.WARN,
      type: LogType.AUTHENTICATION,
      message: data.success ? 'Authentication successful' : 'Authentication failed',
      success: data.success,
      error: data.error,
      userRole: data.userRole || undefined,
      userId: data.userId || undefined,
      ip: data.ip,
      userAgent: data.userAgent,
      data: {
        userId: data.userId,
        userRole: data.userRole,
        ip: data.ip,
        userAgent: data.userAgent,
        success: data.success,
        error: data.error
      }
    };

    logger.writeLog(entry);
  }

  /**
   * Log rate limit check
   */
  static async logRateLimit(data: {
    userId: string;
    endpointType: string;
    limit: number;
    remaining: number;
    correlationId: string;
  }): Promise<void> {
    const logger = AILogger.getInstance();

    const entry: RateLimitLogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: data.correlationId,
      level: LogLevel.DEBUG,
      type: LogType.RATE_LIMIT,
      message: `Rate limit check: ${data.remaining}/${data.limit} remaining`,
      endpointType: data.endpointType,
      limit: data.limit,
      remaining: data.remaining,
      userId: data.userId,
      data: {
        userId: data.userId,
        endpointType: data.endpointType,
        limit: data.limit,
        remaining: data.remaining
      }
    };

    logger.writeLog(entry);
  }

  /**
   * Log rate limit violation
   */
  static async logRateLimitViolation(data: {
    userId: string;
    endpointType: string;
    correlationId: string;
    retryAfter?: number;
  }): Promise<void> {
    const logger = AILogger.getInstance();

    const entry: RateLimitViolationLogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: data.correlationId,
      level: LogLevel.WARN,
      type: LogType.RATE_LIMIT_VIOLATION,
      message: `Rate limit exceeded for ${data.endpointType}`,
      endpointType: data.endpointType,
      retryAfter: data.retryAfter,
      userId: data.userId,
      data: {
        userId: data.userId,
        endpointType: data.endpointType,
        retryAfter: data.retryAfter
      }
    };

    logger.writeLog(entry);
  }

  /**
   * Log security event
   */
  static async logSecurity(data: {
    userId: string | null;
    ip: string;
    userAgent: string;
    correlationId: string;
    eventType: SecurityLogEntry['eventType'];
    severity: SecurityLogEntry['severity'];
    details?: any;
  }): Promise<void> {
    const logger = AILogger.getInstance();

    const entry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: data.correlationId,
      level: LogLevel.WARN,
      type: LogType.SECURITY,
      message: `Security event: ${data.eventType}`,
      eventType: data.eventType,
      severity: data.severity,
      details: data.details,
      userId: data.userId || undefined,
      ip: data.ip,
      userAgent: data.userAgent,
      data: {
        userId: data.userId,
        ip: data.ip,
        userAgent: data.userAgent,
        eventType: data.eventType,
        severity: data.severity,
        details: data.details
      }
    };

    logger.writeLog(entry);
  }

  /**
   * Log performance metrics
   */
  static async logPerformance(data: {
    operation: string;
    duration: number;
    correlationId: string;
    userId?: string;
    metadata?: any;
  }): Promise<void> {
    const logger = AILogger.getInstance();

    const level = data.duration > 5000 ? LogLevel.WARN : LogLevel.DEBUG;

    const entry: PerformanceLogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: data.correlationId,
      level,
      type: LogType.PERFORMANCE,
      message: `Performance: ${data.operation} took ${data.duration}ms`,
      operation: data.operation,
      duration: data.duration,
      metadata: data.metadata,
      userId: data.userId || undefined,
      data: {
        operation: data.operation,
        duration: data.duration,
        metadata: data.metadata
      }
    };

    logger.writeLog(entry);
  }

  /**
   * Log business events
   */
  static async logBusiness(data: {
    event: string;
    correlationId: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    changes?: any;
  }): Promise<void> {
    const logger = AILogger.getInstance();

    const entry: BusinessLogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: data.correlationId,
      level: LogLevel.INFO,
      type: LogType.BUSINESS,
      message: `Business event: ${data.event}`,
      event: data.event,
      entityType: data.entityType,
      entityId: data.entityId,
      changes: data.changes,
      userId: data.userId || undefined,
      data: {
        event: data.event,
        entityType: data.entityType,
        entityId: data.entityId,
        changes: data.changes
      }
    };

    logger.writeLog(entry);
  }

  /**
   * Log general errors
   */
  static async logError(data: {
    error: Error | string;
    correlationId: string;
    userId?: string;
    context?: any;
  }): Promise<void> {
    const logger = AILogger.getInstance();

    const message = typeof data.error === 'string' ? data.error : data.error.message;
    const stack = typeof data.error === 'string' ? undefined : data.error.stack;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: data.correlationId,
      level: LogLevel.ERROR,
      type: LogType.ERROR,
      message: `Error: ${message}`,
      userId: data.userId || undefined,
      data: {
        error: message,
        stack,
        context: data.context
      }
    };

    logger.writeLog(entry);
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private static sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get logger statistics
   */
  getStats(): {
    logLevel: LogLevel;
    enableConsole: boolean;
    enableFile: boolean;
    totalLogs: number;
  } {
    return {
      logLevel: this.logLevel,
      enableConsole: this.enableConsole,
      enableFile: this.enableFile,
      totalLogs: 0 // Would need to implement counting
    };
  }
}

// Export convenience methods
export const logger = AILogger.getInstance();