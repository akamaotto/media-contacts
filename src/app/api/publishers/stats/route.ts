/**
 * Publishers Stats API Route
 */

import { NextRequest } from 'next/server';
import { getPublishersController } from '../factory';

const publishersController = getPublishersController();

/**
 * GET /api/publishers/stats
 * Get publishers with usage statistics
 */
export async function GET(request: NextRequest) {
  return publishersController.handleGetStats(request);
}