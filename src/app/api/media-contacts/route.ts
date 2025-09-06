/**
 * Media Contacts API Routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMediaContactsService } from './factory';
import { RequestContext, APIResponse } from '../shared/types';
import { APIError } from '../shared/errors';
import { MediaContact, CreateMediaContactData, UpdateMediaContactData, MediaContactsFilters } from './types';

/**
 * GET /api/media-contacts - Get all media contacts with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const service = getMediaContactsService();
    
    // Build request context
    const session = await auth();
    const context: RequestContext = {
      userId: session?.user?.id || null,
      userRole: session?.user?.role || null,
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10')));
    const searchTerm = searchParams.get('searchTerm') || undefined;
    const countryIds = searchParams.get('countryIds')?.split(',').filter(Boolean) || undefined;
    const beatIds = searchParams.get('beatIds')?.split(',').filter(Boolean) || undefined;
    const outletIds = searchParams.get('outletIds')?.split(',').filter(Boolean) || undefined;
    const regionCodes = searchParams.get('regionCodes')?.split(',').filter(Boolean) || undefined;
    const languageCodes = searchParams.get('languageCodes')?.split(',').filter(Boolean) || undefined;
    const emailVerified = searchParams.get('emailVerified') || undefined;
    const sortBy = searchParams.get('sortBy') || undefined;
    const sortOrder = searchParams.get('sortOrder') || undefined;

    // Build filters - only include properties that have actual values
    const filters: MediaContactsFilters = {
      emailVerified: 'all' // Provide default value for required field
    };
    
    if (searchTerm) {
      filters.search = searchTerm;
    }
    
    if (countryIds && countryIds.length > 0) {
      filters.countryIds = countryIds;
    }
    
    if (beatIds && beatIds.length > 0) {
      filters.beatIds = beatIds;
    }
    
    if (outletIds && outletIds.length > 0) {
      filters.outletIds = outletIds;
    }
    
    if (regionCodes && regionCodes.length > 0) {
      filters.regionCodes = regionCodes;
    }
    
    if (languageCodes && languageCodes.length > 0) {
      filters.languageCodes = languageCodes;
    }
    
    if (emailVerified && emailVerified !== 'all') {
      filters.emailVerified = emailVerified as 'verified' | 'unverified';
    }
    
    if (sortBy) {
      filters.sortBy = sortBy;
    }
    
    if (sortOrder) {
      filters.sortOrder = sortOrder as 'asc' | 'desc';
    }

    // Get contacts
    const result = await service.getAll(filters, { page, pageSize }, context);

    // Prepare response
    const response = NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        totalCount: result.totalCount,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages
      }
    });

    // Add caching headers
    response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    
    return response;

  } catch (error) {
    console.error('Error fetching media contacts:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
        },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch media contacts'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/media-contacts - Create a new media contact
 */
export async function POST(request: NextRequest) {
  try {
    const service = getMediaContactsService();
    
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
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Parse request body
    const body = await request.json();
    const createData: CreateMediaContactData = {
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

    // Create contact
    const contact = await service.create(createData, context);

    // Prepare response
    return NextResponse.json(
      { 
        success: true,
        data: contact,
        message: 'Media contact created successfully'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating media contact:', error);
    
    if (error instanceof APIError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
        },
        { status: error.statusCode }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create media contact'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/media-contacts/:id - Update an existing media contact
 */
export async function PUT(request: NextRequest) {
  try {
    const service = getMediaContactsService();
    
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
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Parse request URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const contactId = pathParts[pathParts.length - 1];

    // Validate contact ID
    if (!contactId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Contact ID is required'
        },
        { status: 400 }
      );
    }

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
    const contact = await service.update(contactId, updateData, context);

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
 * DELETE /api/media-contacts/:id - Delete an existing media contact
 */
export async function DELETE(request: NextRequest) {
  try {
    const service = getMediaContactsService();
    
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
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Parse request URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const contactId = pathParts[pathParts.length - 1];

    // Validate contact ID
    if (!contactId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Contact ID is required'
        },
        { status: 400 }
      );
    }

    // Delete contact
    await service.delete(contactId, context);

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
