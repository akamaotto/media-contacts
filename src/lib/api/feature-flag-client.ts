/**
 * Client-side Feature Flag API Service
 * Provides a convenient interface for the frontend to interact with the feature flag API
 */

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  type: 'release' | 'experiment' | 'ops' | 'permission';
  enabled: boolean;
  rolloutPercentage: number;
  userSegments: string[];
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface CreateFlagData {
  name: string;
  description: string;
  type: 'release' | 'experiment' | 'ops' | 'permission';
  enabled?: boolean;
  rolloutPercentage?: number;
  userSegments?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateFlagData {
  name?: string;
  description?: string;
  type?: 'release' | 'experiment' | 'ops' | 'permission';
  enabled?: boolean;
  rolloutPercentage?: number;
  userSegments?: string[];
  metadata?: Record<string, any>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FlagStats {
  totalEvaluations: number;
  enabledEvaluations: number;
  enabledPercentage: number;
  userSegmentStats: Record<string, { total: number; enabled: number; percentage: number }>;
}

export interface FlagHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  errorRate: number;
  totalEvaluations: number;
  enabledEvaluations: number;
  enabledPercentage: number;
  userSegmentStats: Record<string, { total: number; enabled: number; percentage: number }>;
  timeRange: string;
  lastChecked: string;
}

class FeatureFlagClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/feature-flags') {
    this.baseUrl = baseUrl;
  }

  /**
   * Handle API responses
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    const response = await fetch(this.baseUrl);
    const data = await this.handleResponse<FeatureFlag[]>(response);
    return data.data || [];
  }

  /**
   * Get a specific feature flag
   */
  async getFlag(id: string): Promise<FeatureFlag | null> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    const data = await this.handleResponse<FeatureFlag>(response);
    return data.data || null;
  }

  /**
   * Create a new feature flag
   */
  async createFlag(flagData: CreateFlagData, userId: string): Promise<{ id: string }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flagData, userId })
    });
    const data = await this.handleResponse<{ id: string }>(response);
    return data.data || { id: '' };
  }

  /**
   * Update a feature flag
   */
  async updateFlag(
    id: string, 
    updates: UpdateFlagData, 
    userId: string, 
    reason?: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, userId, reason })
    });
    await this.handleResponse(response);
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(id: string, userId: string, reason?: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, reason })
    });
    await this.handleResponse(response);
  }

  /**
   * Get feature flag statistics
   */
  async getFlagStats(id: string, timeRange: { start: Date; end: Date }): Promise<FlagStats> {
    const params = new URLSearchParams({
      start: timeRange.start.toISOString(),
      end: timeRange.end.toISOString()
    });
    
    const response = await fetch(`${this.baseUrl}/${id}/stats?${params}`);
    const data = await this.handleResponse<FlagStats>(response);
    return data.data || {
      totalEvaluations: 0,
      enabledEvaluations: 0,
      enabledPercentage: 0,
      userSegmentStats: {}
    };
  }

  /**
   * Get feature flag health metrics
   */
  async getFlagHealth(id: string, hours: number = 24): Promise<FlagHealth> {
    const response = await fetch(`${this.baseUrl}/${id}/health?hours=${hours}`);
    const data = await this.handleResponse<FlagHealth>(response);
    return data.data || {
      status: 'healthy',
      errorRate: 0,
      totalEvaluations: 0,
      enabledEvaluations: 0,
      enabledPercentage: 0,
      userSegmentStats: {},
      timeRange: `${hours}h`,
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Get feature flag audit log
   */
  async getFlagAuditLog(id: string, limit: number = 50): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/${id}/audit?limit=${limit}`);
    const data = await this.handleResponse<any[]>(response);
    return data.data || [];
  }

  /**
   * Get all audit logs
   */
  async getAllAuditLogs(limit: number = 100): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}?action=audit&limit=${limit}`);
    const data = await this.handleResponse<any[]>(response);
    return data.data || [];
  }

  /**
   * Perform emergency rollback
   */
  async emergencyRollback(id: string, reason: string, userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'emergency-rollback',
        reason,
        userId
      })
    });
    await this.handleResponse(response);
  }

  /**
   * Start gradual rollout
   */
  async startGradualRollout(id: string, steps: number[], intervalMs?: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'gradual-rollout',
        steps,
        intervalMs
      })
    });
    await this.handleResponse(response);
  }

  /**
   * Evaluate a feature flag
   */
  async evaluateFlag(id: string, context: any): Promise<{ enabled: boolean }> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'evaluate',
        context
      })
    });
    const data = await this.handleResponse<{ enabled: boolean }>(response);
    return data.data || { enabled: false };
  }

  /**
   * Initialize feature flags
   */
  async initializeFlags(): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'initialize' })
    });
    await this.handleResponse(response);
  }

  /**
   * Bulk update feature flags
   */
  async bulkUpdateFlags(updates: Array<{ id: string } & UpdateFlagData>, userId: string): Promise<{
    results: Array<{ id: string; success: boolean }>;
    successCount: number;
    errorCount: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'bulk-update',
        updates,
        userId
      })
    });
    const data = await this.handleResponse<any>(response);
    return data.data || {
      results: [],
      successCount: 0,
      errorCount: 0,
      errors: []
    };
  }

  /**
   * Toggle flag enabled state
   */
  async toggleFlag(id: string, enabled: boolean, userId: string): Promise<void> {
    return this.updateFlag(id, { enabled }, userId, `Flag ${enabled ? 'enabled' : 'disabled'} via dashboard`);
  }

  /**
   * Update rollout percentage
   */
  async updateRolloutPercentage(id: string, percentage: number, userId: string): Promise<void> {
    return this.updateFlag(id, { rolloutPercentage: percentage }, userId, `Rollout updated to ${percentage}%`);
  }
}

// Export singleton instance
export const featureFlagClient = new FeatureFlagClient();

// Export utility functions
export const getAllFeatureFlags = () => featureFlagClient.getAllFlags();
export const getFeatureFlag = (id: string) => featureFlagClient.getFlag(id);
export const createFeatureFlag = (flagData: CreateFlagData, userId: string) => 
  featureFlagClient.createFlag(flagData, userId);
export const updateFeatureFlag = (id: string, updates: UpdateFlagData, userId: string, reason?: string) => 
  featureFlagClient.updateFlag(id, updates, userId, reason);
export const deleteFeatureFlag = (id: string, userId: string, reason?: string) => 
  featureFlagClient.deleteFlag(id, userId, reason);
export const getFeatureFlagStats = (id: string, timeRange: { start: Date; end: Date }) => 
  featureFlagClient.getFlagStats(id, timeRange);
export const getFeatureFlagHealth = (id: string, hours?: number) => 
  featureFlagClient.getFlagHealth(id, hours);
export const getFeatureFlagAuditLog = (id: string, limit?: number) => 
  featureFlagClient.getFlagAuditLog(id, limit);
export const getAllFeatureFlagAuditLogs = (limit?: number) => 
  featureFlagClient.getAllAuditLogs(limit);
export const emergencyRollbackFeatureFlag = (id: string, reason: string, userId: string) => 
  featureFlagClient.emergencyRollback(id, reason, userId);
export const startGradualRolloutFeatureFlag = (id: string, steps: number[], intervalMs?: number) => 
  featureFlagClient.startGradualRollout(id, steps, intervalMs);
export const evaluateFeatureFlag = (id: string, context: any) => 
  featureFlagClient.evaluateFlag(id, context);
export const initializeFeatureFlags = () => featureFlagClient.initializeFlags();
export const bulkUpdateFeatureFlags = (updates: Array<{ id: string } & UpdateFlagData>, userId: string) => 
  featureFlagClient.bulkUpdateFlags(updates, userId);
export const toggleFeatureFlag = (id: string, enabled: boolean, userId: string) => 
  featureFlagClient.toggleFlag(id, enabled, userId);
export const updateFeatureFlagRolloutPercentage = (id: string, percentage: number, userId: string) => 
  featureFlagClient.updateRolloutPercentage(id, percentage, userId);