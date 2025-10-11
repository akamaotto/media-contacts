/**
 * Feature Flag Audit Log Service
 * Provides comprehensive audit logging for all feature flag changes
 */

import { featureFlagDb } from './feature-flag-db';
import { type FeatureFlag } from './feature-flag-service';

export interface AuditLogEntry {
  id: string;
  flagId: string;
  flagKey: string;
  action: AuditAction;
  oldValue: any;
  newValue: any;
  performedBy: string;
  reason?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export type AuditAction = 
  | 'CREATED'
  | 'UPDATED'
  | 'ENABLED'
  | 'DISABLED'
  | 'DELETED'
  | 'ROLLOUT_UPDATED'
  | 'EMERGENCY_ROLLBACK'
  | 'GRADUAL_ROLLOUT_STARTED'
  | 'GRADUAL_ROLLOUT_COMPLETED'
  | 'GRADUAL_ROLLOUT_PAUSED'
  | 'SEGMENT_UPDATED'
  | 'CONDITION_UPDATED'
  | 'METADATA_UPDATED';

export interface AuditLogFilter {
  flagId?: string;
  flagKey?: string;
  action?: AuditAction | AuditAction[];
  performedBy?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditLogSummary {
  totalEntries: number;
  entriesByAction: Record<AuditAction, number>;
  entriesByUser: Record<string, number>;
  entriesByFlag: Record<string, number>;
  timeRange: { start: Date; end: Date };
}

export class FeatureFlagAuditLogService {
  private db = featureFlagDb;

  /**
   * Log a flag change to the audit log
   */
  async logFlagChange(data: {
    flagId: string;
    flagKey: string;
    action: AuditAction;
    oldValue: any;
    newValue: any;
    performedBy: string;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await this.db.logFlagChange(data);
    } catch (error) {
      console.error('Failed to log flag change:', error);
      // Don't let logging errors break the main flow
    }
  }

  /**
   * Get audit log entries with optional filtering
   */
  async getAuditLog(filter: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
    try {
      // If flagId is provided, get specific flag audit log
      if (filter.flagId) {
        return await this.db.getFlagAuditLog(filter.flagId, filter.limit || 50);
      }

      // Otherwise, get all audit logs with filtering
      const logs = await this.db.getAllAuditLogs(filter.limit || 100);
      
      // Apply additional filtering if needed
      return this.applyFilters(logs, filter);
    } catch (error) {
      console.error('Failed to get audit log:', error);
      return [];
    }
  }

  /**
   * Get audit log summary statistics
   */
  async getAuditLogSummary(filter: Omit<AuditLogFilter, 'limit' | 'offset'> = {}): Promise<AuditLogSummary> {
    try {
      const logs = await this.getAuditLog({ ...filter, limit: 10000 }); // Get a large sample for summary
      
      const summary: AuditLogSummary = {
        totalEntries: logs.length,
        entriesByAction: {} as Record<AuditAction, number>,
        entriesByUser: {} as Record<string, number>,
        entriesByFlag: {} as Record<string, number>,
        timeRange: {
          start: filter.startDate || new Date(0),
          end: filter.endDate || new Date()
        }
      };

      // Calculate statistics
      logs.forEach(log => {
        // Count by action
        summary.entriesByAction[log.action] = (summary.entriesByAction[log.action] || 0) + 1;
        
        // Count by user
        summary.entriesByUser[log.performedBy] = (summary.entriesByUser[log.performedBy] || 0) + 1;
        
        // Count by flag
        summary.entriesByFlag[log.flagKey] = (summary.entriesByFlag[log.flagKey] || 0) + 1;
      });

      return summary;
    } catch (error) {
      console.error('Failed to get audit log summary:', error);
      return {
        totalEntries: 0,
        entriesByAction: {} as Record<AuditAction, number>,
        entriesByUser: {} as Record<string, number>,
        entriesByFlag: {} as Record<string, number>,
        timeRange: {
          start: filter.startDate || new Date(0),
          end: filter.endDate || new Date()
        }
      };
    }
  }

  /**
   * Get recent audit log entries
   */
  async getRecentAuditLogs(limit: number = 10): Promise<AuditLogEntry[]> {
    return this.getAuditLog({ limit });
  }

  /**
   * Get audit log for a specific flag
   */
  async getFlagAuditLog(flagId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    return this.getAuditLog({ flagId, limit });
  }

  /**
   * Get audit log for a specific user
   */
  async getUserAuditLog(userId: string, limit: number = 50): Promise<AuditLogEntry[]> {
    return this.getAuditLog({ performedBy: userId, limit });
  }

  /**
   * Get audit log for a specific action
   */
  async getActionAuditLog(action: AuditAction, limit: number = 50): Promise<AuditLogEntry[]> {
    return this.getAuditLog({ action, limit });
  }

  /**
   * Get audit log for a date range
   */
  async getDateRangeAuditLog(startDate: Date, endDate: Date, limit: number = 100): Promise<AuditLogEntry[]> {
    return this.getAuditLog({ startDate, endDate, limit });
  }

  /**
   * Export audit log to CSV
   */
  async exportAuditLogToCSV(filter: AuditLogFilter = {}): Promise<string> {
    try {
      const logs = await this.getAuditLog({ ...filter, limit: 10000 });
      
      // Create CSV header
      const headers = [
        'ID',
        'Flag ID',
        'Flag Key',
        'Action',
        'Performed By',
        'Reason',
        'Timestamp',
        'IP Address',
        'User Agent',
        'Old Value',
        'New Value'
      ];
      
      // Create CSV rows
      const rows = logs.map(log => [
        log.id,
        log.flagId,
        log.flagKey,
        log.action,
        log.performedBy,
        log.reason || '',
        log.timestamp.toISOString(),
        log.ipAddress || '',
        log.userAgent || '',
        JSON.stringify(log.oldValue),
        JSON.stringify(log.newValue)
      ]);
      
      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      return csvContent;
    } catch (error) {
      console.error('Failed to export audit log to CSV:', error);
      throw new Error('Failed to export audit log');
    }
  }

  /**
   * Apply filters to audit log entries
   */
  private applyFilters(logs: AuditLogEntry[], filter: AuditLogFilter): AuditLogEntry[] {
    let filteredLogs = [...logs];

    // Filter by flag key
    if (filter.flagKey) {
      filteredLogs = filteredLogs.filter(log => log.flagKey === filter.flagKey);
    }

    // Filter by action(s)
    if (filter.action) {
      const actions = Array.isArray(filter.action) ? filter.action : [filter.action];
      filteredLogs = filteredLogs.filter(log => actions.includes(log.action));
    }

    // Filter by performed by
    if (filter.performedBy) {
      filteredLogs = filteredLogs.filter(log => log.performedBy === filter.performedBy);
    }

    // Filter by date range
    if (filter.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startDate!);
    }

    if (filter.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endDate!);
    }

    // Apply pagination
    if (filter.offset) {
      filteredLogs = filteredLogs.slice(filter.offset);
    }

    if (filter.limit) {
      filteredLogs = filteredLogs.slice(0, filter.limit);
    }

    return filteredLogs;
  }

  /**
   * Create a human-readable description of the audit log entry
   */
  createAuditLogDescription(entry: AuditLogEntry): string {
    const { action, flagKey, performedBy, reason } = entry;
    
    let description = `${performedBy} ${action.toLowerCase()} the flag "${flagKey}"`;
    
    if (reason) {
      description += ` - ${reason}`;
    }
    
    // Add specific details based on action
    switch (action) {
      case 'ROLLOUT_UPDATED':
        const oldRollout = entry.oldValue?.rolloutPercentage || 0;
        const newRollout = entry.newValue?.rolloutPercentage || 0;
        description += ` (changed rollout from ${oldRollout}% to ${newRollout}%)`;
        break;
      case 'ENABLED':
        description += ' (flag was enabled)';
        break;
      case 'DISABLED':
        description += ' (flag was disabled)';
        break;
      case 'EMERGENCY_ROLLBACK':
        description += ' (emergency rollback was performed)';
        break;
    }
    
    return description;
  }

  /**
   * Get audit log analytics
   */
  async getAuditLogAnalytics(filter: Omit<AuditLogFilter, 'limit' | 'offset'> = {}): Promise<{
    totalChanges: number;
    changesOverTime: Array<{ date: string; count: number }>;
    mostActiveUsers: Array<{ user: string; count: number }>;
    mostChangedFlags: Array<{ flag: string; count: number }>;
    commonActions: Array<{ action: AuditAction; count: number }>;
  }> {
    try {
      const logs = await this.getAuditLog({ ...filter, limit: 10000 });
      
      // Group changes by date
      const changesByDate = new Map<string, number>();
      logs.forEach(log => {
        const date = log.timestamp.toISOString().split('T')[0];
        changesByDate.set(date, (changesByDate.get(date) || 0) + 1);
      });
      
      const changesOverTime = Array.from(changesByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // Count by user
      const userCounts = new Map<string, number>();
      logs.forEach(log => {
        userCounts.set(log.performedBy, (userCounts.get(log.performedBy) || 0) + 1);
      });
      
      const mostActiveUsers = Array.from(userCounts.entries())
        .map(([user, count]) => ({ user, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Count by flag
      const flagCounts = new Map<string, number>();
      logs.forEach(log => {
        flagCounts.set(log.flagKey, (flagCounts.get(log.flagKey) || 0) + 1);
      });
      
      const mostChangedFlags = Array.from(flagCounts.entries())
        .map(([flag, count]) => ({ flag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Count by action
      const actionCounts = new Map<AuditAction, number>();
      logs.forEach(log => {
        actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
      });
      
      const commonActions = Array.from(actionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count);
      
      return {
        totalChanges: logs.length,
        changesOverTime,
        mostActiveUsers,
        mostChangedFlags,
        commonActions
      };
    } catch (error) {
      console.error('Failed to get audit log analytics:', error);
      return {
        totalChanges: 0,
        changesOverTime: [],
        mostActiveUsers: [],
        mostChangedFlags: [],
        commonActions: []
      };
    }
  }
}

// Export singleton instance
export const featureFlagAuditLog = new FeatureFlagAuditLogService();