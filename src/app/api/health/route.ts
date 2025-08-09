import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  performHealthCheck, 
  getConnectionMetrics, 
  getConnectionStats 
} from '@/lib/prisma-monitoring';

/**
 * Health check endpoint that connects to the database to keep it active
 * This helps prevent Neon database from going into suspend mode
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';
  const stats = searchParams.get('stats') === 'true';

  try {
    // For detailed and stats requests, use the monitoring functions
    if (stats) {
      try {
        const connectionStats = await getConnectionStats();
        return NextResponse.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          type: 'statistics',
          data: connectionStats
        });
      } catch (monitoringError) {
        console.warn('Monitoring stats failed, falling back to basic check:', monitoringError);
        // Fall through to basic check
      }
    }

    if (detailed) {
      try {
        const healthCheck = await performHealthCheck();
        const connectionMetrics = await getConnectionMetrics();
        
        return NextResponse.json({
          ...healthCheck,
          connectionMetrics,
          type: 'detailed'
        }, { 
          status: healthCheck.status === 'healthy' ? 200 : 503 
        });
      } catch (monitoringError) {
        console.warn('Detailed health check failed, falling back to basic check:', monitoringError);
        // Fall through to basic check
      }
    }

    // Basic health check - same simple query that works for media contacts
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      type: 'basic'
    });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      type: 'basic',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
