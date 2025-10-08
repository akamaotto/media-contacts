/**
 * AI Services Security Module
 * Handles API key protection, PII redaction, data encryption, and access controls
 */

import crypto from 'crypto';
import { z } from 'zod';

// PII Detection and Redaction
export interface PIIPattern {
  type: 'email' | 'phone' | 'ssn' | 'credit_card' | 'address' | 'name' | 'ip_address';
  pattern: RegExp;
  replacement: string;
  confidence: number;
}

export interface PIIAnalysisResult {
  originalLength: number;
  redactedLength: number;
  piiCount: number;
  piiTypes: string[];
  redactedContent: string;
  confidence: number;
  processingTime: number;
}

// API Key Management
export interface APIKeyInfo {
  id: string;
  name: string;
  service: string;
  hashedKey: string;
  salt: string;
  permissions: string[];
  rateLimitPerHour: number;
  lastUsed?: Date;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface APIKeyUsage {
  keyId: string;
  service: string;
  operation: string;
  timestamp: Date;
  success: boolean;
  responseTime: number;
  tokensUsed?: number;
  cost?: number;
  ipAddress: string;
  userAgent: string;
}

// Access Control
export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  rules: AccessRule[];
  priority: number;
  isActive: boolean;
}

export interface AccessRule {
  type: 'user_role' | 'ip_range' | 'time_window' | 'rate_limit' | 'operation_type';
  conditions: Record<string, any>;
  action: 'allow' | 'deny' | 'limit';
  parameters?: Record<string, any>;
}

// Data Encryption
export interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength?: number;
}

// Audit Logging
export interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  keyId?: string;
  service: string;
  operation: string;
  action: 'access' | 'create' | 'update' | 'delete' | 'execute';
  resource?: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details: Record<string, any>;
  piiRedacted: boolean;
  dataHash?: string;
}

export class AISecurityManager {
  private static instance: AISecurityManager;
  private readonly piiPatterns: PIIPattern[];
  private readonly encryptionKey: Buffer;
  private readonly encryptionConfig: EncryptionConfig;
  private auditLogs: AuditLog[] = [];
  private apiKeys: Map<string, APIKeyInfo> = new Map();
  private accessPolicies: Map<string, AccessPolicy> = new Map();

  private constructor() {
    this.piiPatterns = [
      {
        type: 'email',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[EMAIL_REDACTED]',
        confidence: 0.95
      },
      {
        type: 'phone',
        pattern: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
        replacement: '[PHONE_REDACTED]',
        confidence: 0.9
      },
      {
        type: 'ssn',
        pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
        replacement: '[SSN_REDACTED]',
        confidence: 0.99
      },
      {
        type: 'credit_card',
        pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
        replacement: '[CARD_REDACTED]',
        confidence: 0.85
      },
      {
        type: 'ip_address',
        pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
        replacement: '[IP_REDACTED]',
        confidence: 0.8
      },
      {
        type: 'address',
        pattern: /\d+\s+([A-Z][a-z]*\s)*[A-Z][a-z]*,\s*[A-Z][a-z]*\s*\d{5}/g,
        replacement: '[ADDRESS_REDACTED]',
        confidence: 0.7
      }
    ];

    this.encryptionConfig = {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      tagLength: 16
    };

    // Initialize encryption key from environment
    const keyString = process.env.AI_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    this.encryptionKey = Buffer.from(keyString, 'hex').slice(0, 32);
  }

  public static getInstance(): AISecurityManager {
    if (!AISecurityManager.instance) {
      AISecurityManager.instance = new AISecurityManager();
    }
    return AISecurityManager.instance;
  }

  /**
   * Detect and redact PII from text
   */
  public detectAndRedactPII(text: string, options?: {
    enabledTypes?: string[];
    preserveFormat?: boolean;
    confidence?: number;
  }): PIIAnalysisResult {
    const startTime = Date.now();
    const enabledTypes = options?.enabledTypes || Object.keys(this.piiPatterns);
    const minConfidence = options?.confidence || 0.7;

    let redactedContent = text;
    let totalPIICount = 0;
    const detectedTypes = new Set<string>();

    for (const pattern of this.piiPatterns) {
      if (!enabledTypes.includes(pattern.type) || pattern.confidence < minConfidence) {
        continue;
      }

      const matches = redactedContent.match(pattern.pattern);
      if (matches) {
        totalPIICount += matches.length;
        detectedTypes.add(pattern.type);

        if (options?.preserveFormat) {
          // Preserve format while redacting
          redactedContent = redactedContent.replace(pattern.pattern, (match) => {
            return pattern.replacement + '_'.repeat(Math.max(0, match.length - pattern.replacement.length));
          });
        } else {
          redactedContent = redactedContent.replace(pattern.pattern, pattern.replacement);
        }
      }
    }

    return {
      originalLength: text.length,
      redactedLength: redactedContent.length,
      piiCount: totalPIICount,
      piiTypes: Array.from(detectedTypes),
      redactedContent,
      confidence: totalPIICount > 0 ? 0.9 : 1.0,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Hash and validate API keys
   */
  public hashAPIKey(apiKey: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(apiKey, salt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  /**
   * Validate API key against stored hash
   */
  public validateAPIKey(apiKey: string, storedHash: string, salt: string): boolean {
    const computedHash = crypto.pbkdf2Sync(apiKey, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(computedHash, 'hex'));
  }

  /**
   * Register new API key
   */
  public registerAPIKey(keyInfo: Omit<APIKeyInfo, 'id' | 'hashedKey' | 'salt' | 'createdAt'>): string {
    const id = crypto.randomUUID();
    const { hash, salt } = this.hashAPIKey(keyInfo.apiKey);

    const apiKeyRecord: APIKeyInfo = {
      ...keyInfo,
      id,
      hashedKey: hash,
      salt,
      createdAt: new Date(),
      isActive: true
    };

    // Remove the actual API key from the stored record
    delete (apiKeyRecord as any).apiKey;

    this.apiKeys.set(id, apiKeyRecord);

    // Log the registration
    this.logAudit({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      keyId: id,
      service: keyInfo.service,
      operation: 'api_key_registration',
      action: 'create',
      ipAddress: 'system',
      userAgent: 'security_manager',
      success: true,
      details: { serviceName: keyInfo.service, permissions: keyInfo.permissions },
      piiRedacted: true
    });

    return id;
  }

  /**
   * Validate API key and check permissions
   */
  public validateAPIKeyAccess(keyId: string, operation: string, context: {
    ipAddress: string;
    userAgent: string;
    userId?: string;
  }): { valid: boolean; permissions?: string[]; reason?: string } {
    const apiKeyInfo = this.apiKeys.get(keyId);

    if (!apiKeyInfo || !apiKeyInfo.isActive) {
      this.logAudit({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        userId: context.userId,
        keyId,
        service: 'unknown',
        operation,
        action: 'access',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        success: false,
        details: { reason: 'invalid_or_inactive_key' },
        piiRedacted: false
      });

      return { valid: false, reason: 'Invalid or inactive API key' };
    }

    // Check expiration
    if (apiKeyInfo.expiresAt && apiKeyInfo.expiresAt < new Date()) {
      return { valid: false, reason: 'API key expired' };
    }

    // Check permissions
    const hasPermission = apiKeyInfo.permissions.includes('*') ||
                         apiKeyInfo.permissions.includes(operation);

    if (!hasPermission) {
      this.logAudit({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        userId: context.userId,
        keyId,
        service: apiKeyInfo.service,
        operation,
        action: 'access',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        success: false,
        details: { reason: 'insufficient_permissions', permissions: apiKeyInfo.permissions },
        piiRedacted: false
      });

      return { valid: false, reason: 'Insufficient permissions' };
    }

    // Update last used timestamp
    apiKeyInfo.lastUsed = new Date();

    return { valid: true, permissions: apiKeyInfo.permissions };
  }

  /**
   * Encrypt sensitive data
   */
  public encryptData(data: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(this.encryptionConfig.ivLength);
    const cipher = crypto.createCipher(this.encryptionConfig.algorithm, this.encryptionKey);
    cipher.setAAD(Buffer.from('ai-services'));

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  public decryptData(encryptedData: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipher(this.encryptionConfig.algorithm, this.encryptionKey);
    decipher.setAAD(Buffer.from('ai-services'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Check access policies
   */
  public checkAccessPolicies(context: {
    userId?: string;
    userRole?: string;
    ipAddress: string;
    operation: string;
    service: string;
    timestamp: Date;
  }): { allowed: boolean; reason?: string; policy?: string } {
    const policies = Array.from(this.accessPolicies.values())
      .filter(p => p.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (const policy of policies) {
      for (const rule of policy.rules) {
        const result = this.evaluateAccessRule(rule, context);
        if (!result.pass) {
          return {
            allowed: false,
            reason: result.reason,
            policy: policy.name
          };
        }
      }
    }

    return { allowed: true };
  }

  /**
   * Log security events
   */
  public logAudit(logEntry: Omit<AuditLog, 'id' | 'timestamp' | 'dataHash'>): void {
    const auditLog: AuditLog = {
      ...logEntry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      dataHash: this.hashAuditData(logEntry.details)
    };

    this.auditLogs.push(auditLog);

    // Keep only last 10000 logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-10000);
    }

    // Log critical events to console
    if (!logEntry.success || logEntry.action === 'delete' || logEntry.action === 'create') {
      const level = logEntry.success ? 'info' : 'warn';
      console[level](`AI Security Audit: ${logEntry.operation}`, {
        userId: logEntry.userId,
        service: logEntry.service,
        action: logEntry.action,
        success: logEntry.success
      });
    }
  }

  /**
   * Get audit logs
   */
  public getAuditLogs(filters?: {
    userId?: string;
    service?: string;
    operation?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): AuditLog[] {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.service) {
        logs = logs.filter(log => log.service === filters.service);
      }
      if (filters.operation) {
        logs = logs.filter(log => log.operation === filters.operation);
      }
      if (filters.fromDate) {
        logs = logs.filter(log => log.timestamp >= filters.fromDate!);
      }
      if (filters.toDate) {
        logs = logs.filter(log => log.timestamp <= filters.toDate!);
      }
    }

    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return logs.slice(0, filters?.limit || 1000);
  }

  /**
   * Create access policy
   */
  public createAccessPolicy(policy: Omit<AccessPolicy, 'id'>): string {
    const id = crypto.randomUUID();
    const policyRecord: AccessPolicy = { ...policy, id };
    this.accessPolicies.set(id, policyRecord);
    return id;
  }

  /**
   * Rate limiting check
   */
  public checkRateLimit(keyId: string, operation: string, windowMs: number = 3600000): {
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  } {
    const apiKeyInfo = this.apiKeys.get(keyId);
    if (!apiKeyInfo) {
      return { allowed: false, remaining: 0, resetTime: new Date() };
    }

    // Simplified rate limiting - in production, use Redis or similar
    const limit = apiKeyInfo.rateLimitPerHour;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Count requests in the current window
    const recentRequests = this.getAuditLogs({
      keyId,
      fromDate: new Date(windowStart),
      toDate: new Date()
    });

    const currentUsage = recentRequests.filter(log => log.operation === operation).length;
    const remaining = Math.max(0, limit - currentUsage);
    const resetTime = new Date(windowStart + windowMs);

    return {
      allowed: currentUsage < limit,
      remaining,
      resetTime
    };
  }

  /**
   * Sanitize user input
   */
  public sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potentially dangerous characters
      return input
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .trim();
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Validate input against schema
   */
  public validateInput<T>(input: any, schema: z.ZodSchema<T>): {
    valid: boolean;
    data?: T;
    errors?: string[];
  } {
    try {
      const data = schema.parse(input);
      return { valid: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        return { valid: false, errors };
      }
      return { valid: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Evaluate access rule
   */
  private evaluateAccessRule(rule: AccessRule, context: any): { pass: boolean; reason?: string } {
    switch (rule.type) {
      case 'user_role':
        if (rule.conditions.roles && !rule.conditions.roles.includes(context.userRole)) {
          return { pass: false, reason: `User role ${context.userRole} not in allowed roles` };
        }
        break;

      case 'ip_range':
        if (rule.conditions.allowedRanges && !this.isIPAllowed(context.ipAddress, rule.conditions.allowedRanges)) {
          return { pass: false, reason: `IP address ${context.ipAddress} not in allowed ranges` };
        }
        break;

      case 'time_window':
        if (rule.conditions.startHour && rule.conditions.endHour) {
          const hour = context.timestamp.getHours();
          if (hour < rule.conditions.startHour || hour > rule.conditions.endHour) {
            return { pass: false, reason: `Access outside allowed time window` };
          }
        }
        break;

      case 'operation_type':
        if (rule.conditions.allowedOperations && !rule.conditions.allowedOperations.includes(context.operation)) {
          return { pass: false, reason: `Operation ${context.operation} not allowed` };
        }
        break;
    }

    return { pass: true };
  }

  /**
   * Check if IP is in allowed ranges
   */
  private isIPAllowed(ip: string, ranges: string[]): boolean {
    // Simplified IP checking - in production, use proper IP range matching
    return ranges.some(range => {
      if (range === ip) return true;
      if (range.includes('/')) {
        // CIDR notation - simplified check
        return ip.startsWith(range.split('/')[0].slice(0, -1));
      }
      return false;
    });
  }

  /**
   * Hash audit data for integrity
   */
  private hashAuditData(data: Record<string, any>): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Generate security report
   */
  public generateSecurityReport(timeframe: { from: Date; to: Date }): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    topUsers: Array<{ userId?: string; count: number }>;
    topServices: Array<{ service: string; count: number }>;
    topOperations: Array<{ operation: string; count: number }>;
    securityIncidents: AuditLog[];
    piiRedactions: number;
  } {
    const logs = this.getAuditLogs({
      fromDate: timeframe.from,
      toDate: timeframe.to
    });

    const totalRequests = logs.length;
    const successfulRequests = logs.filter(log => log.success).length;
    const failedRequests = totalRequests - successfulRequests;

    // Top users
    const userCounts = new Map<string, number>();
    logs.forEach(log => {
      if (log.userId) {
        userCounts.set(log.userId, (userCounts.get(log.userId) || 0) + 1);
      }
    });

    const topUsers = Array.from(userCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, count }));

    // Top services
    const serviceCounts = new Map<string, number>();
    logs.forEach(log => {
      serviceCounts.set(log.service, (serviceCounts.get(log.service) || 0) + 1);
    });

    const topServices = Array.from(serviceCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([service, count]) => ({ service, count }));

    // Top operations
    const operationCounts = new Map<string, number>();
    logs.forEach(log => {
      operationCounts.set(log.operation, (operationCounts.get(log.operation) || 0) + 1);
    });

    const topOperations = Array.from(operationCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([operation, count]) => ({ operation, count }));

    // Security incidents (failed authentications, etc.)
    const securityIncidents = logs.filter(log =>
      !log.success && (
        log.operation.includes('auth') ||
        log.operation.includes('api_key') ||
        log.action === 'delete'
      )
    );

    // PII redactions
    const piiRedactions = logs.filter(log => log.piiRedacted).length;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      topUsers,
      topServices,
      topOperations,
      securityIncidents,
      piiRedactions
    };
  }
}

// Export singleton instance
export const aiSecurityManager = AISecurityManager.getInstance();