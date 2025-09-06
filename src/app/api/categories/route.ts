/**
 * Categories API Routes with Repository Pattern
 * Replaces the existing /api/categories route with improved architecture
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCategoriesController } from './factory';

// Get controller instance
const categoriesController = getCategoriesController();

/**
 * GET /api/categories
 * Get all categories with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  const response = await categoriesController.handleGetAll(request);
  
  // Add cache headers for GET requests
  if (request.method === 'GET') {
    response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
  }
  
  return response;
}

/**
 * POST /api/categories
 * Create a new category
 */
export async function POST(request: NextRequest) {
  return categoriesController.handleCreate(request);
}