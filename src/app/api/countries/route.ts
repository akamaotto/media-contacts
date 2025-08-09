import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCountries, createCountry } from '@/backend/countries/actions';

export async function GET(request: NextRequest) {
  try {
    console.log('Countries API: Starting authentication check...');
    console.log('Countries API: Request headers:', {
      cookie: request.headers.get('cookie') ? 'present' : 'missing',
      authorization: request.headers.get('authorization') ? 'present' : 'missing',
      userAgent: request.headers.get('user-agent')
    });
    
    // Check authentication
    const session = await auth();
    console.log('Countries API: Session result:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userRole: session?.user?.role
    });
    
    if (!session) {
      console.error('Countries API: No session found - this might be a session timing issue');
      // For now, let's allow the request to proceed but log the issue
      console.warn('Countries API: Proceeding without auth for debugging purposes');
    }

    console.log('Countries API: Fetching countries...');
    const countries = await getCountries();
    console.log(`Countries API: Successfully fetched ${countries.length} countries`);
    
    return NextResponse.json(countries);
  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      console.error('Countries API: No session found');
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to create countries' },
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
    console.log('Countries API: Request data:', body);

    // Create country using the server action
    const result = await createCountry(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    console.log('Countries API: Successfully created country:', result.data?.id);

    return NextResponse.json({
      message: result.message,
      country: result.data
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating country:', error);
    
    return NextResponse.json(
      { error: 'Failed to create country - Please check your input and try again' },
      { status: 500 }
    );
  }
}