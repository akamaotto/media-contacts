import { NextRequest } from 'next/server';
import { getLanguagesController } from '../factory';

// Get controller instance
const languagesController = getLanguagesController();

export async function GET(request: NextRequest) {
  return languagesController.handleSearch(request);
}