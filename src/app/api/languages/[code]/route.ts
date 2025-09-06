import { NextRequest } from 'next/server';
import { getLanguagesController } from '../factory';

// Get controller instance
const languagesController = getLanguagesController();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return languagesController.handleGetById(request, { params });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return languagesController.handleUpdate(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return languagesController.handleDelete(request, { params });
}