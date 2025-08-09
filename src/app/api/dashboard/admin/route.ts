import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { adminDashboardService } from '@/backend/dashboard/admin';

/**
 * GET /api/dashboard/admin
 * 
 * Get admin-specific dashboard metrics
 * Requires admin role
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin privileges
    const isAdmin = await adminDashboardService.isUserAdmin(session.user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get admin metrics
    const metrics = await adminDashboardService.getAdminMetrics();

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin dashboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin metrics' },
      { status: 500 }
    );
  }
}
