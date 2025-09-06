/**
 * Users API Routes (/api/users)
 * Handles CRUD operations for users
 */

import { NextRequest } from 'next/server';
import { getUserController } from './factory';

const controller = getUserController();

export async function GET(request: NextRequest) {
  return controller.handleGetAll(request);
}

export async function POST(request: NextRequest) {
  return controller.handleCreate(request);
}