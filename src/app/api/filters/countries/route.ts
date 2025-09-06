import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma';
import { cacheService, CacheKeys } from '../../shared/cache-service';

export const dynamic = 'force-dynamic';

// Define the country type
interface CountryResult {
  id: string;
  name: string;
  code: string | null;
  count: bigint;
}

interface CountryResponse {
  id: string;
  label: string;
  code: string | null;
  count: number;
}

/**
 * GET /api/filters/countries - Get popular countries and search suggestions
 * Returns popular countries by default (top 5 by contact count)
 * With search query, returns matching countries
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // Allow requests without auth for debugging
    if (!session?.user) {
      console.warn('Countries filter API: No session found, but allowing request for debugging');
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('s') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 50);

    // Cache key for popular items
    const cacheKey = CacheKeys.filters.countries(query, limit);
    const cached = cacheService.get<{items: CountryResponse[]}>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let countries: CountryResult[];
    
    if (query.length === 0) {
      // Get popular countries (top 5 by contact count)
      countries = await prisma.$queryRaw`
        SELECT 
          c.id,
          c.name,
          c.code,
          COUNT(mc.id) as count
        FROM countries c
        LEFT JOIN "_MediaContactCountries" mcc ON c.id = mcc."B"
        LEFT JOIN media_contacts mc ON mcc."A" = mc.id
        GROUP BY c.id, c.name, c.code
        ORDER BY COUNT(mc.id) DESC, c.name ASC
        LIMIT ${limit}
      ` as CountryResult[];
    } else {
      // Search countries with query
      countries = await prisma.$queryRaw`
        SELECT 
          c.id,
          c.name,
          c.code,
          COUNT(mc.id) as count
        FROM countries c
        LEFT JOIN "_MediaContactCountries" mcc ON c.id = mcc."B"
        LEFT JOIN media_contacts mc ON mcc."A" = mc.id
        WHERE c.name ILIKE ${`%${query}%`} OR c.code ILIKE ${`%${query}%`}
        GROUP BY c.id, c.name, c.code
        ORDER BY 
          CASE 
            WHEN c.name ILIKE ${query + '%'} THEN 1
            WHEN c.name ILIKE ${'%' + query + '%'} THEN 2
            ELSE 3
          END,
          COUNT(mc.id) DESC,
          c.name ASC
        LIMIT ${limit}
      ` as CountryResult[];
    }

    const result = {
      items: countries.map((country) => ({
        id: country.id,
        label: country.name,
        code: country.code,
        count: Number(country.count)
      }))
    };

    // Cache for 10 minutes
    cacheService.set(cacheKey, result, 600);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching country suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch country suggestions' }, { status: 500 });
  }
}