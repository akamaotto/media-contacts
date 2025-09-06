import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateOutlet, deleteOutlet } from '@/features/outlets/lib/actions';
import { getOutlets } from '@/features/outlets/lib/queries';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all outlets and find the one with the matching ID
    const outlets = await getOutlets();
    const outlet = outlets.find(o => o.id === params.id);

    if (!outlet) {
      return NextResponse.json({ error: 'Outlet not found' }, { status: 404 });
    }

    return NextResponse.json(outlet);
  } catch (error) {
    console.error('Error in GET /api/outlets/[id]:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch outlet' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch outlet' },
      { status: 500 }
    );
  }
}

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
    const { name, description, website, publisherId, categoryIds, countryIds } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Outlet name is required' },
        { status: 400 }
      );
    }

    // Prepare data for update, ensuring publisherId is handled correctly
    const updateData: any = {
      name,
      description,
      website,
      categoryIds,
      countryIds,
    };
    
    // Handle publisherId properly - if explicitly set to null or undefined, pass it through
    if (publisherId === null || publisherId === undefined || publisherId === 'none') {
      updateData.publisherId = null;
    } else if (publisherId) {
      updateData.publisherId = publisherId;
    }

    const outlet = await updateOutlet(params.id, updateData);

    return NextResponse.json(outlet);
  } catch (error) {
    console.error('Error in PUT /api/outlets/[id]:', error);
    if (error instanceof Error) {
      const message = error.message || 'Failed to update outlet';
      const msgLower = message.toLowerCase();
      // Derive status from common backend messages
      const status = msgLower.includes('not found')
        ? 404
        : (msgLower.includes('already exists') || msgLower.includes('unique constraint'))
          ? 409
          : 400;
      return NextResponse.json(
        { error: message },
        { status }
      );
    }
    return NextResponse.json({ error: 'Failed to update outlet' }, { status: 500 });
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