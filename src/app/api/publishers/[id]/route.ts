import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updatePublisher, deletePublisher } from '@/backend/publishers/actions';

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
    const { name, description, website } = body;

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Publisher name is required' },
        { status: 400 }
      );
    }

    // Update publisher in database
    const updatedPublisher = await updatePublisher(id, {
      name: name.trim(),
      description: description?.trim() || undefined,
      website: website?.trim() || undefined,
    });

    return NextResponse.json({
      message: 'Publisher updated successfully',
      publisher: updatedPublisher
    });
  } catch (error) {
    console.error('Error updating publisher:', error);
    
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
      { error: 'Failed to update publisher' },
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

    // Delete publisher from database
    const result = await deletePublisher(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error deleting publisher:', error);
    
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
      { error: 'Failed to delete publisher' },
      { status: 500 }
    );
  }
}
