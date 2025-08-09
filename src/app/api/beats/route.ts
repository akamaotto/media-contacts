import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllBeats, createBeat } from '@/backend/beats/actions';

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const beats = await getAllBeats();
    return NextResponse.json(beats);
  } catch (error) {
    console.error('Error fetching beats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch beats' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      console.error('Beats API: No session found');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to create beats' },
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

    console.log('Beats API: Request data:', { name, description, categoryIds });

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

    // Create beat in database
    const newBeat = await createBeat({
      name: name.trim(),
      description: description?.trim() || undefined,
    }, categoryIds);

    console.log('Beats API: Successfully created beat:', newBeat.id);

    return NextResponse.json({
      message: 'Beat created successfully',
      beat: newBeat
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating beat:', error);
    
    // Handle specific error messages from backend
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 } // Conflict
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
      { error: 'Failed to create beat - Please check your input and try again' },
      { status: 500 }
    );
  }
}
