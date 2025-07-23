"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import * as z from "zod";
import {
  getUsersFromDb,
  getUserByIdFromDb,
  getUserByEmailFromDb,
  createUserInDb,
  updateUserInDb,
  deleteUserFromDb,
  verifyUserPassword,
  UserError,
  UserErrorType,
  type UserFilters,
} from "./repository";

// Validation schemas
const CreateUserSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional(),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

const UpdateUserSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).optional(),
  email: z.string().email({ message: "Invalid email address." }).optional(),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

const UpdateProfileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, { message: "Password must be at least 6 characters." }).optional(),
});

const UserFiltersSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  search: z.string().optional(),
});

// Action result types
export interface UserActionResult {
  success: boolean;
  message?: string;
  error?: string;
  issues?: z.ZodIssue[];
}

export interface UsersListResult {
  success: boolean;
  users?: any[];
  error?: string;
}

/**
 * Check if the current user has admin permissions
 */
async function checkAdminPermission() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    throw new UserError("Unauthorized", UserErrorType.PERMISSION_DENIED);
  }
  return session;
}

/**
 * Get all users (admin only)
 */
export async function getUsersAction(filters: UserFilters = {}): Promise<UsersListResult> {
  try {
    await checkAdminPermission();

    const validationResult = UserFiltersSchema.safeParse(filters);
    if (!validationResult.success) {
      return {
        success: false,
        error: "Invalid filter parameters",
      };
    }

    const users = await getUsersFromDb(validationResult.data);
    
    return {
      success: true,
      users,
    };
  } catch (error) {
    console.error("Error in getUsersAction:", error);
    
    if (error instanceof UserError) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to fetch users",
    };
  }
}

/**
 * Create or update a user (admin only)
 */
export async function upsertUserAction(
  prevState: any,
  formData: FormData
): Promise<UserActionResult> {
  try {
    await checkAdminPermission();

    const id = formData.get("id") as string | null;
    const rawData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string | null,
      role: (formData.get("role") as "USER" | "ADMIN") || "USER",
    };

    if (id) {
      // Update existing user
      const validationResult = UpdateUserSchema.safeParse(rawData);
      if (!validationResult.success) {
        return {
          success: false,
          error: "Invalid user data",
          issues: validationResult.error.issues,
        };
      }

      const updateData: any = {
        name: validationResult.data.name,
        email: validationResult.data.email,
        role: validationResult.data.role,
      };

      if (validationResult.data.password) {
        updateData.hashedPassword = validationResult.data.password;
      }

      await updateUserInDb(id, updateData);
    } else {
      // Create new user
      const validationResult = CreateUserSchema.safeParse(rawData);
      if (!validationResult.success) {
        return {
          success: false,
          error: "Invalid user data",
          issues: validationResult.error.issues,
        };
      }

      await createUserInDb({
        name: validationResult.data.name,
        email: validationResult.data.email,
        hashedPassword: validationResult.data.password,
        role: validationResult.data.role,
      });
    }

    revalidatePath("/admin/users");
    return {
      success: true,
      message: id ? "User updated successfully" : "User created successfully",
    };
  } catch (error) {
    console.error("Error in upsertUserAction:", error);
    
    if (error instanceof UserError) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to save user",
    };
  }
}

/**
 * Delete a user (admin only)
 */
export async function deleteUserAction(
  prevState: any,
  formData: FormData
): Promise<UserActionResult> {
  try {
    await checkAdminPermission();

    const id = formData.get("id") as string;
    
    if (!id) {
      return {
        success: false,
        error: "User ID is required",
      };
    }

    await deleteUserFromDb(id);

    revalidatePath("/admin/users");
    return {
      success: true,
      message: "User deleted successfully",
    };
  } catch (error) {
    console.error("Error in deleteUserAction:", error);
    
    if (error instanceof UserError) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to delete user",
    };
  }
}

/**
 * Update current user's profile
 */
export async function updateProfileAction(
  prevState: any,
  formData: FormData
): Promise<UserActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const rawData = {
      name: formData.get("name") as string,
      currentPassword: formData.get("currentPassword") as string,
      newPassword: formData.get("newPassword") as string,
    };

    const validationResult = UpdateProfileSchema.safeParse(rawData);
    if (!validationResult.success) {
      return {
        success: false,
        error: "Invalid profile data",
        issues: validationResult.error.issues,
      };
    }

    const { name, currentPassword, newPassword } = validationResult.data;

    // Get current user
    const user = await getUserByEmailFromDb(session.user.email, true);

    // Prepare update data
    const updateData: any = { name };

    // If changing password, verify current password first
    if (newPassword) {
      if (!currentPassword) {
        return {
          success: false,
          error: "Current password is required to set a new password",
        };
      }

      try {
        await verifyUserPassword(session.user.email, currentPassword);
        updateData.hashedPassword = newPassword;
      } catch (error) {
        if (error instanceof UserError && error.type === UserErrorType.INVALID_PASSWORD) {
          return {
            success: false,
            error: "Current password is incorrect",
          };
        }
        throw error;
      }
    }

    await updateUserInDb(user.id, updateData);

    revalidatePath("/profile");
    return {
      success: true,
      message: "Profile updated successfully",
    };
  } catch (error) {
    console.error("Error in updateProfileAction:", error);
    
    if (error instanceof UserError) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to update profile",
    };
  }
}

/**
 * Get current user's profile data
 */
export async function getCurrentUserAction() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const user = await getUserByEmailFromDb(session.user.email);
    
    return {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    console.error("Error in getCurrentUserAction:", error);
    
    if (error instanceof UserError) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to fetch user profile",
    };
  }
}

/**
 * Get a specific user by ID (admin only)
 */
export async function getUserByIdAction(id: string) {
  try {
    await checkAdminPermission();

    const user = await getUserByIdFromDb(id);
    
    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error("Error in getUserByIdAction:", error);
    
    if (error instanceof UserError) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "Failed to fetch user",
    };
  }
}
