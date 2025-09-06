import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma';
import { cacheService, CacheKeys } from '../../shared/cache-service';

export const dynamic = 'force-dynamic';

// Define the region type
interface RegionResult {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  count: bigint;
}

interface RegionResponse {
  id: string;
  label: string;
  code: string | null;
  category: string | null;
  count: number;
}

/**
 * GET /api/filters/regions - Get popular regions and search suggestions
 * Returns popular regions by default (top 5 by country count)
 * With search query, returns matching regions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // Allow requests without auth for debugging
    if (!session?.user) {
      console.warn('Regions filter API: No session found, but allowing request for debugging');
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('s') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 50);

    // Cache key for popular items
    const cacheKey = CacheKeys.filters.regions(query, limit);
    const cached = cacheService.get<{items: RegionResponse[]}>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let regions: RegionResult[];
    
    if (query.length === 0) {
      // Get popular regions (top 5 by country count)
      regions = await prisma.$queryRaw`
        SELECT 
          r.id,
          r.name,
          r.code,
          r.category,
          COUNT(c.id) as count
        FROM regions r
        LEFT JOIN "_CountryRegions" cr ON r.id = cr."B"
        LEFT JOIN countries c ON cr."A" = c.id
        GROUP BY r.id, r.name, r.code, r.category
        ORDER BY COUNT(c.id) DESC, r.name ASC
        LIMIT ${limit}
      ` as RegionResult[];
    } else {
      // Search regions with query
      regions = await prisma.$queryRaw`
        SELECT 
          r.id,
          r.name,
          r.code,
          r.category,
          COUNT(c.id) as count
        FROM regions r
        LEFT JOIN "_CountryRegions" cr ON r.id = cr."B"
        LEFT JOIN countries c ON cr."A" = c.id
        WHERE r.name ILIKE ${`%${query}%`} OR r.code ILIKE ${`%${query}%`}
        GROUP BY r.id, r.name, r.code, r.category
        ORDER BY 
          CASE 
            WHEN r.name ILIKE ${query + '%'} THEN 1
            WHEN r.name ILIKE ${'%' + query + '%'} THEN 2
            ELSE 3
          END,
          COUNT(c.id) DESC,
          r.name ASC
        LIMIT ${limit}
      ` as RegionResult[];
    }

    const result = {
      items: regions.map((region) => ({
        id: region.id,
        label: region.name,
        code: region.code,
        category: region.category,
        count: Number(region.count)
      }))
    };

    // Cache for 10 minutes
    cacheService.set(cacheKey, result, 600);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching region suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch region suggestions' }, { status: 500 });
  }
}