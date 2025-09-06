import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { activityTrackingService } from '@/services/activity';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/activity/stats
 * 
 * Get activity statistics for dashboard
 * Query parameters:
 * - timeRange: '7d' | '30d' | '3m' (default: '30d')
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
    const timeRange = (searchParams.get('timeRange') as '7d' | '30d' | '3m') || '30d';

    // Validate timeRange parameter
    if (!['7d', '30d', '3m'].includes(timeRange)) {
      return NextResponse.json(
        { error: 'Invalid timeRange. Must be one of: 7d, 30d, 3m' },
        { status: 400 }
      );
    }

    // Get activity statistics and summary in parallel
    const [activityStats, activitySummary] = await Promise.all([
      activityTrackingService.getActivityStats(timeRange),
      activityTrackingService.getActivitySummary()
    ]);

    const response = NextResponse.json({
      timeRange,
      stats: activityStats,
      summary: activitySummary,
      timestamp: new Date().toISOString()
    });

    // Set cache headers (cache for 5 minutes)
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    return response;

  } catch (error) {
    console.error('Dashboard activity stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity statistics' },
      { status: 500 }
    );
  }
}
