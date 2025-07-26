import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllPublishers, createPublisher } from '@/backend/publishers/actions';

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

    const publishers = await getAllPublishers();
    return NextResponse.json(publishers);
  } catch (error) {
    console.error('Error fetching publishers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch publishers' },
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
    const { name, description, website } = body;

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Publisher name is required' },
        { status: 400 }
      );
    }

    // Create publisher in database
    const newPublisher = await createPublisher({
      name: name.trim(),
      description: description?.trim() || undefined,
      website: website?.trim() || undefined,
    });

    return NextResponse.json({
      message: 'Publisher created successfully',
      publisher: newPublisher
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating publisher:', error);
    
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
      { error: 'Failed to create publisher' },
      { status: 500 }
    );
  }
}
