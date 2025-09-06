import { NextRequest, NextResponse } from 'next/server';
import { auditLogger } from '@/lib/security/audit-logger';
import { createSecureAPIHandler } from '@/lib/security/security-middleware';

/**
 * GET /api/security/audit
 * Get audit events with filtering
 */
export const GET = createSecureAPIHandler(
  async (request: NextRequest, context) => {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      eventType: searchParams.get('eventType') as any,
      severity: searchParams.get('severity') as any,
      userId: searchParams.get('userId') || undefined,
      ip: searchParams.get('ip') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: parseInt(searchParams.get('limit') || '100', 10),
      offset: parseInt(searchParams.get('offset') || '0', 10)
    };

    // Non-admin users can only see their own events
    if (!context.permissions.includes('admin')) {
      filters.userId = context.userId;
    }

    const events = auditLogger.getEvents(filters);
    
    return NextResponse.json({
      events,
      total: events.length,
      filters,
      timestamp: new Date().toISOString()
    });
  },
  {
    requireAuth: true,
    requiredPermission: 'audit:read'
  }
);

/**
 * GET /api/security/audit/stats
 * Get audit statistics
 */
// Stats endpoint moved to /api/security/audit/stats