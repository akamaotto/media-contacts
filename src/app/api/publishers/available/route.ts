/**
 * Publishers Available API Route
 */

import { NextRequest } from 'next/server';
import { getPublishersController } from '../factory';

const publishersController = getPublishersController();

/**
 * GET /api/publishers/available
 * Get publishers without outlets (available for assignment)
 */
export async function GET(request: NextRequest) {
  return publishersController.handleGetAvailable(request);
}