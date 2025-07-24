import { NextRequest, NextResponse } from 'next/server';
import { importMediaContactsFromCsv } from '@/backend/csv/actions';
import { auth } from '../../../../../auth';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * POST handler for CSV import API
 * Handles file upload and calls backend import function
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
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

    // Call backend import function
    const result = await importMediaContactsFromCsv({
      filePath,
      dryRun: false,
      onProgress: (progress) => {
        // Progress updates could be sent via WebSocket or Server-Sent Events
        // For now, we'll just log them
        console.log(`Import progress: ${progress.percentage}%`);
      }
    });

    // Transform result to match frontend expectations
    const response = {
      success: result.success,
      totalRows: result.totalRows,
      importedCount: result.validRows,
      errorRows: result.invalidRows,
      errors: result.errors,
      message: result.success 
        ? `Successfully imported ${result.validRows} contacts` 
        : result.error || 'Import failed'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in CSV import API route:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        totalRows: 0,
        importedCount: 0,
        errorRows: 0,
        errors: []
      },
      { status: 500 }
    );
  }
}
