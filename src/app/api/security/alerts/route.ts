import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { auditLogger } from '@/lib/security/audit-logger';
import { createSecureAPIHandler } from '@/lib/security/security-middleware';

/**
 * GET /api/security/alerts
 * Get security alerts
 */
export const GET = createSecureAPIHandler(
  async (request: NextRequest, context) => {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      alertType: searchParams.get('alertType') as any,
      severity: searchParams.get('severity') as any,
      status: searchParams.get('status') as any,
      userId: searchParams.get('userId') || undefined,
      ip: searchParams.get('ip') || undefined,
      limit: parseInt(searchParams.get('limit') || '50', 10)
    };

    // Non-admin users can only see their own alerts
    if (!context.permissions.includes('admin')) {
      filters.userId = context.userId;
    }

    const alerts = auditLogger.getAlerts(filters);
    
    return NextResponse.json({
      alerts,
      total: alerts.length,
      filters,
      timestamp: new Date().toISOString()
    });
  },
  {
    requireAuth: true,
    requiredPermission: 'security:read'
  }
);

/**
 * POST /api/security/alerts/{alertId}/resolve
 * Resolve a security alert
 */
export const POST = createSecureAPIHandler(
  async (request: NextRequest, context) => {
    const body = await request.json();
    const { alertId, status, notes } = body;

    if (!alertId || !status) {
      return NextResponse.json(
        { error: 'alertId and status are required' },
        { status: 400 }
      );
    }

    if (!['resolved', 'false_positive'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "resolved" or "false_positive"' },
        { status: 400 }
      );
    }

    const success = await auditLogger.resolveAlert(
      alertId,
      context.userId!,
      status,
      notes
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Alert resolved successfully',
      alertId,
      status,
      resolvedBy: context.userId,
      timestamp: new Date().toISOString()
    });
  },
  {
    requireAuth: true,
    requiredPermission: 'security:write'
  }
);