/**
 * Individual Country API Routes using Repository Pattern
 */

import { NextRequest } from 'next/server';
import { getCountriesController } from '../factory';

const controller = getCountriesController();

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