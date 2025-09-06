/**
 * Categories Name Check API Route
 */

import { NextRequest } from 'next/server';
import { getCategoriesController } from '../factory';

const categoriesController = getCategoriesController();

/**
 * GET /api/categories/check-name
 * Check if category name is available
 */
export async function GET(request: NextRequest) {
  return categoriesController.handleCheckName(request);
}