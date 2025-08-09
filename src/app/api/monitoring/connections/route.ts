import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  getConnectionMetrics, 
  getConnectionHistory, 
  getConnectionStats,
  performHealthCheck 
} from '@/lib/prisma-monitoring';

/**
 * Connection monitoring API endpoint
 * Provides detailed connection pool metrics for admin dashboard
 */
export async function GET(request: Request) {
  try {
    // Check authentication - only allow admin users
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'current';

    switch (action) {
      case 'current':
        // Get current connection metrics
        const currentMetrics = await getConnectionMetrics();
        return NextResponse.json({
          success: true,
          data: currentMetrics,
          timestamp: new Date().toISOString()
        });

      case 'history':
        // Get connection history
        const history = getConnectionHistory();
        return NextResponse.json({
          success: true,
          data: history,
          count: history.length,
          timestamp: new Date().toISOString()
        });

      case 'stats':
        // Get comprehensive statistics
        const stats = await getConnectionStats();
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        });

      case 'health':
        // Perform detailed health check
        const healthCheck = await performHealthCheck();
        return NextResponse.json({
          success: true,
          data: healthCheck,
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: current, history, stats, or health' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Connection monitoring API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Trigger manual connection pool monitoring check
 */
export async function POST(request: Request) {
  try {
    // Check authentication - only allow admin users
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    if (action === 'check') {
      // Perform immediate health check and return results
      const healthCheck = await performHealthCheck();
      const metrics = await getConnectionMetrics();
      
      return NextResponse.json({
        success: true,
        data: {
          healthCheck,
          metrics
        },
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: check' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Connection monitoring POST error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
