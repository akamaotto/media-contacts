import { NextRequest } from 'next/server';
import { getRegionsController } from '../factory';

// Get controller instance
const regionsController = getRegionsController();

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return regionsController.handleGetById(request, { params: Promise.resolve({ id: code }) });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return regionsController.handleUpdate(request, { params: Promise.resolve({ id: code }) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return regionsController.handleDelete(request, { params: Promise.resolve({ id: code }) });
}