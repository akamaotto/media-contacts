import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { activityTrackingService } from '@/backend/dashboard/activity';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/activity
 * 
 * Get recent activities with pagination and filtering
 * Query parameters:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 * - type: 'create' | 'update' | 'delete' | 'import' | 'export'
 * - entity: 'media_contact' | 'outlet' | 'publisher' | 'beat' | 'category' | 'country' | 'language' | 'region'
 * - userId: string
 * - startDate: ISO date string
 * - endDate: ISO date string
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
    
    // Parse pagination parameters
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // Max 100 items
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    // Parse filter parameters
    const type = searchParams.get('type') as 'create' | 'update' | 'delete' | 'import' | 'export' | null;
    const entity = searchParams.get('entity') as 'media_contact' | 'outlet' | 'publisher' | 'beat' | 'category' | 'country' | 'language' | 'region' | null;
    const userId = searchParams.get('userId') || undefined;
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // Validate type parameter if provided
    const validTypes = ['create', 'update', 'delete', 'import', 'export'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate entity parameter if provided
    const validEntities = ['media_contact', 'outlet', 'publisher', 'beat', 'category', 'country', 'language', 'region'];
    if (entity && !validEntities.includes(entity)) {
      return NextResponse.json(
        { error: `Invalid entity. Must be one of: ${validEntities.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse dates if provided
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateStr) {
      startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid startDate format. Use ISO date string.' },
          { status: 400 }
        );
      }
    }

    if (endDateStr) {
      endDate = new Date(endDateStr);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid endDate format. Use ISO date string.' },
          { status: 400 }
        );
      }
    }

    // Build filters object
    const filters = {
      ...(type && { type }),
      ...(entity && { entity }),
      ...(userId && { userId }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    };

    // Get activities
    const activities = await activityTrackingService.getRecentActivities(
      limit,
      offset,
      Object.keys(filters).length > 0 ? filters : undefined
    );

    // Set cache headers (cache for 2 minutes for activity data)
    const response = NextResponse.json({
      ...activities,
      pagination: {
        limit,
        offset,
        hasMore: activities.hasMore
      },
      filters: Object.keys(filters).length > 0 ? filters : null,
      timestamp: new Date().toISOString()
    });
    
    response.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=240');
    
    return response;

  } catch (error) {
    console.error('Dashboard activity API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity data' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/activity/log
 * 
 * Log a new activity (for internal use by other services)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { type, entity, entityId, entityName, details } = body;

    // Validate required fields
    if (!type || !entity || !entityId || !entityName) {
      return NextResponse.json(
        { error: 'Missing required fields: type, entity, entityId, entityName' },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ['create', 'update', 'delete', 'import', 'export'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate entity
    const validEntities = ['media_contact', 'outlet', 'publisher', 'beat', 'category', 'country', 'language', 'region'];
    if (!validEntities.includes(entity)) {
      return NextResponse.json(
        { error: `Invalid entity. Must be one of: ${validEntities.join(', ')}` },
        { status: 400 }
      );
    }

    // Log the activity
    await activityTrackingService.logActivity({
      type,
      entity,
      entityId,
      entityName,
      userId: session.user.id,
      details: details || undefined
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Activity logged successfully' 
    });

  } catch (error) {
    console.error('Log activity API error:', error);
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    );
  }
}
