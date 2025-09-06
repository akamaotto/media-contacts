
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import {
  CreateUserSchema,
  UpdateUserSchema,
  UserError,
  UserErrorType,
  type UserActionResult,
  type CreateUserInput,
  type UpdateUserInput,
} from "./types";
import { getUserByEmail, verifyUserPassword } from "./queries";
import { UpdateProfileSchema } from "./types";

/**
 * Checks if the currently authenticated user is an ADMIN.
 * Throws a PERMISSION_DENIED error if not.
 */
async function checkAdminPermission() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new UserError("Unauthorized", UserErrorType.PERMISSION_DENIED);
  }
  return session;
}

/**
 * Creates a new user in the database.
 * Admin-only action.
 */
async function createUser(data: CreateUserInput) {
  const existingUser = await prisma.users.findUnique({ where: { email: data.email } });
  if (existingUser) {
    throw new UserError(`User with email ${data.email} already exists`, UserErrorType.DUPLICATE_EMAIL);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  return prisma.users.create({
    data: {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      hashedPassword,
      role: data.role,
      updatedAt: new Date(),
    },
    select: { id: true, name: true, email: true, role: true },
  });
}

/**
 * Updates an existing user in the database.
 * Admin-only action.
 */
async function updateUser(id: string, data: UpdateUserInput) {
  const existingUser = await prisma.users.findUnique({ where: { id } });
  if (!existingUser) {
    throw new UserError(`User with ID ${id} not found`, UserErrorType.NOT_FOUND);
  }

  if (data.email && data.email !== existingUser.email) {
    const emailConflict = await prisma.users.findUnique({ where: { email: data.email } });
    if (emailConflict) {
      throw new UserError(`User with email ${data.email} already exists`, UserErrorType.DUPLICATE_EMAIL);
    }
  }

  const updateData: any = { ...data };
  if (data.password) {
    updateData.hashedPassword = await bcrypt.hash(data.password, 10);
    delete updateData.password;
  }

  return prisma.users.update({
    where: { id },
    data: { ...updateData, updatedAt: new Date() },
    select: { id: true, name: true, email: true, role: true },
  });
}

/**
 * Server Action: Create or update a user.
 * For use in admin forms.
 */
export async function upsertUserAction(prevState: UserActionResult, formData: FormData): Promise<UserActionResult> {
  try {
    await checkAdminPermission();

    const id = formData.get("id") as string | null;
    const rawData = {
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role") || "USER",
    };

    if (id) {
      const validationResult = UpdateUserSchema.safeParse(rawData);
      if (!validationResult.success) {
        return { success: false, error: "Invalid user data", issues: validationResult.error.issues };
      }
      await updateUser(id, validationResult.data);
    } else {
      const validationResult = CreateUserSchema.safeParse(rawData);
      if (!validationResult.success) {
        return { success: false, error: "Invalid user data", issues: validationResult.error.issues };
      }
      await createUser(validationResult.data);
    }

    revalidatePath("/admin/users");
    return { success: true, message: id ? "User updated successfully" : "User created successfully" };
  } catch (error) {
    if (error instanceof UserError) {
      return { success: false, error: error.message };
    }
    console.error("Error in upsertUserAction:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Server Action: Delete a user.
 * For use in admin forms.
 */
export async function deleteUserAction(prevState: any, formData: FormData): Promise<UserActionResult> {
  try {
    const session = await checkAdminPermission();
    const id = formData.get("id") as string;

    if (!id) return { success: false, error: "User ID is required" };
    if (id === session.user.id) return { success: false, error: "Cannot delete yourself." };

    const userToDelete = await prisma.users.findUnique({ where: { id }, select: { email: true } });
    if (!userToDelete) {
        throw new UserError(`User with ID ${id} not found`, UserErrorType.NOT_FOUND);
    }
    if (userToDelete.email === "akamaotto@gmail.com") {
        throw new UserError("Cannot delete super admin user", UserErrorType.PERMISSION_DENIED);
    }

    await prisma.$transaction([
        prisma.sessions.deleteMany({ where: { userId: id } }),
        prisma.accounts.deleteMany({ where: { userId: id } }),
        prisma.users.delete({ where: { id } }),
    ]);

    revalidatePath("/admin/users");
    return { success: true, message: "User deleted successfully" };
  } catch (error) {
    if (error instanceof UserError) {
      return { success: false, error: error.message };
    }
    console.error("Error in deleteUserAction:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Server Action: Update the current user's profile.
 */
export async function updateProfileAction(prevState: any, formData: FormData): Promise<UserActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized" };
    }

    const validationResult = UpdateProfileSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validationResult.success) {
      return { success: false, error: "Invalid profile data", issues: validationResult.error.issues };
    }

    const { name, currentPassword, newPassword } = validationResult.data;
    const user = await getUserByEmail(session.user.email);

    const updateData: Record<string, any> = { name };

    if (newPassword) {
      await verifyUserPassword(session.user.email, currentPassword as string);
      updateData.hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    await prisma.users.update({
      where: { id: user.id },
      data: updateData,
    });

    revalidatePath("/profile");
    return { success: true, message: "Profile updated successfully" };
  } catch (error) {
    if (error instanceof UserError) {
        if (error.type === UserErrorType.INVALID_PASSWORD) {
            return { success: false, error: "Current password is incorrect" };
        }
        return { success: false, error: error.message };
    }
    console.error("Error in updateProfileAction:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
}
