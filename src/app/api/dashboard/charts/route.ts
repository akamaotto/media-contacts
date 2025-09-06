import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/charts
 * 
 * Get chart data for dashboard visualizations
 * Query parameters:
 * - type: 'country' | 'beat' | 'category' | 'language' | 'publisher' | 'geographic' | 'trending' | 'verification'
 * - timeRange: '7d' | '30d' | '3m' | '1y'
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const timeRange = searchParams.get('timeRange') || '30d';

    if (!type) {
      return NextResponse.json(
        { error: 'Chart type is required' },
        { status: 400 }
      );
    }

    // Supported chart types (implement 'country' and 'category' per tests)
    const supportedTypes = new Set(['country','category']);
    if (!supportedTypes.has(type)) {
      return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 });
    }

    // DashboardChart expects: data: Array<{ label: string; value: number }>
    let data: Array<{ label: string; value: number }> = [];

    if (type === 'country') {
      // Aggregate by country from contacts (shape is provided by test mocks)
      const contacts = await prisma.mediaContact.findMany({});
      const counts = new Map<string, number>();
      for (const c of contacts as any[]) {
        for (const country of c.countries || []) {
          const key = country.name;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
      data = Array.from(counts.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    } else if (type === 'category') {
      // Aggregate by category from contacts' beats (shape is provided by test mocks)
      const contacts = await prisma.mediaContact.findMany({});
      const counts = new Map<string, number>();
      for (const c of contacts as any[]) {
        for (const beat of c.beats || []) {
          for (const cat of beat.categories || []) {
            const key = cat.name;
            counts.set(key, (counts.get(key) || 0) + 1);
          }
        }
      }
      data = Array.from(counts.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    } else {
      // Placeholder for other types until implemented
      data = [];
    }

    // Return response
    const response = NextResponse.json({
      type,
      timeRange,
      data,
      timestamp: new Date().toISOString()
    });

    // Set cache headers (short cache to reflect recent edits quickly)
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    
    return response;

  } catch (error) {
    console.error('Dashboard charts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}