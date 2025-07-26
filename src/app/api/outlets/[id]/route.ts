import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateOutlet, deleteOutlet } from '@/backend/outlets/actions';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const outlet = await updateOutlet(
      params.id,
      {
        name,
        description,
        website,
        publisherId,
      },
      categoryIds
    );

    return NextResponse.json(outlet);
  } catch (error) {
    console.error('Error in PUT /api/outlets/[id]:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update outlet' },
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await deleteOutlet(params.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in DELETE /api/outlets/[id]:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete outlet' },
      { status: 500 }
    );
  }
}
