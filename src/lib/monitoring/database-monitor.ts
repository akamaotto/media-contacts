/**
 * Comprehensive Database Monitoring System
 * Monitors database performance, connections, queries, and health
 */

import { getDatabaseStatus } from '@/lib/database/database-monitor';

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
    maxAllowed: number;
    utilizationPercentage: number;
  };
  performance: {
    averageQueryTime: number;
    slowQueries: number;
    queriesPerSecond: number;
    deadlockCount: number;
    cacheHitRatio: number;
  };
  resources: {
    databaseSize: string;
    tableSizes: Record<string, string>;
    indexUsage: Record<string, number>;
    bloatEstimate: string;
  };
  health: {
    status: 'healthy' | 'degraded' | 'critical' | 'offline';
    uptime: number;
    lastCheckpoint: Date;
    replicationLag?: number;
  };
  locks: {
    waitingLocks: number;
    blockedQueries: number;
    lockTypes: Record<string, number>;
  };
  transactions: {
    activeTransactions: number;
    longRunningTransactions: number;
    rollbackRate: number;
    deadlockRate: number;
  };
}

export interface QueryAnalysis {
  query: string;
  executionCount: number;
  totalExecutionTime: number;
  averageExecutionTime: number;
  calls: number;
  rows: number;
  sharedHits: number;
  sharedMisses: number;
  localHits: number;
  localMisses: number;
  tempReads: number;
  tempWrites: number;
}

export interface DatabaseAlert {
  id: string;
  type: 'connection_pool' | 'slow_query' | 'deadlock' | 'disk_space' | 'performance' | 'replication';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  recommendations: string[];
}

export interface DatabaseThresholds {
  connections: {
    maxUtilization: number; // percentage
    warningUtilization: number; // percentage
  };
  performance: {
    maxAverageQueryTime: number; // milliseconds
    maxSlowQueries: number; // count
    minCacheHitRatio: number; // percentage
  };
  resources: {
    maxDatabaseSize: number; // GB
    maxTableSize: number; // GB
    maxBloatPercentage: number; // percentage
  };
  locks: {
    maxWaitingLocks: number;
    maxBlockedQueries: number;
  };
  transactions: {
    maxLongRunningTransactions: number;
    maxRollbackRate: number; // percentage
  };
}

/**
 * Database Monitor Class
 */
export class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  private metrics: DatabaseMetrics;
  private thresholds: DatabaseThresholds;
  private alerts: DatabaseAlert[] = [];
  private queryHistory: QueryAnalysis[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastMetricsUpdate: Date | null = null;

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.thresholds = this.initializeThresholds();
    this.startMonitoring();
  }

  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }

  private initializeMetrics(): DatabaseMetrics {
    return {
      connections: {
        active: 0,
        idle: 0,
        total: 0,
        maxAllowed: 100,
        utilizationPercentage: 0
      },
      performance: {
        averageQueryTime: 0,
        slowQueries: 0,
        queriesPerSecond: 0,
        deadlockCount: 0,
        cacheHitRatio: 0
      },
      resources: {
        databaseSize: '0 MB',
        tableSizes: {},
        indexUsage: {},
        bloatEstimate: '0 MB'
      },
      health: {
        status: 'healthy',
        uptime: 0,
        lastCheckpoint: new Date()
      },
      locks: {
        waitingLocks: 0,
        blockedQueries: 0,
        lockTypes: {}
      },
      transactions: {
        activeTransactions: 0,
        longRunningTransactions: 0,
        rollbackRate: 0,
        deadlockRate: 0
      }
    };
  }

  private initializeThresholds(): DatabaseThresholds {
    return {
      connections: {
        maxUtilization: 90,
        warningUtilization: 75
      },
      performance: {
        maxAverageQueryTime: 1000, // 1 second
        maxSlowQueries: 10,
        minCacheHitRatio: 95
      },
      resources: {
        maxDatabaseSize: 100, // 100 GB
        maxTableSize: 10, // 10 GB
        maxBloatPercentage: 20
      },
      locks: {
        maxWaitingLocks: 5,
        maxBlockedQueries: 10
      },
      transactions: {
        maxLongRunningTransactions: 3,
        maxRollbackRate: 5 // 5%
      }
    };
  }

  /**
   * Start database monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateMetrics();
        this.checkAlerts();
      } catch (error) {
        console.error('Database monitoring error:', error);
      }
    }, 30000); // Every 30 seconds

    console.log('✅ [DATABASE-MONITOR] Database monitoring started');
  }

  /**
   * Update all database metrics
   */
  private async updateMetrics(): Promise<void> {
    try {
      await Promise.all([
        this.updateConnectionMetrics(),
        this.updatePerformanceMetrics(),
        this.updateResourceMetrics(),
        this.updateHealthMetrics(),
        this.updateLockMetrics(),
        this.updateTransactionMetrics()
      ]);

      this.lastMetricsUpdate = new Date();
    } catch (error) {
      console.error('Error updating database metrics:', error);
      this.metrics.health.status = 'offline';
    }
  }

  /**
   * Update connection metrics
   */
  private async updateConnectionMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined' && process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        // Get connection counts
        const connectionQuery = `
          SELECT 
            state,
            COUNT(*) as count
          FROM pg_stat_activity 
          WHERE datname = current_database()
          GROUP BY state
        `;
        
        const connectionResult = await pool.query(connectionQuery);
        const connectionStats = connectionResult.rows.reduce((acc: any, row: any) => {
          acc[row.state] = parseInt(row.count);
          return acc;
        }, {});
        
        this.metrics.connections.active = connectionStats.active || 0;
        this.metrics.connections.idle = connectionStats.idle || 0;
        this.metrics.connections.total = this.metrics.connections.active + this.metrics.connections.idle;
        
        // Get max connections
        const maxConnQuery = `SELECT setting::int FROM pg_settings WHERE name = 'max_connections'`;
        const maxConnResult = await pool.query(maxConnQuery);
        this.metrics.connections.maxAllowed = parseInt(maxConnResult.rows[0].setting);
        
        // Calculate utilization
        this.metrics.connections.utilizationPercentage = 
          (this.metrics.connections.total / this.metrics.connections.maxAllowed) * 100;
        
        await pool.end();
      }
    } catch (error) {
      console.error('Error updating connection metrics:', error);
    }
  }

  /**
   * Update performance metrics
   */
  private async updatePerformanceMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined' && process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        // Get slow queries (requires pg_stat_statements extension)
        try {
          const slowQueryResult = await pool.query(`
            SELECT 
              COUNT(*) as slow_queries,
              AVG(mean_exec_time) as avg_time
            FROM pg_stat_statements 
            WHERE mean_exec_time > 1000
          `);
          
          this.metrics.performance.slowQueries = parseInt(slowQueryResult.rows[0]?.slow_queries || '0');
          this.metrics.performance.averageQueryTime = parseFloat(slowQueryResult.rows[0]?.avg_time || '0');
        } catch (error) {
          // pg_stat_statements might not be enabled
          console.warn('pg_stat_statements not available for detailed query monitoring');
        }
        
        // Get cache hit ratio
        const cacheQuery = `
          SELECT 
            SUM(blks_hit) / (SUM(blks_hit) + SUM(blks_read)) * 100 as cache_hit_ratio
          FROM pg_stat_database 
          WHERE datname = current_database()
        `;
        
        const cacheResult = await pool.query(cacheQuery);
        this.metrics.performance.cacheHitRatio = 
          parseFloat(cacheResult.rows[0]?.cache_hit_ratio || '0');
        
        // Get queries per second (simplified)
        const qpsQuery = `
          SELECT 
            SUM(xact_commit + xact_rollback) as total_transactions
          FROM pg_stat_database 
          WHERE datname = current_database()
        `;
        
        const qpsResult = await pool.query(qpsQuery);
        const totalTransactions = parseInt(qpsResult.rows[0]?.total_transactions || '0');
        this.metrics.performance.queriesPerSecond = totalTransactions / 3600; // Rough estimate
        
        await pool.end();
      }
    } catch (error) {
      console.error('Error updating performance metrics:', error);
    }
  }

  /**
   * Update resource metrics
   */
  private async updateResourceMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined' && process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        // Get database size
        const sizeQuery = `
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `;
        
        const sizeResult = await pool.query(sizeQuery);
        this.metrics.resources.databaseSize = sizeResult.rows[0]?.size || '0 MB';
        
        // Get table sizes
        const tableSizeQuery = `
          SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
          FROM pg_tables 
          WHERE schemaname = 'public'
          ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
          LIMIT 10
        `;
        
        const tableSizeResult = await pool.query(tableSizeQuery);
        this.metrics.resources.tableSizes = tableSizeResult.rows.reduce((acc: any, row: any) => {
          acc[`${row.schemaname}.${row.tablename}`] = row.size;
          return acc;
        }, {});
        
        // Get index usage
        const indexUsageQuery = `
          SELECT 
            schemaname,
            tablename,
            indexname,
            idx_scan,
            idx_tup_read,
            idx_tup_fetch
          FROM pg_stat_user_indexes 
          WHERE schemaname = 'public'
          ORDER BY idx_scan DESC
          LIMIT 10
        `;
        
        const indexUsageResult = await pool.query(indexUsageQuery);
        this.metrics.resources.indexUsage = indexUsageResult.rows.reduce((acc: any, row: any) => {
          acc[`${row.schemaname}.${row.tablename}.${row.indexname}`] = parseInt(row.idx_scan);
          return acc;
        }, {});
        
        await pool.end();
      }
    } catch (error) {
      console.error('Error updating resource metrics:', error);
    }
  }

  /**
   * Update health metrics
   */
  private async updateHealthMetrics(): Promise<void> {
    try {
      const dbStatus = await getDatabaseStatus();
      
      this.metrics.health.status = dbStatus.overall as 'healthy' | 'degraded' | 'critical' | 'offline';
      this.metrics.health.uptime = Date.now() - (new Date().getTime() - 86400000); // Simplified
      this.metrics.health.lastCheckpoint = new Date();
      
      // Check replication lag if applicable
      try {
        if (typeof window === 'undefined' && process.env.DATABASE_URL) {
          const { Pool } = require('pg');
          const pool = new Pool({ connectionString: process.env.DATABASE_URL });
          
          const replicationQuery = `
            SELECT 
              pg_last_xact_replay_timestamp() IS NOT NULL as is_replica,
              EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag_seconds
          `;
          
          const replicationResult = await pool.query(replicationQuery);
          if (replicationResult.rows[0]?.is_replica) {
            this.metrics.health.replicationLag = 
              parseFloat(replicationResult.rows[0]?.lag_seconds || '0');
          }
          
          await pool.end();
        }
      } catch (error) {
        // Replication monitoring might not be available
      }
    } catch (error) {
      console.error('Error updating health metrics:', error);
      this.metrics.health.status = 'offline';
    }
  }

  /**
   * Update lock metrics
   */
  private async updateLockMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined' && process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        // Get waiting locks
        const lockQuery = `
          SELECT 
            COUNT(*) FILTER (WHERE wait_event IS NOT NULL) as waiting_locks,
            COUNT(*) FILTER (WHERE wait_event_type = 'Lock') as blocked_queries,
            wait_event_type,
            COUNT(*) as count
          FROM pg_stat_activity 
          WHERE datname = current_database()
          GROUP BY wait_event_type
        `;
        
        const lockResult = await pool.query(lockQuery);
        
        this.metrics.locks.waitingLocks = 0;
        this.metrics.locks.blockedQueries = 0;
        this.metrics.locks.lockTypes = {};
        
        lockResult.rows.forEach((row: any) => {
          if (row.wait_event_type === 'Lock') {
            this.metrics.locks.blockedQueries = parseInt(row.count);
          } else if (row.wait_event_type) {
            this.metrics.locks.lockTypes[row.wait_event_type] = parseInt(row.count);
          }
        });
        
        this.metrics.locks.waitingLocks = parseInt(lockResult.rows[0]?.waiting_locks || '0');
        
        await pool.end();
      }
    } catch (error) {
      console.error('Error updating lock metrics:', error);
    }
  }

  /**
   * Update transaction metrics
   */
  private async updateTransactionMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined' && process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        // Get transaction stats
        const transactionQuery = `
          SELECT 
            COUNT(*) FILTER (WHERE state = 'active') as active_transactions,
            COUNT(*) FILTER (WHERE state = 'active' AND query_start < now() - interval '5 minutes') as long_running_transactions
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `;
        
        const transactionResult = await pool.query(transactionQuery);
        this.metrics.transactions.activeTransactions = 
          parseInt(transactionResult.rows[0]?.active_transactions || '0');
        this.metrics.transactions.longRunningTransactions = 
          parseInt(transactionResult.rows[0]?.long_running_transactions || '0');
        
        // Get rollback rate
        const rollbackQuery = `
          SELECT 
            SUM(xact_rollback) / (SUM(xact_commit) + SUM(xact_rollback)) * 100 as rollback_rate
          FROM pg_stat_database 
          WHERE datname = current_database()
        `;
        
        const rollbackResult = await pool.query(rollbackQuery);
        this.metrics.transactions.rollbackRate = 
          parseFloat(rollbackResult.rows[0]?.rollback_rate || '0');
        
        await pool.end();
      }
    } catch (error) {
      console.error('Error updating transaction metrics:', error);
    }
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    const alerts: DatabaseAlert[] = [];

    // Connection alerts
    if (this.metrics.connections.utilizationPercentage > this.thresholds.connections.maxUtilization) {
      alerts.push(this.createAlert(
        'connection_pool',
        'critical',
        'Database Connection Pool Exhausted',
        `Connection pool utilization is ${this.metrics.connections.utilizationPercentage.toFixed(1)}%`,
        'connection_utilization',
        this.metrics.connections.utilizationPercentage,
        this.thresholds.connections.maxUtilization,
        [
          'Increase max_connections in PostgreSQL configuration',
          'Implement connection pooling in application',
          'Check for connection leaks in application code'
        ]
      ));
    } else if (this.metrics.connections.utilizationPercentage > this.thresholds.connections.warningUtilization) {
      alerts.push(this.createAlert(
        'connection_pool',
        'warning',
        'High Database Connection Usage',
        `Connection pool utilization is ${this.metrics.connections.utilizationPercentage.toFixed(1)}%`,
        'connection_utilization',
        this.metrics.connections.utilizationPercentage,
        this.thresholds.connections.warningUtilization,
        [
          'Monitor connection usage trends',
          'Consider optimizing connection handling',
          'Review application connection patterns'
        ]
      ));
    }

    // Performance alerts
    if (this.metrics.performance.averageQueryTime > this.thresholds.performance.maxAverageQueryTime) {
      alerts.push(this.createAlert(
        'performance',
        'warning',
        'Slow Database Queries Detected',
        `Average query time is ${this.metrics.performance.averageQueryTime.toFixed(0)}ms`,
        'average_query_time',
        this.metrics.performance.averageQueryTime,
        this.thresholds.performance.maxAverageQueryTime,
        [
          'Analyze slow query log',
          'Review and optimize expensive queries',
          'Consider adding appropriate indexes'
        ]
      ));
    }

    if (this.metrics.performance.slowQueries > this.thresholds.performance.maxSlowQueries) {
      alerts.push(this.createAlert(
        'slow_query',
        'critical',
        'High Number of Slow Queries',
        `Found ${this.metrics.performance.slowQueries} slow queries`,
        'slow_query_count',
        this.metrics.performance.slowQueries,
        this.thresholds.performance.maxSlowQueries,
        [
          'Enable and review pg_stat_statements',
          'Identify and optimize slow queries',
          'Consider query rewriting or indexing'
        ]
      ));
    }

    if (this.metrics.performance.cacheHitRatio < this.thresholds.performance.minCacheHitRatio) {
      alerts.push(this.createAlert(
        'performance',
        'warning',
        'Low Cache Hit Ratio',
        `Cache hit ratio is ${this.metrics.performance.cacheHitRatio.toFixed(1)}%`,
        'cache_hit_ratio',
        this.metrics.performance.cacheHitRatio,
        this.thresholds.performance.minCacheHitRatio,
        [
          'Increase shared_buffers in PostgreSQL configuration',
          'Review query patterns for cache efficiency',
          'Consider database workload optimization'
        ]
      ));
    }

    // Lock alerts
    if (this.metrics.locks.blockedQueries > this.thresholds.locks.maxBlockedQueries) {
      alerts.push(this.createAlert(
        'deadlock',
        'critical',
        'High Number of Blocked Queries',
        `Found ${this.metrics.locks.blockedQueries} blocked queries`,
        'blocked_queries',
        this.metrics.locks.blockedQueries,
        this.thresholds.locks.maxBlockedQueries,
        [
          'Identify blocking queries and transactions',
          'Review transaction isolation levels',
          'Consider shorter transaction durations'
        ]
      ));
    }

    // Transaction alerts
    if (this.metrics.transactions.longRunningTransactions > this.thresholds.transactions.maxLongRunningTransactions) {
      alerts.push(this.createAlert(
        'performance',
        'warning',
        'Long Running Transactions Detected',
        `Found ${this.metrics.transactions.longRunningTransactions} long-running transactions`,
        'long_running_transactions',
        this.metrics.transactions.longRunningTransactions,
        this.thresholds.transactions.maxLongRunningTransactions,
        [
          'Identify and review long-running transactions',
          'Consider breaking large transactions into smaller ones',
          'Review application transaction management'
        ]
      ));
    }

    // Add new alerts to the list
    alerts.forEach(alert => {
      // Check if similar alert already exists
      const existingAlert = this.alerts.find(a => 
        a.type === alert.type && 
        a.metric === alert.metric &&
        (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000 // 5 minutes
      );

      if (!existingAlert) {
        this.alerts.push(alert);
        console.log(`🚨 [DATABASE-MONITOR] Alert: ${alert.title}`);
      }
    });

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Create a database alert
   */
  private createAlert(
    type: DatabaseAlert['type'],
    severity: DatabaseAlert['severity'],
    title: string,
    message: string,
    metric: string,
    value: number,
    threshold: number,
    recommendations: string[]
  ): DatabaseAlert {
    return {
      id: `db_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      message,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      recommendations
    };
  }

  /**
   * Get current metrics
   */
  getMetrics(): DatabaseMetrics {
    return { ...this.metrics };
  }

  /**
   * Get current alerts
   */
  getAlerts(): DatabaseAlert[] {
    return [...this.alerts];
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: DatabaseAlert['severity']): DatabaseAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Get query analysis
   */
  async getQueryAnalysis(limit: number = 20): Promise<QueryAnalysis[]> {
    try {
      if (typeof window === 'undefined' && process.env.DATABASE_URL) {
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        
        const query = `
          SELECT 
            query,
            calls,
            total_exec_time,
            mean_exec_time,
            rows,
            shared_blks_hit,
            shared_blks_read,
            local_blks_hit,
            local_blks_read,
            temp_blks_read,
            temp_blks_written
          FROM pg_stat_statements 
          ORDER BY mean_exec_time DESC 
          LIMIT $1
        `;
        
        const result = await pool.query(query, [limit]);
        
        const analysis: QueryAnalysis[] = result.rows.map((row: any) => ({
          query: row.query,
          executionCount: parseInt(row.calls),
          totalExecutionTime: parseFloat(row.total_exec_time),
          averageExecutionTime: parseFloat(row.mean_exec_time),
          calls: parseInt(row.calls),
          rows: parseInt(row.rows),
          sharedHits: parseInt(row.shared_blks_hit),
          sharedMisses: parseInt(row.shared_blks_read),
          localHits: parseInt(row.local_blks_hit),
          localMisses: parseInt(row.local_blks_read),
          tempReads: parseInt(row.temp_blks_read),
          tempWrites: parseInt(row.temp_blks_written)
        }));
        
        await pool.end();
        return analysis;
      }
    } catch (error) {
      console.error('Error getting query analysis:', error);
    }
    
    return [];
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds: Partial<DatabaseThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 [DATABASE-MONITOR] Thresholds updated');
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    metrics: DatabaseMetrics;
    alerts: DatabaseAlert[];
    summary: {
      overall: 'healthy' | 'degraded' | 'critical';
      issues: string[];
      recommendations: string[];
    };
  } {
    const criticalAlerts = this.getAlertsBySeverity('critical');
    const warningAlerts = this.getAlertsBySeverity('warning');
    
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      overall = 'critical';
    } else if (warningAlerts.length > 0) {
      overall = 'degraded';
    }

    const issues = this.alerts.map(alert => alert.title);
    const recommendations = this.alerts.flatMap(alert => alert.recommendations);

    return {
      metrics: this.metrics,
      alerts: this.alerts,
      summary: {
        overall,
        issues,
        recommendations
      }
    };
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 [DATABASE-MONITOR] Database monitoring stopped');
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.alerts = [];
    this.queryHistory = [];
    console.log('🔄 [DATABASE-MONITOR] All metrics reset');
  }
}

// Export singleton instance
export const databaseMonitor = DatabaseMonitor.getInstance();

// Export utility functions
export function getDatabaseMetrics(): DatabaseMetrics {
  return databaseMonitor.getMetrics();
}

export function getDatabaseAlerts(): DatabaseAlert[] {
  return databaseMonitor.getAlerts();
}

export async function getDatabaseQueryAnalysis(limit?: number): Promise<QueryAnalysis[]> {
  return databaseMonitor.getQueryAnalysis(limit);
}

export function getDatabasePerformanceReport() {
  return databaseMonitor.getPerformanceReport();
}