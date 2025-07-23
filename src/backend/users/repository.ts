import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Types for user operations
export interface UserCreateData {
  name: string;
  email: string;
  hashedPassword?: string;
  role?: "USER" | "ADMIN";
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  hashedPassword?: string;
  role?: "USER" | "ADMIN";
}

export interface UserFilters {
  role?: "USER" | "ADMIN";
  search?: string;
}

// Custom error types for better error handling
export class UserError extends Error {
  constructor(
    message: string,
    public type: UserErrorType,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "UserError";
  }
}

export enum UserErrorType {
  NOT_FOUND = "NOT_FOUND",
  DUPLICATE_EMAIL = "DUPLICATE_EMAIL",
  INVALID_PASSWORD = "INVALID_PASSWORD",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  DATABASE_ERROR = "DATABASE_ERROR",
}

/**
 * Get all users with optional filtering
 */
export async function getUsersFromDb(filters: UserFilters = {}) {
  try {
    const where: any = {};
    
    if (filters.role) {
      where.role = filters.role;
    }
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        // Don't select hashedPassword for security
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new UserError(
      "Failed to fetch users from database",
      UserErrorType.DATABASE_ERROR,
      error
    );
  }
}

/**
 * Get a single user by ID
 */
export async function getUserByIdFromDb(id: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UserError(
        `User with ID ${id} not found`,
        UserErrorType.NOT_FOUND
      );
    }

    return user;
  } catch (error) {
    if (error instanceof UserError) throw error;
    
    console.error("Error fetching user by ID:", error);
    throw new UserError(
      "Failed to fetch user from database",
      UserErrorType.DATABASE_ERROR,
      error
    );
  }
}

/**
 * Get a user by email (including password for authentication)
 */
export async function getUserByEmailFromDb(email: string, includePassword = false) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hashedPassword: includePassword,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UserError(
        `User with email ${email} not found`,
        UserErrorType.NOT_FOUND
      );
    }

    return user;
  } catch (error) {
    if (error instanceof UserError) throw error;
    
    console.error("Error fetching user by email:", error);
    throw new UserError(
      "Failed to fetch user from database",
      UserErrorType.DATABASE_ERROR,
      error
    );
  }
}

/**
 * Create a new user
 */
export async function createUserInDb(data: UserCreateData) {
  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new UserError(
        `User with email ${data.email} already exists`,
        UserErrorType.DUPLICATE_EMAIL
      );
    }

    // Hash password - required for user creation
    if (!data.hashedPassword) {
      throw new UserError(
        "Password is required for user creation",
        UserErrorType.INVALID_PASSWORD
      );
    }

    const hashedPassword = await bcrypt.hash(data.hashedPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        hashedPassword,
        role: data.role || "USER",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  } catch (error) {
    if (error instanceof UserError) throw error;
    
    console.error("Error creating user:", error);
    throw new UserError(
      "Failed to create user in database",
      UserErrorType.DATABASE_ERROR,
      error
    );
  }
}

/**
 * Update an existing user
 */
export async function updateUserInDb(id: string, data: UserUpdateData) {
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new UserError(
        `User with ID ${id} not found`,
        UserErrorType.NOT_FOUND
      );
    }

    // Check for email conflicts if email is being updated
    if (data.email && data.email !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailConflict) {
        throw new UserError(
          `User with email ${data.email} already exists`,
          UserErrorType.DUPLICATE_EMAIL
        );
      }
    }

    // Hash password if provided
    const updateData: any = { ...data };
    if (data.hashedPassword) {
      updateData.hashedPassword = await bcrypt.hash(data.hashedPassword, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  } catch (error) {
    if (error instanceof UserError) throw error;
    
    console.error("Error updating user:", error);
    throw new UserError(
      "Failed to update user in database",
      UserErrorType.DATABASE_ERROR,
      error
    );
  }
}

/**
 * Delete a user (with cascade handling for sessions and accounts)
 */
export async function deleteUserFromDb(id: string) {
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });

    if (!existingUser) {
      throw new UserError(
        `User with ID ${id} not found`,
        UserErrorType.NOT_FOUND
      );
    }

    // Don't allow deleting super admin
    if (existingUser.email === "akamaotto@gmail.com") {
      throw new UserError(
        "Cannot delete super admin user",
        UserErrorType.PERMISSION_DENIED
      );
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // Delete sessions first
      await tx.$executeRaw`DELETE FROM sessions WHERE "userId" = ${id}`;
      
      // Delete accounts
      await tx.$executeRaw`DELETE FROM accounts WHERE "userId" = ${id}`;
      
      // Finally delete the user
      await tx.$executeRaw`DELETE FROM users WHERE id = ${id}`;
    });

    return { success: true };
  } catch (error) {
    if (error instanceof UserError) throw error;
    
    console.error("Error deleting user:", error);
    throw new UserError(
      "Failed to delete user from database",
      UserErrorType.DATABASE_ERROR,
      error
    );
  }
}

/**
 * Verify user password
 */
export async function verifyUserPassword(email: string, password: string) {
  try {
    const user = await getUserByEmailFromDb(email, true);
    
    if (!user.hashedPassword) {
      throw new UserError(
        "User has no password set",
        UserErrorType.INVALID_PASSWORD
      );
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    
    if (!isValid) {
      throw new UserError(
        "Invalid password",
        UserErrorType.INVALID_PASSWORD
      );
    }

    return { 
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    };
  } catch (error) {
    if (error instanceof UserError) throw error;
    
    console.error("Error verifying password:", error);
    throw new UserError(
      "Failed to verify password",
      UserErrorType.DATABASE_ERROR,
      error
    );
  }
}
