/**
 * Beats Search API Route
 */

import { NextRequest } from 'next/server';
import { getBeatsController } from '../factory';

// Get controller instance
const beatsController = getBeatsController();

/**
 * GET /api/beats/search?q=query&limit=10
 * Search beats by name
 */
export async function GET(request: NextRequest) {
  return beatsController.handleSearch(request);
}