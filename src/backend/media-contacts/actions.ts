"use server";

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { 
  getMediaContactsFromDb, 
  upsertMediaContactInDb, 
  MediaContactError,
  MediaContactErrorType,
  type MediaContactFilters,
  type PaginatedMediaContactsResult 
} from "./repository";
import { prisma } from "@/lib/prisma";
import { MediaContactTableItem } from "@/components/features/media-contacts/columns"; 

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
 * @returns Promise resolving to paginated media contacts result or error object
 */
export async function getMediaContactsAction(filters?: GetMediaContactsParams): Promise<PaginatedMediaContactsActionResult | { error: string, errorType: string }> {
  try {
    // Validate filters if provided using fail-fast approach
    let validatedFilters: MediaContactFilters | undefined;
    
    if (filters) {
      const result = MediaContactFiltersSchema.safeParse(filters);
      
      if (!result.success) {
        console.error("Invalid filter parameters:", result.error);
        return {
          error: "Invalid filter parameters provided",
          errorType: "VALIDATION_ERROR"
        };
      }
      
      validatedFilters = result.data;
    }
    
    try {
      // Fetch contacts with validated filters including pagination
      const result = await getMediaContactsFromDb(validatedFilters);
      return {
        contacts: result.contacts,
        totalCount: result.totalCount
      };
    } catch (error) {
      console.error("Repository error in getMediaContactsAction:", error);
      
      // Handle specific repository errors
      if (error instanceof MediaContactError) {
        return {
          error: error.message,
          errorType: error.type
        };
      }
      
      // Handle other errors
      return {
        error: "Failed to fetch media contacts.",
        errorType: "UNKNOWN_ERROR"
      };
    }
  } catch (error) {
    console.error("Unexpected error in getMediaContactsAction:", error);
    return {
      error: "An unexpected error occurred while fetching media contacts.",
      errorType: "UNKNOWN_ERROR"
    };
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
// Define the type for upsert data based on the schema
export type UpsertMediaContactData = z.infer<typeof UpsertMediaContactActionSchema>;

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
    // Convert the validated data to match the expected MediaContactTableItem format
    const contactData = {
      ...validatedFields.data,
      emailVerified: validatedFields.data.email_verified_status || false,
      updated_at: new Date(),
      countries: validatedFields.data.countryIds?.map(id => ({ id, name: '', code: `C${id.slice(-1)}` })) || [],
      outlets: validatedFields.data.outlets?.map(name => ({ id: '', name })) || [],
      beats: validatedFields.data.beats?.map(name => ({ id: '', name })) || [],
    } as unknown as MediaContactTableItem;

    const upsertedContact = await upsertMediaContactInDb(contactData);
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

// Additional schema for updateMediaContact (from app/actions consolidation)
const UpdateMediaContactSchema = z.object({
  email_verified_status: z.boolean().optional(),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  title: z.string().optional().nullable(),
  email: z.string().email({ message: "Invalid email address." }),
  bio: z.string().optional().nullable(),
  socials: z.string().optional().nullable(), // Comma-separated string
  beatsEntry: z.string().optional(), // Comma-separated beat names
  countryIds: z.array(z.string()).optional(),
});

export type UpdateMediaContactReturnType = {
  success: boolean;
  message?: string;
  error?: string;
  issues?: z.ZodIssue[];
};

/**
 * Server Action to update an existing media contact (consolidated from app/actions)
 * Uses direct Prisma calls for simpler update operations
 */
export async function updateMediaContact(
  contactId: string,
  data: z.infer<typeof UpdateMediaContactSchema>
): Promise<UpdateMediaContactReturnType> {
  if (!contactId) {
    return { success: false, error: "Contact ID is missing." };
  }

  const validationResult = UpdateMediaContactSchema.safeParse(data);

  if (!validationResult.success) {
    return { 
      success: false, 
      error: "Invalid data provided.", 
      issues: validationResult.error.issues 
    };
  }

  const {
    name,
    title,
    email,
    email_verified_status,
    bio,
    socials: socialsString,
    beatsEntry,
    countryIds,
  } = validationResult.data;

  const socialsArray = socialsString
    ? socialsString.split(',').map(s => s.trim()).filter(s => s.length > 0)
    : [];

  const processedBeatIds: string[] = [];
  if (validationResult.data.beatsEntry) {
    const beatNames = validationResult.data.beatsEntry.split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    for (const name of beatNames) {
      try {
        const beat = await prisma.beat.upsert({
          where: { name: name },
          update: {},
          create: { name: name },
        });
        processedBeatIds.push(beat.id);
      } catch (e) {
        console.error(`Failed to upsert beat: ${name}`, e);
      }
    }
  }

  try {
    await prisma.mediaContact.update({
      where: { id: contactId },
      data: {
        name,
        title: title ?? undefined,
        email,
        email_verified_status: email_verified_status ?? false,
        bio: bio ?? undefined,
        socials: socialsArray,
        beats: { set: processedBeatIds.map(id => ({ id })) },
        countries: countryIds ? { set: countryIds.map(id => ({ id })) } : { set: [] },
      },
    });

    revalidatePath('/');
    return { success: true, message: "Contact updated successfully." };
  } catch (error) {
    console.error("Failed to update media contact:", error);
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
        return { success: false, error: "Contact not found." };
    }
    return { success: false, error: "Database error: Failed to update contact." };
  }
}

// Delete Media Contact Schema and Action
const DeleteMediaContactSchema = z.object({
  id: z.string().min(1, { message: "Contact ID is required" })
});

export type DeleteMediaContactResult = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * Server action to delete a media contact
 * 
 * @param contactId - The ID of the contact to delete
 * @returns A result object with success status and message/error
 */
export async function deleteMediaContact(
  contactId: string
): Promise<DeleteMediaContactResult> {
  // 1. Validate input with explicit type handling
  if (!contactId) {
    return { 
      success: false, 
      error: "Contact ID is missing" 
    };
  }
  
  const validationResult = DeleteMediaContactSchema.safeParse({ id: contactId });
  
  if (!validationResult.success) {
    return { 
      success: false, 
      error: "Invalid contact ID format",
    };
  }
  
  // 2. Attempt to delete the contact with proper error handling
  try {
    await prisma.mediaContact.delete({
      where: { 
        id: contactId 
      },
    });
    
    // 3. Revalidate the path to refresh the data
    revalidatePath('/');
    
    return { 
      success: true, 
      message: "Contact deleted successfully" 
    };
  } catch (error) {
    console.error("Failed to delete media contact:", error);
    
    // 4. Handle specific Prisma errors for better user feedback
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string };
      
      if (prismaError.code === 'P2025') {
        return { 
          success: false, 
          error: "Contact not found" 
        };
      }
    }
    
    return { 
      success: false, 
      error: "Database error: Failed to delete contact" 
    };
  }
}

// Each action that modifies data should typically call revalidatePath or revalidateTag
// to ensure the cache is updated and UI reflects the changes.