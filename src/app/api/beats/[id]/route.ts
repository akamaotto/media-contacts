import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateBeat, deleteBeat } from '@/backend/beats/actions';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      console.error('Beats API: No session found');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to update beats' },
        { status: 401 }
      );
    }

    if (!session.user?.id) {
      console.error('Beats API: Session exists but no user ID');
      return NextResponse.json(
        { error: 'Invalid session - Please log in again' },
        { status: 401 }
      );
    }

    console.log('Beats API: Authenticated user:', session.user.email);

    const body = await request.json();
    const { name, description, categoryIds } = body;
    
    console.log('Beats API: Update data:', { name, description, categoryIds });

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Beat name is required' },
        { status: 400 }
      );
    }

    // Validate categoryIds if provided
    if (categoryIds && !Array.isArray(categoryIds)) {
      return NextResponse.json(
        { error: 'Category IDs must be an array' },
        { status: 400 }
      );
    }

    // Update beat using the server action
    const updatedBeat = await updateBeat(
      params.id,
      {
        name: name.trim(),
        description: description?.trim() || undefined,
      },
      categoryIds
    );

    console.log('Beats API: Successfully updated beat:', updatedBeat.id);

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
      
      if (error.message.includes('Prisma')) {
        return NextResponse.json(
          { error: 'Database error - Please try again' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update beat - Please check your input and try again' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      console.error('Beats API: No session found');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to delete beats' },
        { status: 401 }
      );
    }

    if (!session.user?.id) {
      console.error('Beats API: Session exists but no user ID');
      return NextResponse.json(
        { error: 'Invalid session - Please log in again' },
        { status: 401 }
      );
    }

    console.log('Beats API: Authenticated user:', session.user.email);
    console.log('Beats API: Deleting beat:', params.id);

    // Delete beat using the server action
    const result = await deleteBeat(params.id);

    console.log('Beats API: Successfully deleted beat:', params.id);

    return NextResponse.json({
      message: result.message
    });
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
      { error: 'Failed to delete beat - Please try again' },
      { status: 500 }
    );
  }
}