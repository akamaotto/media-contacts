/**
 * Feature Flags Audit Log API Route
 * GET /api/feature-flags/audit - Get all audit logs
 * GET /api/feature-flags/audit?analytics=true - Get audit log analytics
 * GET /api/feature-flags/audit?export=true - Export audit log to CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  GET_ALL_AUDIT_LOGS,
  GET_AUDIT_ANALYTICS,
  EXPORT_AUDIT_LOG
} from '@/lib/api/feature-flag-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const analytics = searchParams.get('analytics') === 'true';
  const exportCsv = searchParams.get('export') === 'true';

  if (analytics) {
    return GET_AUDIT_ANALYTICS(request);
  } else if (exportCsv) {
    return EXPORT_AUDIT_LOG(request);
  } else {
    return GET_ALL_AUDIT_LOGS(request);
  }
}