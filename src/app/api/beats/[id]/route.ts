/**
 * Individual Beat API Routes
 * Handles operations on specific beats by ID
 */

import { NextRequest } from 'next/server';
import { getBeatsController } from '../factory';

// Get controller instance
const beatsController = getBeatsController();

/**
 * GET /api/beats/[id]
 * Get a specific beat by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return beatsController.handleGetById(request, { params });
}

/**
 * PUT /api/beats/[id]
 * Update a specific beat
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return beatsController.handleUpdate(request, { params });
}

/**
 * DELETE /api/beats/[id]
 * Delete a specific beat
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return beatsController.handleDelete(request, { params });
}