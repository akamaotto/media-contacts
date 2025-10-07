import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma';
import { cacheService, CacheKeys } from '../../shared/cache-service';

export const dynamic = 'force-dynamic';

// Define the outlet type
interface OutletResult {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  count: bigint;
}

interface OutletResponse {
  id: string;
  label: string;
  description: string | null;
  website: string | null;
  count: number;
}

/**
 * GET /api/filters/outlets - Get popular outlets and search suggestions
 * Returns popular outlets by default (top 5 by contact count)
 * With search query, returns matching outlets
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // Allow requests without auth for debugging
    if (!session?.user) {
      console.warn('Outlets filter API: No session found, but allowing request for debugging');
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('s') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 50);

    // Cache key for popular items
    const cacheKey = CacheKeys.filters.outlets(query, limit);
    const cached = cacheService.get<{items: OutletResponse[]}>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let outlets: OutletResult[];
    
    if (query.length === 0) {
      // Get popular outlets (top 5 by contact count)
      outlets = await prisma.$queryRaw`
        SELECT 
          o.id,
          o.name,
          o.description,
          o.website,
          COUNT(DISTINCT mc.id) as count
        FROM outlets o
        LEFT JOIN "_MediaContactOutlets" mco ON mco."B" = o.id
        LEFT JOIN media_contacts mc ON mc.id = mco."A"
        GROUP BY o.id, o.name, o.description, o.website
        ORDER BY COUNT(DISTINCT mc.id) DESC, o.name ASC
        LIMIT ${limit}
      ` as OutletResult[];
    } else {
      // Search outlets with query
      outlets = await prisma.$queryRaw`
        SELECT 
          o.id,
          o.name,
          o.description,
          o.website,
          COUNT(DISTINCT mc.id) as count
        FROM outlets o
        LEFT JOIN "_MediaContactOutlets" mco ON mco."B" = o.id
        LEFT JOIN media_contacts mc ON mc.id = mco."A"
        WHERE o.name ILIKE ${`%${query}%`}
        GROUP BY o.id, o.name, o.description, o.website
        ORDER BY 
          CASE 
            WHEN o.name ILIKE ${query + '%'} THEN 1
            WHEN o.name ILIKE ${'%' + query + '%'} THEN 2
            ELSE 3
          END,
          COUNT(DISTINCT mc.id) DESC,
          o.name ASC
        LIMIT ${limit}
      ` as OutletResult[];
    }

    const result = {
      items: outlets.map((outlet) => ({
        id: outlet.id,
        label: outlet.name,
        description: outlet.description,
        website: outlet.website,
        count: Number(outlet.count)
      }))
    };

    // Cache for 10 minutes
    cacheService.set(cacheKey, result, 600);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching outlet suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch outlet suggestions' }, { status: 500 });
  }
}
