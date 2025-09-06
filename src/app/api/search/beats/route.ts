import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/database/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search/beats - Search beats for autocomplete
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    // TEMPORARY: Allow requests without auth for debugging (same as countries API)
    if (!session?.user) {
      console.warn('Beats search API: No session found, but allowing request for debugging');
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (query.length < 2) {
      return NextResponse.json({ beats: [] });
    }

    const beats = await prisma.beats.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: { name: 'asc' },
      take: limit
    });

    return NextResponse.json({ beats });

  } catch (error) {
    console.error('Error searching beats:', error);
    return NextResponse.json({ error: 'Failed to search beats' }, { status: 500 });
  }
}