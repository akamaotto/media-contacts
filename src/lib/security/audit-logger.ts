/**
 * Security Audit Logging Service
 * Tracks security-related events and suspicious activities
 */

export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  resource?: string;
  action: string;
  details: Record<string, any>;
  timestamp: Date;
  metadata?: {
    apiKeyId?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    responseTime?: number;
    rateLimitHit?: boolean;
    geoLocation?: {
      country?: string;
      city?: string;
      region?: string;
    };
  };
}

export type AuditEventType = 
  | 'authentication'
  | 'authorization'
  | 'api_access'
  | 'rate_limit'
  | 'data_access'
  | 'data_modification'
  | 'security_violation'
  | 'system_event'
  | 'ai_operation'
  | 'admin_action';

export interface SecurityAlert {
  id: string;
  alertType: SecurityAlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  userId?: string;
  ip: string;
  events: AuditEvent[];
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  notes?: string;
}

export type SecurityAlertType =
  | 'brute_force'
  | 'rate_limit_abuse'
  | 'suspicious_activity'
  | 'unauthorized_access'
  | 'data_breach_attempt'
  | 'api_abuse'
  | 'anomalous_behavior';

/**
 * Audit Logger Class
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private events: Map<string, AuditEvent> = new Map();
  private alerts: Map<string, SecurityAlert> = new Map();
  private eventBuffer: AuditEvent[] = [];
  private readonly maxBufferSize = 10000;

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log a security audit event
   */
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<string> {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateId(),
      timestamp: new Date()
    };

    // Store event
    this.events.set(auditEvent.id, auditEvent);
    this.eventBuffer.push(auditEvent);

    // Maintain buffer size
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer = this.eventBuffer.slice(-this.maxBufferSize / 2);
    }

    // Check for security patterns that might trigger alerts
    await this.analyzeForSecurityPatterns(auditEvent);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Audit Event:', {
        type: auditEvent.eventType,
        severity: auditEvent.severity,
        action: auditEvent.action,
        userId: auditEvent.userId,
        ip: auditEvent.ip
      });
    }

    return auditEvent.id;
  }

  /**
   * Log authentication events
   */
  async logAuthentication(params: {
    userId?: string;
    ip: string;
    userAgent: string;
    action: 'login_success' | 'login_failure' | 'logout' | 'session_expired';
    details?: Record<string, any>;
  }): Promise<string> {
    return this.logEvent({
      eventType: 'authentication',
      severity: params.action === 'login_failure' ? 'medium' : 'low',
      userId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      action: params.action,
      details: params.details || {}
    });
  }

  /**
   * Log API access events
   */
  async logAPIAccess(params: {
    userId?: string;
    apiKeyId?: string;
    ip: string;
    userAgent: string;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    rateLimitHit?: boolean;
    details?: Record<string, any>;
  }): Promise<string> {
    const severity = this.determineAPISeverity(params.statusCode, params.rateLimitHit);
    
    return this.logEvent({
      eventType: 'api_access',
      severity,
      userId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      resource: params.endpoint,
      action: `${params.method} ${params.endpoint}`,
      details: params.details || {},
      metadata: {
        apiKeyId: params.apiKeyId,
        endpoint: params.endpoint,
        method: params.method,
        statusCode: params.statusCode,
        responseTime: params.responseTime,
        rateLimitHit: params.rateLimitHit
      }
    });
  }

  /**
   * Log AI operation events
   */
  async logAIOperation(params: {
    userId: string;
    ip: string;
    userAgent: string;
    operationType: string;
    operation: string;
    success: boolean;
    cost?: number;
    tokensUsed?: number;
    details?: Record<string, any>;
  }): Promise<string> {
    return this.logEvent({
      eventType: 'ai_operation',
      severity: params.success ? 'low' : 'medium',
      userId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      resource: params.operationType,
      action: params.operation,
      details: {
        ...params.details,
        success: params.success,
        cost: params.cost,
        tokensUsed: params.tokensUsed
      }
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(params: {
    userId: string;
    ip: string;
    userAgent: string;
    resource: string;
    action: 'read' | 'search' | 'export';
    recordCount?: number;
    details?: Record<string, any>;
  }): Promise<string> {
    const severity = params.recordCount && params.recordCount > 1000 ? 'medium' : 'low';
    
    return this.logEvent({
      eventType: 'data_access',
      severity,
      userId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      resource: params.resource,
      action: params.action,
      details: {
        ...params.details,
        recordCount: params.recordCount
      }
    });
  }

  /**
   * Log data modification events
   */
  async logDataModification(params: {
    userId: string;
    ip: string;
    userAgent: string;
    resource: string;
    action: 'create' | 'update' | 'delete' | 'bulk_update' | 'bulk_delete';
    recordId?: string;
    recordCount?: number;
    changes?: Record<string, any>;
    details?: Record<string, any>;
  }): Promise<string> {
    const severity = params.action.startsWith('bulk_') || params.action === 'delete' 
      ? 'medium' 
      : 'low';
    
    return this.logEvent({
      eventType: 'data_modification',
      severity,
      userId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      resource: params.resource,
      action: params.action,
      details: {
        ...params.details,
        recordId: params.recordId,
        recordCount: params.recordCount,
        changes: params.changes
      }
    });
  }

  /**
   * Log security violations
   */
  async logSecurityViolation(params: {
    userId?: string;
    ip: string;
    userAgent: string;
    violationType: string;
    severity: 'medium' | 'high' | 'critical';
    details: Record<string, any>;
  }): Promise<string> {
    return this.logEvent({
      eventType: 'security_violation',
      severity: params.severity,
      userId: params.userId,
      ip: params.ip,
      userAgent: params.userAgent,
      action: params.violationType,
      details: params.details
    });
  }

  /**
   * Get audit events with filtering
   */
  getEvents(filters: {
    eventType?: AuditEventType;
    severity?: AuditEvent['severity'];
    userId?: string;
    ip?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): AuditEvent[] {
    let events = Array.from(this.events.values());

    // Apply filters
    if (filters.eventType) {
      events = events.filter(e => e.eventType === filters.eventType);
    }
    if (filters.severity) {
      events = events.filter(e => e.severity === filters.severity);
    }
    if (filters.userId) {
      events = events.filter(e => e.userId === filters.userId);
    }
    if (filters.ip) {
      events = events.filter(e => e.ip === filters.ip);
    }
    if (filters.startDate) {
      events = events.filter(e => e.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      events = events.filter(e => e.timestamp <= filters.endDate!);
    }

    // Sort by timestamp (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    return events.slice(offset, offset + limit);
  }

  /**
   * Get security alerts
   */
  getAlerts(filters: {
    alertType?: SecurityAlertType;
    severity?: SecurityAlert['severity'];
    status?: SecurityAlert['status'];
    userId?: string;
    ip?: string;
    limit?: number;
  } = {}): SecurityAlert[] {
    let alerts = Array.from(this.alerts.values());

    // Apply filters
    if (filters.alertType) {
      alerts = alerts.filter(a => a.alertType === filters.alertType);
    }
    if (filters.severity) {
      alerts = alerts.filter(a => a.severity === filters.severity);
    }
    if (filters.status) {
      alerts = alerts.filter(a => a.status === filters.status);
    }
    if (filters.userId) {
      alerts = alerts.filter(a => a.userId === filters.userId);
    }
    if (filters.ip) {
      alerts = alerts.filter(a => a.ip === filters.ip);
    }

    // Sort by creation date (newest first)
    alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply limit
    const limit = filters.limit || 50;
    return alerts.slice(0, limit);
  }

  /**
   * Create a security alert
   */
  async createAlert(params: {
    alertType: SecurityAlertType;
    severity: SecurityAlert['severity'];
    title: string;
    description: string;
    userId?: string;
    ip: string;
    events: AuditEvent[];
  }): Promise<string> {
    const alert: SecurityAlert = {
      id: this.generateId(),
      alertType: params.alertType,
      severity: params.severity,
      title: params.title,
      description: params.description,
      userId: params.userId,
      ip: params.ip,
      events: params.events,
      status: 'open',
      createdAt: new Date()
    };

    this.alerts.set(alert.id, alert);

    // Log the alert creation
    await this.logEvent({
      eventType: 'system_event',
      severity: params.severity,
      ip: params.ip,
      userAgent: 'system',
      action: 'security_alert_created',
      details: {
        alertId: alert.id,
        alertType: params.alertType,
        title: params.title
      }
    });

    return alert.id;
  }

  /**
   * Resolve a security alert
   */
  async resolveAlert(
    alertId: string, 
    resolvedBy: string, 
    status: 'resolved' | 'false_positive',
    notes?: string
  ): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.status = status;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
    alert.notes = notes;

    return true;
  }

  /**
   * Get audit statistics
   */
  getStatistics(timeRange?: { start: Date; end: Date }): {
    totalEvents: number;
    eventsByType: Record<AuditEventType, number>;
    eventsBySeverity: Record<string, number>;
    topIPs: Array<{ ip: string; count: number }>;
    topUsers: Array<{ userId: string; count: number }>;
    alertsSummary: {
      total: number;
      open: number;
      resolved: number;
      bySeverity: Record<string, number>;
    };
  } {
    let events = Array.from(this.events.values());
    
    if (timeRange) {
      events = events.filter(
        e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end
      );
    }

    const totalEvents = events.length;

    // Events by type
    const eventsByType = events.reduce((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] || 0) + 1;
      return acc;
    }, {} as Record<AuditEventType, number>);

    // Events by severity
    const eventsBySeverity = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top IPs
    const ipCounts = events.reduce((acc, event) => {
      acc[event.ip] = (acc[event.ip] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topIPs = Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top users
    const userCounts = events.reduce((acc, event) => {
      if (event.userId) {
        acc[event.userId] = (acc[event.userId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Alerts summary
    const allAlerts = Array.from(this.alerts.values());
    const alertsSummary = {
      total: allAlerts.length,
      open: allAlerts.filter(a => a.status === 'open').length,
      resolved: allAlerts.filter(a => a.status === 'resolved').length,
      bySeverity: allAlerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return {
      totalEvents,
      eventsByType,
      eventsBySeverity,
      topIPs,
      topUsers,
      alertsSummary
    };
  }

  /**
   * Analyze events for security patterns
   */
  private async analyzeForSecurityPatterns(event: AuditEvent): Promise<void> {
    // Check for brute force attacks (multiple failed logins from same IP)
    if (event.eventType === 'authentication' && event.action === 'login_failure') {
      await this.checkBruteForcePattern(event);
    }

    // Check for rate limit abuse
    if (event.metadata?.rateLimitHit) {
      await this.checkRateLimitAbusePattern(event);
    }

    // Check for suspicious API usage patterns
    if (event.eventType === 'api_access' && event.metadata?.statusCode === 403) {
      await this.checkUnauthorizedAccessPattern(event);
    }

    // Check for anomalous data access
    if (event.eventType === 'data_access' && event.details.recordCount > 5000) {
      await this.checkAnomalousDataAccessPattern(event);
    }
  }

  /**
   * Check for brute force attack patterns
   */
  private async checkBruteForcePattern(event: AuditEvent): Promise<void> {
    const recentFailures = this.eventBuffer
      .filter(e => 
        e.ip === event.ip &&
        e.eventType === 'authentication' &&
        e.action === 'login_failure' &&
        e.timestamp.getTime() > Date.now() - 15 * 60 * 1000 // Last 15 minutes
      );

    if (recentFailures.length >= 5) {
      await this.createAlert({
        alertType: 'brute_force',
        severity: 'high',
        title: 'Potential Brute Force Attack',
        description: `${recentFailures.length} failed login attempts from IP ${event.ip} in the last 15 minutes`,
        ip: event.ip,
        events: recentFailures
      });
    }
  }

  /**
   * Check for rate limit abuse patterns
   */
  private async checkRateLimitAbusePattern(event: AuditEvent): Promise<void> {
    const recentRateLimitHits = this.eventBuffer
      .filter(e => 
        e.ip === event.ip &&
        e.metadata?.rateLimitHit &&
        e.timestamp.getTime() > Date.now() - 60 * 60 * 1000 // Last hour
      );

    if (recentRateLimitHits.length >= 10) {
      await this.createAlert({
        alertType: 'rate_limit_abuse',
        severity: 'medium',
        title: 'Rate Limit Abuse Detected',
        description: `IP ${event.ip} has hit rate limits ${recentRateLimitHits.length} times in the last hour`,
        ip: event.ip,
        events: recentRateLimitHits
      });
    }
  }

  /**
   * Check for unauthorized access patterns
   */
  private async checkUnauthorizedAccessPattern(event: AuditEvent): Promise<void> {
    const recentUnauthorized = this.eventBuffer
      .filter(e => 
        e.ip === event.ip &&
        e.metadata?.statusCode === 403 &&
        e.timestamp.getTime() > Date.now() - 30 * 60 * 1000 // Last 30 minutes
      );

    if (recentUnauthorized.length >= 3) {
      await this.createAlert({
        alertType: 'unauthorized_access',
        severity: 'medium',
        title: 'Repeated Unauthorized Access Attempts',
        description: `IP ${event.ip} has made ${recentUnauthorized.length} unauthorized access attempts in the last 30 minutes`,
        ip: event.ip,
        events: recentUnauthorized
      });
    }
  }

  /**
   * Check for anomalous data access patterns
   */
  private async checkAnomalousDataAccessPattern(event: AuditEvent): Promise<void> {
    await this.createAlert({
      alertType: 'anomalous_behavior',
      severity: 'medium',
      title: 'Large Data Access Detected',
      description: `User ${event.userId} accessed ${event.details.recordCount} records from ${event.resource}`,
      userId: event.userId,
      ip: event.ip,
      events: [event]
    });
  }

  /**
   * Determine API access severity based on status code and rate limiting
   */
  private determineAPISeverity(statusCode: number, rateLimitHit?: boolean): AuditEvent['severity'] {
    if (rateLimitHit) return 'medium';
    if (statusCode >= 500) return 'high';
    if (statusCode >= 400) return 'medium';
    return 'low';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up old events and alerts
   */
  async cleanup(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<{ events: number; alerts: number }> {
    const cutoff = new Date(Date.now() - maxAge);
    let eventsRemoved = 0;
    let alertsRemoved = 0;

    // Clean up events
    for (const [id, event] of this.events.entries()) {
      if (event.timestamp < cutoff) {
        this.events.delete(id);
        eventsRemoved++;
      }
    }

    // Clean up resolved alerts older than cutoff
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.status === 'resolved' && alert.createdAt < cutoff) {
        this.alerts.delete(id);
        alertsRemoved++;
      }
    }

    // Clean up event buffer
    this.eventBuffer = this.eventBuffer.filter(e => e.timestamp >= cutoff);

    return { events: eventsRemoved, alerts: alertsRemoved };
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();