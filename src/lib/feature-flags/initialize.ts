/**
 * Feature Flag System Initialization
 * Initializes the feature flag system and its services
 */

import { featureFlagService } from './feature-flag-service';
import { featureFlagMonitoringService } from './monitoring-service';
import { automatedRolloutService } from './automated-rollout-service';

/**
 * Initialize all feature flag services
 */
export async function initializeFeatureFlagSystem(): Promise<void> {
  try {
    console.log('🚀 [INIT] Initializing feature flag system...');
    
    // Initialize the core feature flag service
    console.log('🚀 [INIT] Initializing core feature flag service...');
    await featureFlagService.initialize();
    
    // Initialize the monitoring service
    console.log('🚀 [INIT] Initializing monitoring service...');
    await featureFlagMonitoringService.initialize();
    
    // Automated rollout service doesn't need explicit initialization
    // It will be initialized when needed
    
    console.log('✅ [INIT] Feature flag system initialized successfully');
  } catch (error) {
    console.error('❌ [INIT] Failed to initialize feature flag system:', error);
    throw error;
  }
}

/**
 * Initialize feature flags for server-side usage
 * This should be called once during application startup
 */
export async function initializeServerFeatureFlags(): Promise<void> {
  try {
    // Initialize the core feature flag service
    await featureFlagService.initialize();
    console.log('✅ [INIT] Server-side feature flags initialized');
  } catch (error) {
    console.error('❌ [INIT] Failed to initialize server-side feature flags:', error);
    // Don't throw here to prevent the app from crashing
  }
}

/**
 * Cleanup function to be called during application shutdown
 */
export async function cleanupFeatureFlagSystem(): Promise<void> {
  try {
    console.log('🧹 [CLEANUP] Cleaning up feature flag system...');
    
    // Stop monitoring
    featureFlagMonitoringService.stopMonitoring();
    
    // Cancel any active rollouts
    const activeRollouts = automatedRolloutService.getActiveRolloutPlans();
    for (const rollout of activeRollouts) {
      await automatedRolloutService.cancelRolloutPlan(
        rollout.id, 
        'Application shutdown'
      );
    }
    
    console.log('✅ [CLEANUP] Feature flag system cleaned up successfully');
  } catch (error) {
    console.error('❌ [CLEANUP] Failed to clean up feature flag system:', error);
  }
}

/**
 * Health check for the feature flag system
 */
export async function featureFlagSystemHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    core: 'healthy' | 'degraded' | 'unhealthy';
    monitoring: 'healthy' | 'degraded' | 'unhealthy';
    rollout: 'healthy' | 'degraded' | 'unhealthy';
  };
  details: Record<string, any>;
}> {
  const result = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    services: {
      core: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      monitoring: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      rollout: 'healthy' as 'healthy' | 'degraded' | 'unhealthy'
    },
    details: {} as Record<string, any>
  };
  
  try {
    // Check core service
    const flags = await featureFlagService.getAllFlags();
    result.services.core = 'healthy';
    result.details.core = { flagCount: flags.length };
    
    // Check monitoring service
    const dashboard = await featureFlagMonitoringService.getMonitoringDashboard();
    result.services.monitoring = dashboard.systemHealth.status === 'healthy' ? 'healthy' : 
                              dashboard.systemHealth.status === 'warning' ? 'degraded' : 'unhealthy';
    result.details.monitoring = {
      systemHealth: dashboard.systemHealth,
      activeAlerts: dashboard.alerts.length
    };
    
    // Check rollout service
    const activeRollouts = automatedRolloutService.getActiveRolloutPlans();
    result.services.rollout = 'healthy';
    result.details.rollout = { activeRolloutCount: activeRollouts.length };
    
    // Determine overall status
    const serviceStatuses = Object.values(result.services);
    if (serviceStatuses.every(status => status === 'healthy')) {
      result.status = 'healthy';
    } else if (serviceStatuses.some(status => status === 'unhealthy')) {
      result.status = 'unhealthy';
    } else {
      result.status = 'degraded';
    }
  } catch (error) {
    console.error('❌ [HEALTH] Feature flag system health check failed:', error);
    result.status = 'unhealthy';
    result.details.error = error instanceof Error ? error.message : 'Unknown error';
  }
  
  return result;
}

/**
 * Get feature flag system statistics
 */
export async function getFeatureFlagSystemStats(): Promise<{
  core: {
    totalFlags: number;
    enabledFlags: number;
    flagsInRollout: number;
  };
  monitoring: {
    totalEvaluations: number;
    avgResponseTime: number;
    errorRate: number;
    activeAlerts: number;
  };
  rollout: {
    activeRollouts: number;
    completedRollouts: number;
    failedRollouts: number;
  };
}> {
  try {
    // Get core stats
    const flags = await featureFlagService.getAllFlags();
    const coreStats = {
      totalFlags: flags.length,
      enabledFlags: flags.filter(f => f.enabled).length,
      flagsInRollout: flags.filter(f => f.enabled && f.rolloutPercentage > 0 && f.rolloutPercentage < 100).length
    };
    
    // Get monitoring stats
    const dashboard = await featureFlagMonitoringService.getMonitoringDashboard();
    const monitoringStats = {
      totalEvaluations: dashboard.overview.totalEvaluations,
      avgResponseTime: dashboard.overview.avgResponseTime,
      errorRate: dashboard.overview.errorRate,
      activeAlerts: dashboard.overview.activeAlerts
    };
    
    // Get rollout stats (mock data for now)
    const rolloutStats = {
      activeRollouts: automatedRolloutService.getActiveRolloutPlans().length,
      completedRollouts: 0, // Would come from database
      failedRollouts: 0     // Would come from database
    };
    
    return {
      core: coreStats,
      monitoring: monitoringStats,
      rollout: rolloutStats
    };
  } catch (error) {
    console.error('❌ [STATS] Failed to get feature flag system stats:', error);
    
    // Return default stats
    return {
      core: { totalFlags: 0, enabledFlags: 0, flagsInRollout: 0 },
      monitoring: { totalEvaluations: 0, avgResponseTime: 0, errorRate: 0, activeAlerts: 0 },
      rollout: { activeRollouts: 0, completedRollouts: 0, failedRollouts: 0 }
    };
  }
}

/**
 * Export initialization function for Next.js app
 */
export default async function initFeatureFlags(): Promise<void> {
  if (typeof window === 'undefined') {
    // Server-side initialization
    await initializeServerFeatureFlags();
  }
}