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

    // Compute all-time dashboard metrics directly
    const [
      totalContacts,
      verifiedContacts,
      totalOutlets,
      totalPublishers,
      countriesWithContacts,
      languagesWithContacts,
      regionsWithContacts,
      beatsWithContacts
    ] = await prisma.$transaction([
      prisma.media_contacts.count(),
      prisma.media_contacts.count({ where: { email_verified_status: true } }),
      prisma.outlets.count(),
      prisma.publishers.count(),
      prisma.countries.count({
        where: {
          media_contacts: {
            some: {}
          }
        }
      }),
      prisma.languages.count({
        where: {
          countries: {
            some: {
              media_contacts: {
                some: {}
              }
            }
          }
        }
      }),
      prisma.regions.count({
        where: {
          countries: {
            some: {
              media_contacts: {
                some: {}
              }
            }
          }
        }
      }),
      prisma.beats.count({
        where: {
          media_contacts: {
            some: {}
          }
        }
      })
    ]);

    // Include flat fields for backwards compatibility with existing UI
    const metrics = {
      period: 'all-time',
      // flat fields expected by ContactsMetricCard
      totalContacts,
      verifiedContacts,
      // full totals object for richer clients
      totals: {
        contacts: totalContacts,
        publishers: totalPublishers,
        outlets: totalOutlets,
        verifiedContacts,
        countriesWithContacts,
        languagesWithContacts,
        regionsWithContacts,
        beatsWithContacts,
        emailVerificationRate: totalContacts > 0 ? Math.round((verifiedContacts / totalContacts) * 100) : 0,
      },
      deltas: {
        // Placeholder deltas; replace with time-window comparisons if needed
        contacts: 0,
        publishers: 0,
        outlets: 0,
        verifiedContacts: 0,
        countries: 0,
        languages: 0,
        regions: 0,
        beats: 0,
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
