import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma';
import { cacheService, CacheKeys } from '../../shared/cache-service';

export const dynamic = 'force-dynamic';

// Define the beat type
interface BeatResult {
  id: string;
  name: string;
  description: string | null;
  count: bigint;
}

interface BeatResponse {
  id: string;
  label: string;
  description: string | null;
  count: number;
}

/**
 * GET /api/filters/beats - Get popular beats and search suggestions
 * Returns popular beats by default (top 5 by contact count)
 * With search query, returns matching beats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // Allow requests without auth for debugging
    if (!session?.user) {
      console.warn('Beats filter API: No session found, but allowing request for debugging');
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('s') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 50);

    // Cache key for popular items
    const cacheKey = CacheKeys.filters.beats(query, limit);
    const cached = cacheService.get<{items: BeatResponse[]}>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let beats: BeatResult[];
    
    if (query.length === 0) {
      // Get popular beats (top 5 by contact count)
      beats = await prisma.$queryRaw`
        SELECT 
          b.id,
          b.name,
          b.description,
          COUNT(DISTINCT mc.id) as count
        FROM beats b
        LEFT JOIN "_MediaContactBeats" mcb ON mcb."A" = b.id
        LEFT JOIN media_contacts mc ON mc.id = mcb."B"
        GROUP BY b.id, b.name, b.description
        ORDER BY COUNT(DISTINCT mc.id) DESC, b.name ASC
        LIMIT ${limit}
      ` as BeatResult[];
    } else {
      // Search beats with query
      beats = await prisma.$queryRaw`
        SELECT 
          b.id,
          b.name,
          b.description,
          COUNT(DISTINCT mc.id) as count
        FROM beats b
        LEFT JOIN "_MediaContactBeats" mcb ON mcb."A" = b.id
        LEFT JOIN media_contacts mc ON mc.id = mcb."B"
        WHERE b.name ILIKE ${`%${query}%`}
        GROUP BY b.id, b.name, b.description
        ORDER BY 
          CASE 
            WHEN b.name ILIKE ${query + '%'} THEN 1
            WHEN b.name ILIKE ${'%' + query + '%'} THEN 2
            ELSE 3
          END,
          COUNT(DISTINCT mc.id) DESC,
          b.name ASC
        LIMIT ${limit}
      ` as BeatResult[];
    }

    const result = {
      items: beats.map((beat) => ({
        id: beat.id,
        label: beat.name,
        description: beat.description,
        count: Number(beat.count)
      }))
    };

    // Cache for 10 minutes
    cacheService.set(cacheKey, result, 600);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching beat suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch beat suggestions' }, { status: 500 });
  }
}
