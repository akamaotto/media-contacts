import { NextResponse } from 'next/server';
import { generateMediaContactsTemplate, getTemplateFilename } from '@/lib/templates/excel-template';
import { auth } from '../../../../../auth';

/**
 * GET handler for Excel template download
 * Provides a downloadable Excel template for media contacts upload
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate the Excel template
    const templateBuffer = generateMediaContactsTemplate();
    const filename = getTemplateFilename();

    // Create response with proper headers for Excel download
    const response = new NextResponse(templateBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': templateBuffer.length.toString(),
      },
    });

    return response;
  } catch (error) {
    console.error('Error generating Excel template:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate template',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
