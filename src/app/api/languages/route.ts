import { NextRequest } from 'next/server';
import { getLanguagesController } from './factory';

// Get controller instance
const languagesController = getLanguagesController();

export async function GET(request: NextRequest) {
  return languagesController.handleGetAll(request);
}

export async function POST(request: NextRequest) {
  return languagesController.handleCreate(request);
}