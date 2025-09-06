/**
 * Media Contacts Import API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { RequestContext } from '../../shared/types';
import { APIError } from '../../shared/errors';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { getMediaContactsService } from '../factory';

/**
 * POST /api/media-contacts/import - Import media contacts from CSV
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

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No file provided' 
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Only CSV files are supported' 
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File size exceeds 10MB limit' 
        },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `import-${timestamp}-${file.name}`;
    const filePath = join(uploadsDir, filename);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Parse CSV file
    const csvText = buffer.toString('utf8');
    const records: any[] = [];
    
    // Create a readable stream from the CSV text
    const stream = Readable.from(csvText);
    const parser = stream.pipe(parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    }));
    
    for await (const record of parser) {
      records.push(record);
    }

    // Process records
    const service = getMediaContactsService();
    let successCount = 0;
    let errorCount = 0;
    const errors: { row: number; error: string }[] = [];
    
    for (let i = 0; i < records.length; i++) {
      try {
        const record = records[i];
        // Map CSV fields to our data structure
        const createData = {
          name: record.name,
          email: record.email,
          title: record.title || '',
          bio: record.bio || null,
          email_verified_status: record.email_verified_status === 'true' || record.email_verified_status === '1' || false,
          socials: record.socials ? record.socials.split(',').map((s: string) => s.trim()) : [],
          authorLinks: record.authorLinks ? record.authorLinks.split(',').map((s: string) => s.trim()) : [],
          outletIds: record.outletIds ? record.outletIds.split(',').map((s: string) => s.trim()) : [],
          countryIds: record.countryIds ? record.countryIds.split(',').map((s: string) => s.trim()) : [],
          beatIds: record.beatIds ? record.beatIds.split(',').map((s: string) => s.trim()) : []
        };
        
        await service.create(createData, context);
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Return results
    return NextResponse.json({
      success: true,
      message: `Import completed: ${successCount} contacts imported, ${errorCount} errors`,
      importedCount: successCount,
      errorCount: errorCount,
      errors: errors
    });

  } catch (error) {
    console.error('Error in CSV import API route:', error);
    
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
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}