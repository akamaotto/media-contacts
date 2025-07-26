import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateCountry, deleteCountry, type UpdateCountryData } from '@/backend/countries/actions';

/**
 * PUT /api/countries/[id] - Update a country
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Add the ID from params to the body
    const updateData: UpdateCountryData = {
      ...body,
      id: params.id
    };
    
    // Update country using backend action
    const result = await updateCountry(updateData);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Error updating country:', error);
    return NextResponse.json(
      { error: 'Failed to update country' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/countries/[id] - Delete a country
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Delete country using backend action
    const result = await deleteCountry(params.id);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting country:', error);
    return NextResponse.json(
      { error: 'Failed to delete country' },
      { status: 500 }
    );
  }
}
