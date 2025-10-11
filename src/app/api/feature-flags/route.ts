/**
 * Feature Flags API Route
 * GET /api/feature-flags - Get all feature flags
 * POST /api/feature-flags - Create a new feature flag
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  GET_ALL_FLAGS,
  CREATE_FLAG,
  INITIALIZE_FLAGS,
  GET_ALL_AUDIT_LOGS,
  BULK_UPDATE_FLAGS
} from '@/lib/api/feature-flag-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'audit':
      return GET_ALL_AUDIT_LOGS(request);
    default:
      return GET_ALL_FLAGS();
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { action } = body;

  switch (action) {
    case 'initialize':
      return INITIALIZE_FLAGS();
    case 'bulk-update':
      return BULK_UPDATE_FLAGS(request);
    default:
      return CREATE_FLAG(request);
  }
}