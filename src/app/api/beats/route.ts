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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description } = body;

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Beat name is required' },
        { status: 400 }
      );
    }

    // Create beat in database
    const newBeat = await createBeat({
      name: name.trim(),
      description: description?.trim() || undefined,
    });

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
    }
    
    return NextResponse.json(
      { error: 'Failed to create beat' },
      { status: 500 }
    );
  }
}
