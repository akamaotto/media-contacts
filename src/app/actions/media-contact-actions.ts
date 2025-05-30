"use server";

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import * as z from 'zod';

// Server-side schema for validation
// It's good practice to validate on the server, even if client-side validation exists.
const UpdateActionSchema = z.object({
  email_verified_status: z.boolean().optional(), // Changed to boolean
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  title: z.string().optional().nullable(), // Allow null for optional fields from form
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

export async function updateMediaContact(
  contactId: string,
  data: z.infer<typeof UpdateActionSchema>
): Promise<UpdateMediaContactReturnType> {
  if (!contactId) {
    return { success: false, error: "Contact ID is missing." };
  }

  const validationResult = UpdateActionSchema.safeParse(data);

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
  } = validationResult.data; // Now this is type-safe due to the check above

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
          where: { name: name }, // Assumes 'name' is unique in Beat model
          update: {}, // No fields to update if beat already exists
          create: { name: name },
        });
        processedBeatIds.push(beat.id);
      } catch (e) {
        // Handle potential error during individual beat upsert if necessary
        // For example, if there's a constraint violation not caught by upsert's where
        console.error(`Failed to upsert beat: ${name}`, e);
        // Optionally, decide if this should halt the whole update or just skip this beat
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
        email_verified_status: email_verified_status ?? false, // Default to false if undefined/null
        bio: bio ?? undefined,
        socials: socialsArray,
        beats: { set: processedBeatIds.map(id => ({ id })) }, // Handles empty array correctly
        countries: countryIds ? { set: countryIds.map(id => ({ id })) } : { set: [] }, // Disconnect all if not provided or empty
        // Prisma's @updatedAt will automatically update the updated_at field
      },
    });

    revalidatePath('/'); // Revalidate the home page to reflect changes
    return { success: true, message: "Contact updated successfully." };
  } catch (error) {
    console.error("Failed to update media contact:", error);
    // Check for specific Prisma errors if needed, e.g., P2025 (Record not found)
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
        return { success: false, error: "Contact not found." };
    }
    return { success: false, error: "Database error: Failed to update contact." };
  }
}
