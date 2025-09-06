/**
 * Profile API Routes (/api/profile)
 * Handles current user profile operations
 */

import { NextRequest } from 'next/server';
import { getUserController } from '../users/factory';

const controller = getUserController();

export async function GET(request: NextRequest) {
  return controller.handleGetCurrentUser(request);
}

export async function PUT(request: NextRequest) {
  return controller.handleUpdateProfile(request);
}