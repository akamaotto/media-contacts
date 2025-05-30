"use server";

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { 
  getMediaContactsFromDb, 
  upsertMediaContactInDb, 
  type UpsertMediaContactData 
} from "./repository";
import { MediaContactTableItem } from "@/components/media-contacts/columns"; 

/**
 * Server Action to fetch media contacts.
 */
export async function getMediaContactsAction(): Promise<MediaContactTableItem[]> {
  try {
    const contacts = await getMediaContactsFromDb();
    return contacts;
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