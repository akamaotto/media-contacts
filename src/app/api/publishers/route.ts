/**
 * Publishers API Routes with Repository Pattern
 * Enhanced version using the new repository architecture
 */

import { NextRequest } from 'next/server';
import { getPublishersController } from './factory';

// Get controller instance
const publishersController = getPublishersController();

/**
 * GET /api/publishers
 * Get all publishers with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  return publishersController.handleGetAll(request);
}

/**
 * POST /api/publishers
 * Create a new publisher
 */
export async function POST(request: NextRequest) {
  return publishersController.handleCreate(request);
}
