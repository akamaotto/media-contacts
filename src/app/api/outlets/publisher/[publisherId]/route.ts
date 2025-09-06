import { NextRequest } from 'next/server';
import { getOutletsController } from '../../factory';

export const dynamic = 'force-dynamic';

/**
 * GET /api/outlets/publisher/[publisherId]
 * Get all outlets for a specific publisher
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ publisherId: string }> }
) {
  // Get controller instance
  const outletsController = getOutletsController();
  
  return outletsController.handleGetByPublisher(request, { params });
}