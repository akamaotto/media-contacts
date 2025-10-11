/**
 * Individual Feature Flag API Route
 * GET /api/feature-flags/[id] - Get a specific feature flag
 * PUT /api/feature-flags/[id] - Update a feature flag
 * DELETE /api/feature-flags/[id] - Delete a feature flag
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  GET_FLAG,
  UPDATE_FLAG,
  DELETE_FLAG,
  GET_FLAG_STATS,
  GET_FLAG_AUDIT_LOG,
  EMERGENCY_ROLLBACK,
  GRADUAL_ROLLOUT,
  EVALUATE_FLAG,
  GET_FLAG_HEALTH,
  START_AUTOMATED_ROLLOUT
} from '@/lib/api/feature-flag-api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  switch (action) {
    case 'stats':
      return GET_FLAG_STATS(id, request);
    case 'audit':
      return GET_FLAG_AUDIT_LOG(id, request);
    case 'health':
      return GET_FLAG_HEALTH(id, request);
    default:
      return GET_FLAG(id);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  return UPDATE_FLAG(id, request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  return DELETE_FLAG(id, request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const body = await request.json().catch(() => ({}));
  const { action } = body;

  switch (action) {
    case 'emergency-rollback':
      return EMERGENCY_ROLLBACK(id, request);
    case 'gradual-rollout':
      return GRADUAL_ROLLOUT(id, request);
    case 'automated-rollout':
      return START_AUTOMATED_ROLLOUT(id, request);
    case 'evaluate':
      return EVALUATE_FLAG(id, request);
    default:
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use: emergency-rollback, gradual-rollout, automated-rollout, or evaluate'
      }, { status: 400 });
  }
}