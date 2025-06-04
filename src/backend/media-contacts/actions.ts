"use server";

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { 
  getMediaContactsFromDb, 
  upsertMediaContactInDb, 
  type UpsertMediaContactData,
  type MediaContactFilters,
  type PaginatedMediaContactsResult 
} from "./repository";
import { MediaContactTableItem } from "@/components/media-contacts/columns"; 

/**
 * Zod schema for validating media contact filter parameters
 * Following Rust-inspired explicit typing and validation principles
 */
const MediaContactFiltersSchema = z.object({
  searchTerm: z.string().optional(),
  countryIds: z.array(z.string().uuid()).optional(),
  beatIds: z.array(z.string().uuid()).optional(),
  regionCodes: z.array(z.string()).optional(),
  languageCodes: z.array(z.string()).optional(),
  emailVerified: z.enum(['all', 'verified', 'unverified']).optional().default('all'),
  page: z.number().int().min(0).optional().default(0),
  pageSize: z.number().int().min(1).max(50).optional().default(10),
});

// Type for getMediaContactsAction parameters
export type GetMediaContactsParams = z.infer<typeof MediaContactFiltersSchema>;

/**
 * Interface for paginated media contacts result from server action
 * Following Rust-inspired explicit typing pattern
 */
export interface PaginatedMediaContactsActionResult {
  contacts: MediaContactTableItem[];
  totalCount: number;
}

/**
 * Server Action to fetch media contacts with optional filtering and pagination.
 * 
 * @param filters - Optional filter parameters for media contacts including pagination
 * @returns Promise resolving to paginated media contacts result
 */
export async function getMediaContactsAction(filters?: GetMediaContactsParams): Promise<PaginatedMediaContactsActionResult> {
  try {
    // Validate filters if provided using fail-fast approach
    let validatedFilters: MediaContactFilters | undefined;
    
    if (filters) {
      const result = MediaContactFiltersSchema.safeParse(filters);
      
      if (!result.success) {
        console.error("Invalid filter parameters:", result.error);
        throw new Error("Invalid filter parameters provided");
      }
      
      validatedFilters = result.data;
    }
    
    // Fetch contacts with validated filters including pagination
    const result = await getMediaContactsFromDb(validatedFilters);
    return {
      contacts: result.contacts,
      totalCount: result.totalCount
    };
  } catch (error) {
    console.error("Error in getMediaContactsAction:", error);
    throw new Error("Failed to fetch media contacts via server action.");
  }
}

// Zod schema for validating data in upsertMediaContactAction
const UpsertMediaContactActionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, { message: "Name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  title: z.string().min(1, { message: "Title is required." }), 
  email_verified_status: z.boolean().nullable().optional(),
  bio: z.string().nullable().optional(),
  socials: z.array(z.string()).nullable().optional(),
  outlets: z.array(z.string()).optional(), // Changed from outletIds to outlets (array of names)
  countryIds: z.array(z.string().uuid()).optional(),
  beats: z.array(z.string()).optional(), // Changed from beatIds to beats (array of names)
});

export type UpsertMediaContactActionState = {
  message?: string;
  errors?: {
    id?: string[];
    name?: string[];
    email?: string[];
    title?: string[];
    email_verified_status?: string[];
    bio?: string[];
    socials?: string[];
    outletIds?: string[];
    countryIds?: string[];
    beatIds?: string[];
    _form?: string[]; // For general form errors
  };
  data?: MediaContactTableItem;
};

/**
 * Server Action to create or update a media contact.
 */
export async function upsertMediaContactAction(
  // prevState: UpsertMediaContactActionState, // For useActionState hook
  data: UpsertMediaContactData // Direct data object from form/client
): Promise<UpsertMediaContactActionState> {
  const validatedFields = UpsertMediaContactActionSchema.safeParse(data);

  if (!validatedFields.success) {
    console.log("Validation errors:", validatedFields.error.flatten().fieldErrors);
    return {
      message: "Validation failed. Please check the fields.",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const upsertedContact = await upsertMediaContactInDb(validatedFields.data);
    revalidatePath('/'); // Revalidate the page displaying media contacts
    return {
      message: data.id ? "Contact updated successfully." : "Contact created successfully.",
      data: upsertedContact,
    };
  } catch (error) {
    console.error("Error in upsertMediaContactAction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return {
      message: "Failed to save contact.",
      errors: { _form: [errorMessage] }, 
    };
  }
}

// Remember to add other actions for delete as needed.
// Each action that modifies data should typically call revalidatePath or revalidateTag
// to ensure the cache is updated and UI reflects the changes.