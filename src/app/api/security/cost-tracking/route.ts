import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { costTracker } from '@/lib/security/cost-tracker';
import { createSecureAPIHandler } from '@/lib/security/security-middleware';

/**
 * GET /api/security/cost-tracking
 * Get cost summary for user or system-wide (admin only)
 */
export const GET = createSecureAPIHandler(
  async (request: NextRequest, context) => {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const systemWide = searchParams.get('systemWide') === 'true';

    // Parse time range
    let dateRange: { start: Date; end: Date } | undefined;
    
    if (timeRange === 'custom' && startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    } else if (timeRange) {
      const now = new Date();
      const ranges = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '90d': 90 * 24 * 60 * 60 * 1000
      };
      
      const milliseconds = ranges[timeRange as keyof typeof ranges];
      if (milliseconds) {
        dateRange = {
          start: new Date(now.getTime() - milliseconds),
          end: now
        };
      }
    }

    // System-wide data requires admin permission
    if (systemWide && !context.permissions.includes('admin')) {
      return NextResponse.json(
        { error: 'Admin access required for system-wide data' },
        { status: 403 }
      );
    }

    const summary = systemWide
      ? costTracker.getSystemCostSummary(dateRange)
      : costTracker.getCostSummary(context.userId!, dateRange);

    // Get budget status for user
    const budgetStatus = context.userId 
      ? costTracker.isWithinBudget(context.userId)
      : null;

    // Get cost predictions for user
    const predictions = context.userId
      ? costTracker.getCostPredictions(context.userId)
      : null;

    return NextResponse.json({
      summary,
      budgetStatus,
      predictions,
      timeRange: dateRange ? {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString()
      } : null,
      timestamp: new Date().toISOString()
    });
  },
  {
    requireAuth: true,
    requiredPermission: 'cost:read'
  }
);

/**
 * POST /api/security/cost-tracking/budget
 * Create a new budget
 */
export const POST = createSecureAPIHandler(
  async (request: NextRequest, context) => {
    const body = await request.json();
    const { name, budgetType, amount, alertThresholds } = body;

    if (!name || !budgetType || !amount) {
      return NextResponse.json(
        { error: 'name, budgetType, and amount are required' },
        { status: 400 }
      );
    }

    if (!['daily', 'weekly', 'monthly', 'total'].includes(budgetType)) {
      return NextResponse.json(
        { error: 'Invalid budgetType. Must be daily, weekly, monthly, or total' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Calculate period based on budget type
    const now = new Date();
    let period: { start: Date; end: Date };

    switch (budgetType) {
      case 'daily':
        period = {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        };
        break;
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        period = {
          start: startOfWeek,
          end: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)
        };
        break;
      case 'monthly':
        period = {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        };
        break;
      case 'total':
        period = {
          start: now,
          end: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year
        };
        break;
      default:
        // Fallback: treat as monthly
        period = {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 1, 1)
        };
    }

    const budgetId = await costTracker.createBudget({
      name,
      userId: context.userId!,
      budgetType,
      amount,
      period,
      alertThresholds: alertThresholds || [50, 75, 90],
      isActive: true
    });

    return NextResponse.json({
      budgetId,
      message: 'Budget created successfully',
      timestamp: new Date().toISOString()
    });
  },
  {
    requireAuth: true,
    requiredPermission: 'cost:write'
  }
);