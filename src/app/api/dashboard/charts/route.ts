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
    // Check authentication
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

    // Calculate date filter based on time range
    const now = new Date();
    let dateFilter: Date;
    
    switch (timeRange) {
      case '7d':
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3m':
        dateFilter = new Date(now);
        dateFilter.setMonth(dateFilter.getMonth() - 3);
        break;
      case '1y':
        dateFilter = new Date(now);
        dateFilter.setFullYear(dateFilter.getFullYear() - 1);
        break;
      default:
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    let chartData: any[] = [];

    // Generate chart data based on type
    switch (type) {
      case 'category':
        // Get contacts grouped by category
        const categoryData = await prisma.mediaContact.findMany({
          where: {
            created_at: {
              gte: dateFilter
            }
          },
          include: {
            beats: {
              include: {
                categories: true
              }
            }
          }
        });

        // Process category data
        const categoryMap = new Map<string, { count: number; color?: string }>();
        
        categoryData.forEach(contact => {
          contact.beats.forEach(beat => {
            beat.categories.forEach(category => {
              const existing = categoryMap.get(category.name) || { count: 0, color: category.color };
              categoryMap.set(category.name, { 
                count: existing.count + 1, 
                color: category.color || existing.color 
              });
            });
          });
        });

        const warmBlueColors = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE', '#1E3A8A', '#1D4ED8', '#2563EB'];
        
        chartData = Array.from(categoryMap.entries()).map(([name, data], index) => ({
          label: name,
          value: data.count,
          color: data.color || warmBlueColors[index % warmBlueColors.length],
          metadata: {
            description: `${data.count} contacts in this category`
          }
        }));
        break;

      case 'country':
        // Get contacts grouped by country
        const countryData = await prisma.mediaContact.findMany({
          where: {
            created_at: {
              gte: dateFilter
            }
          },
          include: {
            countries: true
          }
        });

        // Process country data
        const countryMap = new Map<string, { count: number; code?: string; flagEmoji?: string }>();
        
        countryData.forEach(contact => {
          contact.countries.forEach(country => {
            const existing = countryMap.get(country.name) || { count: 0 };
            countryMap.set(country.name, { 
              count: existing.count + 1,
              code: country.code || existing.code,
              flagEmoji: country.flag_emoji || existing.flagEmoji
            });
          });
        });

        chartData = Array.from(countryMap.entries())
          .map(([name, data]) => ({
            label: name,
            value: data.count,
            color: '#3B82F6',
            metadata: {
              countryCode: data.code,
              flagEmoji: data.flagEmoji,
              description: `${data.count} contacts from ${name}`
            }
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10); // Top 10 countries
        break;

      case 'beat':
        // Get contacts grouped by beat
        const beatData = await prisma.mediaContact.findMany({
          where: {
            created_at: {
              gte: dateFilter
            }
          },
          include: {
            beats: true
          }
        });

        // Process beat data
        const beatMap = new Map<string, number>();
        
        beatData.forEach(contact => {
          contact.beats.forEach(beat => {
            const existing = beatMap.get(beat.name) || 0;
            beatMap.set(beat.name, existing + 1);
          });
        });

        chartData = Array.from(beatMap.entries()).map(([name, count]) => ({
          label: name,
          value: count,
          color: '#3B82F6',
          metadata: {
            description: `${count} contacts covering this beat`
          }
        }));
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid chart type' },
          { status: 400 }
        );
    }

    // Return chart data
    const response = NextResponse.json({
      type,
      timeRange,
      data: chartData,
      timestamp: new Date().toISOString()
    });

    // Set cache headers (cache for 5 minutes)
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    return response;

  } catch (error) {
    console.error('Dashboard charts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}