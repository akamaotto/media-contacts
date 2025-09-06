/**
 * Countries API Routes using Repository Pattern
 */

import { NextRequest } from 'next/server';
import { getCountriesController } from './factory';

const controller = getCountriesController();

export async function GET(request: NextRequest) {
  return controller.handleGetAll(request);
}

export async function POST(request: NextRequest) {
  return controller.handleCreate(request);
}