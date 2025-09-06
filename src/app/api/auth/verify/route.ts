/**
 * Authentication API Routes (/api/auth/verify)
 * Handles user credential verification
 */

import { NextRequest } from 'next/server';
import { getUserController } from '../../users/factory';

const controller = getUserController();

export async function POST(request: NextRequest) {
  return controller.handleAuthenticate(request);
}