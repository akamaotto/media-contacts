import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dashboardMetricsService } from '@/backend/dashboard/metrics';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/metrics
 * 
 * Get dashboard metrics with percentage changes
 * Query parameters:
 * - period: '7d' | '30d' | '3m' (default: '30d')
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') as '7d' | '30d' | '3m') || '30d';

    // Validate period parameter
    if (!['7d', '30d', '3m'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be one of: 7d, 30d, 3m' },
        { status: 400 }
      );
    }

    // Get dashboard metrics
    const metrics = await dashboardMetricsService.getDashboardMetrics(period);

    // Set cache headers (cache for 5 minutes)
    const response = NextResponse.json(metrics);
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    return response;

  } catch (error) {
    console.error('Dashboard metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/metrics/store
 * 
 * Store current metrics for historical tracking
 * (Admin only endpoint)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin (if you have role-based access)
    // Uncomment if you want to restrict this to admins only
    // if (session.user.role !== 'ADMIN') {
    //   return NextResponse.json(
    //     { error: 'Forbidden. Admin access required.' },
    //     { status: 403 }
    //   );
    // }

    // Store current metrics
    await dashboardMetricsService.storeCurrentMetrics();

    return NextResponse.json({ 
      success: true, 
      message: 'Metrics stored successfully' 
    });

  } catch (error) {
    console.error('Store metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to store metrics' },
      { status: 500 }
    );
  }
}
