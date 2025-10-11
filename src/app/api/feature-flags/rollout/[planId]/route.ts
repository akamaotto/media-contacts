/**
 * Individual Rollout Plan API Route
 * GET /api/feature-flags/rollout/[planId] - Get a specific rollout plan
 * POST /api/feature-flags/rollout/[planId] - Pause, resume, or cancel a rollout plan
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  GET_ROLLOUT_PLAN,
  PAUSE_AUTOMATED_ROLLOUT,
  RESUME_AUTOMATED_ROLLOUT,
  CANCEL_AUTOMATED_ROLLOUT
} from '@/lib/api/feature-flag-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  const { planId } = params;
  return GET_ROLLOUT_PLAN(planId);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  const { planId } = params;
  const body = await request.json().catch(() => ({}));
  const { action } = body;

  switch (action) {
    case 'pause':
      return PAUSE_AUTOMATED_ROLLOUT(planId, request);
    case 'resume':
      return RESUME_AUTOMATED_ROLLOUT(planId);
    case 'cancel':
      return CANCEL_AUTOMATED_ROLLOUT(planId, request);
    default:
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use: pause, resume, or cancel'
      }, { status: 400 });
  }
}