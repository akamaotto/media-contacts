/**
 * Beats Stats API Route
 */

import { NextRequest } from 'next/server';
import { getBeatsController } from '../factory';

// Get controller instance
const beatsController = getBeatsController();

/**
 * GET /api/beats/stats
 * Get beats with usage statistics
 */
export async function GET(request: NextRequest) {
  return beatsController.handleGetStats(request);
}