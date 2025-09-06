/**
 * Publishers [id] API Routes with Repository Pattern
 * Enhanced version using the new repository architecture
 */

import { NextRequest } from 'next/server';
import { getPublishersController } from '../factory';

// Get controller instance
const publishersController = getPublishersController();

export const dynamic = 'force-dynamic';

/**
 * GET /api/publishers/[id]
 * Get a specific publisher by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return publishersController.handleGetById(request, { params });
}

/**
 * PUT /api/publishers/[id]
 * Update a specific publisher
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return publishersController.handleUpdate(request, { params });
}

/**
 * DELETE /api/publishers/[id]
 * Delete a specific publisher
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return publishersController.handleDelete(request, { params });
}
