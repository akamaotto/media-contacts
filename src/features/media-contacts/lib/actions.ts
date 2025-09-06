"use server";

import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
    UpsertMediaContactSchema,
    DeleteMediaContactSchema,
    MediaContactFiltersSchema,
    type MediaContactActionResult,
} from './types';
import { apiClient } from '@/lib/api-client';
import type { MediaContactTableItem } from '@/components/features/media-contacts/types';

export async function getMediaContactsAction(filters?: z.infer<typeof MediaContactFiltersSchema>) {
    const validation = MediaContactFiltersSchema.safeParse(filters || {});
    if (!validation.success) {
        return { contacts: [], totalCount: 0, error: "Invalid filter parameters", errorType: "VALIDATION_ERROR" };
    }
    
    try {
        // Convert filters to API format
        const apiFilters: Record<string, any> = {};
        if (validation.data.searchTerm) apiFilters.search = validation.data.searchTerm;
        if (validation.data.countryIds) apiFilters.countryIds = validation.data.countryIds;
        if (validation.data.beatIds) apiFilters.beatIds = validation.data.beatIds;
        if (validation.data.regionCodes) apiFilters.regionCodes = validation.data.regionCodes;
        if (validation.data.languageCodes) apiFilters.languageCodes = validation.data.languageCodes;
        if (validation.data.emailVerified) apiFilters.emailVerified = validation.data.emailVerified;
        if (validation.data.page) apiFilters.page = validation.data.page;
        if (validation.data.pageSize) apiFilters.pageSize = validation.data.pageSize;
        
        const response = await apiClient.get('/api/media-contacts', { params: apiFilters });
        
        if (response.success) {
            return {
                contacts: response.data,
                totalCount: response.pagination?.totalCount || 0
            };
        } else {
            return { 
                contacts: [], 
                totalCount: 0, 
                error: response.error || "Failed to fetch contacts", 
                errorType: "UNKNOWN_ERROR" 
            };
        }
    } catch (error) {
        console.error("Error in getMediaContactsAction:", error);
        return { 
            contacts: [], 
            totalCount: 0, 
            error: "Failed to fetch contacts", 
            errorType: "UNKNOWN_ERROR" 
        };
    }
}

export async function upsertMediaContactAction(data: z.infer<typeof UpsertMediaContactSchema>): Promise<MediaContactActionResult> {
    const validation = UpsertMediaContactSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Validation failed", issues: validation.error.issues };
    }

    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Authentication required" };
    }

    const { id, outlets, beats, countryIds, ...contactData } = validation.data;

    try {
        let response;
        if (id) {
            // Update existing contact
            const updateData = {
                ...contactData,
                outletIds: outlets,
                beatIds: beats,
                countryIds: countryIds
            };
            response = await apiClient.put(`/api/media-contacts/${id}`, updateData);
        } else {
            // Create new contact
            const createData = {
                ...contactData,
                outletIds: outlets,
                beatIds: beats,
                countryIds: countryIds
            };
            response = await apiClient.post('/api/media-contacts', createData);
        }

        if (response.success) {
            return { 
                success: true, 
                message: `Contact ${id ? 'updated' : 'created'} successfully.`,
                data: response.data as MediaContactTableItem
            };
        } else {
            return { 
                success: false, 
                error: response.error || `Failed to ${id ? 'update' : 'create'} contact.` 
            };
        }
    } catch (error) {
        console.error("Error in upsertMediaContactAction:", error);
        return { success: false, error: `Failed to ${id ? 'update' : 'create'} contact.` };
    }
}

export async function deleteMediaContactAction(contactId: string): Promise<MediaContactActionResult> {
    const validation = DeleteMediaContactSchema.safeParse({ id: contactId });
    if (!validation.success) {
        return { success: false, error: "Invalid contact ID" };
    }

    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: "Authentication required" };
    }

    try {
        const response = await apiClient.delete(`/api/media-contacts/${contactId}`);
        
        if (response.success) {
            return { 
                success: true, 
                message: "Contact deleted successfully" 
            };
        } else {
            return { 
                success: false, 
                error: response.error || "Failed to delete contact." 
            };
        }
    } catch (error) {
        console.error("Error in deleteMediaContactAction:", error);
        return { success: false, error: "Failed to delete contact." };
    }
}