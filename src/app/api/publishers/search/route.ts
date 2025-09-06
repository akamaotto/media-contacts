/**
 * Publishers Search API Route
 */

import { NextRequest } from 'next/server';
import { getPublishersController } from '../factory';

const publishersController = getPublishersController();

/**
 * GET /api/publishers/search?q=query&limit=10
 * Search publishers by name, description, or website
 */
export async function GET(request: NextRequest) {
  return publishersController.handleSearch(request);
}