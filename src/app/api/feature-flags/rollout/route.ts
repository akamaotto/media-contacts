/**
 * Feature Flags Rollout API Route
 * GET /api/feature-flags/rollout - Get rollout strategies or active plans
 * POST /api/feature-flags/rollout - Create custom rollout strategy
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  GET_ROLLOUT_STRATEGIES,
  GET_ACTIVE_ROLLOUT_PLANS
} from '@/lib/api/feature-flag-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const active = searchParams.get('active') === 'true';

  if (active) {
    return GET_ACTIVE_ROLLOUT_PLANS();
  } else {
    return GET_ROLLOUT_STRATEGIES();
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { action } = body;

  switch (action) {
    default:
      return NextResponse.json({
        success: false,
        error: 'Invalid action'
      }, { status: 400 });
  }
}