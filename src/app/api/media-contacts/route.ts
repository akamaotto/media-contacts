import { NextRequest, NextResponse } from 'next/server';
import { getMediaContactsFromDb, MediaContactError, MediaContactErrorType } from '@/backend/media-contacts-table/repository';
import { auth } from '../../../../auth';

/**
 * GET handler for media contacts API
 * Provides a dedicated API endpoint for fetching media contacts
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized', errorType: 'AUTH_ERROR' }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const filters = {
      searchTerm: searchParams.get('searchTerm') || undefined,
      countryIds: searchParams.getAll('countryId') || undefined,
      beatIds: searchParams.getAll('beatId') || undefined,
      regionCodes: searchParams.getAll('regionCode') || undefined,
      languageCodes: searchParams.getAll('languageCode') || undefined,
      emailVerified: searchParams.get('emailVerified') as 'all' | 'verified' | 'unverified' || 'all',
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10'),
    };

    // Fetch contacts from repository
    const result = await getMediaContactsFromDb(filters);
    
    // Return successful response
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in media-contacts API route:', error);
    
    // Handle specific repository errors
    if (error instanceof MediaContactError) {
      const status = error.type === MediaContactErrorType.DB_NOT_CONNECTED ? 503 : 404;
      return NextResponse.json(
        { error: error.message, errorType: error.type },
        { status }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { error: 'Failed to fetch media contacts.', errorType: 'UNKNOWN_ERROR' },
      { status: 500 }
    );
  }
}
