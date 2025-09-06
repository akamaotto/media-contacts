/**
 * Individual User API Routes (/api/users/[id])
 * Handles operations on specific users
 */

import { NextRequest } from 'next/server';
import { getUserController } from '../factory';

const controller = getUserController();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return controller.handleGetById(request, { params });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return controller.handleUpdate(request, { params });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return controller.handleDelete(request, { params });
}