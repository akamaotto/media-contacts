"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import * as z from "zod";
import { updateUserInDb, verifyUserPassword } from "@/backend/users/repository";

// Update profile schema
const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
});

export type UpdateProfileActionState = {
  error?: string;
  success?: boolean;
  fieldErrors?: {
    name?: string[];
    currentPassword?: string[];
    newPassword?: string[];
  };
};

export async function updateProfileAction(
  prevState: UpdateProfileActionState,
  formData: FormData
): Promise<UpdateProfileActionState> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Not authenticated" };
    }

    const validatedFields = updateProfileSchema.safeParse({
      name: formData.get("name"),
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
    });

    if (!validatedFields.success) {
      return {
        fieldErrors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const { name, currentPassword, newPassword } = validatedFields.data;

    // If changing password, verify current password
    if (newPassword && currentPassword) {
      const isValidPassword = await verifyUserPassword(session.user.id, currentPassword);
      if (!isValidPassword) {
        return {
          fieldErrors: {
            currentPassword: ["Current password is incorrect"],
          },
        };
      }
    }

    // Update user profile
    await updateUserInDb(session.user.id, {
      name,
      ...(newPassword && { password: newPassword }),
    });

    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("Profile update error:", error);
    return { error: "Failed to update profile" };
  }
}
