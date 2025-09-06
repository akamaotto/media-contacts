/**
 * Database Connection Monitor
 * Enhanced monitoring utilities for database connections, queries, and health checks
 */

import { prisma } from '@/lib/database/prisma';
import { performHealthCheck, getConnectionMetrics, type ConnectionMetrics, type HealthCheckResult } from '@/lib/database/prisma-monitoring';

export interface DatabaseMonitorConfig {
  connectionTimeoutMs: number;
  queryTimeoutMs: number;
  slowQueryThresholdMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  connectionTime: number;
  error?: string;
  timestamp: Date;
  retryCount: number;
}

export interface QueryValidationResult {
  isValid: boolean;
  validationTime: number;
  queriesExecuted: number;
  errors: string[];
  timestamp: Date;
}

export interface RecoveryResult {
  success: boolean;
  action: string;
  duration: number;
  error?: string;
  timestamp: Date;
}

export interface DatabaseStatus {
  overall: 'healthy' | 'degraded' | 'critical' | 'offline';
  connection: ConnectionStatus;
  queries: QueryValidationResult;
  metrics: ConnectionMetrics;
  health: HealthCheckResult;
  lastCheck: Date;
}

/**
 * DatabaseMonitor class for comprehensive database monitoring
 */
export class DatabaseMonitor {
  private config: DatabaseMonitorConfig;
  private lastStatus?: DatabaseStatus;

  constructor(config: Partial<DatabaseMonitorConfig> = {}) {
    this.config = {
      connectionTimeoutMs: 5000,
      queryTimeoutMs: 10000,
      slowQueryThresholdMs: 1000,
      maxRetries: 3,
      retryDelayMs: 1000,
      ...config
    };
  }

  /**
   * Check database connection status
   */
  async checkConnection(): Promise<ConnectionStatus> {
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: string | undefined;

    while (retryCount <= this.config.maxRetries) {
      try {
        console.log(`🔍 [DB-MONITOR] Checking database connection (attempt ${retryCount + 1}/${this.config.maxRetries + 1})...`);
        
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), this.config.connectionTimeoutMs);
        });

        // Test basic connection
        await Promise.race([
          prisma.$queryRaw`SELECT 1 as connection_test`,
          timeoutPromise
        ]);

        const connectionTime = Date.now() - startTime;
        console.log(`✅ [DB-MONITOR] Database connection successful in ${connectionTime}ms`);

        return {
          isConnected: true,
          connectionTime,
          timestamp: new Date(),
          retryCount
        };

      } catch (error) {
        retryCount++;
        lastError = error instanceof Error ? error.message : 'Unknown connection error';
        
        console.warn(`⚠️ [DB-MONITOR] Connection attempt ${retryCount} failed: ${lastError}`);

        if (retryCount <= this.config.maxRetries) {
          console.log(`🔄 [DB-MONITOR] Retrying connection in ${this.config.retryDelayMs}ms...`);
          await this.delay(this.config.retryDelayMs);
        }
      }
    }

    const connectionTime = Date.now() - startTime;
    console.error(`❌ [DB-MONITOR] Database connection failed after ${retryCount} attempts in ${connectionTime}ms`);

    return {
      isConnected: false,
      connectionTime,
      error: lastError,
      timestamp: new Date(),
      retryCount: retryCount - 1
    };
  }

  /**
   * Validate database queries and schema
   */
  async validateQueries(): Promise<QueryValidationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let queriesExecuted = 0;

    console.log(`🧪 [DB-MONITOR] Starting query validation...`);

    // Test queries for each main table
    const testQueries = [
      { name: 'users', query: () => prisma.users.count() },
      { name: 'countries', query: () => prisma.countries.count() },
      { name: 'beats', query: () => prisma.beats.count() },
      { name: 'regions', query: () => prisma.regions.count() },
      { name: 'languages', query: () => prisma.languages.count() },
      { name: 'outlets', query: () => prisma.outlets.count() },
      { name: 'media_contacts', query: () => prisma.media_contacts.count() }
    ];

    for (const { name, query } of testQueries) {
      try {
        console.log(`🔍 [DB-MONITOR] Testing ${name} table...`);
        
        const queryStartTime = Date.now();
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Query timeout for ${name}`)), this.config.queryTimeoutMs);
        });

        const result = await Promise.race([query(), timeoutPromise]);
        const queryTime = Date.now() - queryStartTime;
        
        queriesExecuted++;
        console.log(`✅ [DB-MONITOR] ${name} table query successful: ${result} records in ${queryTime}ms`);

        if (queryTime > this.config.slowQueryThresholdMs) {
          console.warn(`🐌 [DB-MONITOR] Slow query detected for ${name}: ${queryTime}ms`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Unknown error testing ${name}`;
        errors.push(`${name}: ${errorMessage}`);
        console.error(`❌ [DB-MONITOR] Query validation failed for ${name}:`, errorMessage);
      }
    }

    const validationTime = Date.now() - startTime;
    const isValid = errors.length === 0;

    console.log(`${isValid ? '✅' : '❌'} [DB-MONITOR] Query validation completed in ${validationTime}ms: ${queriesExecuted}/${testQueries.length} queries successful`);

    return {
      isValid,
      validationTime,
      queriesExecuted,
      errors,
      timestamp: new Date()
    };
  }

  /**
   * Get comprehensive database status
   */
  async getStatus(): Promise<DatabaseStatus> {
    console.log(`📊 [DB-MONITOR] Getting comprehensive database status...`);
    const startTime = Date.now();

    try {
      // Run all checks in parallel for efficiency
      const [connection, queries, metrics, health] = await Promise.all([
        this.checkConnection(),
        this.validateQueries(),
        getConnectionMetrics(),
        performHealthCheck()
      ]);

      // Determine overall status
      let overall: DatabaseStatus['overall'] = 'healthy';
      
      if (!connection.isConnected) {
        overall = 'offline';
      } else if (!queries.isValid || health.status === 'unhealthy') {
        overall = 'critical';
      } else if (metrics.status === 'critical' || queries.errors.length > 0) {
        overall = 'degraded';
      } else if (metrics.status === 'warning') {
        overall = 'degraded';
      }

      const status: DatabaseStatus = {
        overall,
        connection,
        queries,
        metrics,
        health,
        lastCheck: new Date()
      };

      this.lastStatus = status;
      
      const totalTime = Date.now() - startTime;
      console.log(`📊 [DB-MONITOR] Database status check completed in ${totalTime}ms: ${overall}`);

      return status;

    } catch (error) {
      console.error(`💥 [DB-MONITOR] Failed to get database status:`, error);
      
      // Return a critical status with error information
      const errorStatus: DatabaseStatus = {
        overall: 'critical',
        connection: {
          isConnected: false,
          connectionTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
          retryCount: 0
        },
        queries: {
          isValid: false,
          validationTime: 0,
          queriesExecuted: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          timestamp: new Date()
        },
        metrics: {
          totalConnections: -1,
          activeConnections: -1,
          idleConnections: -1,
          waitingConnections: -1,
          connectionPoolSize: 5,
          timestamp: new Date(),
          databaseUrl: 'error',
          status: 'critical'
        },
        health: {
          status: 'unhealthy',
          message: 'Status check failed',
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          connectionTest: false,
          queryTest: false,
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        },
        lastCheck: new Date()
      };

      this.lastStatus = errorStatus;
      return errorStatus;
    }
  }

  /**
   * Handle connection failure with recovery attempts
   */
  async handleConnectionFailure(): Promise<RecoveryResult> {
    console.log(`🚨 [DB-MONITOR] Handling connection failure...`);
    const startTime = Date.now();

    try {
      // Strategy 1: Simple reconnection attempt
      console.log(`🔄 [DB-MONITOR] Attempting database reconnection...`);
      
      await prisma.$disconnect();
      await this.delay(1000); // Wait before reconnecting
      await prisma.$connect();

      // Test the connection
      await prisma.$queryRaw`SELECT 1 as recovery_test`;
      
      const duration = Date.now() - startTime;
      console.log(`✅ [DB-MONITOR] Connection recovery successful in ${duration}ms`);

      return {
        success: true,
        action: 'reconnection',
        duration,
        timestamp: new Date()
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown recovery error';
      
      console.error(`❌ [DB-MONITOR] Connection recovery failed in ${duration}ms:`, errorMessage);

      return {
        success: false,
        action: 'reconnection',
        duration,
        error: errorMessage,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get the last known status (cached)
   */
  getLastStatus(): DatabaseStatus | undefined {
    return this.lastStatus;
  }

  /**
   * Check if database is healthy based on last status
   */
  isHealthy(): boolean {
    return this.lastStatus?.overall === 'healthy';
  }

  /**
   * Get connection pool utilization percentage
   */
  getConnectionUtilization(): number {
    if (!this.lastStatus?.metrics) return 0;
    const { totalConnections, connectionPoolSize } = this.lastStatus.metrics;
    return (totalConnections / connectionPoolSize) * 100;
  }

  /**
   * Start periodic monitoring
   */
  startPeriodicMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
    console.log(`🔄 [DB-MONITOR] Starting periodic monitoring every ${intervalMs}ms...`);
    
    return setInterval(async () => {
      try {
        const status = await this.getStatus();
        
        if (status.overall === 'critical' || status.overall === 'offline') {
          console.error(`🚨 [DB-MONITOR] Database status is ${status.overall}!`);
          
          // Attempt recovery for connection issues
          if (!status.connection.isConnected) {
            console.log(`🔧 [DB-MONITOR] Attempting automatic recovery...`);
            const recovery = await this.handleConnectionFailure();
            
            if (recovery.success) {
              console.log(`✅ [DB-MONITOR] Automatic recovery successful`);
            } else {
              console.error(`❌ [DB-MONITOR] Automatic recovery failed: ${recovery.error}`);
            }
          }
        }
        
      } catch (error) {
        console.error(`💥 [DB-MONITOR] Periodic monitoring error:`, error);
      }
    }, intervalMs);
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export a default instance
export const databaseMonitor = new DatabaseMonitor();

// Export utility functions
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  return databaseMonitor.getStatus();
}

export async function checkDatabaseConnection(): Promise<ConnectionStatus> {
  return databaseMonitor.checkConnection();
}

export async function validateDatabaseQueries(): Promise<QueryValidationResult> {
  return databaseMonitor.validateQueries();
}

export function startDatabaseMonitoring(intervalMs?: number): NodeJS.Timeout {
  return databaseMonitor.startPeriodicMonitoring(intervalMs);
}