"use server";

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import * as z from 'zod';

// Define a simple schema for validating the input
const DeleteMediaContactSchema = z.object({
  id: z.string({
    required_error: "Contact ID is required",
    invalid_type_error: "Contact ID must be a string"
  })
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
