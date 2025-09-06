import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getOutlets } from '@/features/outlets/lib/queries';
import { createOutlet } from '@/features/outlets/lib/actions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const outlets = await getOutlets();
    return NextResponse.json(outlets);
  } catch (error) {
    console.error('Error in GET /api/outlets:', error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message || 'Failed to fetch outlets' },
        { status: 500 }
      );
    }
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
    const { name, description, website, publisherId, categoryIds, countryIds } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Outlet name is required' },
        { status: 400 }
      );
    }

    const outlet = await createOutlet({
      name,
      description,
      website,
      publisherId,
      categoryIds,
      countryIds,
    });

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
