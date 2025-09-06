/**
 * Beats Name Availability Check API Route
 */

import { NextRequest } from 'next/server';
import { getBeatsController } from '../factory';

// Get controller instance
const beatsController = getBeatsController();

/**
 * GET /api/beats/check-name?name=BeatName&excludeId=123
 * Check if a beat name is available
 */
export async function GET(request: NextRequest) {
  return beatsController.handleCheckName(request);
}