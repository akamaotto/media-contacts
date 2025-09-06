import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { auditLogger } from '@/lib/security/audit-logger';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can view system-wide stats
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange');
  
  let dateRange: { start: Date; end: Date } | undefined;
  if (timeRange) {
    const now = new Date();
    const ranges = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    } as const;
    
    const milliseconds = ranges[timeRange as keyof typeof ranges];
    if (milliseconds) {
      dateRange = {
        start: new Date(now.getTime() - milliseconds),
        end: now
      };
    }
  }

  const statistics = auditLogger.getStatistics(dateRange);
  
  return NextResponse.json({
    ...statistics,
    timeRange: dateRange ? {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString()
    } : null,
    timestamp: new Date().toISOString()
  });
}
