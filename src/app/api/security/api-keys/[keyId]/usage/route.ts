import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { apiKeyManager } from '@/lib/security/api-key-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: { keyId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  const keyId = params.keyId;
  const usage = apiKeyManager.getKeyUsageStats(keyId, dateRange);

  return NextResponse.json({
    keyId,
    usage,
    timeRange: dateRange ? {
      start: dateRange.start.toISOString(),
      end: dateRange.end.toISOString()
    } : null,
    timestamp: new Date().toISOString()
  });
}
