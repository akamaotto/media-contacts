/**
 * Categories Stats API Route
 */

import { NextRequest } from 'next/server';
import { getCategoriesController } from '../factory';

const categoriesController = getCategoriesController();

/**
 * GET /api/categories/stats
 * Get categories with usage statistics
 */
export async function GET(request: NextRequest) {
  return categoriesController.handleGetStats(request);
}