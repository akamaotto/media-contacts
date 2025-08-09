import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reference - Get all reference data in one call
 * This replaces multiple server action calls for countries, beats, regions, languages
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🚀 [REFERENCE-API] Starting reference data fetch...');
    const startTime = Date.now();

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all reference data in parallel - single database round trip
    const [countries, beats, regions, languages, outlets] = await Promise.all([
      prisma.country.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          phone_code: true,
          capital: true,
          flag_emoji: true
        },
        orderBy: { name: 'asc' }
      }),
      
      prisma.beat.findMany({
        select: {
          id: true,
          name: true,
          description: true
        },
        orderBy: { name: 'asc' }
      }),
      
      prisma.region.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          category: true
        },
        orderBy: { name: 'asc' }
      }),
      
      prisma.language.findMany({
        select: {
          id: true,
          name: true,
          code: true
        },
        orderBy: { name: 'asc' }
      }),
      
      prisma.outlet.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          website: true
        },
        orderBy: { name: 'asc' }
      })
    ]);

    const totalTime = Date.now() - startTime;
    console.log(`✅ [REFERENCE-API] Reference data fetched in ${totalTime}ms`);

    const response = NextResponse.json({
      countries,
      beats,
      regions,
      languages,
      outlets,
      performance: {
        totalTime,
        counts: {
          countries: countries.length,
          beats: beats.length,
          regions: regions.length,
          languages: languages.length,
          outlets: outlets.length
        }
      }
    });

    // Cache reference data for 5 minutes since it doesn't change often
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');

    return response;

  } catch (error) {
    console.error('❌ [REFERENCE-API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch reference data' }, { status: 500 });
  }
}