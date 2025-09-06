/**
 * Media Contacts Individual Item API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMediaContactsService } from '../factory';
import { RequestContext } from '../../shared/types';
import { APIError } from '../../shared/errors';
import { UpdateMediaContactData } from '../types';

/**
 * GET /api/media-contacts/[id] - Get a specific media contact by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const service = getMediaContactsService();
    const { id } = await params;
    
    // Build request context
    const session = await auth();
    const context: RequestContext = {
      userId: session?.user?.id || null,
      userRole: session?.user?.role || null,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Get contact
    const contact = await service.getById(id, context);
    
    if (!contact) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Media contact not found'
        },
        { status: 404 }
      );
    }

    // Prepare response
    const response = NextResponse.json({
      success: true,
      data: contact
    });

    // Add caching headers
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    
    return response;

  } catch (error) {
    console.error('Error fetching media contact:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          type: error.type
        },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch media contact'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/media-contacts/[id] - Update a specific media contact by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const service = getMediaContactsService();
    const { id } = await params;
    
    // Build request context
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required'
        },
        { status: 401 }
      );
    }
    
    const context: RequestContext = {
      userId: session.user.id,
      userRole: session.user.role || null,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Parse request body
    const body = await request.json();
    const updateData: UpdateMediaContactData = {
      name: body.name,
      email: body.email,
      title: body.title,
      bio: body.bio,
      email_verified_status: body.email_verified_status,
      socials: body.socials,
      authorLinks: body.authorLinks,
      outletIds: body.outletIds,
      countryIds: body.countryIds,
      beatIds: body.beatIds
    };

    // Update contact
    const contact = await service.update(id, updateData, context);

    // Prepare response
    return NextResponse.json(
      { 
        success: true,
        data: contact,
        message: 'Media contact updated successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating media contact:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          type: error.type
        },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update media contact'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media-contacts/[id] - Delete a specific media contact by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const service = getMediaContactsService();
    const { id } = await params;
    
    // Build request context
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required'
        },
        { status: 401 }
      );
    }
    
    const context: RequestContext = {
      userId: session.user.id,
      userRole: session.user.role || null,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Delete contact
    await service.delete(id, context);

    // Prepare response
    return NextResponse.json(
      { 
        success: true,
        message: 'Media contact deleted successfully'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting media contact:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          type: error.type
        },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete media contact'
      },
      { status: 500 }
    );
  }
}