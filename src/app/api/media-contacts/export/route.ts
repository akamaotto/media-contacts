import { NextRequest, NextResponse } from 'next/server';
import { exportMediaContactsToCsv } from '@/backend/csv/actions';
import { auth } from '../../../../../auth';

/**
 * POST handler for CSV export API
 * Provides a dedicated API endpoint for exporting media contacts to CSV
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { fields, filters } = body;

    // Validate required fields
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { error: 'Fields array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Call backend export function
    const result = await exportMediaContactsToCsv({
      fields,
      filters: filters || {}
    });

    if (result.success && result.data) {
      // Transform backend response to match frontend expectations
      return NextResponse.json({
        success: true,
        csvContent: result.data,
        exportedCount: result.data.split('\n').length - 1, // Estimate count from CSV lines
        message: 'Export completed successfully'
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Export failed' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in CSV export API route:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}
