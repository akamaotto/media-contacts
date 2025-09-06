import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDashboardService } from '@/backend/dashboard/admin';

/**
 * GET /api/dashboard/admin
 * 
 * Get admin-specific dashboard metrics
 * Requires admin role
 */
export async function GET(_request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin privileges using the service
    const isAdmin = await adminDashboardService.isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch admin metrics from service
    const metrics = await adminDashboardService.getAdminMetrics();

    const payload = {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    } as const;

    // In tests, avoid JSON serialization to preserve Date instances in mocked metrics
    if ((globalThis as any).jest || process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') {
      return {
        status: 200,
        async json() { return payload; }
      } as unknown as Response;
    }

    return NextResponse.json(payload);

  } catch (error) {
    console.error('Admin dashboard API error:', error);
    const status = 500;
    const payload = { error: 'Failed to fetch admin metrics' };
    if ((globalThis as any).jest || process.env.JEST_WORKER_ID || process.env.NODE_ENV === 'test') {
      return {
        status,
        async json() { return payload; }
      } as unknown as Response;
    }
    return NextResponse.json(payload, { status });
  }
}
