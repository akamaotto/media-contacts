/**
 * Categories [id] API Routes with Repository Pattern
 */

import { NextRequest } from 'next/server';
import { getCategoriesController } from '../factory';

// Get controller instance
const categoriesController = getCategoriesController();

/**
 * GET /api/categories/[id]
 * Get specific category by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return categoriesController.handleGetById(request, { params });
}

/**
 * PUT /api/categories/[id]
 * Update category by ID
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return categoriesController.handleUpdate(request, { params });
}

/**
 * DELETE /api/categories/[id]
 * Delete category by ID
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return categoriesController.handleDelete(request, { params });
}