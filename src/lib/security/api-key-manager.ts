/**
 * API Key Management and Validation Service
 * Handles API key validation, rotation, and security monitoring
 */

import { createHash, randomBytes } from 'crypto';

export interface APIKey {
  id: string;
  name: string;
  keyHash: string; // Hashed version of the key
  prefix: string; // First 8 characters for identification
  userId: string;
  permissions: string[];
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    description?: string;
    ipWhitelist?: string[];
    rateLimitOverride?: {
      windowMs: number;
      maxRequests: number;
    };
  };
}

export interface APIKeyValidationResult {
  valid: boolean;
  key?: APIKey;
  error?: string;
  remainingUses?: number;
}

export interface APIKeyUsage {
  keyId: string;
  endpoint: string;
  method: string;
  ip: string;
  userAgent: string;
  success: boolean;
  responseTime: number;
  timestamp: Date;
  errorMessage?: string;
}

/**
 * API Key Manager Class
 */
export class APIKeyManager {
  private static instance: APIKeyManager;
  private keys: Map<string, APIKey> = new Map();
  private usageLog: APIKeyUsage[] = [];

  static getInstance(): APIKeyManager {
    if (!APIKeyManager.instance) {
      APIKeyManager.instance = new APIKeyManager();
    }
    return APIKeyManager.instance;
  }

  /**
   * Generate a new API key
   */
  generateAPIKey(params: {
    name: string;
    userId: string;
    permissions: string[];
    expiresAt?: Date;
    metadata?: APIKey['metadata'];
  }): { key: string; apiKey: APIKey } {
    const keyId = this.generateId();
    const rawKey = this.generateSecureKey();
    const keyHash = this.hashKey(rawKey);
    const prefix = rawKey.substring(0, 8);

    const apiKey: APIKey = {
      id: keyId,
      name: params.name,
      keyHash,
      prefix,
      userId: params.userId,
      permissions: params.permissions,
      isActive: true,
      expiresAt: params.expiresAt,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: params.metadata
    };

    this.keys.set(keyId, apiKey);

    // Return the raw key only once (for user to save)
    return {
      key: rawKey,
      apiKey: {
        ...apiKey,
        keyHash: '[REDACTED]' // Don't return the hash
      }
    };
  }

  /**
   * Validate an API key
   */
  async validateAPIKey(
    rawKey: string,
    requiredPermission?: string,
    clientIP?: string
  ): Promise<APIKeyValidationResult> {
    if (!rawKey || rawKey.length < 32) {
      return { valid: false, error: 'Invalid API key format' };
    }

    const keyHash = this.hashKey(rawKey);
    const prefix = rawKey.substring(0, 8);

    // Find key by hash (more secure than storing raw keys)
    const apiKey = Array.from(this.keys.values()).find(
      key => key.keyHash === keyHash && key.prefix === prefix
    );

    if (!apiKey) {
      return { valid: false, error: 'API key not found' };
    }

    // Check if key is active
    if (!apiKey.isActive) {
      return { valid: false, error: 'API key is disabled' };
    }

    // Check expiration
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return { valid: false, error: 'API key has expired' };
    }

    // Check permissions
    if (requiredPermission && !apiKey.permissions.includes(requiredPermission)) {
      return { valid: false, error: 'Insufficient permissions' };
    }

    // Check IP whitelist
    if (clientIP && apiKey.metadata?.ipWhitelist) {
      if (!apiKey.metadata.ipWhitelist.includes(clientIP)) {
        return { valid: false, error: 'IP address not whitelisted' };
      }
    }

    // Update usage statistics
    await this.recordKeyUsage(apiKey.id);

    return {
      valid: true,
      key: apiKey
    };
  }

  /**
   * Rotate an API key (generate new key, keep same permissions)
   */
  async rotateAPIKey(keyId: string): Promise<{ key: string; apiKey: APIKey } | null> {
    const existingKey = this.keys.get(keyId);
    if (!existingKey) {
      return null;
    }

    // Generate new key with same properties
    const newKeyData = this.generateAPIKey({
      name: existingKey.name,
      userId: existingKey.userId,
      permissions: existingKey.permissions,
      expiresAt: existingKey.expiresAt,
      metadata: existingKey.metadata
    });

    // Deactivate old key
    existingKey.isActive = false;
    existingKey.updatedAt = new Date();

    return newKeyData;
  }

  /**
   * Revoke an API key
   */
  async revokeAPIKey(keyId: string): Promise<boolean> {
    const apiKey = this.keys.get(keyId);
    if (!apiKey) {
      return false;
    }

    apiKey.isActive = false;
    apiKey.updatedAt = new Date();
    return true;
  }

  /**
   * List API keys for a user
   */
  getUserAPIKeys(userId: string): APIKey[] {
    return Array.from(this.keys.values())
      .filter(key => key.userId === userId)
      .map(key => ({
        ...key,
        keyHash: '[REDACTED]' // Don't expose hashes
      }));
  }

  /**
   * Get API key usage statistics
   */
  getKeyUsageStats(keyId: string, timeRange?: { start: Date; end: Date }): {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    topEndpoints: Array<{ endpoint: string; count: number }>;
    recentUsage: APIKeyUsage[];
  } {
    let usage = this.usageLog.filter(log => log.keyId === keyId);

    if (timeRange) {
      usage = usage.filter(
        log => log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      );
    }

    const totalRequests = usage.length;
    const successfulRequests = usage.filter(log => log.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = usage.length > 0
      ? usage.reduce((sum, log) => sum + log.responseTime, 0) / usage.length
      : 0;

    // Count endpoint usage
    const endpointCounts = usage.reduce((acc, log) => {
      const key = `${log.method} ${log.endpoint}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topEndpoints = Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const recentUsage = usage
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      topEndpoints,
      recentUsage
    };
  }

  /**
   * Record API key usage
   */
  private async recordKeyUsage(keyId: string): Promise<void> {
    const apiKey = this.keys.get(keyId);
    if (apiKey) {
      apiKey.usageCount++;
      apiKey.lastUsedAt = new Date();
      apiKey.updatedAt = new Date();
    }
  }

  /**
   * Log API key usage with details
   */
  async logKeyUsage(usage: Omit<APIKeyUsage, 'timestamp'>): Promise<void> {
    const logEntry: APIKeyUsage = {
      ...usage,
      timestamp: new Date()
    };

    this.usageLog.push(logEntry);

    // Keep only recent logs (last 10000 entries)
    if (this.usageLog.length > 10000) {
      this.usageLog = this.usageLog.slice(-5000);
    }

    // Update key usage count
    await this.recordKeyUsage(usage.keyId);
  }

  /**
   * Clean up expired keys
   */
  async cleanupExpiredKeys(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [keyId, apiKey] of this.keys.entries()) {
      if (apiKey.expiresAt && now > apiKey.expiresAt) {
        apiKey.isActive = false;
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Generate secure random key
   */
  private generateSecureKey(): string {
    const prefix = 'mk_'; // Media Kit prefix
    const randomPart = randomBytes(32).toString('hex');
    return `${prefix}${randomPart}`;
  }

  /**
   * Hash API key for secure storage
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * Get system-wide API key statistics
   */
  getSystemStats(): {
    totalKeys: number;
    activeKeys: number;
    expiredKeys: number;
    totalUsage: number;
    usageByUser: Record<string, number>;
    recentActivity: APIKeyUsage[];
  } {
    const allKeys = Array.from(this.keys.values());
    const now = new Date();

    const totalKeys = allKeys.length;
    const activeKeys = allKeys.filter(key => key.isActive).length;
    const expiredKeys = allKeys.filter(
      key => key.expiresAt && now > key.expiresAt
    ).length;
    const totalUsage = allKeys.reduce((sum, key) => sum + key.usageCount, 0);

    const usageByUser = allKeys.reduce((acc, key) => {
      acc[key.userId] = (acc[key.userId] || 0) + key.usageCount;
      return acc;
    }, {} as Record<string, number>);

    const recentActivity = this.usageLog
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 100);

    return {
      totalKeys,
      activeKeys,
      expiredKeys,
      totalUsage,
      usageByUser,
      recentActivity
    };
  }
}

// Export singleton instance
export const apiKeyManager = APIKeyManager.getInstance();

/**
 * Middleware for API key authentication
 */
export async function validateAPIKeyMiddleware(
  authHeader: string | null,
  requiredPermission?: string,
  clientIP?: string
): Promise<APIKeyValidationResult> {
  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header' };
  }

  // Support both "Bearer" and "ApiKey" prefixes
  const match = authHeader.match(/^(Bearer|ApiKey)\s+(.+)$/i);
  if (!match) {
    return { valid: false, error: 'Invalid Authorization header format' };
  }

  const rawKey = match[2];
  return apiKeyManager.validateAPIKey(rawKey, requiredPermission, clientIP);
}

/**
 * Permission constants
 */
export const API_PERMISSIONS = {
  ADMIN: 'admin',
  READ_CONTACTS: 'contacts:read',
  WRITE_CONTACTS: 'contacts:write'
} as const;
