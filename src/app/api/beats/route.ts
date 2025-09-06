/**
 * Beats API Routes with Repository Pattern
 * Enhanced version using the new repository architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBeatsController } from './factory';

// Get controller instance
const beatsController = getBeatsController();

/**
 * GET /api/beats
 * Get all beats with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  const response = await beatsController.handleGetAll(request);
  
  // Add cache headers for GET requests
  if (request.method === 'GET') {
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
  }
  
  return response;
}

/**
 * POST /api/beats
 * Create a new beat
 */
export async function POST(request: NextRequest) {
  return beatsController.handleCreate(request);
}