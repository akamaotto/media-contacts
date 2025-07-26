import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllOutlets, createOutlet } from '@/backend/outlets/actions';

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const outlets = await getAllOutlets();
    return NextResponse.json(outlets);
  } catch (error) {
    console.error('Error in GET /api/outlets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch outlets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, website, publisherId, categoryIds } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Outlet name is required' },
        { status: 400 }
      );
    }

    const outlet = await createOutlet(
      {
        name,
        description,
        website,
        publisherId,
      },
      categoryIds
    );

    return NextResponse.json(outlet, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/outlets:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create outlet' },
      { status: 500 }
    );
  }
}
