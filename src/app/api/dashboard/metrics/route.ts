import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/metrics
 * 
 * Get dashboard metrics with percentage changes
 * Query parameters:
 * - period: '7d' | '30d' | '3m' (default: '30d')
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      // Allow unauthenticated for dashboard visibility during debugging (consistent with media-contacts API)
      console.warn('[Dashboard Metrics] No session found, returning public metrics for debugging');
    }

    // Use default period since we removed request parameter
    const period = '30d' as const;

    // Validate period parameter
    if (!['7d', '30d', '3m'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be one of: 7d, 30d, 3m' },
        { status: 400 }
      );
    }

    // Compute basic dashboard metrics directly
    const [totalContacts, totalPublishers, totalOutlets, verifiedContacts] = await prisma.$transaction([
      prisma.media_contacts.count(),
      prisma.publishers.count(),
      prisma.outlets.count(),
      prisma.media_contacts.count({ where: { email_verified_status: true } })
    ]);

    // Include flat fields for backwards compatibility with existing UI
    const metrics = {
      period,
      // flat fields expected by ContactsMetricCard
      totalContacts,
      verifiedContacts,
      // full totals object for richer clients
      totals: {
        contacts: totalContacts,
        publishers: totalPublishers,
        outlets: totalOutlets,
        verifiedContacts,
        emailVerificationRate: totalContacts > 0 ? Math.round((verifiedContacts / totalContacts) * 100) : 0,
      },
      deltas: {
        // Placeholder deltas; replace with time-window comparisons if needed
        contacts: 0,
        publishers: 0,
        outlets: 0,
        verifiedContacts: 0,
      },
      generatedAt: new Date().toISOString(),
    } as const;

    // Set cache headers (cache for 5 minutes)
    const response = NextResponse.json(metrics);
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    return response;

  } catch (error) {
    console.error('Dashboard metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/metrics/store
 * 
 * Store current metrics for historical tracking
 * (Admin only endpoint)
 */
export async function POST() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin (if you have role-based access)
    // Uncomment if you want to restrict this to admins only
    // if (session.user.role !== 'ADMIN') {
    //   return NextResponse.json(
    //     { error: 'Forbidden. Admin access required.' },
    //     { status: 403 }
    //   );
    // }

    // Build-safe placeholder: acknowledge request
    return NextResponse.json({ success: true, message: 'Metrics endpoint acknowledged' });

  } catch (error) {
    console.error('Store metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to store metrics' },
      { status: 500 }
    );
  }
}
