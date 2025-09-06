/**
 * Media Contacts Search API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMediaContactsService } from '../factory';
import { RequestContext } from '../../shared/types';
import { APIError } from '../../shared/errors';

/**
 * GET /api/media-contacts/search - Search media contacts for autocomplete
 */
export async function GET(request: NextRequest) {
  try {
    const service = getMediaContactsService();
    
    // Build request context
    const session = await auth();
    const context: RequestContext = {
      userId: session?.user?.id || null,
      userRole: session?.user?.role || null,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
          request.headers.get('x-real-ip') || 
          undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    if (query.length < 2) {
      return NextResponse.json({ 
        success: true,
        data: [] 
      });
    }

    // Search contacts
    const contacts = await service.searchContacts(query, limit, context);

    // Prepare response
    const response = NextResponse.json({
      success: true,
      data: contacts
    });

    // Add caching headers
    response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    return response;

  } catch (error) {
    console.error('Error searching media contacts:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          code: error.type
        },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to search media contacts'
      },
      { status: 500 }
    );
  }
}