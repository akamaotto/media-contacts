/**
 * Media Contacts Export API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getMediaContactsService } from '../factory';
import { RequestContext } from '../../shared/types';
import { APIError } from '../../shared/errors';
import { stringify } from 'csv-stringify/sync';

/**
 * POST /api/media-contacts/export - Export media contacts to CSV
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
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

    // Build request context
    const context: RequestContext = {
      userId: session.user.id,
      userRole: session.user.role || null,
      traceId: `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    // Parse request body
    const body = await req.json();
    const { fields, filters } = body;

    // Validate required fields
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Fields array is required and must not be empty' 
        },
        { status: 400 }
      );
    }

    // Get contacts using the service
    const service = getMediaContactsService();
    const result = await service.getAll(filters, { page: 1, pageSize: 10000 }, context);

    // Prepare data for CSV export
    const csvData = result.data.map(contact => {
      const row: any = {};
      
      // Add requested fields
      fields.forEach(field => {
        switch (field) {
          case 'id':
            row.id = contact.id;
            break;
          case 'name':
            row.name = contact.name;
            break;
          case 'email':
            row.email = contact.email;
            break;
          case 'title':
            row.title = contact.title;
            break;
          case 'bio':
            row.bio = contact.bio || '';
            break;
          case 'email_verified_status':
            row.email_verified_status = contact.email_verified_status ? 'true' : 'false';
            break;
          case 'socials':
            row.socials = Array.isArray(contact.socials) ? contact.socials.join(', ') : '';
            break;
          case 'authorLinks':
            row.authorLinks = Array.isArray(contact.authorLinks) ? contact.authorLinks.join(', ') : '';
            break;
          case 'outlets':
            row.outlets = Array.isArray(contact.outlets) ? contact.outlets.map((o: any) => o.name).join(', ') : '';
            break;
          case 'countries':
            row.countries = Array.isArray(contact.countries) ? contact.countries.map((c: any) => c.name).join(', ') : '';
            break;
          case 'beats':
            row.beats = Array.isArray(contact.beats) ? contact.beats.map((b: any) => b.name).join(', ') : '';
            break;
          case 'created_at':
            row.created_at = contact.createdAt ? new Date(contact.createdAt).toISOString() : '';
            break;
          case 'updated_at':
            row.updated_at = contact.updatedAt ? new Date(contact.updatedAt).toISOString() : '';
            break;
        }
      });
      
      return row;
    });

    // Generate CSV
    const csv = stringify(csvData, {
      header: true,
      columns: fields
    });

    // Return CSV content
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="media-contacts-export.csv"'
      }
    });

  } catch (error) {
    console.error('Error in CSV export API route:', error);
    
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
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}