/**
 * Categories Search API Route
 */

import { NextRequest } from 'next/server';
import { getCategoriesController } from '../factory';

const categoriesController = getCategoriesController();

/**
 * GET /api/categories/search
 * Search categories by name
 */
export async function GET(request: NextRequest) {
  return categoriesController.handleSearch(request);
}