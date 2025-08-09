import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateCountry, deleteCountry } from '@/backend/countries/actions';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      console.error('Countries API: No session found');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to update countries' },
        { status: 401 }
      );
    }

    if (!session.user?.id) {
      console.error('Countries API: Session exists but no user ID');
      return NextResponse.json(
        { error: 'Invalid session - Please log in again' },
        { status: 401 }
      );
    }

    console.log('Countries API: Authenticated user:', session.user.email);

    const body = await request.json();
    const updateData = { ...body, id: params.id };
    
    console.log('Countries API: Update data:', updateData);

    // Update country using the server action
    const result = await updateCountry(updateData);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    console.log('Countries API: Successfully updated country:', result.data?.id);

    return NextResponse.json({
      message: result.message,
      country: result.data
    });
  } catch (error) {
    console.error('Error updating country:', error);
    
    return NextResponse.json(
      { error: 'Failed to update country - Please check your input and try again' },
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
      console.error('Countries API: No session found');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to delete countries' },
        { status: 401 }
      );
    }

    if (!session.user?.id) {
      console.error('Countries API: Session exists but no user ID');
      return NextResponse.json(
        { error: 'Invalid session - Please log in again' },
        { status: 401 }
      );
    }

    console.log('Countries API: Authenticated user:', session.user.email);
    console.log('Countries API: Deleting country:', params.id);

    // Delete country using the server action
    const result = await deleteCountry(params.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    console.log('Countries API: Successfully deleted country:', params.id);

    return NextResponse.json({
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting country:', error);
    
    return NextResponse.json(
      { error: 'Failed to delete country - Please try again' },
      { status: 500 }
    );
  }
}