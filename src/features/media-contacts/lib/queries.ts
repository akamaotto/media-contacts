
import { prisma } from '@/lib/database/prisma';
import { Prisma } from '@prisma/client';
import { MediaContactTableItem } from '@/components/features/media-contacts/types';
import { MediaContactError, MediaContactErrorType, type MediaContactFilters } from './types';
import { apiClient } from '../../../lib/api-client';

function mapApiContactToTableItem(contact: any): MediaContactTableItem {
    return {
        ...contact,
        emailVerified: contact.email_verified_status,
        countries: contact.countries?.map((c: any) => ({ ...c, code: c.code || '' })) || [],
    } as MediaContactTableItem;
}

export async function getMediaContacts(filters: Partial<MediaContactFilters> = {}) {
  try {
    const { page = 1, pageSize = 10, ...filterOptions } = filters;

    // Convert filters to API format
    const apiFilters: Record<string, any> = {};
    if (filterOptions.searchTerm) apiFilters.search = filterOptions.searchTerm;
    if (filterOptions.countryIds) apiFilters.countryIds = filterOptions.countryIds;
    if (filterOptions.beatIds) apiFilters.beatIds = filterOptions.beatIds;
    if (filterOptions.regionCodes) apiFilters.regionCodes = filterOptions.regionCodes;
    if (filterOptions.languageCodes) apiFilters.languageCodes = filterOptions.languageCodes;
    if (filterOptions.emailVerified) apiFilters.emailVerified = filterOptions.emailVerified;
    apiFilters.page = page;
    apiFilters.pageSize = pageSize;

    const response = await apiClient.get('/api/media-contacts', { params: apiFilters });

    if (!response.success) {
        throw new MediaContactError(response.error || 'Failed to fetch media contacts', MediaContactErrorType.DB_NOT_CONNECTED);
    }

    if (response.pagination?.totalCount === 0) {
        throw new MediaContactError('No media contacts found matching your filters.', MediaContactErrorType.NO_CONTACTS_FOUND);
    }

    return {
        contacts: (response.data as any[])?.map(mapApiContactToTableItem) || [],
        totalCount: response.pagination?.totalCount || 0,
    };

  } catch (error) {
    if (error instanceof MediaContactError) throw error;
    console.error('Error fetching media contacts:', error);
    throw new MediaContactError('Error connecting to the database.', MediaContactErrorType.DB_NOT_CONNECTED);
  }
}

// Note: upsert logic resides in `src/features/media-contacts/lib/actions.ts`
