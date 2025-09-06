import { NextRequest } from 'next/server';
import { getRegionsController } from '../factory';

// Get controller instance
const regionsController = getRegionsController();

export async function GET(request: NextRequest) {
  return regionsController.handleSearch(request);
}