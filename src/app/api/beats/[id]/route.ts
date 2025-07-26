import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateBeat, deleteBeat } from '@/backend/beats/actions';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Beat name is required' },
        { status: 400 }
      );
    }

    // Update beat in database
    const updatedBeat = await updateBeat(id, {
      name: name.trim(),
      description: description?.trim() || undefined,
    });

    return NextResponse.json({
      message: 'Beat updated successfully',
      beat: updatedBeat
    });
  } catch (error) {
    console.error('Error updating beat:', error);
    
    // Handle specific error messages from backend
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update beat' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;

    // Delete beat from database
    const result = await deleteBeat(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting beat:', error);
    
    // Handle specific error messages from backend
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to delete beat' },
      { status: 500 }
    );
  }
}
