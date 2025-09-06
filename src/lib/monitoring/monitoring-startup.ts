/**
 * Monitoring system startup script
 * Initialize connection pool monitoring when the application starts
 */

import { startConnectionMonitoring } from '@/lib/database/prisma-monitoring';

let monitoringInterval: NodeJS.Timeout | null = null;

/**
 * Initialize monitoring system
 * Call this in your main application startup (e.g., layout.tsx or middleware)
 */
export function initializeMonitoring() {
  // Only start monitoring in production or when explicitly enabled
  const shouldMonitor = process.env.NODE_ENV === 'production' || 
                       process.env.ENABLE_DB_MONITORING === 'true';

  if (!shouldMonitor) {
    console.log('Database monitoring disabled (development mode)');
    return;
  }

  if (monitoringInterval) {
    console.log('Database monitoring already running');
    return;
  }

  try {
    // Start monitoring with 1-minute intervals
    monitoringInterval = startConnectionMonitoring(60000);
    console.log('✅ Database connection monitoring initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database monitoring:', error);
  }
}

/**
 * Stop monitoring system (for cleanup)
 */
export function stopMonitoring() {
  if (monitoringInterval) {
    clearInterval(monitoringInterval);
    monitoringInterval = null;
    console.log('Database monitoring stopped');
  }
}

/**
 * Get monitoring status
 */
export function getMonitoringStatus() {
  return {
    isRunning: monitoringInterval !== null,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production' || 
             process.env.ENABLE_DB_MONITORING === 'true'
  };
}

// Auto-initialize when module is imported (for server-side)
if (typeof window === 'undefined') {
  // Only run on server side
  initializeMonitoring();
}
