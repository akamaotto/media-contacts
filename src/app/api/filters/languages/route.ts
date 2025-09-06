import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma';
import { cacheService, CacheKeys } from '../../shared/cache-service';

export const dynamic = 'force-dynamic';

// Define the language type
interface LanguageResult {
  id: string;
  name: string;
  code: string | null;
  count: bigint;
}

interface LanguageResponse {
  id: string;
  label: string;
  code: string | null;
  count: number;
}

/**
 * GET /api/filters/languages - Get popular languages and search suggestions
 * Returns popular languages by default (top 5 by country count)
 * With search query, returns matching languages
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // Allow requests without auth for debugging
    if (!session?.user) {
      console.warn('Languages filter API: No session found, but allowing request for debugging');
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('s') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 50);

    // Cache key for popular items
    const cacheKey = CacheKeys.filters.languages(query, limit);
    const cached = cacheService.get<{items: LanguageResponse[]}>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let languages: LanguageResult[];
    
    if (query.length === 0) {
      // Get popular languages (top 5 by country count)
      languages = await prisma.$queryRaw`
        SELECT 
          l.id,
          l.name,
          l.code,
          COUNT(c.id) as count
        FROM languages l
        LEFT JOIN "_CountryToLanguage" ctl ON l.id = ctl."B"
        LEFT JOIN countries c ON ctl."A" = c.id
        GROUP BY l.id, l.name, l.code
        ORDER BY COUNT(c.id) DESC, l.name ASC
        LIMIT ${limit}
      ` as LanguageResult[];
    } else {
      // Search languages with query
      languages = await prisma.$queryRaw`
        SELECT 
          l.id,
          l.name,
          l.code,
          COUNT(c.id) as count
        FROM languages l
        LEFT JOIN "_CountryToLanguage" ctl ON l.id = ctl."B"
        LEFT JOIN countries c ON ctl."A" = c.id
        WHERE l.name ILIKE ${`%${query}%`} OR l.code ILIKE ${`%${query}%`}
        GROUP BY l.id, l.name, l.code
        ORDER BY 
          CASE 
            WHEN l.name ILIKE ${query + '%'} THEN 1
            WHEN l.name ILIKE ${'%' + query + '%'} THEN 2
            ELSE 3
          END,
          COUNT(c.id) DESC,
          l.name ASC
        LIMIT ${limit}
      ` as LanguageResult[];
    }

    const result = {
      items: languages.map((language) => ({
        id: language.id,
        label: language.name,
        code: language.code,
        count: Number(language.count)
      }))
    };

    // Cache for 10 minutes
    cacheService.set(cacheKey, result, 600);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching language suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch language suggestions' }, { status: 500 });
  }
}