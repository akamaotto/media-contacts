/**
 * Feature Flag API Service
 * Provides REST API endpoints for managing feature flags
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  featureFlagService,
  getAllFeatureFlags,
  getFeatureFlag,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  getFeatureFlagStats,
  getFeatureFlagAuditLog,
  getAllFeatureFlagAuditLogs,
  emergencyRollbackFeatureFlag,
  gradualRolloutFeatureFlag,
  initializeFeatureFlags,
  type FeatureFlag,
  type FlagEvaluationContext
} from '@/lib/feature-flags/feature-flag-service';

/**
 * API Response wrapper
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Get all feature flags
 * GET /api/feature-flags
 */
export async function GET_ALL_FLAGS(): Promise<NextResponse<ApiResponse<FeatureFlag[]>>> {
  try {
    const flags = await getAllFeatureFlags();
    return NextResponse.json({
      success: true,
      data: flags,
      message: `Retrieved ${flags.length} feature flags`
    });
  } catch (error) {
    console.error('Failed to get feature flags:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve feature flags'
    }, { status: 500 });
  }
}

/**
 * Get a specific feature flag
 * GET /api/feature-flags/[id]
 */
export async function GET_FLAG(id: string): Promise<NextResponse<ApiResponse<FeatureFlag>>> {
  try {
    const flag = await getFeatureFlag(id);
    
    if (!flag) {
      return NextResponse.json({
        success: false,
        error: 'Feature flag not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: flag,
      message: `Retrieved feature flag: ${flag.name}`
    });
  } catch (error) {
    console.error(`Failed to get feature flag ${id}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve feature flag'
    }, { status: 500 });
  }
}

/**
 * Create a new feature flag
 * POST /api/feature-flags
 */
export async function CREATE_FLAG(
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  try {
    const body = await request.json();
    const { flagData, userId } = body;

    if (!flagData || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: flagData, userId'
      }, { status: 400 });
    }

    // Validate required fields
    const requiredFields = ['name', 'description', 'type'];
    const missingFields = requiredFields.filter(field => !flagData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      }, { status: 400 });
    }

    const flagId = await createFeatureFlag(flagData, userId);
    
    return NextResponse.json({
      success: true,
      data: { id: flagId },
      message: 'Feature flag created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create feature flag:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create feature flag'
    }, { status: 500 });
  }
}

/**
 * Update a feature flag
 * PUT /api/feature-flags/[id]
 */
export async function UPDATE_FLAG(
  id: string,
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { updates, userId, reason } = body;

    if (!updates || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: updates, userId'
      }, { status: 400 });
    }

    await updateFeatureFlag(id, updates, userId, reason);
    
    return NextResponse.json({
      success: true,
      message: 'Feature flag updated successfully'
    });
  } catch (error) {
    console.error(`Failed to update feature flag ${id}:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({
        success: false,
        error: 'Feature flag not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update feature flag'
    }, { status: 500 });
  }
}

/**
 * Delete a feature flag
 * DELETE /api/feature-flags/[id]
 */
export async function DELETE_FLAG(
  id: string,
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: userId'
      }, { status: 400 });
    }

    await deleteFeatureFlag(id, userId, reason);
    
    return NextResponse.json({
      success: true,
      message: 'Feature flag deleted successfully'
    });
  } catch (error) {
    console.error(`Failed to delete feature flag ${id}:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({
        success: false,
        error: 'Feature flag not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to delete feature flag'
    }, { status: 500 });
  }
}

/**
 * Get feature flag statistics
 * GET /api/feature-flags/[id]/stats
 */
export async function GET_FLAG_STATS(
  id: string,
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({
        success: false,
        error: 'Missing required query parameters: start, end'
      }, { status: 400 });
    }

    const timeRange = {
      start: new Date(start),
      end: new Date(end)
    };

    const stats = await getFeatureFlagStats(id, timeRange);
    
    return NextResponse.json({
      success: true,
      data: stats,
      message: 'Retrieved feature flag statistics'
    });
  } catch (error) {
    console.error(`Failed to get stats for feature flag ${id}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve feature flag statistics'
    }, { status: 500 });
  }
}

/**
 * Get feature flag audit log
 * GET /api/feature-flags/[id]/audit
 */
export async function GET_FLAG_AUDIT_LOG(
  id: string,
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const auditLog = await getFeatureFlagAuditLog(id, limit);
    
    return NextResponse.json({
      success: true,
      data: auditLog,
      message: `Retrieved ${auditLog.length} audit log entries`
    });
  } catch (error) {
    console.error(`Failed to get audit log for feature flag ${id}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve audit log'
    }, { status: 500 });
  }
}

/**
 * Get all audit logs
 * GET /api/feature-flags/audit
 */
export async function GET_ALL_AUDIT_LOGS(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const auditLog = await getAllFeatureFlagAuditLogs(limit);
    
    return NextResponse.json({
      success: true,
      data: auditLog,
      message: `Retrieved ${auditLog.length} audit log entries`
    });
  } catch (error) {
    console.error('Failed to get all audit logs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve audit logs'
    }, { status: 500 });
  }
}

/**
 * Emergency rollback a feature flag
 * POST /api/feature-flags/[id]/emergency-rollback
 */
export async function EMERGENCY_ROLLBACK(
  id: string,
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { reason, userId } = body;

    if (!reason || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: reason, userId'
      }, { status: 400 });
    }

    await emergencyRollbackFeatureFlag(id, reason, userId);
    
    return NextResponse.json({
      success: true,
      message: 'Emergency rollback completed successfully'
    });
  } catch (error) {
    console.error(`Failed to emergency rollback feature flag ${id}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform emergency rollback'
    }, { status: 500 });
  }
}

/**
 * Start gradual rollout for a feature flag
 * POST /api/feature-flags/[id]/gradual-rollout
 */
export async function GRADUAL_ROLLOUT(
  id: string,
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { steps, intervalMs } = body;

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid field: steps (must be a non-empty array)'
      }, { status: 400 });
    }

    await gradualRolloutFeatureFlag(id, steps, intervalMs);
    
    return NextResponse.json({
      success: true,
      message: 'Gradual rollout started successfully'
    });
  } catch (error) {
    console.error(`Failed to start gradual rollout for feature flag ${id}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to start gradual rollout'
    }, { status: 500 });
  }
}

/**
 * Evaluate a feature flag for a given context
 * POST /api/feature-flags/[id]/evaluate
 */
export async function EVALUATE_FLAG(
  id: string,
  request: NextRequest
): Promise<NextResponse<ApiResponse<{ enabled: boolean; reason?: string }>>> {
  try {
    const body = await request.json();
    const { context } = body;

    if (!context) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: context'
      }, { status: 400 });
    }

    const flag = await getFeatureFlag(id);
    if (!flag) {
      return NextResponse.json({
        success: false,
        error: 'Feature flag not found'
      }, { status: 404 });
    }

    const evaluationContext: FlagEvaluationContext = {
      timestamp: new Date(),
      ...context
    };

    const enabled = await featureFlagService.isFlagEnabled(id, evaluationContext);
    
    return NextResponse.json({
      success: true,
      data: { enabled },
      message: `Flag evaluation completed: ${enabled ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error(`Failed to evaluate feature flag ${id}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to evaluate feature flag'
    }, { status: 500 });
  }
}

/**
 * Initialize feature flags
 * POST /api/feature-flags/initialize
 */
export async function INITIALIZE_FLAGS(): Promise<NextResponse<ApiResponse>> {
  try {
    await initializeFeatureFlags();
    
    return NextResponse.json({
      success: true,
      message: 'Feature flags initialized successfully'
    });
  } catch (error) {
    console.error('Failed to initialize feature flags:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize feature flags'
    }, { status: 500 });
  }
}

/**
 * Get feature flag health metrics
 * GET /api/feature-flags/[id]/health
 */
export async function GET_FLAG_HEALTH(
  id: string,
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');

    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

    const stats = await getFeatureFlagStats(id, { start: startTime, end: endTime });
    
    // Calculate health metrics
    const errorRate = stats.totalEvaluations > 0 
      ? ((stats.totalEvaluations - stats.enabledEvaluations) / stats.totalEvaluations) * 100 
      : 0;

    const health = {
      status: errorRate < 5 ? 'healthy' : errorRate < 15 ? 'degraded' : 'unhealthy',
      errorRate: Math.round(errorRate * 100) / 100,
      totalEvaluations: stats.totalEvaluations,
      enabledEvaluations: stats.enabledEvaluations,
      enabledPercentage: Math.round(stats.enabledPercentage * 100) / 100,
      userSegmentStats: stats.userSegmentStats,
      timeRange: `${hours}h`,
      lastChecked: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      data: health,
      message: 'Retrieved feature flag health metrics'
    });
  } catch (error) {
    console.error(`Failed to get health metrics for feature flag ${id}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve health metrics'
    }, { status: 500 });
  }
}

/**
 * Bulk update feature flags
 * POST /api/feature-flags/bulk-update
 */
export async function BULK_UPDATE_FLAGS(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { updates, userId } = body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing or invalid field: updates (must be a non-empty array)'
      }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: userId'
      }, { status: 400 });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { id, ...updateData } = update;
        await updateFeatureFlag(id, updateData, userId, update.reason);
        results.push({ id, success: true });
      } catch (error) {
        errors.push({ id, error: error instanceof Error ? error.message : 'Unknown error' });
        results.push({ id, success: false });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        results,
        successCount: results.filter(r => r.success).length,
        errorCount: errors.length,
        errors
      },
      message: `Bulk update completed: ${results.filter(r => r.success).length} successful, ${errors.length} failed`
    });
  } catch (error) {
    console.error('Failed to bulk update feature flags:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform bulk update'
    }, { status: 500 });
  }
}

/**
 * Get audit log analytics
 * GET /api/feature-flags/audit/analytics
 */
export async function GET_AUDIT_ANALYTICS(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const flagId = searchParams.get('flagId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filter: any = {};
    if (flagId) filter.flagId = flagId;
    if (startDate) filter.startDate = new Date(startDate);
    if (endDate) filter.endDate = new Date(endDate);

    // Import audit log service
    const { featureFlagAuditLog } = await import('@/lib/feature-flags/audit-log-service');
    
    const analytics = await featureFlagAuditLog.getAuditLogAnalytics(filter);
    
    return NextResponse.json({
      success: true,
      data: analytics,
      message: 'Retrieved audit log analytics'
    });
  } catch (error) {
    console.error('Failed to get audit log analytics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve audit log analytics'
    }, { status: 500 });
  }
}

/**
 * Export audit log to CSV
 * GET /api/feature-flags/audit/export
 */
export async function EXPORT_AUDIT_LOG(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const flagId = searchParams.get('flagId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '10000');

    const filter: any = { limit };
    if (flagId) filter.flagId = flagId;
    if (startDate) filter.startDate = new Date(startDate);
    if (endDate) filter.endDate = new Date(endDate);

    // Import audit log service
    const { featureFlagAuditLog } = await import('@/lib/feature-flags/audit-log-service');
    
    const csvContent = await featureFlagAuditLog.exportAuditLogToCSV(filter);
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="feature-flag-audit-log-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Failed to export audit log:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to export audit log'
    }, { status: 500 });
  }
}

/**
 * Get all rollout strategies
 * GET /api/feature-flags/rollout/strategies
 */
export async function GET_ROLLOUT_STRATEGIES(): Promise<NextResponse<ApiResponse>> {
  try {
    // Import automated rollout service
    const { automatedRolloutService } = await import('@/lib/feature-flags/automated-rollout-service');
    
    const strategies = automatedRolloutService.getPredefinedStrategies();
    
    return NextResponse.json({
      success: true,
      data: strategies,
      message: 'Retrieved rollout strategies'
    });
  } catch (error) {
    console.error('Failed to get rollout strategies:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve rollout strategies'
    }, { status: 500 });
  }
}

/**
 * Start automated rollout
 * POST /api/feature-flags/[id]/automated-rollout
 */
export async function START_AUTOMATED_ROLLOUT(
  id: string,
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { strategyId, userId } = body;

    if (!strategyId || !userId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: strategyId, userId'
      }, { status: 400 });
    }

    // Import automated rollout service
    const { automatedRolloutService } = await import('@/lib/feature-flags/automated-rollout-service');
    
    const rolloutPlan = await automatedRolloutService.startRolloutPlan(id, strategyId, userId);
    
    return NextResponse.json({
      success: true,
      data: rolloutPlan,
      message: 'Automated rollout started successfully'
    });
  } catch (error) {
    console.error(`Failed to start automated rollout for flag ${id}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to start automated rollout'
    }, { status: 500 });
  }
}

/**
 * Pause automated rollout
 * POST /api/feature-flags/rollout/[planId]/pause
 */
export async function PAUSE_AUTOMATED_ROLLOUT(
  planId: string,
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: reason'
      }, { status: 400 });
    }

    // Import automated rollout service
    const { automatedRolloutService } = await import('@/lib/feature-flags/automated-rollout-service');
    
    await automatedRolloutService.pauseRolloutPlan(planId, reason);
    
    return NextResponse.json({
      success: true,
      message: 'Automated rollout paused successfully'
    });
  } catch (error) {
    console.error(`Failed to pause automated rollout ${planId}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to pause automated rollout'
    }, { status: 500 });
  }
}

/**
 * Resume automated rollout
 * POST /api/feature-flags/rollout/[planId]/resume
 */
export async function RESUME_AUTOMATED_ROLLOUT(
  planId: string
): Promise<NextResponse<ApiResponse>> {
  try {
    // Import automated rollout service
    const { automatedRolloutService } = await import('@/lib/feature-flags/automated-rollout-service');
    
    await automatedRolloutService.resumeRolloutPlan(planId);
    
    return NextResponse.json({
      success: true,
      message: 'Automated rollout resumed successfully'
    });
  } catch (error) {
    console.error(`Failed to resume automated rollout ${planId}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to resume automated rollout'
    }, { status: 500 });
  }
}

/**
 * Cancel automated rollout
 * POST /api/feature-flags/rollout/[planId]/cancel
 */
export async function CANCEL_AUTOMATED_ROLLOUT(
  planId: string,
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json({
        success: false,
        error: 'Missing required field: reason'
      }, { status: 400 });
    }

    // Import automated rollout service
    const { automatedRolloutService } = await import('@/lib/feature-flags/automated-rollout-service');
    
    await automatedRolloutService.cancelRolloutPlan(planId, reason);
    
    return NextResponse.json({
      success: true,
      message: 'Automated rollout cancelled successfully'
    });
  } catch (error) {
    console.error(`Failed to cancel automated rollout ${planId}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to cancel automated rollout'
    }, { status: 500 });
  }
}

/**
 * Get active rollout plans
 * GET /api/feature-flags/rollout/active
 */
export async function GET_ACTIVE_ROLLOUT_PLANS(): Promise<NextResponse<ApiResponse>> {
  try {
    // Import automated rollout service
    const { automatedRolloutService } = await import('@/lib/feature-flags/automated-rollout-service');
    
    const plans = automatedRolloutService.getActiveRolloutPlans();
    
    return NextResponse.json({
      success: true,
      data: plans,
      message: 'Retrieved active rollout plans'
    });
  } catch (error) {
    console.error('Failed to get active rollout plans:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve active rollout plans'
    }, { status: 500 });
  }
}

/**
 * Get specific rollout plan
 * GET /api/feature-flags/rollout/[planId]
 */
export async function GET_ROLLOUT_PLAN(
  planId: string
): Promise<NextResponse<ApiResponse>> {
  try {
    // Import automated rollout service
    const { automatedRolloutService } = await import('@/lib/feature-flags/automated-rollout-service');
    
    const plan = automatedRolloutService.getRolloutPlan(planId);
    
    if (!plan) {
      return NextResponse.json({
        success: false,
        error: 'Rollout plan not found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: plan,
      message: 'Retrieved rollout plan'
    });
  } catch (error) {
    console.error(`Failed to get rollout plan ${planId}:`, error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve rollout plan'
    }, { status: 500 });
  }
}